const GEMINI_UPLOAD_URL = "https://generativelanguage.googleapis.com/upload/v1beta/files";

// The model that watches the videos. This used to be hardcoded to
// gemini-2.0-flash, which Google retired: it is no longer in the model list at
// all, so every run failed on the analysis step. Set GEMINI_MODEL in .env to
// override without touching code, because Google retires these on a regular
// cadence and the next one will go the same way.
//
// gemini-2.5-flash is the default because it accepts video and is what the
// sibling projects (tiktok-ai, x-ai) already run. gemini-3.1-flash-lite is
// cheaper per token if you are watching cost. Check what your key can actually
// reach with:
//   curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY"
const CONFIGURED_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Free-tier daily quotas are set per model, and the newest/flagship models
// get the smallest ones (seen as low as 20 requests/day). When the
// configured model runs dry mid-run, retrying it just wastes time — the
// quota does not reset until midnight Pacific. So on a *daily* quota error
// specifically (not a per-minute one, which does recover), analyzeVideo
// rotates to the next model in this list instead of failing the batch.
// Lite-tier models carry much higher free daily limits, which is why they
// fill out the rest of the chain.
const MODEL_FALLBACK_CHAIN = Array.from(
  new Set([
    CONFIGURED_MODEL,
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-3.6-flash",
  ])
);

function generateUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return key;
}

export async function uploadVideo(
  videoBuffer: Buffer,
  mimeType: string
): Promise<{ uri: string; mimeType: string }> {
  const key = getApiKey();

  const response = await fetch(`${GEMINI_UPLOAD_URL}?key=${key}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Command": "start, upload, finalize",
      "X-Goog-Upload-Header-Content-Length": String(videoBuffer.length),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": mimeType,
    },
    body: new Uint8Array(videoBuffer),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini upload error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const fileName = data.file.name; // e.g. "files/abc123"
  const fileUri = data.file.uri;
  const fileMimeType = data.file.mimeType;

  // Poll until file is ACTIVE (Gemini needs to process the upload)
  await waitForFileActive(fileName);

  return { uri: fileUri, mimeType: fileMimeType };
}

async function waitForFileActive(fileName: string, maxWaitMs = 120000): Promise<void> {
  const key = getApiKey();
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${key}`
    );

    if (!response.ok) {
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }

    const data = await response.json();
    const state = data.state;

    if (state === "ACTIVE") return;
    if (state === "FAILED") throw new Error(`Gemini file processing failed for ${fileName}`);

    // Still PROCESSING — wait and retry
    await new Promise((r) => setTimeout(r, 3000));
  }

  throw new Error(`Gemini file ${fileName} did not become ACTIVE within ${maxWaitMs / 1000}s`);
}

/** Google's quotaId names the window it's tracking, e.g.
 * "GenerateRequestsPerDayPerProjectPerModel-FreeTier" vs "...PerMinute...".
 * Only the daily one is worth switching models over — a per-minute 429
 * clears on its own well inside a normal backoff retry. */
function isDailyQuotaExhausted(status: number, body: string): boolean {
  return status === 429 && /PerDay/i.test(body);
}

export async function analyzeVideo(
  fileUri: string,
  mimeType: string,
  analysisPrompt: string,
  maxRetries = 3,
  onModelSwitch?: (fromModel: string, toModel: string) => void
): Promise<string> {
  const key = getApiKey();

  let lastError: Error | null = null;

  for (let modelIndex = 0; modelIndex < MODEL_FALLBACK_CHAIN.length; modelIndex++) {
    const model = MODEL_FALLBACK_CHAIN[modelIndex];
    const url = generateUrl(model);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${url}?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { fileData: { fileUri, mimeType } },
                  { text: analysisPrompt },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const text = await response.text();

          if (isDailyQuotaExhausted(response.status, text)) {
            lastError = new Error(explainGeminiError(response.status, text, model));
            const nextModel = MODEL_FALLBACK_CHAIN[modelIndex + 1];
            if (nextModel) onModelSwitch?.(model, nextModel);
            break; // stop retrying this model, fall through to the next one
          }

          if (attempt < maxRetries - 1) {
            // Back off further each time instead of a flat 5s. A per-minute
            // 429 or a transient 503 recovers on its own, so the point is to
            // wait longer, not to hammer the same limit three times.
            await new Promise((r) => setTimeout(r, backoffMs(attempt)));
            continue;
          }
          throw new Error(explainGeminiError(response.status, text, model));
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        // Strip everything before first # (same as n8n workflow)
        const hashIndex = text.indexOf("#");
        return hashIndex >= 0 ? text.substring(hashIndex) : text;
      } catch (error) {
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, backoffMs(attempt)));
          continue;
        }
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
  }

  throw lastError || new Error("Gemini analysis failed after retries");
}

/** 2s, 4s, 8s, 16s, plus a little jitter so parallel videos do not resync. */
function backoffMs(attempt: number): number {
  return 2000 * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
}

/**
 * Turn Gemini's HTTP status into something a non-engineer can act on. These
 * three are the ones people actually hit, and the raw JSON body tells them
 * nothing about what to do next.
 */
function explainGeminiError(status: number, body: string, model: string): string {
  if (status === 429) {
    if (isDailyQuotaExhausted(status, body)) {
      return (
        `Gemini daily quota exhausted on every model in the fallback chain ` +
        `(${MODEL_FALLBACK_CHAIN.join(", ")}). All of them are out for today. ` +
        `Wait for the reset at midnight Pacific, or turn on billing at ` +
        `https://aistudio.google.com/apikey to raise the limits. Your current ` +
        `limits: https://aistudio.google.com/rate-limit\n\n${body}`
      );
    }
    return (
      `Gemini rate limit (429) on model ${model}. You hit a per-minute quota on ` +
      `your Google AI key, not a bug in this project. Either run fewer videos per ` +
      `go, wait and try again, or turn on billing at https://aistudio.google.com/apikey ` +
      `to raise the limits. Your current limits: https://aistudio.google.com/rate-limit\n\n${body}`
    );
  }
  if (status === 404) {
    return (
      `Gemini says model "${model}" does not exist (404). Google retires ` +
      `models, so this name may have been switched off. List the ones your key can ` +
      `reach with: curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY" ` +
      `then set GEMINI_MODEL in .env to one of them.\n\n${body}`
    );
  }
  if (status === 400 && body.includes("API key not valid")) {
    return (
      `Gemini rejected your API key (400). Check GEMINI_API_KEY in the .env file at ` +
      `the project root, with no quotes and no spaces around the "=". Get a key at ` +
      `https://aistudio.google.com/apikey\n\n${body}`
    );
  }
  return `Gemini analysis error ${status}: ${body}`;
}

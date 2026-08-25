import { NextResponse } from "next/server";
import { readConfigs, getVideoById, updateVideoAnalysis } from "@/lib/db";
import { scrapeSingleReel } from "@/lib/apify";
import { fetchWithRetry } from "@/lib/pipeline";
import { uploadVideo, analyzeVideo } from "@/lib/gemini";
import { generateNewConcepts } from "@/lib/claude";

export const maxDuration = 300;

// Runs the full AI breakdown (Gemini video analysis + Claude concept
// generation) for a single already-scraped video, on demand. The pipeline
// only saves metrics up front — this is what actually spends Gemini/Claude
// tokens, and only for the video the user chose to look at.
export async function POST(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const video = await getVideoById(id);
  if (!video) return NextResponse.json({ error: "not found" }, { status: 404 });

  const configs = await readConfigs();
  const config = configs.find((c) => c.configName === video.configName);
  if (!config) return NextResponse.json({ error: `Config "${video.configName}" not found` }, { status: 400 });

  try {
    // The Apify videoUrl saved at scrape time would already be expired —
    // it's a signed Meta CDN link valid for a few hours. Re-scrape the post
    // to get one that's fresh right now.
    const reel = await scrapeSingleReel(video.link);
    if (!reel?.videoUrl) throw new Error("Could not re-fetch a downloadable video for this post");

    const videoResponse = await fetchWithRetry(reel.videoUrl);
    if (!videoResponse.ok) throw new Error(`Download failed: ${videoResponse.status}`);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const contentType = videoResponse.headers.get("content-type") || "video/mp4";

    const fileData = await uploadVideo(videoBuffer, contentType);
    const analysis = await analyzeVideo(fileData.uri, fileData.mimeType, config.analysisInstruction);

    let newConcepts = "";
    if (process.env.ANTHROPIC_API_KEY) {
      newConcepts = await generateNewConcepts(analysis, config.newConceptsInstruction);
    }

    const updated = await updateVideoAnalysis(id, analysis, newConcepts);
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

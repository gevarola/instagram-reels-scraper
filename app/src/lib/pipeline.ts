import { v4 as uuid } from "uuid";
import { readConfigs, readCreators, insertNewVideos } from "./db";
import { scrapeReels } from "./apify";
import type { PipelineParams, PipelineProgress, Video, ActiveTask } from "./types";

interface ScrapedVideo {
  postUrl: string;
  views: number;
  likes: number;
  comments: number;
  username: string;
  thumbnail: string;
  datePosted: string;
}

/**
 * Video downloads hit Meta's CDN directly and occasionally get a reset
 * connection or DNS blip — a transient network error, not a dead link (dead
 * links come back with an HTTP status, which this does not retry on). Same
 * 2s/4s/8s backoff already used for Gemini calls in gemini.ts.
 */
export async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetch(url);
    } catch (err) {
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
        continue;
      }
      const cause = err instanceof Error && err.cause ? ` (${String(err.cause)})` : "";
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`${msg}${cause}`);
    }
  }
  throw new Error("unreachable");
}

export async function runPipeline(
  params: PipelineParams,
  onProgress: (progress: PipelineProgress) => void
): Promise<void> {
  const progress: PipelineProgress = {
    status: "running",
    phase: "scraping",
    activeTasks: [],
    creatorsCompleted: 0,
    creatorsTotal: 0,
    creatorsScraped: 0,
    videosSaved: 0,
    errors: [],
    log: [],
  };

  const emit = () => {
    onProgress({ ...progress, activeTasks: [...progress.activeTasks], log: [...progress.log], errors: [...progress.errors] });
  };

  const log = (msg: string) => {
    progress.log.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    emit();
  };

  const addTask = (task: ActiveTask) => {
    progress.activeTasks.push(task);
    emit();
  };

  const updateTask = (id: string, step: string) => {
    const t = progress.activeTasks.find((t) => t.id === id);
    if (t) { t.step = step; emit(); }
  };

  const removeTask = (id: string) => {
    progress.activeTasks = progress.activeTasks.filter((t) => t.id !== id);
    emit();
  };

  try {
    // Load config
    const configs = await readConfigs();
    const config = configs.find((c) => c.configName === params.configName);
    if (!config) throw new Error(`Config "${params.configName}" not found`);

    log(`Loaded config: ${config.configName}`);

    // Load creators
    const allCreators = await readCreators();
    const creators = allCreators.filter((c) => c.category === config.creatorsCategory);
    if (creators.length === 0) throw new Error(`No creators found for category "${config.creatorsCategory}"`);

    progress.creatorsTotal = creators.length;
    log(`Found ${creators.length} creators — scraping all in parallel`);
    emit();

    // Scrape all creators in parallel. No per-creator cap here — every
    // reel inside the lookback window gets saved, so the Videos page
    // reflects everything each account actually posted this month.
    progress.phase = "scraping";
    const cutoffDate = new Date(Date.now() - params.nDays * 24 * 60 * 60 * 1000);
    const allVideos: ScrapedVideo[] = [];

    const scrapeResults = await Promise.allSettled(
      creators.map(async (creator) => {
        const taskId = `scrape-${creator.username}`;
        addTask({ id: taskId, creator: creator.username, step: "Scraping reels" });

        const reels = await scrapeReels(creator.username, params.maxVideos, params.nDays);
        updateTask(taskId, `Found ${reels.length} reels`);

        const videos = reels
          .filter((r) => r.videoUrl && r.timestamp)
          .map((r) => ({
            postUrl: r.url,
            views: r.videoPlayCount || 0,
            likes: r.likesCount || 0,
            comments: r.commentsCount || 0,
            username: r.ownerUsername || creator.username,
            thumbnail: r.images?.[0] || "",
            datePosted: r.timestamp?.split("T")[0] || "",
            timestamp: new Date(r.timestamp),
          }))
          .filter((v) => v.timestamp >= cutoffDate);

        log(`@${creator.username}: ${reels.length} reels → ${videos.length} within the last ${params.nDays} days`);

        removeTask(taskId);
        progress.creatorsScraped++;
        emit();

        return { creator: creator.username, videos };
      })
    );

    for (const result of scrapeResults) {
      if (result.status === "fulfilled") {
        for (const v of result.value.videos) {
          allVideos.push(v);
        }
        progress.creatorsCompleted++;
      } else {
        const msg = `Scraping error: ${result.reason instanceof Error ? result.reason.message : result.reason}`;
        progress.errors.push(msg);
        log(msg);
        progress.creatorsCompleted++;
      }
    }

    log(`Scraping done. ${allVideos.length} videos found.`);
    emit();

    // Save everything at once — metrics only, no AI analysis yet. Analysis
    // happens on demand from the Videos page (see /api/videos/analyze),
    // since running Gemini + Claude on every scraped video up front would
    // cost money on videos nobody ends up looking at.
    const candidates: Video[] = allVideos.map((video) => ({
      id: uuid(),
      link: video.postUrl,
      thumbnail: video.thumbnail,
      creator: video.username,
      views: video.views,
      likes: video.likes,
      comments: video.comments,
      analysis: "",
      newConcepts: "",
      datePosted: video.datePosted,
      dateAdded: new Date().toISOString().slice(0, 10),
      configName: params.configName,
      starred: false,
    }));

    progress.videosSaved = candidates.length > 0 ? await insertNewVideos(candidates) : 0;
    const skipped = candidates.length - progress.videosSaved;
    if (skipped > 0) log(`Skipped ${skipped} already-saved videos (seen in a previous run).`);

    progress.phase = "done";
    progress.status = "completed";
    log(`Pipeline complete! ${progress.videosSaved} new videos saved, ${progress.errors.length} errors.`);
    emit();
  } catch (err) {
    progress.status = "error";
    const msg = `Pipeline error: ${err instanceof Error ? err.message : err}`;
    progress.errors.push(msg);
    log(msg);
    emit();
  }
}

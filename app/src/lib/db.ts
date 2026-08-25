import { sql } from "@vercel/postgres";
import type { Config, Creator, Video, ContentIdea } from "./types";

/**
 * Postgres (via Vercel's Neon integration) replaces the old data/*.csv
 * files. Those CSVs were bundled into the serverless function so the app
 * could *read* them on Vercel, but the deployed bundle's filesystem is
 * read-only at runtime — every write from a live pipeline run was silently
 * lost the moment the function instance recycled. A real database is the
 * only way saves actually persist in production.
 */

const VIDEO_COLUMNS = `
  id, link, thumbnail, creator, views, likes, comments, analysis,
  new_concepts AS "newConcepts", date_posted AS "datePosted",
  date_added AS "dateAdded", config_name AS "configName", starred
`;

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS configs (
          id TEXT PRIMARY KEY,
          config_name TEXT NOT NULL,
          creators_category TEXT NOT NULL,
          analysis_instruction TEXT NOT NULL DEFAULT '',
          new_concepts_instruction TEXT NOT NULL DEFAULT ''
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS creators (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          category TEXT NOT NULL,
          profile_pic_url TEXT NOT NULL DEFAULT '',
          followers INTEGER NOT NULL DEFAULT 0,
          reels_count_30d INTEGER NOT NULL DEFAULT 0,
          avg_views_30d INTEGER NOT NULL DEFAULT 0,
          last_scraped_at TEXT NOT NULL DEFAULT ''
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY,
          link TEXT NOT NULL UNIQUE,
          thumbnail TEXT NOT NULL DEFAULT '',
          creator TEXT NOT NULL,
          views INTEGER NOT NULL DEFAULT 0,
          likes INTEGER NOT NULL DEFAULT 0,
          comments INTEGER NOT NULL DEFAULT 0,
          analysis TEXT NOT NULL DEFAULT '',
          new_concepts TEXT NOT NULL DEFAULT '',
          date_posted TEXT NOT NULL DEFAULT '',
          date_added TEXT NOT NULL DEFAULT '',
          config_name TEXT NOT NULL DEFAULT '',
          starred BOOLEAN NOT NULL DEFAULT FALSE
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS content_ideas (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL DEFAULT '',
          archetype TEXT NOT NULL DEFAULT '',
          source_inspiration TEXT NOT NULL DEFAULT '',
          premise TEXT NOT NULL DEFAULT '',
          hook TEXT NOT NULL DEFAULT '',
          script TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT '',
          starred BOOLEAN NOT NULL DEFAULT FALSE
        )
      `;
    })();
  }
  return schemaReady;
}

// Configs
export async function readConfigs(): Promise<Config[]> {
  await ensureSchema();
  const { rows } = await sql<Config>`
    SELECT id, config_name AS "configName", creators_category AS "creatorsCategory",
           analysis_instruction AS "analysisInstruction", new_concepts_instruction AS "newConceptsInstruction"
    FROM configs ORDER BY config_name
  `;
  return rows;
}

export async function writeConfigs(configs: Config[]): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM configs`;
  for (const c of configs) {
    await sql`
      INSERT INTO configs (id, config_name, creators_category, analysis_instruction, new_concepts_instruction)
      VALUES (${c.id}, ${c.configName}, ${c.creatorsCategory}, ${c.analysisInstruction}, ${c.newConceptsInstruction})
    `;
  }
}

// Creators
export async function readCreators(): Promise<Creator[]> {
  await ensureSchema();
  const { rows } = await sql<Creator>`
    SELECT id, username, category, profile_pic_url AS "profilePicUrl", followers,
           reels_count_30d AS "reelsCount30d", avg_views_30d AS "avgViews30d",
           last_scraped_at AS "lastScrapedAt"
    FROM creators ORDER BY username
  `;
  return rows;
}

export async function writeCreators(creators: Creator[]): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM creators`;
  for (const c of creators) {
    await sql`
      INSERT INTO creators (id, username, category, profile_pic_url, followers, reels_count_30d, avg_views_30d, last_scraped_at)
      VALUES (${c.id}, ${c.username}, ${c.category}, ${c.profilePicUrl}, ${c.followers}, ${c.reelsCount30d}, ${c.avgViews30d}, ${c.lastScrapedAt})
    `;
  }
}

// Videos
export async function readVideos(): Promise<Video[]> {
  await ensureSchema();
  const { rows } = await sql.query(`SELECT ${VIDEO_COLUMNS} FROM videos`);
  return rows as Video[];
}

export async function getVideoById(id: string): Promise<Video | null> {
  await ensureSchema();
  const { rows } = await sql.query(`SELECT ${VIDEO_COLUMNS} FROM videos WHERE id = $1`, [id]);
  return (rows[0] as Video) ?? null;
}

/** Bulk-inserts scraped videos, skipping any whose link is already saved.
 * Returns how many were actually new. Used by the pipeline instead of a
 * read-all-then-rewrite-all cycle, since the videos table is the one that
 * grows unbounded (every reel from every creator, every month). */
export async function insertNewVideos(videos: Video[]): Promise<number> {
  await ensureSchema();
  let inserted = 0;
  for (const v of videos) {
    const result = await sql`
      INSERT INTO videos (id, link, thumbnail, creator, views, likes, comments, analysis, new_concepts, date_posted, date_added, config_name, starred)
      VALUES (${v.id}, ${v.link}, ${v.thumbnail}, ${v.creator}, ${v.views}, ${v.likes}, ${v.comments}, ${v.analysis}, ${v.newConcepts}, ${v.datePosted}, ${v.dateAdded}, ${v.configName}, ${v.starred})
      ON CONFLICT (link) DO NOTHING
    `;
    inserted += result.rowCount ?? 0;
  }
  return inserted;
}

export async function updateVideoStarred(id: string, starred: boolean): Promise<Video | null> {
  await ensureSchema();
  const result = await sql.query(
    `UPDATE videos SET starred = $1 WHERE id = $2 RETURNING ${VIDEO_COLUMNS}`,
    [starred, id]
  );
  return (result.rows[0] as Video) ?? null;
}

export async function updateVideoAnalysis(id: string, analysis: string, newConcepts: string): Promise<Video | null> {
  await ensureSchema();
  const result = await sql.query(
    `UPDATE videos SET analysis = $1, new_concepts = $2 WHERE id = $3 RETURNING ${VIDEO_COLUMNS}`,
    [analysis, newConcepts, id]
  );
  return (result.rows[0] as Video) ?? null;
}

// Content Ideas
export async function readContentIdeas(): Promise<ContentIdea[]> {
  await ensureSchema();
  const { rows } = await sql<ContentIdea>`
    SELECT id, title, archetype, source_inspiration AS "sourceInspiration", premise, hook, script,
           created_at AS "createdAt", starred
    FROM content_ideas
  `;
  return rows;
}

export async function writeContentIdeas(ideas: ContentIdea[]): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM content_ideas`;
  for (const i of ideas) {
    await sql`
      INSERT INTO content_ideas (id, title, archetype, source_inspiration, premise, hook, script, created_at, starred)
      VALUES (${i.id}, ${i.title}, ${i.archetype}, ${i.sourceInspiration}, ${i.premise}, ${i.hook}, ${i.script}, ${i.createdAt}, ${i.starred})
    `;
  }
}

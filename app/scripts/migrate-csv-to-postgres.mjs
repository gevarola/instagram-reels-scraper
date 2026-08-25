// One-time migration: copies the existing data/*.csv rows into Postgres.
// Run once, locally, after POSTGRES_URL is set in .env (from the app/ dir):
//   node scripts/migrate-csv-to-postgres.mjs
import { parse } from "csv-parse/sync";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";
import { sql } from "@vercel/postgres";

const ROOT = path.join(import.meta.dirname, "..", "..");
loadEnv({ path: path.join(ROOT, ".env") });

const DATA_DIR = path.join(ROOT, "data");

function readCsv(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!existsSync(filepath)) return [];
  const content = readFileSync(filepath, "utf-8");
  if (!content.trim()) return [];
  return parse(content, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

async function ensureSchema() {
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
}

async function migrateConfigs() {
  const rows = readCsv("configs.csv");
  for (const r of rows) {
    await sql`
      INSERT INTO configs (id, config_name, creators_category, analysis_instruction, new_concepts_instruction)
      VALUES (${r.id}, ${r.configName}, ${r.creatorsCategory}, ${r.analysisInstruction || ""}, ${r.newConceptsInstruction || ""})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`configs: migrated ${rows.length}`);
}

async function migrateCreators() {
  const rows = readCsv("creators.csv");
  for (const r of rows) {
    await sql`
      INSERT INTO creators (id, username, category, profile_pic_url, followers, reels_count_30d, avg_views_30d, last_scraped_at)
      VALUES (${r.id}, ${r.username}, ${r.category}, ${r.profilePicUrl || ""}, ${parseInt(r.followers || "0", 10) || 0}, ${parseInt(r.reelsCount30d || "0", 10) || 0}, ${parseInt(r.avgViews30d || "0", 10) || 0}, ${r.lastScrapedAt || ""})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`creators: migrated ${rows.length}`);
}

async function migrateVideos() {
  const rows = readCsv("videos.csv");
  for (const r of rows) {
    await sql`
      INSERT INTO videos (id, link, thumbnail, creator, views, likes, comments, analysis, new_concepts, date_posted, date_added, config_name, starred)
      VALUES (
        ${r.id}, ${r.link}, ${r.thumbnail || ""}, ${r.creator},
        ${parseInt(r.views || "0", 10) || 0}, ${parseInt(r.likes || "0", 10) || 0}, ${parseInt(r.comments || "0", 10) || 0},
        ${r.analysis || ""}, ${r.newConcepts || ""}, ${r.datePosted || ""}, ${r.dateAdded || ""}, ${r.configName || ""},
        ${r.starred === "true"}
      )
      ON CONFLICT (link) DO NOTHING
    `;
  }
  console.log(`videos: migrated ${rows.length}`);
}

async function migrateContentIdeas() {
  const rows = readCsv("content-ideas.csv");
  for (const r of rows) {
    await sql`
      INSERT INTO content_ideas (id, title, archetype, source_inspiration, premise, hook, script, created_at, starred)
      VALUES (${r.id}, ${r.title || ""}, ${r.archetype || ""}, ${r.sourceInspiration || ""}, ${r.premise || ""}, ${r.hook || ""}, ${r.script || ""}, ${r.createdAt || ""}, ${r.starred === "true"})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`content ideas: migrated ${rows.length}`);
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error("POSTGRES_URL not set in .env — provision the database in Vercel first.");
    process.exit(1);
  }
  await ensureSchema();
  await migrateConfigs();
  await migrateCreators();
  await migrateVideos();
  await migrateContentIdeas();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

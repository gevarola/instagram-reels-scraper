import { NextResponse } from "next/server";
import { findSimilarProfiles } from "@/lib/apify";

export async function POST(request: Request) {
  const { seeds, minFollowers, language, limit } = await request.json();
  if (!Array.isArray(seeds) || seeds.length === 0) {
    return NextResponse.json({ error: "seeds (array of usernames) required" }, { status: 400 });
  }
  if (seeds.length > 5) {
    return NextResponse.json({ error: "max 5 seed accounts per expansion" }, { status: 400 });
  }

  try {
    const results = await findSimilarProfiles(seeds, { minFollowers, language, limit });
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

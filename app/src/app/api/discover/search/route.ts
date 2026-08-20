import { NextResponse } from "next/server";
import { searchProfiles } from "@/lib/apify";

export async function POST(request: Request) {
  const { query, limit } = await request.json();
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  try {
    const results = await searchProfiles(query, limit || 20);
    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

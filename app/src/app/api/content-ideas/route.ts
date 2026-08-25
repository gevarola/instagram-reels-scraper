import { NextResponse } from "next/server";
import { readContentIdeas, writeContentIdeas } from "@/lib/db";

export async function GET() {
  const ideas = await readContentIdeas();
  ideas.sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  return NextResponse.json(ideas);
}

export async function PATCH(request: Request) {
  const { id, starred } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const ideas = await readContentIdeas();
  const idea = ideas.find((i) => i.id === id);
  if (!idea) return NextResponse.json({ error: "not found" }, { status: 404 });

  idea.starred = starred;
  await writeContentIdeas(ideas);
  return NextResponse.json(idea);
}

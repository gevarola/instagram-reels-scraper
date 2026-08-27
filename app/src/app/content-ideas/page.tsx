"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lightbulb, Star, Mic, FileText, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { ContentIdea } from "@/lib/types";

export default function ContentIdeasPage() {
  const { t } = useLanguage();
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [filterArchetype, setFilterArchetype] = useState<string>("all");
  const [modalIdea, setModalIdea] = useState<ContentIdea | null>(null);
  const [modalSection, setModalSection] = useState<"hook" | "script">("hook");

  useEffect(() => {
    fetch("/api/content-ideas").then((r) => r.json()).then(setIdeas);
  }, []);

  const uniqueArchetypes = [...new Set(ideas.map((i) => i.archetype))].sort();

  const filtered = ideas.filter(
    (i) => filterArchetype === "all" || i.archetype === filterArchetype
  );

  const openModal = (idea: ContentIdea, section: "hook" | "script") => {
    setModalIdea(idea);
    setModalSection(section);
  };

  const toggleStar = async (id: string, currentStarred: boolean) => {
    const newStarred = !currentStarred;
    setIdeas((prev) =>
      prev.map((i) => (i.id === id ? { ...i, starred: newStarred } : i))
    );
    await fetch("/api/content-ideas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, starred: newStarred }),
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("contentIdeas.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("contentIdeas.subtitle")}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterArchetype} onValueChange={setFilterArchetype}>
          <SelectTrigger className="w-[220px] rounded-xl glass border-white/[0.08] h-10">
            <SelectValue placeholder={t("contentIdeas.filterArchetype")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("contentIdeas.allArchetypes")}</SelectItem>
            {uniqueArchetypes.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08]">
          {t("contentIdeas.count", { n: filtered.length })}
        </Badge>
      </div>

      {/* Idea Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((idea) => (
          <div key={idea.id} className="glass rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/[0.12] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-red-500/20">
                <Lightbulb className="h-4 w-4 text-amber-500" />
              </div>
              <button
                onClick={() => toggleStar(idea.id, idea.starred)}
                className="shrink-0 transition-colors"
              >
                <Star
                  className={`h-4 w-4 ${idea.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400/60"}`}
                />
              </button>
            </div>

            <div>
              <p className="text-sm font-semibold leading-snug">{idea.title}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{idea.premise}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="rounded-md text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600">
                {idea.archetype}
              </Badge>
            </div>

            <p className="text-[10px] text-muted-foreground truncate">
              {t("contentIdeas.inspiredBy", { source: idea.sourceInspiration })}
            </p>

            <div className="flex gap-1.5 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openModal(idea, "hook")}
                className="flex-1 rounded-xl text-[11px] h-7 gap-1 transition-all duration-200 glass border-white/[0.06] text-muted-foreground hover:text-foreground"
              >
                <Mic className="h-3 w-3" />
                {t("contentIdeas.hook")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openModal(idea, "script")}
                className="flex-1 rounded-xl text-[11px] h-7 gap-1 transition-all duration-200 glass border-white/[0.06] text-muted-foreground hover:text-foreground"
              >
                <FileText className="h-3 w-3" />
                {t("contentIdeas.script")}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Lightbulb className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <h3 className="mt-4 font-semibold">{t("contentIdeas.emptyTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("contentIdeas.emptySubtitle")}
          </p>
        </div>
      )}

      {/* Hook / Script Modal */}
      <Dialog open={!!modalIdea} onOpenChange={(open) => { if (!open) setModalIdea(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden glass-strong rounded-2xl border-white/[0.08] p-0 gap-0">
          <DialogTitle className="sr-only">
            {modalSection === "hook" ? t("contentIdeas.hook") : t("contentIdeas.script")}
          </DialogTitle>
          {modalIdea && (
            <>
              <div className="flex items-center justify-between gap-4 p-5 border-b border-white/[0.06]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{modalIdea.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{modalIdea.archetype} · {modalIdea.sourceInspiration}</p>
                </div>
                <button
                  onClick={() => setModalIdea(null)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex border-b border-white/[0.06] px-5">
                <button
                  onClick={() => setModalSection("hook")}
                  className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    modalSection === "hook"
                      ? "border-amber-500 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("contentIdeas.hook")}
                </button>
                <button
                  onClick={() => setModalSection("script")}
                  className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    modalSection === "script"
                      ? "border-amber-500 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("contentIdeas.script")}
                </button>
              </div>

              <div className="overflow-y-auto p-5 max-h-[calc(85vh-110px)]">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/80">
                  {modalSection === "hook" ? modalIdea.hook : modalIdea.script}
                </pre>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

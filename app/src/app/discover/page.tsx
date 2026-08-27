"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users, Loader2, Plus, Check, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { DiscoveredProfile } from "@/lib/apify";

const LANGUAGES = ["any", "English", "Spanish", "Portuguese", "French", "German", "Italian"];

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function ProfileCard({
  profile,
  category,
  selected,
  onToggleSelect,
  onAdd,
  added,
}: {
  profile: DiscoveredProfile;
  category: string;
  selected: boolean;
  onToggleSelect?: () => void;
  onAdd: () => void;
  added: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className={`glass rounded-2xl p-4 space-y-2.5 transition-all duration-200 ${selected ? "border-amber-400/40 bg-amber-500/[0.04]" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="relative h-11 w-11 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-white/[0.1]">
          {profile.profilePicUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/proxy-image?url=${encodeURIComponent(profile.profilePicUrl)}`}
              alt={`@${profile.username}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">@{profile.username}</p>
          <p className="text-xs text-muted-foreground truncate">{profile.fullName || " "}</p>
        </div>
        <span className="num-display shrink-0 text-sm text-muted-foreground">
          {formatFollowers(profile.followers)}
        </span>
      </div>

      {profile.biography && (
        <p className="text-[11px] text-muted-foreground line-clamp-2">{profile.biography}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {profile.businessCategory && (
          <Badge variant="secondary" className="rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06] text-muted-foreground">
            {profile.businessCategory}
          </Badge>
        )}
        {profile.language && (
          <Badge variant="secondary" className="rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06] text-muted-foreground">
            {profile.language}
          </Badge>
        )}
      </div>

      <div className="flex gap-1.5 pt-1">
        {onToggleSelect && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSelect}
            className={`flex-1 rounded-xl text-[11px] h-7 gap-1 transition-all duration-200 glass border-white/[0.06] ${selected ? "text-amber-600" : "text-muted-foreground hover:text-foreground"}`}
          >
            {selected ? <Check className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {selected ? t("discover.selectedAsSeed") : t("discover.useAsSeed")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={added}
          onClick={onAdd}
          className="flex-1 rounded-xl text-[11px] h-7 gap-1 transition-all duration-200 glass border-white/[0.06] text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {added ? t("discover.added") : t("discover.addToCreators")}
        </Button>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DiscoveredProfile[]>([]);
  const [searchError, setSearchError] = useState("");

  const [selectedSeeds, setSelectedSeeds] = useState<Set<string>>(new Set());
  const [minFollowers, setMinFollowers] = useState("");
  const [language, setLanguage] = useState("any");
  const [expanding, setExpanding] = useState(false);
  const [similarResults, setSimilarResults] = useState<DiscoveredProfile[]>([]);
  const [similarError, setSimilarError] = useState("");

  const [addedUsernames, setAddedUsernames] = useState<Set<string>>(new Set());

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResults([]);
    try {
      const res = await fetch("/api/discover/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("discover.searchFailed"));
      setSearchResults(data);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  };

  const toggleSeed = (username: string) => {
    setSelectedSeeds((prev) => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
      } else if (next.size < 5) {
        next.add(username);
      }
      return next;
    });
  };

  const runExpand = async () => {
    if (selectedSeeds.size === 0) return;
    setExpanding(true);
    setSimilarError("");
    setSimilarResults([]);
    try {
      const res = await fetch("/api/discover/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seeds: Array.from(selectedSeeds),
          minFollowers: minFollowers ? parseInt(minFollowers, 10) : undefined,
          language,
          limit: 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("discover.expansionFailed"));
      setSimilarResults(data);
    } catch (err) {
      setSimilarError(err instanceof Error ? err.message : String(err));
    } finally {
      setExpanding(false);
    }
  };

  const addToCreators = async (profile: DiscoveredProfile) => {
    setAddedUsernames((prev) => new Set(prev).add(profile.username));
    await fetch("/api/creators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: profile.username, category: category || query }),
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("discover.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("discover.subtitle")}
        </p>
      </div>

      {/* Step 1 — Keyword search */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-xs font-bold text-amber-600">1</div>
          <h2 className="text-sm font-semibold">{t("discover.searchNiche")}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder={t("discover.queryPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            className="w-[320px] rounded-xl glass border-white/[0.08] h-10"
          />
          <Input
            placeholder={t("discover.categoryToSave")}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-[220px] rounded-xl glass border-white/[0.08] h-10"
          />
          <Button onClick={runSearch} disabled={searching || !query.trim()} className="rounded-xl h-10 gap-2">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {t("discover.search")}
          </Button>
          {searchResults.length > 0 && (
            <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08]">
              {t("discover.results", { n: searchResults.length })}
            </Badge>
          )}
        </div>
        {searching && (
          <p className="text-xs text-muted-foreground">{t("discover.scrapingNote")}</p>
        )}
        {searchError && <p className="text-xs text-red-400">{searchError}</p>}

        {searchResults.length > 0 && (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {searchResults.map((p) => (
              <ProfileCard
                key={p.username}
                profile={p}
                category={category || query}
                selected={selectedSeeds.has(p.username)}
                onToggleSelect={() => toggleSeed(p.username)}
                onAdd={() => addToCreators(p)}
                added={addedUsernames.has(p.username)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Step 2 — Expand via related profiles */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-xs font-bold text-amber-600">2</div>
          <h2 className="text-sm font-semibold">{t("discover.expandFromSelected")}</h2>
          <span className="text-xs text-muted-foreground">{t("discover.selectedAsSeeds", { n: selectedSeeds.size })}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="number"
            placeholder={t("discover.minFollowers")}
            value={minFollowers}
            onChange={(e) => setMinFollowers(e.target.value)}
            className="w-[160px] rounded-xl glass border-white/[0.08] h-10"
          />
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[180px] rounded-xl glass border-white/[0.08] h-10">
              <SelectValue placeholder={t("discover.language")} />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>{l === "any" ? t("discover.anyLanguage") : l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runExpand} disabled={expanding || selectedSeeds.size === 0} className="rounded-xl h-10 gap-2">
            {expanding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("discover.findSimilar")}
          </Button>
          {similarResults.length > 0 && (
            <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08]">
              {t("discover.results", { n: similarResults.length })}
            </Badge>
          )}
        </div>
        {selectedSeeds.size === 0 && (
          <p className="text-xs text-muted-foreground">{t("discover.pickSeedsNote")}</p>
        )}
        {similarError && <p className="text-xs text-red-400">{similarError}</p>}

        {similarResults.length > 0 && (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {similarResults.map((p) => (
              <ProfileCard
                key={p.username}
                profile={p}
                category={category || query}
                selected={false}
                onAdd={() => addToCreators(p)}
                added={addedUsernames.has(p.username)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

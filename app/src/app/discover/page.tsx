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
  return (
    <div className={`glass rounded-2xl p-4 space-y-2.5 transition-all duration-200 ${selected ? "border-purple-400/40 bg-purple-500/[0.04]" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="relative h-11 w-11 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/[0.1]">
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
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
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
            className={`flex-1 rounded-xl text-[11px] h-7 gap-1 transition-all duration-200 glass border-white/[0.06] ${selected ? "text-purple-300" : "text-muted-foreground hover:text-foreground"}`}
          >
            {selected ? <Check className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {selected ? "Selected as seed" : "Use as seed"}
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
          {added ? "Added" : "Add to Creators"}
        </Button>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
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
      if (!res.ok) throw new Error(data.error || "Search failed");
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
      if (!res.ok) throw new Error(data.error || "Expansion failed");
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
        <h1 className="text-3xl font-bold tracking-tight">Discover Creators</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step 1: search a niche by keyword. Step 2: pick promising accounts and expand into their &quot;Suggested for You&quot; network.
        </p>
      </div>

      {/* Step 1 — Keyword search */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-xs font-bold text-purple-300">1</div>
          <h2 className="text-sm font-semibold">Search a niche</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder='e.g. "coffee shop" or "cafeteria" (for Spanish results)'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            className="w-[320px] rounded-xl glass border-white/[0.08] h-10"
          />
          <Input
            placeholder="Category to save under (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-[220px] rounded-xl glass border-white/[0.08] h-10"
          />
          <Button onClick={runSearch} disabled={searching || !query.trim()} className="rounded-xl h-10 gap-2">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
          {searchResults.length > 0 && (
            <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08]">
              {searchResults.length} results
            </Badge>
          )}
        </div>
        {searching && (
          <p className="text-xs text-muted-foreground">Scraping profile details for each match — this takes roughly 1-1.5 minutes for 10 results, not stuck.</p>
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-xs font-bold text-purple-300">2</div>
          <h2 className="text-sm font-semibold">Expand from selected accounts</h2>
          <span className="text-xs text-muted-foreground">({selectedSeeds.size}/5 selected as seeds)</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="number"
            placeholder="Min followers"
            value={minFollowers}
            onChange={(e) => setMinFollowers(e.target.value)}
            className="w-[160px] rounded-xl glass border-white/[0.08] h-10"
          />
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[180px] rounded-xl glass border-white/[0.08] h-10">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>{l === "any" ? "Any language" : l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runExpand} disabled={expanding || selectedSeeds.size === 0} className="rounded-xl h-10 gap-2">
            {expanding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Find similar accounts
          </Button>
          {similarResults.length > 0 && (
            <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08]">
              {similarResults.length} results
            </Badge>
          )}
        </div>
        {selectedSeeds.size === 0 && (
          <p className="text-xs text-muted-foreground">Pick 1-5 accounts above with &quot;Use as seed&quot; first — this step costs a small amount of Apify usage per account analyzed (~$0.01 each, first 5 free).</p>
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

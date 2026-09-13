"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Search, Wand2, TrendingUp, Lightbulb, ArrowRight, Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { App } from "@omnistore/shared-models";

// AI-powered search suggestions based on natural language
const AI_SUGGESTIONS = [
  { query: "video editor for Linux", intent: "Find video editing tools", icon: "🎬" },
  { query: "password manager open source", intent: "Security essentials", icon: "🔐" },
  { query: "note taking with sync", intent: "Productivity boost", icon: "📝" },
  { query: "self-hosted photo backup", intent: "Privacy-first storage", icon: "📸" },
  { query: "lightweight code editor", intent: "Developer tools", icon: "💻" },
  { query: "ad blocking dns", intent: "Privacy & security", icon: "🛡️" },
];

const AI_INSIGHTS = [
  "Based on trending: Privacy tools are up 34% this week",
  "Developers love: Rust-based terminals are gaining popularity",
  "Cross-platform pick: Apps that work on Windows + macOS + Linux",
  "New release: 12 apps updated in last 24h",
];

function useIntelligentSearch(apps: App[], query: string) {
  return useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    
    const q = query.toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    
    // Synonym expansion for better AI search
    const synonyms: Record<string, string[]> = {
      "editor": ["ide", "edit", "code", "text"],
      "video": ["media", "movie", "film", "player", "streaming"],
      "photo": ["image", "picture", "gallery", "photos"],
      "password": ["pass", "security", "vault", "key"],
      "note": ["notes", "writing", "docs", "markdown"],
      "browser": ["web", "internet", "surf"],
      "chat": ["messaging", "communication", "matrix", "signal"],
      "music": ["audio", "player", "sound"],
      "backup": ["sync", "storage", "cloud"],
    };

    const expandedTerms = terms.flatMap(t => [t, ...(synonyms[t] ?? [])]);

    const scored = apps.map(app => {
      let score = 0;
      const name = app.name.toLowerCase();
      const desc = (app.shortDescription ?? app.description ?? "").toLowerCase();
      const tags = (app.tags ?? []).join(" ").toLowerCase();
      const category = (app.category ?? "").toLowerCase();
      const combined = `${name} ${desc} ${tags} ${category}`;

      for (const term of expandedTerms) {
        if (name.includes(term)) score += 100;
        else if (name.split(/\s+/).some(w => w.startsWith(term))) score += 80;
        if (tags.includes(term)) score += 60;
        if (category.includes(term)) score += 50;
        if (desc.includes(term)) score += 20;
        // Fuzzy: if term is substring of combined
        if (combined.includes(term)) score += 10;
      }

      // Boost factors
      if (app.trustScore && app.trustScore > 80) score += 5;
      if (app.platforms && app.platforms.length >= 3) score += 10; // cross-platform bonus
      if (app.activeDevelopment) score += 5;

      return { app, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(s => s.app);
  }, [apps, query]);
}

export function AIAssistant({
  apps,
  className,
}: {
  apps: App[];
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedInsight, setSelectedInsight] = useState(0);
  const router = useRouter();
  const results = useIntelligentSearch(apps, query);

  useEffect(() => {
    const id = setInterval(() => {
      setSelectedInsight((i) => (i + 1) % AI_INSIGHTS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-accent-soft/30", className)}>
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-accent-2/15 blur-3xl" />
        <div className="bg-grid absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-glow">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h3 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
                <span>AI-Powered Discovery</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-2xs font-semibold text-accent">
                  <Sparkles className="h-3 w-3" />
                  NEW
                </span>
              </h3>
              <p className="text-xs text-muted">Natural language search • Cross-platform intelligence • Smart recommendations</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-2xs text-subtle">
            <Zap className="h-3 w-3" />
            <span className="font-mono">AI model: omni-search-v2 • {apps.length} apps indexed</span>
          </div>
        </div>

        {/* AI Search Input */}
        <div className="mt-6 relative">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-4 h-5 w-5 text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try: best open source video editor for Linux that supports 4K or privacy focused browser"
              className="h-14 w-full rounded-2xl border border-line bg-surface/80 py-3 pl-12 pr-32 text-sm backdrop-blur-sm placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button
              onClick={() => {
                if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`);
              }}
              className="absolute right-2 inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              <Wand2 className="h-4 w-4" />
              Search
            </button>
          </div>

          {/* Live AI results preview */}
          {query.length >= 2 && results.length > 0 ? (
            <div className="absolute left-0 right-0 top-[3.75rem] z-20 mt-2 rounded-2xl border border-line bg-surface p-2 shadow-raised">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-subtle">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                AI found {results.length} perfect matches for &quot;{query}&quot;
              </div>
              <div className="space-y-1">
                {results.slice(0, 4).map((app) => (
                  <button
                    key={app.id}
                    onClick={() => router.push(`/app/${app.slug}`)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-surface-3 flex items-center justify-center text-xs font-bold">
                      {app.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{app.name}</p>
                      <p className="truncate text-xs text-muted">{app.shortDescription}</p>
                    </div>
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-2xs text-accent">
                      {(app.platforms ?? []).slice(0, 2).join(", ")}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-2.5 text-xs font-medium hover:bg-surface-3 transition-colors"
              >
                View all {results.length} AI results
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : null}
        </div>

        {/* AI Suggestions */}
        <div className="mt-6">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-subtle">
            <Lightbulb className="h-3.5 w-3.5" />
            Try AI search
          </p>
          <div className="flex flex-wrap gap-2">
            {AI_SUGGESTIONS.map((s) => (
              <button
                key={s.query}
                onClick={() => {
                  setQuery(s.query);
                  router.push(`/search?q=${encodeURIComponent(s.query)}`);
                }}
                className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/60 px-3.5 py-2 text-xs font-medium text-muted backdrop-blur-sm hover:border-accent/40 hover:text-fg hover:bg-surface transition-all hover:-translate-y-0.5"
              >
                <span>{s.icon}</span>
                <span>{s.query}</span>
                <span className="hidden sm:inline text-2xs text-subtle group-hover:text-muted">— {s.intent}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Insights ticker */}
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent-soft/50 px-4 py-3">
          <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-sm text-fg transition-all duration-500">
            <span className="font-semibold text-accent">AI Insight:</span> {AI_INSIGHTS[selectedInsight]}
          </p>
          <div className="ml-auto hidden sm:flex gap-1">
            {AI_INSIGHTS.map((_, i) => (
              <span key={i} className={cn("h-1.5 w-1.5 rounded-full transition-all", i === selectedInsight ? "bg-accent w-4" : "bg-line")} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SmartCategorySuggestions({
  apps,
  onSelectCategory,
}: {
  apps: App[];
  onSelectCategory: (category: string) => void;
}) {
  // AI: suggest categories based on cross-platform coverage
  const suggestions = useMemo(() => {
    const byCat = new Map<string, { count: number; crossPlatform: number; avgTrust: number }>();
    for (const app of apps) {
      const cats = app.categories ?? [];
      for (const cat of cats) {
        const cur = byCat.get(cat) ?? { count: 0, crossPlatform: 0, avgTrust: 0 };
        cur.count += 1;
        if ((app.platforms?.length ?? 0) >= 3) cur.crossPlatform += 1;
        cur.avgTrust += app.trustScore ?? 0;
        byCat.set(cat, cur);
      }
    }
    return Array.from(byCat.entries())
      .map(([cat, data]) => ({
        category: cat,
        count: data.count,
        crossPlatform: data.crossPlatform,
        avgTrust: Math.round(data.avgTrust / data.count),
        score: data.count * 0.5 + data.crossPlatform * 2 + (data.avgTrust / data.count) * 0.1,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [apps]);

  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-accent" />
        AI-Recommended Categories
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-2xs text-accent">Smart</span>
      </h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((s) => (
          <button
            key={s.category}
            onClick={() => onSelectCategory(s.category)}
            className="group flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-left transition-all hover:border-accent/40 hover:shadow-sm hover:-translate-y-0.5"
          >
            <div>
              <p className="text-sm font-medium capitalize group-hover:text-accent">{s.category}</p>
              <p className="text-xs text-muted">{s.count} apps • {s.crossPlatform} cross-platform • trust {s.avgTrust}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-subtle group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}

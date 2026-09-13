"use client";

import Link from "next/link";
import { Monitor, Laptop, Terminal, Smartphone, Apple, Download, Github, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CrossPlatformBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-accent via-accent to-accent-2 p-[1px]">
      <div className="relative rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-surface via-surface to-accent-soft/30 p-6 sm:p-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-accent-2/10 blur-3xl" />
          <div className="bg-grid absolute inset-0 opacity-[0.03]" />
        </div>

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              <Zap className="h-3.5 w-3.5" />
              World&apos;s Largest Open-Source App Store
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              One Store. <span className="text-gradient-brand">Every Platform.</span> No Compromises.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Like App Store, Play Store, and F-Droid — but for <strong className="text-fg">all platforms</strong>. Direct downloads from upstream, source code always visible, AI-powered discovery, fully automated & open.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
                <Download className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs font-semibold">Direct Downloads</p>
                  <p className="text-2xs text-muted">From GitHub releases, no mirrors</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
                <Github className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs font-semibold">Source Links</p>
                  <p className="text-2xs text-muted">Always visit & audit source</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
                <ShieldCheck className="h-5 w-5 text-success" />
                <div>
                  <p className="text-xs font-semibold">Validated</p>
                  <p className="text-2xs text-muted">Checksums & trust scores</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/apps" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">
                Browse All Apps
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/platforms" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold hover:border-accent/40 transition-colors">
                Explore Platforms
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 lg:grid-cols-1">
            {[
              { icon: Monitor, label: "Windows", count: "230+", color: "from-blue-500 to-cyan-500" },
              { icon: Laptop, label: "macOS", count: "173+", color: "from-zinc-600 to-slate-500" },
              { icon: Terminal, label: "Linux", count: "207+", color: "from-orange-500 to-amber-500" },
              { icon: Smartphone, label: "Android", count: "39+", color: "from-green-500 to-emerald-500" },
              { icon: Apple, label: "iOS", count: "9+", color: "from-slate-600 to-zinc-500" },
            ].map((p) => (
              <Link
                key={p.label}
                href={`/platforms/${p.label.toLowerCase()}`}
                className="group flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface p-3 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-sm lg:flex-row lg:gap-3 lg:px-4"
              >
                <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", p.color)}>
                  <p.icon className="h-4 w-4" />
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-xs font-semibold group-hover:text-accent">{p.label}</p>
                  <p className="text-2xs tabular text-muted">{p.count}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AutomationBanner() {
  return (
    <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
        <Zap className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Fully Automated & Connected to OmniSource</p>
        <p className="text-xs text-muted">Daily ingest from GitHub • Validated assets only • Live feed • No manual curation • 444 apps • 13k+ assets</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-2xs font-semibold text-success">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Live
        </span>
        <Link href="/about" className="text-xs font-medium text-accent hover:underline">How it works →</Link>
      </div>
    </div>
  );
}

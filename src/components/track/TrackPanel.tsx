"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bell,
  Check,
  ExternalLink,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Download,
  Sparkles,
} from "lucide-react";

import type { App } from "@omnistore/shared-models";
import { platformLabel, relativeTime } from "@/lib/formatters";
import type { ParsedSource } from "@/lib/sources";
import { useTracked } from "@/lib/track/use-tracked";
import type { TrackedApp } from "@/lib/track/types";
import { updateFor } from "@/lib/track/types";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/app/AppIcon";

const EXAMPLES = [
  "https://github.com/localsend/localsend",
  "https://github.com/laurent22/joplin",
  "keepassxreboot/keepassxc",
  "https://codeberg.org/forgejo/forgejo",
];

interface ResolveResult {
  parsed: ParsedSource | null;
  app: App | null;
  reason: "indexed" | "not-indexed" | "unrecognised";
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; result: ResolveResult };

export function TrackPanel() {
  const t = useTranslations("track");
  const { apps, updateCount, loaded, refreshing, error, track, untrack, refresh, acknowledge, isTracked } =
    useTracked();

  const [url, setUrl] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [issueUrl, setIssueUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (loaded && apps.length > 0) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const resolve = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setState({ status: "loading" });
      setSubmitState("idle");
      setIssueUrl(null);
      try {
        const response = await fetch(`/api/v1/sources/resolve?url=${encodeURIComponent(trimmed)}`);
        if (!response.ok) throw new Error("resolve failed");
        const body = (await response.json()) as ResolveResult;
        setState({ status: "done", result: body });
      } catch {
        setState({ status: "error", message: t("refreshFailed") });
      }
    },
    [t],
  );

  const requestIndexing = useCallback(
    async (target: string) => {
      setSubmitState("sending");
      try {
        const response = await fetch("/api/v1/sources/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: target }),
        });
        const body = (await response.json()) as { accepted?: boolean; issueUrl?: string };
        if (body.issueUrl) setIssueUrl(body.issueUrl);
        setSubmitState(body.accepted ? "sent" : "failed");
      } catch {
        setSubmitState("failed");
      }
    },
    [],
  );

  const onTrack = useCallback(
    async (result: ResolveResult) => {
      const parsed = result.parsed;
      if (!parsed) return;
      const app = result.app;
      await track({
        appId: app?.id ?? null,
        slug: app?.slug ?? null,
        name: app?.name ?? parsed.slug ?? parsed.url,
        sourceUrl: app?.repository ?? parsed.url,
        source: parsed.source,
        icon: app?.icon ?? null,
        developer: app?.developer ?? parsed.slug?.split("/")[0] ?? parsed.label,
        platforms: app?.platforms ?? [],
        version: app?.version ?? null,
        releasedAt: app?.latestRelease?.releasedAt ?? null,
        pending: app === null,
      });
      setToast(t("tracked"));
      setState({ status: "idle" });
      setUrl("");
    },
    [track, t],
  );

  const result = state.status === "done" ? state.result : null;
  const resultTracked = result ? isTracked(result.app?.id ?? null, result.parsed?.url) : false;

  return (
    <div className="space-y-10">
      {/* Obtainium banner */}
      <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent-soft to-accent-2/10 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold flex items-center gap-2">
              New: Direct Updates Center — Obtainium Style
              <span className="rounded-full bg-accent px-2 py-0.5 text-2xs text-white">NEW</span>
            </p>
            <p className="text-xs text-muted">Track apps, get direct APK/EXE/DMG updates from GitHub, background checks, skip & rollback — like Obtainium but for all platforms.</p>
          </div>
        </div>
        <Link href="/updates" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-glow">
          <Download className="h-4 w-4" />
          Open Updates Center →
        </Link>
      </div>

      <section className="card-glass overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-2xs font-medium text-accent">
            <GitBranch className="h-3 w-3" aria-hidden />
            {t("sourcesSupported")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-2xs font-medium text-success">
            <Sparkles className="h-3 w-3" />
            Obtainium-style direct updates
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">{t("subtitle")}</p>

        <form
          className="mt-6 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void resolve(url);
          }}
        >
          <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-line bg-surface-2/60 px-4 h-12 transition-colors focus-within:border-accent/60">
            <Search className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
            <span className="sr-only">{t("placeholder")}</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t("placeholder")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button
            type="submit"
            disabled={state.status === "loading" || !url.trim()}
            className={cn(
              "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-gradient px-6",
              "text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50",
            )}
          >
            {state.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t("submit")}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-2xs text-subtle">{t("tryThese")}</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setUrl(example);
                void resolve(example);
              }}
              className="chip transition-colors hover:border-accent/50 hover:text-fg"
            >
              {example.replace(/^https:\/\/(github\.com|codeberg\.org)\//, "")}
            </button>
          ))}
        </div>

        {state.status === "error" ? (
          <p className="mt-5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.message}
          </p>
        ) : null}

        {result && !result.parsed ? (
          <p className="mt-5 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            {t("unrecognised")}
          </p>
        ) : null}

        {result?.parsed ? (
          <div className="mt-5 rounded-2xl border border-line bg-surface-2/50 p-4">
            {result.app ? (
              <div className="flex flex-wrap items-start gap-4">
                <AppIcon name={result.app.name} src={result.app.icon} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{result.app.name}</p>
                    <span className="chip">{result.parsed.label}</span>
                    <span className="chip">{t("indexedTitle")}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">
                    {result.app.shortDescription || result.app.description}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
                    <span className="font-mono">{result.app.version ?? t("noRelease")}</span>
                    {result.app.latestRelease?.releasedAt ? (
                      <span>{relativeTime(result.app.latestRelease.releasedAt)}</span>
                    ) : null}
                    {result.app.platforms?.length ? (
                      <span>{result.app.platforms.map(platformLabel).join(" · ")}</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/app/${result.app.slug}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm transition-colors hover:border-accent/50"
                  >
                    {t("openApp")}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                  <button
                    type="button"
                    disabled={resultTracked}
                    onClick={() => void onTrack(result)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-opacity",
                      resultTracked ? "bg-surface-3 text-muted" : "bg-brand-gradient text-white hover:opacity-90",
                    )}
                  >
                    {resultTracked ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden />
                        {t("alreadyTracked")}
                      </>
                    ) : (
                      t("submit")
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{result.parsed.slug ?? result.parsed.url}</p>
                    <span className="chip">{result.parsed.label}</span>
                    <span className="chip border-warning/40 text-warning">{t("notIndexedTitle")}</span>
                  </div>
                  <p className="mt-2 max-w-xl text-sm text-muted">{t("notIndexedBody")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void onTrack(result)}
                    disabled={resultTracked}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm transition-colors hover:border-accent/50",
                      resultTracked && "opacity-60",
                    )}
                  >
                    {resultTracked ? t("alreadyTracked") : t("submit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestIndexing(result.parsed!.url)}
                    disabled={submitState === "sending" || submitState === "sent"}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-gradient px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {submitState === "sending" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : submitState === "sent" ? (
                      <Check className="h-4 w-4" aria-hidden />
                    ) : null}
                    {submitState === "sent" ? t("requestSent") : t("requestIndexing")}
                  </button>
                </div>
              </div>
            )}

            {submitState === "failed" || issueUrl ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs">
                {submitState === "failed" ? <span className="text-warning">{t("requestFailed")}</span> : null}
                {issueUrl ? (
                  <a
                    href={issueUrl}
                    target="_blank"
                    rel="noopener noreferrer external"
                    className="inline-flex items-center gap-1.5 text-accent hover:underline"
                  >
                    {t("openIssue")}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section>
        <SectionHeading
          icon={<Bell className="h-4 w-4" aria-hidden />}
          title={t("updatesTitle")}
          count={updateCount}
          action={
            <div className="flex gap-2">
              <Link href="/updates" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white">
                <Download className="h-3.5 w-3.5" />
                Open Updates Center
              </Link>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing || apps.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/60 px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-fg disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} aria-hidden />
                {refreshing ? t("refreshing") : t("refresh")}
              </button>
            </div>
          }
        />

        {error ? (
          <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning">
            {t("refreshFailed")}
          </p>
        ) : null}

        {updateCount === 0 ? (
          <p className="mt-3 text-sm text-subtle">{apps.length === 0 ? t("trackedEmpty") : t("updatesEmpty")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {apps.map((app) => {
              const update = updateFor(app);
              if (!update) return null;
              return (
                <li key={`update-${app.key}`} className="card card-interactive flex flex-wrap items-center gap-3 p-3.5">
                  <AppIcon name={app.name} src={app.icon} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{app.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-subtle">
                      <span>{update.from}</span>
                      <ArrowRight className="h-3 w-3" aria-hidden />
                      <span className="text-accent">{update.to}</span>
                    </p>
                  </div>
                  {update.releasedAt ? (
                    <span className="text-xs text-subtle">{relativeTime(update.releasedAt)}</span>
                  ) : null}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void acknowledge(app.key)}
                      className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-fg"
                    >
                      {t("markSeen")}
                    </button>
                    {app.slug ? (
                      <Link
                        href={`/app/${app.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        {t("openApp")}
                        <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {apps.length > 0 ? (
        <section>
          <SectionHeading icon={<GitBranch className="h-4 w-4" aria-hidden />} title={t("trackedTitle")} count={apps.length} />
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {apps.map((app) => (
              <TrackedRow key={app.key} app={app} onRemove={() => void untrack(app.key)} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-surface-2/40 p-5">
        <h2 className="text-sm font-semibold">{t("disclaimerTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("disclaimerBody")}</p>
      </section>

      <div aria-live="polite" className="sr-only">
        {toast}
      </div>
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <p className="rounded-full border border-line bg-surface/95 px-4 py-2 text-sm shadow-glass backdrop-blur animate-fade-in">
            {toast}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  count,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <span className="text-accent">{icon}</span>
        {title}
        {typeof count === "number" ? (
          <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-normal text-muted tabular">
            {count}
          </span>
        ) : null}
      </h2>
      {action}
    </div>
  );
}

function TrackedRow({ app, onRemove }: { app: TrackedApp; onRemove: () => void }) {
  const t = useTranslations("track");
  const update = updateFor(app);
  return (
    <li className="card card-interactive flex items-center gap-3 p-3.5">
      <AppIcon name={app.name} src={app.icon} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{app.name}</p>
          {app.pending ? (
            <span className="chip border-warning/40 text-warning">{t("pendingBadge")}</span>
          ) : update ? (
            <span className="chip border-accent/40 text-accent">{t("updateTo", { version: update.to })}</span>
          ) : (
            <span className="chip">{t("upToDate")}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-subtle">{app.sourceUrl.replace(/^https?:\/\//, "")}</p>
        <p className="mt-1 font-mono text-2xs text-subtle">
          {app.latestVersion ?? t("noRelease")} · {t("added")} {relativeTime(app.addedAt)}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("stopTracking")}
        title={t("stopTracking")}
        className="shrink-0 rounded-full p-2 text-subtle transition-colors hover:bg-surface-2 hover:text-danger"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}

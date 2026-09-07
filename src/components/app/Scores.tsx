"use client";

import { useState } from "react";
import type { App } from "@/lib/schemas/omnisource";

export function ScoreBlock({ app }: { app: App }) {
  const [open, setOpen] = useState<"trust" | "quality" | null>(null);
  return (
    <div className="flex flex-wrap gap-4">
      <button type="button" onClick={() => setOpen(open === "trust" ? null : "trust")} className="text-left">
        <p className="text-xs text-[var(--muted)]">Trust Score</p>
        <p className="text-2xl font-semibold">{app.scores?.trust ?? "Not available"}{app.scores?.trust != null ? " / 100" : ""}</p>
        <p className="text-xs text-accent">Why this score?</p>
      </button>
      <button type="button" onClick={() => setOpen(open === "quality" ? null : "quality")} className="text-left">
        <p className="text-xs text-[var(--muted)]">Quality Score</p>
        <p className="text-2xl font-semibold">{app.scores?.quality ?? "Not available"}{app.scores?.quality != null ? " / 100" : ""}</p>
      </button>
      <div>
        <p className="text-xs text-[var(--muted)]">Popularity</p>
        <p className="text-2xl font-semibold">{app.scores?.popularity ?? "Not available"}</p>
      </div>
      {open === "trust" && (
        <div className="w-full rounded-xl border border-[var(--line)] p-3 text-sm">
          <p className="mb-2 text-[var(--muted)]">This is not a security guarantee.</p>
          <ul className="list-disc pl-5">
            {(app.scores?.trust_factors ?? ["Factors not available"]).map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
        </div>
      )}
      {open === "quality" && (
        <ul className="w-full list-disc rounded-xl border border-[var(--line)] p-3 pl-8 text-sm">
          {(app.scores?.quality_factors ?? ["Factors not available"]).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

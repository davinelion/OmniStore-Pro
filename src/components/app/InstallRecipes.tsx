"use client";
import { useState } from "react";
import type { App } from "@/lib/schemas/omnisource";
import { installCommand } from "@/lib/omnisource/enrichment";
import { Button } from "@/components/ui/button";
export function InstallRecipes({ app }: { app: App }) {
  const [message, setMessage] = useState("");
  if (!app.installation?.length) return null;
  return (
    <section className="mt-4 space-y-3 rounded-xl border border-line p-4">
      <h3 className="font-semibold">Reviewed package-manager recipes</h3>
      <p className="text-xs text-muted">
        Check the source before running a command. Package-manager packages are
        separate from the assets below and are not independently verified by
        this client.
      </p>
      {app.installation.map((recipe, i) => (
        <div key={i} className="space-y-2">
          <p className="text-sm">
            {recipe.platform} ·{" "}
            <a
              className="text-accent underline"
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Package source
            </a>
          </p>
          <code className="block overflow-x-auto rounded bg-bg p-2 text-xs">
            {installCommand(recipe)}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(installCommand(recipe));
                setMessage("Command copied. Review it before running.");
              } catch {
                setMessage(
                  "Clipboard unavailable. Select and copy the command above.",
                );
              }
            }}
          >
            Copy command
          </Button>
        </div>
      ))}
      <p role="status" className="text-xs">
        {message}
      </p>
    </section>
  );
}

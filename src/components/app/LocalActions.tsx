"use client";

import { useEffect, useState } from "react";
import { localFavorites, localWatch } from "@/lib/favorites";
import { flags } from "@/config/flags";

export function LocalActions({ appId, name, description }: { appId: string; name: string; description?: string }) {
  const [fav, setFav] = useState(false);
  const [watch, setWatch] = useState(false);
  useEffect(() => {
    setFav(localFavorites.has(appId));
    setWatch(localWatch.has(appId));
  }, [appId]);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `OmniStore · ${name}`, text: description, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {flags.favorites && (
        <button
          type="button"
          className="rounded-full border border-[var(--line)] px-3 py-1 text-sm"
          onClick={() => {
            fav ? localFavorites.remove(appId) : localFavorites.add(appId);
            setFav(!fav);
          }}
        >
          {fav ? "Saved" : "Favorite"}
        </button>
      )}
      <button
        type="button"
        className="rounded-full border border-[var(--line)] px-3 py-1 text-sm"
        onClick={() => {
          watch ? localWatch.remove(appId) : localWatch.add(appId);
          setWatch(!watch);
        }}
      >
        {watch ? "Following" : "Follow"}
      </button>
      <button type="button" className="rounded-full border border-[var(--line)] px-3 py-1 text-sm" onClick={share}>
        Share
      </button>
    </div>
  );
}

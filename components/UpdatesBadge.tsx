"use client";

import { useState } from "react";
import type { PluginInfo } from "@/lib/wpupdates";
import WpUpdatesList from "@/components/WpUpdatesList";

export default function UpdatesBadge({
  siteName,
  wpVersion,
  wpLatest,
  coreOutdated,
  plugins,
}: {
  siteName: string;
  wpVersion: string | null;
  wpLatest: string | null;
  coreOutdated: boolean;
  plugins: PluginInfo[];
}) {
  const [open, setOpen] = useState(false);
  const outdatedCount =
    (coreOutdated ? 1 : 0) + plugins.filter((p) => p.outdated).length;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`badge transition hover:brightness-125 ${
          outdatedCount > 0
            ? "bg-warn/10 text-warn"
            : "bg-surface-2 text-muted"
        }`}
        title="Ver atualizações de WordPress e plugins"
      >
        {outdatedCount > 0
          ? `🟡 ${outdatedCount} atualizaç${outdatedCount > 1 ? "ões" : "ão"}`
          : "WP ✓ em dia"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="card max-h-[85vh] w-full max-w-md overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-text">
                  WordPress &amp; atualizações
                </h3>
                <p className="truncate text-sm text-muted">{siteName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted transition hover:text-text"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <WpUpdatesList
              wpVersion={wpVersion}
              wpLatest={wpLatest}
              coreOutdated={coreOutdated}
              plugins={plugins}
            />
          </div>
        </div>
      )}
    </>
  );
}

import type { PluginInfo } from "@/lib/wpupdates";

// Apresentação pura (sem estado) — usada no painel de detalhe e no modal do card.
export default function WpUpdatesList({
  wpVersion,
  wpLatest,
  coreOutdated,
  plugins,
}: {
  wpVersion: string | null;
  wpLatest: string | null;
  coreOutdated: boolean;
  plugins: PluginInfo[];
}) {
  const outdatedCount = plugins.filter((p) => p.outdated).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-lg bg-bg/40 px-3 py-2.5">
        <span className="text-sm text-text">WordPress (core)</span>
        {wpVersion ? (
          coreOutdated ? (
            <span className="badge bg-warn/10 text-warn">
              🟡 {wpVersion} → {wpLatest}
            </span>
          ) : (
            <span className="badge bg-good/10 text-good">
              ✓ {wpVersion} (atualizado)
            </span>
          )
        ) : (
          <span className="text-sm text-muted">versão não exposta</span>
        )}
      </div>

      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-muted">
          Plugins detectados: {plugins.length}
        </span>
        {outdatedCount > 0 && (
          <span className="text-xs font-medium text-warn">
            {outdatedCount} desatualizado(s)
          </span>
        )}
      </div>

      {plugins.length === 0 ? (
        <p className="text-sm text-muted">Nenhum plugin com versão exposta.</p>
      ) : (
        <ul className="space-y-1">
          {plugins.map((p) => (
            <li
              key={p.slug}
              className="flex items-center justify-between gap-3 rounded-lg bg-bg/40 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-text">{p.slug}</span>
              {p.latest == null ? (
                <span className="shrink-0 text-xs text-muted">
                  {p.installed} · não verificável
                </span>
              ) : p.outdated ? (
                <span className="badge shrink-0 bg-warn/10 text-warn">
                  🟡 {p.installed} → {p.latest}
                </span>
              ) : (
                <span className="shrink-0 text-xs text-good">✓ {p.installed}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-muted/70">
        “Não verificável” = plugin premium (fora do repositório oficial).
      </p>
    </div>
  );
}

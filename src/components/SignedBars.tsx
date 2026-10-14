// Barras horizontales que admiten valores negativos (utilidad, pérdidas).
export function SignedBars({
  title,
  items,
  format,
}: {
  title: string;
  items: { label: string; value: number }[];
  format: (v: number) => string;
}) {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((i) => (
          <div key={i.label} className="grid grid-cols-[7rem_1fr] items-center gap-2 text-xs">
            <span className="truncate text-muted-foreground">{i.label}</span>
            <div className="flex items-center gap-2">
              <div className="h-4 flex-1 overflow-hidden rounded bg-secondary">
                <div
                  className={`h-full rounded ${i.value < 0 ? "bg-destructive" : "bg-primary/80"}`}
                  style={{ width: `${(Math.abs(i.value) / max) * 100}%` }}
                />
              </div>
              <span className={`w-24 text-right font-medium ${i.value < 0 ? "text-destructive" : ""}`}>
                {format(i.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

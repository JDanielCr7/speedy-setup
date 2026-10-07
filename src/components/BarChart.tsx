import type { DayBucket } from "@/services/analyticsService";

export function BarChart({
  title,
  data,
  formatValue = (v: number) => String(v),
}: {
  title: string;
  data: DayBucket[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {!hasData ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Registra algunos lavados para comenzar a visualizar tendencias.
        </p>
      ) : (
        <div className="mt-4 flex h-44 gap-1.5 overflow-x-auto">
          {data.map((d) => (
            <div
              key={d.label}
              className="flex h-full min-w-8 flex-1 flex-col items-center gap-1"
              title={`${d.label}: ${formatValue(d.value)}`}
            >
              <span className="text-[10px] font-medium text-muted-foreground">
                {d.value > 0 ? formatValue(d.value) : ""}
              </span>
              <div className="flex w-full flex-1 flex-col justify-end">
                <div
                  className="w-full rounded-t-md bg-primary/80 transition-all"
                  style={{
                    height: `${max > 0 ? Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0) : 0}%`,
                  }}
                />
              </div>
              <span className="max-w-14 truncate text-[10px] text-muted-foreground">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  label: string;
  currentLiters: number;
  totalLiters: number;
  sourceType?: string;
  compact?: boolean;
}

const SOURCE_ICON: Record<string, string> = {
  POND: '🏞',
  BOREWELL: '⛏',
  CANAL: '〰',
  TANK: '🛢',
  RIVER: '🌊',
};

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K L` : `${Math.round(n)} L`;

export default function WaterCapacityGauge({
  label,
  currentLiters,
  totalLiters,
  sourceType,
  compact = false,
}: Props) {
  const pct = totalLiters > 0 ? Math.min(100, (currentLiters / totalLiters) * 100) : 0;

  const fillColor =
    pct > 60
      ? 'from-blue-500 to-cyan-400'
      : pct > 30
      ? 'from-amber-500 to-yellow-400'
      : 'from-red-500 to-orange-400';

  const textColor =
    pct > 60 ? 'text-blue-700' : pct > 30 ? 'text-amber-700' : 'text-red-700';

  const bgTrack =
    pct > 60 ? 'bg-blue-100' : pct > 30 ? 'bg-amber-100' : 'bg-red-100';

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-stone-700 truncate">
            {sourceType && (
              <span className="mr-1">{SOURCE_ICON[sourceType] ?? '💧'}</span>
            )}
            {label}
          </span>
          <span className={`font-semibold tabular-nums ${textColor}`}>
            {Math.round(pct)}%
          </span>
        </div>
        <div className={`h-2 w-full rounded-full ${bgTrack} overflow-hidden`}>
          <div
            className={`h-full rounded-full bg-gradient-to-r ${fillColor} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-stone-400 tabular-nums">
          <span>{fmt(currentLiters)}</span>
          <span>{fmt(totalLiters)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">
          {SOURCE_ICON[sourceType ?? ''] ?? '💧'}
        </div>
        <div>
          <p className="font-semibold text-stone-800 text-sm">{label}</p>
          {sourceType && (
            <p className="text-xs text-stone-400 capitalize">{sourceType.toLowerCase()}</p>
          )}
        </div>
        <div className={`ml-auto text-2xl font-bold tabular-nums ${textColor}`}>
          {Math.round(pct)}%
        </div>
      </div>

      {/* Liquid bar */}
      <div className="relative">
        <div className={`h-6 w-full rounded-full ${bgTrack} overflow-hidden`}>
          <div
            className={`h-full rounded-full bg-gradient-to-r ${fillColor} transition-all duration-700 relative`}
            style={{ width: `${pct}%` }}
          >
            {/* animated shimmer */}
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>
        {/* wave marks */}
        {[25, 50, 75].map((mark) => (
          <div
            key={mark}
            className="absolute top-0 bottom-0 w-px bg-white/60"
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>

      {/* Liters */}
      <div className="mt-3 flex justify-between text-xs text-stone-500 tabular-nums">
        <span>
          <span className={`font-semibold text-sm ${textColor}`}>
            {currentLiters.toLocaleString('en-IN')} L
          </span>{' '}
          available
        </span>
        <span>of {totalLiters.toLocaleString('en-IN')} L total</span>
      </div>
    </div>
  );
}

import { PencilLine } from 'lucide-react';

const SOIL_TYPE_LABELS = {
  Kanhar: 'Kanhar (Black)',
  Matasi: 'Matasi (Red & Yellow)',
  Dorsa: 'Dorsa (Medium)',
  Bhata: 'Bhata (Laterite)',
};

const getBadgeClasses = (score) => {
  if (score >= 75) {
    return 'border-green-300 bg-green-100 text-green-800';
  }

  if (score >= 50) {
    return 'border-yellow-300 bg-yellow-100 text-yellow-800';
  }

  if (score >= 25) {
    return 'border-orange-300 bg-orange-100 text-orange-800';
  }

  return 'border-red-300 bg-red-100 text-red-800';
};

const getTipEmoji = (tip) => {
  const lowerTip = tip.toLowerCase();

  if (lowerTip.includes('limestone') || lowerTip.includes('caco3')) {
    return '🪨';
  }

  if (lowerTip.includes('drainage') || lowerTip.includes('water') || lowerTip.includes('moisture')) {
    return '💧';
  }

  if (lowerTip.includes('green manure')) {
    return '🌱';
  }

  if (lowerTip.includes('compost') || lowerTip.includes('manure') || lowerTip.includes('mulch')) {
    return '🌿';
  }

  return '🌿';
};

const breakdownItems = (report) => [
  { label: 'pH Score', score: report.phScore, max: 30 },
  { label: 'Drainage', score: report.drainageScore, max: 25 },
  { label: 'Soil Type', score: report.soilTypeScore, max: 25 },
  { label: 'Earthworms', score: report.earthwormScore, max: 20 },
];

export default function SoilReportCard({ report, zoneName, onEdit }) {
  const badgeClasses = getBadgeClasses(report.soilHealthScore);
  const reportSeason = report.recommendations?.[0]?.season;
  const reportYear = new Date(report.updatedAt).getFullYear();
  const seasonLabel = reportSeason ? `${reportSeason} ${reportYear}` : String(reportYear);
  const showDefaultsNote = report.phLevel === 6.5 && report.earthwormCount === 3;

  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-stone-900">{zoneName}</h3>
        </div>
        <div className="flex items-start gap-3 self-start sm:items-center">
          <button
            type="button"
            onClick={onEdit}
            className="flex min-h-12 items-center gap-2 rounded-2xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
          >
            <PencilLine className="h-4 w-4" />
            Edit
          </button>
          <div
            className={`flex h-16 w-16 flex-col items-center justify-center rounded-full border text-center ${badgeClasses}`}
          >
            <span className="text-lg font-bold">{Math.round(report.soilHealthScore)}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-lg font-semibold text-stone-800">
        {Math.round(report.soilHealthScore)} - {report.scoreLabel} Soil
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700">
          Soil type: {SOIL_TYPE_LABELS[report.soilType] || report.soilType}
        </span>
        <span className="rounded-full bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700">
          Drainage: {report.drainageSpeed}
        </span>
        <span className="rounded-full bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700">
          Season: {seasonLabel}
        </span>
        <span className="rounded-full bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700">
          pH: {report.phLevel.toFixed(1)}
          {report.phLevel === 6.5 ? '*' : ''}
        </span>
      </div>

      <section className="mt-6">
        <h4 className="text-base font-semibold text-stone-900">Score Breakdown</h4>
        <div className="mt-4 space-y-4">
          {breakdownItems(report).map((item) => (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-stone-700">{item.label}</span>
                <span className="text-sm font-semibold text-stone-900">
                  {item.score} / {item.max}
                </span>
              </div>
              <div className="h-[10px] rounded-full bg-gray-100">
                <div
                  className="h-[10px] rounded-full bg-green-400"
                  style={{ width: `${Math.min((item.score / item.max) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h4 className="text-base font-semibold text-stone-900">
          Recommended Crops - {reportSeason || 'Current Season'}
        </h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {report.recommendations?.length ? (
            report.recommendations.map((recommendation) => (
              <span
                key={`${recommendation.cropName}-${recommendation.season}`}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  recommendation.soilFit === 'High'
                    ? 'border border-green-300 bg-green-100 text-green-800'
                    : recommendation.soilFit === 'Medium'
                    ? 'border border-yellow-300 bg-yellow-100 text-yellow-800'
                    : 'border border-gray-300 bg-gray-100 text-gray-600'
                }`}
              >
                {recommendation.cropName}
              </span>
            ))
          ) : (
            <p className="text-sm text-stone-500">
              No seasonal crop match was found for the current pH range yet.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h4 className="text-base font-semibold text-stone-900">How to improve this soil</h4>
        {report.improvementTips?.length ? (
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {report.improvementTips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span>{getTipEmoji(tip)}</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-stone-600">Your soil is in good condition for farming.</p>
        )}
      </section>

      {showDefaultsNote ? (
        <p className="mt-6 text-sm italic text-stone-500">
          * pH and earthworm values are estimated defaults. Tap Edit to enter your actual test
          results for more precise recommendations.
        </p>
      ) : null}
    </div>
  );
}

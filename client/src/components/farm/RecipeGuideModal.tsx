import { useEffect, useState } from 'react';
import { X, Clock, Lightbulb, ListChecks, Beaker } from 'lucide-react';
import { getRecipeGuide } from '../../lib/api';
import type { RecipeGuide } from '../../lib/api';

export default function RecipeGuideModal({ recipeKey, acres = 1, onClose }: { recipeKey: string; acres?: number; onClose: () => void }) {
  const [guide, setGuide] = useState<RecipeGuide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecipeGuide(recipeKey, acres)
      .then(setGuide)
      .catch(() => setGuide(null))
      .finally(() => setLoading(false));
  }, [recipeKey, acres]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-t-[28px] bg-white sm:rounded-[28px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-stone-900">{recipeKey}</h2>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">100% Natural</span>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && <div className="p-8 text-center text-sm text-stone-500">Loading recipe…</div>}

        {guide && (
          <div className="space-y-5 p-5">
            <p className="text-sm leading-6 text-stone-700">{guide.purpose}</p>

            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <Clock className="h-4 w-4" />
              Preparation time: <strong>{guide.prepTimeHours} hours</strong>
            </div>

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-900">
                <ListChecks className="h-4 w-4 text-emerald-600" />
                Ingredients (for {guide.scaledForAcres.toFixed(2)} {guide.scaledForAcres === 1 ? 'acre' : 'acres'})
              </h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {guide.ingredients.map((ing) => (
                  <li key={ing.key} className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs">
                    <p className="font-semibold text-stone-900">{ing.label}</p>
                    <p className="text-stone-600">{ing.amount} {ing.unit}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-bold text-stone-900">Step-by-step</h3>
              <ol className="space-y-2">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-6 text-stone-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-yellow-900">
                <Lightbulb className="h-4 w-4" />
                Tips
              </h3>
              <ul className="space-y-1 text-xs text-yellow-800">
                {guide.tips.map((tip, i) => <li key={i}>• {tip}</li>)}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

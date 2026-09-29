import { useEffect, useState } from 'react';
import type { AxiosError } from 'axios';
import { getInputRecipe } from '../../lib/api';
import type { InputRecipeResponse } from '../../types/farm';

interface NaturalInputCalculatorProps {
  zoneId: string;
}

interface ApiErrorResponse {
  message?: string;
}

const RECIPE_OPTIONS = ['Jeevamrit', 'Agniastra'] as const;
type RecipeType = (typeof RECIPE_OPTIONS)[number];

const CalculatorSkeleton = () => (
  <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="h-4 w-48 animate-pulse rounded-full bg-stone-200" />
    <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
          <div className="h-3 w-20 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-3 h-8 w-16 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-2 h-3 w-10 animate-pulse rounded-full bg-stone-200" />
        </div>
      ))}
    </div>
  </div>
);

export default function NaturalInputCalculator({ zoneId }: NaturalInputCalculatorProps) {
  const [data, setData] = useState<InputRecipeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeType>('Jeevamrit');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await getInputRecipe(zoneId, selectedRecipe);
        if (isMounted) setData(response);
      } catch (error) {
        if (!isMounted) return;
        const apiError = error as AxiosError<ApiErrorResponse>;
        setErrorMessage(
          apiError.response?.data?.message || 'Could not load recipe data right now.'
        );
        setData(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [zoneId, selectedRecipe]);

  if (isLoading) return <CalculatorSkeleton />;

  if (errorMessage || !data) {
    return (
      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">
          Natural Input Calculator
        </p>
        <p className="mt-3 text-sm text-stone-600">
          {errorMessage || 'Could not load recipe data right now.'}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Natural Input Calculator
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-stone-900">
            {selectedRecipe} for {data.zoneName}
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Scaled for {data.areaAcres.toFixed(2)} acres
          </p>
        </div>

        <select
          value={selectedRecipe}
          onChange={(e) => setSelectedRecipe(e.target.value as RecipeType)}
          className="self-start rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {RECIPE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.ingredients.map((ingredient) => (
          <div
            key={ingredient.key}
            className="flex flex-col rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              {ingredient.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-stone-900">
              {ingredient.amount % 1 === 0
                ? ingredient.amount.toFixed(0)
                : ingredient.amount.toFixed(2)}
            </p>
            <p className="mt-1 text-sm font-medium text-stone-500">{ingredient.unit}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs text-stone-400">
        Per-acre recipe sourced from the natural farming manual. Quantities are proportional to zone acreage.
      </p>
    </section>
  );
}

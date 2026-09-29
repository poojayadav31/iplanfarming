import { useEffect, useState } from 'react';
import type { AxiosError } from 'axios';
import { getFinancialEstimate } from '../../lib/api';
import type { FinancialEstimateResponse } from '../../types/farm';

interface FinancialEstimatorProps {
  zoneId: string;
}

interface ApiErrorResponse {
  message?: string;
}

const CROP_OPTIONS = ['Haldi', 'Papaya', 'Leafy Veg'] as const;
type CropOption = (typeof CROP_OPTIONS)[number];

const formatINR = (amount: number) =>
  '₹' + Math.round(amount).toLocaleString('en-IN');

const EstimatorSkeleton = () => (
  <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="h-4 w-48 animate-pulse rounded-full bg-stone-200" />
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
          <div className="h-3 w-24 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-4 h-8 w-32 animate-pulse rounded-full bg-stone-200" />
        </div>
      ))}
    </div>
  </div>
);

export default function FinancialEstimator({ zoneId }: FinancialEstimatorProps) {
  const [data, setData] = useState<FinancialEstimateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<CropOption>('Haldi');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await getFinancialEstimate(zoneId, selectedCrop);
        if (isMounted) setData(response);
      } catch (error) {
        if (!isMounted) return;
        const apiError = error as AxiosError<ApiErrorResponse>;
        setErrorMessage(
          apiError.response?.data?.message || 'Could not load financial estimate right now.'
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
  }, [zoneId, selectedCrop]);

  if (isLoading) return <EstimatorSkeleton />;

  if (errorMessage || !data) {
    return (
      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">
          Farm Financial Estimator
        </p>
        <p className="mt-3 text-sm text-stone-600">
          {errorMessage || 'Could not load financial estimate right now.'}
        </p>
      </section>
    );
  }

  const metrics = [
    {
      label: 'Estimated Cost',
      value: formatINR(data.estimatedInputCost),
      valueClass: 'text-rose-600',
      description: 'Seeds, labor & layout',
    },
    {
      label: 'Gross Income',
      value: formatINR(data.estimatedGrossIncome),
      valueClass: 'text-emerald-600',
      description: `Yield × market price`,
    },
    {
      label: 'Projected Net Profit',
      value: formatINR(data.netProfit),
      valueClass: 'text-emerald-700 font-bold',
      description: 'Income minus input cost',
    },
  ];

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Farm Financial Estimator
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-stone-900">
            {data.cropName} on {data.zoneName}
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Projected for {data.areaAcres.toFixed(2)} acres
          </p>
        </div>

        <select
          value={selectedCrop}
          onChange={(e) => setSelectedCrop(e.target.value as CropOption)}
          className="self-start rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {CROP_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex flex-col rounded-3xl border border-stone-100 bg-stone-50 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              {metric.label}
            </p>
            <p className={`mt-3 text-2xl ${metric.valueClass}`}>{metric.value}</p>
            <p className="mt-2 text-xs text-stone-400">{metric.description}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs text-stone-400">
        Estimates are based on standard natural farming yields and average market prices. Actual results may vary.
      </p>
    </section>
  );
}

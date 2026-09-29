import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { farmService } from '../lib/farms';
import type { Farm } from '../types/farm';
import FarmDesignerStudio from '../components/designer/FarmDesignerStudio';

export default function FarmDesignerPage() {
  const { farmId, designId } = useParams<{ farmId: string; designId?: string }>();
  const navigate = useNavigate();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) {
      navigate('/dashboard', { replace: true });
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    farmService
      .getFarmById(farmId)
      .then((data) => {
        if (isMounted) {
          setFarm(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const msg = err?.response?.data?.message || 'Could not load farm for design studio.';
          setError(msg);
          toast.error(msg);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [farmId, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-green-700" />
          <p className="text-xs font-semibold text-stone-600">Loading Farm Designer &amp; Bed Planning Studio...</p>
        </div>
      </div>
    );
  }

  if (error || !farm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-base font-bold text-stone-900">Could not open Designer</h2>
          <p className="mt-2 text-xs text-stone-600">{error || 'Farm data unavailable.'}</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <FarmDesignerStudio farm={farm} initialDesignId={designId} />;
}

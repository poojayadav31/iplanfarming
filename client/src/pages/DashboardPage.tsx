import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Store, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardShell from '../components/DashboardShell';
import FarmMapper from '../components/farm/FarmMapper';
import { useAuth } from '../context/AuthContext';
import { farmService } from '../lib/farms';
import type { Farm } from '../types/farm';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [farms, setFarms] = useState<Farm[] | null>(null);
  const [isLoading, setIsLoading] = useState(user?.role === 'FARMER');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'FARMER') {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    farmService
      .getFarms()
      .then((data) => {
        if (isMounted) {
          setFarms(data);
          setLoadError(null);
        }
      })
      .catch((error) => {
        const message = error?.response?.data?.details || error?.response?.data?.message;
        setLoadError(message || 'Could not load farm details.');
        toast.error(message || 'Could not load farm details.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'FARMER' || !farms?.length) {
      return;
    }

    const [farm] = farms;

    if (!farm.zones.length) {
      navigate(`/dashboard/farm/${farm.id}/zones`, { replace: true, state: { farm } });
      return;
    }

    navigate(`/dashboard/farm/${farm.id}`, { replace: true });
  }, [farms, navigate, user?.role]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'EXPERT') {
    return (
      <DashboardShell
        title={`Welcome, ${user.name}`}
        subtitle="Expert panel — manage farm data, post advisories and suggest crops to farmers."
      >
        <div className="rounded-[28px] border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <FlaskConical className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-lg font-bold text-stone-900">Expert Panel</p>
              <p className="text-sm text-stone-500">Full database access for agricultural experts</p>
            </div>
          </div>
          <p className="mb-6 text-sm text-stone-500">
            View all farm soil reports, update crop economics and water requirements, post seasonal
            advisories, add calendar tasks to any farm, and suggest crops to specific zones.
          </p>
          <button
            onClick={() => navigate('/expert')}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition"
          >
            <FlaskConical className="h-4 w-4" /> Open Expert Panel
          </button>
        </div>
      </DashboardShell>
    );
  }

  if (user.role !== 'FARMER') {
    return (
      <DashboardShell
        title={`Welcome, ${user.name}`}
        subtitle="Browse fresh natural farm produce directly from verified Chhattisgarh farmers."
      >
        <div className="rounded-[28px] border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <Store className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-lg font-bold text-stone-900">Farm Market</p>
              <p className="text-sm text-stone-500">Buy directly from farmers — no middlemen</p>
            </div>
          </div>
          <p className="mb-6 text-sm text-stone-500">
            Browse upcoming harvests, place orders for Haldi, Papaya, seasonal vegetables and more —
            sourced from natural farms in your district.
          </p>
          <button
            onClick={() => navigate('/market')}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 transition"
          >
            <Store className="h-4 w-4" /> Go to Market
          </button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Set Up Your Farm Map"
      subtitle="Start by drawing the outer boundary of your farm. Area is shown mainly in bigha for Chhattisgarh farmers."
    >
      {isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center rounded-[28px] border border-stone-200 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-green-700" />
        </div>
      ) : loadError ? (
        <div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-semibold text-red-700">Could not load farm setup</p>
          <p className="mt-2 text-sm text-stone-600">{loadError}</p>
        </div>
      ) : farms?.length ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-[28px] border border-stone-200 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-green-700" />
        </div>
      ) : (
        <FarmMapper />
      )}
    </DashboardShell>
  );
}

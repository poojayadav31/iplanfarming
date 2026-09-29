import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardShell from '../components/DashboardShell';
import ZoneManager from '../components/farm/ZoneManager';
import { farmService } from '../lib/farms';
import type { Farm } from '../types/farm';

interface LocationState {
  farm?: Farm;
}

export default function FarmZonePage() {
  const { farmId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [farm, setFarm] = useState<Farm | null>(() => (location.state as LocationState | null)?.farm ?? null);
  const [isLoading, setIsLoading] = useState(!farm);

  useEffect(() => {
    if (!farmId) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (farm) {
      return;
    }

    let isMounted = true;

    farmService
      .getFarmById(farmId)
      .then((data) => {
        if (isMounted) {
          setFarm(data);
        }
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || 'Could not load this farm.');
        navigate('/dashboard', { replace: true });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [farm, farmId, navigate]);

  return (
    <DashboardShell
      title="Divide Your Farm Into Zones"
      subtitle="We use your saved farm boundary to suggest practical management zones for planning."
    >
      {isLoading || !farm ? (
        <div className="flex min-h-[50vh] items-center justify-center rounded-[28px] border border-stone-200 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-green-700" />
        </div>
      ) : (
        <ZoneManager farmId={farm.id} farmBoundary={farm.boundary} farmAreaBigha={farm.areaBigha} />
      )}
    </DashboardShell>
  );
}

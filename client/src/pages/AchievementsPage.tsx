import { useEffect, useState } from 'react';
import { Award, Lock } from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { getMyAchievements } from '../lib/api';
import type { AchievementBadge } from '../lib/api';

const ALL_BADGES = [
  { key: 'first_farm',      title: 'Welcome, Farmer!',     description: 'Create your first farm' },
  { key: 'first_soil',      title: 'Soil Scientist',       description: 'Fill your first soil report' },
  { key: 'first_crop',      title: 'First Seed',           description: 'Assign your first crop to a zone' },
  { key: 'three_zones',     title: 'Multi-Zone Master',    description: 'Manage 3 or more zones' },
  { key: 'first_jeevamrit', title: 'Natural Farmer',       description: 'Complete your first Jeevamrit application' },
  { key: 'first_harvest',   title: 'First Harvest',        description: 'Mark your first harvest task done' },
  { key: 'full_season',     title: 'Full Cycle',           description: 'Complete a full crop season' },
  { key: 'weekly_streak',   title: 'Steady Hand',          description: 'Complete tasks 7 days in a row' },
];

export default function AchievementsPage() {
  const [earned, setEarned] = useState<AchievementBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAchievements()
      .then(setEarned)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardShell title="Achievements" subtitle="Loading..."><div className="h-32 animate-pulse rounded-3xl bg-stone-200" /></DashboardShell>;

  const earnedKeys = new Set(earned.map((a) => a.badgeKey));

  return (
    <DashboardShell title="Achievements" subtitle={`You have earned ${earned.length} of ${ALL_BADGES.length} badges so far. Keep going!`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_BADGES.map((b) => {
          const isEarned = earnedKeys.has(b.key);
          return (
            <div key={b.key} className={`rounded-3xl border p-5 shadow-sm ${isEarned ? 'border-yellow-200 bg-yellow-50' : 'border-stone-200 bg-stone-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isEarned ? 'bg-yellow-200' : 'bg-stone-200'}`}>
                  {isEarned ? <Award className="h-6 w-6 text-yellow-700" /> : <Lock className="h-5 w-5 text-stone-400" />}
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isEarned ? 'bg-yellow-200 text-yellow-800' : 'bg-stone-200 text-stone-500'}`}>
                  {isEarned ? 'EARNED' : 'LOCKED'}
                </span>
              </div>
              <p className={`mt-3 text-base font-bold ${isEarned ? 'text-yellow-900' : 'text-stone-500'}`}>{b.title}</p>
              <p className={`mt-1 text-sm ${isEarned ? 'text-yellow-800' : 'text-stone-500'}`}>{b.description}</p>
              {isEarned && (() => {
                const e = earned.find((x) => x.badgeKey === b.key);
                return e ? <p className="mt-2 text-[10px] font-semibold text-yellow-700">Earned {new Date(e.earnedAt).toLocaleDateString()}</p> : null;
              })()}
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}

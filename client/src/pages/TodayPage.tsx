import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Circle, Sprout, Leaf, AlertCircle, BookOpen, Award,
  MessageCircle, MapPin, Sun, Sparkles, FileText, TrendingUp, Target,
  Users, ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardShell from '../components/DashboardShell';
import { getTodayDashboard } from '../lib/api';
import type { TodayDashboard } from '../lib/api';
import RecipeGuideModal from '../components/farm/RecipeGuideModal';

const RISK_COLORS: Record<string, string> = {
  beginner:     'bg-emerald-100 text-emerald-800 border-emerald-200',
  intermediate: 'bg-amber-100 text-amber-800 border-amber-200',
  expert:       'bg-rose-100 text-rose-800 border-rose-200',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export default function TodayPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TodayDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipeOpen, setRecipeOpen] = useState<{ key: string; acres: number } | null>(null);

  useEffect(() => {
    getTodayDashboard()
      .then(setData)
      .catch(() => toast.error("Could not load today's tasks"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardShell title="Today" subtitle="Loading…">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-stone-200" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (!data?.hasFarm) {
    return (
      <DashboardShell title="Welcome to iPlanFarmHouse" subtitle="Let's set up your first farm">
        <div className="rounded-[28px] border border-stone-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Sprout className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-stone-900">No farm yet</h2>
          <p className="mt-2 text-sm text-stone-500 max-w-xs mx-auto">
            Create your first farm to get crop recommendations and a personalised farming calendar.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 rounded-2xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Set up my farm
          </button>
        </div>
      </DashboardShell>
    );
  }

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const doneTasks  = data.todayTasks.filter((t) => t.status === 'COMPLETED').length;
  const totalTasks = data.todayTasks.length;

  return (
    <DashboardShell
      title={`${greeting}! 🌱`}
      subtitle={`${DAYS[today.getDay()]}, ${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`}
    >
      <div className="space-y-5">

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Sun className="h-5 w-5 text-amber-500" />}
            label="Today's tasks"
            value={`${doneTasks} / ${totalTasks}`}
            sub="completed"
            color="border-amber-200 bg-amber-50"
          />
          <StatCard
            icon={<Leaf className="h-5 w-5 text-emerald-600" />}
            label="Active crops"
            value={data.activeZones.length}
            sub="zones planted"
            color="border-emerald-200 bg-emerald-50"
          />
          <StatCard
            icon={<Award className="h-5 w-5 text-yellow-500" />}
            label="Achievements"
            value={data.achievements.length}
            sub="badges earned"
            color="border-yellow-200 bg-yellow-50"
          />
          <StatCard
            icon={<ClipboardList className="h-5 w-5 text-violet-600" />}
            label="This week"
            value={data.weekTasks.length}
            sub="tasks ahead"
            color="border-violet-200 bg-violet-50"
          />
        </div>

        {/* ── Today's tasks ── */}
        <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-bold text-stone-900">Today's tasks</h2>
            </div>
            {totalTasks > 0 && (
              <span className="text-xs font-semibold text-stone-500">
                {doneTasks}/{totalTasks} done
              </span>
            )}
          </div>

          {totalTasks === 0 ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-5 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-2 text-sm font-semibold text-emerald-700">All clear today — enjoy your day!</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.todayTasks.map((t) => (
                <li
                  key={t.id}
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 transition ${
                    t.status === 'COMPLETED'
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                  }`}
                >
                  {t.status === 'COMPLETED'
                    ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-stone-300" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${t.status === 'COMPLETED' ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {t.zoneName ? `${t.zoneName} · ` : ''}{t.cropName}
                    </p>
                    {t.recipeKey && (
                      <button
                        onClick={() => setRecipeOpen({ key: t.recipeKey!, acres: 1 })}
                        className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-200"
                      >
                        <BookOpen className="h-3 w-3" />
                        How to make {t.recipeKey}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Active zones / crops with progress ── */}
        {data.activeZones.length > 0 && (
          <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-stone-900">Your crops</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.activeZones.map((z) => (
                <div key={z.zoneId} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-stone-900">{z.cropName}</p>
                      <p className="text-xs text-stone-500">{z.zoneName} · {z.areaBigha.toFixed(1)} Bigha</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize shrink-0 ${RISK_COLORS[z.riskLevel] ?? RISK_COLORS.intermediate}`}>
                      {z.riskLevel}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                      <span>Week {z.weeksElapsed} of {z.totalWeeks}</span>
                      <span className="font-semibold text-emerald-700">{z.progressPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-200">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${z.progressPct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/season-report/${z.zoneId}`)}
                    className="mt-3 flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <FileText className="h-3 w-3" />
                    Season Report
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── This week ── */}
        {data.weekTasks.length > 0 && (
          <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-bold text-stone-900">This week</h2>
            <ul className="mt-3 divide-y divide-stone-100">
              {data.weekTasks.slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="font-medium text-stone-700">{t.title}</span>
                  <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                    {formatDate(t.scheduledDate)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Achievements ── */}
        {data.achievements.length > 0 && (
          <section className="rounded-[28px] border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              <h2 className="text-base font-bold text-yellow-900">Recent achievements</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.achievements.map((a) => (
                <div key={a.id} className="rounded-2xl border border-yellow-300 bg-white px-3 py-2 text-xs shadow-sm">
                  <p className="font-bold text-yellow-800">🏆 {a.title}</p>
                  <p className="mt-0.5 text-yellow-700">{a.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Quick actions ── */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500">Quick access</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickBtn icon={<MapPin className="h-5 w-5 text-emerald-600" />} label="My Farms" onClick={() => navigate('/dashboard')} color="border-stone-200 bg-white hover:bg-stone-50" />
            <QuickBtn icon={<Sparkles className="h-5 w-5 text-violet-600" />} label="Smart Insights" onClick={() => navigate('/insights')} color="border-violet-200 bg-violet-50 hover:bg-violet-100" />
            <QuickBtn icon={<MessageCircle className="h-5 w-5 text-blue-600" />} label="Ask Expert" onClick={() => navigate('/ask-expert')} color="border-blue-200 bg-blue-50 hover:bg-blue-100" />
            <QuickBtn icon={<Users className="h-5 w-5 text-emerald-600" />} label="Community" onClick={() => navigate('/community')} color="border-emerald-200 bg-emerald-50 hover:bg-emerald-100" />
            <QuickBtn icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />} label="Checklist" onClick={() => navigate('/checklist')} color="border-teal-200 bg-teal-50 hover:bg-teal-100" />
            <QuickBtn icon={<Target className="h-5 w-5 text-violet-600" />} label="My Goals" onClick={() => navigate('/goals')} color="border-violet-200 bg-violet-50 hover:bg-violet-100" />
            <QuickBtn icon={<AlertCircle className="h-5 w-5 text-rose-600" />} label="Report Problem" onClick={() => navigate('/report-issue')} color="border-rose-200 bg-rose-50 hover:bg-rose-100" />
            <QuickBtn icon={<Award className="h-5 w-5 text-yellow-600" />} label="Badges" onClick={() => navigate('/achievements')} color="border-yellow-200 bg-yellow-50 hover:bg-yellow-100" />
            <QuickBtn icon={<TrendingUp className="h-5 w-5 text-amber-600" />} label="Market" onClick={() => navigate('/market')} color="border-amber-200 bg-amber-50 hover:bg-amber-100" />
          </div>
        </section>

      </div>

      {recipeOpen && (
        <RecipeGuideModal recipeKey={recipeOpen.key} acres={recipeOpen.acres} onClose={() => setRecipeOpen(null)} />
      )}
    </DashboardShell>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string; color: string;
}) {
  return (
    <div className={`rounded-[28px] border p-4 shadow-sm ${color}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-stone-900">{value}</p>
      <p className="text-xs text-stone-500">{sub}</p>
    </div>
  );
}

function QuickBtn({ icon, label, onClick, color }: {
  icon: React.ReactNode; label: string; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-xs font-semibold text-stone-800 shadow-sm transition ${color}`}
    >
      {icon}
      {label}
    </button>
  );
}

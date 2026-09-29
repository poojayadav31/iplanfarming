import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, AlertTriangle, TrendingUp, Users, Wrench, ScrollText, ListChecks, Target, Sparkles, BookOpen } from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import {
  getWeatherAlerts, getPestAlerts, getMandiPrices, getGovSchemes,
  listChecklist, listSeasonGoals, listBuyGroups, listEquipment,
  getCompliance, listKnowledge,
} from '../lib/api';
import { farmService } from '../lib/farms';
import { DroughtBanner } from '../components/farm/IntelligenceWidgets';
import type { WeatherAlertItem, PestAlertItem, MandiPriceRow, GovSchemeItem, PreSeasonTaskItem, SeasonGoalItem, BuyGroupItem, EquipmentItem, ComplianceScore, KnowledgeArticleItem } from '../lib/api';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-rose-300 bg-rose-50 text-rose-800',
  warning:  'border-amber-300 bg-amber-50 text-amber-800',
  info:     'border-blue-300 bg-blue-50 text-blue-800',
};

export default function InsightsPage() {
  const navigate = useNavigate();
  const [weather, setWeather]       = useState<WeatherAlertItem[]>([]);
  const [pests, setPests]           = useState<PestAlertItem[]>([]);
  const [mandi, setMandi]           = useState<MandiPriceRow[]>([]);
  const [schemes, setSchemes]       = useState<GovSchemeItem[]>([]);
  const [checklist, setChecklist]   = useState<PreSeasonTaskItem[]>([]);
  const [goals, setGoals]           = useState<SeasonGoalItem[]>([]);
  const [buyGroups, setBuyGroups]   = useState<BuyGroupItem[]>([]);
  const [equipment, setEquipment]   = useState<EquipmentItem[]>([]);
  const [compliance, setCompliance] = useState<ComplianceScore | null>(null);
  const [knowledge, setKnowledge]   = useState<KnowledgeArticleItem[]>([]);
  const [farmIds, setFarmIds]       = useState<string[]>([]);

  useEffect(() => {
    farmService.getFarms().then((f) => setFarmIds(f.map((x) => x.id))).catch(() => {});
  }, []);

  useEffect(() => {
    getWeatherAlerts().then(setWeather).catch(() => {});
    getPestAlerts().then(setPests).catch(() => {});
    getMandiPrices().then(setMandi).catch(() => {});
    getGovSchemes().then(setSchemes).catch(() => {});
    listChecklist().then(setChecklist).catch(() => {});
    listSeasonGoals().then(setGoals).catch(() => {});
    listBuyGroups().then(setBuyGroups).catch(() => {});
    listEquipment().then(setEquipment).catch(() => {});
    getCompliance().then(setCompliance).catch(() => {});
    listKnowledge().then(setKnowledge).catch(() => {});
  }, []);

  return (
    <DashboardShell title="Smart Insights" subtitle="Weather alerts, market prices, government schemes, and farmer-network features in one place">
      <div className="space-y-5">

        {/* ── Drought banner per farm ── */}
        {farmIds.map((id) => <DroughtBanner key={id} farmId={id} />)}

        {/* ── Compliance score + season goals row ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-stone-900">Task compliance</h2>
            </div>
            {compliance && compliance.score !== null ? (
              <>
                <p className="mt-3 text-3xl font-bold text-stone-900">{compliance.score}<span className="text-base font-normal text-stone-500">%</span></p>
                <p className="text-xs text-stone-600">{compliance.completed} of {compliance.totalDue} tasks completed on time</p>
                <div className="mt-3 h-2 rounded-full bg-stone-200">
                  <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${compliance.score}%` }} />
                </div>
              </>
            ) : <p className="mt-3 text-sm text-stone-500">No tasks due yet</p>}
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-600" />
                <h2 className="text-base font-bold text-stone-900">Season goals</h2>
              </div>
              <button onClick={() => navigate('/goals')} className="text-xs font-semibold text-violet-700 hover:underline">+ Set goal</button>
            </div>
            {goals.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">No goals yet — set one to track progress</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {goals.slice(0, 2).map((g) => (
                  <li key={g.id} className="text-xs">
                    <p className="font-semibold text-stone-900">{g.season} {g.cropName} — ₹{g.targetRevenue.toLocaleString()}</p>
                    <p className="text-stone-500">{g.feasibilityNotes}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Weather alerts ── */}
        {weather.length > 0 && (
          <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-sky-600" />
              <h2 className="text-base font-bold text-stone-900">Weather alerts</h2>
            </div>
            <div className="mt-3 space-y-2">
              {weather.map((w, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-2xl border p-3 ${SEVERITY_COLORS[w.severity] ?? SEVERITY_COLORS.info}`}>
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">{w.title} — {w.farmName}</p>
                    <p className="text-xs">{w.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Pest outbreak alerts ── */}
        {pests.length > 0 && (
          <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-700" />
              <h2 className="text-base font-bold text-rose-900">Pest reports near you</h2>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {pests.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white p-3 text-xs">
                  <p className="font-semibold text-rose-800">{p.pestName.replace(/_/g, ' ')}</p>
                  <p className="text-stone-600">{p.reportCount} reports in {p.district} · last on {new Date(p.lastReportedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Mandi prices ── */}
        <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-stone-900">Latest mandi prices</h2>
          </div>
          {mandi.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">No price data yet — admin can add prices via the API.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {mandi.slice(0, 6).map((m) => (
                <div key={m.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs">
                  <p className="font-semibold text-stone-900">{m.cropName} — {m.district}</p>
                  <p className="text-stone-700">₹{m.pricePerQuintal}/qtl {m.msp ? <span className="text-stone-500">· MSP ₹{m.msp}</span> : null}</p>
                  <p className="text-stone-400">{new Date(m.recordedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Government schemes ── */}
        <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-bold text-stone-900">Government schemes for you</h2>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {schemes.map((s) => (
              <div key={s.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-bold text-amber-900">{s.schemeName}</p>
                <p className="mt-0.5 text-xs text-amber-800">{s.benefitSummary}</p>
                <p className="mt-1 text-[10px] text-amber-700">{s.eligibilityNotes}</p>
                {s.applyUrl && (
                  <a href={s.applyUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-semibold text-amber-800 underline">
                    Apply →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Pre-season checklist ── */}
        {checklist.length > 0 && (
          <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-stone-900">Pre-season checklist</h2>
            </div>
            <ul className="mt-3 space-y-1.5">
              {checklist.slice(0, 8).map((t) => (
                <li key={t.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${t.isDone ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-white'}`}>
                  <span className={t.isDone ? 'line-through text-stone-400' : 'text-stone-700'}>{t.title}</span>
                  <span className="text-stone-400">{new Date(t.dueDate).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Buy groups & equipment ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-stone-900">Bulk-buy groups nearby</h2>
            </div>
            {buyGroups.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">No groups yet — start one to save with neighbours</p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {buyGroups.slice(0, 4).map((g) => (
                  <li key={g.id} className="rounded-xl border border-stone-200 bg-stone-50 p-2">
                    <p className="font-semibold text-stone-900">{g.itemName} — {g.totalQuantity} {g.unit}</p>
                    <p className="text-stone-500">{g.district} · {g.pricePerUnit ? `₹${g.pricePerUnit}/${g.unit}` : 'Price TBD'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-stone-900">Equipment for rent</h2>
            </div>
            {equipment.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">No listings yet</p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {equipment.slice(0, 4).map((e) => (
                  <li key={e.id} className="rounded-xl border border-stone-200 bg-stone-50 p-2">
                    <p className="font-semibold text-stone-900">{e.equipmentType} — {e.district}</p>
                    <p className="text-stone-500">
                      {e.hourlyRate ? `₹${e.hourlyRate}/hr` : ''} {e.dailyRate ? `· ₹${e.dailyRate}/day` : ''} {e.contactPhone ? `· 📞 ${e.contactPhone}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── Knowledge base ── */}
        {knowledge.length > 0 && (
          <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-stone-900">Farmer Q&A library</h2>
            </div>
            <ul className="mt-3 space-y-2">
              {knowledge.slice(0, 5).map((k) => (
                <li key={k.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                  <p className="text-sm font-bold text-stone-900">{k.title}</p>
                  <p className="mt-1 text-xs text-stone-600 line-clamp-2">{k.body}</p>
                  <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-700">{k.category}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Quick links ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button onClick={() => navigate('/goals')} className="flex flex-col items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm font-semibold text-violet-800 hover:bg-violet-100">
            <Target className="h-5 w-5" />
            Set Goals
          </button>
          <button onClick={() => navigate('/checklist')} className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
            <ListChecks className="h-5 w-5" />
            Checklist
          </button>
          <button onClick={() => navigate('/community')} className="flex flex-col items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800 hover:bg-blue-100">
            <Users className="h-5 w-5" />
            Community
          </button>
          <button onClick={() => navigate('/today')} className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold text-stone-800 hover:bg-stone-100">
            <Sparkles className="h-5 w-5" />
            Today
          </button>
        </div>

      </div>
    </DashboardShell>
  );
}

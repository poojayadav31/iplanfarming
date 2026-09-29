import { useEffect, useState } from 'react';
import { getFarmerAdvisories, getFarmerSuggestions, respondToSuggestion } from '../../lib/api';
import toast from 'react-hot-toast';
import { Bell, Lightbulb, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const PRIORITY_COLOR: Record<string, string> = {
  low:    'bg-stone-100 text-stone-600',
  normal: 'bg-blue-50 text-blue-700',
  high:   'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-700',
};

export default function ExpertNotifications({ farmId }: { farmId: string }) {
  const [advisories, setAdvisories] = useState<AnyObj[]>([]);
  const [suggestions, setSuggestions] = useState<AnyObj[]>([]);
  const [showAdvisories, setShowAdvisories] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  useEffect(() => {
    getFarmerAdvisories(farmId)
      .then((d) => setAdvisories(d as AnyObj[]))
      .catch(() => {});
    getFarmerSuggestions(farmId)
      .then((d) => setSuggestions(d as AnyObj[]))
      .catch(() => {});
  }, [farmId]);

  const respond = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    setResponding(id);
    try {
      await respondToSuggestion(id, status, noteMap[id]);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      toast.success(status === 'ACCEPTED' ? 'Crop suggestion accepted' : 'Suggestion dismissed');
    } catch { toast.error('Failed to respond'); }
    finally { setResponding(null); }
  };

  if (!advisories.length && !suggestions.length) return null;

  return (
    <div className="space-y-4">
      {/* Expert Advisories */}
      {advisories.length > 0 && (
        <div className="rounded-[28px] border border-blue-200 bg-white p-5 shadow-sm">
          <button
            onClick={() => setShowAdvisories(!showAdvisories)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-stone-800">Expert Advisories</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                {advisories.length}
              </span>
            </div>
            {showAdvisories ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
          </button>

          {showAdvisories && (
            <div className="mt-4 space-y-3">
              {advisories.map((a) => (
                <div key={a.id} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_COLOR[a.priority] ?? PRIORITY_COLOR.normal}`}>
                      {a.priority}
                    </span>
                    <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] text-stone-600">{a.category}</span>
                    {a.season && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">{a.season}</span>}
                    {a.isGlobal && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] text-green-600">All Farmers</span>}
                  </div>
                  <p className="font-semibold text-stone-800">{a.title}</p>
                  <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">{a.body}</p>
                  <p className="mt-2 text-[11px] text-stone-400">
                    By Expert {a.expert?.user?.name} · {new Date(a.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expert Crop Suggestions */}
      {suggestions.length > 0 && (
        <div className="rounded-[28px] border border-amber-200 bg-white p-5 shadow-sm">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <span className="font-semibold text-stone-800">Crop Suggestions</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                {suggestions.length} pending
              </span>
            </div>
            {showSuggestions ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
          </button>

          {showSuggestions && (
            <div className="mt-4 space-y-3">
              {suggestions.map((s) => (
                <div key={s.id} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 font-semibold">{s.season}</span>
                    <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] text-stone-600">
                      Zone {s.zone?.zoneNumber}: {s.zone?.name}
                    </span>
                  </div>
                  <p className="font-semibold text-stone-800">Grow <span className="text-green-700">{s.cropName}</span></p>
                  <p className="mt-1 text-sm text-stone-600">{s.reason}</p>
                  <p className="mt-1 text-[11px] text-stone-400">Suggested by {s.expert?.user?.name}</p>

                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Add a note (optional)"
                      value={noteMap[s.id] ?? ''}
                      onChange={(e) => setNoteMap((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={responding === s.id}
                        onClick={() => respond(s.id, 'ACCEPTED')}
                        className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </button>
                      <button
                        disabled={responding === s.id}
                        onClick={() => respond(s.id, 'REJECTED')}
                        className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" /> Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

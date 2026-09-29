import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createCalendarTask, updateCalendarCustomTask, type CustomTaskPayload } from '../../lib/api';
import type { ZoneMeta, CalendarEvent } from '../../types/calendar';

const CATEGORIES = [
  { value: 'crop_care',   label: 'Crop Care' },
  { value: 'inputs',      label: 'Inputs / Fertilizer' },
  { value: 'harvest',     label: 'Harvest' },
  { value: 'observation', label: 'Observation' },
  { value: 'irrigation',  label: 'Irrigation' },
];

interface Props {
  farmId: string;
  date: string;                    // YYYY-MM-DD — pre-filled when clicking a day
  zoneMeta: ZoneMeta[];
  editEvent?: CalendarEvent | null; // when editing an existing custom task
  onClose: () => void;
  onSaved: () => void;
}

export default function AddTaskModal({ farmId, date, zoneMeta, editEvent, onClose, onSaved }: Props) {
  const isEdit = !!editEvent;

  const [title,         setTitle]         = useState(isEdit ? editEvent!.title.split(' — ')[0] : '');
  const [scheduledDate, setScheduledDate] = useState(isEdit ? editEvent!.date : date);
  const [category,      setCategory]      = useState(isEdit ? editEvent!.category : 'crop_care');
  const [priority,      setPriority]      = useState<'morning' | 'afternoon'>(isEdit ? editEvent!.priority : 'morning');
  const [workers,       setWorkers]        = useState(String(isEdit ? editEvent!.labourWorkers : 1));
  const [hours,         setHours]          = useState(String(isEdit ? editEvent!.labourHours : 1));
  const [zoneId,        setZoneId]          = useState(isEdit ? (editEvent!.zoneId ?? '') : '');
  const [notes,         setNotes]           = useState(isEdit ? (editEvent!.details.notes ?? '') : '');
  const [loading,       setLoading]         = useState(false);

  // Reset when editEvent changes
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title.split(' — ')[0]);
      setScheduledDate(editEvent.date);
      setCategory(editEvent.category);
      setPriority(editEvent.priority);
      setWorkers(String(editEvent.labourWorkers));
      setHours(String(editEvent.labourHours));
      setZoneId(editEvent.zoneId ?? '');
      setNotes(editEvent.details.notes ?? '');
    }
  }, [editEvent?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }

    const payload: CustomTaskPayload = {
      title:         title.trim(),
      scheduledDate,
      category,
      priority,
      labourWorkers: parseInt(workers) || 1,
      labourHours:   parseFloat(hours) || 1,
      zoneId:        zoneId || undefined,
      notes:         notes.trim() || undefined,
    };

    setLoading(true);
    try {
      if (isEdit && editEvent?.dbTaskId) {
        await updateCalendarCustomTask(farmId, editEvent.dbTaskId, payload);
        toast.success('Activity updated');
      } else {
        await createCalendarTask(farmId, payload);
        toast.success('Activity added to calendar');
      }
      onSaved();
      onClose();
    } catch {
      toast.error(isEdit ? 'Could not update activity' : 'Could not add activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-pink-600">📝 Custom Activity</p>
              <h2 className="mt-0.5 text-lg font-bold text-stone-900">
                {isEdit ? 'Edit Activity' : 'Add Activity'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Activity Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Spray neem oil, Soil testing, Market visit…"
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>

            {/* Date + Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-500 uppercase tracking-wider">Date *</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-500 uppercase tracking-wider">Time</label>
                <div className="flex rounded-xl border border-stone-200 overflow-hidden text-sm font-medium">
                  <button type="button"
                    onClick={() => setPriority('morning')}
                    className={`flex-1 py-2.5 transition-colors ${priority === 'morning' ? 'bg-amber-500 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}
                  >☀️ AM</button>
                  <button type="button"
                    onClick={() => setPriority('afternoon')}
                    className={`flex-1 py-2.5 transition-colors ${priority === 'afternoon' ? 'bg-orange-500 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}
                  >🌅 PM</button>
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-stone-500 uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Zone (optional) */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Zone <span className="normal-case font-normal text-stone-400">(optional)</span>
              </label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Whole Farm</option>
                {zoneMeta.map((z) => (
                  <option key={z.zoneId} value={z.zoneId}>{z.zoneName} — {z.cropName}</option>
                ))}
              </select>
            </div>

            {/* Workers + Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-500 uppercase tracking-wider">Workers</label>
                <input
                  type="number" min="1" max="50"
                  value={workers}
                  onChange={(e) => setWorkers(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-500 uppercase tracking-wider">Hours</label>
                <input
                  type="number" min="0.5" max="24" step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Notes <span className="normal-case font-normal text-stone-400">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details…"
                rows={2}
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 transition-colors"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Add Activity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

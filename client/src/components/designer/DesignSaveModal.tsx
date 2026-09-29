import { useState } from 'react';
import {
  X,
  Save,
  Copy,
  Trash2,
  Download,
  FolderOpen,
  Loader2,
  FileText,
} from 'lucide-react';
import type { SavedFarmDesign } from '../../types/designer';

interface DesignSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  designName: string;
  designNotes: string;
  designStatus: 'DRAFT' | 'FINAL';
  savedDesigns: SavedFarmDesign[];
  isSaving: boolean;
  currentDesignId: string | null;
  onSave: (name: string, status: 'DRAFT' | 'FINAL', notes: string) => Promise<void>;
  onLoadDesign: (designId: string) => Promise<void>;
  onDuplicateDesign: (designId: string) => Promise<void>;
  onDeleteDesign: (designId: string) => Promise<void>;
  onExportPng: () => void;
  onExportJson: () => void;
}

export default function DesignSaveModal({
  isOpen,
  onClose,
  designName,
  designNotes,
  designStatus,
  savedDesigns,
  isSaving,
  currentDesignId,
  onSave,
  onLoadDesign,
  onDuplicateDesign,
  onDeleteDesign,
  onExportPng,
  onExportJson,
}: DesignSaveModalProps) {
  const [name, setName] = useState(designName);
  const [status, setStatus] = useState<'DRAFT' | 'FINAL'>(designStatus);
  const [notes, setNotes] = useState(designNotes);
  const [activeTab, setActiveTab] = useState<'save' | 'load' | 'export'>('save');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(name, status, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <Save className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Farm Plan Manager</h2>
              <p className="text-xs text-stone-500">Save, restore, or export your farm layouts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('save')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'save'
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Save className="h-4 w-4" /> Save Design
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('load')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'load'
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FolderOpen className="h-4 w-4" /> Saved Layouts ({savedDesigns.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'export'
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Download className="h-4 w-4" /> Export &amp; Blueprint
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'save' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700">Design / Layout Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kharif Multilayer Master Plan 2026"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Plan Status</label>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('DRAFT')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition ${
                      status === 'DRAFT'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    📝 Draft (Work in Progress)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('FINAL')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition ${
                      status === 'FINAL'
                        ? 'border-green-600 bg-green-50 text-green-900 ring-1 ring-green-600'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    ✅ Final Approved Layout
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Planning Notes &amp; Assumptions</label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Dedicated Zone 1 to ginger + papaya multilayer guild. North border planted with Marigold and Vetiver hedges."
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-900 placeholder-stone-400 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-50 shadow-md transition"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {currentDesignId ? 'Update & Save Changes' : 'Save as New Farm Design'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'load' && (
            <div className="space-y-3">
              {savedDesigns.length === 0 ? (
                <div className="py-12 text-center">
                  <FolderOpen className="mx-auto h-8 w-8 text-stone-300" />
                  <p className="mt-2 text-xs font-semibold text-stone-600">No saved designs found</p>
                  <p className="text-[11px] text-stone-400">Save your first layout from the Save tab</p>
                </div>
              ) : (
                savedDesigns.map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between rounded-2xl border p-3.5 transition ${
                      currentDesignId === d.id
                        ? 'border-green-500 bg-green-50/50 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-stone-900">{d.name}</h4>
                        <span className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                          d.status === 'FINAL' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {d.status} • v{d.version}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-stone-500 flex items-center gap-2">
                        <span>Updated: {new Date(d.updatedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{d.designData?.beds?.length || 0} Beds</span>
                        <span>•</span>
                        <span>{d.designData?.trees?.length || 0} Trees</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onLoadDesign(d.id)}
                        className="rounded-xl bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800 transition shadow-2xs"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateDesign(d.id)}
                        title="Duplicate Design"
                        className="rounded-xl border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-100 transition"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDesign(d.id)}
                        title="Delete Design"
                        className="rounded-xl border border-stone-200 p-1.5 text-stone-600 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-xs text-stone-600">
                Export your designed farm blueprint to share with field workers, agricultural experts, or archive offline.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div
                  onClick={onExportPng}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center hover:border-green-500 hover:bg-green-50/50 transition"
                >
                  <Download className="h-8 w-8 text-green-700" />
                  <h4 className="mt-3 text-xs font-bold text-stone-900">Export High-Res PNG Image</h4>
                  <p className="mt-1 text-[11px] text-stone-500">2D Grid Layout with Beds &amp; Legend</p>
                </div>

                <div
                  onClick={onExportJson}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center hover:border-green-500 hover:bg-green-50/50 transition"
                >
                  <FileText className="h-8 w-8 text-emerald-700" />
                  <h4 className="mt-3 text-xs font-bold text-stone-900">Export JSON Blueprint Data</h4>
                  <p className="mt-1 text-[11px] text-stone-500">Machine-readable coordinates &amp; crop roster</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

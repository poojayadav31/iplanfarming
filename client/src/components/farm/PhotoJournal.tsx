import { useEffect, useState } from 'react';
import { Camera, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { addZonePhoto, listZonePhotos } from '../../lib/api';

interface Photo { id: string; photoUrl: string; caption: string | null; weekIntoSeason: number | null; createdAt: string }

export default function PhotoJournal({ zoneId }: { zoneId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [adding, setAdding] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => listZonePhotos(zoneId).then(setPhotos).catch(() => {});

  useEffect(() => { load(); }, [zoneId]);

  const add = async () => {
    if (!photoUrl.trim()) return toast.error('Photo URL required');
    setSaving(true);
    try {
      await addZonePhoto({ zoneId, photoUrl: photoUrl.trim(), caption: caption.trim() || undefined });
      setPhotoUrl(''); setCaption(''); setAdding(false);
      toast.success('Photo added');
      await load();
    } catch {
      toast.error('Could not save photo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-bold text-stone-900">Photo Journal</h3>
        </div>
        <button onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 rounded-2xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
          <Plus className="h-3.5 w-3.5" />
          Add photo
        </button>
      </div>

      {adding && (
        <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 space-y-2">
          <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Photo URL"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" />
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm" />
          <button onClick={add} disabled={saving} className="w-full rounded-xl bg-green-600 py-2 text-xs font-bold text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {photos.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-center text-xs text-stone-500">
          No photos yet — add the first one to start your season scrapbook.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <img src={p.photoUrl} alt={p.caption ?? ''} className="h-32 w-full object-cover" loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="p-2 text-[10px]">
                {p.weekIntoSeason !== null && <p className="font-semibold text-emerald-700">Week {p.weekIntoSeason}</p>}
                {p.caption && <p className="text-stone-600 line-clamp-2">{p.caption}</p>}
                <p className="text-stone-400">{new Date(p.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

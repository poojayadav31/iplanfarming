import { useEffect, useState, useRef } from 'react';
import { MessageCircle, Send, Mic, MicOff, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardShell from '../components/DashboardShell';
import { askQuestion, listMyQuestions } from '../lib/api';

interface QuestionRow {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  category: string;
  createdAt: string;
}

const CATEGORIES = [
  { key: 'soil',    label: 'Soil' },
  { key: 'pest',    label: 'Pests' },
  { key: 'water',   label: 'Water' },
  { key: 'crop',    label: 'Crop' },
  { key: 'market',  label: 'Market' },
  { key: 'general', label: 'Other' },
];

// Web Speech API (graceful — only used if available)
type SpeechRec = { start: () => void; stop: () => void; onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null; onend: (() => void) | null; lang: string; interimResults: boolean };
const getSpeechRecognition = (): SpeechRec | null => {
  const w = window as unknown as { webkitSpeechRecognition?: new () => SpeechRec; SpeechRecognition?: new () => SpeechRec };
  const Cls = w.webkitSpeechRecognition ?? w.SpeechRecognition;
  if (!Cls) return null;
  const rec = new Cls();
  rec.lang = 'en-IN';
  rec.interimResults = false;
  return rec;
};

export default function AskExpertPage() {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('general');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  const load = () => listMyQuestions().then((rows) => setQuestions(rows as QuestionRow[])).catch(() => {});

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!question.trim()) return toast.error('Type your question');
    setSaving(true);
    try {
      await askQuestion(question.trim(), category);
      setQuestion('');
      toast.success('Question sent — an expert will respond soon');
      await load();
    } catch {
      toast.error('Could not send');
    } finally {
      setSaving(false);
    }
  };

  const toggleVoice = () => {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    const rec = getSpeechRecognition();
    if (!rec) return toast.error('Voice input not supported on this browser');
    recRef.current = rec;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuestion((prev) => prev ? `${prev} ${transcript}` : transcript);
    };
    rec.onend = () => setRecording(false);
    rec.start();
    setRecording(true);
    toast('Listening… speak your question');
  };

  return (
    <DashboardShell title="Ask an Expert" subtitle="Get free advice from a natural-farming expert. Most questions answered within 24 hours.">
      <div className="space-y-5">

        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-stone-900">Ask your question</h2>
          </div>

          <label className="mt-4 block text-xs font-semibold text-stone-600">Topic</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${category === c.key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-xs font-semibold text-stone-600">Your question</label>
          <div className="mt-1 relative">
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4}
              placeholder="Type your question in plain words... e.g. 'My Wheat plants are getting yellow at the bottom. What should I do?'"
              className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 pr-12 text-sm" />
            <button
              type="button"
              onClick={toggleVoice}
              title="Voice input"
              className={`absolute bottom-3 right-3 rounded-full p-2 ${recording ? 'bg-rose-500 text-white animate-pulse' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>

          <button onClick={submit} disabled={saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
            <Send className="h-4 w-4" />
            {saving ? 'Sending…' : 'Send to Expert'}
          </button>
        </div>

        <section>
          <h3 className="mb-3 text-base font-bold text-stone-900">My past questions</h3>
          {questions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-5 text-center text-sm text-stone-500">
              No questions yet — your first one above will appear here.
            </p>
          ) : (
            <ul className="space-y-3">
              {questions.map((q) => (
                <li key={q.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-900">{q.question}</p>
                    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-[10px] font-semibold uppercase text-stone-500">{q.category}</span>
                  </div>
                  {q.answer ? (
                    <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Expert answer</p>
                      <p className="mt-1 leading-6">{q.answer}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-amber-700">⏳ Waiting for expert reply…</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

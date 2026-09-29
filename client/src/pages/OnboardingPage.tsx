import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, MapPin, Ruler, FlaskConical, Star, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { completeOnboarding } from '../lib/api';

const STEPS = [
  { icon: Sprout, title: 'Welcome to iPlanFarmHouse', body: 'A simple app to help you grow more crops, naturally — without chemicals. Let us guide you in 5 quick steps.' },
  { icon: MapPin, title: 'We need your district', body: 'This helps us check the weather, suggest crops grown by farmers near you, and connect you to local buyers. You can set this when creating your farm.' },
  { icon: Ruler,  title: 'Tell us your farm size', body: 'Even a rough estimate is fine — you can draw the exact boundary later. We use this to scale recipes (Jeevamrit, Beejamrit) for your land.' },
  { icon: FlaskConical, title: 'Soil test is optional', body: 'If you have done a soil test, great. If not, we use the average soil for your district. You can update later when you test.' },
  { icon: Star,   title: 'How experienced are you?', body: 'This is the only question we ask. We will tailor the app to your level.', hasChoice: true },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<'New' | 'Some' | 'Expert'>('New');
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding(experience);
      toast.success('All set! Welcome.');
      navigate('/today', { replace: true });
    } catch {
      toast.error('Could not complete onboarding');
    } finally {
      setSaving(false);
    }
  };

  const Step = STEPS[step];
  const Icon = Step.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-emerald-50 via-stone-100 to-emerald-50 p-4">
      <div className="w-full max-w-lg rounded-[28px] border border-stone-200 bg-white p-6 shadow-xl sm:p-8">

        {/* progress dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-emerald-600' : i < step ? 'w-2 bg-emerald-400' : 'w-2 bg-stone-200'}`} />
          ))}
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Icon className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-stone-900 sm:text-3xl">{Step.title}</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-stone-600 sm:text-base">{Step.body}</p>
        </div>

        {Step.hasChoice && (
          <div className="mt-6 grid gap-2">
            {([
              { key: 'New',    label: 'New to farming',    desc: 'Show only easy crops, simple UI' },
              { key: 'Some',   label: 'Some experience',   desc: 'Show all crops with explanations' },
              { key: 'Expert', label: 'Experienced',        desc: 'Show full data, all options' },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setExperience(opt.key)}
                className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                  experience === opt.key
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${experience === opt.key ? 'border-emerald-600 bg-emerald-600' : 'border-stone-300'}`}>
                  {experience === opt.key && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">{opt.label}</p>
                  <p className="text-xs text-stone-500">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="rounded-2xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 disabled:opacity-30"
          >
            Back
          </button>

          {isLast ? (
            <button
              onClick={finish}
              disabled={saving}
              className="flex items-center gap-2 rounded-2xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Get Started'}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 rounded-2xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        <button onClick={finish} className="mt-4 w-full text-center text-xs text-stone-400 hover:text-stone-600">
          Skip onboarding
        </button>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings, User, KeyRound, Palette, Languages, Info, Check, Moon, Sun, Monitor, Eye, EyeOff,
  ShieldCheck, Sparkles, Github, Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ThemePreference } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LANGUAGES, TKey } from '../i18n/translations';
import { authAPI } from '../services/api';

type Tab = 'account' | 'security' | 'appearance' | 'language' | 'about';
const DEMO_ACCOUNTS = ['student@campus.ai', 'admin@campus.ai'];

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 transition-all disabled:opacity-60';

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block">
    <span className="text-xs text-slate-400 block mb-1.5 uppercase tracking-wider">{label}</span>
    {children}
    {hint && <span className="text-[11px] text-slate-500 mt-1 block">{hint}</span>}
  </label>
);

const Card: React.FC<{ title: string; desc?: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="glass-card rounded-2xl border border-white/10 p-6 min-w-0 break-words [overflow-wrap:anywhere]">
    <h2 className="text-base font-bold text-white">{title}</h2>
    {desc && <p className="text-sm text-slate-400 mt-1 mb-5">{desc}</p>}
    {children}
  </div>
);

const Banner: React.FC<{ kind: 'ok' | 'err' | 'info'; children: React.ReactNode }> = ({ kind, children }) => (
  <div
    className={`text-sm rounded-xl px-4 py-2.5 border ${
      kind === 'ok'
        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
        : kind === 'err'
        ? 'bg-red-500/10 border-red-500/25 text-red-300'
        : 'bg-amber-500/10 border-amber-500/25 text-amber-200'
    }`}
  >
    {children}
  </div>
);

// ---------------- Account ----------------
const AccountTab: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', department: '', phoneNo: '', rollNo: '' });
  const [state, setState] = useState<{ busy: boolean; ok?: boolean; err?: string }>({ busy: false });

  useEffect(() => {
    // Load fresh values (phone/roll are not stored in the login session)
    authAPI.getMe().then(({ user: u }) =>
      setForm({ name: u.name ?? '', department: u.department ?? '', phoneNo: u.phoneNo ?? '', rollNo: u.rollNo ?? '' })
    ).catch(() => user && setForm((f) => ({ ...f, name: user.name, department: user.department ?? '' })));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      const { user: u } = await authAPI.updateMe(form);
      if (user) updateUser({ ...user, ...u });
      setState({ busy: false, ok: true });
      setTimeout(() => setState((s) => ({ ...s, ok: false })), 2500);
    } catch (err: any) {
      setState({ busy: false, err: err.message });
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Card title={t('s.acc.title')} desc={t('s.acc.desc')}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t('s.acc.name')}>
            <input className={inputCls} value={form.name} onChange={set('name')} required minLength={2} maxLength={80} />
          </Field>
          <Field label={t('s.acc.email')} hint={t('s.acc.emailNote')}>
            <input className={inputCls} value={user?.email ?? ''} disabled />
          </Field>
          <Field label={t('s.acc.department')}>
            <input className={inputCls} value={form.department} onChange={set('department')} maxLength={120} />
          </Field>
          <Field label={t('s.acc.phone')}>
            <input className={inputCls} value={form.phoneNo} onChange={set('phoneNo')} inputMode="tel" maxLength={20} placeholder="+91 98765 43210" />
          </Field>
          {user?.role === 'STUDENT' && (
            <Field label={t('s.acc.roll')}>
              <input className={inputCls} value={form.rollNo} onChange={set('rollNo')} maxLength={30} />
            </Field>
          )}
        </div>
        {state.err && <Banner kind="err">{state.err}</Banner>}
        <div className="flex items-center gap-3">
          <button disabled={state.busy} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50">
            {state.busy ? t('s.saving') : t('s.save')}
          </button>
          {state.ok && <span className="text-sm text-emerald-400 flex items-center gap-1"><Check size={15} /> {t('s.saved')}</span>}
        </div>
      </form>
    </Card>
  );
};

// ---------------- Password ----------------
const SecurityTab: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [state, setState] = useState<{ busy: boolean; ok?: boolean; err?: string }>({ busy: false });
  const isDemo = !!user && DEMO_ACCOUNTS.includes(user.email);

  const strong = next.length >= 8 && /[A-Za-z]/.test(next) && /\d/.test(next);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setState({ busy: false, err: t('s.sec.mismatch') });
      return;
    }
    setState({ busy: true });
    try {
      await authAPI.changePassword(cur, next);
      setCur(''); setNext(''); setConfirm('');
      setState({ busy: false, ok: true });
    } catch (err: any) {
      setState({ busy: false, err: err.message });
    }
  };

  return (
    <Card title={t('s.sec.title')} desc={t('s.sec.desc')}>
      {isDemo && <div className="mb-4"><Banner kind="info">{t('s.sec.demo')}</Banner></div>}
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <Field label={t('s.sec.current')}>
          <input type={show ? 'text' : 'password'} className={inputCls} value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required disabled={isDemo} />
        </Field>
        <Field label={t('s.sec.new')}>
          <div className="relative">
            <input type={show ? 'text' : 'password'} className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required minLength={8} disabled={isDemo} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" aria-label="Show password">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {next && (
            <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full transition-all ${strong ? 'bg-emerald-500 w-full' : next.length >= 6 ? 'bg-amber-500 w-2/3' : 'bg-red-500 w-1/3'}`} />
            </div>
          )}
        </Field>
        <Field label={t('s.sec.confirm')}>
          <input type={show ? 'text' : 'password'} className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required disabled={isDemo} />
        </Field>
        {state.err && <Banner kind="err">{state.err}</Banner>}
        {state.ok && <Banner kind="ok">{t('s.sec.updated')}</Banner>}
        <button disabled={isDemo || state.busy || !strong || !cur || !confirm} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
          <Lock size={14} /> {state.busy ? t('s.saving') : t('s.sec.update')}
        </button>
      </form>
    </Card>
  );
};

// ---------------- Theme ----------------
const AppearanceTab: React.FC = () => {
  const { preference, setPreference } = useTheme();
  const { t } = useLanguage();
  const options: { id: ThemePreference; icon: React.ReactNode; title: TKey; desc: TKey; preview: string }[] = [
    { id: 'dark', icon: <Moon size={18} />, title: 's.app.dark', desc: 's.app.darkDesc', preview: '#060a14' },
    { id: 'light', icon: <Sun size={18} />, title: 's.app.light', desc: 's.app.lightDesc', preview: '#f1f5f9' },
    { id: 'system', icon: <Monitor size={18} />, title: 's.app.system', desc: 's.app.systemDesc', preview: 'linear-gradient(90deg, #060a14 50%, #f1f5f9 50%)' },
  ];
  return (
    <Card title={t('s.app.title')} desc={t('s.app.desc')}>
      <div className="grid sm:grid-cols-3 gap-3">
        {options.map((o) => (
          <button key={o.id} onClick={() => setPreference(o.id)}
            className={`text-left rounded-2xl border p-4 transition-all ${preference === o.id ? 'border-blue-500/60 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
            <div className="h-16 rounded-xl mb-3 border border-slate-500/30" style={{ background: o.preview }} />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-white">{o.icon} {t(o.title)}</span>
              {preference === o.id && <Check size={16} className="text-blue-400" />}
            </div>
            <p className="text-xs text-slate-400 mt-1">{t(o.desc)}</p>
          </button>
        ))}
      </div>
    </Card>
  );
};

// ---------------- Language ----------------
const LanguageTab: React.FC = () => {
  const { lang, setLang, t } = useLanguage();
  return (
    <Card title={t('s.lang.title')} desc={t('s.lang.desc')}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LANGUAGES.map((l) => (
          <button key={l.code} onClick={() => setLang(l.code)} lang={l.code}
            className={`text-left rounded-2xl border p-4 transition-all ${lang === l.code ? 'border-blue-500/60 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">{l.native}</span>
              {lang === l.code && <Check size={16} className="text-blue-400" />}
            </div>
            <span className="text-xs text-slate-400">{l.english}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-4">{t('s.lang.note')}</p>
    </Card>
  );
};

// ---------------- About ----------------
const AboutTab: React.FC = () => {
  const { t } = useLanguage();
  const features: TKey[] = ['s.about.f1', 's.about.f2', 's.about.f3', 's.about.f4', 's.about.f5', 's.about.f6'];
  const tech = ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Leaflet', 'Recharts', 'Node.js', 'Express', 'Prisma', 'SQLite', 'scikit-learn (GBM)', 'Groq LLM', 'Server-Sent Events', 'Vercel', 'Render'];
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center">
            <Sparkles className="text-white" size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('s.about.title')}</h2>
            <p className="text-sm text-cyan-300">{t('s.about.tagline')}</p>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card title={t('s.about.problem')}><p className="text-sm text-slate-300 leading-relaxed">{t('s.about.problemText')}</p></Card>
        <Card title={t('s.about.solution')}><p className="text-sm text-slate-300 leading-relaxed">{t('s.about.solutionText')}</p></Card>
      </div>
      <Card title={t('s.about.features')}>
        <ul className="grid sm:grid-cols-2 gap-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-300"><Check size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" /> {t(f)}</li>
          ))}
        </ul>
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card title={t('s.about.privacy')}>
          <p className="text-sm text-slate-300 leading-relaxed flex gap-2"><ShieldCheck size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" /> {t('s.about.privacyText')}</p>
        </Card>
        <Card title={t('s.about.team')}>
          <p className="text-sm text-slate-300">{t('s.about.teamText')}</p>
          <a href="https://github.com/gautham-code505/OCCUPRA1" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 mt-2">
            <Github size={14} /> github.com/gautham-code505/OCCUPRA1
          </a>
          <p className="text-xs text-slate-500 mt-2">{t('s.about.version')} 2.0 · 2026</p>
        </Card>
      </div>
      <Card title={t('s.about.tech')}>
        <div className="flex flex-wrap gap-2">
          {tech.map((x) => <span key={x} className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">{x}</span>)}
        </div>
      </Card>
    </div>
  );
};

// ---------------- Page ----------------
export const GeneralSettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'account';
  const tabs: { id: Tab; label: TKey; icon: React.ReactNode }[] = [
    { id: 'account', label: 's.tab.account', icon: <User size={16} /> },
    { id: 'security', label: 's.tab.security', icon: <KeyRound size={16} /> },
    { id: 'appearance', label: 's.tab.appearance', icon: <Palette size={16} /> },
    { id: 'language', label: 's.tab.language', icon: <Languages size={16} /> },
    { id: 'about', label: 's.tab.about', icon: <Info size={16} /> },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Settings size={22} className="text-cyan-400" /> {t('s.title')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('s.subtitle')}</p>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-52 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible flex-shrink-0">
          {tabs.map((x) => (
            <button key={x.id} onClick={() => setParams({ tab: x.id }, { replace: true })}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab === x.id ? 'bg-blue-600/20 text-blue-300 border border-blue-500/25' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}>
              {x.icon} {t(x.label)}
            </button>
          ))}
        </nav>
        <div className="flex-1 min-w-0">
          {tab === 'account' && <AccountTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'language' && <LanguageTab />}
          {tab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  );
};

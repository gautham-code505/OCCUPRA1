import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, MapPin, Brain, Cpu, BarChart3, Zap, ArrowRight, CheckCircle } from 'lucide-react';

const FEATURES = [
  { icon: <MapPin size={22} className="text-blue-400" />, title: 'Interactive Campus Map', desc: 'Color-coded real-time markers across all 15 campus zones with instant occupancy info.' },
  { icon: <Cpu size={22} className="text-cyan-400" />, title: 'IoT Sensor Simulation', desc: 'Simulated entry/exit sensors generating realistic traffic flows with peak-hour patterns.' },
  { icon: <Activity size={22} className="text-emerald-400" />, title: 'Live Crowd Heatmap', desc: 'Dynamic visual heat overlay showing occupancy density across every campus facility.' },
  { icon: <Brain size={22} className="text-purple-400" />, title: 'AI Crowd Prediction', desc: 'Gradient Boosting ML model predicts occupancy up to 4 hours ahead per resource.' },
  { icon: <Zap size={22} className="text-amber-400" />, title: 'Smart Recommendations', desc: 'Match-scored resource suggestions based on your need, crowd, distance, and availability.' },
  { icon: <BarChart3 size={22} className="text-red-400" />, title: 'Admin Analytics', desc: 'Hourly, weekly, and utilization charts with AI-generated optimization insights.' },
];

const STEPS = [
  { num: '01', label: 'Student opens CampusPulse AI', detail: 'Sees live campus occupancy at a glance' },
  { num: '02', label: 'Checks the campus map', detail: 'Library is 72% — getting crowded fast' },
  { num: '03', label: 'Views AI prediction', detail: 'Library will hit 84% in just 60 minutes' },
  { num: '04', label: 'Clicks "Find Best Study Space"', detail: 'System analyzes all 15 resources in real-time' },
  { num: '05', label: 'Gets matched to Study Room B', detail: '25% occupancy · 15 seats free · 150m away' },
  { num: '06', label: 'Reserves it in one tap', detail: 'Confirmation code generated instantly' },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#060a14] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
              <Activity size={15} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white">CAMPUSPULSE</span>
              <span className="text-sm font-bold text-cyan-400"> AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-live" />
              IoT LIVE
            </span>
            <button onClick={() => navigate('/login')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all">
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-64 h-64 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-blue-600/15 border border-blue-500/25 rounded-full px-4 py-1.5 text-xs text-blue-300 font-semibold mb-6 uppercase tracking-widest">
            <Cpu size={12} /> IoT-Powered Campus Intelligence
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-6">
            <span className="text-white">CAMPUSPULSE</span>
            <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">AI</span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 font-light mb-4">
            Your Campus. <span className="text-cyan-400 font-semibold">Live.</span>{' '}
            <span className="text-blue-400 font-semibold">Predictive.</span>{' '}
            <span className="text-purple-400 font-semibold">Intelligent.</span>
          </p>

          <p className="text-base text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Discover available campus resources, monitor real-time crowd levels, predict future occupancy with AI,
            and find the best place for you — all from one intelligent campus digital twin.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-base rounded-2xl transition-all shadow-glow-blue">
              Explore Smart Campus <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold text-base rounded-2xl transition-all">
              View Live Demo
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-6 mt-16 max-w-md mx-auto">
            {[
              { val: '15', label: 'Campus Resources' },
              { val: '97%', label: 'Sensor Uptime' },
              { val: '+4h', label: 'Prediction Horizon' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-cyan-400">{s.val}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-[#0d1527]/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-3">How It Works</h2>
          <p className="text-slate-400 text-center text-sm mb-12">The complete student journey — from confusion to confidence in 6 steps</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STEPS.map(step => (
              <div key={step.num} className="glass-card rounded-2xl border border-white/8 p-5 hover:border-blue-500/25 transition-all">
                <div className="text-4xl font-black text-blue-600/30 mb-3">{step.num}</div>
                <h3 className="text-sm font-bold text-white mb-1">{step.label}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-3">Smart Features</h2>
          <p className="text-slate-400 text-center text-sm mb-12">Powered by real-time IoT simulation, machine learning, and campus intelligence</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="glass-card rounded-2xl border border-white/8 p-6 hover:border-blue-500/25 hover:scale-[1.02] transition-all duration-300">
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center bg-gradient-to-b from-transparent to-[#0d1527]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-black text-white mb-4">
            Make Every Campus Resource Smarter.
          </h2>
          <p className="text-slate-400 mb-8">
            Stop wasting time searching. Let AI find the perfect space for you.
          </p>
          <button onClick={() => navigate('/login')}
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-lg rounded-2xl transition-all shadow-glow-cyan">
            Get Started Now <ArrowRight size={20} />
          </button>
          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-slate-500">
            {['No signup required', 'Demo mode available', 'Works on all devices'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={11} className="text-emerald-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <p className="text-xs text-slate-600">
          CampusPulse AI · Smart Campus Digital Twin · Built for Hackathon 2026 · Powered by IoT Simulation & Gradient Boosting ML
        </p>
      </footer>
    </div>
  );
};

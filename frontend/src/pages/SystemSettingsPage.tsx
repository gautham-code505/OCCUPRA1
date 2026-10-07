import React, { useState } from 'react';
import { Settings, Sliders, Bell, Database, Shield, Save, CheckCircle2, RotateCcw } from 'lucide-react';
import { simulationAPI } from '../services/api';

export const SystemSettingsPage: React.FC = () => {
  const [quietThreshold, setQuietThreshold] = useState(40);
  const [moderateThreshold, setModerateThreshold] = useState(70);
  const [simulationTickMs, setSimulationTickMs] = useState(3000);
  const [enableSurgeAlerts, setEnableSurgeAlerts] = useState(true);
  const [enableSoundAlerts, setEnableSoundAlerts] = useState(false);
  const [autoRebalance, setAutoRebalance] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset the live simulation state and reload default values?')) return;
    setIsResetting(true);
    try {
      await simulationAPI.reset();
      alert('Simulation state reset to default successfully!');
    } catch (_) {}
    setIsResetting(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings size={22} className="text-cyan-400" />
          System Settings & Platform Configuration
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage IoT simulation parameters, crowd classification thresholds, and notification rules
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Crowd Thresholds */}
        <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders size={18} className="text-blue-400" />
            Crowd Classification Thresholds
          </h2>
          <p className="text-xs text-slate-400">
            Define boundaries for Quiet, Moderate, and Crowded classification across all campus digital twins.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-2">
                Quiet Cutoff: <span className="text-emerald-400 font-mono font-bold">0% - {quietThreshold}%</span>
              </label>
              <input
                type="range"
                min={20}
                max={50}
                value={quietThreshold}
                onChange={e => setQuietThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-[10px] text-slate-500">Resources at or below this value are classified as QUIET 🟢</span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-2">
                Moderate Cutoff: <span className="text-amber-400 font-mono font-bold">{quietThreshold + 1}% - {moderateThreshold}%</span>
              </label>
              <input
                type="range"
                min={51}
                max={85}
                value={moderateThreshold}
                onChange={e => setModerateThreshold(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-[10px] text-slate-500">Resources above this value are marked CROWDED 🔴</span>
            </div>
          </div>
        </div>

        {/* IoT Simulation Engine Settings */}
        <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database size={18} className="text-purple-400" />
            Virtual IoT Telemetry Frequency
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {[
              { label: 'Fast (1.0s)', val: 1000, desc: 'High-frequency telemetry stream' },
              { label: 'Normal (3.0s)', val: 3000, desc: 'Recommended default rate' },
              { label: 'Slow (5.0s)', val: 5000, desc: 'Power-saving test mode' },
            ].map(preset => (
              <div
                key={preset.val}
                onClick={() => setSimulationTickMs(preset.val)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${simulationTickMs === preset.val ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'bg-white/4 border-white/8 text-slate-400 hover:bg-white/8'}`}
              >
                <p className="text-sm font-bold">{preset.label}</p>
                <p className="text-xs text-slate-500 mt-1">{preset.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications & Automation */}
        <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell size={18} className="text-amber-400" />
            Alerts & Automation Rules
          </h2>
          <div className="space-y-3">
            {[
              {
                title: 'Broadcast Crowd Surge Alerts',
                desc: 'Automatically push notifications to students when study areas cross the crowded threshold',
                checked: enableSurgeAlerts,
                onChange: setEnableSurgeAlerts,
              },
              {
                title: 'Auto-Rebalance Recommendations',
                desc: 'Dynamically prioritize under-utilized secondary libraries when main library is congested',
                checked: autoRebalance,
                onChange: setAutoRebalance,
              },
              {
                title: 'Audio Sound Chimes on Emergency Surges',
                desc: 'Play subtle cyber notification chime in Admin Command Center',
                checked: enableSoundAlerts,
                onChange: setEnableSoundAlerts,
              },
            ].map((setting, idx) => (
              <label key={idx} className="flex items-start gap-3 p-3 bg-white/3 hover:bg-white/5 rounded-xl cursor-pointer border border-white/5 transition-all">
                <input
                  type="checkbox"
                  checked={setting.checked}
                  onChange={e => setting.onChange(e.target.checked)}
                  className="mt-1 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-0"
                />
                <div>
                  <p className="text-sm font-semibold text-white">{setting.title}</p>
                  <p className="text-xs text-slate-400">{setting.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-glow-blue"
          >
            <Save size={16} />
            Save Configuration
          </button>

          <button
            type="button"
            onClick={handleResetData}
            disabled={isResetting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
          >
            <RotateCcw size={16} />
            {isResetting ? 'Resetting…' : 'Reset Simulation State'}
          </button>

          {saved && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium animate-fade-in">
              <CheckCircle2 size={16} />
              Settings updated successfully!
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

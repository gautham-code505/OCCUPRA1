import React, { useEffect, useState } from 'react';
import { Wifi } from 'lucide-react';
import { campusAPI } from '../../services/api';

interface Zone {
  resourceId: string; name: string; doorCounter: number; wifiDevices: number | null;
  wifiEstimate: number | null; learnedDevicesPerPerson: number | null; errorPct: number | null;
}

/** Privacy-first soft sensing: headcount from anonymous Wi-Fi client counts, no cameras or new hardware. */
export const WifiSensingPanel: React.FC = () => {
  const [data, setData] = useState<{ meanAbsErrorPct: number | null; zones: Zone[]; method: string } | null>(null);

  useEffect(() => {
    const load = () => campusAPI.getWifi().then(setData).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  if (!data) return null;
  return (
    <div className="glass-card rounded-2xl border border-cyan-500/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Wifi size={16} className="text-cyan-400" /> Wi-Fi Soft Sensing</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">NO CAMERAS · ZERO NEW HARDWARE</span>
          {data.meanAbsErrorPct !== null && <span className="text-xs text-slate-400">avg error vs door counters: <b className="text-white">{data.meanAbsErrorPct}%</b></span>}
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Each zone's access point reports how many anonymous devices are connected. A per-zone devices-per-person ratio is learned against the door counters, so spaces without counters can still be estimated.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[560px]">
          <thead>
            <tr className="text-slate-500 text-left">
              <th className="py-1.5 font-medium">Zone</th>
              <th className="font-medium text-right">Door counter</th>
              <th className="font-medium text-right">Wi-Fi devices</th>
              <th className="font-medium text-right">Learned ratio</th>
              <th className="font-medium text-right">Wi-Fi estimate</th>
              <th className="font-medium text-right">Error</th>
            </tr>
          </thead>
          <tbody>
            {data.zones.map((z) => (
              <tr key={z.resourceId} className="border-t border-white/5 text-slate-300">
                <td className="py-1.5">{z.name}</td>
                <td className="text-right font-mono">{z.doorCounter}</td>
                <td className="text-right font-mono text-cyan-300">{z.wifiDevices ?? '—'}</td>
                <td className="text-right font-mono">{z.learnedDevicesPerPerson ?? '—'}</td>
                <td className="text-right font-mono text-white">{z.wifiEstimate ?? '—'}</td>
                <td className={`text-right font-mono ${z.errorPct !== null && z.errorPct > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>{z.errorPct !== null ? `${z.errorPct}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

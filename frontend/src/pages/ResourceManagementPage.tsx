import React, { useEffect, useState } from 'react';
import { resourceAPI } from '../services/api';
import { Resource } from '../types';
import { Database, Plus, Pencil, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';
import { CrowdBadge, LoadingSkeleton } from '../components/ui/CoreComponents';
import { getResourceTypeIcon, getResourceTypeLabel } from '../utils/helpers';

export const ResourceManagementPage: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [form, setForm] = useState({ name: '', code: '', type: 'COMPUTER_LAB', capacity: 40, building: 'Main Block', floor: 'Ground Floor', facilities: 'Wi-Fi, AC', description: '', distanceMeters: 200 });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const d = await resourceAPI.getAll();
      setResources(d.resources ?? []);
    } catch (_) {}
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editResource) {
        await resourceAPI.update(editResource.id, { ...form, capacity: Number(form.capacity) });
      } else {
        await resourceAPI.create({ ...form, latitude: 12.9716, longitude: 77.5946 });
      }
      setShowAdd(false);
      setEditResource(null);
      await load();
    } catch (_) {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this resource?')) return;
    setDeleting(id);
    try { await resourceAPI.delete(id); await load(); } catch (_) {}
    setDeleting(null);
  };

  const filtered = resources.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.building.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase())
  );

  const ResourceForm = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl border border-white/15 p-6 w-full max-w-lg">
        <h2 className="text-lg font-bold text-white mb-5">{editResource ? 'Edit Resource' : 'Add New Resource'}</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Name', key: 'name', type: 'text' },
            { label: 'Code', key: 'code', type: 'text' },
            { label: 'Building', key: 'building', type: 'text' },
            { label: 'Floor', key: 'floor', type: 'text' },
            { label: 'Capacity', key: 'capacity', type: 'number' },
            { label: 'Distance (m)', key: 'distanceMeters', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">{f.label}</label>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          ))}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">Type</label>
            <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50">
              {['LIBRARY','COMPUTER_LAB','STUDY_ROOM','CANTEEN','SEMINAR_HALL','CLASSROOM','RESEARCH_LAB','ACTIVITY_CENTER'].map(t => (
                <option key={t} value={t}>{getResourceTypeLabel(t)}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">Facilities (comma-separated)</label>
            <input type="text" value={form.facilities} onChange={e => setForm(prev => ({ ...prev, facilities: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => { setShowAdd(false); setEditResource(null); }}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 text-sm transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all disabled:opacity-50">
            {saving ? 'Saving…' : editResource ? 'Update Resource' : 'Add Resource'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {(showAdd || editResource) && <ResourceForm />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Database size={20} className="text-blue-400" />
            Resource Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">{resources.length} campus resources configured</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all">
          <Plus size={14} /> Add Resource
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
      </div>

      {isLoading ? (
        <div className="glass-card rounded-2xl border border-white/5 p-6"><LoadingSkeleton lines={5} /></div>
      ) : (
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/3 border-b border-white/8">
              <tr>
                {['Resource', 'Type', 'Capacity', 'Occupancy', 'Status', 'Building', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{getResourceTypeIcon(r.type)}</span>
                      <div>
                        <p className="text-white font-medium text-xs">{r.name}</p>
                        <p className="text-slate-600 text-[10px] font-mono">{r.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{getResourceTypeLabel(r.type)}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{r.capacity}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/5 rounded-full">
                        <div className={`h-full rounded-full ${r.occupancyPercent > 70 ? 'bg-red-500' : r.occupancyPercent > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${r.occupancyPercent}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{Math.round(r.occupancyPercent)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><CrowdBadge status={r.currentCrowdStatus} size="sm" /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[120px]">{r.building}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditResource(r); setForm({ name: r.name, code: r.code, type: r.type, capacity: r.capacity, building: r.building, floor: r.floor, facilities: r.facilities, description: r.description, distanceMeters: r.distanceMeters }); }}
                        className="p-1.5 hover:bg-blue-500/15 rounded-lg text-slate-500 hover:text-blue-400 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                        className="p-1.5 hover:bg-red-500/15 rounded-lg text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

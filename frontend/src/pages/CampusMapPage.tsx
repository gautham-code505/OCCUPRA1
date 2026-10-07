import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal, X } from 'lucide-react';
import { useLiveData } from '../contexts/LiveDataContext';
import { CampusMap } from '../components/map/CampusMap';
import { ResourceDetailPanel } from '../components/resource/ResourceDetailPanel';
import { CrowdBadge, LiveBadge } from '../components/ui/CoreComponents';
import { Resource } from '../types';
import { getResourceTypeIcon, getResourceTypeLabel } from '../utils/helpers';

const RESOURCE_TYPES = ['ALL', 'LIBRARY', 'COMPUTER_LAB', 'STUDY_ROOM', 'CANTEEN', 'SEMINAR_HALL', 'CLASSROOM', 'RESEARCH_LAB', 'ACTIVITY_CENTER'];
const CROWD_STATUSES = ['ALL', 'QUIET', 'MODERATE', 'CROWDED'];

export const CampusMapPage: React.FC = () => {
  const { resources } = useLiveData();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [crowdFilter, setCrowdFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('nearest');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = resources
    .filter(r => {
      const matchSearch = search === '' ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.building.toLowerCase().includes(search.toLowerCase()) ||
        r.facilities.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'ALL' || r.type === typeFilter;
      const matchCrowd = crowdFilter === 'ALL' || r.currentCrowdStatus === crowdFilter;
      return matchSearch && matchType && matchCrowd;
    })
    .sort((a, b) => {
      if (sortBy === 'nearest') return a.distanceMeters - b.distanceMeters;
      if (sortBy === 'leastCrowded') return a.occupancyPercent - b.occupancyPercent;
      if (sortBy === 'mostAvailable') return b.availableUnits - a.availableUnits;
      return 0;
    });

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            🗺️ Interactive Campus Map — Sri Eshwar College of Engineering, Coimbatore
          </h1>
          <p className="text-slate-400 text-sm">{filtered.length} resources visible · Click a marker to inspect</p>
        </div>
        <LiveBadge />
      </div>

      {/* Filter bar */}
      <div className="glass-card rounded-2xl border border-white/5 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search resources…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
          >
            {RESOURCE_TYPES.map(t => (
              <option key={t} value={t}>{t === 'ALL' ? 'All Types' : getResourceTypeLabel(t)}</option>
            ))}
          </select>

          {/* Crowd filter */}
          <select
            value={crowdFilter}
            onChange={e => setCrowdFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
          >
            {CROWD_STATUSES.map(s => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Crowd' : s}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
          >
            <option value="nearest">Nearest First</option>
            <option value="leastCrowded">Least Crowded</option>
            <option value="mostAvailable">Most Available</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span className="font-medium text-slate-300">Map legend:</span>
          {[
            { color: 'bg-emerald-500', label: 'Quiet (0-40%)' },
            { color: 'bg-amber-500', label: 'Moderate (41-70%)' },
            { color: 'bg-red-500', label: 'Crowded (71-100%)' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Map + Detail Panel */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-[500px]">
        <div className="xl:col-span-2">
          <CampusMap
            resources={filtered}
            onResourceSelect={setSelectedResource}
            height="100%"
            className="h-full min-h-[500px]"
          />
        </div>

        {/* Sidebar: resource list or detail */}
        <div className="flex flex-col gap-3 min-h-[500px] max-h-[700px] overflow-y-auto">
          {selectedResource ? (
            <ResourceDetailPanel
              resource={selectedResource}
              onClose={() => setSelectedResource(null)}
              className="flex-1"
            />
          ) : (
            <>
              <div className="glass-card rounded-2xl border border-white/5 p-4 flex-1">
                <h3 className="text-sm font-semibold text-white mb-3">Resources ({filtered.length})</h3>
                <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
                  {filtered.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedResource(r)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left group border border-transparent hover:border-white/10"
                    >
                      <span className="text-xl flex-shrink-0">{getResourceTypeIcon(r.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">{r.name}</p>
                        <p className="text-xs text-slate-500 truncate">{r.building} · {r.distanceMeters}m</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <CrowdBadge status={r.currentCrowdStatus} size="sm" />
                        <span className="text-[10px] text-slate-500">{r.availableUnits} free</span>
                      </div>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-center text-slate-500 text-sm py-8">No resources match your filters.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { recommendationAPI, bookingAPI } from '../services/api';
import { RecommendedResource } from '../types';
import { CrowdBadge, OccupancyGauge, LoadingSkeleton } from '../components/ui/CoreComponents';
import { Brain, Sparkles, MapPin, Users, CheckCircle, BookOpen, ChevronRight, Star } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const NEEDS = [
  { id: 'STUDY', label: 'Study', icon: '📚', desc: 'Individual study session' },
  { id: 'COMPUTER', label: 'Computer', icon: '💻', desc: 'Need a desktop/workstation' },
  { id: 'GROUP', label: 'Group Discussion', icon: '👥', desc: 'Collaborative group work' },
  { id: 'INDIVIDUAL', label: 'Individual Work', icon: '🧑‍💻', desc: 'Focused solo work' },
  { id: 'CLASSROOM', label: 'Classroom', icon: '🏫', desc: 'Seminar or lecture space' },
  { id: 'LAB', label: 'Laboratory', icon: '🧪', desc: 'Research or lab equipment' },
  { id: 'FOOD', label: 'Food', icon: '🍴', desc: 'Dining options' },
];

const SEATS_OPTIONS = [1, 2, 4, 6, 10];
const CROWD_OPTIONS = [{ v: 30, l: 'Low (≤30%)' }, { v: 50, l: 'Moderate (≤50%)' }, { v: 70, l: 'Any (≤70%)' }];
const DIST_OPTIONS = [{ v: 100, l: '100m' }, { v: 250, l: '250m' }, { v: 500, l: '500m' }, { v: 1000, l: '1km+' }];

export const RecommendationPage: React.FC = () => {
  const location = useLocation();
  const initNeed = (location.state as any)?.need ?? '';

  const [selectedNeed, setSelectedNeed] = useState<string>(initNeed);
  const [seats, setSeats] = useState(1);
  const [maxCrowd, setMaxCrowd] = useState(70);
  const [maxDist, setMaxDist] = useState(1000);
  const [results, setResults] = useState<{ bestMatch: RecommendedResource | null; alternatives: RecommendedResource[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookedId, setBookedId] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  const handleFind = async () => {
    if (!selectedNeed) { setError('Please select what you need.'); return; }
    setError('');
    setIsLoading(true);
    try {
      const data = await recommendationAPI.get({ need: selectedNeed as any, requiredSeats: seats, maxCrowd, maxDistance: maxDist });
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBook = async (res: RecommendedResource) => {
    setBookingLoading(res.id);
    try {
      await bookingAPI.create({ resourceId: res.id, seats, purpose: 'Smart Recommendation Booking' });
      setBookedId(res.id);
    } catch (_) {}
    setBookingLoading(null);
  };

  const ResourceCard = ({ res, isBest }: { res: RecommendedResource; isBest?: boolean }) => (
    <div className={`glass-card rounded-2xl border p-5 ${isBest ? 'border-blue-500/40 bg-gradient-to-br from-blue-600/10 to-purple-600/10' : 'border-white/5'} transition-all`}>
      {isBest && (
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-amber-400" />
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Best Match</span>
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white mb-1">{res.name}</h3>
          <CrowdBadge status={res.currentCrowdStatus as any} />
        </div>
        <div className="text-right">
          <OccupancyGauge percent={res.currentOccupancyPercent} size="sm" />
          <p className={`text-2xl font-bold mt-1 ${isBest ? 'text-emerald-400' : 'text-blue-400'}`}>{res.matchScore}%</p>
          <p className="text-[10px] text-slate-500">match</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-400 mb-0.5">Crowd</div>
          <div className={`text-lg font-bold ${res.currentOccupancyPercent > 70 ? 'text-red-400' : res.currentOccupancyPercent > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {Math.round(res.currentOccupancyPercent)}%
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-400 mb-0.5">Free Seats</div>
          <div className="text-lg font-bold text-emerald-400">{res.availableUnits}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-400 mb-0.5">Distance</div>
          <div className="text-lg font-bold text-blue-400">{res.distanceMeters}m</div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-slate-400 mb-1.5">Predicted in 1 hour:</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/5 rounded-full h-2">
            <div className={`h-full rounded-full ${res.predictedInOneHour > 70 ? 'bg-red-500' : res.predictedInOneHour > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${res.predictedInOneHour}%` }} />
          </div>
          <span className="text-xs font-bold text-slate-300 w-10 text-right">{res.predictedInOneHour.toFixed(0)}%</span>
        </div>
      </div>

      {res.reasons.length > 0 && (
        <div className="mb-4 space-y-1">
          {res.reasons.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle size={11} />
              {r}
            </div>
          ))}
        </div>
      )}

      {bookedId === res.id ? (
        <div className="flex items-center justify-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium">
          <CheckCircle size={14} />
          Reserved Successfully!
        </div>
      ) : (
        <button
          onClick={() => handleBook(res)}
          disabled={bookingLoading === res.id}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${isBest ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white/8 hover:bg-white/12 text-slate-200'} disabled:opacity-50`}
        >
          <BookOpen size={14} />
          {bookingLoading === res.id ? 'Reserving…' : 'Reserve Now'}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
          <Brain size={20} className="text-purple-400" />
          Smart Resource Finder
        </h1>
        <p className="text-slate-400 text-sm">Tell us what you need. We'll find the perfect campus space for you.</p>
      </div>

      {/* Step 1: What do you need? */}
      <div className="glass-card rounded-2xl border border-white/5 p-6">
        <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-widest">Step 1 · What do you need?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {NEEDS.map(n => (
            <button
              key={n.id}
              onClick={() => setSelectedNeed(n.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selectedNeed === n.id ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-white/3 border-white/8 text-slate-400 hover:bg-white/6 hover:text-white'}`}
            >
              <span className="text-2xl">{n.icon}</span>
              <span className="text-xs font-medium text-center leading-tight">{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Preferences */}
      <div className="glass-card rounded-2xl border border-white/5 p-6">
        <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-widest">Step 2 · Preferences</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="text-xs text-slate-400 block mb-2 uppercase tracking-wider">Required Seats</label>
            <div className="flex gap-2">
              {SEATS_OPTIONS.map(s => (
                <button key={s} onClick={() => setSeats(s)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${seats === s ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                  {s === 10 ? '10+' : s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-2 uppercase tracking-wider">Max Crowd Level</label>
            <div className="flex gap-2">
              {CROWD_OPTIONS.map(c => (
                <button key={c.v} onClick={() => setMaxCrowd(c.v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${maxCrowd === c.v ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                  {c.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-2 uppercase tracking-wider">Max Distance</label>
            <div className="flex gap-2">
              {DIST_OPTIONS.map(d => (
                <button key={d.v} onClick={() => setMaxDist(d.v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${maxDist === d.v ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                  {d.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleFind}
        disabled={isLoading || !selectedNeed}
        className="w-full sm:w-auto flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-xl text-sm transition-all disabled:opacity-50"
      >
        <Brain size={16} />
        {isLoading ? 'Finding Best Match…' : 'Find Best Space For Me'}
        {!isLoading && <ChevronRight size={16} />}
      </button>

      {/* Results */}
      {isLoading && (
        <div className="glass-card rounded-2xl border border-white/5 p-8">
          <LoadingSkeleton lines={4} />
        </div>
      )}

      {results && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-amber-400" />
            <h2 className="text-base font-bold text-white">Recommendations for you</h2>
            <span className="text-xs text-slate-500">({results.alternatives.length + (results.bestMatch ? 1 : 0)} matches out of {15} resources)</span>
          </div>

          {results.bestMatch && (
            <ResourceCard res={results.bestMatch} isBest />
          )}

          {results.alternatives.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-slate-300">Alternatives</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.alternatives.map(r => <ResourceCard key={r.id} res={r} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

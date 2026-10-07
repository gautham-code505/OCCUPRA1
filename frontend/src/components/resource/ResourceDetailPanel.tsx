import React, { useState } from 'react';
import { Resource, Booking } from '../../types';
import { bookingAPI } from '../../services/api';
import { cn } from '../../utils/helpers';
import { CrowdBadge, OccupancyGauge } from '../ui/CoreComponents';
import { X, MapPin, Zap, Clock, Users, Wifi, AirVent, CheckCircle, Calendar, BookOpen } from 'lucide-react';

interface ResourceDetailPanelProps {
  resource: Resource;
  onClose?: () => void;
  onBook?: (booking: Booking) => void;
  className?: string;
}

export const ResourceDetailPanel: React.FC<ResourceDetailPanelProps> = ({ resource, onClose, onBook, className }) => {
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState('Today');
  const [startTime, setStartTime] = useState('02:00 PM');
  const [endTime, setEndTime] = useState('04:00 PM');
  const [seats, setSeats] = useState(1);
  const [purpose, setPurpose] = useState('Study');
  const [isBooking, setIsBooking] = useState(false);
  const [bookedSuccess, setBookedSuccess] = useState<Booking | null>(null);
  const [error, setError] = useState('');

  const facilitiesList = resource.facilities.split(',').map(f => f.trim());

  const facilityIcon = (f: string) => {
    const l = f.toLowerCase();
    if (l.includes('wi-fi') || l.includes('wifi')) return <Wifi size={12} />;
    if (l.includes('ac') || l.includes('air')) return <AirVent size={12} />;
    return <CheckCircle size={12} />;
  };

  const handleBook = async () => {
    setIsBooking(true);
    setError('');
    try {
      const data = await bookingAPI.create({
        resourceId: resource.id,
        date: bookingDate,
        startTime,
        endTime,
        seats,
        purpose,
      });
      setBookedSuccess(data.booking);
      onBook?.(data.booking);
    } catch (err: any) {
      setError(err.message || 'Booking failed');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className={cn('glass-card rounded-2xl border border-white/10 overflow-hidden flex flex-col', className)}>
      {/* Header */}
      <div className="relative p-5 border-b border-white/10 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all">
            <X size={16} />
          </button>
        )}
        <div className="flex items-start justify-between pr-8">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">{resource.name}</h2>
            <div className="flex items-center gap-2 mb-1">
              <CrowdBadge status={resource.currentCrowdStatus} />
            </div>
            <p className="text-xs text-slate-400">{resource.building} · {resource.floor}</p>
          </div>
          <OccupancyGauge percent={resource.occupancyPercent} size="md" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Occupied', val: `${resource.currentOccupancy}`, sub: `of ${resource.capacity}`, color: 'text-white' },
            { label: 'Available', val: `${resource.availableUnits}`, sub: 'seats/systems', color: 'text-emerald-400' },
            { label: 'Distance', val: `${resource.distanceMeters}m`, sub: 'from you', color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={cn('text-lg font-bold leading-none mb-0.5', s.color)}>{s.val}</p>
              <p className="text-[10px] text-slate-600">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Hours */}
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Clock size={14} className="text-blue-400 flex-shrink-0" />
          <span>Open: <span className="text-white font-medium">{resource.openingTime} – {resource.closingTime}</span></span>
        </div>

        {/* Description */}
        {resource.description && (
          <p className="text-xs text-slate-400 leading-relaxed">{resource.description}</p>
        )}

        {/* Facilities */}
        <div>
          <h4 className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">Facilities</h4>
          <div className="flex flex-wrap gap-2">
            {facilitiesList.map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300">
                <span className="text-blue-400">{facilityIcon(f)}</span>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Booking Section */}
        {bookedSuccess ? (
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4 text-center">
            <CheckCircle size={28} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-400 font-bold text-sm">Reservation Confirmed!</p>
            <p className="text-xs text-slate-400 mt-1">Booking ID: <span className="text-white font-mono">{bookedSuccess.bookingCode}</span></p>
            <p className="text-xs text-slate-400 mt-0.5">{bookedSuccess.date} · {bookedSuccess.startTime} – {bookedSuccess.endTime}</p>
          </div>
        ) : showBooking ? (
          <div className="bg-white/3 border border-white/10 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar size={14} className="text-blue-400" />
              Reserve Space
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">Date</label>
                <select value={bookingDate} onChange={e => setBookingDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50">
                  <option>Today</option>
                  <option>Tomorrow</option>
                  <option>Day After</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">Seats</label>
                <input type="number" value={seats} min={1} max={resource.availableUnits} onChange={e => setSeats(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">Start</label>
                <input type="text" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">End</label>
                <input type="text" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 uppercase tracking-wider">Purpose</label>
              <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50" placeholder="e.g. Study, Project Work..." />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowBooking(false)}
                className="flex-1 py-2 rounded-xl text-sm bg-white/5 text-slate-300 hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={handleBook} disabled={isBooking}
                className="flex-1 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50">
                {isBooking ? 'Booking…' : 'Confirm Reservation'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowBooking(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              <BookOpen size={14} />
              Reserve Seat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

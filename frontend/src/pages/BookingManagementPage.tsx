import React, { useEffect, useState } from 'react';
import { bookingAPI } from '../services/api';
import { Booking } from '../types';
import { CalendarCheck, Trash2, Users, Clock } from 'lucide-react';
import { LoadingSkeleton } from '../components/ui/CoreComponents';
import { cn } from '../utils/helpers';

export const BookingManagementPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'CANCELLED'>('ALL');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const d = await bookingAPI.getAll();
      setBookings(d.bookings ?? []);
    } catch (_) {}
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this booking?')) return;
    setCancelling(id);
    try {
      await bookingAPI.cancel(id);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' as const } : b));
    } catch (_) {}
    setCancelling(null);
  };

  const filtered = bookings.filter(b => filter === 'ALL' || b.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck size={20} className="text-purple-400" />
            Booking Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">{bookings.length} total bookings · {bookings.filter(b => b.status === 'CONFIRMED').length} active</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['ALL', 'CONFIRMED', 'CANCELLED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium border transition-all',
              filter === f ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white')}>
            {f} ({f === 'ALL' ? bookings.length : bookings.filter(b => b.status === f).length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="glass-card rounded-2xl border border-white/5 p-6"><LoadingSkeleton lines={5} /></div>
      ) : (
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/3 border-b border-white/8">
              <tr>
                {['Booking ID', 'Student', 'Resource', 'Date & Time', 'Seats', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(b => (
                <tr key={b.id} className={cn('hover:bg-white/3 transition-colors', b.status === 'CANCELLED' ? 'opacity-50' : '')}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-blue-400">{b.bookingCode}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{b.user?.name ?? 'Student'}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-white">{b.resource?.name ?? '—'}</p>
                    <p className="text-[10px] text-slate-500">{b.resource?.building}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1 mb-0.5">
                      <CalendarCheck size={10} className="text-blue-400" /> {b.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={10} className="text-blue-400" /> {b.startTime} – {b.endTime}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-slate-300">
                      <Users size={10} /> {b.seats}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', b.status === 'CONFIRMED' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400')}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {b.status === 'CONFIRMED' && (
                      <button onClick={() => handleCancel(b.id)} disabled={cancelling === b.id}
                        className="p-1.5 hover:bg-red-500/15 rounded-lg text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">No bookings found.</div>
          )}
        </div>
      )}
    </div>
  );
};

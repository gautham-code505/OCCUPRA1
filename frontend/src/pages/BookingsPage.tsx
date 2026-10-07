import React, { useState, useEffect } from 'react';
import { bookingAPI } from '../services/api';
import { Booking } from '../types';
import { CalendarCheck, Trash2, Clock, Users, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { LoadingSkeleton, EmptyState } from '../components/ui/CoreComponents';
import { cn } from '../utils/helpers';

export const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'CANCELLED'>('ALL');

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const data = await bookingAPI.getMy();
      setBookings(data.bookings || []);
    } catch (err) {
      // try all bookings
      try {
        const data = await bookingAPI.getAll();
        setBookings(data.bookings || []);
      } catch (_) {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, []);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await bookingAPI.cancel(id);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' as const } : b));
    } catch (_) {}
    setCancelling(null);
  };

  const filtered = bookings.filter(b => filter === 'ALL' || b.status === filter);
  const confirmedCount = bookings.filter(b => b.status === 'CONFIRMED').length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck size={20} className="text-blue-400" />
            My Bookings
          </h1>
          <p className="text-slate-400 text-sm mt-1">{confirmedCount} active reservation{confirmedCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['ALL', 'CONFIRMED', 'CANCELLED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
              filter === f
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            )}
          >
            {f === 'ALL' ? `All (${bookings.length})` : f === 'CONFIRMED' ? `Active (${confirmedCount})` : `Cancelled (${bookings.filter(b => b.status === 'CANCELLED').length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl border border-white/5 p-5">
              <LoadingSkeleton lines={3} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={48} />}
          title="No bookings found"
          message="You haven't made any campus reservations yet. Use the Smart Finder to book a space."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => (
            <div key={booking.id} className={cn(
              'glass-card rounded-2xl border p-5 transition-all',
              booking.status === 'CANCELLED' ? 'opacity-60 border-white/5' : 'border-white/10 hover:border-blue-500/20'
            )}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    booking.status === 'CONFIRMED' ? 'bg-blue-600/20' : 'bg-white/5'
                  )}>
                    <BookOpen size={20} className={booking.status === 'CONFIRMED' ? 'text-blue-400' : 'text-slate-500'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-base">{booking.resource?.name ?? 'Campus Resource'}</h3>
                      <span className={cn(
                        'text-xs font-bold px-2 py-0.5 rounded-full',
                        booking.status === 'CONFIRMED' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'
                      )}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{booking.bookingCode}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <CalendarCheck size={11} className="text-blue-400" />
                        {booking.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={11} className="text-blue-400" />
                        {booking.startTime} – {booking.endTime}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={11} className="text-blue-400" />
                        {booking.seats} seat{booking.seats !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {booking.purpose && (
                      <p className="text-xs text-slate-500 mt-1 italic">"{booking.purpose}"</p>
                    )}
                  </div>
                </div>

                {booking.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleCancel(booking.id)}
                    disabled={cancelling === booking.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    {cancelling === booking.id ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
              </div>

              {/* Resource quick info */}
              {booking.resource && (
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{booking.resource.building}</span>
                  <span>·</span>
                  <span>{booking.resource.floor}</span>
                  <span>·</span>
                  <span>{booking.resource.distanceMeters}m away</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import { prisma } from '../utils/prisma';
import { parseClock } from '../campus/time';

const ACTIVE_WINDOW_MS = 18 * 3600 * 1000; // bookings are same-day: ignore anything older

/** Seats reserved per resource at a campus-local minute (bookings whose window covers it). */
export async function reservedSeatsAt(minuteOfDay: number, resourceId?: string): Promise<Map<string, number>> {
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      createdAt: { gte: new Date(Date.now() - ACTIVE_WINDOW_MS) },
      ...(resourceId ? { resourceId } : {}),
    },
    select: { resourceId: true, seats: true, startTime: true, endTime: true },
  });
  const out = new Map<string, number>();
  for (const b of bookings) {
    const s = parseClock(b.startTime);
    const e = parseClock(b.endTime);
    const covers = s === null || e === null ? true : minuteOfDay >= s && minuteOfDay < e;
    if (covers) out.set(b.resourceId, (out.get(b.resourceId) ?? 0) + b.seats);
  }
  return out;
}

/** Max seats already booked in any minute of [start, end) for a resource. */
export async function peakReservedInWindow(resourceId: string, start: number, end: number): Promise<number> {
  const bookings = await prisma.booking.findMany({
    where: { resourceId, status: 'CONFIRMED', createdAt: { gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } },
    select: { seats: true, startTime: true, endTime: true },
  });
  let peak = 0;
  for (let m = start; m < end; m += 5) {
    let sum = 0;
    for (const b of bookings) {
      const s = parseClock(b.startTime) ?? 0;
      const e = parseClock(b.endTime) ?? 1440;
      if (m >= s && m < e) sum += b.seats;
    }
    peak = Math.max(peak, sum);
  }
  return peak;
}

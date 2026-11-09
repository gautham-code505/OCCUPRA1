import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import { parseClock, ampm } from '../campus/time';
import { peakReservedInWindow } from '../services/bookingLogic';
import { simClock } from '../campus/clock';

export const getBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
        resource: { select: { id: true, name: true, code: true, type: true, building: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ bookings, count: bookings.length });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        resource: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ bookings });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch user bookings' });
  }
};

export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Default slot: starting now (campus/demo time) for one hour
    const nowMinute = Math.ceil(simClock.info().minuteOfDay / 5) * 5;
    const { resourceId, date = 'Today', startTime = ampm(nowMinute), endTime = ampm(Math.min(1439, nowMinute + 60)), seats = 1, purpose = 'Study' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'You must be logged in to make a booking' });
      return;
    }

    // Check if user still exists (handles cases where DB was re-seeded and old token is used)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ error: 'Session expired or invalid user. Please log out and log in again.' });
      return;
    }

    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    const seatCount = Number(seats);
    if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 50) {
      res.status(400).json({ error: 'seats must be a whole number between 1 and 50' });
      return;
    }
    if (!resource.isAvailable) {
      res.status(400).json({ error: `${resource.name} is currently closed` });
      return;
    }
    const start = parseClock(startTime);
    const end = parseClock(endTime);
    if (start === null || end === null || end <= start) {
      res.status(400).json({ error: 'startTime/endTime must be valid times like "02:00 PM", with end after start' });
      return;
    }

    // Capacity check: other bookings overlapping this window + (if starting soon) people already inside
    const alreadyBooked = await peakReservedInWindow(resource.id, start, end);
    const nowMin = simClock.info().minuteOfDay;
    const startsSoon = start <= nowMin + 30;
    const free = startsSoon ? resource.availableUnits : resource.capacity - alreadyBooked;
    if (free < seatCount) {
      res.status(400).json({ error: `Not enough capacity for that slot (only ${Math.max(0, free)} seats free)` });
      return;
    }

    // Collision-proof booking code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const bookingCode = `BK-${dateStr}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const booking = await prisma.booking.create({
      data: {
        bookingCode,
        userId,
        resourceId,
        date,
        startTime,
        endTime,
        seats: seatCount,
        purpose,
        status: 'CONFIRMED',
      },
      include: {
        resource: true,
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId,
        resourceId,
        type: 'BOOKING',
        title: 'Reservation Confirmed',
        message: `Your booking ${bookingCode} for ${resource.name} is confirmed (${date}, ${startTime} - ${endTime}).`,
        isRead: false,
      },
    });

    res.status(201).json({
      success: true,
      booking,
      message: 'Reservation confirmed successfully',
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to reserve space' });
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    if (booking.userId !== req.user?.id && req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'You can only cancel your own bookings' });
      return;
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { resource: true },
    });

    res.json({ success: true, booking: updated });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

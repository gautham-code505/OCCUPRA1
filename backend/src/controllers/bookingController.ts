import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

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
    const { resourceId, date = 'Today', startTime = '02:00 PM', endTime = '03:00 PM', seats = 1, purpose = 'Study' } = req.body;
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

    if (resource.availableUnits < Number(seats)) {
      res.status(400).json({ error: `Not enough available capacity (only ${resource.availableUnits} seats remaining)` });
      return;
    }

    // Generate unique booking code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const bookingCode = `BK-${dateStr}-${randNum}`;

    const booking = await prisma.booking.create({
      data: {
        bookingCode,
        userId,
        resourceId,
        date,
        startTime,
        endTime,
        seats: Number(seats),
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

import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

// A user sees their own notifications plus campus-wide broadcasts (userId = null).
const visibleTo = (userId: string) => ({ OR: [{ userId }, { userId: null }] });

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: visibleTo(userId),
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        resource: {
          select: { id: true, name: true, code: true, type: true },
        },
      },
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.notification.findFirst({ where: { id, ...visibleTo(userId) } });
    if (!existing) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const notif = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true, notification: notif });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await prisma.notification.updateMany({
      where: { isRead: false, ...visibleTo(userId) },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

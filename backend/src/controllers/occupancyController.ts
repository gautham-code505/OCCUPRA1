import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getOccupancyOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const resources = await prisma.resource.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        capacity: true,
        currentOccupancy: true,
        occupancyPercent: true,
        availableUnits: true,
        currentCrowdStatus: true,
        distanceMeters: true,
        latitude: true,
        longitude: true,
        building: true,
        updatedAt: true,
      },
    });

    const totalCapacity = resources.reduce((acc, r) => acc + r.capacity, 0);
    const totalOccupied = resources.reduce((acc, r) => acc + r.currentOccupancy, 0);
    const averageOccupancyPercent = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 1000) / 10 : 0;

    const quietCount = resources.filter((r) => r.currentCrowdStatus === 'QUIET').length;
    const moderateCount = resources.filter((r) => r.currentCrowdStatus === 'MODERATE').length;
    const crowdedCount = resources.filter((r) => r.currentCrowdStatus === 'CROWDED').length;

    res.json({
      summary: {
        totalResources: resources.length,
        totalCapacity,
        totalOccupied,
        campusOccupancyPercent: averageOccupancyPercent,
        quietResources: quietCount,
        moderateResources: moderateCount,
        crowdedResources: crowdedCount,
        lastUpdated: new Date().toISOString(),
      },
      resources,
    });
  } catch (error) {
    console.error('Get occupancy overview error:', error);
    res.status(500).json({ error: 'Failed to fetch occupancy overview' });
  }
};

export const getResourceOccupancy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resourceId } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        sensors: true,
        occupancyRecords: {
          take: 24,
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!resource) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    res.json({
      resourceId: resource.id,
      name: resource.name,
      capacity: resource.capacity,
      currentOccupancy: resource.currentOccupancy,
      occupancyPercent: resource.occupancyPercent,
      availableUnits: resource.availableUnits,
      currentCrowdStatus: resource.currentCrowdStatus,
      sensor: resource.sensors[0] || null,
      history: resource.occupancyRecords.reverse(),
    });
  } catch (error) {
    console.error('Get resource occupancy error:', error);
    res.status(500).json({ error: 'Failed to fetch resource occupancy' });
  }
};

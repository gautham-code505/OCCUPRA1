import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { PredictionService } from '../services/predictionService';

export const getResources = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, crowdStatus, search, minSeats, maxDistance, sort } = req.query;

    const where: any = {};

    if (type && type !== 'ALL') {
      where.type = String(type);
    }

    if (crowdStatus && crowdStatus !== 'ALL') {
      where.currentCrowdStatus = String(crowdStatus);
    }

    if (search) {
      const q = String(search).toLowerCase();
      where.OR = [
        { name: { contains: q } },
        { building: { contains: q } },
        { facilities: { contains: q } },
        { description: { contains: q } },
      ];
    }

    if (minSeats) {
      where.availableUnits = { gte: Number(minSeats) };
    }

    if (maxDistance) {
      where.distanceMeters = { lte: Number(maxDistance) };
    }

    let resources = await prisma.resource.findMany({
      where,
      include: {
        sensors: true,
      },
    });

    // Sorting
    if (sort === 'leastCrowded') {
      resources.sort((a, b) => a.occupancyPercent - b.occupancyPercent);
    } else if (sort === 'mostAvailable') {
      resources.sort((a, b) => b.availableUnits - a.availableUnits);
    } else if (sort === 'nearest') {
      resources.sort((a, b) => a.distanceMeters - b.distanceMeters);
    } else if (sort === 'capacity') {
      resources.sort((a, b) => b.capacity - a.capacity);
    }

    res.json({ resources, count: resources.length });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
};

export const getResourceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        sensors: true,
        predictions: {
          orderBy: { timeOffsetMinutes: 'asc' },
        },
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

    // Refresh dynamic forecast
    const forecast = await PredictionService.getForecastForResource(id);

    res.json({
      resource,
      forecast,
    });
  } catch (error) {
    console.error('Get resource by id error:', error);
    res.status(500).json({ error: 'Failed to fetch resource details' });
  }
};

export const createResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      code,
      type,
      capacity,
      openingTime = '08:00 AM',
      closingTime = '09:00 PM',
      facilities = 'Wi-Fi, AC',
      description = '',
      latitude,
      longitude,
      floor = 'Ground Floor',
      building = 'Main Block',
      distanceMeters = 200,
    } = req.body;

    const resource = await prisma.resource.create({
      data: {
        name,
        code,
        type,
        capacity: Number(capacity),
        currentOccupancy: 0,
        occupancyPercent: 0,
        availableUnits: Number(capacity),
        openingTime,
        closingTime,
        facilities,
        description,
        latitude: Number(latitude || 12.9716),
        longitude: Number(longitude || 77.5946),
        floor,
        building,
        distanceMeters: Number(distanceMeters),
        currentCrowdStatus: 'QUIET',
      },
    });

    // Automatically create a sensor for it
    await prisma.sensor.create({
      data: {
        sensorCode: `SENS-${code.toUpperCase()}`,
        resourceId: resource.id,
        status: 'ONLINE',
        entryRate: 2,
        exitRate: 1,
        batteryLevel: 100,
        healthPercent: 100,
      },
    });

    res.status(201).json({ resource });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
};

export const updateResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.capacity) {
      data.capacity = Number(data.capacity);
      data.availableUnits = Math.max(0, data.capacity - (data.currentOccupancy || 0));
    }

    const updated = await prisma.resource.update({
      where: { id },
      data,
    });

    res.json({ resource: updated });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
};

export const deleteResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.resource.delete({ where: { id } });
    res.json({ success: true, message: 'Resource deleted' });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
};

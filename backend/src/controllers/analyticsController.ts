import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getAnalyticsOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const resources = await prisma.resource.findMany({
      include: { sensors: true },
    });
    const bookings = await prisma.booking.findMany({ where: { status: 'CONFIRMED' } });
    const sensors = await prisma.sensor.findMany();

    const totalCapacity = resources.reduce((acc, r) => acc + r.capacity, 0);
    const totalOccupied = resources.reduce((acc, r) => acc + r.currentOccupancy, 0);
    const avgOccupancy = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 1000) / 10 : 0;

    const crowdedCount = resources.filter((r) => r.currentCrowdStatus === 'CROWDED').length;
    const availableCount = resources.filter((r) => r.currentCrowdStatus === 'QUIET').length;
    const moderateCount = resources.filter((r) => r.currentCrowdStatus === 'MODERATE').length;

    const avgSensorHealth = sensors.length > 0
      ? Math.round(sensors.reduce((acc, s) => acc + s.healthPercent, 0) / sensors.length)
      : 97;

    res.json({
      metrics: {
        totalResources: resources.length,
        totalCapacity,
        totalOccupied,
        totalOccupancyPercent: avgOccupancy,
        crowdedResources: crowdedCount,
        availableResources: availableCount,
        moderateResources: moderateCount,
        activeBookings: bookings.length,
        sensorHealthPercent: avgSensorHealth,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch overview analytics' });
  }
};

export const getUtilizationAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const resources = await prisma.resource.findMany({
      orderBy: { occupancyPercent: 'desc' },
    });

    const mostUtilized = resources.slice(0, 3);
    const leastUtilized = [...resources].reverse().slice(0, 3);

    const typeBreakdown: Record<string, { totalCapacity: number; totalOccupancy: number; count: number }> = {};
    for (const r of resources) {
      if (!typeBreakdown[r.type]) {
        typeBreakdown[r.type] = { totalCapacity: 0, totalOccupancy: 0, count: 0 };
      }
      typeBreakdown[r.type].totalCapacity += r.capacity;
      typeBreakdown[r.type].totalOccupancy += r.currentOccupancy;
      typeBreakdown[r.type].count++;
    }

    const categoryUtilization = Object.entries(typeBreakdown).map(([type, stats]) => ({
      category: type,
      occupancyPercent: stats.totalCapacity > 0 ? Math.round((stats.totalOccupancy / stats.totalCapacity) * 1000) / 10 : 0,
      resourceCount: stats.count,
    }));

    // Generate smart optimization recommendation
    const lab1 = resources.find((r) => r.code === 'LAB-01');
    const lab3 = resources.find((r) => r.code === 'LAB-03');
    let recommendation = 'Campus distribution is currently balanced.';

    if (lab1 && lab3 && lab1.occupancyPercent > 75 && lab3.occupancyPercent < 55) {
      recommendation = `Computer Lab 1 is congested (${lab1.occupancyPercent}%) while Lab 3 operates with ${100 - lab3.occupancyPercent}% free headroom. Redirect student traffic to Lab 3 to optimize thermal load and seat efficiency.`;
    }

    res.json({
      mostUtilized,
      leastUtilized,
      categoryUtilization,
      optimizationInsight: recommendation,
      comparison: resources.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        type: r.type,
        occupancyPercent: r.occupancyPercent,
        currentOccupancy: r.currentOccupancy,
        capacity: r.capacity,
        availableUnits: r.availableUnits,
        status: r.currentCrowdStatus,
      })),
    });
  } catch (error) {
    console.error('Get utilization analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch utilization analytics' });
  }
};

export const getTrendsAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Hourly Trend Simulation curve (8 AM to 9 PM)
    const hours = [
      { time: '08:00', label: '8 AM', occupancy: 24, library: 20, labs: 25, study: 15 },
      { time: '09:00', label: '9 AM', occupancy: 42, library: 35, labs: 48, study: 28 },
      { time: '10:00', label: '10 AM', occupancy: 58, library: 52, labs: 68, study: 45 },
      { time: '11:00', label: '11 AM', occupancy: 74, library: 68, labs: 84, study: 58 },
      { time: '12:00', label: '12 PM', occupancy: 82, library: 75, labs: 89, study: 64 },
      { time: '13:00', label: '1 PM', occupancy: 88, library: 80, labs: 86, study: 60 },
      { time: '14:00', label: '2 PM', occupancy: 79, library: 74, labs: 82, study: 55 },
      { time: '15:00', label: '3 PM', occupancy: 84, library: 81, labs: 88, study: 62 },
      { time: '16:00', label: '4 PM', occupancy: 87, library: 85, labs: 90, study: 68 },
      { time: '17:00', label: '5 PM', occupancy: 81, library: 82, labs: 82, study: 59 },
      { time: '18:00', label: '6 PM', occupancy: 65, library: 70, labs: 62, study: 48 },
      { time: '19:00', label: '7 PM', occupancy: 48, library: 55, labs: 40, study: 38 },
      { time: '20:00', label: '8 PM', occupancy: 34, library: 40, labs: 28, study: 24 },
      { time: '21:00', label: '9 PM', occupancy: 18, library: 22, labs: 12, study: 10 },
    ];

    // 2. Weekly Distribution
    const weekly = [
      { day: 'Mon', avgOccupancy: 76, peakHour: '3:00 PM', totalVisits: 3420 },
      { day: 'Tue', avgOccupancy: 81, peakHour: '2:30 PM', totalVisits: 3680 },
      { day: 'Wed', avgOccupancy: 84, peakHour: '4:00 PM', totalVisits: 3890 },
      { day: 'Thu', avgOccupancy: 79, peakHour: '3:30 PM', totalVisits: 3540 },
      { day: 'Fri', avgOccupancy: 72, peakHour: '1:00 PM', totalVisits: 3210 },
      { day: 'Sat', avgOccupancy: 45, peakHour: '11:30 AM', totalVisits: 1840 },
      { day: 'Sun', avgOccupancy: 28, peakHour: '4:30 PM', totalVisits: 1120 },
    ];

    // 3. Peak hours summary
    const peakWindows = [
      { window: '11:00 AM – 01:00 PM', intensity: 'HIGH', label: 'Midday Academic Surge' },
      { window: '02:00 PM – 05:00 PM', intensity: 'CRITICAL', label: 'Afternoon Lab & Library Peak' },
      { window: '07:00 PM – 10:00 PM', intensity: 'LOW', label: 'Evening Calm Window' },
    ];

    res.json({
      hourlyTrends: hours,
      weeklyTrends: weekly,
      peakWindows,
    });
  } catch (error) {
    console.error('Get trends analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch trends analytics' });
  }
};

export const getAIInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const resources = await prisma.resource.findMany();
    const dbInsights = await prisma.insight.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    // Generate dynamic live insights from current state
    const dynamicInsights = [...dbInsights];

    const lib = resources.find((r) => r.code === 'LIB-MAIN');
    if (lib && lib.occupancyPercent > 70) {
      dynamicInsights.unshift({
        id: 'dyn-lib-surge',
        title: 'Central Library Nearing Capacity',
        description: `Central Library is currently at ${lib.occupancyPercent}% capacity. Consider steering study groups to Study Room B or Digital Reading Hall.`,
        category: 'PEAK_WARNING',
        severity: 'WARNING',
        resourceId: lib.id,
        createdAt: new Date(),
      });
    }

    const studyB = resources.find((r) => r.code === 'SR-02');
    if (studyB && studyB.occupancyPercent <= 30) {
      dynamicInsights.unshift({
        id: 'dyn-study-b',
        title: 'Optimal Study Sanctuary Identified',
        description: `Study Room B has only ${studyB.occupancyPercent}% occupancy with ${studyB.availableUnits} seats open and 150m walking distance.`,
        category: 'RECOMMENDATION',
        severity: 'INFO',
        resourceId: studyB.id,
        createdAt: new Date(),
      });
    }

    res.json({ insights: dynamicInsights });
  } catch (error) {
    console.error('Get AI insights error:', error);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
};

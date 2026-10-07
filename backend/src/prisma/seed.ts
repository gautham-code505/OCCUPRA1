import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('🌱 Starting CampusPulse AI database seeding...');

  // 1. Clean existing records
  await prisma.notification.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.occupancyRecord.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const studentPasswordHash = await bcrypt.hash('student123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  const studentUser = await prisma.user.create({
    data: {
      email: 'student@campus.ai',
      password: studentPasswordHash,
      name: 'Alex Rivera',
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@campus.ai',
      password: adminPasswordHash,
      name: 'Dr. Sarah Chen',
      role: 'ADMIN',
      department: 'Campus Operations & IoT Infrastructure',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    },
  });

  console.log('✅ Seeded Users (Student & Admin)');

  // 3. Define 15 Campus Resources
  // Geographic anchor: Realistic campus layout centered around [10.8290, 77.0592]
  const resourcesData = [
    {
      code: 'LIB-MAIN',
      name: 'Central Library',
      type: 'LIBRARY',
      capacity: 200,
      currentOccupancy: 124,
      occupancyPercent: 62.0,
      availableUnits: 76,
      openingTime: '08:00 AM',
      closingTime: '10:00 PM',
      facilities: 'Wi-Fi, AC, Charging Points, Printing, Silent Zone, Discussion Pods',
      description: 'The main academic hub featuring 4 reading zones, silent study carrels, and digital archives.',
      currentCrowdStatus: 'MODERATE',
      latitude: 10.8296,
      longitude: 77.0584,
      floor: 'Floor 1-3',
      building: 'Knowledge Center',
      distanceMeters: 180,
      sensorCode: 'LIB-001',
      entryRate: 8,
      exitRate: 4,
    },
    {
      code: 'LIB-DIGI',
      name: 'Digital Reading Hall',
      type: 'LIBRARY',
      capacity: 120,
      currentOccupancy: 42,
      occupancyPercent: 35.0,
      availableUnits: 78,
      openingTime: '08:30 AM',
      closingTime: '09:00 PM',
      facilities: 'Kindle Stations, E-Library Terminals, Wi-Fi, AC, Ergonomic Lounges',
      description: 'Quiet multimedia and e-journal reading environment equipped with high-res tablets.',
      currentCrowdStatus: 'QUIET',
      latitude: 10.8303,
      longitude: 77.0588,
      floor: 'Floor 2',
      building: 'Knowledge Center Annex',
      distanceMeters: 220,
      sensorCode: 'DRH-001',
      entryRate: 3,
      exitRate: 2,
    },
    {
      code: 'LAB-01',
      name: 'Computer Lab 1',
      type: 'COMPUTER_LAB',
      capacity: 80,
      currentOccupancy: 66,
      occupancyPercent: 82.5,
      availableUnits: 14,
      openingTime: '08:00 AM',
      closingTime: '08:00 PM',
      facilities: 'Desktop PCs, Dual Monitors, High-speed LAN, GPU Workstations, Projector',
      description: 'Core programming lab hosting algorithms and web development coursework.',
      currentCrowdStatus: 'CROWDED',
      latitude: 10.8286,
      longitude: 77.0601,
      floor: 'Ground Floor',
      building: 'Turing Technology Block',
      distanceMeters: 140,
      sensorCode: 'LAB-001',
      entryRate: 11,
      exitRate: 3,
    },
    {
      code: 'LAB-02',
      name: 'Computer Lab 2',
      type: 'COMPUTER_LAB',
      capacity: 75,
      currentOccupancy: 36,
      occupancyPercent: 48.0,
      availableUnits: 39,
      openingTime: '08:30 AM',
      closingTime: '07:30 PM',
      facilities: 'Desktop PCs, Linux Environment, Python Stack, Wi-Fi, AC',
      description: 'Open software engineering lab configured with Linux Fedora workstations.',
      currentCrowdStatus: 'MODERATE',
      latitude: 10.8288,
      longitude: 77.0606,
      floor: 'Floor 1',
      building: 'Turing Technology Block',
      distanceMeters: 160,
      sensorCode: 'LAB-002',
      entryRate: 5,
      exitRate: 4,
    },
    {
      code: 'LAB-03',
      name: 'Computer Lab 3',
      type: 'COMPUTER_LAB',
      capacity: 60,
      currentOccupancy: 25,
      occupancyPercent: 41.7,
      availableUnits: 35,
      openingTime: '08:00 AM',
      closingTime: '08:00 PM',
      facilities: 'Desktop PCs, Wi-Fi, AC, Projector, Whiteboard',
      description: 'High-availability lab with underutilized capacity during peak morning periods.',
      currentCrowdStatus: 'MODERATE',
      latitude: 10.8282,
      longitude: 77.0608,
      floor: 'Floor 2',
      building: 'Turing Technology Block',
      distanceMeters: 190,
      sensorCode: 'LAB-003',
      entryRate: 3,
      exitRate: 3,
    },
    {
      code: 'LAB-AI',
      name: 'AI & Data Science Lab',
      type: 'RESEARCH_LAB',
      capacity: 50,
      currentOccupancy: 32,
      occupancyPercent: 64.0,
      availableUnits: 18,
      openingTime: '09:00 AM',
      closingTime: '10:00 PM',
      facilities: 'NVIDIA RTX 4090 Rigs, CUDA Toolkits, AC, Dual 4K Displays, 10GbE Network',
      description: 'Specialized deep learning and data analytics cluster for student capstone research.',
      currentCrowdStatus: 'MODERATE',
      latitude: 10.8279,
      longitude: 77.0596,
      floor: 'Floor 3',
      building: 'Innovation Hub',
      distanceMeters: 240,
      sensorCode: 'AI-001',
      entryRate: 4,
      exitRate: 2,
    },
    {
      code: 'SR-01',
      name: 'Study Room A',
      type: 'STUDY_ROOM',
      capacity: 24,
      currentOccupancy: 8,
      occupancyPercent: 33.3,
      availableUnits: 16,
      openingTime: '07:00 AM',
      closingTime: '11:00 PM',
      facilities: 'Whiteboard, Quiet Zone, AC, Universal Power Outlets, Natural Light',
      description: 'Silent study cubicles ideal for individual deep focus and midterm prep.',
      currentCrowdStatus: 'QUIET',
      latitude: 10.8299,
      longitude: 77.0578,
      floor: 'Floor 1',
      building: 'Student Commons',
      distanceMeters: 120,
      sensorCode: 'SR-001',
      entryRate: 2,
      exitRate: 1,
    },
    {
      code: 'SR-02',
      name: 'Study Room B',
      type: 'STUDY_ROOM',
      capacity: 20,
      currentOccupancy: 5,
      occupancyPercent: 25.0,
      availableUnits: 15,
      openingTime: '07:00 AM',
      closingTime: '11:00 PM',
      facilities: 'Ergonomic Herman Miller Seating, Wi-Fi, Silent Zone, Sound Dampening',
      description: 'Ultra-quiet study sanctum with scenic courtyard views and ample power sockets.',
      currentCrowdStatus: 'QUIET',
      latitude: 10.8301,
      longitude: 77.0581,
      floor: 'Floor 1',
      building: 'Student Commons',
      distanceMeters: 150,
      sensorCode: 'SR-002',
      entryRate: 1,
      exitRate: 2,
    },
    {
      code: 'SR-03',
      name: 'Study Room C',
      type: 'STUDY_ROOM',
      capacity: 20,
      currentOccupancy: 6,
      occupancyPercent: 30.0,
      availableUnits: 14,
      openingTime: '07:00 AM',
      closingTime: '11:00 PM',
      facilities: 'Collaborative Pods, 65-inch Presentation Display, Wi-Fi, AC',
      description: 'Collaborative group study zone equipped with screen-sharing cables and whiteboard.',
      currentCrowdStatus: 'QUIET',
      latitude: 10.8304,
      longitude: 77.0576,
      floor: 'Floor 2',
      building: 'Student Commons',
      distanceMeters: 175,
      sensorCode: 'SR-003',
      entryRate: 2,
      exitRate: 1,
    },
    {
      code: 'CAN-01',
      name: 'Main Canteen',
      type: 'CANTEEN',
      capacity: 250,
      currentOccupancy: 220,
      occupancyPercent: 88.0,
      availableUnits: 30,
      openingTime: '07:30 AM',
      closingTime: '09:00 PM',
      facilities: 'Food Stalls, Specialty Coffee Bar, Outdoor Patio, Quick Checkout, Wi-Fi',
      description: 'Campus central dining hall serving breakfast, hot lunches, and specialty beverages.',
      currentCrowdStatus: 'CROWDED',
      latitude: 10.8284,
      longitude: 77.0581,
      floor: 'Ground Floor',
      building: 'Campus Plaza',
      distanceMeters: 90,
      sensorCode: 'CAN-001',
      entryRate: 24,
      exitRate: 18,
    },
    {
      code: 'SEM-01',
      name: 'Dr. Kalam Seminar Hall',
      type: 'SEMINAR_HALL',
      capacity: 180,
      currentOccupancy: 45,
      occupancyPercent: 25.0,
      availableUnits: 135,
      openingTime: '09:00 AM',
      closingTime: '06:00 PM',
      facilities: 'Acoustic Soundstage, Dual 4K Projectors, Dolby Audio, Stage Podium, AC',
      description: 'State-of-the-art auditorium for symposiums, guest lectures, and hackathons.',
      currentCrowdStatus: 'QUIET',
      latitude: 10.8309,
      longitude: 77.0596,
      floor: 'Ground Floor',
      building: 'Convention Wing',
      distanceMeters: 310,
      sensorCode: 'SEM-001',
      entryRate: 4,
      exitRate: 2,
    },
    {
      code: 'CLS-01',
      name: 'Block A Classrooms (301-305)',
      type: 'CLASSROOM',
      capacity: 150,
      currentOccupancy: 90,
      occupancyPercent: 60.0,
      availableUnits: 60,
      openingTime: '08:00 AM',
      closingTime: '06:00 PM',
      facilities: 'Interactive Smart Boards, Wi-Fi, Stepped Tier Seating, Podium Audio',
      description: 'Modern lecture halls for departmental engineering and management lectures.',
      currentCrowdStatus: 'MODERATE',
      latitude: 10.8292,
      longitude: 77.0571,
      floor: 'Floor 3',
      building: 'Academic Block A',
      distanceMeters: 210,
      sensorCode: 'CLA-001',
      entryRate: 10,
      exitRate: 7,
    },
    {
      code: 'CLS-02',
      name: 'Block B Classrooms (201-204)',
      type: 'CLASSROOM',
      capacity: 120,
      currentOccupancy: 55,
      occupancyPercent: 45.8,
      availableUnits: 65,
      openingTime: '08:00 AM',
      closingTime: '06:00 PM',
      facilities: 'Whiteboards, Ceiling Projector, Natural Ventilation, Charging Outlets',
      description: 'Tutorial rooms and seminar lecture classrooms for sciences and humanities.',
      currentCrowdStatus: 'MODERATE',
      latitude: 10.8296,
      longitude: 77.0566,
      floor: 'Floor 2',
      building: 'Academic Block B',
      distanceMeters: 260,
      sensorCode: 'CLA-002',
      entryRate: 6,
      exitRate: 5,
    },
    {
      code: 'RES-01',
      name: 'Advanced Research Lab',
      type: 'RESEARCH_LAB',
      capacity: 40,
      currentOccupancy: 18,
      occupancyPercent: 45.0,
      availableUnits: 22,
      openingTime: '08:00 AM',
      closingTime: '11:00 PM',
      facilities: 'Clean Bench, Oscilloscopes, Embedded Dev Kits, Biometric Keycard Access',
      description: 'Postgraduate IoT and embedded systems prototyping laboratory.',
      currentCrowdStatus: 'MODERATE',
      latitude: 10.8276,
      longitude: 77.0591,
      floor: 'Basement 1',
      building: 'Innovation Hub',
      distanceMeters: 280,
      sensorCode: 'RES-001',
      entryRate: 2,
      exitRate: 1,
    },
    {
      code: 'SAC-01',
      name: 'Student Activity Center',
      type: 'ACTIVITY_CENTER',
      capacity: 160,
      currentOccupancy: 85,
      occupancyPercent: 53.1,
      availableUnits: 75,
      openingTime: '09:00 AM',
      closingTime: '10:00 PM',
      facilities: 'Lounge Sofas, Table Tennis, Charging Hubs, Sound System, Indoor Turf',
      description: 'Recreation zone for student clubs, hackathon ideation, and downtime.',
      currentCrowdStatus: 'MODERATE',
      latitude: 10.8279,
      longitude: 77.0576,
      floor: 'Floor 1',
      building: 'Sports & Cultural Complex',
      distanceMeters: 170,
      sensorCode: 'SAC-001',
      entryRate: 12,
      exitRate: 9,
    },
  ];

  for (const item of resourcesData) {
    const { sensorCode, entryRate, exitRate, ...resProps } = item;
    
    // Create Resource
    const createdResource = await prisma.resource.create({
      data: resProps,
    });

    // Create IoT Sensor
    await prisma.sensor.create({
      data: {
        sensorCode,
        resourceId: createdResource.id,
        status: 'ONLINE',
        entryRate,
        exitRate,
        batteryLevel: Math.floor(92 + Math.random() * 8),
        healthPercent: Math.floor(95 + Math.random() * 5),
        lastHeartbeat: new Date(),
      },
    });

    // Create Occupancy Records (historical & current)
    for (let h = 12; h >= 0; h--) {
      const historicalTime = new Date(Date.now() - h * 3600 * 1000);
      const jitter = (Math.random() - 0.5) * 0.15;
      const basePct = Math.max(0.1, Math.min(0.95, (resProps.occupancyPercent / 100) + jitter));
      const occ = Math.round(basePct * resProps.capacity);
      
      await prisma.occupancyRecord.create({
        data: {
          resourceId: createdResource.id,
          occupancy: occ,
          occupancyPercent: Math.round(basePct * 1000) / 10,
          entryCount: Math.round(entryRate * (1 + jitter)),
          exitCount: Math.round(exitRate * (1 + jitter)),
          timestamp: historicalTime,
        },
      });
    }

    // Create 4 Prediction horizons (+30m, +1h, +2h, +4h)
    const horizons = [
      { offset: 30, drift: resProps.code === 'LIB-MAIN' ? 6 : (Math.random() * 8 - 4) },
      { offset: 60, drift: resProps.code === 'LIB-MAIN' ? 16 : (Math.random() * 14 - 7) },
      { offset: 120, drift: resProps.code === 'LIB-MAIN' ? 22 : (Math.random() * 20 - 10) },
      { offset: 240, drift: resProps.code === 'LIB-MAIN' ? 9 : (Math.random() * 24 - 12) },
    ];

    for (const h of horizons) {
      const predPct = Math.min(96, Math.max(10, Math.round((resProps.occupancyPercent + h.drift) * 10) / 10));
      const trend = h.drift > 2 ? 'INCREASING' : h.drift < -2 ? 'DECREASING' : 'STABLE';
      const summary = trend === 'INCREASING'
        ? `Crowd expected to increase by ${Math.abs(Math.round(h.drift))}%`
        : trend === 'DECREASING'
        ? `Crowd expected to subside by ${Math.abs(Math.round(h.drift))}%`
        : `Occupancy expected to remain steady`;

      await prisma.prediction.create({
        data: {
          resourceId: createdResource.id,
          timeOffsetMinutes: h.offset,
          predictedOccupancyPercent: predPct,
          confidence: Math.round((0.85 + Math.random() * 0.1) * 100) / 100,
          trend,
          summary,
        },
      });
    }
  }

  console.log(`✅ Seeded 15 Resources, 15 Sensors, 195 Occupancy Records, and 60 Predictions`);

  // 4. Create Sample Bookings for Student
  const libraryResource = await prisma.resource.findUnique({ where: { code: 'LIB-MAIN' } });
  const studyRoomB = await prisma.resource.findUnique({ where: { code: 'SR-02' } });
  const lab2 = await prisma.resource.findUnique({ where: { code: 'LAB-02' } });

  if (studyRoomB) {
    await prisma.booking.create({
      data: {
        bookingCode: 'BK-20261007-001',
        userId: studentUser.id,
        resourceId: studyRoomB.id,
        date: 'Today',
        startTime: '02:00 PM',
        endTime: '03:30 PM',
        seats: 2,
        purpose: 'Machine Learning Project Sprint',
        status: 'CONFIRMED',
      },
    });
  }

  if (lab2) {
    await prisma.booking.create({
      data: {
        bookingCode: 'BK-20261007-002',
        userId: studentUser.id,
        resourceId: lab2.id,
        date: 'Tomorrow',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        seats: 1,
        purpose: 'Linux Kernel Compilation',
        status: 'CONFIRMED',
      },
    });
  }

  // 5. Seed Smart Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: studentUser.id,
        resourceId: libraryResource?.id,
        type: 'CROWD',
        title: 'Crowd Surge Warning',
        message: 'Central Library is expected to reach 84% occupancy within 60 minutes.',
        isRead: false,
      },
      {
        userId: studentUser.id,
        resourceId: studyRoomB?.id,
        type: 'AVAILABILITY',
        title: 'Quiet Space Available',
        message: 'Study Room B currently has 15 seats free with only 25% crowd.',
        isRead: false,
      },
      {
        userId: studentUser.id,
        resourceId: studyRoomB?.id,
        type: 'BOOKING',
        title: 'Reservation Starting Soon',
        message: 'Your Study Room B reservation BK-20261007-001 begins at 02:00 PM.',
        isRead: false,
      },
      {
        userId: studentUser.id,
        resourceId: lab2?.id,
        type: 'RECOMMENDATION',
        title: 'Optimal Lab Alternative',
        message: 'Computer Lab 2 has 39 free systems (48% crowd) compared to Lab 1 (82%).',
        isRead: true,
      },
    ],
  });

  // 6. Seed AI Insights for Admin Command Center
  await prisma.insight.createMany({
    data: [
      {
        title: 'Severe Peak Congestion in Lab 1',
        description: 'Computer Lab 1 is consistently overcrowded (82% - 94%) between 11 AM and 4 PM.',
        category: 'PEAK_WARNING',
        severity: 'WARNING',
        resourceId: null,
      },
      {
        title: 'Underutilized Capacity in Lab 3',
        description: 'Computer Lab 3 has 58% unused capacity during peak hours. Recommend redirecting student traffic.',
        category: 'UTILIZATION',
        severity: 'INFO',
        resourceId: null,
      },
      {
        title: 'Central Library Nearing Saturation',
        description: 'Central Library is predicted to exceed 85% occupancy by 2:00 PM. Recommend Study Rooms A & B.',
        category: 'RECOMMENDATION',
        severity: 'WARNING',
        resourceId: libraryResource?.id,
      },
      {
        title: 'Energy Optimization Opportunity',
        description: 'Dr. Kalam Seminar Hall has 25% occupancy with full HVAC load. Dynamic zoning can save 34% energy.',
        category: 'ANOMALY',
        severity: 'INFO',
        resourceId: null,
      },
    ],
  });

  console.log('✅ Seeded Bookings, Notifications, and AI Insights.');
  console.log('✨ CampusPulse AI database seeding completed successfully!');
}

// Run directly
if (require.main === module || import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .catch((e) => {
      console.error('❌ Seeding error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

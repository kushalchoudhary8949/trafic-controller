import { Direction, TrafficProcess, VehicleType } from '../types/process';

export const DIRECTIONS: Direction[] = ['North', 'South', 'East', 'West'];

export function getDefaultBurstAndPriority(vehicleType: VehicleType): {
  burstTime: number;
  priority: number;
  isEmergency: boolean;
} {
  switch (vehicleType) {
    case 'Ambulance':
      return { burstTime: 3, priority: 1, isEmergency: true };
    case 'Fire Engine':
      return { burstTime: 4, priority: 1, isEmergency: true };
    case 'Police Vehicle':
      return { burstTime: 3, priority: 2, isEmergency: false };
    case 'Normal Vehicle':
      return { burstTime: 4, priority: 3, isEmergency: false };
    case 'Heavy Vehicle':
      return { burstTime: 6, priority: 4, isEmergency: false };
    case 'Pedestrian':
      return { burstTime: 3, priority: 5, isEmergency: false };
  }
}

export function createTrafficProcess(params: {
  pidNumber: number;
  vehicleType: VehicleType;
  direction: Direction;
  arrivalTime: number;
  burstTime?: number;
  priority?: number;
  label?: string;
}): TrafficProcess {
  const defaults = getDefaultBurstAndPriority(params.vehicleType);
  const priority = params.priority ?? defaults.priority;
  const burstTime = params.burstTime ?? defaults.burstTime;

  return {
    pid: `P${params.pidNumber}`,
    vehicleType: params.vehicleType,
    direction: params.direction,
    arrivalTime: params.arrivalTime,
    burstTime,
    remainingTime: burstTime,
    initialPriority: priority,
    priority,
    waitingTime: 0,
    turnaroundTime: 0,
    completionTime: null,
    startTime: null,
    state: 'New',
    isEmergency: defaults.isEmergency,
    agingBoosts: 0,
    emergencyCountBefore: 0,
    quantumUsed: 0,
    label: params.label ?? params.vehicleType,
  };
}

/**
 * Exact Default Dataset from the Operating Systems Case Study (Section 7):
 * | P1 | Normal Vehicle | 0 | 5 | 3 |
 * | P2 | Normal Vehicle | 1 | 3 | 2 |
 * | P3 | Heavy Traffic  | 2 | 8 | 4 |
 * | P4 | Ambulance      | 3 | 2 | 1 |
 * | P5 | Pedestrian     | 4 | 4 | 5 |
 * | P6 | Normal Vehicle | 5 | 3 | 3 |
 * | P7 | Fire Engine    | 6 | 6 | 2 |
 * | P8 | Normal Vehicle | 7 | 2 | 4 |
 */
export function createCaseStudyDataset(): TrafficProcess[] {
  const rows: Array<{
    pidNumber: number;
    vehicleType: VehicleType;
    label: string;
    direction: Direction;
    arrivalTime: number;
    burstTime: number;
    priority: number;
  }> = [
    {
      pidNumber: 1,
      vehicleType: 'Normal Vehicle',
      label: 'Normal Vehicle',
      direction: 'North',
      arrivalTime: 0,
      burstTime: 5,
      priority: 3,
    },
    {
      pidNumber: 2,
      vehicleType: 'Normal Vehicle',
      label: 'Normal Vehicle',
      direction: 'East',
      arrivalTime: 1,
      burstTime: 3,
      priority: 2,
    },
    {
      pidNumber: 3,
      vehicleType: 'Heavy Vehicle',
      label: 'Heavy Traffic',
      direction: 'South',
      arrivalTime: 2,
      burstTime: 8,
      priority: 4,
    },
    {
      pidNumber: 4,
      vehicleType: 'Ambulance',
      label: 'Ambulance',
      direction: 'West',
      arrivalTime: 3,
      burstTime: 2,
      priority: 1,
    },
    {
      pidNumber: 5,
      vehicleType: 'Pedestrian',
      label: 'Pedestrian',
      direction: 'North',
      arrivalTime: 4,
      burstTime: 4,
      priority: 5,
    },
    {
      pidNumber: 6,
      vehicleType: 'Normal Vehicle',
      label: 'Normal Vehicle',
      direction: 'South',
      arrivalTime: 5,
      burstTime: 3,
      priority: 3,
    },
    {
      pidNumber: 7,
      vehicleType: 'Fire Engine',
      label: 'Fire Engine',
      direction: 'East',
      arrivalTime: 6,
      burstTime: 6,
      priority: 2,
    },
    {
      pidNumber: 8,
      vehicleType: 'Normal Vehicle',
      label: 'Normal Vehicle',
      direction: 'West',
      arrivalTime: 7,
      burstTime: 2,
      priority: 4,
    },
  ];

  return rows.map((r) => createTrafficProcess(r));
}

export function generateRandomVehicleProcess(
  pidNumber: number,
  arrivalTime: number,
  seedOffset = 0
): TrafficProcess {
  // Deterministic-friendly pseudo-random selection using Math.random at spawn time
  const r = Math.random();
  let vehicleType: VehicleType = 'Normal Vehicle';
  if (r < 0.48) vehicleType = 'Normal Vehicle';
  else if (r < 0.7) vehicleType = 'Heavy Vehicle';
  else if (r < 0.82) vehicleType = 'Police Vehicle';
  else if (r < 0.9) vehicleType = 'Pedestrian';
  else if (r < 0.96) vehicleType = 'Ambulance';
  else vehicleType = 'Fire Engine';

  const direction = DIRECTIONS[(pidNumber + seedOffset + Math.floor(Math.random() * 4)) % 4];
  const base = getDefaultBurstAndPriority(vehicleType);
  const burstJitter = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
  const burstTime = Math.max(2, base.burstTime + burstJitter);

  return createTrafficProcess({
    pidNumber,
    vehicleType,
    direction,
    arrivalTime,
    burstTime,
    priority: base.priority,
  });
}

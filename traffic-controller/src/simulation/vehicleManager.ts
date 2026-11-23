import { Direction, TrafficProcess, VehicleType } from '../types/process';
import { IntersectionSignals, SimVehicle } from '../types/vehicle';

export const STOP_LINE_DIST = 285;
export const INTERSECTION_ENTER_DIST = 305;
export const INTERSECTION_EXIT_DIST = 505;
export const DESPAWN_DIST = 860;
export const MIN_FOLLOW_GAP = 18;

export function getVehicleDimensions(vehicleType: VehicleType): {
  length: number;
  width: number;
  maxSpeed: number;
} {
  switch (vehicleType) {
    case 'Heavy Vehicle':
      return { length: 58, width: 26, maxSpeed: 135 };
    case 'Fire Engine':
      return { length: 54, width: 25, maxSpeed: 195 };
    case 'Ambulance':
      return { length: 44, width: 22, maxSpeed: 210 };
    case 'Police Vehicle':
      return { length: 38, width: 21, maxSpeed: 190 };
    case 'Normal Vehicle':
      return { length: 36, width: 20, maxSpeed: 165 };
    case 'Pedestrian':
      return { length: 16, width: 16, maxSpeed: 80 };
  }
}

export function createSimVehicleFromProcess(
  proc: TrafficProcess,
  existingVehicles: SimVehicle[]
): SimVehicle {
  const dims = getVehicleDimensions(proc.vehicleType);
  const sameLane = existingVehicles.filter(
    (v) => v.direction === proc.direction && v.vehicleType !== 'Pedestrian'
  );
  // Spawn cleanly behind the furthest-back vehicle in the same lane
  const minExistingDist = sameLane.reduce(
    (min, v) => Math.min(min, v.distanceAlongLane - v.length - MIN_FOLLOW_GAP),
    40
  );
  const spawnDist = Math.min(40, minExistingDist);

  return {
    pid: proc.pid,
    vehicleType: proc.vehicleType,
    direction: proc.direction,
    state: proc.state,
    isEmergency: proc.isEmergency,
    priority: proc.priority,
    distanceAlongLane: spawnDist,
    targetStopDistance: STOP_LINE_DIST,
    speed: 0,
    maxSpeed: dims.maxSpeed,
    length: dims.length,
    width: dims.width,
    laneOffset: 0,
    clearedIntersection: false,
    inIntersection: false,
  };
}

/**
 * Updates vehicle kinematics deterministically for a simulation delta time `dt` (in seconds).
 * Enforces:
 * 1. Strict non-overlapping queueing behind stop lines and ahead vehicles.
 * 2. Stopping at RED / YELLOW signals before the stop line.
 * 3. Crossing cleanly when GREEN (or when already inside the intersection box).
 * 4. Emergency shoulder passing offset when an emergency vehicle is Running behind queued cars.
 */
export function updateVehicleKinematics(
  vehicles: SimVehicle[],
  processes: TrafficProcess[],
  signals: IntersectionSignals,
  runningPid: string | null,
  dt: number
): SimVehicle[] {
  const procMap = new Map(processes.map((p) => [p.pid, p]));

  // Sync vehicle state and priority from process table
  const synced = vehicles.map((v) => {
    const proc = procMap.get(v.pid);
    if (!proc) return v;
    return {
      ...v,
      state: proc.state,
      priority: proc.priority,
    };
  });

  const directions: Direction[] = ['North', 'South', 'East', 'West'];
  const updatedByPid = new Map<string, SimVehicle>();

  for (const dir of directions) {
    const laneSignal = signals[dir];
    const laneVehicles = synced
      .filter((v) => v.direction === dir && v.vehicleType !== 'Pedestrian')
      .sort((a, b) => b.distanceAlongLane - a.distanceAlongLane); // Front-most first

    for (let i = 0; i < laneVehicles.length; i++) {
      const v = laneVehicles[i];
      const isRunningProcess = v.pid === runningPid;
      const isCompleted = v.state === 'Completed';
      const alreadyPastStopLine =
        v.distanceAlongLane + v.length / 2 > STOP_LINE_DIST + 4;

      // Lateral emergency passing offset if an emergency vehicle is running behind queued normal cars
      let targetLaneOffset = 0;
      if (v.isEmergency && isRunningProcess && !alreadyPastStopLine) {
        const blockedAhead = laneVehicles
          .slice(0, i)
          .some((ahead) => !ahead.isEmergency && ahead.distanceAlongLane <= STOP_LINE_DIST + 10);
        if (blockedAhead) {
          targetLaneOffset = -22; // Pull into inner emergency passing corridor
        }
      }

      const nextOffset =
        v.laneOffset + (targetLaneOffset - v.laneOffset) * Math.min(1, dt * 6);

      // Determine leader ahead in the same corridor (center-to-center using half-lengths)
      let leaderFrontLimit = Number.POSITIVE_INFINITY;
      for (let j = 0; j < i; j++) {
        const ahead = laneVehicles[j];
        // Ignore vehicles in a different lateral corridor (emergency passing)
        if (Math.abs(ahead.laneOffset - nextOffset) > 14) continue;
        const limit =
          ahead.distanceAlongLane -
          ahead.length / 2 -
          MIN_FOLLOW_GAP -
          v.length / 2;
        if (limit < leaderFrontLimit) {
          leaderFrontLimit = limit;
        }
      }

      // Determine signal stop limit (keep front bumper behind STOP_LINE_DIST)
      const bumperAtStopLine = STOP_LINE_DIST - v.length / 2;
      const canGoThrough =
        alreadyPastStopLine ||
        isCompleted ||
        (laneSignal === 'GREEN' && (isRunningProcess || v.isEmergency || laneVehicles[0]?.pid === v.pid));

      const stopLimit = canGoThrough ? DESPAWN_DIST : bumperAtStopLine;
      const effectiveLimit = Math.min(stopLimit, leaderFrontLimit);

      const distanceToLimit = effectiveLimit - v.distanceAlongLane;
      let nextSpeed = v.speed;

      if (distanceToLimit <= 0.5) {
        nextSpeed = 0;
      } else if (distanceToLimit < 45 && !canGoThrough) {
        // Smooth deceleration toward stop line / queue tail
        const desiredSpeed = Math.max(0, (distanceToLimit / 45) * v.maxSpeed);
        nextSpeed = Math.min(v.maxSpeed, desiredSpeed);
      } else if (distanceToLimit < 32 && leaderFrontLimit < stopLimit) {
        const desiredSpeed = Math.max(0, (distanceToLimit / 32) * v.maxSpeed);
        nextSpeed = Math.min(v.maxSpeed, desiredSpeed);
      } else {
        // Accelerate smoothly up to maxSpeed
        const accel = v.isEmergency ? 360 : 240;
        nextSpeed = Math.min(v.maxSpeed, v.speed + accel * dt);
      }

      let nextDist = v.distanceAlongLane + nextSpeed * dt;
      if (nextDist > effectiveLimit) {
        nextDist = effectiveLimit;
        nextSpeed = 0;
      }

      // If process is actively running and signal is green, ensure it progresses across intersection
      const inIntersection =
        nextDist >= INTERSECTION_ENTER_DIST && nextDist <= INTERSECTION_EXIT_DIST;
      const clearedIntersection = nextDist > INTERSECTION_EXIT_DIST;

      updatedByPid.set(v.pid, {
        ...v,
        distanceAlongLane: nextDist,
        speed: nextSpeed,
        laneOffset: nextOffset,
        inIntersection,
        clearedIntersection,
      });
    }
  }

  // Also preserve Pedestrians (animated along crosswalk during Pedestrian Walk phase)
  const pedestrians = synced.filter((v) => v.vehicleType === 'Pedestrian');
  for (const ped of pedestrians) {
    const isWalking =
      ped.state === 'Running' && signals.pedestrianWalk;
    const isDone = ped.state === 'Completed';
    let nextDist = ped.distanceAlongLane;
    let nextSpeed = 0;
    if (isWalking) {
      nextSpeed = ped.maxSpeed;
      nextDist = Math.min(DESPAWN_DIST, ped.distanceAlongLane + nextSpeed * dt);
    } else if (isDone) {
      nextSpeed = ped.maxSpeed;
      nextDist = Math.min(DESPAWN_DIST, ped.distanceAlongLane + nextSpeed * dt);
    } else {
      nextDist = Math.min(STOP_LINE_DIST - 10, ped.distanceAlongLane + 60 * dt);
    }
    updatedByPid.set(ped.pid, {
      ...ped,
      distanceAlongLane: nextDist,
      speed: nextSpeed,
      clearedIntersection: nextDist > INTERSECTION_EXIT_DIST,
    });
  }

  return synced
    .map((v) => updatedByPid.get(v.pid) ?? v)
    .filter((v) => !(v.state === 'Completed' && v.distanceAlongLane >= DESPAWN_DIST - 20));
}

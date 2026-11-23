import { EmergencyInterruptState, TrafficProcess } from '../types/process';
import { compareArrivalTieBreak } from './schedulerInterface';

/**
 * Finds the highest-urgency active emergency request waiting in queue or newly arrived.
 * Emergency requests are Ambulance and Fire Engine (isEmergency = true).
 */
export function findPendingEmergencyProcess(
  processes: TrafficProcess[],
  readyQueue: string[]
): TrafficProcess | null {
  const readySet = new Set(readyQueue);
  const candidates = processes.filter(
    (p) =>
      p.isEmergency &&
      p.remainingTime > 0 &&
      p.state !== 'Completed' &&
      (readySet.has(p.pid) || p.state === 'Ready' || p.state === 'Waiting')
  );

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return compareArrivalTieBreak(a, b);
  });

  return candidates[0];
}

export function createIdleEmergencyState(): EmergencyInterruptState {
  return {
    active: false,
    interruptTime: null,
    emergencyPid: null,
    emergencyType: null,
    direction: null,
    savedProcessPid: null,
    savedDirection: null,
    status: 'IDLE',
    responseTime: null,
  };
}

export function createEmergencyInterrupt(
  emergencyProc: TrafficProcess,
  currentRunning: TrafficProcess | null,
  simTime: number
): EmergencyInterruptState {
  return {
    active: true,
    interruptTime: simTime,
    emergencyPid: emergencyProc.pid,
    emergencyType: emergencyProc.vehicleType,
    direction: emergencyProc.direction,
    savedProcessPid: currentRunning ? currentRunning.pid : null,
    savedDirection: currentRunning ? currentRunning.direction : null,
    status: 'TRANSITIONING',
    responseTime: null,
  };
}

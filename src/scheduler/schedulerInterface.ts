import { TrafficProcess } from '../types/process';

export interface SchedulerSelectionContext {
  readyQueue: string[];
  processes: TrafficProcess[];
  currentTime: number;
  timeQuantum: number;
}

export interface SchedulingAlgorithm {
  readonly id: 'FCFS' | 'PRIORITY' | 'ROUND_ROBIN';
  readonly name: string;
  readonly isPreemptive: boolean;
  selectNextProcess(ctx: SchedulerSelectionContext): TrafficProcess | null;
}

export function extractPidIndex(pid: string): number {
  const num = parseInt(pid.replace(/\D+/g, ''), 10);
  return Number.isNaN(num) ? 0 : num;
}

export function compareArrivalTieBreak(a: TrafficProcess, b: TrafficProcess): number {
  if (a.arrivalTime !== b.arrivalTime) {
    return a.arrivalTime - b.arrivalTime;
  }
  return extractPidIndex(a.pid) - extractPidIndex(b.pid);
}

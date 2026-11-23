import { TrafficProcess } from '../types/process';
import {
  SchedulingAlgorithm,
  SchedulerSelectionContext,
  compareArrivalTieBreak,
} from './schedulerInterface';

/**
 * First Come First Serve (FCFS) Traffic Scheduler
 * Non-preemptive FIFO queue ordered strictly by queue arrival order.
 */
export const fcfsScheduler: SchedulingAlgorithm = {
  id: 'FCFS',
  name: 'FCFS (First Come First Serve)',
  isPreemptive: false,

  selectNextProcess({ readyQueue, processes }: SchedulerSelectionContext): TrafficProcess | null {
    if (readyQueue.length === 0) return null;

    const processMap = new Map(processes.map((p) => [p.pid, p]));
    const eligible = readyQueue
      .map((pid) => processMap.get(pid))
      .filter((p): p is TrafficProcess => Boolean(p && p.remainingTime > 0 && p.state !== 'Completed'));

    if (eligible.length === 0) return null;

    // Follow FIFO ready queue order; break simultaneous ties deterministically
    eligible.sort(compareArrivalTieBreak);
    return eligible[0];
  },
};

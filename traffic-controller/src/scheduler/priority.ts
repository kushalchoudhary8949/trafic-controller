import { TrafficProcess } from '../types/process';
import {
  SchedulingAlgorithm,
  SchedulerSelectionContext,
  compareArrivalTieBreak,
} from './schedulerInterface';

/**
 * Priority Scheduling Traffic Scheduler
 * Lower numerical priority = higher urgency (1 = highest, 5 = lowest).
 * Non-preemptive during normal execution (emergency preemption handled by EmergencyHandler).
 */
export const priorityScheduler: SchedulingAlgorithm = {
  id: 'PRIORITY',
  name: 'Priority Scheduling',
  isPreemptive: false,

  selectNextProcess({ readyQueue, processes }: SchedulerSelectionContext): TrafficProcess | null {
    if (readyQueue.length === 0) return null;

    const processMap = new Map(processes.map((p) => [p.pid, p]));
    const eligible = readyQueue
      .map((pid) => processMap.get(pid))
      .filter((p): p is TrafficProcess => Boolean(p && p.remainingTime > 0 && p.state !== 'Completed'));

    if (eligible.length === 0) return null;

    eligible.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return compareArrivalTieBreak(a, b);
    });

    return eligible[0];
  },
};

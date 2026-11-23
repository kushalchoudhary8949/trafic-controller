import { TrafficProcess } from '../types/process';
import { SchedulingAlgorithm, SchedulerSelectionContext } from './schedulerInterface';

/**
 * Round Robin (RR) Traffic Scheduler
 * Preemptive time-sliced scheduler using configurable time quantum (default 2 units).
 * Always picks the head of the circular ready queue.
 */
export const roundRobinScheduler: SchedulingAlgorithm = {
  id: 'ROUND_ROBIN',
  name: 'Round Robin (Quantum = 2)',
  isPreemptive: true,

  selectNextProcess({ readyQueue, processes }: SchedulerSelectionContext): TrafficProcess | null {
    if (readyQueue.length === 0) return null;

    const processMap = new Map(processes.map((p) => [p.pid, p]));
    for (const pid of readyQueue) {
      const proc = processMap.get(pid);
      if (proc && proc.remainingTime > 0 && proc.state !== 'Completed') {
        return proc;
      }
    }
    return null;
  },
};

export function rotateReadyQueueHead(readyQueue: string[], pid: string): string[] {
  const without = readyQueue.filter((id) => id !== pid);
  return [...without, pid];
}

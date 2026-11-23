import {
  AlgorithmType,
  GanttSlice,
  TrafficProcess,
} from '../types/process';
import { AlgorithmComparisonMetrics } from '../types/scheduler';
import { compareArrivalTieBreak } from '../scheduler/schedulerInterface';
import { fcfsScheduler } from '../scheduler/fcfs';
import { priorityScheduler } from '../scheduler/priority';
import { roundRobinScheduler, rotateReadyQueueHead } from '../scheduler/roundRobin';

export function calculateTurnaroundTime(
  completionTime: number,
  arrivalTime: number
): number {
  return Math.max(0, completionTime - arrivalTime);
}

export function calculateWaitingTime(
  turnaroundTime: number,
  burstTime: number
): number {
  return Math.max(0, turnaroundTime - burstTime);
}

export function calculateSummaryMetrics(processes: TrafficProcess[]) {
  const completed = processes.filter((p) => p.completionTime !== null);
  const count = completed.length;

  if (count === 0) {
    return {
      averageWaitingTime: 0,
      averageTurnaroundTime: 0,
      totalWaitingTime: 0,
      totalTurnaroundTime: 0,
      completedCount: 0,
    };
  }

  let totalWaitingTime = 0;
  let totalTurnaroundTime = 0;

  for (const p of completed) {
    const tat = calculateTurnaroundTime(p.completionTime!, p.arrivalTime);
    const wt = calculateWaitingTime(tat, p.burstTime);
    totalTurnaroundTime += tat;
    totalWaitingTime += wt;
  }

  return {
    averageWaitingTime: totalWaitingTime / count,
    averageTurnaroundTime: totalTurnaroundTime / count,
    totalWaitingTime,
    totalTurnaroundTime,
    completedCount: count,
  };
}

/**
 * Pure deterministic discrete-time OS scheduler simulator for analytical comparison
 * across FCFS, Priority Scheduling, and Round Robin (default quantum = 2) on any dataset.
 * Uses the exact same scheduler modules and mathematical formulas:
 *   Turnaround Time = Completion Time - Arrival Time
 *   Waiting Time = Turnaround Time - Burst Time
 */
export function simulateAlgorithmBatch(
  sourceProcesses: TrafficProcess[],
  algorithm: AlgorithmType,
  timeQuantum = 2
): AlgorithmComparisonMetrics {
  const labelMap: Record<AlgorithmType, string> = {
    FCFS: 'FCFS (First Come First Serve)',
    PRIORITY: 'Priority Scheduling',
    ROUND_ROBIN: `Round Robin (q=${timeQuantum})`,
  };

  if (sourceProcesses.length === 0) {
    return {
      algorithm,
      label: labelMap[algorithm],
      averageWaitingTime: 0,
      averageTurnaroundTime: 0,
      throughput: 0,
      totalCompletionTime: 0,
      completedCount: 0,
      gantt: [],
      processes: [],
    };
  }

  // Clone processes cleanly for pure evaluation
  const procs: TrafficProcess[] = sourceProcesses
    .map((p) => ({
      ...p,
      remainingTime: p.burstTime,
      priority: p.initialPriority,
      waitingTime: 0,
      turnaroundTime: 0,
      completionTime: null,
      startTime: null,
      state: 'New' as const,
      quantumUsed: 0,
    }))
    .sort(compareArrivalTieBreak);

  const gantt: GanttSlice[] = [];
  let readyQueue: string[] = [];
  let runningPid: string | null = null;
  let quantumUsed = 0;
  let time = 0;
  let completedCount = 0;
  const totalCount = procs.length;
  const maxSafeTicks = procs.reduce((acc, p) => acc + p.burstTime, 0) + 500;

  const enqueueArrivals = (t: number) => {
    for (const p of procs) {
      if (p.arrivalTime <= t && p.state === 'New') {
        p.state = 'Ready';
        readyQueue.push(p.pid);
      }
    }
  };

  while (completedCount < totalCount && time < maxSafeTicks) {
    enqueueArrivals(time);

    // Select process if CPU / intersection is idle
    if (!runningPid) {
      let chosen: TrafficProcess | null = null;
      const ctx = { readyQueue, processes: procs, currentTime: time, timeQuantum };

      if (algorithm === 'FCFS') {
        chosen = fcfsScheduler.selectNextProcess(ctx);
      } else if (algorithm === 'PRIORITY') {
        chosen = priorityScheduler.selectNextProcess(ctx);
      } else {
        chosen = roundRobinScheduler.selectNextProcess(ctx);
      }

      if (chosen) {
        runningPid = chosen.pid;
        chosen.state = 'Running';
        if (chosen.startTime === null) {
          chosen.startTime = time;
        }
        quantumUsed = 0;
      }
    }

    if (!runningPid) {
      // Idle until next arrival
      time += 1;
      continue;
    }

    const runningProc = procs.find((p) => p.pid === runningPid)!;

    // Execute 1 simulation unit [time, time + 1]
    const lastSlice = gantt[gantt.length - 1];
    if (lastSlice && lastSlice.pid === runningProc.pid && lastSlice.endTime === time) {
      lastSlice.endTime = time + 1;
    } else {
      gantt.push({
        id: `${algorithm}-${runningProc.pid}-${time}`,
        pid: runningProc.pid,
        vehicleType: runningProc.vehicleType,
        direction: runningProc.direction,
        startTime: time,
        endTime: time + 1,
        isEmergency: runningProc.isEmergency,
        algorithm,
      });
    }

    runningProc.remainingTime -= 1;
    quantumUsed += 1;
    time += 1;

    // Enqueue any processes that arrived at the new tick before RR rotation
    enqueueArrivals(time);

    if (runningProc.remainingTime <= 0) {
      runningProc.remainingTime = 0;
      runningProc.state = 'Completed';
      runningProc.completionTime = time;
      runningProc.turnaroundTime = calculateTurnaroundTime(
        time,
        runningProc.arrivalTime
      );
      runningProc.waitingTime = calculateWaitingTime(
        runningProc.turnaroundTime,
        runningProc.burstTime
      );
      readyQueue = readyQueue.filter((id) => id !== runningProc.pid);
      runningPid = null;
      quantumUsed = 0;
      completedCount += 1;
    } else if (algorithm === 'ROUND_ROBIN' && quantumUsed >= timeQuantum) {
      runningProc.state = 'Ready';
      readyQueue = rotateReadyQueueHead(readyQueue, runningProc.pid);
      runningPid = null;
      quantumUsed = 0;
    }
  }

  const summary = calculateSummaryMetrics(procs);
  const totalSpan = gantt.length > 0 ? gantt[gantt.length - 1].endTime : 0;

  return {
    algorithm,
    label: labelMap[algorithm],
    averageWaitingTime: Number(summary.averageWaitingTime.toFixed(2)),
    averageTurnaroundTime: Number(summary.averageTurnaroundTime.toFixed(2)),
    throughput: totalSpan > 0 ? Number((completedCount / totalSpan).toFixed(3)) : 0,
    totalCompletionTime: totalSpan,
    completedCount,
    gantt,
    processes: procs,
  };
}

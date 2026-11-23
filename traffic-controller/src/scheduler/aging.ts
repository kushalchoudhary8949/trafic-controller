import { AgingConfig, TrafficProcess } from '../types/process';

export interface AgingUpdateResult {
  updatedProcesses: TrafficProcess[];
  agedEvents: Array<{
    pid: string;
    oldPriority: number;
    newPriority: number;
    waitingTime: number;
  }>;
}

/**
 * Dynamic Aging Mechanism
 * Example progression (interval = 5):
 *   Initial priority = 5
 *   After 5 waiting units -> priority 4
 *   After 10 waiting units -> priority 3
 *   After 15 waiting units -> priority 2
 *   After 20 waiting units -> priority 1
 */
export function computeAgedPriority(
  initialPriority: number,
  waitingTime: number,
  config: AgingConfig
): number {
  if (!config.enabled || config.intervalUnits <= 0) {
    return initialPriority;
  }
  const boosts = Math.floor(waitingTime / config.intervalUnits);
  return Math.max(config.minPriority, initialPriority - boosts);
}

export function applyAgingToProcesses(
  processes: TrafficProcess[],
  config: AgingConfig
): AgingUpdateResult {
  if (!config.enabled) {
    return { updatedProcesses: processes, agedEvents: [] };
  }

  const agedEvents: AgingUpdateResult['agedEvents'] = [];

  const updatedProcesses = processes.map((proc) => {
    // Only age non-completed, non-emergency processes currently waiting in Ready/Waiting state
    if (
      proc.isEmergency ||
      proc.state === 'Completed' ||
      proc.state === 'New' ||
      proc.state === 'Running'
    ) {
      return proc;
    }

    const targetPriority = computeAgedPriority(
      proc.initialPriority,
      proc.waitingTime,
      config
    );

    if (targetPriority < proc.priority) {
      agedEvents.push({
        pid: proc.pid,
        oldPriority: proc.priority,
        newPriority: targetPriority,
        waitingTime: proc.waitingTime,
      });
      return {
        ...proc,
        priority: targetPriority,
        agingBoosts: proc.initialPriority - targetPriority,
      };
    }

    return proc;
  });

  return { updatedProcesses, agedEvents };
}

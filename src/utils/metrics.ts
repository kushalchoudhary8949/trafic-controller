import { SimulationState, StarvationStats } from '../types/scheduler';
import { calculateSummaryMetrics } from './calculations';

export interface LiveSystemMetrics {
  totalVehicles: number;
  vehiclesWaiting: number;
  vehiclesServed: number;
  emergencyVehiclesCount: number;
  averageWaitingTime: number;
  averageTurnaroundTime: number;
  averageQueueLength: number;
  emergencyResponseTime: number;
  throughput: number;
}

export function computeLiveSystemMetrics(state: SimulationState): LiveSystemMetrics {
  const { processes, simTime, queueLengthSamples, emergencyResponseTimes } = state;

  const totalVehicles = processes.length;
  const completed = processes.filter((p) => p.state === 'Completed');
  const waiting = processes.filter(
    (p) => p.state === 'Ready' || p.state === 'Waiting'
  );
  const emergencyVehiclesCount = processes.filter((p) => p.isEmergency).length;

  // For live average waiting time, include current waiting times of active + completed processes
  // once processes have entered the system (not 'New')
  const activeOrDone = processes.filter((p) => p.state !== 'New');
  const completedMetrics = calculateSummaryMetrics(processes);

  const liveAvgWaiting =
    completed.length > 0
      ? completedMetrics.averageWaitingTime
      : activeOrDone.length > 0
      ? activeOrDone.reduce((acc, p) => acc + p.waitingTime, 0) / activeOrDone.length
      : 0;

  const avgQueueLength =
    queueLengthSamples.length > 0
      ? queueLengthSamples.reduce((a, b) => a + b, 0) / queueLengthSamples.length
      : waiting.length;

  const avgEmergencyResponse =
    emergencyResponseTimes.length > 0
      ? emergencyResponseTimes.reduce((a, b) => a + b, 0) / emergencyResponseTimes.length
      : 0;

  const throughput = simTime > 0 ? completed.length / simTime : 0;

  return {
    totalVehicles,
    vehiclesWaiting: waiting.length,
    vehiclesServed: completed.length,
    emergencyVehiclesCount,
    averageWaitingTime: Number(liveAvgWaiting.toFixed(2)),
    averageTurnaroundTime: Number(completedMetrics.averageTurnaroundTime.toFixed(2)),
    averageQueueLength: Number(avgQueueLength.toFixed(2)),
    emergencyResponseTime: Number(avgEmergencyResponse.toFixed(2)),
    throughput: Number(throughput.toFixed(3)),
  };
}

export function computeStarvationStats(state: SimulationState): StarvationStats {
  const threshold = state.config.starvationThreshold;
  const waitingNormals = state.processes.filter(
    (p) => !p.isEmergency && (p.state === 'Ready' || p.state === 'Waiting')
  );

  const starvingProcesses = waitingNormals
    .filter((p) => p.waitingTime >= threshold)
    .sort((a, b) => b.waitingTime - a.waitingTime);

  const maxWaitingTime = waitingNormals.reduce(
    (max, p) => Math.max(max, p.waitingTime),
    0
  );

  return {
    starvingProcesses:
      starvingProcesses.length > 0
        ? starvingProcesses
        : [...waitingNormals].sort((a, b) => b.waitingTime - a.waitingTime).slice(0, 3),
    maxWaitingTime,
    totalEmergenciesServed: state.emergenciesServedCount,
    hasStarvationWarning: starvingProcesses.length > 0 && !state.config.aging.enabled,
  };
}

import {
  AgingConfig,
  AlgorithmType,
  Direction,
  EmergencyInterruptState,
  EventLogEntry,
  GanttSlice,
  TrafficProcess,
} from './process';
import { SignalControllerState, SimVehicle } from './vehicle';

export interface SimulationConfig {
  algorithm: AlgorithmType;
  speedMultiplier: 1 | 2 | 5;
  timeQuantum: number; // Default 2 for Round Robin
  aging: AgingConfig;
  autoGenerateTraffic: boolean;
  autoGenerateInterval: number; // Simulation units between random arrivals
  yellowDuration: number; // Safe transition yellow interval (sim units)
  allRedDuration: number; // Safe all-red clearance interval (sim units)
  starvationThreshold: number; // Waiting units before warning fires
}

export interface StarvationStats {
  starvingProcesses: TrafficProcess[];
  maxWaitingTime: number;
  totalEmergenciesServed: number;
  hasStarvationWarning: boolean;
}

export interface AlgorithmComparisonMetrics {
  algorithm: AlgorithmType;
  label: string;
  averageWaitingTime: number;
  averageTurnaroundTime: number;
  throughput: number;
  totalCompletionTime: number;
  completedCount: number;
  gantt: GanttSlice[];
  processes: TrafficProcess[];
}

export interface SimulationState {
  simTime: number; // Continuous simulation clock
  currentTick: number; // Discrete integer tick
  running: boolean;
  hasStarted: boolean;
  processes: TrafficProcess[];
  readyQueue: string[]; // Ordered PIDs in ready queue
  runningPid: string | null;
  vehicles: SimVehicle[];
  signalState: SignalControllerState;
  ganttSlices: GanttSlice[];
  logs: EventLogEntry[];
  emergency: EmergencyInterruptState;
  config: SimulationConfig;
  nextPidNumber: number;
  lastAutoSpawnTick: number;
  emergenciesServedCount: number;
  emergencyResponseTimes: number[];
  queueLengthSamples: number[];
  starvationModeActive: boolean;
  lastStarvationSpawnTick: number;
}

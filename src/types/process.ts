export type Direction = 'North' | 'South' | 'East' | 'West';

export type VehicleType =
  | 'Normal Vehicle'
  | 'Heavy Vehicle'
  | 'Ambulance'
  | 'Fire Engine'
  | 'Police Vehicle'
  | 'Pedestrian';

export type ProcessState = 'New' | 'Ready' | 'Running' | 'Waiting' | 'Completed';

export type AlgorithmType = 'FCFS' | 'PRIORITY' | 'ROUND_ROBIN';

export interface TrafficProcess {
  pid: string;
  vehicleType: VehicleType;
  direction: Direction;
  arrivalTime: number;
  burstTime: number;
  remainingTime: number;
  initialPriority: number;
  priority: number; // Dynamic effective priority (lower = higher priority)
  waitingTime: number;
  turnaroundTime: number;
  completionTime: number | null;
  startTime: number | null;
  state: ProcessState;
  isEmergency: boolean;
  agingBoosts: number;
  emergencyCountBefore: number;
  quantumUsed: number;
  label: string;
}

export interface GanttSlice {
  id: string;
  pid: string;
  vehicleType: VehicleType;
  direction: Direction;
  startTime: number;
  endTime: number;
  isEmergency: boolean;
  algorithm: AlgorithmType;
}

export type LogCategory =
  | 'ARRIVAL'
  | 'SCHEDULER'
  | 'SIGNAL'
  | 'INTERRUPT'
  | 'AGING'
  | 'SYSTEM';

export interface EventLogEntry {
  id: string;
  simTime: number;
  timestampLabel: string;
  category: LogCategory;
  message: string;
  pid?: string;
}

export interface EmergencyInterruptState {
  active: boolean;
  interruptTime: number | null;
  emergencyPid: string | null;
  emergencyType: VehicleType | null;
  direction: Direction | null;
  savedProcessPid: string | null;
  savedDirection: Direction | null;
  status: 'IDLE' | 'TRANSITIONING' | 'ACTIVE_PREEMPTION' | 'RESTORING';
  responseTime: number | null;
}

export interface AgingConfig {
  enabled: boolean;
  intervalUnits: number; // Default 5 simulation units per priority boost
  minPriority: number; // Highest priority cap for aged normal processes (1)
}

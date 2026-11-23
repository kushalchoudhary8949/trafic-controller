import { Direction, ProcessState, VehicleType } from './process';

export type SignalColor = 'RED' | 'YELLOW' | 'GREEN';

export interface IntersectionSignals {
  North: SignalColor;
  South: SignalColor;
  East: SignalColor;
  West: SignalColor;
  pedestrianWalk: boolean;
}

export type SignalPhaseMode =
  | 'IDLE_ALL_RED'
  | 'NORMAL_GREEN'
  | 'PEDESTRIAN_WALK'
  | 'EMERGENCY_GREEN'
  | 'YELLOW_CLEARANCE'
  | 'ALL_RED_CLEARANCE';

export interface SignalControllerState {
  signals: IntersectionSignals;
  phaseMode: SignalPhaseMode;
  activeDirection: Direction | 'PEDESTRIAN' | null;
  pendingDirection: Direction | 'PEDESTRIAN' | null;
  pendingIsEmergency: boolean;
  transitionTimer: number;
  yellowDuration: number;
  allRedDuration: number;
}

export interface SimVehicle {
  pid: string;
  vehicleType: VehicleType;
  direction: Direction;
  state: ProcessState;
  isEmergency: boolean;
  priority: number;
  /**
   * 1D progress along lane axis in world coordinates (0..800 canvas units):
   * - Approaches spawn around -80 to -30 behind queue
   * - Stop line is at 290 (from spawn side)
   * - Intersection center is 400
   * - Exit is > 840
   */
  distanceAlongLane: number;
  targetStopDistance: number;
  speed: number;
  maxSpeed: number;
  length: number;
  width: number;
  laneOffset: number; // Lateral shift for emergency shoulder passing
  clearedIntersection: boolean;
  inIntersection: boolean;
}

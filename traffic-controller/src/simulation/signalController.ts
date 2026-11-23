import { Direction } from '../types/process';
import {
  IntersectionSignals,
  SignalColor,
  SignalControllerState,
} from '../types/vehicle';

export function createInitialSignalState(
  yellowDuration = 1.0,
  allRedDuration = 0.8
): SignalControllerState {
  return {
    signals: {
      North: 'RED',
      South: 'RED',
      East: 'RED',
      West: 'RED',
      pedestrianWalk: false,
    },
    phaseMode: 'IDLE_ALL_RED',
    activeDirection: null,
    pendingDirection: null,
    pendingIsEmergency: false,
    transitionTimer: 0,
    yellowDuration,
    allRedDuration,
  };
}

function buildSignalsForActive(
  dir: Direction | 'PEDESTRIAN' | null,
  color: SignalColor
): IntersectionSignals {
  if (!dir || dir === 'PEDESTRIAN') {
    return {
      North: 'RED',
      South: 'RED',
      East: 'RED',
      West: 'RED',
      pedestrianWalk: dir === 'PEDESTRIAN' && color === 'GREEN',
    };
  }
  return {
    North: dir === 'North' ? color : 'RED',
    South: dir === 'South' ? color : 'RED',
    East: dir === 'East' ? color : 'RED',
    West: dir === 'West' ? color : 'RED',
    pedestrianWalk: false,
  };
}

/**
 * Safety Invariant Check (Test 8):
 * Ensures North/South never have GREEN or YELLOW simultaneously with East/West,
 * and never allows two non-identical conflicting directions to hold GREEN simultaneously.
 */
export function areSignalsSafe(signals: IntersectionSignals): boolean {
  const nsActive = signals.North !== 'RED' || signals.South !== 'RED';
  const ewActive = signals.East !== 'RED' || signals.West !== 'RED';
  if (nsActive && ewActive) return false;
  if (signals.pedestrianWalk && (nsActive || ewActive)) return false;

  const greenCount = (['North', 'South', 'East', 'West'] as Direction[]).filter(
    (d) => signals[d] === 'GREEN'
  ).length;
  if (greenCount > 1) return false;

  return true;
}

export interface SignalTransitionResult {
  nextState: SignalControllerState;
  events: string[];
  becameGreenFor: Direction | 'PEDESTRIAN' | null;
}

/**
 * Requests a target direction (or 'PEDESTRIAN') to hold the intersection GREEN phase.
 * Never switches directly between conflicting green directions; enforces YELLOW -> ALL_RED -> GREEN.
 */
export function requestSignalPhase(
  current: SignalControllerState,
  targetDirection: Direction | 'PEDESTRIAN' | null,
  isEmergency: boolean
): SignalTransitionResult {
  const events: string[] = [];

  // No target: safely transition to IDLE_ALL_RED
  if (!targetDirection) {
    if (
      current.phaseMode === 'NORMAL_GREEN' ||
      current.phaseMode === 'EMERGENCY_GREEN'
    ) {
      return {
        nextState: {
          ...current,
          signals: buildSignalsForActive(current.activeDirection, 'YELLOW'),
          phaseMode: 'YELLOW_CLEARANCE',
          pendingDirection: null,
          pendingIsEmergency: false,
          transitionTimer: current.yellowDuration,
        },
        events: ['Current green phase entering YELLOW clearance.'],
        becameGreenFor: null,
      };
    }
    if (current.phaseMode === 'PEDESTRIAN_WALK') {
      return {
        nextState: {
          ...current,
          signals: buildSignalsForActive(null, 'RED'),
          phaseMode: 'ALL_RED_CLEARANCE',
          activeDirection: null,
          pendingDirection: null,
          pendingIsEmergency: false,
          transitionTimer: current.allRedDuration,
        },
        events: ['Pedestrian crossing ending; entering ALL-RED clearance.'],
        becameGreenFor: null,
      };
    }
    return {
      nextState: { ...current, pendingDirection: null, pendingIsEmergency: false },
      events,
      becameGreenFor: null,
    };
  }

  // Already active on the exact requested direction
  if (
    current.activeDirection === targetDirection &&
    (current.phaseMode === 'NORMAL_GREEN' ||
      current.phaseMode === 'EMERGENCY_GREEN' ||
      current.phaseMode === 'PEDESTRIAN_WALK')
  ) {
    const targetMode =
      targetDirection === 'PEDESTRIAN'
        ? 'PEDESTRIAN_WALK'
        : isEmergency
        ? 'EMERGENCY_GREEN'
        : 'NORMAL_GREEN';
    return {
      nextState: {
        ...current,
        phaseMode: targetMode,
        pendingDirection: null,
        pendingIsEmergency: isEmergency,
      },
      events,
      becameGreenFor: null,
    };
  }

  // Currently idle all-red: safe to activate immediately (or after brief clearance)
  if (current.phaseMode === 'IDLE_ALL_RED') {
    const newMode =
      targetDirection === 'PEDESTRIAN'
        ? 'PEDESTRIAN_WALK'
        : isEmergency
        ? 'EMERGENCY_GREEN'
        : 'NORMAL_GREEN';

    const label =
      targetDirection === 'PEDESTRIAN'
        ? 'Pedestrian WALK phase activated (all vehicle signals RED).'
        : isEmergency
        ? `${targetDirection} signal turned GREEN (Emergency Right-of-Way).`
        : `${targetDirection} signal turned GREEN.`;

    return {
      nextState: {
        ...current,
        signals: buildSignalsForActive(targetDirection, 'GREEN'),
        phaseMode: newMode,
        activeDirection: targetDirection,
        pendingDirection: null,
        pendingIsEmergency: false,
        transitionTimer: 0,
      },
      events: [label],
      becameGreenFor: targetDirection,
    };
  }

  // Currently in a GREEN vehicle phase for a DIFFERENT direction -> trigger YELLOW clearance
  if (
    current.phaseMode === 'NORMAL_GREEN' ||
    current.phaseMode === 'EMERGENCY_GREEN'
  ) {
    return {
      nextState: {
        ...current,
        signals: buildSignalsForActive(current.activeDirection, 'YELLOW'),
        phaseMode: 'YELLOW_CLEARANCE',
        pendingDirection: targetDirection,
        pendingIsEmergency: isEmergency,
        transitionTimer: current.yellowDuration,
      },
      events: [
        `${current.activeDirection} signal turned YELLOW for safe transition to ${targetDirection}.`,
      ],
      becameGreenFor: null,
    };
  }

  // Currently in PEDESTRIAN_WALK -> transition to ALL_RED clearance before granting vehicle GREEN
  if (current.phaseMode === 'PEDESTRIAN_WALK') {
    return {
      nextState: {
        ...current,
        signals: buildSignalsForActive(null, 'RED'),
        phaseMode: 'ALL_RED_CLEARANCE',
        activeDirection: null,
        pendingDirection: targetDirection,
        pendingIsEmergency: isEmergency,
        transitionTimer: current.allRedDuration,
      },
      events: ['Pedestrian WALK ended; ALL-RED clearance interval started.'],
      becameGreenFor: null,
    };
  }

  // Already transitioning (YELLOW_CLEARANCE or ALL_RED_CLEARANCE): update pending target
  return {
    nextState: {
      ...current,
      pendingDirection: targetDirection,
      pendingIsEmergency: isEmergency,
    },
    events,
    becameGreenFor: null,
  };
}

export function stepSignalController(
  current: SignalControllerState,
  dt: number
): SignalTransitionResult {
  const events: string[] = [];

  if (current.phaseMode === 'YELLOW_CLEARANCE') {
    const remaining = current.transitionTimer - dt;
    if (remaining <= 0) {
      events.push('All signals entered ALL-RED safety clearance.');
      return {
        nextState: {
          ...current,
          signals: buildSignalsForActive(null, 'RED'),
          phaseMode: 'ALL_RED_CLEARANCE',
          activeDirection: null,
          transitionTimer: current.allRedDuration,
        },
        events,
        becameGreenFor: null,
      };
    }
    return {
      nextState: { ...current, transitionTimer: remaining },
      events,
      becameGreenFor: null,
    };
  }

  if (current.phaseMode === 'ALL_RED_CLEARANCE') {
    const remaining = current.transitionTimer - dt;
    if (remaining <= 0) {
      if (current.pendingDirection) {
        const nextDir = current.pendingDirection;
        const isEmg = current.pendingIsEmergency;
        const newMode =
          nextDir === 'PEDESTRIAN'
            ? 'PEDESTRIAN_WALK'
            : isEmg
            ? 'EMERGENCY_GREEN'
            : 'NORMAL_GREEN';
        const label =
          nextDir === 'PEDESTRIAN'
            ? 'Pedestrian WALK phase activated.'
            : isEmg
            ? `Emergency phase activated: ${nextDir} signal turned GREEN.`
            : `${nextDir} signal turned GREEN.`;
        events.push(label);
        return {
          nextState: {
            ...current,
            signals: buildSignalsForActive(nextDir, 'GREEN'),
            phaseMode: newMode,
            activeDirection: nextDir,
            pendingDirection: null,
            pendingIsEmergency: false,
            transitionTimer: 0,
          },
          events,
          becameGreenFor: nextDir,
        };
      }

      return {
        nextState: {
          ...current,
          signals: buildSignalsForActive(null, 'RED'),
          phaseMode: 'IDLE_ALL_RED',
          activeDirection: null,
          transitionTimer: 0,
        },
        events,
        becameGreenFor: null,
      };
    }

    return {
      nextState: { ...current, transitionTimer: remaining },
      events,
      becameGreenFor: null,
    };
  }

  return {
    nextState: current,
    events,
    becameGreenFor: null,
  };
}

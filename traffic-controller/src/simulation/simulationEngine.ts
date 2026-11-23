import {
  AlgorithmType,
  Direction,
  EventLogEntry,
  GanttSlice,
  LogCategory,
  TrafficProcess,
  VehicleType,
} from '../types/process';
import { SimulationConfig, SimulationState } from '../types/scheduler';
import { fcfsScheduler } from '../scheduler/fcfs';
import { priorityScheduler } from '../scheduler/priority';
import { roundRobinScheduler, rotateReadyQueueHead } from '../scheduler/roundRobin';
import { applyAgingToProcesses } from '../scheduler/aging';
import {
  createEmergencyInterrupt,
  createIdleEmergencyState,
  findPendingEmergencyProcess,
} from '../scheduler/emergencyHandler';
import {
  createInitialSignalState,
  requestSignalPhase,
  stepSignalController,
} from './signalController';
import {
  createCaseStudyDataset,
  createTrafficProcess,
  DIRECTIONS,
  generateRandomVehicleProcess,
} from './trafficGenerator';
import {
  createSimVehicleFromProcess,
  updateVehicleKinematics,
} from './vehicleManager';
import {
  calculateTurnaroundTime,
  calculateWaitingTime,
} from '../utils/calculations';

export function formatSimTimestamp(simTime: number): string {
  const total = Math.max(0, Math.floor(simTime));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function makeLog(
  simTime: number,
  category: LogCategory,
  message: string,
  pid?: string,
  seq = 0
): EventLogEntry {
  return {
    id: `log-${Math.floor(simTime)}-${seq}-${Math.random().toString(36).slice(2, 7)}`,
    simTime: Math.floor(simTime),
    timestampLabel: formatSimTimestamp(simTime),
    category,
    message,
    pid,
  };
}

export function createDefaultConfig(): SimulationConfig {
  return {
    algorithm: 'PRIORITY',
    speedMultiplier: 1,
    timeQuantum: 2,
    aging: {
      enabled: true,
      intervalUnits: 5,
      minPriority: 1,
    },
    autoGenerateTraffic: false,
    autoGenerateInterval: 4,
    yellowDuration: 1.0,
    allRedDuration: 0.8,
    starvationThreshold: 12,
  };
}

/**
 * Creates a live initial intersection with 4 vehicles approaching from N, S, E, W
 * so the first screen is immediately active and demonstrable.
 */
export function createInitialSimulationState(): SimulationState {
  const config = createDefaultConfig();
  const initialProcesses: TrafficProcess[] = [
    createTrafficProcess({
      pidNumber: 1,
      vehicleType: 'Normal Vehicle',
      direction: 'North',
      arrivalTime: 0,
      burstTime: 4,
      priority: 3,
    }),
    createTrafficProcess({
      pidNumber: 2,
      vehicleType: 'Heavy Vehicle',
      direction: 'East',
      arrivalTime: 0,
      burstTime: 5,
      priority: 4,
    }),
    createTrafficProcess({
      pidNumber: 3,
      vehicleType: 'Normal Vehicle',
      direction: 'South',
      arrivalTime: 1,
      burstTime: 3,
      priority: 3,
    }),
    createTrafficProcess({
      pidNumber: 4,
      vehicleType: 'Police Vehicle',
      direction: 'West',
      arrivalTime: 2,
      burstTime: 3,
      priority: 2,
    }),
  ];

  const state: SimulationState = {
    simTime: 0,
    currentTick: -1,
    running: true,
    hasStarted: true,
    processes: initialProcesses,
    readyQueue: [],
    runningPid: null,
    vehicles: [],
    signalState: createInitialSignalState(config.yellowDuration, config.allRedDuration),
    ganttSlices: [],
    logs: [
      makeLog(0, 'SYSTEM', 'Smart Traffic Signal Controller initialized.', undefined, 1),
    ],
    emergency: createIdleEmergencyState(),
    config,
    nextPidNumber: 5,
    lastAutoSpawnTick: 0,
    emergenciesServedCount: 0,
    emergencyResponseTimes: [],
    queueLengthSamples: [],
    starvationModeActive: false,
    lastStarvationSpawnTick: 0,
  };

  // Process tick 0 immediately so initial vehicles appear on canvas right away
  return processDiscreteTick(state, 0);
}

export function resetSimulationState(prevConfig?: SimulationConfig): SimulationState {
  const config = prevConfig ? { ...prevConfig } : createDefaultConfig();
  return {
    simTime: 0,
    currentTick: -1,
    running: false,
    hasStarted: false,
    processes: [],
    readyQueue: [],
    runningPid: null,
    vehicles: [],
    signalState: createInitialSignalState(config.yellowDuration, config.allRedDuration),
    ganttSlices: [],
    logs: [makeLog(0, 'SYSTEM', 'Simulation reset. Ready for incoming traffic.')],
    emergency: createIdleEmergencyState(),
    config,
    nextPidNumber: 1,
    lastAutoSpawnTick: 0,
    emergenciesServedCount: 0,
    emergencyResponseTimes: [],
    queueLengthSamples: [],
    starvationModeActive: false,
    lastStarvationSpawnTick: 0,
  };
}

export function loadCaseStudyIntoState(
  prevState: SimulationState,
  autoStart = true
): SimulationState {
  const dataset = createCaseStudyDataset();
  const config = { ...prevState.config };
  const base: SimulationState = {
    simTime: 0,
    currentTick: -1,
    running: autoStart,
    hasStarted: autoStart,
    processes: dataset,
    readyQueue: [],
    runningPid: null,
    vehicles: [],
    signalState: createInitialSignalState(config.yellowDuration, config.allRedDuration),
    ganttSlices: [],
    logs: [
      makeLog(
        0,
        'SYSTEM',
        'Loaded Academic Case Study Dataset (8 processes: P1–P8).'
      ),
    ],
    emergency: createIdleEmergencyState(),
    config,
    nextPidNumber: 9,
    lastAutoSpawnTick: 0,
    emergenciesServedCount: 0,
    emergencyResponseTimes: [],
    queueLengthSamples: [],
    starvationModeActive: false,
    lastStarvationSpawnTick: 0,
  };

  return processDiscreteTick(base, 0);
}

export function addManualVehicleToState(
  state: SimulationState,
  vehicleType: VehicleType,
  direction: Direction,
  customPriority?: number,
  customBurst?: number
): SimulationState {
  const arrivalTick = Math.max(0, Math.floor(state.simTime));
  const newProc = createTrafficProcess({
    pidNumber: state.nextPidNumber,
    vehicleType,
    direction,
    arrivalTime: arrivalTick,
    priority: customPriority,
    burstTime: customBurst,
  });

  // Immediately admit into Ready state if simulation has started or at tick 0
  const admittedProc: TrafficProcess = {
    ...newProc,
    state: 'Ready',
  };

  const newVehicle = createSimVehicleFromProcess(admittedProc, state.vehicles);
  const logEntry = makeLog(
    state.simTime,
    admittedProc.isEmergency ? 'INTERRUPT' : 'ARRIVAL',
    admittedProc.isEmergency
      ? `${admittedProc.vehicleType} ${admittedProc.pid} detected from ${direction}.`
      : `${admittedProc.vehicleType} ${admittedProc.pid} entered ${direction} queue.`,
    admittedProc.pid,
    1
  );
  const readyLog = makeLog(
    state.simTime,
    'SCHEDULER',
    `Process ${admittedProc.pid} moved to READY state (Priority ${admittedProc.priority}, Burst ${admittedProc.burstTime}u).`,
    admittedProc.pid,
    2
  );

  let nextState: SimulationState = {
    ...state,
    processes: [...state.processes, admittedProc],
    readyQueue: [...state.readyQueue, admittedProc.pid],
    vehicles: [...state.vehicles, newVehicle],
    logs: [...state.logs, logEntry, readyLog].slice(-250),
    nextPidNumber: state.nextPidNumber + 1,
  };

  // Trigger emergency preemption immediately if simulation is running or active
  if (admittedProc.isEmergency) {
    nextState = evaluateEmergencyPreemption(nextState, arrivalTick);
  }

  return nextState;
}

/**
 * Starts the dedicated Starvation Demonstration scenario:
 * Clears current queue, spawns a low-priority Normal Vehicle (Priority 5)
 * and initial high-priority emergency/urgent requests so users can observe starvation
 * with Aging Disabled vs priority elevation with Aging Enabled.
 */
export function startStarvationDemoInState(
  prevState: SimulationState,
  agingEnabled: boolean
): SimulationState {
  const config: SimulationConfig = {
    ...prevState.config,
    algorithm: 'PRIORITY',
    aging: {
      ...prevState.config.aging,
      enabled: agingEnabled,
    },
    autoGenerateTraffic: false,
  };

  const normalVictim = createTrafficProcess({
    pidNumber: 1,
    vehicleType: 'Normal Vehicle',
    direction: 'South',
    arrivalTime: 0,
    burstTime: 4,
    priority: 5,
    label: 'Normal Vehicle (Starvation Subject)',
  });

  const emg1 = createTrafficProcess({
    pidNumber: 2,
    vehicleType: 'Ambulance',
    direction: 'North',
    arrivalTime: 0,
    burstTime: 3,
    priority: 1,
  });

  const emg2 = createTrafficProcess({
    pidNumber: 3,
    vehicleType: 'Fire Engine',
    direction: 'East',
    arrivalTime: 2,
    burstTime: 3,
    priority: 1,
  });

  const base: SimulationState = {
    simTime: 0,
    currentTick: -1,
    running: true,
    hasStarted: true,
    processes: [normalVictim, emg1, emg2],
    readyQueue: [],
    runningPid: null,
    vehicles: [],
    signalState: createInitialSignalState(config.yellowDuration, config.allRedDuration),
    ganttSlices: [],
    logs: [
      makeLog(
        0,
        'SYSTEM',
        `Starvation Demonstration started (Aging ${agingEnabled ? 'ENABLED' : 'DISABLED'}).`
      ),
    ],
    emergency: createIdleEmergencyState(),
    config,
    nextPidNumber: 4,
    lastAutoSpawnTick: 0,
    emergenciesServedCount: 0,
    emergencyResponseTimes: [],
    queueLengthSamples: [],
    starvationModeActive: true,
    lastStarvationSpawnTick: 2,
  };

  return processDiscreteTick(base, 0);
}

function selectProcessByAlgorithm(
  algorithm: AlgorithmType,
  readyQueue: string[],
  processes: TrafficProcess[],
  currentTick: number,
  timeQuantum: number
): TrafficProcess | null {
  const ctx = { readyQueue, processes, currentTime: currentTick, timeQuantum };
  if (algorithm === 'FCFS') return fcfsScheduler.selectNextProcess(ctx);
  if (algorithm === 'PRIORITY') return priorityScheduler.selectNextProcess(ctx);
  return roundRobinScheduler.selectNextProcess(ctx);
}

function evaluateEmergencyPreemption(
  state: SimulationState,
  tick: number
): SimulationState {
  const procMap = new Map(state.processes.map((p) => [p.pid, p]));
  const currentRunning = state.runningPid ? procMap.get(state.runningPid) ?? null : null;

  // Do not preempt an already running emergency vehicle
  if (currentRunning && currentRunning.isEmergency) {
    return state;
  }

  // If Aging is enabled and a starving normal vehicle has aged all the way to priority 1
  // and has waited >= 15 units, allow it to finish its short turn in Starvation Demo mode
  if (
    state.starvationModeActive &&
    state.config.aging.enabled &&
    currentRunning &&
    !currentRunning.isEmergency &&
    currentRunning.priority === 1 &&
    currentRunning.agingBoosts >= 3
  ) {
    return state;
  }

  const pendingEmergency = findPendingEmergencyProcess(
    state.processes,
    state.readyQueue
  );

  if (!pendingEmergency) return state;

  // In Starvation Demo with Aging Enabled, if a normal vehicle has aged to Priority 1
  // with earlier arrival/longer wait, let Priority Scheduler serve it before the next emergency
  if (state.starvationModeActive && state.config.aging.enabled) {
    const agedTop = state.processes.find(
      (p) =>
        !p.isEmergency &&
        (p.state === 'Ready' || p.state === 'Waiting') &&
        p.priority <= 1 &&
        p.agingBoosts >= 3
    );
    if (agedTop) {
      return state;
    }
  }

  const newLogs = [...state.logs];
  const interruptState = createEmergencyInterrupt(
    pendingEmergency,
    currentRunning,
    tick
  );

  newLogs.push(
    makeLog(
      tick,
      'INTERRUPT',
      `Emergency interrupt generated for ${pendingEmergency.vehicleType} ${pendingEmergency.pid} (${pendingEmergency.direction}).`,
      pendingEmergency.pid,
      10
    )
  );

  let updatedProcesses = state.processes;
  if (currentRunning && !currentRunning.isEmergency) {
    updatedProcesses = state.processes.map((p) =>
      p.pid === currentRunning.pid ? { ...p, state: 'Ready' } : p
    );
    newLogs.push(
      makeLog(
        tick,
        'SCHEDULER',
        `Saved context of ${currentRunning.pid} (${currentRunning.direction}); preempted for emergency right-of-way.`,
        currentRunning.pid,
        11
      )
    );
  }

  const sigTransition = requestSignalPhase(
    state.signalState,
    pendingEmergency.direction,
    true
  );

  for (const msg of sigTransition.events) {
    newLogs.push(makeLog(tick, 'SIGNAL', msg, pendingEmergency.pid, 12));
  }

  if (
    sigTransition.nextState.phaseMode === 'YELLOW_CLEARANCE' ||
    sigTransition.nextState.phaseMode === 'ALL_RED_CLEARANCE'
  ) {
    newLogs.push(
      makeLog(
        tick,
        'INTERRUPT',
        'Current traffic phase entering safe transition.',
        pendingEmergency.pid,
        13
      )
    );
  }

  // Mark pendingEmergency as Waiting/Running depending on whether green is immediate
  const immediateGreen =
    sigTransition.nextState.activeDirection === pendingEmergency.direction &&
    sigTransition.nextState.phaseMode === 'EMERGENCY_GREEN';

  updatedProcesses = updatedProcesses.map((p) =>
    p.pid === pendingEmergency.pid
      ? {
          ...p,
          state: immediateGreen ? 'Running' : 'Waiting',
          startTime: immediateGreen && p.startTime === null ? tick : p.startTime,
        }
      : p
  );

  const finalEmergencyState = immediateGreen
    ? {
        ...interruptState,
        status: 'ACTIVE_PREEMPTION' as const,
        responseTime: 0,
      }
    : interruptState;

  return {
    ...state,
    processes: updatedProcesses,
    runningPid: pendingEmergency.pid,
    signalState: sigTransition.nextState,
    emergency: finalEmergencyState,
    logs: newLogs.slice(-250),
  };
}

/**
 * Processes one discrete integer OS simulation tick.
 */
export function processDiscreteTick(
  state: SimulationState,
  tick: number
): SimulationState {
  if (tick <= state.currentTick) return state;

  let processes = [...state.processes];
  let readyQueue = [...state.readyQueue];
  let vehicles = [...state.vehicles];
  let logs = [...state.logs];
  let signalState = state.signalState;
  let runningPid = state.runningPid;
  let emergency = state.emergency;
  let ganttSlices = [...state.ganttSlices];
  let nextPidNumber = state.nextPidNumber;
  let lastAutoSpawnTick = state.lastAutoSpawnTick;
  let lastStarvationSpawnTick = state.lastStarvationSpawnTick;
  let emergenciesServedCount = state.emergenciesServedCount;
  const emergencyResponseTimes = [...state.emergencyResponseTimes];

  let logSeq = 0;

  // 1. If tick >= 1, complete the 1-unit execution interval [tick - 1, tick]
  if (tick >= 1) {
    const runningProc = runningPid
      ? processes.find((p) => p.pid === runningPid) ?? null
      : null;

    const targetDirForRunning = runningProc
      ? runningProc.vehicleType === 'Pedestrian'
        ? 'PEDESTRIAN'
        : runningProc.direction
      : null;

    const signalGranted =
      runningProc &&
      signalState.activeDirection === targetDirForRunning &&
      (signalState.phaseMode === 'NORMAL_GREEN' ||
        signalState.phaseMode === 'EMERGENCY_GREEN' ||
        signalState.phaseMode === 'PEDESTRIAN_WALK');

    if (runningProc && signalGranted) {
      if (runningProc.state !== 'Running') {
        processes = processes.map((p) =>
          p.pid === runningProc.pid
            ? {
                ...p,
                state: 'Running',
                startTime: p.startTime === null ? tick - 1 : p.startTime,
              }
            : p
        );
      }

      if (
        emergency.active &&
        emergency.emergencyPid === runningProc.pid &&
        emergency.status !== 'ACTIVE_PREEMPTION'
      ) {
        const respTime =
          emergency.interruptTime !== null
            ? Math.max(0, tick - 1 - emergency.interruptTime)
            : 0;
        emergency = {
          ...emergency,
          status: 'ACTIVE_PREEMPTION',
          responseTime: respTime,
        };
        emergencyResponseTimes.push(respTime);
      }

      // Record Gantt execution slice [tick - 1, tick]
      const lastSlice = ganttSlices[ganttSlices.length - 1];
      if (
        lastSlice &&
        lastSlice.pid === runningProc.pid &&
        lastSlice.endTime === tick - 1
      ) {
        ganttSlices[ganttSlices.length - 1] = {
          ...lastSlice,
          endTime: tick,
        };
      } else {
        ganttSlices.push({
          id: `slice-${runningProc.pid}-${tick - 1}`,
          pid: runningProc.pid,
          vehicleType: runningProc.vehicleType,
          direction: runningProc.direction,
          startTime: tick - 1,
          endTime: tick,
          isEmergency: runningProc.isEmergency,
          algorithm: state.config.algorithm,
        });
      }

      const nextRemaining = Math.max(0, runningProc.remainingTime - 1);
      const nextQuantumUsed = runningProc.quantumUsed + 1;

      processes = processes.map((p) => {
        if (p.pid === runningProc.pid) {
          return {
            ...p,
            remainingTime: nextRemaining,
            quantumUsed: nextQuantumUsed,
          };
        }
        if (p.state === 'Ready' || p.state === 'Waiting') {
          return { ...p, waitingTime: p.waitingTime + 1 };
        }
        return p;
      });

      if (nextRemaining <= 0) {
        const completionTick = tick;
        const tat = calculateTurnaroundTime(completionTick, runningProc.arrivalTime);
        const wt = calculateWaitingTime(tat, runningProc.burstTime);

        processes = processes.map((p) => {
          if (p.pid === runningProc.pid) {
            return {
              ...p,
              remainingTime: 0,
              state: 'Completed',
              completionTime: completionTick,
              turnaroundTime: tat,
              waitingTime: wt,
            };
          }
          if (
            runningProc.isEmergency &&
            !p.isEmergency &&
            (p.state === 'Ready' || p.state === 'Waiting')
          ) {
            return {
              ...p,
              emergencyCountBefore: p.emergencyCountBefore + 1,
            };
          }
          return p;
        });

        readyQueue = readyQueue.filter((id) => id !== runningProc.pid);
        runningPid = null;

        logs.push(
          makeLog(
            completionTick,
            runningProc.isEmergency ? 'INTERRUPT' : 'SCHEDULER',
            runningProc.isEmergency
              ? `${runningProc.vehicleType} ${runningProc.pid} cleared intersection (TAT ${tat}u, WT ${wt}u).`
              : `Process ${runningProc.pid} completed service (TAT ${tat}u, WT ${wt}u).`,
            runningProc.pid,
            logSeq++
          )
        );

        if (runningProc.isEmergency) {
          emergenciesServedCount += 1;
          emergency = createIdleEmergencyState();
          logs.push(
            makeLog(
              completionTick,
              'INTERRUPT',
              'Normal scheduling resumed.',
              undefined,
              logSeq++
            )
          );
        }
      } else if (
        state.config.algorithm === 'ROUND_ROBIN' &&
        !runningProc.isEmergency &&
        nextQuantumUsed >= state.config.timeQuantum
      ) {
        processes = processes.map((p) =>
          p.pid === runningProc.pid ? { ...p, state: 'Ready', quantumUsed: 0 } : p
        );
        readyQueue = rotateReadyQueueHead(readyQueue, runningProc.pid);
        runningPid = null;
        logs.push(
          makeLog(
            tick,
            'SCHEDULER',
            `Round Robin quantum (${state.config.timeQuantum}u) expired for ${runningProc.pid}; rotated to queue tail.`,
            runningProc.pid,
            logSeq++
          )
        );
      }
    } else {
      // Signal is in clearance transition or idle -> waiting queued processes still accrue waiting time
      processes = processes.map((p) => {
        if (p.state === 'Ready' || p.state === 'Waiting') {
          return { ...p, waitingTime: p.waitingTime + 1 };
        }
        return p;
      });
    }

    // Apply Dynamic Aging after advancing waiting time for [tick - 1, tick]
    const agingRes = applyAgingToProcesses(processes, state.config.aging);
    processes = agingRes.updatedProcesses;
    for (const ev of agingRes.agedEvents) {
      logs.push(
        makeLog(
          tick,
          'AGING',
          `Aging updated process ${ev.pid} priority: ${ev.oldPriority} -> ${ev.newPriority} (waited ${ev.waitingTime}u).`,
          ev.pid,
          logSeq++
        )
      );
    }
  }

  // 2. Optional continuous random traffic generation
  if (
    state.config.autoGenerateTraffic &&
    tick > 0 &&
    tick - lastAutoSpawnTick >= state.config.autoGenerateInterval
  ) {
    const newProc = generateRandomVehicleProcess(nextPidNumber, tick, tick);
    processes.push(newProc);
    nextPidNumber += 1;
    lastAutoSpawnTick = tick;
  }

  // 3. Optional Starvation Demonstration continuous emergency inflow
  if (
    state.starvationModeActive &&
    tick > 0 &&
    tick - lastStarvationSpawnTick >= 3
  ) {
    const waitingNormalExists = processes.some(
      (p) => !p.isEmergency && p.state !== 'Completed'
    );
    if (waitingNormalExists && processes.length < 30) {
      const dir = DIRECTIONS[nextPidNumber % 4];
      const emgType: VehicleType =
        nextPidNumber % 2 === 0 ? 'Ambulance' : 'Fire Engine';
      const emgProc = createTrafficProcess({
        pidNumber: nextPidNumber,
        vehicleType: emgType,
        direction: dir,
        arrivalTime: tick,
        burstTime: 3,
        priority: 1,
      });
      processes.push(emgProc);
      nextPidNumber += 1;
      lastStarvationSpawnTick = tick;
    }
  }

  // 4. Admit any 'New' processes whose arrivalTime <= tick
  for (let i = 0; i < processes.length; i++) {
    const p = processes[i];
    if (p.state === 'New' && p.arrivalTime <= tick) {
      const admitted: TrafficProcess = { ...p, state: 'Ready' };
      processes[i] = admitted;
      if (!readyQueue.includes(admitted.pid)) {
        readyQueue.push(admitted.pid);
      }
      if (!vehicles.some((v) => v.pid === admitted.pid)) {
        vehicles.push(createSimVehicleFromProcess(admitted, vehicles));
      }
      logs.push(
        makeLog(
          tick,
          admitted.isEmergency ? 'INTERRUPT' : 'ARRIVAL',
          admitted.isEmergency
            ? `${admitted.vehicleType} ${admitted.pid} detected from ${admitted.direction}.`
            : `${admitted.vehicleType} ${admitted.pid} entered ${admitted.direction} queue.`,
          admitted.pid,
          logSeq++
        )
      );
      logs.push(
        makeLog(
          tick,
          'SCHEDULER',
          `Process ${admitted.pid} moved to READY state.`,
          admitted.pid,
          logSeq++
        )
      );
    }
  }

  let intermediateState: SimulationState = {
    ...state,
    currentTick: tick,
    processes,
    readyQueue,
    vehicles,
    logs,
    signalState,
    runningPid,
    emergency,
    ganttSlices,
    nextPidNumber,
    lastAutoSpawnTick,
    lastStarvationSpawnTick,
    emergenciesServedCount,
    emergencyResponseTimes,
  };

  // 5. Evaluate Emergency Preemption before normal scheduling
  intermediateState = evaluateEmergencyPreemption(intermediateState, tick);
  processes = intermediateState.processes;
  readyQueue = intermediateState.readyQueue;
  logs = intermediateState.logs;
  signalState = intermediateState.signalState;
  runningPid = intermediateState.runningPid;
  emergency = intermediateState.emergency;

  // 6. If no process is currently selected, invoke active OS scheduling algorithm for [tick, tick + 1]
  if (!runningPid) {
    const selected = selectProcessByAlgorithm(
      state.config.algorithm,
      readyQueue,
      processes,
      tick,
      state.config.timeQuantum
    );

    if (selected) {
      runningPid = selected.pid;
      const targetDir =
        selected.vehicleType === 'Pedestrian' ? 'PEDESTRIAN' : selected.direction;
      const sigRes = requestSignalPhase(signalState, targetDir, selected.isEmergency);
      signalState = sigRes.nextState;

      logs.push(
        makeLog(
          tick,
          'SCHEDULER',
          `Scheduler (${state.config.algorithm}) selected ${selected.pid} (${selected.vehicleType}, ${selected.direction}).`,
          selected.pid,
          logSeq++
        )
      );

      for (const msg of sigRes.events) {
        logs.push(makeLog(tick, 'SIGNAL', msg, selected.pid, logSeq++));
      }

      const isGreenNow =
        signalState.activeDirection === targetDir &&
        (signalState.phaseMode === 'NORMAL_GREEN' ||
          signalState.phaseMode === 'EMERGENCY_GREEN' ||
          signalState.phaseMode === 'PEDESTRIAN_WALK');

      processes = processes.map((p) =>
        p.pid === selected.pid
          ? {
              ...p,
              state: isGreenNow ? 'Running' : 'Waiting',
              quantumUsed: 0,
              startTime: isGreenNow && p.startTime === null ? tick : p.startTime,
            }
          : p
      );
    } else {
      // No processes waiting -> safely drop signals to IDLE_ALL_RED
      if (signalState.phaseMode !== 'IDLE_ALL_RED') {
        const sigRes = requestSignalPhase(signalState, null, false);
        signalState = sigRes.nextState;
        for (const msg of sigRes.events) {
          logs.push(makeLog(tick, 'SIGNAL', msg, undefined, logSeq++));
        }
      }
    }
  }

  const readyCountSample = processes.filter(
    (p) => p.state === 'Ready' || p.state === 'Waiting'
  ).length;

  return {
    ...intermediateState,
    processes,
    readyQueue,
    vehicles,
    signalState,
    runningPid,
    emergency,
    ganttSlices,
    logs: logs.slice(-250),
    nextPidNumber,
    lastAutoSpawnTick,
    lastStarvationSpawnTick,
    emergenciesServedCount,
    emergencyResponseTimes,
    queueLengthSamples: [...state.queueLengthSamples, readyCountSample].slice(-200),
  };
}

/**
 * Advances the continuous simulation by `realDeltaSeconds` scaled by `speedMultiplier`.
 * Drives both the signal clearance timers, discrete OS ticks, and 60fps vehicle kinematics.
 */
export function advanceSimulation(
  state: SimulationState,
  realDeltaSeconds: number
): SimulationState {
  if (!state.running) return state;

  const clampedDelta = Math.min(0.1, Math.max(0, realDeltaSeconds));
  const simDt = clampedDelta * state.config.speedMultiplier;
  const nextSimTime = state.simTime + simDt;

  // Step continuous signal clearance timer
  const sigStep = stepSignalController(state.signalState, simDt);
  let nextState: SimulationState = {
    ...state,
    simTime: nextSimTime,
    signalState: sigStep.nextState,
    logs:
      sigStep.events.length > 0
        ? [
            ...state.logs,
            ...sigStep.events.map((msg, idx) =>
              makeLog(nextSimTime, 'SIGNAL', msg, undefined, idx)
            ),
          ].slice(-250)
        : state.logs,
  };

  // If signal just turned GREEN for a waiting runningPid, activate it cleanly
  if (sigStep.becameGreenFor && nextState.runningPid) {
    const rp = nextState.processes.find((p) => p.pid === nextState.runningPid);
    if (rp && rp.state !== 'Running') {
      const targetDir =
        rp.vehicleType === 'Pedestrian' ? 'PEDESTRIAN' : rp.direction;
      if (sigStep.becameGreenFor === targetDir) {
        nextState = {
          ...nextState,
          processes: nextState.processes.map((p) =>
            p.pid === rp.pid
              ? {
                  ...p,
                  state: 'Running',
                  startTime:
                    p.startTime === null ? Math.floor(nextSimTime) : p.startTime,
                }
              : p
          ),
        };
      }
    }
  }

  // Process any integer OS ticks crossed during this step
  const targetTick = Math.floor(nextSimTime);
  while (nextState.currentTick < targetTick) {
    nextState = processDiscreteTick(nextState, nextState.currentTick + 1);
  }

  // Update vehicle kinematics smoothly across the 4-way intersection
  const updatedVehicles = updateVehicleKinematics(
    nextState.vehicles,
    nextState.processes,
    nextState.signalState.signals,
    nextState.runningPid,
    simDt
  );

  return {
    ...nextState,
    vehicles: updatedVehicles,
  };
}

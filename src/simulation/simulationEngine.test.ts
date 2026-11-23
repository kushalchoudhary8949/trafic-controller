import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceSimulation,
  addManualVehicleToState,
  createInitialSimulationState,
  loadCaseStudyIntoState,
  resetSimulationState,
  startStarvationDemoInState,
} from './simulationEngine';
import { createCaseStudyDataset } from './trafficGenerator';
import {
  calculateTurnaroundTime,
  calculateWaitingTime,
  simulateAlgorithmBatch,
} from '../utils/calculations';
import { areSignalsSafe } from './signalController';
import { computeAgedPriority } from '../scheduler/aging';
import { computeStarvationStats } from '../utils/metrics';

test('Test 1: Normal traffic spawns across all four directions and moves without collision', () => {
  let state = resetSimulationState();
  state = { ...state, running: true, hasStarted: true };
  state = addManualVehicleToState(state, 'Normal Vehicle', 'North');
  state = addManualVehicleToState(state, 'Normal Vehicle', 'South');
  state = addManualVehicleToState(state, 'Normal Vehicle', 'East');
  state = addManualVehicleToState(state, 'Normal Vehicle', 'West');
  state = addManualVehicleToState(state, 'Normal Vehicle', 'North');

  assert.equal(state.processes.length, 5);
  assert.equal(state.vehicles.length, 5);

  for (let i = 0; i < 60; i++) {
    state = advanceSimulation(state, 0.1);
    assert.equal(
      areSignalsSafe(state.signalState.signals),
      true,
      `Signals must remain safe at t=${state.simTime}`
    );

    // Verify two vehicles in the same lane never overlap
    const northCars = state.vehicles
      .filter((v) => v.direction === 'North')
      .sort((a, b) => b.distanceAlongLane - a.distanceAlongLane);
    if (northCars.length === 2) {
      const gap =
        northCars[0].distanceAlongLane -
        northCars[0].length -
        northCars[1].distanceAlongLane;
      assert.ok(gap >= 0, `Same-lane gap must be >= 0, got ${gap}`);
    }
  }
});

test('Test 2: FCFS scheduling on exact Case Study Dataset P1..P8', () => {
  const dataset = createCaseStudyDataset();
  assert.equal(dataset.length, 8);
  assert.equal(dataset[0].pid, 'P1');
  assert.equal(dataset[3].vehicleType, 'Ambulance');
  assert.equal(dataset[6].vehicleType, 'Fire Engine');

  const fcfs = simulateAlgorithmBatch(dataset, 'FCFS', 2);
  assert.equal(fcfs.completedCount, 8);
  assert.deepEqual(
    fcfs.gantt.map((s) => s.pid),
    ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']
  );

  // Exact analytical verification:
  // P1: 0..5 (CT 5, TAT 5, WT 0)
  // P2: 5..8 (CT 8, TAT 7, WT 4)
  // P3: 8..16 (CT 16, TAT 14, WT 6)
  // P8: 31..33 (CT 33, TAT 26, WT 24)
  const p1 = fcfs.processes.find((p) => p.pid === 'P1')!;
  const p8 = fcfs.processes.find((p) => p.pid === 'P8')!;
  assert.equal(p1.completionTime, 5);
  assert.equal(p1.waitingTime, 0);
  assert.equal(p8.completionTime, 33);
  assert.equal(p8.turnaroundTime, 26);
  assert.equal(p8.waitingTime, 24);
  assert.equal(fcfs.averageWaitingTime, 12.13);
  assert.equal(fcfs.averageTurnaroundTime, 16.25);
});

test('Test 3: Priority Scheduling selects lowest numerical priority eligible process', () => {
  const dataset = createCaseStudyDataset();
  const priorityRes = simulateAlgorithmBatch(dataset, 'PRIORITY', 2);
  assert.equal(priorityRes.completedCount, 8);

  // At t=0 only P1 is available -> [0,5].
  // At t=5, P2(p2), P3(p4), P4(p1), P5(p5), P6(p3) are ready -> P4(p1) selected next!
  assert.equal(priorityRes.gantt[0].pid, 'P1');
  assert.equal(priorityRes.gantt[1].pid, 'P4');
  assert.equal(priorityRes.gantt[2].pid, 'P2');
  assert.equal(priorityRes.gantt[3].pid, 'P7');
  assert.equal(priorityRes.averageWaitingTime, 10.63);
  assert.equal(priorityRes.averageTurnaroundTime, 14.75);

  for (const p of priorityRes.processes) {
    const tat = calculateTurnaroundTime(p.completionTime!, p.arrivalTime);
    const wt = calculateWaitingTime(tat, p.burstTime);
    assert.equal(p.turnaroundTime, tat);
    assert.equal(p.waitingTime, wt);
  }
});

test('Test 4: Round Robin enforces time quantum = 2 and rotates incomplete processes', () => {
  const dataset = createCaseStudyDataset();
  const rr = simulateAlgorithmBatch(dataset, 'ROUND_ROBIN', 2);
  assert.equal(rr.completedCount, 8);

  // Every slice duration must be <= 2
  for (const slice of rr.gantt) {
    const duration = slice.endTime - slice.startTime;
    assert.ok(duration >= 1 && duration <= 2, `Slice duration ${duration} exceeds quantum 2`);
  }

  // P1 has burst 5 -> must appear in at least 3 slices (2 + 2 + 1)
  const p1Slices = rr.gantt.filter((s) => s.pid === 'P1');
  assert.equal(p1Slices.length, 3);
  assert.equal(
    p1Slices.reduce((acc, s) => acc + (s.endTime - s.startTime), 0),
    5
  );
});

test('Test 5 & 8: Emergency Interrupt safely preempts normal phase and maintains signal safety', () => {
  let state = loadCaseStudyIntoState(createInitialSimulationState(), true);
  state.config = { ...state.config, algorithm: 'FCFS' };

  // Advance a bit so P1 (North) is running
  for (let i = 0; i < 15; i++) {
    state = advanceSimulation(state, 0.1);
    assert.equal(areSignalsSafe(state.signalState.signals), true);
  }
  assert.equal(state.signalState.signals.North, 'GREEN');

  // Inject an Ambulance from East while North is GREEN
  state = addManualVehicleToState(state, 'Ambulance', 'East');
  assert.equal(state.emergency.active, true);
  assert.equal(state.emergency.direction, 'East');

  // Should transition safely through YELLOW/ALL_RED before East turns GREEN
  let sawClearance = false;
  let sawEastGreen = false;
  let sawResumed = false;

  for (let i = 0; i < 180; i++) {
    state = advanceSimulation(state, 0.1);
    assert.equal(
      areSignalsSafe(state.signalState.signals),
      true,
      'Conflicting directions must NEVER be green simultaneously'
    );
    if (
      state.signalState.phaseMode === 'YELLOW_CLEARANCE' ||
      state.signalState.phaseMode === 'ALL_RED_CLEARANCE'
    ) {
      sawClearance = true;
    }
    if (state.signalState.signals.East === 'GREEN') {
      sawEastGreen = true;
    }
    if (sawEastGreen && !state.emergency.active) {
      sawResumed = true;
      break;
    }
  }

  assert.equal(sawClearance, true, 'Must go through yellow/all-red clearance');
  assert.equal(sawEastGreen, true, 'East must receive GREEN for Ambulance');
  assert.equal(sawResumed, true, 'Normal scheduling must resume after emergency');
});

test('Test 6: Starvation occurs with Aging Disabled under repeated emergency requests', () => {
  let state = startStarvationDemoInState(createInitialSimulationState(), false);

  for (let i = 0; i < 200; i++) {
    state = advanceSimulation(state, 0.1);
  }

  const p1 = state.processes.find((p) => p.pid === 'P1')!;
  const stats = computeStarvationStats(state);
  assert.equal(p1.priority, 5, 'Priority stays 5 when aging is disabled');
  assert.ok(p1.waitingTime >= 12, `Expected starvation wait >= 12, got ${p1.waitingTime}`);
  assert.ok(stats.totalEmergenciesServed >= 2);
  assert.equal(stats.hasStarvationWarning, true);
});

test('Test 7: Aging algorithm elevates waiting process priority every 5 units (5->4->3->2->1)', () => {
  const agingConfig = { enabled: true, intervalUnits: 5, minPriority: 1 };
  assert.equal(computeAgedPriority(5, 0, agingConfig), 5);
  assert.equal(computeAgedPriority(5, 5, agingConfig), 4);
  assert.equal(computeAgedPriority(5, 10, agingConfig), 3);
  assert.equal(computeAgedPriority(5, 15, agingConfig), 2);
  assert.equal(computeAgedPriority(5, 20, agingConfig), 1);
  assert.equal(computeAgedPriority(5, 35, agingConfig), 1);

  let state = startStarvationDemoInState(createInitialSimulationState(), true);
  for (let i = 0; i < 320; i++) {
    state = advanceSimulation(state, 0.1);
  }

  const p1 = state.processes.find((p) => p.pid === 'P1')!;
  assert.ok(
    p1.priority < p1.initialPriority || p1.state === 'Completed',
    `Expected aged process priority < 5 or completed, got priority=${p1.priority}, state=${p1.state}`
  );
  assert.equal(p1.state, 'Completed', 'Aged P1 must eventually complete instead of starving');
});

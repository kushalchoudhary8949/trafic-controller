import React from 'react';
import { SimulationState } from '../../types/scheduler';
import { formatSimTimestamp } from '../../simulation/simulationEngine';

interface LiveSystemInfoProps {
  state: SimulationState;
}

export const LiveSystemInfo: React.FC<LiveSystemInfoProps> = ({ state }) => {
  const runningProc = state.runningPid
    ? state.processes.find((p) => p.pid === state.runningPid) ?? null
    : null;

  const activeDirLabel =
    state.signalState.phaseMode === 'YELLOW_CLEARANCE'
      ? `Transition (${state.signalState.activeDirection} Yellow)`
      : state.signalState.phaseMode === 'ALL_RED_CLEARANCE'
      ? 'All-Red Safety Clearance'
      : state.signalState.activeDirection === 'PEDESTRIAN'
      ? 'Pedestrian Walk Phase'
      : state.signalState.activeDirection
      ? `${state.signalState.activeDirection} Green`
      : 'All-Red Idle';

  const algoName =
    state.config.algorithm === 'FCFS'
      ? 'FCFS (FIFO)'
      : state.config.algorithm === 'PRIORITY'
      ? 'Priority Scheduling'
      : `Round Robin (q=${state.config.timeQuantum})`;

  return (
    <section
      aria-label="Live System Information"
      className="rounded-xl border border-slate-800 bg-[#11192B] p-4"
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <h2 className="font-display text-sm font-semibold text-slate-100">
          Live System Telemetry
        </h2>
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          {state.running ? 'RUNNING' : 'PAUSED'} · {state.config.speedMultiplier}x
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-slate-400">Simulation Time</dt>
          <dd
            data-testid="sim-time-value"
            className="mt-0.5 font-mono text-sm font-semibold text-sky-300 tabular-nums"
          >
            {formatSimTimestamp(state.simTime)} ({Math.floor(state.simTime)}u)
          </dd>
        </div>

        <div>
          <dt className="text-slate-400">Running Process</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-100 tabular-nums">
            {runningProc
              ? `${runningProc.pid} (${runningProc.vehicleType})`
              : 'Idle'}
          </dd>
        </div>

        <div>
          <dt className="text-slate-400">Ready Queue Size</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-100 tabular-nums">
            {state.readyQueue.length} processes
          </dd>
        </div>

        <div>
          <dt className="text-slate-400">Traffic Direction</dt>
          <dd className="mt-0.5 font-medium text-emerald-400">
            {activeDirLabel}
          </dd>
        </div>

        <div>
          <dt className="text-slate-400">Active Scheduler</dt>
          <dd className="mt-0.5 font-medium text-slate-200">{algoName}</dd>
        </div>

        <div>
          <dt className="text-slate-400">Emergency Status</dt>
          <dd
            className={`mt-0.5 font-semibold ${
              state.emergency.active ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {state.emergency.active
              ? `PREEMPTING (${state.emergency.emergencyPid})`
              : 'Nominal'}
          </dd>
        </div>
      </dl>
    </section>
  );
};

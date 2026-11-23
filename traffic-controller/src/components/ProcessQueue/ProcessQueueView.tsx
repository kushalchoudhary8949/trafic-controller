import React, { useState } from 'react';
import { ProcessState, TrafficProcess } from '../../types/process';

interface ProcessQueueViewProps {
  processes: TrafficProcess[];
  readyQueue: string[];
  runningPid: string | null;
  compact?: boolean;
}

const STATE_STYLE: Record<ProcessState, string> = {
  New: 'text-slate-400',
  Ready: 'text-sky-300',
  Running: 'text-emerald-400 font-semibold',
  Waiting: 'text-amber-300',
  Completed: 'text-slate-400',
};

export const ProcessQueueView: React.FC<ProcessQueueViewProps> = ({
  processes,
  readyQueue,
  runningPid,
  compact = false,
}) => {
  const [filter, setFilter] = useState<'ALL' | ProcessState>('ALL');

  const procMap = new Map(processes.map((p) => [p.pid, p]));
  const queuedProcs = readyQueue
    .map((pid) => procMap.get(pid))
    .filter((p): p is TrafficProcess => Boolean(p));

  const filteredProcesses =
    filter === 'ALL'
      ? processes
      : processes.filter((p) => p.state === filter);

  return (
    <section
      aria-label="Process Management and Queue"
      className="rounded-xl border border-slate-800 bg-[#11192B] p-4 space-y-4"
    >
      {/* Ready Queue Strip */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-slate-100">
            Ready Queue & Process Table
          </h2>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            Ready Queue: {queuedProcs.length} · Total: {processes.length}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto rounded-lg border border-slate-800/90 bg-[#0B1120] px-3 py-2">
          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap shrink-0">
            HEAD
          </span>
          {queuedProcs.length === 0 ? (
            <span className="text-xs text-slate-500">
              Queue is currently empty
            </span>
          ) : (
            queuedProcs.map((proc) => {
              const isRun = proc.pid === runningPid;
              return (
                <div
                  key={proc.pid}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-mono whitespace-nowrap shrink-0 ${
                    isRun
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                      : proc.isEmergency
                      ? 'border-rose-500/50 bg-rose-500/10 text-rose-200'
                      : 'border-slate-700 bg-slate-800/80 text-slate-200'
                  }`}
                >
                  <span className="font-semibold">{proc.pid}</span>
                  <span className="text-slate-400">·</span>
                  <span>{proc.direction[0]}</span>
                  <span className="text-slate-400">·</span>
                  <span>P{proc.priority}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* State Filter Segmented Control */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-900/90 p-1 border border-slate-800">
          {(['ALL', 'New', 'Ready', 'Running', 'Waiting', 'Completed'] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filter === st
                    ? 'bg-slate-700 text-sky-300'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {st === 'ALL' ? 'All Processes' : st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Process Management Table */}
      <div
        className={`overflow-x-auto rounded-lg border border-slate-800 ${
          compact ? 'max-h-[320px] overflow-y-auto' : ''
        }`}
      >
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[#0D1424] text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-3 py-2.5 font-medium whitespace-nowrap">PID</th>
              <th className="px-3 py-2.5 font-medium whitespace-nowrap">Vehicle Type</th>
              <th className="px-3 py-2.5 font-medium whitespace-nowrap">Direction</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Arrival</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Burst</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Remaining</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Priority</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Waiting</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Turnaround</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Completion</th>
              <th className="px-3 py-2.5 font-medium whitespace-nowrap">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
            {filteredProcesses.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-8 text-center font-sans text-xs text-slate-500"
                >
                  No processes match the selected filter. Add vehicles or load
                  the Case Study Dataset to populate the process table.
                </td>
              </tr>
            ) : (
              filteredProcesses.map((p) => (
                <tr
                  key={p.pid}
                  className={`transition-colors hover:bg-slate-800/40 ${
                    p.pid === runningPid ? 'bg-sky-500/10' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-semibold text-slate-100 whitespace-nowrap">
                    {p.pid}
                  </td>
                  <td className="px-3 py-2 font-sans text-slate-200 whitespace-nowrap">
                    {p.vehicleType}
                    {p.isEmergency && (
                      <span className="ml-1.5 text-[11px] font-semibold text-rose-400">
                        (EMG)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-sans text-slate-300 whitespace-nowrap">
                    {p.direction}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300">
                    {p.arrivalTime}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300">
                    {p.burstTime}
                  </td>
                  <td className="px-3 py-2 text-right text-sky-300">
                    {p.remainingTime}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200">
                    {p.priority}
                    {p.agingBoosts > 0 && (
                      <span
                        title={`Aged from initial priority ${p.initialPriority}`}
                        className="ml-1 text-[11px] text-amber-300"
                      >
                        (↑{p.agingBoosts})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-300">
                    {p.waitingTime}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300">
                    {p.completionTime !== null ? p.turnaroundTime : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300">
                    {p.completionTime !== null ? p.completionTime : '—'}
                  </td>
                  <td className={`px-3 py-2 font-sans whitespace-nowrap ${STATE_STYLE[p.state]}`}>
                    {p.state}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

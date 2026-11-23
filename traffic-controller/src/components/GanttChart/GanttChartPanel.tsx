import React, { useMemo, useState } from 'react';
import { AlgorithmType, GanttSlice, TrafficProcess } from '../../types/process';
import { simulateAlgorithmBatch } from '../../utils/calculations';

interface GanttChartPanelProps {
  liveSlices: GanttSlice[];
  processes: TrafficProcess[];
  activeAlgorithm: AlgorithmType;
  runningPid: string | null;
  timeQuantum: number;
  onSelectAlgorithm?: (algo: AlgorithmType) => void;
}

const SLICE_PALETTE = [
  'bg-sky-600/85 border-sky-400/60',
  'bg-indigo-600/85 border-indigo-400/60',
  'bg-teal-600/85 border-teal-400/60',
  'bg-amber-600/85 border-amber-400/60',
  'bg-cyan-700/85 border-cyan-400/60',
  'bg-emerald-700/85 border-emerald-400/60',
];

export const GanttChartPanel: React.FC<GanttChartPanelProps> = ({
  liveSlices,
  processes,
  activeAlgorithm,
  runningPid,
  timeQuantum,
  onSelectAlgorithm,
}) => {
  const [viewMode, setViewMode] = useState<'LIVE' | 'THEORETICAL'>('LIVE');
  const [selectedSlice, setSelectedSlice] = useState<GanttSlice | null>(null);

  const theoreticalResult = useMemo(
    () => simulateAlgorithmBatch(processes, activeAlgorithm, timeQuantum),
    [processes, activeAlgorithm, timeQuantum]
  );

  const slices =
    viewMode === 'LIVE' ? liveSlices : theoreticalResult.gantt;

  const totalDuration =
    slices.length > 0 ? Math.max(...slices.map((s) => s.endTime)) : 0;

  const inspectedProc = selectedSlice
    ? (viewMode === 'THEORETICAL' ? theoreticalResult.processes : processes).find(
        (p) => p.pid === selectedSlice.pid
      ) ?? null
    : null;

  return (
    <section
      aria-label="CPU / Traffic Scheduling Gantt Chart"
      data-testid="gantt-chart-panel"
      className="rounded-xl border border-slate-800 bg-[#11192B] p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-100">
            Execution Gantt Chart ({activeAlgorithm.replace('_', ' ')})
          </h2>
          <p className="text-xs text-slate-400">
            Click any block to inspect process start time, end time, and duration
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSelectAlgorithm && (
            <div className="flex items-center gap-1 rounded-lg bg-slate-900/90 p-1 border border-slate-800">
              {(['FCFS', 'PRIORITY', 'ROUND_ROBIN'] as const).map((algo) => (
                <button
                  key={algo}
                  type="button"
                  onClick={() => onSelectAlgorithm(algo)}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                    activeAlgorithm === algo
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {algo === 'ROUND_ROBIN' ? 'RR (q=2)' : algo}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 rounded-lg bg-slate-900/90 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('LIVE')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                viewMode === 'LIVE'
                  ? 'bg-slate-700 text-sky-300'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Live Timeline
            </button>
            <button
              type="button"
              onClick={() => setViewMode('THEORETICAL')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                viewMode === 'THEORETICAL'
                  ? 'bg-slate-700 text-sky-300'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Full Schedule Preview
            </button>
          </div>
        </div>
      </div>

      {slices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-[#0B1120] px-4 py-6 text-center text-xs text-slate-500">
          Gantt timeline will populate as the scheduler dispatches processes.
        </div>
      ) : (
        <div className="space-y-2 overflow-x-auto pb-1">
          <div className="min-w-[600px]">
            <div className="flex h-12 w-full items-stretch gap-0.5 rounded-lg border border-slate-800 bg-[#0B1120] p-1">
              {slices.map((slice, idx) => {
                const dur = Math.max(1, slice.endTime - slice.startTime);
                const widthPct =
                  totalDuration > 0 ? (dur / totalDuration) * 100 : 100 / slices.length;
                const pidNum = parseInt(slice.pid.replace(/\D+/g, ''), 10) || idx;
                const colorCls = slice.isEmergency
                  ? 'bg-rose-600/90 border-rose-400/70'
                  : SLICE_PALETTE[pidNum % SLICE_PALETTE.length];
                const isActive =
                  viewMode === 'LIVE' &&
                  slice.pid === runningPid &&
                  idx === slices.length - 1;

                return (
                  <button
                    key={slice.id}
                    type="button"
                    onClick={() => setSelectedSlice(slice)}
                    style={{ width: `${Math.max(4, widthPct)}%` }}
                    title={`${slice.pid} (${slice.vehicleType}): ${slice.startTime}u -> ${slice.endTime}u (${dur}u)`}
                    className={`relative flex flex-col items-center justify-center rounded border text-slate-100 transition-transform hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${colorCls} ${
                      isActive ? 'ring-2 ring-emerald-400' : ''
                    }`}
                  >
                    <span className="font-mono text-[11px] font-bold leading-none">
                      {slice.pid}
                    </span>
                    <span className="font-mono text-[9px] text-slate-100/80 tabular-nums mt-0.5">
                      {slice.startTime}–{slice.endTime}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Time Ruler */}
            <div className="mt-1 flex items-center justify-between px-1 font-mono text-[10px] text-slate-500 tabular-nums">
              <span>0u</span>
              <span>{Math.round(totalDuration / 2)}u</span>
              <span>{totalDuration}u</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Slice Inspector */}
      {selectedSlice && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0B1120] px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
            <span className="font-semibold text-sky-300">{selectedSlice.pid}</span>
            <span className="font-sans text-slate-200">{selectedSlice.vehicleType}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300">Start: {selectedSlice.startTime}u</span>
            <span className="text-slate-300">End: {selectedSlice.endTime}u</span>
            <span className="text-slate-300">
              Duration: {selectedSlice.endTime - selectedSlice.startTime}u
            </span>
            {inspectedProc && inspectedProc.completionTime !== null && (
              <>
                <span className="text-slate-400">·</span>
                <span className="text-emerald-300">
                  TAT: {inspectedProc.turnaroundTime}u
                </span>
                <span className="text-amber-300">
                  WT: {inspectedProc.waitingTime}u
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedSlice(null)}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Close
          </button>
        </div>
      )}
    </section>
  );
};

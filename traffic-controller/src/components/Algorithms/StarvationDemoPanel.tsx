import React from 'react';
import { AlertOctagon, ArrowUpCircle } from 'lucide-react';
import { SimulationState } from '../../types/scheduler';
import { computeStarvationStats } from '../../utils/metrics';

interface StarvationDemoPanelProps {
  state: SimulationState;
  onStartStarvationDemo: (agingEnabled: boolean) => void;
  onToggleAging: (enabled: boolean) => void;
}

export const StarvationDemoPanel: React.FC<StarvationDemoPanelProps> = ({
  state,
  onStartStarvationDemo,
  onToggleAging,
}) => {
  const stats = computeStarvationStats(state);
  const subject = stats.starvingProcesses[0] ?? null;

  return (
    <section
      aria-label="Starvation Demonstration and Aging Comparison"
      data-testid="starvation-demo-panel"
      className="rounded-xl border border-slate-800 bg-[#11192B] p-4 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-100">
            Starvation Demonstration & Aging Comparison
          </h2>
          <p className="text-xs text-slate-400">
            Compare continuous emergency arrivals with Aging Disabled vs Aging Enabled (boost every {state.config.aging.intervalUnits}u wait)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onStartStarvationDemo(false)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              state.starvationModeActive && !state.config.aging.enabled
                ? 'border-rose-500 bg-rose-500/20 text-rose-200'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
            }`}
          >
            Run Starvation (Aging Disabled)
          </button>

          <button
            type="button"
            onClick={() => onStartStarvationDemo(true)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              state.starvationModeActive && state.config.aging.enabled
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            Run With Aging Enabled
          </button>
        </div>
      </div>

      {/* Starvation Warning Banner */}
      {stats.hasStarvationWarning && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200"
        >
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>
              <strong>Starvation Warning:</strong> Process{' '}
              <span className="font-mono font-semibold">{subject?.pid}</span> has
              waited{' '}
              <span className="font-mono font-semibold tabular-nums">
                {subject?.waitingTime}u
              </span>{' '}
              while {stats.totalEmergenciesServed} emergency requests bypassed it.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleAging(true)}
            className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-2.5 py-1 text-[11px] font-semibold text-slate-950 hover:bg-amber-300 whitespace-nowrap shrink-0"
          >
            <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Enable Aging Now</span>
          </button>
        </div>
      )}

      {/* Tracked Waiting Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-3">
          <p className="text-[11px] text-slate-400">Longest Waiting Vehicle</p>
          <p className="mt-1 font-mono text-base font-semibold text-slate-100">
            {subject ? `${subject.pid} (${subject.vehicleType})` : 'None'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-3">
          <p className="text-[11px] text-slate-400">Current Effective Priority</p>
          <p className="mt-1 font-mono text-base font-semibold text-sky-300 tabular-nums">
            {subject ? `P${subject.priority} (Base P${subject.initialPriority})` : '—'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-3">
          <p className="text-[11px] text-slate-400">Waiting Duration</p>
          <p className="mt-1 font-mono text-base font-semibold text-amber-300 tabular-nums">
            {subject ? `${subject.waitingTime} units` : '0 units'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-3">
          <p className="text-[11px] text-slate-400">Emergencies Served Before It</p>
          <p className="mt-1 font-mono text-base font-semibold text-rose-400 tabular-nums">
            {subject ? subject.emergencyCountBefore : stats.totalEmergenciesServed}
          </p>
        </div>
      </div>

      {/* Mode Comparison Guide */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
        <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-3 space-y-1">
          <p className="font-semibold text-rose-300">
            Mode 1: Aging Disabled
          </p>
          <p className="text-slate-400 leading-relaxed">
            Normal vehicles keep static low priority (e.g. Priority 5). Continuous
            priority-1 emergency requests preempt the queue indefinitely, causing
            unbounded waiting times (indefinite blocking / starvation).
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0B1120] p-3 space-y-1">
          <p className="font-semibold text-emerald-300">
            Mode 2: Aging Enabled ({state.config.aging.enabled ? 'ACTIVE' : 'OFF'})
          </p>
          <p className="text-slate-400 leading-relaxed">
            Every {state.config.aging.intervalUnits} waiting units, priority
            decrements by 1 (5 → 4 → 3 → 2 → 1). Waiting normal vehicles and
            pedestrians gradually rise in rank and are guaranteed service.
          </p>
        </div>
      </div>
    </section>
  );
};

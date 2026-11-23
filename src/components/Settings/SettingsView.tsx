import React from 'react';
import { SimulationConfig } from '../../types/scheduler';

interface SettingsViewProps {
  config: SimulationConfig;
  onUpdateConfig: (partial: Partial<SimulationConfig>) => void;
  onUpdateAging: (partial: Partial<SimulationConfig['aging']>) => void;
  onResetDefaults: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onUpdateConfig,
  onUpdateAging,
  onResetDefaults,
}) => {
  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded-xl border border-slate-800 bg-[#11192B] p-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100">
            Controller & Scheduler Settings
          </h2>
          <p className="text-xs text-slate-400">
            Configure time quantum, aging thresholds, safety clearance intervals, and random arrival cadence
          </p>
        </div>
        <button
          type="button"
          onClick={onResetDefaults}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
        >
          Restore Defaults
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#11192B] p-5 space-y-5 text-xs">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="setting-quantum"
              className="flex items-center justify-between font-medium text-slate-200 mb-1.5"
            >
              <span>Round Robin Time Quantum</span>
              <span className="font-mono text-sky-300 tabular-nums">
                {config.timeQuantum} units
              </span>
            </label>
            <input
              id="setting-quantum"
              type="range"
              min={1}
              max={6}
              step={1}
              value={config.timeQuantum}
              onChange={(e) =>
                onUpdateConfig({ timeQuantum: Number(e.target.value) })
              }
              className="w-full accent-sky-500"
            />
          </div>

          <div>
            <label
              htmlFor="setting-aging-interval"
              className="flex items-center justify-between font-medium text-slate-200 mb-1.5"
            >
              <span>Aging Interval (Waiting Units per Boost)</span>
              <span className="font-mono text-sky-300 tabular-nums">
                {config.aging.intervalUnits} units
              </span>
            </label>
            <input
              id="setting-aging-interval"
              type="range"
              min={2}
              max={10}
              step={1}
              value={config.aging.intervalUnits}
              onChange={(e) =>
                onUpdateAging({ intervalUnits: Number(e.target.value) })
              }
              className="w-full accent-sky-500"
            />
          </div>

          <div>
            <label
              htmlFor="setting-yellow"
              className="flex items-center justify-between font-medium text-slate-200 mb-1.5"
            >
              <span>Yellow Clearance Duration</span>
              <span className="font-mono text-amber-300 tabular-nums">
                {config.yellowDuration.toFixed(1)}s
              </span>
            </label>
            <input
              id="setting-yellow"
              type="range"
              min={0.5}
              max={3.0}
              step={0.5}
              value={config.yellowDuration}
              onChange={(e) =>
                onUpdateConfig({ yellowDuration: Number(e.target.value) })
              }
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <label
              htmlFor="setting-all-red"
              className="flex items-center justify-between font-medium text-slate-200 mb-1.5"
            >
              <span>All-Red Safety Interval</span>
              <span className="font-mono text-rose-300 tabular-nums">
                {config.allRedDuration.toFixed(1)}s
              </span>
            </label>
            <input
              id="setting-all-red"
              type="range"
              min={0.4}
              max={2.4}
              step={0.2}
              value={config.allRedDuration}
              onChange={(e) =>
                onUpdateConfig({ allRedDuration: Number(e.target.value) })
              }
              className="w-full accent-rose-500"
            />
          </div>

          <div>
            <label
              htmlFor="setting-auto-interval"
              className="flex items-center justify-between font-medium text-slate-200 mb-1.5"
            >
              <span>Auto-Traffic Arrival Interval</span>
              <span className="font-mono text-slate-300 tabular-nums">
                Every {config.autoGenerateInterval}u
              </span>
            </label>
            <input
              id="setting-auto-interval"
              type="range"
              min={2}
              max={10}
              step={1}
              value={config.autoGenerateInterval}
              onChange={(e) =>
                onUpdateConfig({ autoGenerateInterval: Number(e.target.value) })
              }
              className="w-full accent-sky-500"
            />
          </div>

          <div>
            <label
              htmlFor="setting-starvation-threshold"
              className="flex items-center justify-between font-medium text-slate-200 mb-1.5"
            >
              <span>Starvation Warning Threshold</span>
              <span className="font-mono text-amber-300 tabular-nums">
                {config.starvationThreshold} units
              </span>
            </label>
            <input
              id="setting-starvation-threshold"
              type="range"
              min={6}
              max={25}
              step={1}
              value={config.starvationThreshold}
              onChange={(e) =>
                onUpdateConfig({ starvationThreshold: Number(e.target.value) })
              }
              className="w-full accent-amber-500"
            />
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4 flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={config.aging.enabled}
              onChange={(e) => onUpdateAging({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500"
            />
            <span>Enable Priority Aging (prevents starvation)</span>
          </label>

          <label className="inline-flex items-center gap-2 text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoGenerateTraffic}
              onChange={(e) =>
                onUpdateConfig({ autoGenerateTraffic: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500"
            />
            <span>Enable Continuous Random Traffic Arrivals</span>
          </label>
        </div>
      </div>
    </div>
  );
};

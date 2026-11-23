import React from 'react';
import {
  Ambulance,
  BookOpen,
  Bus,
  Car,
  Flame,
  Footprints,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Shuffle,
} from 'lucide-react';
import { AlgorithmType, Direction, VehicleType } from '../../types/process';
import { DIRECTIONS } from '../../simulation/trafficGenerator';

interface SimulationControlsProps {
  running: boolean;
  hasStarted: boolean;
  speedMultiplier: 1 | 2 | 5;
  algorithm: AlgorithmType;
  agingEnabled: boolean;
  autoGenerateTraffic: boolean;
  selectedDirection: Direction;
  onSelectDirection: (dir: Direction) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onChangeSpeed: (speed: 1 | 2 | 5) => void;
  onChangeAlgorithm: (algo: AlgorithmType) => void;
  onToggleAging: (enabled: boolean) => void;
  onToggleAutoTraffic: (enabled: boolean) => void;
  onGenerateRandom: () => void;
  onLoadCaseStudy: () => void;
  onAddVehicle: (type: VehicleType) => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  running,
  hasStarted,
  speedMultiplier,
  algorithm,
  agingEnabled,
  autoGenerateTraffic,
  selectedDirection,
  onSelectDirection,
  onStart,
  onPause,
  onResume,
  onReset,
  onChangeSpeed,
  onChangeAlgorithm,
  onToggleAging,
  onToggleAutoTraffic,
  onGenerateRandom,
  onLoadCaseStudy,
  onAddVehicle,
}) => {
  const vehicleButtons: Array<{
    type: VehicleType;
    label: string;
    icon: React.ReactNode;
    accent: string;
  }> = [
    {
      type: 'Normal Vehicle',
      label: 'Add Normal Vehicle',
      icon: <Car className="h-3.5 w-3.5" aria-hidden="true" />,
      accent: 'border-slate-700 hover:border-sky-500/60 hover:bg-slate-800',
    },
    {
      type: 'Heavy Vehicle',
      label: 'Add Heavy Vehicle',
      icon: <Bus className="h-3.5 w-3.5" aria-hidden="true" />,
      accent: 'border-slate-700 hover:border-amber-500/60 hover:bg-slate-800',
    },
    {
      type: 'Ambulance',
      label: 'Add Ambulance',
      icon: <Ambulance className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />,
      accent: 'border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
    },
    {
      type: 'Fire Engine',
      label: 'Add Fire Engine',
      icon: <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />,
      accent: 'border-orange-500/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20',
    },
    {
      type: 'Police Vehicle',
      label: 'Add Police Vehicle',
      icon: <ShieldAlert className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />,
      accent: 'border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20',
    },
    {
      type: 'Pedestrian',
      label: 'Add Pedestrian Request',
      icon: <Footprints className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />,
      accent: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
    },
  ];

  return (
    <section
      aria-label="Simulation and Traffic Controls"
      className="rounded-xl border border-slate-800 bg-[#11192B] p-4 space-y-4"
    >
      {/* Execution & Speed Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <h2 className="font-display text-sm font-semibold text-slate-100">
          Simulation Control
        </h2>
        <div className="flex items-center gap-1 rounded-lg bg-slate-900/90 p-1 border border-slate-800">
          {([1, 2, 5] as const).map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onChangeSpeed(spd)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                speedMultiplier === spd
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={onStart}
          disabled={running}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Start</span>
        </button>

        <button
          type="button"
          onClick={onPause}
          disabled={!running}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Pause</span>
        </button>

        <button
          type="button"
          onClick={onResume}
          disabled={running || !hasStarted}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Resume</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      {/* Dataset & Random Traffic */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onLoadCaseStudy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/25 transition-colors whitespace-nowrap"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Load Case Study Dataset</span>
        </button>

        <button
          type="button"
          onClick={onGenerateRandom}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap"
        >
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Generate Random Traffic</span>
        </button>
      </div>

      {/* Scheduling Algorithm Selector & Toggles */}
      <div className="space-y-2.5 border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-300">
            OS Scheduling Algorithm
          </span>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={agingEnabled}
                onChange={(e) => onToggleAging(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
              />
              <span>Aging</span>
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerateTraffic}
                onChange={(e) => onToggleAutoTraffic(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
              />
              <span>Auto Traffic</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-900/90 p-1 border border-slate-800">
          {(
            [
              { id: 'FCFS', label: 'FCFS' },
              { id: 'PRIORITY', label: 'Priority' },
              { id: 'ROUND_ROBIN', label: 'Round Robin' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeAlgorithm(item.id)}
              className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                algorithm === item.id
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Direction Selector + Manual Vehicle Generator */}
      <div className="space-y-2.5 border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-300">
            Incoming Direction
          </span>
          <div className="flex items-center gap-1 rounded-lg bg-slate-900/90 p-1 border border-slate-800">
            {DIRECTIONS.map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => onSelectDirection(dir)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedDirection === dir
                    ? 'bg-slate-700 text-sky-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {vehicleButtons.map((btn) => (
            <button
              key={btn.type}
              type="button"
              onClick={() => onAddVehicle(btn.type)}
              className={`inline-flex items-center justify-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap ${btn.accent}`}
            >
              {btn.icon}
              <span className="truncate">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

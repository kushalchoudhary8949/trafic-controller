import React from 'react';
import { AlgorithmType } from '../../types/process';
import { LiveSystemMetrics } from '../../utils/metrics';

interface StatusCardsProps {
  metrics: LiveSystemMetrics;
  algorithm: AlgorithmType;
  timeQuantum: number;
}

const ALGO_DISPLAY: Record<AlgorithmType, string> = {
  FCFS: 'FCFS',
  PRIORITY: 'Priority',
  ROUND_ROBIN: 'Round Robin',
};

export const StatusCards: React.FC<StatusCardsProps> = ({
  metrics,
  algorithm,
  timeQuantum,
}) => {
  const cards = [
    {
      label: 'Total Vehicles',
      value: String(metrics.totalVehicles),
      sub: 'Admitted & queued',
      tone: 'text-slate-100',
    },
    {
      label: 'Vehicles Waiting',
      value: String(metrics.vehiclesWaiting),
      sub: 'In Ready / Waiting state',
      tone: metrics.vehiclesWaiting > 0 ? 'text-amber-300' : 'text-slate-100',
    },
    {
      label: 'Vehicles Served',
      value: String(metrics.vehiclesServed),
      sub: 'Completed intersection',
      tone: 'text-emerald-400',
    },
    {
      label: 'Emergency Vehicles',
      value: String(metrics.emergencyVehiclesCount),
      sub: 'Ambulance & Fire requests',
      tone: metrics.emergencyVehiclesCount > 0 ? 'text-rose-400' : 'text-slate-100',
    },
    {
      label: 'Average Waiting Time',
      value: `${metrics.averageWaitingTime.toFixed(2)}u`,
      sub: 'Computed from scheduler',
      tone: 'text-sky-300',
    },
    {
      label: 'Scheduling Algorithm',
      value:
        algorithm === 'ROUND_ROBIN'
          ? `RR (q=${timeQuantum})`
          : ALGO_DISPLAY[algorithm],
      sub:
        algorithm === 'FCFS'
          ? 'FIFO non-preemptive'
          : algorithm === 'PRIORITY'
          ? 'Lowest number = highest'
          : 'Time-sliced circular queue',
      tone: 'text-slate-100',
    },
  ];

  return (
    <section aria-label="System Status Overview" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-800 bg-[#11192B] px-4 py-3.5"
        >
          <p className="text-xs font-medium text-slate-400">{card.label}</p>
          <p
            className={`mt-1.5 font-mono text-2xl font-semibold tracking-tight tabular-nums ${card.tone}`}
          >
            {card.value}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">{card.sub}</p>
        </div>
      ))}
    </section>
  );
};

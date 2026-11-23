import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SimulationState } from '../../types/scheduler';
import { simulateAlgorithmBatch } from '../../utils/calculations';
import { LiveSystemMetrics } from '../../utils/metrics';
import { createCaseStudyDataset } from '../../simulation/trafficGenerator';

interface AnalyticsViewProps {
  state: SimulationState;
  liveMetrics: LiveSystemMetrics;
  onLoadCaseStudy: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  state,
  liveMetrics,
  onLoadCaseStudy,
}) => {
  const datasetForComparison = useMemo(
    () =>
      state.processes.length > 0
        ? state.processes
        : createCaseStudyDataset(),
    [state.processes]
  );

  const comparison = useMemo(() => {
    const q = state.config.timeQuantum;
    return [
      simulateAlgorithmBatch(datasetForComparison, 'FCFS', q),
      simulateAlgorithmBatch(datasetForComparison, 'PRIORITY', q),
      simulateAlgorithmBatch(datasetForComparison, 'ROUND_ROBIN', q),
    ];
  }, [datasetForComparison, state.config.timeQuantum]);

  const barChartData = comparison.map((c) => ({
    name:
      c.algorithm === 'ROUND_ROBIN'
        ? `RR (q=${state.config.timeQuantum})`
        : c.algorithm,
    'Avg Waiting Time': c.averageWaitingTime,
    'Avg Turnaround Time': c.averageTurnaroundTime,
  }));

  const throughputData = comparison.map((c) => ({
    name:
      c.algorithm === 'ROUND_ROBIN'
        ? `RR (q=${state.config.timeQuantum})`
        : c.algorithm,
    Throughput: Number((c.throughput * 10).toFixed(2)), // scaled per 10 sim units for legibility
    rawThroughput: c.throughput,
    totalTime: c.totalCompletionTime,
  }));

  const kpis = [
    {
      label: 'Avg Waiting Time (Live)',
      value: `${liveMetrics.averageWaitingTime.toFixed(2)}u`,
    },
    {
      label: 'Avg Turnaround Time',
      value: `${liveMetrics.averageTurnaroundTime.toFixed(2)}u`,
    },
    {
      label: 'Total Vehicles Served',
      value: String(liveMetrics.vehiclesServed),
    },
    {
      label: 'Avg Queue Length',
      value: liveMetrics.averageQueueLength.toFixed(2),
    },
    {
      label: 'Emergency Response Time',
      value: `${liveMetrics.emergencyResponseTime.toFixed(2)}u`,
    },
    {
      label: 'Completed Processes',
      value: String(liveMetrics.vehiclesServed),
    },
    {
      label: 'Live Throughput',
      value: `${liveMetrics.throughput.toFixed(3)} /u`,
    },
  ];

  const algoRows = [
    {
      name: 'FCFS (First Come First Serve)',
      advantages:
        'Simple FIFO ordering; zero starvation; minimal context-switching overhead.',
      limitations:
        'Convoy effect: heavy traffic with long burst times delays shorter vehicles and urgent requests.',
    },
    {
      name: 'Priority Scheduling',
      advantages:
        'Emergency and high-urgency vehicles receive immediate service; lowers critical response time.',
      limitations:
        'Low-priority normal vehicles and pedestrians can suffer indefinite starvation unless Aging is enabled.',
    },
    {
      name: `Round Robin (q=${state.config.timeQuantum})`,
      advantages:
        'Fair bounded response time across all directions; prevents single-lane monopolization.',
      limitations:
        'Frequent signal phase switching increases yellow/all-red clearance overhead if quantum is too small.',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#11192B] p-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100">
            Performance Analytics & Algorithm Comparison
          </h2>
          <p className="text-xs text-slate-400">
            Dynamically computed from{' '}
            {state.processes.length > 0
              ? `current active workload (${state.processes.length} processes)`
              : 'reference Case Study Dataset (8 processes)'}
          </p>
        </div>
        {state.processes.length === 0 && (
          <button
            type="button"
            onClick={onLoadCaseStudy}
            className="rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
          >
            Load Case Study Dataset
          </button>
        )}
      </div>

      {/* 7 Required Live KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-800 bg-[#11192B] px-3.5 py-3"
          >
            <p className="text-[11px] text-slate-400">{k.label}</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recharts Comparison Visualizations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-[#11192B] p-4">
          <h3 className="font-display text-sm font-semibold text-slate-100 mb-1">
            Waiting Time vs Turnaround Time by Algorithm
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Lower values indicate faster intersection clearance (units)
          </p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="Avg Waiting Time"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="Avg Turnaround Time"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#11192B] p-4">
          <h3 className="font-display text-sm font-semibold text-slate-100 mb-1">
            Vehicle Throughput Comparison
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Vehicles served per 10 simulation time units (higher is better)
          </p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={throughputData}
                margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="Throughput"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: '#f59e0b' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Exact Calculated Summary + Advantages & Limitations Table */}
      <div className="rounded-xl border border-slate-800 bg-[#11192B] p-4 space-y-3">
        <h3 className="font-display text-sm font-semibold text-slate-100">
          Algorithm Trade-offs & Computed Benchmarks
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-[#0D1424] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5 font-medium">Algorithm</th>
                <th className="px-3 py-2.5 font-medium text-right">Avg Wait</th>
                <th className="px-3 py-2.5 font-medium text-right">Avg Turnaround</th>
                <th className="px-3 py-2.5 font-medium text-right">Throughput</th>
                <th className="px-3 py-2.5 font-medium">Advantages</th>
                <th className="px-3 py-2.5 font-medium">Limitations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {comparison.map((c, idx) => (
                <tr key={c.algorithm} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2.5 font-semibold text-slate-100 whitespace-nowrap">
                    {algoRows[idx].name}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-sky-300 tabular-nums">
                    {c.averageWaitingTime.toFixed(2)}u
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-300 tabular-nums">
                    {c.averageTurnaroundTime.toFixed(2)}u
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-amber-300 tabular-nums">
                    {c.throughput.toFixed(3)}/u
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">
                    {algoRows[idx].advantages}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">
                    {algoRows[idx].limitations}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

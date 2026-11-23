import React, { useState } from 'react';
import { EventLogEntry, LogCategory } from '../../types/process';

interface SystemLogsViewProps {
  logs: EventLogEntry[];
  compact?: boolean;
}

const CATEGORY_COLOR: Record<LogCategory, string> = {
  ARRIVAL: 'text-sky-300',
  SCHEDULER: 'text-indigo-300',
  SIGNAL: 'text-emerald-400',
  INTERRUPT: 'text-rose-400 font-semibold',
  AGING: 'text-amber-300',
  SYSTEM: 'text-slate-400',
};

export const SystemLogsView: React.FC<SystemLogsViewProps> = ({
  logs,
  compact = false,
}) => {
  const [category, setCategory] = useState<'ALL' | LogCategory>('ALL');
  const [search, setSearch] = useState('');

  const filtered = [...logs]
    .reverse()
    .filter((entry) => {
      if (category !== 'ALL' && entry.category !== category) return false;
      if (
        search.trim() &&
        !entry.message.toLowerCase().includes(search.trim().toLowerCase()) &&
        !(entry.pid ?? '').toLowerCase().includes(search.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });

  return (
    <section
      aria-label="System Event Logs"
      className="rounded-xl border border-slate-800 bg-[#11192B] p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-100">
            System Event Logs
          </h2>
          <p className="text-xs text-slate-400">
            Real-time events emitted by the OS scheduler, signal controller, and interrupt handler
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PID or event..."
            aria-label="Search event logs"
            className="rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-900/90 p-1 border border-slate-800 w-fit">
          {(
            ['ALL', 'ARRIVAL', 'SCHEDULER', 'SIGNAL', 'INTERRUPT', 'AGING', 'SYSTEM'] as const
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                category === cat
                  ? 'bg-slate-700 text-sky-300'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div
        className={`overflow-y-auto rounded-lg border border-slate-800 bg-[#0B1120] p-3 font-mono text-xs space-y-1.5 ${
          compact ? 'h-[230px]' : 'h-[460px]'
        }`}
      >
        {filtered.length === 0 ? (
          <p className="text-slate-500 font-sans py-4 text-center">
            No matching simulation events recorded yet.
          </p>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2.5 border-b border-slate-800/40 pb-1 last:border-none"
            >
              <span className="text-slate-500 tabular-nums shrink-0">
                [{entry.timestampLabel}]
              </span>
              <span className={`w-20 shrink-0 ${CATEGORY_COLOR[entry.category]}`}>
                {entry.category}
              </span>
              <span className="text-slate-200 font-sans">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

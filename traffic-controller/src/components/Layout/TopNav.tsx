import React, { useState } from 'react';
import { Menu, Pause, Play, TrafficCone, X } from 'lucide-react';

export type NavTabId =
  | 'dashboard'
  | 'live-sim'
  | 'algorithms'
  | 'queue'
  | 'analytics'
  | 'logs'
  | 'concepts'
  | 'settings';

interface TopNavProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  running: boolean;
  hasStarted: boolean;
  onToggleRun: () => void;
}

const NAV_ITEMS: Array<{ id: NavTabId; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'live-sim', label: 'Live Simulation' },
  { id: 'algorithms', label: 'Scheduling Algorithms' },
  { id: 'queue', label: 'Process Queue' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'logs', label: 'System Logs' },
  { id: 'concepts', label: 'OS Concepts' },
  { id: 'settings', label: 'Settings' },
];

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onSelectTab,
  running,
  hasStarted,
  onToggleRun,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#0B1120]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-2 sm:gap-6 px-3 py-3 sm:px-6">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md min-w-0"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
            <TrafficCone className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-sm sm:text-base font-semibold tracking-tight text-slate-100 truncate">
            Smart Traffic Controller
          </span>
        </button>

        {/* Zone 2: Single-line Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="hidden xl:flex items-center gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  isActive
                    ? 'bg-slate-800 text-sky-300'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Simulation Control + Mobile Menu Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleRun}
            aria-label={
              running
                ? 'Pause Simulation'
                : hasStarted
                ? 'Resume Simulation'
                : 'Start Simulation'
            }
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 sm:px-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              running
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
            }`}
          >
            {running ? (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  Pause<span className="hidden sm:inline"> Simulation</span>
                </span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {hasStarted ? 'Resume' : 'Start'}
                  <span className="hidden sm:inline"> Simulation</span>
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="xl:hidden inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Responsive tablet/mobile nav drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="xl:hidden border-t border-slate-800 bg-[#0B1120] px-4 py-2.5 flex flex-wrap gap-1.5"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-sky-300'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
};

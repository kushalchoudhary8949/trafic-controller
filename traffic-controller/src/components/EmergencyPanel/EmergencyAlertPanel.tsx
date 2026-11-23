import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { EmergencyInterruptState } from '../../types/process';
import { SignalControllerState } from '../../types/vehicle';

interface EmergencyAlertPanelProps {
  emergency: EmergencyInterruptState;
  signalState: SignalControllerState;
  emergenciesServedCount: number;
}

export const EmergencyAlertPanel: React.FC<EmergencyAlertPanelProps> = ({
  emergency,
  signalState,
  emergenciesServedCount,
}) => {
  const isActive = emergency.active;

  return (
    <section
      aria-label="Emergency Interrupt Panel"
      data-testid="emergency-panel"
      className={`rounded-xl border p-4 transition-colors ${
        isActive
          ? 'border-rose-500/60 bg-rose-950/25'
          : 'border-slate-800 bg-[#11192B]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          {isActive ? (
            <AlertTriangle className="h-4 w-4 text-rose-400" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          )}
          <h2 className="font-display text-sm font-semibold text-slate-100">
            Emergency Interrupt Monitor
          </h2>
        </div>
        <span
          className={`font-mono text-xs font-semibold ${
            isActive ? 'text-rose-300' : 'text-emerald-400'
          }`}
        >
          {isActive ? emergency.status.replace(/_/g, ' ') : 'STANDBY'}
        </span>
      </div>

      {isActive ? (
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-rose-200/70">Emergency Vehicle ID</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-rose-100">
              {emergency.emergencyPid}
            </dd>
          </div>
          <div>
            <dt className="text-rose-200/70">Emergency Type</dt>
            <dd className="mt-0.5 font-medium text-rose-100">
              {emergency.emergencyType}
            </dd>
          </div>
          <div>
            <dt className="text-rose-200/70">Incoming Direction</dt>
            <dd className="mt-0.5 font-medium text-rose-100">
              {emergency.direction}
            </dd>
          </div>
          <div>
            <dt className="text-rose-200/70">Interrupt Time</dt>
            <dd className="mt-0.5 font-mono text-rose-100 tabular-nums">
              t = {emergency.interruptTime}u
            </dd>
          </div>
          <div>
            <dt className="text-rose-200/70">Current Traffic Phase</dt>
            <dd className="mt-0.5 font-mono text-rose-100">
              {signalState.phaseMode.replace(/_/g, ' ')}
            </dd>
          </div>
          <div>
            <dt className="text-rose-200/70">Saved Normal Process</dt>
            <dd className="mt-0.5 font-mono text-rose-100">
              {emergency.savedProcessPid
                ? `${emergency.savedProcessPid} (${emergency.savedDirection})`
                : 'None (Idle)'}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <p>
            No active emergency interrupt. Ambulance or Fire Engine arrivals
            trigger safe Yellow/All-Red preemption automatically.
          </p>
          <span className="font-mono text-slate-300 tabular-nums">
            Emergencies served: {emergenciesServedCount}
          </span>
        </div>
      )}
    </section>
  );
};

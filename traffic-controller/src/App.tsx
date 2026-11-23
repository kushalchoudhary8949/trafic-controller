import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlgorithmType, Direction, VehicleType } from './types/process';
import { SimulationConfig, SimulationState } from './types/scheduler';
import {
  addManualVehicleToState,
  advanceSimulation,
  createDefaultConfig,
  createInitialSimulationState,
  loadCaseStudyIntoState,
  resetSimulationState,
  startStarvationDemoInState,
} from './simulation/simulationEngine';
import { generateRandomVehicleProcess } from './simulation/trafficGenerator';
import { computeLiveSystemMetrics } from './utils/metrics';
import { TopNav, NavTabId } from './components/Layout/TopNav';
import { StatusCards } from './components/Dashboard/StatusCards';
import { LiveSystemInfo } from './components/Dashboard/LiveSystemInfo';
import { SimulationControls } from './components/Dashboard/SimulationControls';
import { IntersectionCanvas } from './components/TrafficIntersection/IntersectionCanvas';
import { EmergencyAlertPanel } from './components/EmergencyPanel/EmergencyAlertPanel';
import { ProcessQueueView } from './components/ProcessQueue/ProcessQueueView';
import { GanttChartPanel } from './components/GanttChart/GanttChartPanel';
import { StarvationDemoPanel } from './components/Algorithms/StarvationDemoPanel';
import { AnalyticsView } from './components/Analytics/AnalyticsView';
import { SystemLogsView } from './components/EventLogs/SystemLogsView';
import { OsConceptsView } from './components/Concepts/OsConceptsView';
import { SettingsView } from './components/Settings/SettingsView';

export default function App() {
  const [simState, setSimState] = useState<SimulationState>(() =>
    createInitialSimulationState()
  );
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [selectedDirection, setSelectedDirection] = useState<Direction>('North');

  // Centralized deterministic simulation clock loop
  const runningRef = useRef(simState.running);
  runningRef.current = simState.running;

  useEffect(() => {
    let rafId = 0;
    let lastTimestamp = performance.now();
    let accumulated = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      if (runningRef.current) {
        accumulated += dt;
        // Update at ~12.5Hz for responsive UI and smooth canvas motion without DOM thrashing
        if (accumulated >= 0.08) {
          const stepDt = accumulated;
          accumulated = 0;
          setSimState((prev) => advanceSimulation(prev, stepDt));
        }
      } else {
        accumulated = 0;
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const liveMetrics = useMemo(() => computeLiveSystemMetrics(simState), [simState]);

  const handleStart = useCallback(() => {
    setSimState((prev) => ({
      ...prev,
      running: true,
      hasStarted: true,
    }));
  }, []);

  const handlePause = useCallback(() => {
    setSimState((prev) => ({
      ...prev,
      running: false,
    }));
  }, []);

  const handleResume = useCallback(() => {
    setSimState((prev) => ({
      ...prev,
      running: true,
      hasStarted: true,
    }));
  }, []);

  const handleToggleRun = useCallback(() => {
    setSimState((prev) => ({
      ...prev,
      running: !prev.running,
      hasStarted: true,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setSimState((prev) => resetSimulationState(prev.config));
  }, []);

  const handleChangeSpeed = useCallback((speedMultiplier: 1 | 2 | 5) => {
    setSimState((prev) => ({
      ...prev,
      config: { ...prev.config, speedMultiplier },
    }));
  }, []);

  const handleChangeAlgorithm = useCallback((algorithm: AlgorithmType) => {
    setSimState((prev) => ({
      ...prev,
      config: { ...prev.config, algorithm },
      logs: [
        ...prev.logs,
        {
          id: `algo-${Date.now()}`,
          simTime: Math.floor(prev.simTime),
          timestampLabel: `${String(Math.floor(prev.simTime / 60)).padStart(2, '0')}:${String(
            Math.floor(prev.simTime) % 60
          ).padStart(2, '0')}`,
          category: 'SYSTEM' as const,
          message: `Switched scheduling algorithm to ${algorithm.replace('_', ' ')}.`,
        },
      ].slice(-250),
    }));
  }, []);

  const handleToggleAging = useCallback((enabled: boolean) => {
    setSimState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        aging: { ...prev.config.aging, enabled },
      },
      logs: [
        ...prev.logs,
        {
          id: `aging-toggle-${Date.now()}`,
          simTime: Math.floor(prev.simTime),
          timestampLabel: `${String(Math.floor(prev.simTime / 60)).padStart(2, '0')}:${String(
            Math.floor(prev.simTime) % 60
          ).padStart(2, '0')}`,
          category: 'AGING' as const,
          message: `Priority Aging ${enabled ? 'ENABLED' : 'DISABLED'}.`,
        },
      ].slice(-250),
    }));
  }, []);

  const handleToggleAutoTraffic = useCallback((autoGenerateTraffic: boolean) => {
    setSimState((prev) => ({
      ...prev,
      config: { ...prev.config, autoGenerateTraffic },
    }));
  }, []);

  const handleAddVehicle = useCallback(
    (vehicleType: VehicleType) => {
      setSimState((prev) => {
        const next = addManualVehicleToState(prev, vehicleType, selectedDirection);
        return {
          ...next,
          running: prev.hasStarted ? prev.running : true,
          hasStarted: true,
        };
      });
    },
    [selectedDirection]
  );

  const handleGenerateRandom = useCallback(() => {
    setSimState((prev) => {
      const sample = generateRandomVehicleProcess(
        prev.nextPidNumber,
        Math.floor(prev.simTime),
        Math.floor(prev.simTime)
      );
      const next = addManualVehicleToState(
        prev,
        sample.vehicleType,
        sample.direction,
        sample.priority,
        sample.burstTime
      );
      return {
        ...next,
        running: prev.hasStarted ? prev.running : true,
        hasStarted: true,
      };
    });
  }, []);

  const handleLoadCaseStudy = useCallback(() => {
    setSimState((prev) => loadCaseStudyIntoState(prev, true));
  }, []);

  const handleStartStarvationDemo = useCallback((agingEnabled: boolean) => {
    setSimState((prev) => startStarvationDemoInState(prev, agingEnabled));
  }, []);

  const handleUpdateConfig = useCallback((partial: Partial<SimulationConfig>) => {
    setSimState((prev) => ({
      ...prev,
      config: { ...prev.config, ...partial },
      signalState: {
        ...prev.signalState,
        yellowDuration: partial.yellowDuration ?? prev.signalState.yellowDuration,
        allRedDuration: partial.allRedDuration ?? prev.signalState.allRedDuration,
      },
    }));
  }, []);

  const handleUpdateAging = useCallback(
    (partial: Partial<SimulationConfig['aging']>) => {
      setSimState((prev) => ({
        ...prev,
        config: {
          ...prev.config,
          aging: { ...prev.config.aging, ...partial },
        },
      }));
    },
    []
  );

  const handleResetDefaults = useCallback(() => {
    const defaults = createDefaultConfig();
    setSimState((prev) => ({
      ...prev,
      config: defaults,
      signalState: {
        ...prev.signalState,
        yellowDuration: defaults.yellowDuration,
        allRedDuration: defaults.allRedDuration,
      },
    }));
  }, []);

  return (
    <div className="min-h-screen bg-[#090E1A] text-slate-100 flex flex-col">
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        running={simState.running}
        hasStarted={simState.hasStarted}
        onToggleRun={handleToggleRun}
      />

      <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-5 sm:px-6 space-y-4">
        {/* Global Status Cards visible on Dashboard */}
        {activeTab === 'dashboard' && (
          <>
            <StatusCards
              metrics={liveMetrics}
              algorithm={simState.config.algorithm}
              timeQuantum={simState.config.timeQuantum}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
              {/* Left Primary Stage: 4-Way Intersection + Gantt */}
              <div className="lg:col-span-7 space-y-4">
                <IntersectionCanvas
                  vehicles={simState.vehicles}
                  signalState={simState.signalState}
                  emergency={simState.emergency}
                  runningPid={simState.runningPid}
                  processes={simState.processes}
                  simTime={simState.simTime}
                />

                <GanttChartPanel
                  liveSlices={simState.ganttSlices}
                  processes={simState.processes}
                  activeAlgorithm={simState.config.algorithm}
                  runningPid={simState.runningPid}
                  timeQuantum={simState.config.timeQuantum}
                  onSelectAlgorithm={handleChangeAlgorithm}
                />
              </div>

              {/* Right Control & Telemetry Deck */}
              <div className="lg:col-span-5 space-y-4">
                <SimulationControls
                  running={simState.running}
                  hasStarted={simState.hasStarted}
                  speedMultiplier={simState.config.speedMultiplier}
                  algorithm={simState.config.algorithm}
                  agingEnabled={simState.config.aging.enabled}
                  autoGenerateTraffic={simState.config.autoGenerateTraffic}
                  selectedDirection={selectedDirection}
                  onSelectDirection={setSelectedDirection}
                  onStart={handleStart}
                  onPause={handlePause}
                  onResume={handleResume}
                  onReset={handleReset}
                  onChangeSpeed={handleChangeSpeed}
                  onChangeAlgorithm={handleChangeAlgorithm}
                  onToggleAging={handleToggleAging}
                  onToggleAutoTraffic={handleToggleAutoTraffic}
                  onGenerateRandom={handleGenerateRandom}
                  onLoadCaseStudy={handleLoadCaseStudy}
                  onAddVehicle={handleAddVehicle}
                />

                <LiveSystemInfo state={simState} />

                <EmergencyAlertPanel
                  emergency={simState.emergency}
                  signalState={simState.signalState}
                  emergenciesServedCount={simState.emergenciesServedCount}
                />

                <SystemLogsView logs={simState.logs} compact />
              </div>
            </div>

            <ProcessQueueView
              processes={simState.processes}
              readyQueue={simState.readyQueue}
              runningPid={simState.runningPid}
              compact
            />
          </>
        )}

        {activeTab === 'live-sim' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7">
              <IntersectionCanvas
                vehicles={simState.vehicles}
                signalState={simState.signalState}
                emergency={simState.emergency}
                runningPid={simState.runningPid}
                processes={simState.processes}
                simTime={simState.simTime}
                expanded
              />
            </div>
            <div className="lg:col-span-5 space-y-4">
              <SimulationControls
                running={simState.running}
                hasStarted={simState.hasStarted}
                speedMultiplier={simState.config.speedMultiplier}
                algorithm={simState.config.algorithm}
                agingEnabled={simState.config.aging.enabled}
                autoGenerateTraffic={simState.config.autoGenerateTraffic}
                selectedDirection={selectedDirection}
                onSelectDirection={setSelectedDirection}
                onStart={handleStart}
                onPause={handlePause}
                onResume={handleResume}
                onReset={handleReset}
                onChangeSpeed={handleChangeSpeed}
                onChangeAlgorithm={handleChangeAlgorithm}
                onToggleAging={handleToggleAging}
                onToggleAutoTraffic={handleToggleAutoTraffic}
                onGenerateRandom={handleGenerateRandom}
                onLoadCaseStudy={handleLoadCaseStudy}
                onAddVehicle={handleAddVehicle}
              />
              <LiveSystemInfo state={simState} />
              <EmergencyAlertPanel
                emergency={simState.emergency}
                signalState={simState.signalState}
                emergenciesServedCount={simState.emergenciesServedCount}
              />
            </div>
          </div>
        )}

        {activeTab === 'algorithms' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#11192B] p-4">
              <div>
                <h1 className="font-display text-base font-semibold text-slate-100">
                  OS Scheduling Algorithms, Gantt Visualization & Starvation Lab
                </h1>
                <p className="text-xs text-slate-400">
                  Switch between FCFS, Priority Scheduling, and Round Robin (q={simState.config.timeQuantum}) or run the Starvation & Aging experiment
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadCaseStudy}
                  className="rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/25"
                >
                  Load Case Study Dataset
                </button>
              </div>
            </div>

            <GanttChartPanel
              liveSlices={simState.ganttSlices}
              processes={simState.processes}
              activeAlgorithm={simState.config.algorithm}
              runningPid={simState.runningPid}
              timeQuantum={simState.config.timeQuantum}
              onSelectAlgorithm={handleChangeAlgorithm}
            />

            <StarvationDemoPanel
              state={simState}
              onStartStarvationDemo={handleStartStarvationDemo}
              onToggleAging={handleToggleAging}
            />

            <ProcessQueueView
              processes={simState.processes}
              readyQueue={simState.readyQueue}
              runningPid={simState.runningPid}
            />
          </div>
        )}

        {activeTab === 'queue' && (
          <ProcessQueueView
            processes={simState.processes}
            readyQueue={simState.readyQueue}
            runningPid={simState.runningPid}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            state={simState}
            liveMetrics={liveMetrics}
            onLoadCaseStudy={handleLoadCaseStudy}
          />
        )}

        {activeTab === 'logs' && <SystemLogsView logs={simState.logs} />}

        {activeTab === 'concepts' && <OsConceptsView state={simState} />}

        {activeTab === 'settings' && (
          <SettingsView
            config={simState.config}
            onUpdateConfig={handleUpdateConfig}
            onUpdateAging={handleUpdateAging}
            onResetDefaults={handleResetDefaults}
          />
        )}
      </main>
    </div>
  );
}

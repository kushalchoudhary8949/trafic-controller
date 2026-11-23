import React from 'react';
import { SimulationState } from '../../types/scheduler';

interface OsConceptsViewProps {
  state: SimulationState;
}

export const OsConceptsView: React.FC<OsConceptsViewProps> = ({ state }) => {
  const runningProc = state.runningPid
    ? state.processes.find((p) => p.pid === state.runningPid) ?? null
    : null;
  const readyProcs = state.processes.filter(
    (p) => p.state === 'Ready' || p.state === 'Waiting'
  );
  const completedProcs = state.processes.filter((p) => p.state === 'Completed');
  const agedProc = state.processes.find((p) => p.agingBoosts > 0) ?? null;
  const emergencyProc = state.processes.find((p) => p.isEmergency) ?? null;
  const starvingProc =
    [...readyProcs].sort((a, b) => b.waitingTime - a.waitingTime)[0] ?? null;

  const concepts = [
    {
      title: '01. Process',
      definition: 'An independent program in execution with its own state, resources, and PCB (Process Control Block).',
      osMechanism:
        'The OS tracks each process with PID, arrival time, CPU burst, priority, and execution state.',
      trafficMapping:
        'Each incoming vehicle or pedestrian crossing request is modeled as a TrafficProcess with PID, direction, burst time, and priority.',
      liveExample:
        state.processes[0]
          ? `${state.processes[0].pid}: ${state.processes[0].vehicleType} from ${state.processes[0].direction} (Burst ${state.processes[0].burstTime}u, State: ${state.processes[0].state})`
          : 'Add a vehicle to instantiate a new process.',
    },
    {
      title: '02. Process Scheduling',
      definition:
        'The OS mechanism that decides which ready process gets access to the CPU next.',
      osMechanism:
        'A scheduler inspects the ready queue and dispatches one process according to a scheduling policy.',
      trafficMapping:
        'The intersection box is the single shared CPU core; only one non-conflicting traffic movement can occupy it safely at a time.',
      liveExample: `Active policy: ${state.config.algorithm} · Dispatched ${state.ganttSlices.length} execution slices so far.`,
    },
    {
      title: '03. Ready Queue',
      definition:
        'A data structure holding all admitted processes waiting for CPU execution.',
      osMechanism:
        'Newly arrived or preempted processes enter the Ready Queue until selected by the dispatcher.',
      trafficMapping:
        'Vehicles queued behind the white stop lines on North, South, East, and West approaches.',
      liveExample:
        state.readyQueue.length > 0
          ? `Currently queued (${state.readyQueue.length}): ${state.readyQueue.join(', ')}`
          : 'Ready queue is currently empty.',
    },
    {
      title: '04. Running Process',
      definition:
        'The single process currently executing instructions on the CPU.',
      osMechanism:
        'Its remaining burst time decrements each tick until completion, quantum expiry, or preemption.',
      trafficMapping:
        'The vehicle (or pedestrian group) whose approach currently holds the GREEN signal and is crossing the intersection.',
      liveExample: runningProc
        ? `${runningProc.pid} (${runningProc.vehicleType}) crossing from ${runningProc.direction} · Remaining: ${runningProc.remainingTime}u`
        : 'Intersection is idle or in safety clearance.',
    },
    {
      title: '05. FCFS (First Come First Serve)',
      definition:
        'Non-preemptive scheduling where processes execute strictly in arrival order (FIFO).',
      osMechanism:
        'The head of the FIFO queue runs to completion before the next process starts.',
      trafficMapping:
        'Vehicles pass strictly in the order they arrived at the intersection, regardless of vehicle size or urgency.',
      liveExample:
        'In the Case Study Dataset, FCFS runs P1 -> P2 -> P3 -> P4 -> P5 -> P6 -> P7 -> P8.',
    },
    {
      title: '06. Priority Scheduling',
      definition:
        'Scheduling algorithm that selects the eligible process with the highest priority rank.',
      osMechanism:
        'Lower numerical priority values (e.g., 1) take precedence over higher numbers (e.g., 5).',
      trafficMapping:
        'Ambulances & Fire Engines (P1/P2) outrank Normal Vehicles (P3), Heavy Vehicles (P4), and Pedestrians (P5).',
      liveExample:
        readyProcs.length > 0
          ? `Highest-priority waiting request: ${
              [...readyProcs].sort((a, b) => a.priority - b.priority)[0].pid
            } (Priority ${
              [...readyProcs].sort((a, b) => a.priority - b.priority)[0].priority
            })`
          : 'Waiting queue has no pending processes.',
    },
    {
      title: '07. Round Robin',
      definition:
        'Preemptive time-sliced scheduling giving each ready process an equal fixed time quantum.',
      osMechanism:
        'If a process does not finish within its quantum, it is preempted and appended to the end of the circular queue.',
      trafficMapping:
        `Each vehicle phase receives ${state.config.timeQuantum} simulation units before yielding cleanly to the next lane.`,
      liveExample: `Configured Time Quantum = ${state.config.timeQuantum} units.`,
    },
    {
      title: '08. Interrupt',
      definition:
        'An asynchronous hardware or software signal alerting the CPU to an urgent event requiring immediate attention.',
      osMechanism:
        'The CPU suspends normal execution, invokes an Interrupt Service Routine (ISR), and handles the urgent request.',
      trafficMapping:
        'An incoming Ambulance or Fire Engine triggers an Emergency Interrupt in the signal controller.',
      liveExample: state.emergency.active
        ? `ACTIVE INTERRUPT: ${state.emergency.emergencyPid} (${state.emergency.emergencyType}) from ${state.emergency.direction}`
        : emergencyProc
        ? `Emergency request ${emergencyProc.pid} (${emergencyProc.vehicleType}) processed in this run.`
        : 'Click "Add Ambulance" or "Add Fire Engine" to trigger a live interrupt.',
    },
    {
      title: '09. Context Switching',
      definition:
        'Saving the state of the currently running process and loading the saved state of another process.',
      osMechanism:
        'The PCB stores remaining burst time and execution state so the interrupted task can resume seamlessly later.',
      trafficMapping:
        'Saving the interrupted traffic phase and transitioning safely through Yellow and All-Red intervals before giving another road Green.',
      liveExample: `Signal controller phase: ${state.signalState.phaseMode.replace(/_/g, ' ')}`,
    },
    {
      title: '10. Preemption',
      definition:
        'Forcibly interrupting a running process before completion so a higher-priority task can run.',
      osMechanism:
        'The preempted process returns to Ready state with its remaining burst time preserved.',
      trafficMapping:
        'When an Ambulance arrives while a normal car has Green, the normal signal turns Yellow -> All-Red and yields.',
      liveExample: state.emergency.savedProcessPid
        ? `Preempted ${state.emergency.savedProcessPid} (${state.emergency.savedDirection}) safely for emergency.`
        : 'No active preemption at this instant.',
    },
    {
      title: '11. Starvation',
      definition:
        'Indefinite blocking where a low-priority process waits perpetually because higher-priority requests keep arriving.',
      osMechanism:
        'In static priority queues, continuous high-priority arrivals starve low-priority tasks.',
      trafficMapping:
        'A Priority-5 pedestrian or normal vehicle stays stuck at a red light while repeated emergency vehicles pass.',
      liveExample: starvingProc
        ? `Longest waiting queued process: ${starvingProc.pid} (Wait: ${starvingProc.waitingTime}u, Priority: ${starvingProc.priority})`
        : 'Use the Starvation Demonstration panel to simulate indefinite blocking.',
    },
    {
      title: '12. Aging',
      definition:
        'Gradually increasing the priority of processes that wait in the ready queue for long periods.',
      osMechanism:
        `Every ${state.config.aging.intervalUnits} waiting units, priority improves by 1 (5 -> 4 -> 3 -> 2 -> 1).`,
      trafficMapping:
        'Ensures normal vehicles and pedestrians eventually reach top priority and cross safely.',
      liveExample: agedProc
        ? `${agedProc.pid} aged from P${agedProc.initialPriority} -> P${agedProc.priority} (+${agedProc.agingBoosts} boosts)`
        : `Aging is currently ${state.config.aging.enabled ? 'ENABLED' : 'DISABLED'}.`,
    },
    {
      title: '13. Real-Time Scheduling',
      definition:
        'Scheduling constrained by strict timing deadlines and safety invariants where correctness depends on timely response.',
      osMechanism:
        'Hard safety invariants and bounded interrupt response latency prevent catastrophic collisions.',
      trafficMapping:
        'Conflicting perpendicular approaches (N/S vs E/W) can NEVER simultaneously receive Green signals.',
      liveExample: `Emergencies served: ${state.emergenciesServedCount} · Safety invariant: VERIFIED (no conflicting Greens).`,
    },
    {
      title: '14. Process Termination',
      definition:
        'Releasing a process from the active scheduler once its burst reaches zero and recording final accounting metrics.',
      osMechanism:
        'Completion Time, Turnaround Time (CT - AT), and Waiting Time (TAT - BT) are finalized and resources freed.',
      trafficMapping:
        'Vehicle clears the intersection exit and leaves the simulation canvas.',
      liveExample:
        completedProcs.length > 0
          ? `Latest completed: ${completedProcs[completedProcs.length - 1].pid} (CT ${completedProcs[completedProcs.length - 1].completionTime}u, TAT ${completedProcs[completedProcs.length - 1].turnaroundTime}u)`
          : 'No completed processes yet.',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-[#11192B] p-4">
        <h2 className="font-display text-base font-semibold text-slate-100">
          Operating Systems Concepts in Action
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Every core Operating System principle mapped directly to live state inside the Smart Traffic Signal Controller.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {concepts.map((c) => (
          <article
            key={c.title}
            className="rounded-xl border border-slate-800 bg-[#11192B] p-4 space-y-2.5"
          >
            <h3 className="font-display text-sm font-semibold text-sky-300">
              {c.title}
            </h3>
            <div className="space-y-1.5 text-xs">
              <p className="text-slate-200">
                <span className="font-semibold text-slate-400">Definition: </span>
                {c.definition}
              </p>
              <p className="text-slate-300">
                <span className="font-semibold text-slate-400">In an OS: </span>
                {c.osMechanism}
              </p>
              <p className="text-slate-300">
                <span className="font-semibold text-slate-400">In Simulator: </span>
                {c.trafficMapping}
              </p>
              <p className="rounded-lg border border-slate-800 bg-[#0B1120] px-2.5 py-1.5 font-mono text-[11px] text-emerald-300">
                Live: {c.liveExample}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

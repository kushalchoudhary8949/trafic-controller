import React, { useEffect, useRef } from 'react';
import { Direction, EmergencyInterruptState, TrafficProcess } from '../../types/process';
import { SignalControllerState, SimVehicle } from '../../types/vehicle';
import { STOP_LINE_DIST } from '../../simulation/vehicleManager';

interface IntersectionCanvasProps {
  vehicles: SimVehicle[];
  signalState: SignalControllerState;
  emergency: EmergencyInterruptState;
  runningPid: string | null;
  processes: TrafficProcess[];
  simTime: number;
  expanded?: boolean;
}

function getVehicleCoords(v: SimVehicle): { x: number; y: number; angle: number } {
  switch (v.direction) {
    case 'North':
      // Moving south (downward) on viewer's left incoming lane
      return {
        x: 355 - v.laneOffset,
        y: v.distanceAlongLane,
        angle: Math.PI / 2,
      };
    case 'South':
      // Moving north (upward) on viewer's right incoming lane
      return {
        x: 445 + v.laneOffset,
        y: 800 - v.distanceAlongLane,
        angle: -Math.PI / 2,
      };
    case 'West':
      // Moving east (rightward) on viewer's bottom incoming lane
      return {
        x: v.distanceAlongLane,
        y: 445 + v.laneOffset,
        angle: 0,
      };
    case 'East':
      // Moving west (leftward) on viewer's top incoming lane
      return {
        x: 800 - v.distanceAlongLane,
        y: 355 - v.laneOffset,
        angle: Math.PI,
      };
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  v: SimVehicle,
  isRunning: boolean,
  simTime: number
) {
  if (v.vehicleType === 'Pedestrian') return;

  const { x, y, angle } = getVehicleCoords(v);
  const halfL = v.length / 2;
  const halfW = v.width / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Subtle shadow
  ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
  drawRoundedRect(ctx, -halfL + 2, -halfW + 3, v.length, v.width, 5);
  ctx.fill();

  // Active running ring highlight
  if (isRunning) {
    ctx.strokeStyle = v.isEmergency ? '#fb7185' : '#38bdf8';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, -halfL - 3, -halfW - 3, v.length + 6, v.width + 6, 7);
    ctx.stroke();
  }

  // Body color by vehicle type
  let bodyColor = '#3b82f6';
  let roofColor = '#60a5fa';
  if (v.vehicleType === 'Normal Vehicle') {
    bodyColor = '#0284c7';
    roofColor = '#38bdf8';
  } else if (v.vehicleType === 'Heavy Vehicle') {
    bodyColor = '#d97706';
    roofColor = '#f59e0b';
  } else if (v.vehicleType === 'Ambulance') {
    bodyColor = '#f8fafc';
    roofColor = '#e2e8f0';
  } else if (v.vehicleType === 'Fire Engine') {
    bodyColor = '#dc2626';
    roofColor = '#ef4444';
  } else if (v.vehicleType === 'Police Vehicle') {
    bodyColor = '#1e293b';
    roofColor = '#f8fafc';
  }

  // Chassis
  ctx.fillStyle = bodyColor;
  drawRoundedRect(ctx, -halfL, -halfW, v.length, v.width, 5);
  ctx.fill();

  // Roof / Cabin detail
  ctx.fillStyle = roofColor;
  if (v.vehicleType === 'Heavy Vehicle') {
    drawRoundedRect(ctx, -halfL + 4, -halfW + 3, v.length - 16, v.width - 6, 3);
    ctx.fill();
  } else if (v.vehicleType === 'Fire Engine') {
    drawRoundedRect(ctx, -halfL + 4, -halfW + 3, v.length - 14, v.width - 6, 2);
    ctx.fill();
    // Ladder bars
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-halfL + 7, -3);
    ctx.lineTo(halfL - 12, -3);
    ctx.moveTo(-halfL + 7, 3);
    ctx.lineTo(halfL - 12, 3);
    ctx.stroke();
  } else if (v.vehicleType === 'Ambulance') {
    drawRoundedRect(ctx, -halfL + 3, -halfW + 2, v.length - 12, v.width - 4, 3);
    ctx.fill();
    // Red medical cross
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(-6, -1.5, 8, 3);
    ctx.fillRect(-3.5, -4, 3, 8);
  } else if (v.vehicleType === 'Police Vehicle') {
    drawRoundedRect(ctx, -halfL + 8, -halfW + 3, v.length - 18, v.width - 6, 3);
    ctx.fill();
  } else {
    drawRoundedRect(ctx, -halfL + 7, -halfW + 3, v.length - 16, v.width - 6, 3);
    ctx.fill();
  }

  // Front windshield
  ctx.fillStyle = '#0f172a';
  drawRoundedRect(ctx, halfL - 10, -halfW + 3, 6, v.width - 6, 2);
  ctx.fill();

  // Headlights
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(halfL - 2, -halfW + 3, 2, 4);
  ctx.fillRect(halfL - 2, halfW - 7, 2, 4);

  // Brake lights when stopped
  if (v.speed < 4) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-halfL, -halfW + 3, 2.5, 4.5);
    ctx.fillRect(-halfL, halfW - 7.5, 2.5, 4.5);
  }

  // Emergency roof flashers (Ambulance, Fire Engine, Police)
  if (v.isEmergency || v.vehicleType === 'Police Vehicle') {
    const flash = Math.floor(simTime * 8) % 2 === 0;
    ctx.fillStyle = flash ? '#ef4444' : '#38bdf8';
    ctx.fillRect(-2, -halfW + 4, 4, 5);
    ctx.fillStyle = flash ? '#38bdf8' : '#ef4444';
    ctx.fillRect(-2, halfW - 9, 4, 5);
  }

  ctx.restore();

  // Upright PID badge above vehicle
  ctx.save();
  ctx.font = '600 10px "JetBrains Mono", monospace';
  const label = `${v.pid}·P${v.priority}`;
  const textW = ctx.measureText(label).width;
  const badgeW = textW + 8;
  const badgeH = 15;
  const bx = x - badgeW / 2;
  const by = y - 24;

  ctx.fillStyle = v.isEmergency
    ? 'rgba(159, 18, 57, 0.92)'
    : isRunning
    ? 'rgba(2, 132, 199, 0.92)'
    : 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = v.isEmergency
    ? '#fb7185'
    : isRunning
    ? '#38bdf8'
    : '#334155';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, bx, by, badgeW, badgeH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, by + badgeH / 2 + 0.5);
  ctx.restore();
}

function drawTrafficSignalHousing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  activeColor: 'RED' | 'YELLOW' | 'GREEN',
  orientation: 'H' | 'V'
) {
  ctx.save();
  const w = orientation === 'V' ? 24 : 58;
  const h = orientation === 'V' ? 58 : 24;

  ctx.fillStyle = '#090e1a';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, x - w / 2, y - h / 2, w, h, 6);
  ctx.fill();
  ctx.stroke();

  const colors: Array<'RED' | 'YELLOW' | 'GREEN'> = ['RED', 'YELLOW', 'GREEN'];
  const hexMap = {
    RED: { on: '#ef4444', glow: 'rgba(239, 68, 68, 0.45)', off: '#3f1d22' },
    YELLOW: { on: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)', off: '#3f2e15' },
    GREEN: { on: '#10b981', glow: 'rgba(16, 185, 129, 0.45)', off: '#123326' },
  };

  colors.forEach((c, idx) => {
    const offset = (idx - 1) * 16;
    const lx = orientation === 'V' ? x : x + offset;
    const ly = orientation === 'V' ? y + offset : y;
    const isLit = activeColor === c;

    if (isLit) {
      ctx.beginPath();
      ctx.arc(lx, ly, 9, 0, Math.PI * 2);
      ctx.fillStyle = hexMap[c].glow;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(lx, ly, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = isLit ? hexMap[c].on : hexMap[c].off;
    ctx.fill();
  });

  // Direction label tag
  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (orientation === 'V') {
    ctx.fillText(label, x, y - h / 2 - 9);
  } else {
    ctx.fillText(label, x - w / 2 - 12, y);
  }
  ctx.restore();
}

export const IntersectionCanvas: React.FC<IntersectionCanvasProps> = ({
  vehicles,
  signalState,
  emergency,
  runningPid,
  processes,
  simTime,
  expanded = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalSize = 800;
    if (canvas.width !== logicalSize * dpr || canvas.height !== logicalSize * dpr) {
      canvas.width = logicalSize * dpr;
      canvas.height = logicalSize * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Dark urban city blocks background
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, 800, 800);

    // Subtle city block quadrants with urban grid pads
    const blocks = [
      { x: 18, y: 18, w: 274, h: 274 },
      { x: 508, y: 18, w: 274, h: 274 },
      { x: 18, y: 508, w: 274, h: 274 },
      { x: 508, y: 508, w: 274, h: 274 },
    ];
    for (const b of blocks) {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, b.x, b.y, b.w, b.h, 14);
      ctx.fill();
      ctx.stroke();

      // Subtle architectural roof inset inside each city quadrant
      ctx.fillStyle = '#131d33';
      drawRoundedRect(ctx, b.x + 24, b.y + 24, b.w - 48, b.h - 48, 8);
      ctx.fill();
    }

    // 2. Asphalt Roads (North-South & East-West)
    ctx.fillStyle = '#182234';
    ctx.fillRect(310, 0, 180, 800); // NS road
    ctx.fillRect(0, 310, 800, 180); // EW road

    // Intersection center box
    ctx.fillStyle = '#1b273c';
    ctx.fillRect(310, 310, 180, 180);

    // Road curb borders
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // North curbs
    ctx.moveTo(310, 0);
    ctx.lineTo(310, 310);
    ctx.moveTo(490, 0);
    ctx.lineTo(490, 310);
    // South curbs
    ctx.moveTo(310, 490);
    ctx.lineTo(310, 800);
    ctx.moveTo(490, 490);
    ctx.lineTo(490, 800);
    // West curbs
    ctx.moveTo(0, 310);
    ctx.lineTo(310, 310);
    ctx.moveTo(0, 490);
    ctx.lineTo(310, 490);
    // East curbs
    ctx.moveTo(490, 310);
    ctx.lineTo(800, 310);
    ctx.moveTo(490, 490);
    ctx.lineTo(800, 490);
    ctx.stroke();

    // 3. Double Yellow Center Dividers
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    const drawDoubleCenter = (x1: number, y1: number, x2: number, y2: number, dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(x1 - dx, y1 - dy);
      ctx.lineTo(x2 - dx, y2 - dy);
      ctx.moveTo(x1 + dx, y1 + dy);
      ctx.lineTo(x2 + dx, y2 + dy);
      ctx.stroke();
    };
    drawDoubleCenter(400, 0, 400, 285, 2.5, 0);
    drawDoubleCenter(400, 515, 400, 800, 2.5, 0);
    drawDoubleCenter(0, 400, 285, 400, 0, 2.5);
    drawDoubleCenter(515, 400, 800, 400, 0, 2.5);

    // 4. Zebra Pedestrian Crosswalks
    ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
    for (let x = 320; x < 485; x += 18) {
      ctx.fillRect(x, 290, 10, 18); // North crosswalk
      ctx.fillRect(x, 492, 10, 18); // South crosswalk
    }
    for (let y = 320; y < 485; y += 18) {
      ctx.fillRect(290, y, 18, 10); // West crosswalk
      ctx.fillRect(492, y, 18, 10); // East crosswalk
    }

    // 5. White Stop Lines
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    // North incoming stop line (left half)
    ctx.moveTo(314, STOP_LINE_DIST);
    ctx.lineTo(396, STOP_LINE_DIST);
    // South incoming stop line (right half)
    ctx.moveTo(404, 800 - STOP_LINE_DIST);
    ctx.lineTo(486, 800 - STOP_LINE_DIST);
    // West incoming stop line (bottom half)
    ctx.moveTo(STOP_LINE_DIST, 404);
    ctx.lineTo(STOP_LINE_DIST, 486);
    // East incoming stop line (top half)
    ctx.moveTo(800 - STOP_LINE_DIST, 314);
    ctx.lineTo(800 - STOP_LINE_DIST, 396);
    ctx.stroke();

    // 6. Active Emergency Corridor Highlight
    if (emergency.active && emergency.direction) {
      const pulse = 0.14 + 0.08 * Math.sin(simTime * 8);
      ctx.fillStyle = `rgba(244, 63, 94, ${pulse})`;
      if (emergency.direction === 'North') ctx.fillRect(312, 0, 86, 490);
      if (emergency.direction === 'South') ctx.fillRect(402, 310, 86, 490);
      if (emergency.direction === 'West') ctx.fillRect(0, 402, 490, 86);
      if (emergency.direction === 'East') ctx.fillRect(310, 312, 490, 86);
    }

    // 7. Directional Compass & Road Labels
    ctx.font = '600 12px "Outfit", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('NORTH APPROACH', 400, 26);
    ctx.fillText('SOUTH APPROACH', 400, 778);
    ctx.save();
    ctx.translate(24, 400);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('WEST APPROACH', 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(776, 400);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('EAST APPROACH', 0, 0);
    ctx.restore();

    // 8. Center Intersection Box Status Indicator
    ctx.strokeStyle = signalState.signals.pedestrianWalk
      ? 'rgba(16, 185, 129, 0.5)'
      : emergency.active
      ? 'rgba(244, 63, 94, 0.55)'
      : 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(322, 322, 156, 156);
    ctx.setLineDash([]);

    // 9. Pedestrians (waiting or crossing during Pedestrian Walk phase)
    const waitingPeds = processes.filter(
      (p) =>
        p.vehicleType === 'Pedestrian' &&
        (p.state === 'Ready' || p.state === 'Waiting' || p.state === 'Running')
    );
    if (signalState.signals.pedestrianWalk) {
      const progress = (simTime * 0.6) % 1;
      const walkX = 325 + progress * 150;
      // Draw crossing pedestrian figures across North & South crosswalks
      [walkX, 475 - progress * 150].forEach((px, idx) => {
        const py = idx === 0 ? 299 : 501;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ecfdf5';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#10b981';
      ctx.textAlign = 'center';
      ctx.fillText('PEDESTRIAN WALK', 400, 400);
    } else if (waitingPeds.length > 0) {
      // Waiting pedestrian icon at NW sidewalk corner
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(298, 282, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'right';
      ctx.fillText(`PED WAIT (${waitingPeds.length})`, 284, 285);
    }

    // 10. Draw Vehicles
    for (const v of vehicles) {
      drawVehicle(ctx, v, v.pid === runningPid, simTime);
    }

    // 11. Four Traffic Signals at Intersection Corners
    drawTrafficSignalHousing(ctx, 282, 260, 'NORTH', signalState.signals.North, 'V');
    drawTrafficSignalHousing(ctx, 518, 540, 'SOUTH', signalState.signals.South, 'V');
    drawTrafficSignalHousing(ctx, 255, 518, 'WEST', signalState.signals.West, 'H');
    drawTrafficSignalHousing(ctx, 545, 282, 'EAST', signalState.signals.East, 'H');

    ctx.restore();
  }, [vehicles, signalState, emergency, runningPid, processes, simTime]);

  const dirs: Direction[] = ['North', 'South', 'East', 'West'];

  return (
    <div className="rounded-xl border border-slate-800 bg-[#11192B] p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-100">
            Four-Way Intersection Simulation
          </h2>
          <p className="text-xs text-slate-400">
            Safe phase transitions · Non-overlapping lane queueing · Live PID tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
          {dirs.map((d) => {
            const c = signalState.signals[d];
            const colorCls =
              c === 'GREEN'
                ? 'text-emerald-400'
                : c === 'YELLOW'
                ? 'text-amber-300'
                : 'text-rose-400';
            return (
              <span key={d} className="text-slate-400">
                {d[0]}: <strong className={colorCls}>{c}</strong>
              </span>
            );
          })}
          {signalState.signals.pedestrianWalk && (
            <span className="font-semibold text-emerald-300">WALK</span>
          )}
        </div>
      </div>

      <div
        className={`relative mx-auto w-full overflow-hidden rounded-lg border border-slate-800 bg-[#0b1220] ${
          expanded ? 'max-w-[740px]' : 'max-w-[580px]'
        } aspect-square`}
      >
        <canvas
          ref={canvasRef}
          data-testid="intersection-canvas"
          aria-label="Four-way traffic intersection simulation canvas"
          className="h-full w-full block"
        />
      </div>

      {/* Compact Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-sky-600 inline-block" />
            Normal Car
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-amber-600 inline-block" />
            Heavy / Bus
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-slate-100 inline-block" />
            Ambulance
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-red-600 inline-block" />
            Fire Engine
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-slate-800 border border-slate-500 inline-block" />
            Police
          </span>
        </div>
        <span className="font-mono text-slate-500">
          Phase: {signalState.phaseMode.replace(/_/g, ' ')}
        </span>
      </div>
    </div>
  );
};

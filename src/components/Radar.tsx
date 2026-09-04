import React, { useMemo } from 'react';
import { RadarData, LevelInfo } from '../types';
import { Shield, AlertTriangle, Compass } from 'lucide-react';

interface RadarProps {
  data: RadarData;
  levelInfo: LevelInfo;
}

export const Radar: React.FC<RadarProps> = ({ data, levelInfo }) => {
  const radarRadius = 64; // radius of radar circle in px
  const center = 70; // center x, y (140x140 viewbox)
  const maxRange = 42; // maximum detection radius in 3D game units

  // Calculate position of blips relative to player facing direction
  // Player faces -Z in Three.js when yaw = 0.
  // In player-centric coordinate system:
  // Forward is straight UP (radar Y decreases from center)
  // Backward is straight DOWN (radar Y increases from center)
  // Right is radar X increases from center
  // Left is radar X decreases from center
  const projectedBlips = useMemo(() => {
    const cosYaw = Math.cos(data.playerYaw);
    const sinYaw = Math.sin(data.playerYaw);

    return data.blips.map(blip => {
      const dx = blip.x - data.playerX;
      const dz = blip.z - data.playerZ;

      // Rotate world vector by player's camera yaw:
      // Camera looks down -Z rotated by yaw.
      // Forward vector F = (-sin(yaw), -cos(yaw))
      // Right vector R = (cos(yaw), -sin(yaw))
      const relRight = dx * cosYaw - dz * sinYaw;
      const relForward = -dx * sinYaw - dz * cosYaw;

      const dist = Math.sqrt(dx * dx + dz * dz);
      const isClamped = dist > maxRange;
      const displayDist = Math.min(dist, maxRange);

      const ratio = displayDist / maxRange;
      // In radar SVG:
      // X = center + (relRight / maxRange) * radarRadius
      // Y = center - (relForward / maxRange) * radarRadius  (minus because -forward is down, forward is up)
      const nx = dist > 0 ? (relRight / dist) : 0;
      const ny = dist > 0 ? (relForward / dist) : 0;

      const px = isClamped ? center + nx * radarRadius : center + (relRight / maxRange) * radarRadius;
      const py = isClamped ? center - ny * radarRadius : center - (relForward / maxRange) * radarRadius;

      const isBehind = relForward < 0;

      return {
        ...blip,
        px,
        py,
        dist,
        isBehind,
        isClamped,
      };
    });
  }, [data.blips, data.playerX, data.playerZ, data.playerYaw]);

  // Calculate angle for true North indicator on rim
  // When yaw = 0, North (which is -Z) is straight UP (0 deg).
  const northAngle = (data.playerYaw * 180) / Math.PI;

  return (
    <div
      id="tactical-radar-widget"
      className="flex flex-col items-start gap-1.5 pointer-events-auto select-none"
    >
      {/* Top Location & Threat Pill */}
      <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1 shadow-lg text-[11px] font-mono">
        {levelInfo.type === 'hub' ? (
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <Shield className="w-3.5 h-3.5" /> SANCTUARY (SAFE)
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-300 font-bold">
            <Compass className="w-3.5 h-3.5" /> FLOOR {levelInfo.floor}: {levelInfo.themeName}
          </span>
        )}
      </div>

      {/* Radar Container */}
      <div className="relative w-[140px] h-[140px] rounded-full bg-slate-950/90 backdrop-blur-md border-2 border-slate-700/70 shadow-2xl overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.06)_0,rgba(15,23,42,0.8)_85%)]" />

        {/* Rotating Sonar Sweep Line */}
        <div
          className="absolute inset-0 pointer-events-none origin-center animate-[spin_4s_linear_infinite]"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, transparent 310deg, rgba(56, 189, 248, 0.22) 360deg)',
          }}
        />

        {/* SVG Drawing Layer */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 140 140">
          <defs>
            {/* Field of View Cone gradient */}
            <linearGradient id="fovGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.22" />
            </linearGradient>

            {/* Behind Alert Zone gradient */}
            <linearGradient id="behindGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.12" />
            </linearGradient>
          </defs>

          {/* Forward Field of View (FOV) cone (65 degrees forward) */}
          <path
            d="M 70 70 L 42 8 A 64 64 0 0 1 98 8 Z"
            fill="url(#fovGradient)"
          />

          {/* Behind zone highlight (lower half) */}
          {data.enemiesBehind > 0 && (
            <path
              d="M 6 70 A 64 64 0 0 0 134 70 Z"
              fill="url(#behindGradient)"
              className="animate-pulse"
            />
          )}

          {/* Range rings */}
          <circle cx="70" cy="70" r="24" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 3" />
          <circle cx="70" cy="70" r="46" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 4" />
          <circle cx="70" cy="70" r="64" fill="none" stroke="#475569" strokeWidth="1.5" />

          {/* Crosshair lines */}
          <line x1="70" y1="6" x2="70" y2="134" stroke="#334155" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="6" y1="70" x2="134" y2="70" stroke="#334155" strokeWidth="0.8" strokeDasharray="2 2" />

          {/* "BEHIND" guideline marker at bottom */}
          <text x="70" y="130" textAnchor="middle" fill="#64748b" fontSize="7" fontWeight="bold" fontFamily="monospace">
            BEHIND
          </text>

          {/* True North Indicator needle on rim */}
          <g transform={`rotate(${northAngle}, 70, 70)`}>
            <polygon points="70,4 67,11 73,11" fill="#f59e0b" />
            <text x="70" y="18" textAnchor="middle" fill="#f59e0b" fontSize="6.5" fontWeight="bold">
              N
            </text>
          </g>

          {/* Projected Blips */}
          {projectedBlips.map(blip => {
            if (blip.type === 'enemy') {
              return (
                <g key={blip.id}>
                  {/* Warning pulse if behind */}
                  {blip.isBehind && (
                    <circle
                      cx={blip.px}
                      cy={blip.py}
                      r="6"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1.2"
                      className="animate-ping"
                    />
                  )}
                  {/* Enemy Blip Core */}
                  <circle
                    cx={blip.px}
                    cy={blip.py}
                    r={blip.isBehind ? '4' : '3.2'}
                    fill={blip.isBehind ? '#ef4444' : '#f87171'}
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                </g>
              );
            }

            if (blip.type === 'portal') {
              return (
                <g key={blip.id}>
                  <circle cx={blip.px} cy={blip.py} r="5" fill="none" stroke="#fbbf24" strokeWidth="1.5" className="animate-pulse" />
                  <circle cx={blip.px} cy={blip.py} r="2.5" fill="#f59e0b" />
                </g>
              );
            }

            if (blip.type === 'crystal') {
              return (
                <polygon
                  key={blip.id}
                  points={`${blip.px},${blip.py - 3.5} ${blip.px + 3},${blip.py} ${blip.px},${blip.py + 3.5} ${blip.px - 3},${blip.py}`}
                  fill="#38bdf8"
                  stroke="#0284c7"
                  strokeWidth="0.8"
                />
              );
            }

            if (blip.type === 'barrel') {
              return (
                <rect
                  key={blip.id}
                  x={blip.px - 2.5}
                  y={blip.py - 2.5}
                  width="5"
                  height="5"
                  fill="#f97316"
                  stroke="#c2410c"
                  strokeWidth="0.8"
                />
              );
            }

            if (blip.type === 'fountain') {
              return (
                <g key={blip.id}>
                  <circle cx={blip.px} cy={blip.py} r="4" fill="#10b981" />
                  <line x1={blip.px - 2} y1={blip.py} x2={blip.px + 2} y2={blip.py} stroke="#ffffff" strokeWidth="0.8" />
                  <line x1={blip.px} y1={blip.py - 2} x2={blip.px} y2={blip.py + 2} stroke="#ffffff" strokeWidth="0.8" />
                </g>
              );
            }

            if (blip.type === 'dummy') {
              return (
                <circle
                  key={blip.id}
                  cx={blip.px}
                  cy={blip.py}
                  r="3"
                  fill="#10b981"
                  stroke="#065f46"
                  strokeWidth="0.8"
                />
              );
            }

            return null;
          })}

          {/* Player Chevron in Center (Pointing straight up) */}
          <polygon
            points="70,64 65,74 70,71 75,74"
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth="1"
          />
          <circle cx="70" cy="70" r="1.5" fill="#ffffff" />
        </svg>

        {/* High Threat Behind Warning Overlay */}
        {data.enemiesBehind > 0 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-red-600/95 text-white font-mono font-black text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg animate-bounce whitespace-nowrap">
            <AlertTriangle className="w-2.5 h-2.5 text-yellow-300" />
            <span>{data.enemiesBehind} BEHIND!</span>
          </div>
        )}
      </div>

      {/* Radar Legend / Threat Status */}
      <div className="flex items-center justify-between w-full px-1 text-[10px] text-slate-400 font-mono">
        {levelInfo.type === 'hub' ? (
          <span className="text-emerald-400">Training Sanctuary</span>
        ) : (
          <span className={levelInfo.enemiesRemaining > 0 ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>
            {levelInfo.enemiesRemaining > 0 ? `Hostiles: ${levelInfo.enemiesRemaining}` : 'Floor Cleared!'}
          </span>
        )}
      </div>
    </div>
  );
};

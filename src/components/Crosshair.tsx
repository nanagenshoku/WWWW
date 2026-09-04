import React from 'react';

interface CrosshairProps {
  chargeProgress: number; // 0 to 1
  isCharging: boolean;
  hitMarkerActive: boolean;
}

export const Crosshair: React.FC<CrosshairProps> = ({
  chargeProgress,
  isCharging,
  hitMarkerActive,
}) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - chargeProgress * circumference;

  return (
    <div
      id="game-crosshair"
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center justify-center select-none"
    >
      {/* Dynamic Charging Arc */}
      <svg className="w-16 h-16 -rotate-90">
        {/* Subtle background guide ring */}
        <circle
          cx="32"
          cy="32"
          r={radius}
          className="stroke-amber-950/40"
          strokeWidth="2.5"
          fill="none"
        />
        {isCharging && (
          <circle
            cx="32"
            cy="32"
            r={radius}
            className="stroke-orange-500 transition-all duration-75"
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>

      {/* Center Dot & Reticle Cross */}
      <div className="absolute flex items-center justify-center">
        <div
          className={`w-2.5 h-2.5 rounded-full transition-transform duration-100 ${
            isCharging
              ? 'scale-150 bg-amber-400 shadow-[0_0_12px_#f59e0b]'
              : 'bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.8)]'
          }`}
        />

        {/* Reticle ticks */}
        <div className="absolute -top-3 w-0.5 h-2 bg-amber-400/80" />
        <div className="absolute -bottom-3 w-0.5 h-2 bg-amber-400/80" />
        <div className="absolute -left-3 h-0.5 w-2 bg-amber-400/80" />
        <div className="absolute -right-3 h-0.5 w-2 bg-amber-400/80" />
      </div>

      {/* Hit Marker Flash */}
      {hitMarkerActive && (
        <div className="absolute w-8 h-8 pointer-events-none animate-ping">
          <div className="absolute inset-0 border-2 border-red-500 rotate-45" />
        </div>
      )}
    </div>
  );
};

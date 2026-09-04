import React from 'react';
import { Trophy, Flame, RotateCcw, Target, Zap, Skull } from 'lucide-react';
import { GameStats } from '../types';

interface GameOverModalProps {
  stats: GameStats;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ stats, onRestart }) => {
  const isNewHigh = stats.score >= stats.highScore && stats.score > 0;

  return (
    <div
      id="game-over-modal"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300"
    >
      <div className="bg-slate-950 border border-red-500/40 rounded-2xl max-w-md w-full p-6 md:p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col items-center">
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center mb-3">
          <Flame className="w-9 h-9 text-red-500 animate-bounce" />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-black text-white tracking-widest font-['Cinzel'] mb-1">
          FALLEN PYROMANCER
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          The dungeon hordes overwhelmed you, but your flames burned bright.
        </p>

        {/* Score Card */}
        <div className="w-full bg-slate-900/90 rounded-xl p-4 border border-slate-800 mb-6 flex flex-col items-center relative overflow-hidden">
          {isNewHigh && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] uppercase px-3 py-0.5 rounded-full mb-2 tracking-widest animate-pulse">
              ★ NEW HIGH SCORE ★
            </div>
          )}
          <span className="text-xs font-mono uppercase text-slate-400">FINAL SCORE</span>
          <span className="text-4xl font-black text-amber-400 font-['Cinzel'] my-1">
            {stats.score.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Best: <strong className="text-slate-200">{stats.highScore.toLocaleString()}</strong>
          </span>
        </div>

        {/* Breakdown Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6 text-left">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-orange-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Wave Reached</div>
              <div className="text-base font-bold text-slate-100">Stage {stats.wave}</div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex items-center gap-2.5">
            <Skull className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Enemies Slain</div>
              <div className="text-base font-bold text-slate-100">{stats.kills}</div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex items-center gap-2.5">
            <Target className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Hit Accuracy</div>
              <div className="text-base font-bold text-slate-100">{stats.accuracy}%</div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Highest Combo</div>
              <div className="text-base font-bold text-slate-100">{stats.highestCombo} Hits</div>
            </div>
          </div>
        </div>

        {/* Restart Action */}
        <button
          id="btn-restart-game"
          onClick={onRestart}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black tracking-wider text-base shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer font-['Cinzel']"
        >
          <RotateCcw className="w-5 h-5" /> REIGNITE THE ARENA
        </button>
      </div>
    </div>
  );
};

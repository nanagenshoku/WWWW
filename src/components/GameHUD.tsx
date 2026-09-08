import React from 'react';
import {
  Flame,
  Volume2,
  VolumeX,
  HelpCircle,
  Eye,
  Trophy,
  Zap,
  BookOpen,
  DoorOpen,
} from 'lucide-react';
import { PlayerStatus, GameStats, SpellId, LevelInfo, RadarData } from '../types';
import { SPELLS } from '../game/spellData';

interface GameHUDProps {
  status: PlayerStatus;
  stats: GameStats;
  levelInfo: LevelInfo;
  radarData: RadarData;
  isMuted: boolean;
  isThirdPerson: boolean;
  pyromaniaTimer: number;
  onSelectSpell: (id: SpellId) => void;
  onToggleMute: () => void;
  onTogglePerspective: () => void;
  onOpenHelp: () => void;
  onRequestPointerLock: () => void;
  isPointerLocked: boolean;
  onInteractPortal?: () => void;
  onMobileCastStart?: () => void;
  onMobileCastEnd?: () => void;
  onMobileMove?: (dir: { x: number; y: number }) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  status,
  stats,
  levelInfo,
  radarData,
  isMuted,
  isThirdPerson,
  pyromaniaTimer,
  onSelectSpell,
  onToggleMute,
  onTogglePerspective,
  onOpenHelp,
  onRequestPointerLock,
  isPointerLocked,
  onInteractPortal,
  onMobileCastStart,
  onMobileCastEnd,
}) => {
  const currentSpellIndex = (['pyro_blast', 'inferno_orb', 'flame_triad', 'meteor_strike'] as SpellId[]).indexOf(status.activeSpell);

  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 md:p-5 select-none font-sans">
      {/* --- TOP BAR --- */}
      <div id="hud-top-bar" className="flex items-start justify-between w-full">
        {/* Top-Left: Grimoire Indicator (Held in Left Hand) */}
        <div id="radar-container-hud" className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-md border border-amber-500/30 rounded-xl px-3 py-2 shadow-xl">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <BookOpen className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-amber-200 tracking-wide font-['Cinzel']">
                  {levelInfo.type === 'hub' ? 'Sanctuary of Embers (Floor 0)' : `Floor ${levelInfo.floor}: ${levelInfo.themeName}`}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-amber-950/70 border border-amber-500/40 text-amber-300 rounded font-mono uppercase">
                  Grimoire
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                {levelInfo.type === 'hub' ? (
                  <span className="text-emerald-400">Safe Haven (Full Mana Regen)</span>
                ) : (
                  <span>
                    Hostiles: <b className="text-amber-400">{levelInfo.enemiesRemaining}</b> / {levelInfo.totalEnemies}
                  </span>
                )}
                <span className="text-slate-600">•</span>
                <span>Kills: <b className="text-white">{stats.kills}</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Score & Combo Badge */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-950/80 backdrop-blur-md border border-amber-500/20 rounded-xl px-5 py-2 flex flex-col items-center shadow-xl">
            <div className="text-[10px] text-slate-400 uppercase font-mono tracking-widest flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> SCORE
            </div>
            <div className="text-2xl md:text-3xl font-black text-white tracking-wider font-['Cinzel']">
              {stats.score.toLocaleString()}
            </div>
            {stats.highScore > 0 && (
              <div className="text-[10px] text-amber-400/90 font-mono">
                BEST: {stats.highScore.toLocaleString()}
              </div>
            )}
          </div>

          {/* Combo Multiplier pill */}
          {status.combo > 1 && (
            <div
              className={`mt-2 px-3 py-0.5 rounded-full border text-xs font-black tracking-wide flex items-center gap-1.5 shadow-lg transition-all ${
                status.combo >= 8
                  ? 'bg-red-600/90 border-orange-400 text-white animate-bounce'
                  : 'bg-amber-600/80 border-amber-300 text-amber-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>COMBO x{status.comboMultiplier} ({status.combo})</span>
              {/* Combo decay bar */}
              <div className="w-10 h-1.5 bg-black/40 rounded-full overflow-hidden ml-1">
                <div
                  className="h-full bg-amber-200 transition-all duration-100"
                  style={{ width: `${status.comboTimer * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Pointer Lock hint */}
          {!isPointerLocked && (
            <button
              id="btn-pointer-lock"
              onClick={onRequestPointerLock}
              className="mt-2 pointer-events-auto bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs px-3 py-1 rounded-full cursor-pointer transition-colors backdrop-blur-sm shadow-md"
            >
              Click canvas to lock cursor & aim
            </button>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Toggle View */}
          <button
            id="btn-toggle-camera"
            onClick={onTogglePerspective}
            title="Toggle 1st / 3rd Person View (P or V key)"
            className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Toggle Mute */}
          <button
            id="btn-toggle-mute"
            onClick={onToggleMute}
            title="Mute / Unmute Audio"
            className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-all active:scale-95 shadow-md cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Help / Controls */}
          <button
            id="btn-open-help"
            onClick={onOpenHelp}
            title="Controls & Spells Guide"
            className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* --- PROXIMITY PORTAL INTERACTION BANNER --- */}
      {levelInfo.prompt && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            id="btn-portal-interact"
            onClick={onInteractPortal}
            disabled={!levelInfo.canInteract}
            className={`px-6 py-3 rounded-2xl font-black text-sm md:text-base tracking-wide shadow-2xl flex items-center gap-3 border transition-all ${
              levelInfo.canInteract
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 border-amber-200 shadow-[0_0_30px_#f59e0b] cursor-pointer animate-pulse scale-105'
                : 'bg-slate-950/90 text-slate-400 border-slate-700/80 cursor-not-allowed'
            }`}
          >
            <DoorOpen className={`w-5 h-5 ${levelInfo.canInteract ? 'text-slate-950' : 'text-slate-500'}`} />
            <span>{levelInfo.prompt}</span>
          </button>
        </div>
      )}

      {/* --- BOTTOM SECTION --- */}
      {/* Health, Mana, and Spells are rendered directly inside the Grimoire in the player's left hand */}
      <div id="hud-bottom-section" className="pointer-events-auto flex items-end justify-between w-full">
        {/* Mobile touch controls only */}
        <div className="md:hidden flex items-center justify-between w-full">
          {/* Mobile Spell Switcher */}
          <button
            onClick={() => {
              const spellKeys: SpellId[] = ['pyro_blast', 'inferno_orb', 'flame_triad', 'meteor_strike'];
              const nextIndex = (currentSpellIndex + 1) % spellKeys.length;
              onSelectSpell(spellKeys[nextIndex]);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-950/85 border border-amber-500/40 text-amber-200 text-xs font-bold font-['Cinzel'] shadow-xl active:scale-95 flex items-center gap-1.5"
          >
            <span>Spell: {SPELLS[status.activeSpell].name}</span>
          </button>

          {/* Mobile Cast Button */}
          <button
            id="mobile-fire-button"
            onTouchStart={e => {
              e.preventDefault();
              if (onMobileCastStart) onMobileCastStart();
            }}
            onTouchEnd={e => {
              e.preventDefault();
              if (onMobileCastEnd) onMobileCastEnd();
            }}
            onMouseDown={onMobileCastStart}
            onMouseUp={onMobileCastEnd}
            className="w-18 h-18 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 border-3 border-amber-300 shadow-[0_0_20px_#f59e0b] flex flex-col items-center justify-center text-white font-black tracking-wider active:scale-90 transition-transform cursor-pointer"
          >
            <Flame className="w-7 h-7 drop-shadow" />
            <span className="text-[9px] uppercase font-mono">CAST</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Flame,
  Sun,
  Sparkles,
  Bomb,
  Volume2,
  VolumeX,
  HelpCircle,
  Eye,
  Trophy,
  Zap,
  ShieldAlert,
  BookOpen,
  DoorOpen,
} from 'lucide-react';
import { PlayerStatus, GameStats, SpellId, LevelInfo, RadarData } from '../types';
import { SPELLS } from '../game/spellData';
import { Radar } from './Radar';

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

const spellIcons: Record<string, React.ReactNode> = {
  pyro_blast: <Flame className="w-5 h-5 text-orange-400" />,
  inferno_orb: <Sun className="w-5 h-5 text-amber-300" />,
  flame_triad: <Sparkles className="w-5 h-5 text-yellow-300" />,
  meteor_strike: <Bomb className="w-5 h-5 text-red-400" />,
};

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
  const [showHudRadar, setShowHudRadar] = useState<boolean>(false);
  const hpPercent = Math.max(0, Math.min(100, (status.hp / status.maxHp) * 100));
  const manaPercent = Math.max(0, Math.min(100, (status.mana / status.maxMana) * 100));

  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 md:p-5 select-none font-sans">
      {/* --- TOP BAR --- */}
      <div id="hud-top-bar" className="flex items-start justify-between w-full">
        {/* Top-Left: Grimoire Radar Widget (Held in Left Hand) */}
        <div id="radar-container-hud" className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-md border border-amber-500/30 rounded-xl px-3 py-2 shadow-xl">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <BookOpen className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-amber-200 tracking-wide font-['Cinzel']">
                  {levelInfo.type === 'hub' ? 'Sanctuary of Embers' : `Floor ${levelInfo.floor}: ${levelInfo.themeName}`}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-amber-950/70 border border-amber-500/40 text-amber-300 rounded font-mono uppercase">
                  Left Hand
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
            <button
              onClick={() => setShowHudRadar(!showHudRadar)}
              title="Toggle HUD Radar Overlay"
              className="ml-1 text-[10px] font-mono px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer transition-colors"
            >
              {showHudRadar ? 'Hide HUD' : 'Overlay'}
            </button>
          </div>

          {/* If HUD overlay is toggled on, show the 2D widget as well */}
          {showHudRadar && (
            <div className="mt-1 animate-in fade-in duration-200">
              <Radar data={radarData} levelInfo={levelInfo} />
            </div>
          )}
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
      <div id="hud-bottom-section" className="flex flex-col md:flex-row items-end md:items-end justify-between gap-4 w-full">
        {/* Left: Health & Mana Bars */}
        <div className="flex flex-col gap-2.5 bg-slate-950/85 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 shadow-2xl w-72 max-w-full pointer-events-auto">
          {/* Health Bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
              <span className="flex items-center gap-1 text-red-400">
                <ShieldAlert className="w-3.5 h-3.5" /> VITALITY
              </span>
              <span className="font-mono">{status.hp} / {status.maxHp}</span>
            </div>
            <div className="w-full h-3.5 bg-slate-900/90 rounded-full overflow-hidden border border-red-950/60 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  hpPercent < 25 ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-red-600 to-rose-400'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Mana Bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
              <span className="flex items-center gap-1 text-sky-400">
                <Zap className="w-3.5 h-3.5" /> PYRO ENERGY
              </span>
              <span className="font-mono">{status.mana} / {status.maxMana}</span>
            </div>
            <div className="w-full h-3.5 bg-slate-900/90 rounded-full overflow-hidden border border-sky-950/60 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-amber-400 transition-all duration-150"
                style={{ width: `${manaPercent}%` }}
              />
            </div>
            {/* Mana recovery note */}
            <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
              <span>{levelInfo.type === 'hub' ? 'Sanctuary: +35 MP/s' : 'Dungeon: +4.5 MP/s (Aim hits restore +1.5)'}</span>
              {pyromaniaTimer > 0 && <span className="text-amber-400 font-bold">Pyromania 2x</span>}
            </div>
          </div>

          {/* Active Pyromania Powerup */}
          {pyromaniaTimer > 0 && (
            <div className="bg-amber-500/20 border border-amber-500/40 rounded px-2 py-1 text-[11px] text-amber-300 font-bold flex items-center justify-between">
              <span>⚡ PYROMANIA: 2X DAMAGE</span>
              <span className="font-mono">{pyromaniaTimer.toFixed(1)}s</span>
            </div>
          )}
        </div>

        {/* Center: Spell Selector Hotbar */}
        <div id="hud-spells-hotbar" className="pointer-events-auto flex items-center gap-2 bg-slate-950/90 backdrop-blur-md p-2 rounded-2xl border border-amber-500/30 shadow-2xl mx-auto md:mx-0">
          {(['pyro_blast', 'inferno_orb', 'flame_triad', 'meteor_strike'] as SpellId[]).map((spellId, idx) => {
            const spell = SPELLS[spellId];
            const isActive = status.activeSpell === spellId;
            const hasMana = status.mana >= spell.manaCost;

            return (
              <button
                key={spellId}
                id={`spell-btn-${spellId}`}
                onClick={() => onSelectSpell(spellId)}
                className={`relative flex flex-col items-center justify-between p-2 rounded-xl transition-all w-20 md:w-24 h-20 md:h-22 border cursor-pointer ${
                  isActive
                    ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.35)] scale-105'
                    : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800/80 opacity-85 hover:opacity-100'
                } ${!hasMana ? 'grayscale opacity-50' : ''}`}
              >
                {/* Hotkey number badge */}
                <span className="absolute top-1 left-1.5 text-[10px] font-mono font-black text-slate-400 bg-slate-800/80 px-1 rounded">
                  {idx + 1}
                </span>

                {/* Spell Icon */}
                <div className="mt-2.5 p-1.5 rounded-lg bg-black/40">
                  {spellIcons[spellId]}
                </div>

                {/* Spell Name */}
                <span className="text-[10px] md:text-[11px] font-bold text-slate-200 tracking-tight text-center leading-tight line-clamp-1">
                  {spell.name}
                </span>

                {/* Mana cost pill */}
                <span className="text-[9px] font-mono text-sky-300 font-semibold">
                  {spell.manaCost} MP
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile On-Screen Action Button */}
        <div className="md:hidden pointer-events-auto flex items-center justify-end w-full">
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
            className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 border-4 border-amber-300 shadow-[0_0_20px_#f59e0b] flex flex-col items-center justify-center text-white font-black tracking-wider active:scale-90 transition-transform cursor-pointer"
          >
            <Flame className="w-8 h-8 drop-shadow" />
            <span className="text-[10px] uppercase font-mono">CAST</span>
          </button>
        </div>
      </div>
    </div>
  );
};

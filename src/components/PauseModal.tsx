import React from 'react';
import { X, Volume2, VolumeX, Shield, Play, MousePointer, Keyboard, Sparkles, Flame, Sun, Bomb } from 'lucide-react';
import { SPELLS } from '../game/spellData';

interface PauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onClose,
  isMuted,
  onToggleMute,
  volume,
  onVolumeChange,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="pause-guide-modal"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-950 border border-amber-500/30 rounded-2xl max-w-lg w-full p-6 text-left shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-500" />
            <h3 className="text-xl font-black text-white font-['Cinzel'] tracking-wide">
              GRIMOIRE & CONTROLS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Section */}
        <div className="my-4">
          <h4 className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold mb-2 flex items-center gap-1.5">
            <Keyboard className="w-4 h-4" /> Movement & Combat Controls
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Move Spellcaster</span>
              <kbd className="bg-slate-800 text-amber-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                W A S D
              </kbd>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Cast Fireball</span>
              <kbd className="bg-slate-800 text-amber-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                Left Click / Hold
              </kbd>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Select Spell</span>
              <kbd className="bg-slate-800 text-amber-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                1, 2, 3, 4 / Right Click
              </kbd>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Toggle 1st/3rd View</span>
              <kbd className="bg-slate-800 text-amber-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                P or V Key
              </kbd>
            </div>
          </div>
        </div>

        {/* Spells Overview */}
        <div className="my-2">
          <h4 className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Pyromancy Spell Arsenal
          </h4>
          <div className="space-y-2">
            {Object.values(SPELLS).map(spell => (
              <div
                key={spell.id}
                className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex items-start gap-3"
              >
                <div className="p-2 rounded bg-black/40 text-amber-400 shrink-0">
                  {spell.id === 'pyro_blast' && <Flame className="w-4 h-4" />}
                  {spell.id === 'inferno_orb' && <Sun className="w-4 h-4" />}
                  {spell.id === 'flame_triad' && <Sparkles className="w-4 h-4" />}
                  {spell.id === 'meteor_strike' && <Bomb className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100">{spell.name}</span>
                    <span className="text-[10px] font-mono text-sky-400">{spell.manaCost} Mana</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{spell.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Arena Tips */}
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 my-3 text-xs text-amber-200/90 leading-relaxed space-y-1.5">
          <div>
            <strong className="text-amber-400">Left-Hand Grimoire Radar:</strong> Look down at the open grimoire in your left hand for a real-time tactical radar displaying gates, mana crystals, TNT barrels, and enemy threats.
          </div>
          <div>
            <strong className="text-emerald-400">Sanctuary of Embers:</strong> Clear 10 consecutive dungeon floors to unlock the golden Sanctuary portal for full rest and healing!
          </div>
          <div>
            <strong className="text-orange-400">Explosive Barrels & Crystals:</strong> Shoot red barrels for massive chain explosions. Shoot glowing cyan crystals to restore mana and activate 2x Pyromania damage.
          </div>
        </div>

        {/* Audio Volume Setting */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <span className="text-xs text-slate-300 font-medium">Sound Effects</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={e => onVolumeChange(parseFloat(e.target.value))}
            className="w-32 accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Resume Button */}
        <button
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black tracking-wider text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors font-['Cinzel']"
        >
          <Play className="w-4 h-4 fill-current" /> RESUME ARENA BATTLE
        </button>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { FireballEngine } from './game/FireballEngine';
import { GameHUD } from './components/GameHUD';
import { Crosshair } from './components/Crosshair';
import { FloatingCombatText } from './components/FloatingCombatText';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { PlayerStatus, GameStats, FloatingText, SpellId, LevelInfo, RadarData } from './types';
import { sounds } from './audio/SoundFX';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FireballEngine | null>(null);

  // React state for HUD
  const [status, setStatus] = useState<PlayerStatus>({
    hp: 100,
    maxHp: 100,
    mana: 100,
    maxMana: 100,
    activeSpell: 'pyro_blast',
    chargeProgress: 0,
    isCharging: false,
    combo: 0,
    comboMultiplier: 1,
    comboTimer: 0,
  });

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    wave: 1,
    kills: 0,
    totalDamage: 0,
    accuracy: 100,
    shotsFired: 0,
    shotsHit: 0,
    highestCombo: 0,
  });

  const [levelInfo, setLevelInfo] = useState<LevelInfo>({
    type: 'hub',
    floor: 1,
    name: 'Sanctuary of Embers',
    prompt: null,
    canInteract: false,
    enemiesRemaining: 0,
    floorCleared: false,
  });

  const [radarData, setRadarData] = useState<RadarData>({
    playerX: 0,
    playerZ: 0,
    playerYaw: 0,
    blips: [],
    enemiesBehind: 0,
  });

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [hitMarkerActive, setHitMarkerActive] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);
  const [isThirdPerson, setIsThirdPerson] = useState<boolean>(false);
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);
  const [pyromaniaTimer, setPyromaniaTimer] = useState<number>(0);
  const [waveBanner, setWaveBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Instantiate Three.js Fireball Engine
    const engine = new FireballEngine(containerRef.current);
    engineRef.current = engine;

    // Callbacks
    engine.onStatusUpdate = (newStatus, newStats) => {
      setStatus(newStatus);
      setStats(newStats);
      setIsGameOver(engine.isGameOver);
      setIsPaused(engine.isPaused);
      setIsPointerLocked(engine.pointerLocked);
      setPyromaniaTimer(engine.pyromaniaTimer);
    };

    engine.onLevelUpdate = (info) => {
      setLevelInfo(info);
    };

    engine.onRadarUpdate = (radar) => {
      setRadarData(radar);
    };

    engine.onFloatingText = (item) => {
      setFloatingTexts(prev => [...prev.slice(-25), item]);
    };

    engine.onHitMarker = () => {
      setHitMarkerActive(true);
      setTimeout(() => setHitMarkerActive(false), 110);
    };

    engine.onWaveCleared = (waveNum) => {
      setWaveBanner(`FLOOR ${waveNum} CLEARED! DESCENT PORTAL UNLOCKED!`);
      setTimeout(() => setWaveBanner(null), 3500);
    };

    engine.onGameOver = () => {
      setIsGameOver(true);
    };

    // Clean up older floating texts every 600ms
    const textCleaner = setInterval(() => {
      const now = performance.now();
      setFloatingTexts(prev => prev.filter(t => now - t.createdAt < 1100));
    }, 400);

    return () => {
      clearInterval(textCleaner);
      engine.destroy();
    };
  }, []);

  // Handle Spell Selection
  const handleSelectSpell = (spellId: SpellId) => {
    if (engineRef.current) {
      engineRef.current.setSpell(spellId);
      setStatus(prev => ({ ...prev, activeSpell: spellId }));
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  // Volume Change
  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    sounds.setVolume(vol);
    if (isMuted && vol > 0) {
      setIsMuted(false);
      sounds.setMuted(false);
    }
  };

  // Toggle Perspective
  const handleTogglePerspective = () => {
    if (engineRef.current) {
      engineRef.current.togglePerspective();
      setIsThirdPerson(engineRef.current.isThirdPerson);
    }
  };

  // Restart
  const handleRestart = () => {
    setIsGameOver(false);
    if (engineRef.current) {
      engineRef.current.restartGame();
    }
  };

  // Request Pointer Lock
  const handleRequestPointerLock = () => {
    if (engineRef.current) {
      engineRef.current.requestPointerLock();
    }
  };

  // Mobile virtual cast
  const handleMobileCastStart = () => {
    if (engineRef.current) {
      engineRef.current.startCasting();
    }
  };

  const handleMobileCastEnd = () => {
    if (engineRef.current) {
      engineRef.current.releaseCasting();
    }
  };

  // Portal Interaction
  const handleInteractPortal = () => {
    if (engineRef.current) {
      engineRef.current.interactPortal();
    }
  };

  return (
    <div id="app-root" className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Three.js Canvas Container */}
      <div
        id="three-canvas-container"
        ref={containerRef}
        className="w-full h-full cursor-crosshair"
      />

      {/* Dynamic 3D Crosshair */}
      <Crosshair
        chargeProgress={status.chargeProgress}
        isCharging={status.isCharging}
        hitMarkerActive={hitMarkerActive}
      />

      {/* Floating 3D Combat Text */}
      <FloatingCombatText texts={floatingTexts} />

      {/* Main HUD with Integrated Tactical Radar */}
      <GameHUD
        status={status}
        stats={stats}
        levelInfo={levelInfo}
        radarData={radarData}
        isMuted={isMuted}
        isThirdPerson={isThirdPerson}
        pyromaniaTimer={pyromaniaTimer}
        onSelectSpell={handleSelectSpell}
        onToggleMute={handleToggleMute}
        onTogglePerspective={handleTogglePerspective}
        onOpenHelp={() => setIsPaused(true)}
        onRequestPointerLock={handleRequestPointerLock}
        isPointerLocked={isPointerLocked}
        onInteractPortal={handleInteractPortal}
        onMobileCastStart={handleMobileCastStart}
        onMobileCastEnd={handleMobileCastEnd}
      />

      {/* Wave Cleared Banner */}
      {waveBanner && (
        <div
          id="wave-banner"
          className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-600/90 via-orange-600/95 to-amber-600/90 text-white px-8 py-3 rounded-2xl border-2 border-amber-300 shadow-[0_0_30px_#f59e0b] text-center pointer-events-none animate-bounce"
        >
          <div className="font-['Cinzel'] text-xl md:text-2xl font-black tracking-widest">
            {waveBanner}
          </div>
          <div className="text-xs text-amber-100 font-semibold mt-0.5">
            +35 Vitality Restored & Full Pyro Energy
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {isGameOver && (
        <GameOverModal stats={stats} onRestart={handleRestart} />
      )}

      {/* Pause / Grimoire Modal */}
      <PauseModal
        isOpen={isPaused && !isGameOver}
        onClose={() => {
          setIsPaused(false);
          if (engineRef.current) engineRef.current.isPaused = false;
        }}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        volume={volume}
        onVolumeChange={handleVolumeChange}
      />
    </div>
  );
}

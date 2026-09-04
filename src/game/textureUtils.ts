import * as THREE from 'three';

/**
 * Procedural texture generators for Fireball 3D
 */

export function createStoneFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base stone dark charcoal
  ctx.fillStyle = '#1c1c22';
  ctx.fillRect(0, 0, 512, 512);

  // Stone tiles grid
  const tileSize = 64;
  for (let y = 0; y < 512; y += tileSize) {
    for (let x = 0; x < 512; x += tileSize) {
      // Slight stone color variations
      const tone = Math.floor(24 + Math.random() * 20);
      ctx.fillStyle = `rgb(${tone}, ${tone + 2}, ${tone + 6})`;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

      // Noise grain on each tile
      for (let i = 0; i < 40; i++) {
        const px = x + 2 + Math.random() * (tileSize - 4);
        const py = y + 2 + Math.random() * (tileSize - 4);
        const g = Math.floor(Math.random() * 40 + 15);
        ctx.fillStyle = `rgba(${g}, ${g}, ${g + 10}, 0.15)`;
        ctx.fillRect(px, py, 2, 2);
      }

      // Stone cracks
      if (Math.random() > 0.6) {
        ctx.strokeStyle = 'rgba(10, 10, 14, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 8 + Math.random() * 40, y + 8);
        ctx.lineTo(x + 15 + Math.random() * 30, y + 40);
        ctx.stroke();
      }
    }
  }

  // Dark mortar lines
  ctx.strokeStyle = '#0e0e12';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 512; i += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

export function createRuneCircleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  // Concentric rings
  ctx.strokeStyle = 'rgba(255, 120, 20, 0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 230, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 210, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 180, 50, 0.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  ctx.stroke();

  // Star / Triangle Runes
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const angle = (i * Math.PI * 2) / 7;
    const x = cx + Math.cos(angle) * 210;
    const y = cy + Math.sin(angle) * 210;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    // Inner spokes
    const innerX = cx + Math.cos(angle) * 140;
    const innerY = cy + Math.sin(angle) * 140;
    ctx.moveTo(x, y);
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.stroke();

  // Mystic symbols
  ctx.font = '24px serif';
  ctx.fillStyle = 'rgba(255, 140, 30, 0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const runes = ['ᚲ', 'ᚱ', 'ᚦ', 'ᚨ', 'ᛟ', 'ᛉ', 'ᛏ', 'ᛊ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ'];
  for (let i = 0; i < runes.length; i++) {
    const angle = (i * Math.PI * 2) / runes.length;
    const rx = cx + Math.cos(angle) * 175;
    const ry = cy + Math.sin(angle) * 175;
    ctx.fillText(runes[i], rx, ry);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createFireParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.2, 'rgba(255, 220, 70, 0.95)');
  grad.addColorStop(0.5, 'rgba(255, 90, 10, 0.7)');
  grad.addColorStop(0.8, 'rgba(180, 20, 0, 0.3)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

export function createExplosiveBarrelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Red danger barrel
  ctx.fillStyle = '#9b1c1c';
  ctx.fillRect(0, 0, 256, 256);

  // Metal bands
  ctx.fillStyle = '#2b2b32';
  ctx.fillRect(0, 30, 256, 25);
  ctx.fillRect(0, 200, 256, 25);

  // Rivets on metal bands
  ctx.fillStyle = '#7a7a85';
  for (let x = 16; x < 256; x += 32) {
    ctx.beginPath();
    ctx.arc(x, 42, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, 212, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Yellow warning diamond
  ctx.save();
  ctx.translate(128, 115);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-35, -35, 70, 70);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeRect(-35, -35, 70, 70);
  ctx.restore();

  // Flame symbol / text
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TNT', 128, 115);

  return new THREE.CanvasTexture(canvas);
}

export function createScorchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 58);
  grad.addColorStop(0, 'rgba(15, 12, 10, 0.85)');
  grad.addColorStop(0.4, 'rgba(25, 18, 12, 0.6)');
  grad.addColorStop(0.7, 'rgba(40, 20, 10, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  return new THREE.CanvasTexture(canvas);
}

export function createPortalVortexTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);

  const cx = 128;
  const cy = 128;

  // Swirling spiral arms
  for (let arm = 0; arm < 4; arm++) {
    const baseAngle = (arm * Math.PI) / 2;
    ctx.strokeStyle = arm % 2 === 0 ? 'rgba(56, 189, 248, 0.75)' : 'rgba(245, 158, 11, 0.8)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let r = 10; r < 115; r += 3) {
      const angle = baseAngle + r * 0.08;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (r === 10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Radial glowing core
  const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 120);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.8)');
  grad.addColorStop(0.7, 'rgba(147, 51, 234, 0.4)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

/**
 * Procedural Sun Temple Warm Limestone Flagstone Floor Texture
 */
export function createSunTempleFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm sun-bleached marble/travertine base
  ctx.fillStyle = '#e4dac7';
  ctx.fillRect(0, 0, 512, 512);

  // Large classical flagstone tiles
  const tileSize = 64;
  for (let y = 0; y < 512; y += tileSize) {
    for (let x = 0; x < 512; x += tileSize) {
      // Warm stone tone variation (sun-bleached limestone / marble)
      const r = Math.floor(222 + Math.random() * 20);
      const g = Math.floor(212 + Math.random() * 18);
      const b = Math.floor(192 + Math.random() * 16);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

      // Fine marble grain & sun specks
      for (let i = 0; i < 45; i++) {
        const px = x + 2 + Math.random() * (tileSize - 4);
        const py = y + 2 + Math.random() * (tileSize - 4);
        const light = Math.random() > 0.5;
        ctx.fillStyle = light ? 'rgba(255, 255, 245, 0.25)' : 'rgba(180, 165, 140, 0.18)';
        ctx.fillRect(px, py, 1.5, 1.5);
      }

      // Delicate natural marble veins
      if (Math.random() > 0.5) {
        ctx.strokeStyle = 'rgba(175, 160, 135, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 4 + Math.random() * (tileSize - 8), y + 4);
        ctx.bezierCurveTo(
          x + 10 + Math.random() * 20,
          y + 20,
          x + 20 + Math.random() * 20,
          y + 40,
          x + 30 + Math.random() * 25,
          y + tileSize - 4
        );
        ctx.stroke();
      }
    }
  }

  // Mortar lines between paving stones
  ctx.strokeStyle = '#b8aa92';
  ctx.lineWidth = 2.5;
  for (let i = 0; i <= 512; i += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

/**
 * Radiant Golden Sun Mandala for Central Temple Floor
 */
export function createSunMandalaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);
  const cx = 256;
  const cy = 256;

  // Central radiant sunburst disc
  const sunGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 70);
  sunGrad.addColorStop(0, 'rgba(255, 255, 230, 0.95)');
  sunGrad.addColorStop(0.3, 'rgba(255, 215, 60, 0.9)');
  sunGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.8)');
  sunGrad.addColorStop(1, 'rgba(217, 119, 6, 0.6)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 70, 0, Math.PI * 2);
  ctx.fill();

  // 16 Radiant Sun Rays
  const numRays = 16;
  for (let i = 0; i < numRays; i++) {
    const angle = (i * Math.PI * 2) / numRays;
    const rayLength = i % 2 === 0 ? 215 : 170;
    const rayBaseWidth = 0.09;

    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 210, 60, 0.85)' : 'rgba(245, 158, 11, 0.75)';
    ctx.beginPath();
    ctx.moveTo(
      cx + Math.cos(angle - rayBaseWidth) * 72,
      cy + Math.sin(angle - rayBaseWidth) * 72
    );
    ctx.lineTo(
      cx + Math.cos(angle) * rayLength,
      cy + Math.sin(angle) * rayLength
    );
    ctx.lineTo(
      cx + Math.cos(angle + rayBaseWidth) * 72,
      cy + Math.sin(angle + rayBaseWidth) * 72
    );
    ctx.closePath();
    ctx.fill();
  }

  // Concentric golden solar rings
  ctx.strokeStyle = 'rgba(255, 220, 90, 0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 230, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 235, 150, 0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 74, 0, Math.PI * 2);
  ctx.stroke();

  // Ancient solar hieroglyphs around perimeter
  ctx.font = '22px serif';
  ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const symbols = ['☀️', '☼', '⚡', '✦', '✧', '✺', '🜚', '☉', '☼', '⚡', '✦', '✧'];
  for (let i = 0; i < symbols.length; i++) {
    const angle = (i * Math.PI * 2) / symbols.length;
    const sx = cx + Math.cos(angle) * 185;
    const sy = cy + Math.sin(angle) * 185;
    ctx.fillText(symbols[i], sx, sy);
  }

  return new THREE.CanvasTexture(canvas);
}



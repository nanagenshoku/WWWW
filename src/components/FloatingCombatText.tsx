import React from 'react';
import { FloatingText } from '../types';

interface FloatingCombatTextProps {
  texts: FloatingText[];
}

export const FloatingCombatText: React.FC<FloatingCombatTextProps> = ({ texts }) => {
  return (
    <div id="combat-text-container" className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {texts.map(item => {
        const age = (performance.now() - item.createdAt) / 1000;
        const translateY = age * -60;
        const opacity = Math.max(0, 1 - age / 1.1);

        return (
          <div
            key={item.id}
            id={`floating-${item.id}`}
            className="absolute font-black tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none pointer-events-none"
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              transform: `translate(-50%, calc(-50% + ${translateY}px)) scale(${1 + age * 0.15})`,
              color: item.color,
              fontSize: `${item.size}px`,
              opacity,
              fontFamily: "'Cinzel', 'Plus Jakarta Sans', serif",
            }}
          >
            {item.text}
          </div>
        );
      })}
    </div>
  );
};

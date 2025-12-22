
import React from 'react';
import { GameSpeed } from '../types';

interface GameControlsProps {
  gameSpeed: GameSpeed;
  onSpeedChange: (speed: GameSpeed) => void;
}

const speedOptions: { label: string; value: GameSpeed }[] = [
  { label: '||', value: GameSpeed.PAUSED },
  { label: '1x', value: GameSpeed.NORMAL },
  { label: '5x', value: GameSpeed.FAST },
  { label: '15x', value: GameSpeed.SUPER_FAST },
];

const GameControls: React.FC<GameControlsProps> = ({ gameSpeed, onSpeedChange }) => {
  return (
    <div className="flex justify-center items-center bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg">
      <div className="flex items-center space-x-1">
        {speedOptions.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onSpeedChange(value)}
            className={`
              px-4 py-2 text-sm font-bold rounded-full transition-colors duration-200
              w-16 h-10 flex items-center justify-center
              ${
                gameSpeed === value
                  ? 'bg-brand-blue-600 text-white shadow-md'
                  : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GameControls;

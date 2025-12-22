import React from 'react';
import type { GameState, AirlineConcept } from '../types';
import BrandPanel from './BrandPanel';
import { Award } from 'lucide-react';
import OnTimePerformancePanel from './OnTimePerformancePanel';

interface BrandPageProps {
  gameState: GameState;
  onConceptChange: (concept: AirlineConcept) => void;
}

const BrandPage: React.FC<BrandPageProps> = ({ gameState, onConceptChange }) => {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-start mb-6">
        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-md mr-4">
          <Award className="w-6 h-6 text-brand-blue-600 dark:text-brand-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">브랜드 관리</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">항공사의 컨셉과 평판을 관리하여 시장에서의 입지를 다지세요.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <BrandPanel gameState={gameState} onConceptChange={onConceptChange} />
        <OnTimePerformancePanel gameState={gameState} />
      </div>
    </div>
  );
};

export default BrandPage;
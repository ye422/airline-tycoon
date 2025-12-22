import React from 'react';
import type { GameState, MealServiceLevel, CrewServiceLevel, BaggageServiceLevel, ServiceLevelData } from '../types';
import { MEAL_SERVICE_LEVELS, CREW_SERVICE_LEVELS, BAGGAGE_SERVICE_LEVELS } from '../constants';
import { UtensilsCrossed, UserRoundCog, Briefcase, SlidersHorizontal, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import PassengerSatisfactionPanel from './PassengerSatisfactionPanel';

interface ServiceManagementPageProps {
  gameState: GameState;
  onServiceLevelChange: (
    category: 'meal' | 'crew' | 'baggage',
    level: MealServiceLevel | CrewServiceLevel | BaggageServiceLevel
  ) => void;
}

const ServiceCategoryPanel: React.FC<{
  title: string;
  icon: React.ReactNode;
  levels: Record<string, ServiceLevelData>;
  currentLevelId: string;
  onLevelChange: (levelId: string) => void;
}> = ({ title, icon, levels, currentLevelId, onLevelChange }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </h2>
      </div>
      <div className="p-4 space-y-3 flex-grow">
        {/* FIX: Explicitly type 'level' as ServiceLevelData to resolve type inference issues. */}
        {Object.values(levels).map((level: ServiceLevelData) => {
          const isSelected = currentLevelId === level.id;
          const satisfactionPoints = level.satisfactionPoints;
          const satisfactionColor = satisfactionPoints > 0 ? 'text-green-500' : satisfactionPoints < 0 ? 'text-red-500' : 'text-slate-500';
          
          return (
            <button
              key={level.id}
              onClick={() => onLevelChange(level.id)}
              className={`w-full p-3 border-2 rounded-lg text-left transition-all duration-200 relative ${
                isSelected
                  ? 'border-brand-blue-600 bg-brand-blue-50 dark:bg-brand-blue-900/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {isSelected && <CheckCircle size={20} className="absolute top-3 right-3 text-brand-blue-600" />}
              <h3 className="font-bold text-md pr-8">{level.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{level.description}</p>
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <p className="text-sm font-semibold text-red-500 dark:text-red-400">
                  비용: {level.costPerAircraftPerDay !== undefined 
                    ? `${formatCurrency(level.costPerAircraftPerDay)} / 항공기 (일)` 
                    : `${formatCurrency(level.costPerPassenger ?? 0)} / 승객`
                  }
                </p>
                <p className={`text-sm font-semibold ${satisfactionColor}`}>
                  만족도 기여: {satisfactionPoints > 0 ? '+' : ''}{satisfactionPoints}점
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ServiceManagementPage: React.FC<ServiceManagementPageProps> = ({ gameState, onServiceLevelChange }) => {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-start mb-6">
        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-md mr-4">
          <SlidersHorizontal className="w-6 h-6 text-brand-blue-600 dark:text-brand-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">서비스 관리</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">기내 서비스 수준을 조정하여 비용과 승객 만족도의 균형을 맞추세요.</p>
        </div>
      </div>
      <div className="space-y-6">
        <PassengerSatisfactionPanel gameState={gameState} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <ServiceCategoryPanel
            title="기내식"
            icon={<UtensilsCrossed size={20} className="text-slate-500" />}
            levels={MEAL_SERVICE_LEVELS}
            currentLevelId={gameState.serviceLevels.meal}
            onLevelChange={(levelId) => onServiceLevelChange('meal', levelId as MealServiceLevel)}
          />
          <ServiceCategoryPanel
            title="객실 승무원 응대"
            icon={<UserRoundCog size={20} className="text-slate-500" />}
            levels={CREW_SERVICE_LEVELS}
            currentLevelId={gameState.serviceLevels.crew}
            onLevelChange={(levelId) => onServiceLevelChange('crew', levelId as CrewServiceLevel)}
          />
          <ServiceCategoryPanel
            title="수하물 허용량"
            icon={<Briefcase size={20} className="text-slate-500" />}
            levels={BAGGAGE_SERVICE_LEVELS}
            currentLevelId={gameState.serviceLevels.baggage}
            onLevelChange={(levelId) => onServiceLevelChange('baggage', levelId as BaggageServiceLevel)}
          />
        </div>
      </div>
    </div>
  );
};

export default ServiceManagementPage;
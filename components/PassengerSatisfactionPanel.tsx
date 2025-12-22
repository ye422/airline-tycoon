import React from 'react';
import type { GameState } from '../types';
import { AIRCRAFT_CONFIGURATIONS, MEAL_SERVICE_LEVELS, CREW_SERVICE_LEVELS, BAGGAGE_SERVICE_LEVELS, AIRCRAFT_AGE_SATISFACTION_THRESHOLD, AIRCRAFT_AGE_SATISFACTION_PENALTY_PER_YEAR } from '../constants';
import { Smile, UtensilsCrossed, UserRoundCog, Briefcase, Calendar, Wrench } from 'lucide-react';

interface PassengerSatisfactionPanelProps {
  gameState: GameState;
}

const FactorItem: React.FC<{ icon: React.ReactNode, label: string, value: number, detail?: string }> = ({ icon, label, value, detail }) => {
    const isBonus = value >= 0;
    return (
        <div className="flex justify-between items-center text-sm py-2">
            <div className="flex items-center">
                {icon}
                <span className="ml-2 text-slate-700 dark:text-slate-300">{label}</span>
                {detail && <span className="ml-1.5 text-xs text-slate-500">({detail})</span>}
            </div>
            <span className={`font-semibold font-mono ${isBonus ? 'text-green-500' : 'text-red-500'}`}>
                {isBonus ? '+' : ''}{value.toFixed(1)}
            </span>
        </div>
    );
};

const PassengerSatisfactionPanel: React.FC<PassengerSatisfactionPanelProps> = ({ gameState }) => {
  const { passengerSatisfaction, serviceLevels, fleet, date } = gameState;

  const baseScore = 50;
  const mealPoints = MEAL_SERVICE_LEVELS[serviceLevels.meal].satisfactionPoints;
  const crewPoints = CREW_SERVICE_LEVELS[serviceLevels.crew].satisfactionPoints;
  const baggagePoints = BAGGAGE_SERVICE_LEVELS[serviceLevels.baggage].satisfactionPoints;

  // Age penalty calculation for non-retrofitted aircraft
  const totalAgeInYears = fleet.reduce((sum, ac) => {
    const age = (date.getTime() - ac.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return sum + age;
  }, 0);
  const avgAge = fleet.length > 0 ? totalAgeInYears / fleet.length : 0;
  
  let agePenalty = 0;
  if (avgAge > AIRCRAFT_AGE_SATISFACTION_THRESHOLD) {
      agePenalty = -(avgAge - AIRCRAFT_AGE_SATISFACTION_THRESHOLD) * AIRCRAFT_AGE_SATISFACTION_PENALTY_PER_YEAR;
  }
  
  // Average satisfaction from aircraft configurations
  const totalConfigSatisfaction = fleet.reduce((sum, ac) => {
    const config = AIRCRAFT_CONFIGURATIONS[ac.configurationId];
    return sum + (config.satisfactionModifier || 0);
  }, 0);
  const avgConfigSatisfaction = fleet.length > 0 ? totalConfigSatisfaction / fleet.length : 0;
  const configDetail = fleet.length > 0 ? `${fleet.length}대 평균` : "해당 없음";


  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">만족도 상세 분석</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">승객 만족도에 영향을 미치는 요소를 분석합니다.</p>
      </div>
      <div className="p-4">
        <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-sm text-slate-500 dark:text-slate-400">현재 만족도</p>
          <p className="text-4xl font-bold text-slate-800 dark:text-slate-100 my-1">{Math.round(passengerSatisfaction)}점</p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
            <FactorItem icon={<Smile size={16} className="text-slate-400" />} label="기본 점수" value={baseScore} />
            <FactorItem 
                icon={<UtensilsCrossed size={16} className="text-slate-400" />} 
                label="기내식" 
                value={mealPoints} 
                detail={MEAL_SERVICE_LEVELS[serviceLevels.meal].name} 
            />
             <FactorItem 
                icon={<UserRoundCog size={16} className="text-slate-400" />} 
                label="객실 승무원" 
                value={crewPoints} 
                detail={CREW_SERVICE_LEVELS[serviceLevels.crew].name}
            />
            <FactorItem 
                icon={<Briefcase size={16} className="text-slate-400" />} 
                label="수하물" 
                value={baggagePoints} 
                detail={BAGGAGE_SERVICE_LEVELS[serviceLevels.baggage].name}
            />
             <FactorItem 
                icon={<Calendar size={16} className="text-slate-400" />} 
                label="평균 기령" 
                value={agePenalty} 
                detail={`${avgAge.toFixed(1)}년`} 
            />
             <FactorItem 
                icon={<Wrench size={16} className="text-slate-400" />} 
                label="좌석 구성" 
                value={avgConfigSatisfaction} 
                detail={configDetail}
            />
        </div>
      </div>
    </div>
  );
};

export default PassengerSatisfactionPanel;
import React from 'react';
import type { GameState } from '../types';
import { ON_TIME_PERFORMANCE_LEVELS, OTP_BASE_SCORE, OTP_MAINTENANCE_MODIFIERS, OTP_AGE_PENALTY_PER_YEAR, OTP_AGE_MAINTENANCE_MITIGATION, OTP_FOREIGN_HUB_BONUS, OTP_FLEET_STRETCH_THRESHOLD, OTP_FLEET_STRETCH_PENALTY_PER_AIRCRAFT, MAINTENANCE_LEVELS } from '../constants';
import { Timer, Wrench, Calendar, Globe, Plane, CheckCircle, XCircle } from 'lucide-react';

interface OnTimePerformancePanelProps {
  gameState: GameState;
}

const FactorItem: React.FC<{ icon: React.ReactNode, label: string, value: number, detail?: string, isBonus: boolean }> = ({ icon, label, value, detail, isBonus }) => (
    <div className="flex justify-between items-center text-sm py-2">
        <div className="flex items-center">
            {icon}
            <span className="ml-2 text-slate-700 dark:text-slate-300">{label}</span>
            {detail && <span className="ml-1.5 text-xs text-slate-500">({detail})</span>}
        </div>
        <span className={`font-semibold font-mono ${isBonus ? 'text-green-500' : 'text-red-500'}`}>
            {isBonus ? '+' : ''}{value.toFixed(2)}%
        </span>
    </div>
);

const OnTimePerformancePanel: React.FC<OnTimePerformancePanelProps> = ({ gameState }) => {
  const { onTimePerformance, maintenanceLevel, fleet, date, airlineProfile, airports } = gameState;

  const otpLevel = Object.values(ON_TIME_PERFORMANCE_LEVELS)
    .sort((a, b) => b.threshold - a.threshold)
    .find(level => onTimePerformance >= level.threshold) || ON_TIME_PERFORMANCE_LEVELS.CRITICAL;

  const maintenanceModifier = OTP_MAINTENANCE_MODIFIERS[maintenanceLevel];

  const totalAgeInYears = fleet.reduce((sum, ac) => {
    const age = (date.getTime() - ac.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return sum + age;
  }, 0);
  const avgAge = fleet.length > 0 ? totalAgeInYears / fleet.length : 0;
  const agePenalty = avgAge * OTP_AGE_PENALTY_PER_YEAR;
  const mitigationFactor = OTP_AGE_MAINTENANCE_MITIGATION[maintenanceLevel];
  const mitigatedAgePenalty = agePenalty * (1 - mitigationFactor);

  let foreignHubBonus = 0;
  let foreignHubCount = 0;
  if (airlineProfile) {
    foreignHubCount = airlineProfile.hubs.filter(h => {
        const airport = airports.find(a => a.code === h);
        return airport && airport.country !== airlineProfile.country;
    }).length;
    foreignHubBonus = foreignHubCount * OTP_FOREIGN_HUB_BONUS;
  }
  
  const overworkedAircraftCount = fleet.filter(ac => ac.schedule.length > OTP_FLEET_STRETCH_THRESHOLD).length;
  const fleetStretchPenalty = overworkedAircraftCount * OTP_FLEET_STRETCH_PENALTY_PER_AIRCRAFT;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">운항 정시성 분석</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">정시 운항률에 영향을 미치는 요소를 분석합니다.</p>
      </div>
      <div className="p-4">
        <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-sm text-slate-500 dark:text-slate-400">현재 정시성</p>
          <p className="text-4xl font-bold text-slate-800 dark:text-slate-100 my-1">{onTimePerformance.toFixed(2)}%</p>
          <p className={`font-semibold ${otpLevel.demandModifier >= 1 ? 'text-green-500' : 'text-red-500'}`}>{otpLevel.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{otpLevel.description}</p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
            <FactorItem icon={<CheckCircle size={16} className="text-slate-400" />} label="기본 점수" value={OTP_BASE_SCORE} isBonus={true} />
            <FactorItem 
                icon={<Wrench size={16} className="text-slate-400" />} 
                label="정비 수준" 
                value={maintenanceModifier} 
                detail={MAINTENANCE_LEVELS[maintenanceLevel].name} 
                isBonus={maintenanceModifier >= 0} 
            />
             <FactorItem 
                icon={<Calendar size={16} className="text-slate-400" />} 
                label="평균 기령" 
                value={-mitigatedAgePenalty} 
                detail={`${avgAge.toFixed(1)}년`} 
                isBonus={false} 
            />
            <FactorItem 
                icon={<Globe size={16} className="text-slate-400" />} 
                label="해외 사무소" 
                value={foreignHubBonus} 
                detail={`${foreignHubCount}개`}
                isBonus={true} 
            />
             <FactorItem 
                icon={<Plane size={16} className="text-slate-400" />} 
                label="과부하 항공기" 
                value={-fleetStretchPenalty} 
                detail={`${overworkedAircraftCount}대`} 
                isBonus={false} 
            />
        </div>
      </div>
    </div>
  );
};

export default OnTimePerformancePanel;

import React from 'react';
import { MaintenanceLevel } from '../types';
import { MAINTENANCE_LEVELS } from '../constants';
import { formatCurrency } from '../utils/formatters';
import { Wrench, Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

interface MaintenancePanelProps {
  currentLevel: MaintenanceLevel;
  onLevelChange: (level: MaintenanceLevel) => void;
}

const MaintenancePanel: React.FC<MaintenancePanelProps> = ({ currentLevel, onLevelChange }) => {
  const riskIcons: Record<MaintenanceLevel, React.ReactNode> = {
    [MaintenanceLevel.MINIMAL]: <ShieldX className="h-5 w-5 text-red-500" />,
    [MaintenanceLevel.STANDARD]: <ShieldAlert className="h-5 w-5 text-amber-500" />,
    [MaintenanceLevel.ADVANCED]: <Shield className="h-5 w-5 text-blue-500" />,
    [MaintenanceLevel.STATE_OF_THE_ART]: <ShieldCheck className="h-5 w-5 text-green-500" />,
  };

  const riskText: Record<MaintenanceLevel, string> = {
    [MaintenanceLevel.MINIMAL]: '매우 높음',
    [MaintenanceLevel.STANDARD]: '표준',
    [MaintenanceLevel.ADVANCED]: '낮음',
    [MaintenanceLevel.STATE_OF_THE_ART]: '매우 낮음',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
          <Wrench className="w-5 h-5 mr-2 text-slate-500" />
          정비 관리
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">정비 수준은 사고 발생 확률과 비용에 직접적인 영향을 미칩니다.</p>
      </div>
      <div className="p-4 space-y-3">
        {Object.values(MAINTENANCE_LEVELS).map((level) => (
          <button
            key={level.id}
            onClick={() => onLevelChange(level.id)}
            className={`w-full p-3 border-2 rounded-lg text-left transition-all duration-200 ${
              currentLevel === level.id
                ? 'border-brand-blue-600 bg-brand-blue-50 dark:bg-brand-blue-900/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-md">{level.name}</h3>
              <div className="flex items-center text-sm font-semibold">
                {riskIcons[level.id]}
                <span className="ml-1">위험: {riskText[level.id]}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{level.description}</p>
            <p className="text-sm font-semibold text-red-500 dark:text-red-400 mt-2">
              비용: {formatCurrency(level.costPerAircraftPerDay)} / 항공기 1대 (일)
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MaintenancePanel;

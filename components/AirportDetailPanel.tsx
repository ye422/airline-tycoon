
import React from 'react';
import type { Airport, GameState } from '../types';
import { AirportFacilityType } from '../types';
import { AIRPORT_FACILITIES } from '../constants';
import { formatCurrency } from '../utils/formatters';
import { Check, Lock, PlusCircle, X } from 'lucide-react';

interface AirportDetailPanelProps {
    airport: Airport;
    gameState: GameState;
    onClose: () => void;
    onPurchaseFacility: (airportCode: string, facilityType: AirportFacilityType) => void;
}

const AirportDetailPanel: React.FC<AirportDetailPanelProps> = ({ airport, gameState, onClose, onPurchaseFacility }) => {
    const facilities = gameState.airportFacilities?.[airport.code]?.facilities || [];

    const getFacilityStatus = (type: AirportFacilityType) => {
        const isOwned = facilities.includes(type);
        const data = AIRPORT_FACILITIES[type];
        const isPrerequisiteMet = !data.prerequisite || facilities.includes(data.prerequisite);
        const cost = data.cost[airport.scale];
        const canAfford = gameState.cash >= cost;

        return { isOwned, isPrerequisiteMet, cost, canAfford, data };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {airport.name}
                            <span className="text-sm px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                                {airport.code}
                            </span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">공항 시설 관리</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.values(AIRPORT_FACILITIES).map((facility) => {
                            const { isOwned, isPrerequisiteMet, cost, canAfford } = getFacilityStatus(facility.id);

                            return (
                                <div
                                    key={facility.id}
                                    className={`relative p-5 rounded-lg border-2 transition-all flex flex-col h-full ${isOwned
                                        ? 'border-brand-blue-500 bg-brand-blue-50 dark:bg-brand-blue-900/10'
                                        : !isPrerequisiteMet
                                            ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-75'
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-blue-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                {facility.name}
                                                {isOwned && <Check size={18} className="text-brand-blue-600" strokeWidth={3} />}
                                            </h3>
                                        </div>
                                        {!isOwned && (
                                            <div className="text-right">
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    {formatCurrency(cost)}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 min-h-[40px]">
                                        {facility.description}
                                    </p>

                                    {/* Effects */}
                                    <div className="mb-6 space-y-1">
                                        {facility.effects.operatingCostModifier && (
                                            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                • 운영 비용 {Math.round((1 - facility.effects.operatingCostModifier!) * 100)}% 절감
                                            </div>
                                        )}
                                        {facility.effects.otpBonus && (
                                            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                • 정시 운항률 +{facility.effects.otpBonus}%
                                            </div>
                                        )}
                                        {facility.effects.satisfactionBonus && (
                                            <div className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                • 고객 만족도 +{facility.effects.satisfactionBonus}
                                            </div>
                                        )}
                                        {facility.effects.maintenanceAccidentModifier && (
                                            <div className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                                • 사고 확률 {Math.round((1 - facility.effects.maintenanceAccidentModifier!) * 100)}% 감소
                                            </div>
                                        )}
                                        {facility.effects.demandModifier && (
                                            <div className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                • 수요 증가
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-auto flex items-center justify-end">
                                        {isOwned ? (
                                            <span className="text-sm font-semibold text-brand-blue-600 dark:text-brand-blue-400 bg-brand-blue-100 dark:bg-brand-blue-900/30 px-3 py-1.5 rounded-full">
                                                보유중
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => onPurchaseFacility(airport.code, facility.id)}
                                                disabled={!canAfford || !isPrerequisiteMet}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors ${!isPrerequisiteMet
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : canAfford
                                                        ? 'bg-brand-blue-600 hover:bg-brand-blue-700 text-white shadow-sm'
                                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {!isPrerequisiteMet ? (
                                                    <><Lock size={16} /> 선행 시설 필요</>
                                                ) : (
                                                    <><PlusCircle size={16} /> 건설하기</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AirportDetailPanel;

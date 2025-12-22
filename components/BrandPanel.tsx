import React, { useState } from 'react';
import type { AirlineConcept, GameState } from '../types';
import { AirlineConcept as AirlineConceptEnum, BrandReputationType as BrandReputationEnum } from '../types';
import { AIRLINE_CONCEPTS, BRAND_REPUTATIONS, CONCEPT_CHANGE_COST, CONCEPT_TRANSITION_YEARS } from '../constants';
import { Users, Briefcase, Star, X, AlertTriangle } from 'lucide-react';
import { formatModifier, formatCurrency } from '../utils/formatters';

interface BrandPanelProps {
  gameState: GameState;
  onConceptChange: (concept: AirlineConcept) => void;
}

const BrandPanel: React.FC<BrandPanelProps> = ({ gameState, onConceptChange }) => {
  const { conceptTransition } = gameState;

  if (conceptTransition) {
    return <TransitionStatusPanel gameState={gameState} />;
  }
  
  return <ReputationStatusPanel 
    gameState={gameState}
    onConceptChange={onConceptChange}
  />;
};

const ReputationStatusPanel: React.FC<{ gameState: GameState, onConceptChange: (concept: AirlineConcept) => void }> = ({ gameState, onConceptChange }) => {
  const { concept, reputation: currentReputation, passengersCarried, foundingDate, date: gameDate, cash, onTimePerformance, passengerSatisfaction } = gameState;
  const [isModalOpen, setModalOpen] = useState(false);

  if (!concept) return null;

  const reputation = BRAND_REPUTATIONS[currentReputation];
  const totalPassengers = passengersCarried.first + passengersCarried.business + passengersCarried.economy;
  const premiumRatio = totalPassengers > 0 ? (passengersCarried.first + passengersCarried.business) / totalPassengers : 0;
  const economyRatio = totalPassengers > 0 ? passengersCarried.economy / totalPassengers : 0;
  const businessRatio = totalPassengers > 0 ? passengersCarried.business / totalPassengers : 0;
  const yearsInService = (gameDate.getTime() - foundingDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  
  const getReputationEvolutionInfo = () => {
    if (concept === AirlineConceptEnum.FSC) {
      if (currentReputation === BrandReputationEnum.FSC_NORMAL) {
        const requiredData = BRAND_REPUTATIONS[BrandReputationEnum.FSC_NORMAL];
        const requiredOtp = requiredData.requiredOtp || 0;
        const requiredSatisfaction = requiredData.requiredSatisfaction || 0;
        return { 
          text: `프리미엄 FSC: 상위 클래스 승객 비율 25% 이상, 정시성 ${requiredOtp}% 이상, 만족도 ${requiredSatisfaction}점 이상`, 
          progress: `승객: ${(premiumRatio * 100).toFixed(1)}% | 정시성: ${onTimePerformance.toFixed(1)}% | 만족도: ${passengerSatisfaction.toFixed(0)}` 
        };
      }
      if (currentReputation === BrandReputationEnum.FSC_PREMIUM) {
        return { text: '클래식 FSC: 설립 후 5년 이상 경과', progress: `${yearsInService.toFixed(1)}년 / 5년` };
      }
    }
    if (concept === AirlineConceptEnum.LCC) {
      if (currentReputation === BrandReputationEnum.LCC_STANDARD) {
        const requiredData = BRAND_REPUTATIONS[BrandReputationEnum.LCC_STANDARD];
        const requiredOtp = requiredData.requiredOtp || 0;
        const requiredSatisfaction = requiredData.requiredSatisfaction || 0;
        return [
          { 
            text: `고품질 LCC: 비즈니스 승객 비율 5% 이상, 정시성 ${requiredOtp}% 이상, 만족도 ${requiredSatisfaction}점 이상`, 
            progress: `승객: ${(businessRatio * 100).toFixed(1)}% | 정시성: ${onTimePerformance.toFixed(1)}% | 만족도: ${passengerSatisfaction.toFixed(0)}` 
          },
          { text: '초저가 항공사: 이코노미 클래스 승객 비율 98% 이상', progress: `${(economyRatio * 100).toFixed(1)}% / 98%` },
        ];
      }
       if (currentReputation === BrandReputationEnum.LCC_GOOD) {
         return { text: '초저가 항공사: 이코노미 클래스 승객 비율 98% 이상', progress: `${(economyRatio * 100).toFixed(1)}% / 98%` };
       }
    }
    return null;
  };

  const getReputationMaintenanceInfo = () => {
    const maintenanceData = BRAND_REPUTATIONS[currentReputation];
    if (!maintenanceData.otpPenaltyThreshold && !maintenanceData.satisfactionPenaltyThreshold) return null;

    switch (currentReputation) {
        case BrandReputationEnum.FSC_PREMIUM: {
            const requiredOtp = maintenanceData.otpPenaltyThreshold || 0;
            const requiredSatisfaction = maintenanceData.satisfactionPenaltyThreshold || 0;
            const requiredPremiumRatio = 0.20;
            return {
                text: `프리미엄 FSC 유지: 상위 클래스 승객 비율 ${requiredPremiumRatio * 100}% 이상, 정시성 ${requiredOtp}% 이상, 만족도 ${requiredSatisfaction}점 이상 유지`,
                progress: `승객: ${(premiumRatio * 100).toFixed(1)}% | 정시성: ${onTimePerformance.toFixed(1)}% | 만족도: ${passengerSatisfaction.toFixed(0)}`
            };
        }
        case BrandReputationEnum.FSC_CLASSIC: {
            const requiredOtp = maintenanceData.otpPenaltyThreshold || 0;
            const requiredSatisfaction = maintenanceData.satisfactionPenaltyThreshold || 0;
             return {
                text: `클래식 FSC 유지: 정시성 ${requiredOtp}% 이상, 만족도 ${requiredSatisfaction}점 이상 유지`,
                progress: `정시성: ${onTimePerformance.toFixed(1)}% | 만족도: ${passengerSatisfaction.toFixed(0)}`
            };
        }
        case BrandReputationEnum.LCC_GOOD: {
            const requiredOtp = maintenanceData.otpPenaltyThreshold || 0;
            const requiredSatisfaction = maintenanceData.satisfactionPenaltyThreshold || 0;
            const requiredBusinessRatio = 0.03;
             return {
                text: `고품질 LCC 유지: 비즈니스 승객 비율 ${requiredBusinessRatio * 100}% 이상, 정시성 ${requiredOtp}% 이상, 만족도 ${requiredSatisfaction}점 이상 유지`,
                progress: `승객: ${(businessRatio * 100).toFixed(1)}% | 정시성: ${onTimePerformance.toFixed(1)}% | 만족도: ${passengerSatisfaction.toFixed(0)}`
            };
        }
        case BrandReputationEnum.ULCC: {
            const requiredEconomyRatio = 0.95;
            return {
                text: `초저가 항공사 유지: 이코노미 승객 비율 ${requiredEconomyRatio * 100}% 이상 유지`,
                progress: `승객: ${(economyRatio * 100).toFixed(1)}% / ${requiredEconomyRatio * 100}%`
            };
        }
        default:
            return null;
    }
  };
  
  const maintenanceInfo = getReputationMaintenanceInfo();
  const evolutionInfo = getReputationEvolutionInfo();
  const targetConcept = concept === AirlineConceptEnum.FSC ? AirlineConceptEnum.LCC : AirlineConceptEnum.FSC;

  return (
     <>
     <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">브랜드 상태</h2>
         <p className="text-sm text-slate-500 dark:text-slate-400">현재 컨셉: <span className="font-semibold">{AIRLINE_CONCEPTS[concept].name}</span></p>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-bold text-md text-slate-800 dark:text-slate-100">현재 평판: {reputation.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{reputation.description}</p>
          <div className="flex items-center space-x-4 text-sm mt-2">
            <ModifierStat icon={<Star size={14} className="text-yellow-500" />} value={formatModifier(reputation.demandModifier.first)} />
            <ModifierStat icon={<Briefcase size={14} className="text-blue-500" />} value={formatModifier(reputation.demandModifier.business)} />
            <ModifierStat icon={<Users size={14} className="text-green-500" />} value={formatModifier(reputation.demandModifier.economy)} />
          </div>
        </div>
        
        <div className="space-y-2">
            {maintenanceInfo && (
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                 <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-200">평판 유지 조건</h4>
                 <div className="text-xs text-slate-600 dark:text-slate-300">
                    <p>{maintenanceInfo.text}</p>
                    <p className="font-mono text-slate-500 dark:text-slate-400">{maintenanceInfo.progress}</p>
                 </div>
              </div>
            )}
            {evolutionInfo && (
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                 <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-200">평판 진화 조건</h4>
                 {Array.isArray(evolutionInfo) ? (
                    evolutionInfo.map(info => (
                       <div key={info.text} className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          <p>{info.text}</p>
                          <p className="font-mono text-brand-blue-600 dark:text-brand-blue-400">{info.progress}</p>
                       </div>
                    ))
                 ) : (
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <p>{evolutionInfo.text}</p>
                      <p className="font-mono text-brand-blue-600 dark:text-brand-blue-400">{evolutionInfo.progress}</p>
                    </div>
                 )}
              </div>
            )}
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <button 
                onClick={() => setModalOpen(true)}
                className="w-full px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors"
            >
              컨셉 변경
            </button>
        </div>
      </div>
    </div>
    {isModalOpen && (
      <ConceptChangeModal
        currentConceptName={AIRLINE_CONCEPTS[concept].name}
        targetConceptName={AIRLINE_CONCEPTS[targetConcept].name}
        canAfford={cash >= CONCEPT_CHANGE_COST}
        onConfirm={() => {
          onConceptChange(targetConcept);
          setModalOpen(false);
        }}
        onClose={() => setModalOpen(false)}
      />
    )}
    </>
  );
};

const TransitionStatusPanel: React.FC<{ gameState: GameState }> = ({ gameState }) => {
  const { conceptTransition, date } = gameState;
  if (!conceptTransition) return null;

  const { startDate, endDate, from, to } = conceptTransition;
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = date.getTime() - startDate.getTime();
  const progress = Math.min(1, elapsed / totalDuration);
  const remainingDays = Math.ceil((endDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  const fromRep = BRAND_REPUTATIONS[AIRLINE_CONCEPTS[from].initialReputation];
  const toRep = BRAND_REPUTATIONS[AIRLINE_CONCEPTS[to].initialReputation];
  
  const demandModifier = {
      first: fromRep.demandModifier.first * (1 - progress) + toRep.demandModifier.first * progress,
      business: fromRep.demandModifier.business * (1 - progress) + toRep.demandModifier.business * progress,
      economy: fromRep.demandModifier.economy * (1 - progress) + toRep.demandModifier.economy * progress,
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">브랜드 전환 중</h2>
         <p className="text-sm text-slate-500 dark:text-slate-400">
            '{AIRLINE_CONCEPTS[from].name}'에서 '{AIRLINE_CONCEPTS[to].name}'(으)로 전환하고 있습니다.
         </p>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-bold text-md text-slate-800 dark:text-slate-100">전환 완료까지: {remainingDays}일</h3>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-2">
            <div className="bg-brand-blue-600 h-2.5 rounded-full" style={{ width: `${progress * 100}%` }}></div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-200">예상 수요 변동 (현재)</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">수요가 점진적으로 새 컨셉에 맞게 조정됩니다.</p>
          <div className="flex items-center space-x-4 text-sm">
            <ModifierStat icon={<Star size={14} className="text-yellow-500" />} value={formatModifier(demandModifier.first)} />
            <ModifierStat icon={<Briefcase size={14} className="text-blue-500" />} value={formatModifier(demandModifier.business)} />
            <ModifierStat icon={<Users size={14} className="text-green-500" />} value={formatModifier(demandModifier.economy)} />
          </div>
        </div>
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 pt-2">전환 기간 동안에는 평판이 진화하지 않습니다.</p>
      </div>
    </div>
  );
};

const ConceptChangeModal: React.FC<{ currentConceptName: string, targetConceptName: string, canAfford: boolean, onConfirm: () => void, onClose: () => void }> = ({ currentConceptName, targetConceptName, canAfford, onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
       <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-bold">컨셉 변경 확인</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
           <div className="p-4 bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500 text-amber-800 dark:text-amber-200 rounded-r-lg">
              <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-3" />
                  <div>
                      <h4 className="font-bold">주의!</h4>
                      <p className="text-sm mt-1">컨셉 변경은 항공사 운영에 큰 영향을 미치는 중대한 결정입니다.</p>
                  </div>
              </div>
          </div>
          <p>'{currentConceptName}'에서 '{targetConceptName}'(으)로 컨셉을 변경하시겠습니까?</p>
          <ul className="text-sm space-y-2 list-disc list-inside text-slate-600 dark:text-slate-300">
              <li>재브랜딩 비용으로 <span className="font-bold text-red-500">{formatCurrency(CONCEPT_CHANGE_COST)}</span>이 즉시 차감됩니다.</li>
              <li>완전히 전환되기까지 <span className="font-bold">{CONCEPT_TRANSITION_YEARS}년</span>의 과도기가 필요합니다.</li>
              <li>전환 기간 동안 승객 수요가 불안정해지며, 평판 진화가 중단됩니다.</li>
          </ul>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end space-x-3 rounded-b-lg">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">취소</button>
            <button 
                onClick={onConfirm}
                disabled={!canAfford}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {canAfford ? '변경 확정' : '자금 부족'}
            </button>
        </div>
    </div>
  </div>
);


const ModifierStat: React.FC<{ icon: React.ReactNode; value: string }> = ({ icon, value }) => {
  const colorClass = value.startsWith('+') ? 'text-green-500' : (value.startsWith('-') ? 'text-red-500' : 'text-slate-500');
  return (
    <div className="flex items-center">
      {icon}
      <span className={`ml-1 font-semibold ${colorClass}`}>{value}</span>
    </div>
  );
};

export default BrandPanel;
import React, { useState, useMemo } from 'react';
import type { GameState, AircraftModel, AircraftConfigurationType } from '../types';
import { AIRCRAFT_MODELS, AIRCRAFT_CONFIGURATIONS, LEASE_COST_PERCENTAGE, LEASE_DEPOSIT_MONTHS, LEASE_TERM_YEARS } from '../constants';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Plane, Users, Briefcase, Star, X, Smile } from 'lucide-react';

interface AcquireAircraftPanelProps {
  gameState: GameState;
  onPurchaseAircraft: (modelId: string, configId: AircraftConfigurationType, nickname: string, base: string) => void;
  onLeaseAircraft: (modelId: string, configId: AircraftConfigurationType, nickname: string, base: string) => void;
}

const AcquireAircraftPanel: React.FC<AcquireAircraftPanelProps> = ({ gameState, onPurchaseAircraft, onLeaseAircraft }) => {
    const [selectedModel, setSelectedModel] = useState<AircraftModel | null>(null);
    const [manufacturerFilter, setManufacturerFilter] = useState('All');
    const [sizeFilter, setSizeFilter] = useState<'All' | 'Narrow-body' | 'Wide-body'>('All');
    const { cash, date, airlineProfile } = gameState;
    const currentYear = date.getFullYear();

    const manufacturers = useMemo(() => {
        return ['All', ...new Set(AIRCRAFT_MODELS.map(m => m.manufacturer))];
    }, []);

    const availableAircraft = useMemo(() => {
        return AIRCRAFT_MODELS
            .filter(model => model.unlockYear <= currentYear)
            .filter(model => {
                if (manufacturerFilter !== 'All' && model.manufacturer !== manufacturerFilter) {
                    return false;
                }
                if (sizeFilter === 'Narrow-body' && model.capacity >= 250) {
                    return false;
                }
                if (sizeFilter === 'Wide-body' && model.capacity < 250) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => a.capacity - b.capacity);
    }, [currentYear, manufacturerFilter, sizeFilter]);

    const handleAcquireClick = (model: AircraftModel) => {
        setSelectedModel(model);
    };

    return (
        <>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                <Plane className="w-5 h-5 mr-2 text-slate-500" />
                항공기 획득
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">새로운 항공기를 구매하거나 리스할 수 있습니다.</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                    <label htmlFor="ac-manufacturer-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400">제조사</label>
                    <select id="ac-manufacturer-filter" value={manufacturerFilter} onChange={e => setManufacturerFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md">
                        {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="ac-size-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400">크기</label>
                    <select id="ac-size-filter" value={sizeFilter} onChange={e => setSizeFilter(e.target.value as 'All' | 'Narrow-body' | 'Wide-body')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md">
                        <option value="All">All</option>
                        <option value="Narrow-body">협동체 (&lt; 250석)</option>
                        <option value="Wide-body">광동체 (≥ 250석)</option>
                    </select>
                </div>
            </div>
            <div className="p-4 max-h-[520px] overflow-y-auto">
                {availableAircraft.length > 0 ? (
                    <div className="space-y-4">
                        {availableAircraft.map(model => (
                            <AircraftCard key={model.id} model={model} onAcquireClick={handleAcquireClick} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">조건에 맞는 항공기가 없습니다.</p>
                )}
            </div>
        </div>
        {selectedModel && (
            <AcquisitionModal
            model={selectedModel}
            cash={cash}
            hubs={airlineProfile?.hubs || []}
            onPurchase={onPurchaseAircraft}
            onLease={onLeaseAircraft}
            onClose={() => setSelectedModel(null)}
            />
        )}
        </>
    );
};

const AcquisitionModal: React.FC<{
  model: AircraftModel;
  cash: number;
  hubs: string[];
  onPurchase: (modelId: string, configId: AircraftConfigurationType, nickname: string, base: string) => void;
  onLease: (modelId: string, configId: AircraftConfigurationType, nickname: string, base: string) => void;
  onClose: () => void;
}> = ({ model, cash, hubs, onPurchase, onLease, onClose }) => {
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [selectedHub, setSelectedHub] = useState<string>(hubs[0] || '');

  const handleNicknameChange = (configId: string, value: string) => {
    setNicknames(prev => ({ ...prev, [configId]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">{model.name} 획득 방식 선택</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">항공기 별명과 소속 허브를 지정하고 구매/리스할 수 있습니다.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="px-4">
            <label htmlFor="hub-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">배정 허브</label>
            <select
              id="hub-select"
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="mt-1 block w-full md:w-1/3 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500"
              required
            >
              {hubs.map(hubCode => (
                <option key={hubCode} value={hubCode}>{hubCode}</option>
              ))}
            </select>
          </div>
          {Object.values(AIRCRAFT_CONFIGURATIONS).map(config => {
            const finalPrice = model.price * config.costModifier;
            const monthlyLeaseCost = finalPrice * LEASE_COST_PERCENTAGE;
            const deposit = monthlyLeaseCost * LEASE_DEPOSIT_MONTHS;
            const capacity = config.seating(model.capacity);
            const nickname = nicknames[config.id] || '';

            const canAffordPurchase = cash >= finalPrice;
            const canAffordLease = cash >= deposit;
            const isAcquisitionDisabled = !nickname.trim() || !selectedHub;
            
            const satisfactionModifier = config.satisfactionModifier;
            const satisfactionColor = satisfactionModifier > 0 ? 'text-green-500' : satisfactionModifier < 0 ? 'text-red-500' : 'text-slate-500';

            return (
              <div key={config.id} className="p-4 border border-slate-300 dark:border-slate-600 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                  {/* Config Info */}
                  <div className="lg:col-span-1">
                    <h4 className="font-semibold">{config.name}</h4>
                    <div className="flex items-center space-x-3 text-sm mt-1 text-slate-600 dark:text-slate-300">
                      <span><Star size={14} className="inline mr-1 text-yellow-500" />{capacity.first}</span>
                      <span><Briefcase size={14} className="inline mr-1 text-blue-500" />{capacity.business}</span>
                      <span><Users size={14} className="inline mr-1 text-green-500" />{capacity.economy}</span>
                    </div>
                     <div className={`flex items-center text-sm mt-1 font-semibold ${satisfactionColor}`}>
                        <Smile size={14} className="inline mr-1" />
                        <span>만족도: {satisfactionModifier > 0 ? '+' : ''}{satisfactionModifier}</span>
                      </div>
                  </div>
                  {/* Nickname */}
                  <div className="lg:col-span-1">
                     <input 
                        type="text" 
                        value={nickname}
                        onChange={(e) => handleNicknameChange(config.id, e.target.value)}
                        className="block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500"
                        placeholder="항공기 별명 (예: HL7474)"
                        required
                    />
                  </div>
                  {/* Options & Actions */}
                  <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                    <div className={`text-center p-3 rounded-md ${canAffordPurchase ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <p className="font-bold text-sm">전액 구매</p>
                      <p className="font-bold text-md text-green-600 dark:text-green-400">{formatCurrency(finalPrice)}</p>
                       <button
                        onClick={() => {
                          onPurchase(model.id, config.id, nickname, selectedHub);
                          onClose();
                        }}
                        disabled={!canAffordPurchase || isAcquisitionDisabled}
                        className="mt-2 w-full px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                      >
                        구매
                      </button>
                    </div>
                     <div className={`text-center p-3 rounded-md ${canAffordLease ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <p className="font-bold text-sm">리스 ({LEASE_TERM_YEARS}년)</p>
                      <p className="font-bold text-md text-blue-600 dark:text-blue-400">{formatCurrency(deposit)}</p>
                      <button
                        onClick={() => {
                          onLease(model.id, config.id, nickname, selectedHub);
                          onClose();
                        }}
                        disabled={!canAffordLease || isAcquisitionDisabled}
                        className="mt-2 w-full px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                      >
                        리스
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


const AircraftCard: React.FC<{ model: AircraftModel; onAcquireClick: (model: AircraftModel) => void }> = ({ model, onAcquireClick }) => (
  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{model.name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{model.manufacturer}</p>
      </div>
      <button
        onClick={() => onAcquireClick(model)}
        className="px-3 py-1.5 text-sm font-semibold text-white bg-brand-blue-600 rounded-md hover:bg-brand-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        획득
      </button>
    </div>
    <p className="mt-2 text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(model.price)} (기본)</p>
    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
        <Stat label="기본 좌석" value={`${formatNumber(model.capacity)}석`} />
        <Stat label="항속거리" value={`${formatNumber(model.range)}km`} />
        <Stat label="기본 유지비" value={`${formatCurrency(model.operatingCost)}/일`} />
    </div>
  </div>
);


const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded">
        <p className="font-semibold text-slate-800 dark:text-slate-200">{value}</p>
        <p className="text-slate-500 dark:text-slate-400 text-xs">{label}</p>
    </div>
);


export default AcquireAircraftPanel;
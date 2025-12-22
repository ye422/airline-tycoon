
import React, { useState, useMemo } from 'react';
import type { PlayerAircraft, AircraftConfigurationType } from '../types';
import { AIRCRAFT_MODELS, AIRCRAFT_CONFIGURATIONS, LEASE_EARLY_RETURN_PENALTY_MONTHS, LEASE_BUYOUT_COST_PERCENTAGE, AIRCRAFT_HUB_TRANSFER_COST, AIRCRAFT_CONFIG_CHANGE_COST_MODIFIER, AIRCRAFT_RETROFIT_COST_MODIFIER, AIRCRAFT_AGE_SATISFACTION_THRESHOLD } from '../constants';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ListFilter, Building, PlaneTakeoff, Wrench, RefreshCw, BadgeDollarSign, Undo2, HandCoins, AlertTriangle, Move, Settings, X, Info } from 'lucide-react';

interface OwnedAircraftPanelProps {
  fleet: PlayerAircraft[];
  currentDate: Date;
  cash: number;
  hubs: string[];
  onSellAircraft: (aircraftId: string) => void;
  onReturnLease: (aircraftId: string) => void;
  onExtendLease: (aircraftId: string) => void;
  onBuyoutAircraft: (aircraftId: string) => void;
  onTransferAircraftHub: (aircraftId: string, newHub: string) => void;
  onAircraftConfigChange: (aircraftId: string, newConfigId: AircraftConfigurationType) => void;
  onAircraftRetrofit: (aircraftId: string) => void;
}

const OwnedAircraftPanel: React.FC<OwnedAircraftPanelProps> = ({ 
    fleet, 
    currentDate, 
    cash,
    hubs, 
    onSellAircraft, 
    onReturnLease, 
    onExtendLease, 
    onBuyoutAircraft,
    onTransferAircraftHub,
    onAircraftConfigChange,
    onAircraftRetrofit,
}) => {
  const [manufacturerFilter, setManufacturerFilter] = useState('All');
  const [modelFilter, setModelFilter] = useState('All');
  const [sizeFilter, setSizeFilter] = useState('All');
  const [hubFilter, setHubFilter] = useState('All');
  const [actionableAircraft, setActionableAircraft] = useState<{aircraft: PlayerAircraft, action: 'sell' | 'return_early' | 'return_expired' | 'extend' | 'buyout'} | null>(null);
  const [transferringAircraft, setTransferringAircraft] = useState<PlayerAircraft | null>(null);
  const [managingAircraft, setManagingAircraft] = useState<PlayerAircraft | null>(null);

  const manufacturers = useMemo(() => ['All', ...new Set(AIRCRAFT_MODELS.map(m => m.manufacturer))], []);
  
  const models = useMemo(() => {
    let filteredModels = AIRCRAFT_MODELS;
    if (manufacturerFilter !== 'All') {
        filteredModels = filteredModels.filter(m => m.manufacturer === manufacturerFilter);
    }
    return ['All', ...new Set(filteredModels.map(m => m.name))];
  }, [manufacturerFilter]);
  
  const filteredFleet = useMemo(() => {
    return fleet.filter(aircraft => {
      const model = AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId);
      if (!model) return false;

      if (manufacturerFilter !== 'All' && model.manufacturer !== manufacturerFilter) return false;
      if (modelFilter !== 'All' && model.name !== modelFilter) return false;
      
      const totalSeats = aircraft.capacity.first + aircraft.capacity.business + aircraft.capacity.economy;
      if (sizeFilter === 'Narrow-body' && totalSeats >= 250) return false;
      if (sizeFilter === 'Wide-body' && totalSeats < 250) return false;
      
      if (hubFilter !== 'All' && aircraft.base !== hubFilter) return false;

      return true;
    });
  }, [fleet, manufacturerFilter, modelFilter, sizeFilter, hubFilter]);

  React.useEffect(() => {
      const selectedModelInfo = AIRCRAFT_MODELS.find(m => m.name === modelFilter);
      if (modelFilter !== 'All' && selectedModelInfo?.manufacturer !== manufacturerFilter && manufacturerFilter !== 'All') {
          setModelFilter('All');
      }
  }, [manufacturerFilter, modelFilter]);

  const getActionModal = () => {
    if (!actionableAircraft) return null;
    const { aircraft, action } = actionableAircraft;
    const model = AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId);
    const config = AIRCRAFT_CONFIGURATIONS[aircraft.configurationId];
    if (!model || !config) return null;

    let title, message, confirmText, onConfirm, isDestructive = false;
    
    switch(action) {
      case 'sell':
        const originalPrice = model.price * config.costModifier;
        const ageInYears = (currentDate.getTime() - aircraft.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        const MAX_DEPRECIATION_YEARS = 25;
        const RESIDUAL_VALUE_PERCENTAGE = 0.1;
        const depreciationFactor = Math.min(ageInYears, MAX_DEPRECIATION_YEARS) / MAX_DEPRECIATION_YEARS;
        const salePrice = originalPrice * (1 - (1 - RESIDUAL_VALUE_PERCENTAGE) * depreciationFactor);
        
        title = "항공기 매각 확인";
        message = `${aircraft.nickname} 항공기를 매각하시겠습니까? 예상 매각 가격은 ${formatCurrency(salePrice)}입니다. 기령에 따라 가격이 변동될 수 있습니다.`;
        confirmText = "매각 확정";
        onConfirm = () => onSellAircraft(aircraft.id);
        isDestructive = true;
        break;
      case 'return_early':
        const penalty = (aircraft.leaseCost || 0) * LEASE_EARLY_RETURN_PENALTY_MONTHS;
        title = "조기 반납 확인";
        message = `${aircraft.nickname} 항공기 리스를 조기 반납하시겠습니까? 위약금 ${formatCurrency(penalty)}가 부과됩니다.`;
        confirmText = "반납 확정";
        onConfirm = () => onReturnLease(aircraft.id);
        isDestructive = true;
        break;
      case 'return_expired':
        title = "반납 확인";
        message = `${aircraft.nickname} 항공기 리스 계약이 만료되었습니다. 위약금 없이 반납합니다.`;
        confirmText = "반납";
        onConfirm = () => onReturnLease(aircraft.id);
        break;
      case 'extend':
        title = "리스 연장 확인";
        message = `${aircraft.nickname} 항공기 리스 계약을 연장하시겠습니까? 현재 리스 조건이 동일하게 적용됩니다.`;
        confirmText = "연장";
        onConfirm = () => onExtendLease(aircraft.id);
        break;
      case 'buyout':
        const buyoutCost = model.price * LEASE_BUYOUT_COST_PERCENTAGE;
        title = "항공기 구매 확인";
        message = `${aircraft.nickname} 항공기를 ${formatCurrency(buyoutCost)}에 구매(바이아웃)하시겠습니까? 구매 후에는 월 리스료가 발생하지 않습니다.`;
        confirmText = "구매";
        onConfirm = () => onBuyoutAircraft(aircraft.id);
        break;
    }

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-2">
            {isDestructive && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
          <p className="p-6">{message}</p>
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end space-x-3 rounded-b-lg">
            <button onClick={() => setActionableAircraft(null)} className="px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">취소</button>
            <button 
              onClick={() => { onConfirm(); setActionableAircraft(null); }} 
              className={`px-4 py-2 text-sm font-semibold text-white rounded-md ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-blue-600 hover:bg-brand-blue-700'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
          <ListFilter className="w-5 h-5 mr-2 text-slate-500" />
          보유 항공기 목록
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">보유 중인 모든 항공기의 상태를 확인하고 관리합니다.</p>
      </div>
      
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <label htmlFor="manufacturer-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400">제조사</label>
          <select id="manufacturer-filter" value={manufacturerFilter} onChange={e => setManufacturerFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md">
            {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="model-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400">기종</label>
          <select id="model-filter" value={modelFilter} onChange={e => setModelFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md">
             {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="size-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400">크기</label>
          <select id="size-filter" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md">
            <option value="All">All</option>
            <option value="Narrow-body">협동체 (&lt; 250석)</option>
            <option value="Wide-body">광동체 (≥ 250석)</option>
          </select>
        </div>
        <div>
          <label htmlFor="hub-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400">소속 허브</label>
          <select id="hub-filter" value={hubFilter} onChange={e => setHubFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md">
            <option value="All">All</option>
            {hubs.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      <div className="p-4 max-h-[600px] overflow-y-auto">
        {fleet.length === 0 ? (
           <p className="text-center text-slate-500 dark:text-slate-400 py-8">보유한 항공기가 없습니다.</p>
        ) : filteredFleet.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFleet.map(aircraft => {
              const model = AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId)!;
              const age = (currentDate.getTime() - aircraft.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
              const totalSeats = aircraft.capacity.first + aircraft.capacity.business + aircraft.capacity.economy;

              const isLeased = aircraft.ownership === 'leased';
              const isLeaseExpired = isLeased && aircraft.leaseEndDate && currentDate >= aircraft.leaseEndDate;
              const isScheduled = aircraft.schedule.length > 0;

              return (
                <div key={aircraft.id} className={`p-4 border rounded-lg flex flex-col justify-between ${isLeaseExpired ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{aircraft.nickname} <span className="text-sm font-mono text-slate-400">@{aircraft.base}</span></h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{model.name}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${aircraft.ownership === 'owned' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                        {aircraft.ownership === 'owned' ? '소유' : '리스'}
                      </span>
                    </div>
                    {isLeaseExpired && (
                       <p className={`text-xs mt-1 text-red-500 font-bold`}>
                         계약 만료: {formatDate(aircraft.leaseEndDate!)}
                       </p>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="flex items-center text-slate-600 dark:text-slate-300">
                          <Wrench size={14} className="mr-2 text-slate-400" />
                          기령: <span className="font-semibold ml-1">{age.toFixed(1)}년</span>
                      </div>
                      <div className="flex items-center text-slate-600 dark:text-slate-300">
                          <Building size={14} className="mr-2 text-slate-400" />
                          제조사: <span className="font-semibold ml-1">{model.manufacturer}</span>
                      </div>
                      <div className="flex items-center text-slate-600 dark:text-slate-300">
                          <PlaneTakeoff size={14} className="mr-2 text-slate-400" />
                          좌석: <span className="font-semibold ml-1">{totalSeats}석</span>
                      </div>
                      <div className="flex items-center text-slate-600 dark:text-slate-300 space-x-2">
                          <span><span className="font-bold text-yellow-500 text-xs">F</span>{aircraft.capacity.first}</span>
                          <span><span className="font-bold text-blue-500 text-xs">B</span>{aircraft.capacity.business}</span>
                          <span><span className="font-bold text-green-500 text-xs">E</span>{aircraft.capacity.economy}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 justify-end">
                    <button 
                        onClick={() => setManagingAircraft(aircraft)}
                        disabled={isScheduled}
                        title={isScheduled ? "스케줄이 배정된 항공기는 관리할 수 없습니다." : "객실 구성 변경 및 성능 개선"}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Settings size={14} className="mr-1"/>관리
                    </button>
                    <button 
                        onClick={() => setTransferringAircraft(aircraft)}
                        disabled={isScheduled}
                        title={isScheduled ? "스케줄이 배정된 항공기는 이전할 수 없습니다." : "항공기를 다른 허브로 이전합니다."}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Move size={14} className="mr-1"/>기지 이전
                    </button>
                    {aircraft.ownership === 'owned' ? (
                       <button onClick={() => setActionableAircraft({aircraft, action: 'sell'})} className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center"><HandCoins size={14} className="mr-1"/>매각</button>
                    ) : isLeaseExpired ? (
                      <>
                        <button onClick={() => setActionableAircraft({aircraft, action: 'extend'})} className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center"><RefreshCw size={14} className="mr-1"/>연장</button>
                        <button onClick={() => setActionableAircraft({aircraft, action: 'buyout'})} className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"><BadgeDollarSign size={14} className="mr-1"/>구매</button>
                        <button onClick={() => setActionableAircraft({aircraft, action: 'return_expired'})} className="px-3 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 flex items-center"><Undo2 size={14} className="mr-1"/>반납</button>
                      </>
                    ) : (
                       <button onClick={() => setActionableAircraft({aircraft, action: 'return_early'})} className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"><Undo2 size={14} className="mr-1"/>조기 반납</button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">조건에 맞는 항공기가 없습니다.</p>
        )}
      </div>
    </div>
    {getActionModal()}
    {transferringAircraft && (
      <HubTransferModal
        aircraft={transferringAircraft}
        hubs={hubs}
        currentCash={cash}
        onConfirm={onTransferAircraftHub}
        onClose={() => setTransferringAircraft(null)}
      />
    )}
    {managingAircraft && (
        <AircraftManageModal
            aircraft={managingAircraft}
            currentCash={cash}
            currentDate={currentDate}
            onConfigChange={onAircraftConfigChange}
            onRetrofit={onAircraftRetrofit}
            onClose={() => setManagingAircraft(null)}
        />
    )}
    </>
  );
};

const HubTransferModal: React.FC<{
  aircraft: PlayerAircraft;
  hubs: string[];
  currentCash: number;
  onConfirm: (aircraftId: string, newHub: string) => void;
  onClose: () => void;
}> = ({ aircraft, hubs, currentCash, onConfirm, onClose }) => {
  const availableHubs = hubs.filter(h => h !== aircraft.base);
  const [selectedHub, setSelectedHub] = useState(availableHubs[0] || '');

  const canAfford = currentCash >= AIRCRAFT_HUB_TRANSFER_COST;

  const handleConfirm = () => {
    if (selectedHub) {
      onConfirm(aircraft.id, selectedHub);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold">항공기 기지 이전</h3>
        </div>
        <div className="p-6 space-y-4">
          <p>{aircraft.nickname} 항공기를 <span className="font-bold">{aircraft.base}</span>에서 다른 허브로 이전합니다.</p>
          <div>
            <label htmlFor="hub-transfer-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">이전할 허브</label>
            <select
              id="hub-transfer-select"
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500"
            >
              {availableHubs.map(hub => <option key={hub} value={hub}>{hub}</option>)}
            </select>
          </div>
          <p className="text-sm">이전 비용: <span className="font-bold text-red-500">{formatCurrency(AIRCRAFT_HUB_TRANSFER_COST)}</span></p>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end space-x-3 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">취소</button>
          <button
            onClick={handleConfirm}
            disabled={!canAfford || !selectedHub}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-blue-600 rounded-md hover:bg-brand-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {canAfford ? '이전 확정' : '자금 부족'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AircraftManageModal: React.FC<{
    aircraft: PlayerAircraft;
    currentCash: number;
    currentDate: Date;
    onConfigChange: (aircraftId: string, newConfigId: AircraftConfigurationType) => void;
    onRetrofit: (aircraftId: string) => void;
    onClose: () => void;
}> = ({ aircraft, currentCash, currentDate, onConfigChange, onRetrofit, onClose }) => {
    const model = AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId)!;
    const [newConfigId, setNewConfigId] = useState<AircraftConfigurationType>(aircraft.configurationId);

    const configChangeCost = model.price * AIRCRAFT_CONFIG_CHANGE_COST_MODIFIER;
    const canAffordConfigChange = currentCash >= configChangeCost;
    
    const retrofitCost = model.price * AIRCRAFT_RETROFIT_COST_MODIFIER;
    const canAffordRetrofit = currentCash >= retrofitCost;

    const age = (currentDate.getTime() - aircraft.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const needsRetrofit = age > AIRCRAFT_AGE_SATISFACTION_THRESHOLD;

    const handleConfigChange = () => {
        onConfigChange(aircraft.id, newConfigId);
        onClose();
    };

    const handleRetrofit = () => {
        onRetrofit(aircraft.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold">{aircraft.nickname} 관리</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Configuration Change */}
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <h4 className="font-semibold text-md mb-2">객실 구성 변경</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                                <label htmlFor="config-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">새 구성 선택</label>
                                <select 
                                    id="config-select" 
                                    value={newConfigId}
                                    onChange={(e) => setNewConfigId(e.target.value as AircraftConfigurationType)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md"
                                >
                                    {Object.values(AIRCRAFT_CONFIGURATIONS).map(config => (
                                        <option key={config.id} value={config.id}>{config.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">비용: <span className="font-bold text-red-500">{formatCurrency(configChangeCost)}</span></p>
                                <button
                                    onClick={handleConfigChange}
                                    disabled={!canAffordConfigChange || newConfigId === aircraft.configurationId}
                                    className="mt-1 w-full px-4 py-2 text-sm font-semibold text-white bg-brand-blue-600 rounded-md hover:bg-brand-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                >
                                    {canAffordConfigChange ? "변경 확정" : "자금 부족"}
                                </button>
                            </div>
                        </div>
                        <div className="mt-2 flex items-start text-xs text-slate-500 dark:text-slate-400">
                            <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                            <span>구성 변경 시 해당 항공기의 스케줄이 초기화됩니다. 이 작업은 즉시 적용됩니다.</span>
                        </div>
                    </div>

                    {/* Retrofit */}
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <h4 className="font-semibold text-md mb-2">성능 개선 (Retrofit)</h4>
                        {needsRetrofit ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        기령({age.toFixed(1)}년)으로 인한 만족도 하락을 없애기 위해 기체를 현대화합니다.
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">비용: <span className="font-bold text-red-500">{formatCurrency(retrofitCost)}</span></p>
                                    <button
                                        onClick={handleRetrofit}
                                        disabled={!canAffordRetrofit}
                                        className="mt-1 w-full px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                    >
                                        {canAffordRetrofit ? "개선 확정" : "자금 부족"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">이 항공기는 아직 성능 개선이 필요하지 않습니다 (기령 {AIRCRAFT_AGE_SATISFACTION_THRESHOLD}년 이상부터 가능).</p>
                        )}
                        <div className="mt-2 flex items-start text-xs text-slate-500 dark:text-slate-400">
                            <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                            <span>성능 개선 후 기령이 0으로 초기화되며, 관련 만족도 패널티가 사라집니다. 스케줄도 함께 초기화됩니다.</span>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">닫기</button>
                </div>
            </div>
        </div>
    );
};


export default OwnedAircraftPanel;

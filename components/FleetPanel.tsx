import React, { useState, useMemo } from 'react';
import type { PlayerAircraft, Route, Airport } from '../types';
import { AIRCRAFT_MODELS, AIRCRAFT_CONFIGURATIONS } from '../constants';
import { formatDate, getAirportCode } from '../utils/formatters';
import { Plane, Users, Briefcase, Star, Clock, X, PlusCircle, Trash2, AlertTriangle } from 'lucide-react';

interface FleetPanelProps {
  fleet: PlayerAircraft[];
  routes: Route[];
  currentDate: Date;
  airlineCode: string;
  airports: Airport[];
  hubs: string[];
  onUpdateSchedule: (aircraftId: string, newSchedule: string[]) => void;
}

const ScheduleModal: React.FC<{
  aircraft: PlayerAircraft;
  allOpenedRoutes: Route[];
  fleet: PlayerAircraft[]; // Pass entire fleet to calculate global slot usage
  airports: Airport[];
  onSave: (newSchedule: string[]) => void;
  onClose: () => void;
}> = ({ aircraft, allOpenedRoutes, fleet, airports, onSave, onClose }) => {
  const [currentSchedule, setCurrentSchedule] = useState<string[]>(aircraft.schedule.map(s => s.routeId));
  
  const slotUsageByAirport = useMemo(() => {
    const usage = new Map<string, number>();
    fleet.forEach(ac => {
      ac.schedule.forEach(item => {
        const route = allOpenedRoutes.find(r => r.id === item.routeId);
        if (route) {
          const originCode = getAirportCode(route.origin);
          const destCode = getAirportCode(route.destination);
          if (originCode) {
            usage.set(originCode, (usage.get(originCode) || 0) + 1);
          }
          if (destCode) {
            usage.set(destCode, (usage.get(destCode) || 0) + 1);
          }
        }
      });
    });
    return usage;
  }, [fleet, allOpenedRoutes]);

  const getRouteById = (id: string) => allOpenedRoutes.find(r => r.id === id);

  const totalTime = useMemo(() => {
    return currentSchedule.reduce((acc, routeId) => {
      const route = getRouteById(routeId);
      return acc + (route?.turnaroundTime || 0);
    }, 0);
  }, [currentSchedule, allOpenedRoutes]);

  const addRouteToSchedule = (routeId: string) => {
    const route = getRouteById(routeId);
    if (!route) return;
  
    if (route.turnaroundTime > 1440) {
      if (currentSchedule.length === 0) {
        setCurrentSchedule([routeId]);
      }
    } else {
      if (totalTime + route.turnaroundTime <= 1440) {
        setCurrentSchedule(prev => [...prev, routeId]);
      }
    }
  };

  const removeRouteFromSchedule = (index: number) => {
    setCurrentSchedule(prev => prev.filter((_, i) => i !== index));
  };

  const availableRoutes = useMemo(() => {
    const isUltraLongHaulScheduled = totalTime > 1440;
    
    if (isUltraLongHaulScheduled) {
        return [];
    }
    
    return allOpenedRoutes.filter(route => {
      const model = AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId);
      if (!model || model.range < route.distance) return false;
      
      const originCode = getAirportCode(route.origin);
      if (originCode !== aircraft.base) {
        return false;
      }

      const destCode = getAirportCode(route.destination);

      const originAirport = airports.find(a => a.code === originCode);
      const destAirport = airports.find(a => a.code === destCode);
      if (!originAirport || !destAirport) return false;

      const originSlotsUsed = slotUsageByAirport.get(originCode) || 0;
      const destSlotsUsed = slotUsageByAirport.get(destCode) || 0;
      
      if (originSlotsUsed >= originAirport.slots || destSlotsUsed >= destAirport.slots) {
          return false;
      }

      if (route.turnaroundTime > 1440) {
        return currentSchedule.length === 0;
      }

      return totalTime + route.turnaroundTime <= 1440;
    });
  }, [allOpenedRoutes, totalTime, aircraft.modelId, aircraft.base, currentSchedule, slotUsageByAirport, airports]);

  return (
     <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">{aircraft.nickname} 스케줄 관리</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">24시간 내에 운항할 노선을 배정하세요.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          {/* Available Routes */}
          <div className="flex flex-col">
            <h4 className="font-semibold mb-2">운항 가능 노선</h4>
            <div className="flex-grow bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 overflow-y-auto space-y-2">
              {availableRoutes.length > 0 ? availableRoutes.map(route => {
                const destCode = getAirportCode(route.destination);
                const destAirport = airports.find(a => a.code === destCode);
                const destSlotsUsed = slotUsageByAirport.get(destCode) || 0;
                const remainingSlots = destAirport ? destAirport.slots - destSlotsUsed : 0;
                
                return (
                    <div key={route.id} className="p-2 bg-white dark:bg-slate-800 rounded shadow-sm flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{route.origin.split(' (')[0]} ↔ {route.destination.split(' (')[0]}</p>
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 space-x-2">
                            <span><Clock size={12} className="inline mr-1" />{route.turnaroundTime > 1440 ? '24시간+' : `${route.turnaroundTime}분`}</span>
                            <span title={`남은 슬롯: ${remainingSlots}`} className="font-mono">슬롯: {remainingSlots}</span>
                        </div>
                      </div>
                      <button onClick={() => addRouteToSchedule(route.id)} className="text-green-500 hover:text-green-600"><PlusCircle size={20} /></button>
                    </div>
                )
              }) : <p className="text-center text-sm text-slate-500 p-4">운항 가능한 노선이 없습니다. (항공기 기점: {aircraft.base})</p>}
            </div>
          </div>
          {/* Current Schedule */}
          <div className="flex flex-col">
            <h4 className="font-semibold mb-2">현재 스케줄 ({totalTime > 1440 ? '24시간+ (초장거리)' : `${totalTime} / 1440 분`})</h4>
             <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2">
                <div className="bg-brand-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, (totalTime / 1440) * 100)}%` }}></div>
             </div>
            <div className="flex-grow bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 overflow-y-auto space-y-2">
              {currentSchedule.length > 0 ? currentSchedule.map((routeId, index) => {
                const route = getRouteById(routeId);
                if (!route) return null;
                return (
                  <div key={index} className="p-2 bg-white dark:bg-slate-800 rounded shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{route.origin.split(' (')[0]} ↔ {route.destination.split(' (')[0]}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400"><Clock size={12} className="inline mr-1" />{route.turnaroundTime > 1440 ? '24시간+' : `${route.turnaroundTime}분`}</p>
                    </div>
                    <button onClick={() => removeRouteFromSchedule(index)} className="text-red-500 hover:text-red-600"><Trash2 size={20} /></button>
                  </div>
                )
              }) : <p className="text-center text-sm text-slate-500 p-4">배정된 노선이 없습니다.</p>}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end space-x-3 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600">취소</button>
          <button onClick={() => onSave(currentSchedule)} className="px-4 py-2 text-sm font-semibold text-white bg-brand-blue-600 rounded-md hover:bg-brand-blue-700">저장</button>
        </div>
      </div>
    </div>
  );
};

const FleetPanel: React.FC<FleetPanelProps> = ({ fleet, routes, currentDate, airlineCode, airports, hubs, onUpdateSchedule }) => {
  const [schedulingAircraft, setSchedulingAircraft] = useState<PlayerAircraft | null>(null);

  const [manufacturerFilter, setManufacturerFilter] = useState('All');
  const [modelFilter, setModelFilter] = useState('All');
  const [sizeFilter, setSizeFilter] = useState('All');
  const [hubFilter, setHubFilter] = useState('All');

  const manufacturers = useMemo(() => ['All', ...new Set(AIRCRAFT_MODELS.map(m => m.manufacturer))], []);
  
  const models = useMemo(() => {
    let filteredModels = AIRCRAFT_MODELS;
    if (manufacturerFilter !== 'All') {
        filteredModels = filteredModels.filter(m => m.manufacturer === manufacturerFilter);
    }
    return ['All', ...new Set(filteredModels.map(m => m.name))];
  }, [manufacturerFilter]);
  
  React.useEffect(() => {
      const selectedModelInfo = AIRCRAFT_MODELS.find(m => m.name === modelFilter);
      if (modelFilter !== 'All' && selectedModelInfo?.manufacturer !== manufacturerFilter && manufacturerFilter !== 'All') {
          setModelFilter('All');
      }
  }, [manufacturerFilter, modelFilter]);

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

  const getAircraftModel = (modelId: string) => AIRCRAFT_MODELS.find(m => m.id === modelId);
  const getRoute = (routeId: string) => routes.find(r => r.id === routeId);
  
  return (
    <>
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">노선 배치</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">항공기별 24시간 운항 스케줄을 관리하세요.</p>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <label htmlFor="fp-manufacturer-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400">제조사</label>
          <select id="fp-manufacturer-filter" value={manufacturerFilter} onChange={e => setManufacturerFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md">
            {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="fp-model-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400">기종</label>
          <select id="fp-model-filter" value={modelFilter} onChange={e => setModelFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md">
             {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="fp-size-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400">크기</label>
          <select id="fp-size-filter" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md">
            <option value="All">All</option>
            <option value="Narrow-body">협동체 (&lt; 250석)</option>
            <option value="Wide-body">광동체 (≥ 250석)</option>
          </select>
        </div>
        <div>
          <label htmlFor="fp-hub-filter" className="block text-xs font-medium text-slate-600 dark:text-slate-400">소속 허브</label>
          <select id="fp-hub-filter" value={hubFilter} onChange={e => setHubFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md">
            <option value="All">All</option>
            {hubs.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      <div className="p-4 max-h-[400px] overflow-y-auto">
        {fleet.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Plane className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2">보유한 항공기가 없습니다.</p>
            <p className="text-sm">마켓플레이스에서 항공기를 획득하세요.</p>
          </div>
        ) : filteredFleet.length > 0 ? (
          <div className="space-y-4">
            {filteredFleet.map(aircraft => {
              const model = getAircraftModel(aircraft.modelId);
              const config = AIRCRAFT_CONFIGURATIONS[aircraft.configurationId];
              if (!model || !config) return null;
              
              const totalTime = aircraft.schedule.reduce((acc, scheduleItem) => {
                  const route = getRoute(scheduleItem.routeId);
                  return acc + (route?.turnaroundTime || 0);
              }, 0);

              const isLeased = aircraft.ownership === 'leased';
              const isLeaseExpired = isLeased && aircraft.leaseEndDate && currentDate >= aircraft.leaseEndDate;

              return (
                <div key={aircraft.id} className={`p-4 border rounded-lg ${isLeaseExpired ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                  {isLeaseExpired && (
                     <div className="flex items-center text-red-600 dark:text-red-400 text-sm font-bold mb-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-md">
                        <AlertTriangle size={16} className="mr-2" />
                        리스 계약 만료: 운항 중단됨
                     </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                         <h3 className="font-semibold">{aircraft.nickname} <span className="text-base font-normal text-slate-500">({model.name})</span></h3>
                         <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">@{aircraft.base}</span>
                         {isLeased && <span className="text-xs font-semibold text-white bg-blue-500 px-2 py-0.5 rounded-full">리스</span>}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{config.name}</p>
                       <div className="flex items-center space-x-3 text-xs mt-1 text-slate-600 dark:text-slate-300">
                        <span><Star size={12} className="inline mr-1 text-yellow-500" />{aircraft.capacity.first}</span>
                        <span><Briefcase size={12} className="inline mr-1 text-blue-500" />{aircraft.capacity.business}</span>
                        <span><Users size={12} className="inline mr-1 text-green-500" />{aircraft.capacity.economy}</span>
                      </div>
                      {isLeased && aircraft.leaseEndDate && (
                        <p className={`text-xs mt-1 ${isLeaseExpired ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                          계약 만료: {formatDate(aircraft.leaseEndDate)}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                      <button 
                        onClick={() => setSchedulingAircraft(aircraft)}
                        disabled={isLeaseExpired}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-brand-blue-600 rounded-md hover:bg-brand-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                      >
                        스케줄 관리
                      </button>
                    </div>
                  </div>
                   {!isLeaseExpired && (
                     <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span className="font-semibold">스케줄 ({aircraft.schedule.length}개)</span>
                           <span className="text-xs font-mono">{totalTime > 1440 ? '24시간+ (초장거리)' : `${totalTime} / 1440 분`}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                           <div className="bg-brand-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, (totalTime / 1440) * 100)}%` }}></div>
                        </div>
                        {aircraft.schedule.length > 0 && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex flex-wrap gap-x-2 gap-y-1 font-mono">
                            {aircraft.schedule.map((scheduleItem, index) => {
                              const route = getRoute(scheduleItem.routeId);
                              return <span key={index} className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{airlineCode}{scheduleItem.flightNumber} ({route?.id})</span>;
                            })}
                          </div>
                        )}
                      </div>
                   )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">조건에 맞는 항공기가 없습니다.</p>
        )}
      </div>
    </div>
    {schedulingAircraft && (
      <ScheduleModal 
        aircraft={schedulingAircraft}
        allOpenedRoutes={routes}
        fleet={fleet}
        airports={airports}
        onClose={() => setSchedulingAircraft(null)}
        onSave={(newSchedule) => {
          onUpdateSchedule(schedulingAircraft.id, newSchedule);
          setSchedulingAircraft(null);
        }}
      />
    )}
    </>
  );
};

export default FleetPanel;
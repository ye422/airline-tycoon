import React, { useState, useMemo } from 'react';
import type { GameState, Airport } from '../types';
import { AirportScale } from '../types';
import { COUNTRIES_DATA, HUB_ESTABLISHMENT_COST, FOREIGN_HUB_ESTABLISHMENT_COST } from '../constants';
import { Building2, Search, Star, PlusCircle } from 'lucide-react';
import { getAirportCode, formatCurrency } from '../utils/formatters';
import AirportDetailPanel from './AirportDetailPanel';
import { AirportFacilityType } from '../types';

interface AirportManagementPageProps {
  gameState: GameState;
  onEstablishHub: (airportCode: string) => void;
  onPurchaseFacility?: (airportCode: string, facilityType: AirportFacilityType) => void;
}

const AirportCard: React.FC<{
  airport: Airport;
  isHub: boolean;
  usedSlots: number;
  establishmentCost: number;
  canAfford: boolean;
  onEstablishHub: () => void;
  onManage: () => void;
}> = ({ airport, isHub, usedSlots, establishmentCost, canAfford, onEstablishHub, onManage }) => {
  const scaleInfo = {
    [AirportScale.REGIONAL]: { text: '소형', color: 'bg-gray-500' },
    [AirportScale.MAJOR]: { text: '중형', color: 'bg-blue-500' },
    [AirportScale.HUB]: { text: '허브', color: 'bg-green-500' },
    [AirportScale.MEGA]: { text: '메가', color: 'bg-purple-500' },
  };

  return (
    <div className={`p-4 border rounded-lg relative flex flex-col justify-between ${isHub ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
      <div>
        {isHub && <Star size={18} className="absolute top-3 right-3 text-amber-500" fill="currentColor" />}
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">{airport.name}</h4>
            <p className="text-sm font-mono text-slate-500 dark:text-slate-400">{airport.code}</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${scaleInfo[airport.scale].color}`}>
            {scaleInfo[airport.scale].text}
          </span>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
          <div><span className="font-semibold">슬롯 (일):</span> {usedSlots.toLocaleString()} / {airport.slots.toLocaleString()}</div>
          <div><span className="font-semibold">활주로:</span> {airport.runwayLength.toLocaleString()}m</div>
        </div>
      </div>
      {!isHub ? (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
          <button
            onClick={onEstablishHub}
            disabled={!canAfford}
            className="w-full flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-white bg-brand-blue-600 rounded-md hover:bg-brand-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            <PlusCircle size={16} className="mr-2" />
            거점 설립 ({formatCurrency(establishmentCost)})
          </button>
        </div>
      ) : (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
          <button
            onClick={onManage}
            className="w-full flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-brand-blue-600 bg-brand-blue-50 border border-brand-blue-200 rounded-md hover:bg-brand-blue-100 dark:bg-slate-700 dark:text-brand-blue-400 dark:border-transparent dark:hover:bg-slate-600 transition-colors"
          >
            <Building2 size={16} className="mr-2" />
            시설 관리
          </button>
        </div>
      )}
    </div>
  );
};

const AirportManagementPage: React.FC<AirportManagementPageProps> = ({ gameState, onEstablishHub, onPurchaseFacility }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [scaleFilter, setScaleFilter] = useState<AirportScale | 'All'>('All');
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);

  const { airlineProfile, routes, airports } = gameState;
  const hubs = airlineProfile?.hubs || [];

  const displayableAirports = useMemo(() => {
    if (!airlineProfile) return [];

    const openedRoutes = routes.filter(r => r.isOpened);
    const foreignDestinationCodes = new Set<string>();

    openedRoutes.forEach(route => {
      const destCode = getAirportCode(route.destination);
      const destAirport = destCode ? airports.find(a => a.code === destCode) : null;
      if (destAirport && destAirport.country !== airlineProfile.country) {
        foreignDestinationCodes.add(destAirport.code);
      }
    });

    const airportCodesToShow = new Set<string>([...hubs, ...Array.from(foreignDestinationCodes)]);

    return airports.filter(airport =>
      airportCodesToShow.has(airport.code) || airport.country === airlineProfile.country
    );
  }, [airlineProfile, routes, hubs, airports]);

  const usedSlotsByAirport = useMemo(() => {
    const usedSlots = new Map<string, number>();
    gameState.fleet.forEach(ac => {
      ac.schedule.forEach(item => {
        const route = gameState.routes.find(r => r.id === item.routeId);
        if (route) {
          const originCode = getAirportCode(route.origin);
          const destCode = getAirportCode(route.destination);
          if (originCode) {
            usedSlots.set(originCode, (usedSlots.get(originCode) || 0) + 1);
          }
          if (destCode) {
            usedSlots.set(destCode, (usedSlots.get(destCode) || 0) + 1);
          }
        }
      });
    });
    return usedSlots;
  }, [gameState.fleet, gameState.routes]);

  const filteredAirports = useMemo(() => {
    return displayableAirports.filter(airport => {
      const query = searchQuery.toLowerCase();
      const matchesQuery = airport.name.toLowerCase().includes(query) || airport.code.toLowerCase().includes(query);
      const matchesCountry = countryFilter === 'All' || airport.country === countryFilter;
      const matchesScale = scaleFilter === 'All' || airport.scale === scaleFilter;
      return matchesQuery && matchesCountry && matchesScale;
    });
  }, [searchQuery, countryFilter, scaleFilter, displayableAirports]);

  const scaleFilterOptions = {
    [AirportScale.REGIONAL]: '소형',
    [AirportScale.MAJOR]: '중형',
    [AirportScale.HUB]: '허브',
    [AirportScale.MEGA]: '메가',
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-start mb-6">
        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-md mr-4">
          <Building2 className="w-6 h-6 text-brand-blue-600 dark:text-brand-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">공항 관리</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">전 세계 공항 정보를 확인하고 새로운 거점을 설립하세요.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="공항 이름 또는 코드로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
            />
          </div>
          <div>
            <label htmlFor="country-filter" className="sr-only">국가</label>
            <select
              id="country-filter"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
            >
              <option value="All">모든 국가</option>
              {Object.entries(COUNTRIES_DATA).map(([code, data]) => (
                <option key={code} value={code}>{data.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="scale-filter" className="sr-only">규모</label>
            <select
              id="scale-filter"
              value={scaleFilter}
              onChange={(e) => setScaleFilter(e.target.value as AirportScale | 'All')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
            >
              <option value="All">모든 규모</option>
              {Object.entries(scaleFilterOptions).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAirports.map(airport => {
          const isHub = hubs.includes(airport.code);
          const usedSlots = usedSlotsByAirport.get(airport.code) || 0;
          const isForeign = gameState.airlineProfile?.country !== airport.country;
          const cost = isForeign ? FOREIGN_HUB_ESTABLISHMENT_COST[airport.scale] : HUB_ESTABLISHMENT_COST[airport.scale];
          const canAfford = gameState.cash >= cost;

          return (
            <AirportCard
              key={airport.code}
              airport={airport}
              isHub={isHub}
              usedSlots={usedSlots}
              establishmentCost={cost}
              canAfford={canAfford}
              onEstablishHub={() => onEstablishHub(airport.code)}
              onManage={() => setSelectedAirport(airport)}
            />
          );
        })}
      </div>

      {selectedAirport && onPurchaseFacility && (
        <AirportDetailPanel
          airport={selectedAirport}
          gameState={gameState}
          onClose={() => setSelectedAirport(null)}
          onPurchaseFacility={onPurchaseFacility}
        />
      )}
    </div>
  );
};

export default AirportManagementPage;
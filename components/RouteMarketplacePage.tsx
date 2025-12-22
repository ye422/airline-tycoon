import React, { useState, useMemo } from 'react';
import type { GameState, Route, TicketPriceStrategy, Airport } from '../types';
import { TICKET_PRICE_STRATEGIES } from '../constants';
import { formatCurrency, formatNumber, formatModifier, getAirportCode } from '../utils/formatters';
import { Users, Briefcase, Star, X, TrendingUp, TrendingDown, Waypoints, ParkingCircle } from 'lucide-react';

interface RouteMarketplacePageProps {
  gameState: GameState;
  onOpenRoute: (route: Route, strategy: TicketPriceStrategy) => void;
}

type RouteCategory = 'trunk' | 'feeder' | 'regional';

const RouteMarketplacePage: React.FC<RouteMarketplacePageProps> = ({ gameState, onOpenRoute }) => {
  const [activeTab, setActiveTab] = useState<RouteCategory>('trunk');
  const [routeToPrice, setRouteToPrice] = useState<Route | null>(null);

  const { cash, routeMarket, fleet, airports } = gameState;

  const slotUsageByAirport = useMemo(() => {
    const usage = new Map<string, number>();
    fleet.forEach(ac => {
      ac.schedule.forEach(item => {
        const route = gameState.routes.find(r => r.id === item.routeId);
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
  }, [fleet, gameState.routes]);

  const handleConfirmOpenRoute = (strategy: TicketPriceStrategy) => {
    if (routeToPrice) {
      onOpenRoute(routeToPrice, strategy);
    }
    setRouteToPrice(null);
  };

  const tabs: { id: RouteCategory; name: string; description: string }[] = [
    { id: 'trunk', name: '간선 노선', description: '주요 허브 공항(Mega/Hub)을 연결하는 핵심 노선입니다.' },
    { id: 'feeder', name: '지선 노선', description: '허브 공항과 중형 공항(Major)을 연결하여 승객을 모으는 노선입니다.' },
    { id: 'regional', name: '지역 노선', description: '중소형 공항(Major/Regional) 간을 연결하는 단거리 노선입니다.' },
  ];
  
  const currentRoutes = routeMarket[activeTab];

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center justify-start mb-6">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-md mr-4">
            <Waypoints className="w-6 h-6 text-brand-blue-600 dark:text-brand-blue-400" />
            </div>
            <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">노선 개설</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">새로운 노선을 개설하여 운항 네트워크를 확장하세요.</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <div className="border-b border-slate-200 dark:border-slate-700">
                 <nav className="flex space-x-2 p-2" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-4 py-2 text-sm font-semibold rounded-md transition-colors
                            ${activeTab === tab.id
                                ? 'bg-brand-blue-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }
                        `}
                        >
                        {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{tabs.find(t=>t.id === activeTab)?.description}</p>
                <div className="max-h-[calc(100vh-400px)] overflow-y-auto pr-2 space-y-3">
                    {currentRoutes.length > 0 ? (
                    currentRoutes.map(route => (
                        <RouteCard 
                        key={route.id} 
                        route={route} 
                        cash={cash} 
                        onOpen={() => setRouteToPrice(route)}
                        slotUsageByAirport={slotUsageByAirport}
                        airports={airports}
                        />
                    ))
                    ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                        이 시장에 나온 노선이 없습니다.
                        <br />
                        다음 달 1일에 새로운 노선이 들어옵니다.
                    </p>
                    )}
                </div>
            </div>
        </div>
      </div>
      {routeToPrice && (
        <PriceStrategyModal
          route={routeToPrice}
          onConfirm={handleConfirmOpenRoute}
          onClose={() => setRouteToPrice(null)}
        />
      )}
    </>
  );
};

const PriceStrategyModal: React.FC<{ route: Route; onConfirm: (strategy: TicketPriceStrategy) => void; onClose: () => void; }> = ({ route, onConfirm, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">{route.origin} - {route.destination}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">노선 가격 정책을 선택하세요.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          {Object.values(TICKET_PRICE_STRATEGIES).map(strategy => (
            <div key={strategy.id} className="p-4 border border-slate-300 dark:border-slate-600 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{strategy.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{strategy.description}</p>
                  <div className="flex items-center space-x-4 text-sm mt-2">
                    <span className="flex items-center" title="가격 변동"><TrendingUp size={14} className="mr-1 text-green-500" /> {formatModifier(strategy.priceModifier.economy)}</span>
                    <span className="flex items-center" title="수요 변동"><TrendingDown size={14} className="mr-1 text-red-500" /> {formatModifier(strategy.demandModifier.economy)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onConfirm(strategy.id)}
                  className="mt-3 sm:mt-0 sm:ml-4 w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-brand-blue-600 rounded-md hover:bg-brand-blue-700 transition-colors"
                >
                  선택
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


const RouteCard: React.FC<{ 
  route: Route; 
  cash: number; 
  onOpen: (route: Route) => void;
  slotUsageByAirport: Map<string, number>;
  airports: Airport[];
}> = ({ route, cash, onOpen, slotUsageByAirport, airports }) => {
  const competitionColor = {
    Low: 'text-green-500',
    Medium: 'text-yellow-500',
    High: 'text-red-500',
  };

  const originAirport = useMemo(() => {
      const originCode = getAirportCode(route.origin);
      return originCode ? airports.find(a => a.code === originCode) : null;
  }, [route.origin, airports]);

  const destAirport = useMemo(() => {
    const destCode = getAirportCode(route.destination);
    return destCode ? airports.find(a => a.code === destCode) : null;
  }, [route.destination, airports]);

  const originSlotsUsed = originAirport ? slotUsageByAirport.get(originAirport.code) || 0 : 0;
  const destSlotsUsed = destAirport ? slotUsageByAirport.get(destAirport.code) || 0 : 0;
  
  const originRemainingSlots = originAirport ? originAirport.slots - originSlotsUsed : 0;
  const destRemainingSlots = destAirport ? destAirport.slots - destSlotsUsed : 0;

  const canOpen = cash >= route.price && originRemainingSlots > 0 && destRemainingSlots > 0;

  return (
    <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
        <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{route.origin} ↔ {route.destination}</h4>
            <div className="flex items-center space-x-3">
              <span className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                <Waypoints size={12} className="inline mr-1" />
                {formatNumber(route.distance)}km
              </span>
              <span className={`text-xs font-bold ${competitionColor[route.competition]}`}>경쟁: {route.competition}</span>
            </div>
        </div>
        
        <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs font-mono text-slate-500 dark:text-slate-400">
          <div className="flex items-center" title="출발 공항 가용 슬롯">
            <ParkingCircle size={12} className={`mr-1.5 ${originRemainingSlots > 0 ? 'text-brand-blue-500' : 'text-red-500'}`}/>
            {originAirport?.code}: <span className="font-semibold ml-1">{originRemainingSlots} / {originAirport?.slots || 0}</span>
          </div>
          <div className="flex items-center" title="목적지 공항 가용 슬롯">
            <ParkingCircle size={12} className={`mr-1.5 ${destRemainingSlots > 0 ? 'text-slate-400' : 'text-red-500'}`}/>
            {destAirport?.code}: <span className="font-semibold ml-1">{destRemainingSlots} / {destAirport?.slots || 0}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div>
                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                    <span><Star size={12} className="inline mr-1" />{route.demandClasses.first}</span>
                    <span><Briefcase size={12} className="inline mr-1" />{route.demandClasses.business}</span>
                    <span><Users size={12} className="inline mr-1" />{route.demandClasses.economy}</span>
                </div>
                <p className="text-md font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(route.price)}</p>
            </div>
            <button
                onClick={() => onOpen(route)}
                disabled={!canOpen}
                className="px-3 py-1.5 text-sm font-semibold text-white bg-brand-blue-600 rounded-md hover:bg-brand-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
                {originRemainingSlots > 0 && destRemainingSlots > 0 ? '개설' : '슬롯 부족'}
            </button>
        </div>
    </div>
  );
}

export default RouteMarketplacePage;
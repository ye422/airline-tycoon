import React, { useMemo } from 'react';
import type { GameState, SeatingConfig, Route, TicketPriceStrategy } from '../types';
import { BRAND_REPUTATIONS, AIRLINE_CONCEPTS, TICKET_PRICE_STRATEGIES, AIRCRAFT_MODELS, AIRCRAFT_CONFIGURATIONS, MAINTENANCE_LEVELS, TICKET_PRICES_PER_KM, FOREIGN_OFFICE_OPERATING_COST_MODIFIER, ON_TIME_PERFORMANCE_LEVELS, MEAL_SERVICE_LEVELS, CREW_SERVICE_LEVELS, BAGGAGE_SERVICE_LEVELS, PASSENGER_SATISFACTION_LEVELS } from '../constants';
import { Users, Briefcase, Star, Info, BarChart2 } from 'lucide-react';
import { formatCurrency, getAirportCode } from '../utils/formatters';
import { calculateFacilityEffects } from '../utils/gameCalculations';

const StatBar: React.FC<{ icon: React.ReactNode, label: string, value: number, total: number, color: string }> = ({ icon, label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center font-semibold">
          {icon}
          <span className="ml-1">{label} Class</span>
        </div>
        <span className="font-mono">{Math.round(value).toLocaleString()} / {Math.round(total).toLocaleString()}</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-1" title={`${percentage.toFixed(1)}%`}>
        <div
          className={`${color} h-2.5 rounded-full`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        ></div>
      </div>
    </div>
  );
};


interface RouteManagementPageProps {
  gameState: GameState;
  onUpdateRoutePriceStrategy: (routeId: string, strategy: TicketPriceStrategy) => void;
}

const RouteManagementPage: React.FC<RouteManagementPageProps> = ({ gameState, onUpdateRoutePriceStrategy }) => {
  const { routes, fleet, reputation, conceptTransition, date, maintenanceLevel, airlineProfile, airports, onTimePerformance, passengerSatisfaction, serviceLevels } = gameState;
  const openedRoutes = useMemo(() => routes.filter(r => r.isOpened), [routes]);

  const routeStats = useMemo(() => {
    const COMPETITION_MODIFIERS = { Low: 0.8, Medium: 0.6, High: 0.4 };

    let brandDemandModifier: { first: number; business: number; economy: number; };

    if (conceptTransition) {
      const { startDate, endDate, from, to } = conceptTransition;
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = date.getTime() - startDate.getTime();
      const progress = Math.max(0, Math.min(1, elapsed / totalDuration));

      const fromRep = BRAND_REPUTATIONS[AIRLINE_CONCEPTS[from].initialReputation];
      const toRep = BRAND_REPUTATIONS[AIRLINE_CONCEPTS[to].initialReputation];

      brandDemandModifier = {
        first: fromRep.demandModifier.first * (1 - progress) + toRep.demandModifier.first * progress,
        business: fromRep.demandModifier.business * (1 - progress) + toRep.demandModifier.business * progress,
        economy: fromRep.demandModifier.economy * (1 - progress) + toRep.demandModifier.economy * progress,
      };
    } else {
      brandDemandModifier = BRAND_REPUTATIONS[reputation].demandModifier;
    }

    const otpLevel = Object.values(ON_TIME_PERFORMANCE_LEVELS)
      .sort((a, b) => b.threshold - a.threshold)
      .find(level => onTimePerformance >= level.threshold) || ON_TIME_PERFORMANCE_LEVELS.CRITICAL;
    const otpDemandModifier = otpLevel.demandModifier;

    const satisfactionLevel = Object.values(PASSENGER_SATISFACTION_LEVELS)
      .sort((a, b) => b.threshold - a.threshold)
      .find(level => passengerSatisfaction >= level.threshold) || PASSENGER_SATISFACTION_LEVELS.CRITICAL;
    const satisfactionDemandModifier = satisfactionLevel.demandModifier;

    const mealService = MEAL_SERVICE_LEVELS[serviceLevels.meal];
    const baggageService = BAGGAGE_SERVICE_LEVELS[serviceLevels.baggage];
    const totalServiceCostPerPassenger = (mealService.costPerPassenger ?? 0) + (baggageService.costPerPassenger ?? 0);

    const crewService = CREW_SERVICE_LEVELS[serviceLevels.crew];
    const aircraftDailyStats = new Map<string, { fixedCost: number; totalTime: number }>();
    const maintenanceData = MAINTENANCE_LEVELS[maintenanceLevel];

    fleet.forEach(ac => {
      const model = AIRCRAFT_MODELS.find(m => m.id === ac.modelId);
      const config = AIRCRAFT_CONFIGURATIONS[ac.configurationId];
      if (!model || !config) return;

      let dailyFixedCost = model.operatingCost * config.operatingCostModifier + maintenanceData.costPerAircraftPerDay + (crewService.costPerAircraftPerDay ?? 0);
      if (ac.ownership === 'leased' && ac.leaseCost) {
        const isLeaseExpired = ac.leaseEndDate && date >= ac.leaseEndDate;
        if (!isLeaseExpired) {
          dailyFixedCost += ac.leaseCost / 30;
        }
      }
      const totalTime = ac.schedule.reduce((acc, item) => {
        const r = routes.find(r => r.id === item.routeId);
        return acc + (r?.turnaroundTime || 0);
      }, 0);
      aircraftDailyStats.set(ac.id, { fixedCost: dailyFixedCost, totalTime });
    });

    const dailyStats = new Map<string, { route: Route; supply: SeatingConfig; demand: SeatingConfig; passengers: SeatingConfig; cost: number; revenue: number; profit: number; profitPerSeat: number }>();

    openedRoutes.forEach(route => {
      dailyStats.set(route.id, {
        route,
        supply: { first: 0, business: 0, economy: 0 },
        demand: { first: 0, business: 0, economy: 0 },
        passengers: { first: 0, business: 0, economy: 0 },
        cost: 0,
        revenue: 0,
        profit: 0,
        profitPerSeat: 0,
      });
    });

    fleet.forEach(aircraft => {
      const isLeaseExpired = aircraft.ownership === 'leased' && aircraft.leaseEndDate && date >= aircraft.leaseEndDate;
      if (isLeaseExpired) return;

      aircraft.schedule.forEach(item => {
        const stats = dailyStats.get(item.routeId);
        const model = AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId);
        const acStats = aircraftDailyStats.get(aircraft.id);
        if (stats && model && acStats) {
          stats.supply.first += aircraft.capacity.first;
          stats.supply.business += aircraft.capacity.business;
          stats.supply.economy += aircraft.capacity.economy;

          stats.cost += model.costPerFlight;
          if (acStats.totalTime > 0) {
            const routeTime = stats.route.turnaroundTime;
            stats.cost += acStats.fixedCost * (routeTime / acStats.totalTime);
          }
        }
      });
    });

    for (const stats of dailyStats.values()) {
      const { route } = stats;
      const originCode = getAirportCode(route.origin);
      const destCode = getAirportCode(route.destination);

      // Apply facility effects
      const originEffects = calculateFacilityEffects(gameState.airportFacilities, originCode || '');
      const destEffects = calculateFacilityEffects(gameState.airportFacilities, destCode || '');

      // 1. Operating Cost Reduction
      stats.cost *= originEffects.operatingCostModifier;
      stats.cost *= destEffects.operatingCostModifier;

      if (stats.route.priceStrategy) {
        const competitionMod = COMPETITION_MODIFIERS[stats.route.competition];
        const priceStrategy = TICKET_PRICE_STRATEGIES[stats.route.priceStrategy];

        // 2. Demand Modification (e.g. Lounge)
        let routeDemandFirst = stats.route.demandClasses.first * competitionMod * brandDemandModifier.first * priceStrategy.demandModifier.first * otpDemandModifier * satisfactionDemandModifier.first;
        let routeDemandBusiness = stats.route.demandClasses.business * competitionMod * brandDemandModifier.business * priceStrategy.demandModifier.business * otpDemandModifier * satisfactionDemandModifier.business;
        let routeDemandEconomy = stats.route.demandClasses.economy * competitionMod * brandDemandModifier.economy * priceStrategy.demandModifier.economy * otpDemandModifier * satisfactionDemandModifier.economy;

        if (originEffects.demandModifier) {
          routeDemandFirst *= originEffects.demandModifier.first || 1;
          routeDemandBusiness *= originEffects.demandModifier.business || 1;
          routeDemandEconomy *= originEffects.demandModifier.economy || 1;
        }

        stats.demand.first = routeDemandFirst;
        stats.demand.business = routeDemandBusiness;
        stats.demand.economy = routeDemandEconomy;

        stats.passengers.first = Math.min(stats.supply.first, stats.demand.first);
        stats.passengers.business = Math.min(stats.supply.business, stats.demand.business);
        stats.passengers.economy = Math.min(stats.supply.economy, stats.demand.economy);

        const totalPassengersOnRoute = stats.passengers.first + stats.passengers.business + stats.passengers.economy;
        stats.cost += totalPassengersOnRoute * totalServiceCostPerPassenger;

        stats.revenue += (stats.passengers.first * TICKET_PRICES_PER_KM.first * stats.route.distance * priceStrategy.priceModifier.first) +
          (stats.passengers.business * TICKET_PRICES_PER_KM.business * stats.route.distance * priceStrategy.priceModifier.business) +
          (stats.passengers.economy * TICKET_PRICES_PER_KM.economy * stats.route.distance * priceStrategy.priceModifier.economy);

        stats.profit = stats.revenue - stats.cost;

        const totalSeats = stats.supply.first + stats.supply.business + stats.supply.economy;
        stats.profitPerSeat = totalSeats > 0 ? stats.profit / totalSeats : 0;
      }
    }

    return Array.from(dailyStats.values());

  }, [openedRoutes, fleet, reputation, conceptTransition, date, maintenanceLevel, airlineProfile, airports, onTimePerformance, routes, passengerSatisfaction, serviceLevels]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-start mb-6">
        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-md mr-4">
          <BarChart2 className="w-6 h-6 text-brand-blue-600 dark:text-brand-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">운항 노선 분석</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">개설된 노선의 실시간 성과를 분석하세요.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div className="p-4 max-h-[calc(100vh-250px)] overflow-y-auto">
          {openedRoutes.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">개설된 노선이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {routeStats.map(({ route, supply, demand, passengers, cost, revenue, profit, profitPerSeat }) => (
                <div key={route.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <h4 className="font-semibold">{route.origin} ↔ {route.destination}</h4>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">시장 점유율 (공급 / 수요)</p>
                        <div title="유효 수요는 노선의 기본 수요에 항공사 평판, 티켓 가격, 경쟁 강도, 운항 정시성이 모두 반영된 하루 동안의 최종 예상 승객 수입니다.">
                          <Info size={14} className="text-slate-400 cursor-help" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <StatBar icon={<Star size={14} className="text-yellow-500" />} label="F" value={supply.first} total={demand.first} color="bg-yellow-500" />
                        <StatBar icon={<Briefcase size={14} className="text-blue-500" />} label="B" value={supply.business} total={demand.business} color="bg-blue-500" />
                        <StatBar icon={<Users size={14} className="text-green-500" />} label="E" value={supply.economy} total={demand.economy} color="bg-green-500" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">탑승률 (탑승객 / 공급)</p>
                      <div className="space-y-2">
                        <StatBar icon={<Star size={14} className="text-yellow-500" />} label="F" value={passengers.first} total={supply.first} color="bg-yellow-500" />
                        <StatBar icon={<Briefcase size={14} className="text-blue-500" />} label="B" value={passengers.business} total={supply.business} color="bg-blue-500" />
                        <StatBar icon={<Users size={14} className="text-green-500" />} label="E" value={passengers.economy} total={supply.economy} color="bg-green-500" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                      <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">재무 성과 (일일)</h5>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">수익</span>
                        <span className="font-mono font-semibold text-green-500">{formatCurrency(revenue)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">비용</span>
                        <span className="font-mono font-semibold text-red-500">{formatCurrency(cost)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-t border-slate-200 dark:border-slate-700 mt-1 pt-1">
                        <span className="font-bold text-slate-700 dark:text-slate-200">이익</span>
                        <span className={`font-mono font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(profit)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">좌석당 이익</span>
                        <span className={`font-mono font-semibold ${profitPerSeat >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(profitPerSeat)}</span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor={`price-strategy-${route.id}`} className="block text-sm font-semibold text-slate-600 dark:text-slate-300">가격 정책</label>
                      <select
                        id={`price-strategy-${route.id}`}
                        value={route.priceStrategy}
                        onChange={(e) => onUpdateRoutePriceStrategy(route.id, e.target.value as TicketPriceStrategy)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm rounded-md"
                      >
                        {Object.values(TICKET_PRICE_STRATEGIES).map((strategy) => (
                          <option key={strategy.id} value={strategy.id}>{strategy.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteManagementPage;
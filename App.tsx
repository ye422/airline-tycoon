
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { GameState, PlayerAircraft, Route, AircraftModel, AircraftConfigurationType, SeatingConfig, BrandReputationType, AirlineConcept, ConceptTransition, TicketPriceStrategy, AirlineProfile, MaintenanceLevel, StartingCapitalLevel, View, Airport, MealServiceLevel, CrewServiceLevel, BaggageServiceLevel } from './types';
import { GameSpeed, BrandReputationType as BrandReputationEnum, AirlineConcept as AirlineConceptEnum, MaintenanceLevel as MaintenanceLevelEnum, AirportScale, MealServiceLevel as MealServiceLevelEnum, CrewServiceLevel as CrewServiceLevelEnum, BaggageServiceLevel as BaggageServiceLevelEnum, AircraftConfigurationType as AircraftConfigEnum } from './types';
import { AIRCRAFT_MODELS, AIRCRAFT_CONFIGURATIONS, BRAND_REPUTATIONS, AIRLINE_CONCEPTS, CONCEPT_CHANGE_COST, CONCEPT_TRANSITION_YEARS, TICKET_PRICE_STRATEGIES, LEASE_DEPOSIT_MONTHS, LEASE_COST_PERCENTAGE, LEASE_TERM_YEARS, LEASE_EARLY_RETURN_PENALTY_MONTHS, LEASE_BUYOUT_COST_PERCENTAGE, MAINTENANCE_LEVELS, BASE_ACCIDENT_PROBABILITY, AIRCRAFT_AGE_ACCIDENT_MODIFIER, ACCIDENT_PENALTY_COST, CRASH_REPUTATION_DURATION_YEARS, STARTING_CAPITAL_LEVELS, TICKET_PRICES_PER_KM, HUB_ESTABLISHMENT_COST, AIRCRAFT_HUB_TRANSFER_COST, FOREIGN_HUB_ESTABLISHMENT_COST, FOREIGN_OFFICE_OPERATING_COST_MODIFIER, ON_TIME_PERFORMANCE_LEVELS, OTP_BASE_SCORE, OTP_MAINTENANCE_MODIFIERS, OTP_AGE_PENALTY_PER_YEAR, OTP_AGE_MAINTENANCE_MITIGATION, OTP_FOREIGN_HUB_BONUS, OTP_FLEET_STRETCH_THRESHOLD, OTP_FLEET_STRETCH_PENALTY_PER_AIRCRAFT, MEAL_SERVICE_LEVELS, CREW_SERVICE_LEVELS, BAGGAGE_SERVICE_LEVELS, PASSENGER_SATISFACTION_LEVELS, AIRCRAFT_AGE_SATISFACTION_THRESHOLD, AIRCRAFT_AGE_SATISFACTION_PENALTY_PER_YEAR, AIRCRAFT_CONFIG_CHANGE_COST_MODIFIER, AIRCRAFT_RETROFIT_COST_MODIFIER, DEMAND_MATRIX, COMPETITION_MATRIX } from './constants';
import { AIRPORTS } from './data/airports';
import Header from './components/Header';
import GameControls from './components/GameControls';
import FleetPanel from './components/FleetPanel';
import WorldMap from './components/WorldMap';
import Notification from './components/Notification';
import SetupScreen from './components/SetupScreen';
import RouteManagementPage from './components/RouteManagementPage';
import SideNav from './components/SideNav';
import BrandPage from './components/BrandPage';
import AircraftManagementPage from './components/AircraftManagementPage';
import AirportManagementPage from './components/AirportManagementPage';
import RouteMarketplacePage from './components/RouteMarketplacePage';
import { formatCurrency, formatDate, getAirportCode } from './utils/formatters';
import { calculateDistance } from './utils/distance';
import ServiceManagementPage from './components/ServiceManagementPage';
import PhotoStudioPage from './components/PhotoStudioPage';

// Custom hook to get previous value
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const getRouteCategory = (route: Route, allAirports: Airport[]): 'trunk' | 'feeder' | 'regional' => {
  const originCode = getAirportCode(route.origin);
  const destCode = getAirportCode(route.destination);
  const originAirport = allAirports.find(a => a.code === originCode);
  const destAirport = allAirports.find(a => a.code === destCode);

  if (!originAirport || !destAirport) return 'regional'; // Default category

  const isOriginLarge = originAirport.scale === AirportScale.MEGA || originAirport.scale === AirportScale.HUB;
  const isDestLarge = destAirport.scale === AirportScale.MEGA || destAirport.scale === AirportScale.HUB;
  
  const isOriginMedium = originAirport.scale === AirportScale.MAJOR;
  const isDestMedium = destAirport.scale === AirportScale.MAJOR;

  const isOriginSmall = originAirport.scale === AirportScale.REGIONAL;
  const isDestSmall = destAirport.scale === AirportScale.REGIONAL;

  if (isOriginLarge && isDestLarge) {
    return 'trunk';
  }
  if ((isOriginLarge && isDestMedium) || (isOriginMedium && isDestLarge)) {
    return 'feeder';
  }
   if ((isOriginLarge && isDestSmall) || (isOriginSmall && isDestLarge)) {
    return 'regional';
  }
  return 'regional';
};


const generateRoutesForHub = (hubAirport: Airport, allAirports: Airport[]): Route[] => {
  return allAirports.map(destAirport => {
    if (destAirport.code === hubAirport.code) return null;

    // Incheon (ICN) and Taoyuan (TPE) do not operate domestic flights.
    if (
      (hubAirport.code === 'ICN' && destAirport.country === 'KR') ||
      (hubAirport.code === 'TPE' && destAirport.country === 'TW')
    ) {
      return null;
    }

    const newDistance = Math.round(calculateDistance(hubAirport.coordinates.lat, hubAirport.coordinates.lon, destAirport.coordinates.lat, destAirport.coordinates.lon));
    
    // Prevent generation of very short routes
    if (newDistance < 100) return null;

    const newTurnaroundTime = Math.round((newDistance / 850) * 2 * 60 + 90);
    const newPrice = Math.round(newDistance * 1_000_000 + 5_000_000_000); // Adjusted price calculation

    const isDomestic = hubAirport.country === destAirport.country;
    const originScale = hubAirport.scale;
    const destScale = destAirport.scale;

    const demandType = isDomestic ? 'DOMESTIC' : 'INTERNATIONAL';
    const demand = DEMAND_MATRIX[demandType][originScale][destScale];
    const competition = COMPETITION_MATRIX[originScale][destScale];

    return {
      id: `${hubAirport.code}-${destAirport.code}`,
      origin: hubAirport.name,
      destination: destAirport.name,
      distance: newDistance,
      turnaroundTime: newTurnaroundTime,
      price: newPrice,
      isOpened: false,
      demandClasses: demand,
      competition,
    };
  }).filter((r): r is Route => r !== null);
};

interface GameNotification {
  message: string;
  action?: () => void;
  actionLabel?: string;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('main');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(false);
  const [gameState, setGameState] = useState<GameState>(() => {
    const foundingDate = new Date(2024, 0, 1);
    
    return {
      cash: 0, // Will be set on setup
      date: foundingDate,
      fleet: [],
      routes: [],
      gameSpeed: GameSpeed.PAUSED,
      routeMarket: {
        trunk: [],
        feeder: [],
        regional: [],
      },
      reputation: BrandReputationEnum.STARTUP,
      concept: null,
      foundingDate: foundingDate,
      passengersCarried: { first: 0, business: 0, economy: 0 },
      conceptTransition: undefined,
      airlineProfile: null,
      maintenanceLevel: MaintenanceLevelEnum.STANDARD,
      crashedReputationEndDate: undefined,
      airportFacilities: {},
      airports: AIRPORTS.map(a => ({ ...a })),
      onTimePerformance: 98.0,
      passengerSatisfaction: 75.0,
      serviceLevels: {
        meal: MealServiceLevelEnum.STANDARD,
        crew: CrewServiceLevelEnum.ATTENTIVE,
        baggage: BaggageServiceLevelEnum.FREE_CHECKED_ONE,
      },
    };
  });
  const [notification, setNotification] = useState<GameNotification | null>(null);

  const showNotification = (messageOrObj: string | GameNotification) => {
    const notifObj = typeof messageOrObj === 'string' ? { message: messageOrObj } : messageOrObj;
    setNotification(notifObj);
    setTimeout(() => setNotification(null), 4000);
  };
  
  const handleGameSetup = (profile: AirlineProfile, concept: AirlineConcept, capitalLevel: StartingCapitalLevel) => {
    const initialHubCode = profile.hubs[0];
    
    const gameAirports = AIRPORTS.map(a => ({ ...a }));
    const hubAirport = gameAirports.find(a => a.code === initialHubCode);

    if (!hubAirport) {
      console.error("Invalid hub selected");
      return;
    }
    
    hubAirport.slots *= 2;

    const initialRoutes = generateRoutesForHub(hubAirport, gameAirports);
    
    // Categorize and populate initial route market
    const marketRoutes = { trunk: [] as Route[], feeder: [] as Route[], regional: [] as Route[] };
    const shuffledRoutes = [...initialRoutes].sort(() => 0.5 - Math.random());
    
    shuffledRoutes.forEach(route => {
        const category = getRouteCategory(route, gameAirports);
        if (marketRoutes[category].length < 4) {
            marketRoutes[category].push(route);
        }
    });

    const conceptData = AIRLINE_CONCEPTS[concept];
    const startingCapital = STARTING_CAPITAL_LEVELS[capitalLevel];

    setGameState(prev => ({
      ...prev,
      cash: startingCapital.amount,
      airlineProfile: profile,
      routes: initialRoutes,
      routeMarket: marketRoutes,
      concept: concept,
      reputation: conceptData.initialReputation,
      airports: gameAirports,
    }));
    showNotification(`${profile.name} (${profile.code}) 항공사 설립을 축하합니다!`);
  };

  const calculateNewReputation = useCallback((currentState: GameState): BrandReputationType => {
    const { concept, reputation, date, foundingDate, passengersCarried, conceptTransition, crashedReputationEndDate, onTimePerformance, passengerSatisfaction } = currentState;

    if (!concept || conceptTransition || crashedReputationEndDate) {
      return reputation;
    }

    const totalPassengers = passengersCarried.first + passengersCarried.business + passengersCarried.economy;
    if (totalPassengers < 50000) { // Reputation change requires significant passenger volume
      return reputation;
    }

    const yearsInService = (date.getTime() - foundingDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const premiumRatio = totalPassengers > 0 ? (passengersCarried.first + passengersCarried.business) / totalPassengers : 0;
    const businessRatio = totalPassengers > 0 ? passengersCarried.business / totalPassengers : 0;
    const economyRatio = totalPassengers > 0 ? passengersCarried.economy / totalPassengers : 0;

    // --- Devolution Checks ---
    const currentReputationData = BRAND_REPUTATIONS[reputation];
    const requiredOtp = currentReputationData.otpPenaltyThreshold || 0;
    const requiredSatisfaction = currentReputationData.satisfactionPenaltyThreshold || 0;

    switch (reputation) {
        case BrandReputationEnum.FSC_PREMIUM: {
            const requiredPremiumRatio = 0.20; // Maintenance requirement
            if (onTimePerformance < requiredOtp || premiumRatio < requiredPremiumRatio || passengerSatisfaction < requiredSatisfaction) {
                return BrandReputationEnum.FSC_NORMAL;
            }
            break;
        }
        case BrandReputationEnum.FSC_CLASSIC: {
            if (onTimePerformance < requiredOtp || passengerSatisfaction < requiredSatisfaction) {
                return BrandReputationEnum.FSC_PREMIUM;
            }
            break;
        }
        case BrandReputationEnum.LCC_GOOD: {
            const requiredBusinessRatio = 0.03; // Maintenance requirement
            if (onTimePerformance < requiredOtp || businessRatio < requiredBusinessRatio || passengerSatisfaction < requiredSatisfaction) {
                return BrandReputationEnum.LCC_STANDARD;
            }
            break;
        }
        case BrandReputationEnum.ULCC: {
            const requiredEconomyRatio = 0.95; // Maintenance requirement
            if (economyRatio < requiredEconomyRatio) {
                return BrandReputationEnum.LCC_STANDARD;
            }
            break;
        }
    }

    // --- Evolution Checks ---
    switch (reputation) {
        case BrandReputationEnum.FSC_NORMAL: {
            const evolutionData = BRAND_REPUTATIONS[BrandReputationEnum.FSC_NORMAL];
            const requiredOtp = evolutionData.requiredOtp || 101;
            const requiredSatisfaction = evolutionData.requiredSatisfaction || 101;
            const requiredPremiumRatio = 0.25;
            if (premiumRatio >= requiredPremiumRatio && onTimePerformance >= requiredOtp && passengerSatisfaction >= requiredSatisfaction) {
                return BrandReputationEnum.FSC_PREMIUM;
            }
            break;
        }
        case BrandReputationEnum.FSC_PREMIUM: {
            const requiredYears = 5;
            if (yearsInService >= requiredYears) {
                return BrandReputationEnum.FSC_CLASSIC;
            }
            break;
        }
        case BrandReputationEnum.LCC_STANDARD: {
            const evolutionData = BRAND_REPUTATIONS[BrandReputationEnum.LCC_STANDARD];
            const requiredOtp = evolutionData.requiredOtp || 101;
            const requiredSatisfaction = evolutionData.requiredSatisfaction || 101;
            const requiredBusinessRatio = 0.05;
            const requiredEconomyRatioForULCC = 0.98;

            if (economyRatio >= requiredEconomyRatioForULCC) {
                return BrandReputationEnum.ULCC;
            }
            if (businessRatio >= requiredBusinessRatio && onTimePerformance >= requiredOtp && passengerSatisfaction >= requiredSatisfaction) {
                return BrandReputationEnum.LCC_GOOD;
            }
            break;
        }
        case BrandReputationEnum.LCC_GOOD: {
            const requiredEconomyRatioForULCC = 0.98;
            if (economyRatio >= requiredEconomyRatioForULCC) {
                return BrandReputationEnum.ULCC;
            }
            break;
        }
    }

    return reputation; // No change
  }, []);

  const updateGame = useCallback(() => {
    setGameState(prev => {
      let newState = { ...prev };
      const nextDate = new Date(newState.date);
      nextDate.setDate(nextDate.getDate() + 1);
      newState.date = nextDate;

      // --- CRASHED REPUTATION RECOVERY ---
      if (newState.crashedReputationEndDate && nextDate >= newState.crashedReputationEndDate) {
          const conceptData = AIRLINE_CONCEPTS[newState.concept!];
          newState.reputation = conceptData.initialReputation;
          newState.crashedReputationEndDate = undefined;
          showNotification("치명적인 사고의 여파에서 벗어나, 항공사 평판이 정상으로 회복되기 시작합니다.");
      }

      // --- ACCIDENT CHECK ---
      let accidentOccurred = false;
      const maintenanceData = MAINTENANCE_LEVELS[newState.maintenanceLevel];
      let fleetAfterAccidents = [...newState.fleet];

      if (newState.reputation !== BrandReputationEnum.CRASHED) { // No accidents during recovery
        for (const aircraft of newState.fleet) {
            if (aircraft.schedule.length === 0) continue;

            const ageInYears = (nextDate.getTime() - aircraft.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
            const accidentProbability = (BASE_ACCIDENT_PROBABILITY + ageInYears * AIRCRAFT_AGE_ACCIDENT_MODIFIER) * maintenanceData.accidentModifier;
            
            if (Math.random() < accidentProbability) {
                showNotification(`[비상] ${aircraft.nickname} (${AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId)?.name}) 항공기가 치명적인 사고에 휘말렸습니다!`);
                
                fleetAfterAccidents = fleetAfterAccidents.filter(ac => ac.id !== aircraft.id);
                newState.cash -= ACCIDENT_PENALTY_COST;
                newState.reputation = BrandReputationEnum.CRASHED;

                const crashRecoveryDate = new Date(nextDate);
                crashRecoveryDate.setFullYear(crashRecoveryDate.getFullYear() + CRASH_REPUTATION_DURATION_YEARS);
                newState.crashedReputationEndDate = crashRecoveryDate;

                accidentOccurred = true;
                break; // Only one accident per day
            }
        }
      }
      newState.fleet = fleetAfterAccidents;
      if(accidentOccurred) return newState;


      // --- LEASE & CONCEPT TRANSITION CHECKS ---
      let fleetAfterLeaseCheck: PlayerAircraft[] = [];
      let leaseExpiredNotificationNeeded = false;
      newState.fleet.forEach(ac => {
        if (ac.ownership === 'leased' && ac.leaseEndDate && nextDate >= ac.leaseEndDate && (ac.schedule.length > 0)) {
           fleetAfterLeaseCheck.push({ ...ac, schedule: [] }); // Ground the aircraft
           leaseExpiredNotificationNeeded = true;
        } else {
           fleetAfterLeaseCheck.push(ac);
        }
      });
      if(leaseExpiredNotificationNeeded) showNotification(`일부 항공기의 리스 계약이 만료되었습니다. 보유 항공기 패널에서 조치를 취해주세요.`);
      newState.fleet = fleetAfterLeaseCheck;

      if (newState.conceptTransition && nextDate >= newState.conceptTransition.endDate) {
          const newConcept = newState.conceptTransition.to;
          showNotification(`'${AIRLINE_CONCEPTS[newConcept].name}' 컨셉으로의 전환이 완료되었습니다.`);
          newState.concept = newConcept;
          newState.reputation = AIRLINE_CONCEPTS[newConcept].initialReputation;
          newState.conceptTransition = undefined;
      }

      // --- ON-TIME PERFORMANCE CALCULATION ---
      let otpScore = OTP_BASE_SCORE;
      otpScore += OTP_MAINTENANCE_MODIFIERS[newState.maintenanceLevel];

      const totalAgeInYears = newState.fleet.reduce((sum, ac) => {
          const age = (nextDate.getTime() - ac.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          return sum + age;
      }, 0);
      const avgAge = newState.fleet.length > 0 ? totalAgeInYears / newState.fleet.length : 0;
      const agePenalty = avgAge * OTP_AGE_PENALTY_PER_YEAR;
      const mitigatedAgePenalty = agePenalty * (1 - OTP_AGE_MAINTENANCE_MITIGATION[newState.maintenanceLevel]);
      otpScore -= mitigatedAgePenalty;
      
      if (newState.airlineProfile) {
          const foreignHubs = newState.airlineProfile.hubs.filter(h => {
              const airport = newState.airports.find(a => a.code === h);
              return airport && airport.country !== newState.airlineProfile!.country;
          }).length;
          otpScore += foreignHubs * OTP_FOREIGN_HUB_BONUS;
      }

      const overworkedAircraftCount = newState.fleet.filter(
        ac => ac.schedule.length > OTP_FLEET_STRETCH_THRESHOLD
      ).length;
      otpScore -= overworkedAircraftCount * OTP_FLEET_STRETCH_PENALTY_PER_AIRCRAFT;

      newState.onTimePerformance = Math.max(0, Math.min(100, otpScore));
      
      // --- PASSENGER SATISFACTION CALCULATION ---
      let satisfactionScore = 50; // Base score
      satisfactionScore += MEAL_SERVICE_LEVELS[newState.serviceLevels.meal].satisfactionPoints;
      satisfactionScore += CREW_SERVICE_LEVELS[newState.serviceLevels.crew].satisfactionPoints;
      satisfactionScore += BAGGAGE_SERVICE_LEVELS[newState.serviceLevels.baggage].satisfactionPoints;

      // Age penalty
      if (avgAge > AIRCRAFT_AGE_SATISFACTION_THRESHOLD) {
          satisfactionScore -= (avgAge - AIRCRAFT_AGE_SATISFACTION_THRESHOLD) * AIRCRAFT_AGE_SATISFACTION_PENALTY_PER_YEAR;
      }

      // Config satisfaction modifier
      const totalConfigSatisfaction = newState.fleet.reduce((sum, ac) => {
        const config = AIRCRAFT_CONFIGURATIONS[ac.configurationId];
        return sum + (config.satisfactionModifier || 0);
      }, 0);
      const avgConfigSatisfaction = newState.fleet.length > 0 ? totalConfigSatisfaction / newState.fleet.length : 0;
      satisfactionScore += avgConfigSatisfaction;

      newState.passengerSatisfaction = Math.max(0, Math.min(100, satisfactionScore));
      
      
      // --- INCOME & EXPENSES CALCULATION ---
      let dailyIncome = 0;
      let dailyExpenses = 0;
      
      // Service level costs
      const mealService = MEAL_SERVICE_LEVELS[newState.serviceLevels.meal];
      const baggageService = BAGGAGE_SERVICE_LEVELS[newState.serviceLevels.baggage];
      
      const totalServiceCostPerPassenger = (mealService.costPerPassenger ?? 0) + (baggageService.costPerPassenger ?? 0);
      
      const COMPETITION_MODIFIERS = { Low: 0.8, Medium: 0.6, High: 0.4 };
      
      let brandDemandModifier: { first: number; business: number; economy: number; };

      if (newState.conceptTransition) {
          const { startDate, endDate, from, to } = newState.conceptTransition;
          const totalDuration = endDate.getTime() - startDate.getTime();
          const elapsed = nextDate.getTime() - startDate.getTime();
          const progress = Math.max(0, Math.min(1, elapsed / totalDuration));

          const fromRep = BRAND_REPUTATIONS[AIRLINE_CONCEPTS[from].initialReputation];
          const toRep = BRAND_REPUTATIONS[AIRLINE_CONCEPTS[to].initialReputation];
          
          brandDemandModifier = {
              first: fromRep.demandModifier.first * (1 - progress) + toRep.demandModifier.first * progress,
              business: fromRep.demandModifier.business * (1 - progress) + toRep.demandModifier.business * progress,
              economy: fromRep.demandModifier.economy * (1 - progress) + toRep.demandModifier.economy * progress,
          };
      } else {
          brandDemandModifier = BRAND_REPUTATIONS[newState.reputation].demandModifier;
      }
      
      const otpLevel = Object.values(ON_TIME_PERFORMANCE_LEVELS)
        .sort((a, b) => b.threshold - a.threshold)
        .find(level => newState.onTimePerformance >= level.threshold) || ON_TIME_PERFORMANCE_LEVELS.CRITICAL;
      const otpDemandModifier = otpLevel.demandModifier;

      const satisfactionLevel = Object.values(PASSENGER_SATISFACTION_LEVELS)
        .sort((a, b) => b.threshold - a.threshold)
        .find(level => newState.passengerSatisfaction >= level.threshold) || PASSENGER_SATISFACTION_LEVELS.CRITICAL;
      const satisfactionDemandModifier = satisfactionLevel.demandModifier;


      // --- Daily Demand Pool Calculation ---
      const openedRoutes = newState.routes.filter(r => r.isOpened);
      const dailyRouteStats = new Map<string, { supply: SeatingConfig, demand: SeatingConfig, cost: number }>();

      // 1. Initialize stats for all opened routes
      openedRoutes.forEach(route => {
        dailyRouteStats.set(route.id, {
          supply: { first: 0, business: 0, economy: 0 },
          demand: { first: 0, business: 0, economy: 0 },
          cost: 0,
        });
      });

      // 2. Calculate total daily seat supply and initial costs for each route
      const crewService = CREW_SERVICE_LEVELS[newState.serviceLevels.crew];
      const aircraftDailyFixedCost = new Map<string, number>();
      newState.fleet.forEach(ac => {
        const model = AIRCRAFT_MODELS.find(m => m.id === ac.modelId);
        const config = AIRCRAFT_CONFIGURATIONS[ac.configurationId];
        if (!model || !config) return;
        let dailyFixedCost = model.operatingCost * config.operatingCostModifier + maintenanceData.costPerAircraftPerDay + (crewService.costPerAircraftPerDay ?? 0);
        if (ac.ownership === 'leased' && ac.leaseCost) {
            const isLeaseExpired = ac.leaseEndDate && nextDate >= ac.leaseEndDate;
            if (!isLeaseExpired) dailyFixedCost += ac.leaseCost / 30;
        }
        aircraftDailyFixedCost.set(ac.id, dailyFixedCost);
      });
      
      newState.fleet.forEach(aircraft => {
        const isLeaseExpired = aircraft.ownership === 'leased' && aircraft.leaseEndDate && nextDate >= aircraft.leaseEndDate;
        if (isLeaseExpired || aircraft.schedule.length === 0) return;
        
        const model = AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId)!;
        const totalTime = aircraft.schedule.reduce((acc, item) => acc + (openedRoutes.find(r => r.id === item.routeId)?.turnaroundTime || 0), 0);
        const fixedCost = aircraftDailyFixedCost.get(aircraft.id) || 0;

        aircraft.schedule.forEach(item => {
          const stats = dailyRouteStats.get(item.routeId);
          const route = openedRoutes.find(r => r.id === item.routeId);
          if (stats && route) {
            stats.supply.first += aircraft.capacity.first;
            stats.supply.business += aircraft.capacity.business;
            stats.supply.economy += aircraft.capacity.economy;

            stats.cost += model.costPerFlight; // Variable cost
            if (totalTime > 0) { // Prorated fixed cost
                stats.cost += fixedCost * (route.turnaroundTime / totalTime);
            }
          }
        });
      });

      // 3. Calculate demand, actual passengers, and income for each route
      let dailyPassengers = { first: 0, business: 0, economy: 0 };
      
      for (const [routeId, stats] of dailyRouteStats.entries()) {
        const route = openedRoutes.find(r => r.id === routeId)!;

        // Apply foreign office cost reduction
        if (newState.airlineProfile) {
          const originCode = getAirportCode(route.origin);
          const destCode = getAirportCode(route.destination);
          const originAirport = newState.airports.find(a => a.code === originCode);
          const destAirport = newState.airports.find(a => a.code === destCode);

          if (originAirport && destAirport) {
              const isOriginForeignOffice = originCode && originAirport.country !== newState.airlineProfile.country && newState.airlineProfile.hubs.includes(originCode);
              const isDestForeignOffice = destCode && destAirport.country !== newState.airlineProfile.country && newState.airlineProfile.hubs.includes(destCode);
              if (isOriginForeignOffice || isDestForeignOffice) {
                  stats.cost *= FOREIGN_OFFICE_OPERATING_COST_MODIFIER;
              }
          }
        }
        dailyExpenses += stats.cost;

        if (route.priceStrategy) {
          const competitionMod = COMPETITION_MODIFIERS[route.competition];
          const priceStrategy = TICKET_PRICE_STRATEGIES[route.priceStrategy];

          stats.demand.first = route.demandClasses.first * competitionMod * brandDemandModifier.first * priceStrategy.demandModifier.first * otpDemandModifier * satisfactionDemandModifier.first;
          stats.demand.business = route.demandClasses.business * competitionMod * brandDemandModifier.business * priceStrategy.demandModifier.business * otpDemandModifier * satisfactionDemandModifier.business;
          stats.demand.economy = route.demandClasses.economy * competitionMod * brandDemandModifier.economy * priceStrategy.demandModifier.economy * otpDemandModifier * satisfactionDemandModifier.economy;

          const passengers = {
            first: Math.min(stats.supply.first, stats.demand.first),
            business: Math.min(stats.supply.business, stats.demand.business),
            economy: Math.min(stats.supply.economy, stats.demand.economy),
          };
          
          const totalPassengersOnRoute = passengers.first + passengers.business + passengers.economy;
          dailyExpenses += totalPassengersOnRoute * totalServiceCostPerPassenger;

          dailyPassengers.first += passengers.first;
          dailyPassengers.business += passengers.business;
          dailyPassengers.economy += passengers.economy;

          dailyIncome += (passengers.first * TICKET_PRICES_PER_KM.first * route.distance * priceStrategy.priceModifier.first) +
                         (passengers.business * TICKET_PRICES_PER_KM.business * route.distance * priceStrategy.priceModifier.business) +
                         (passengers.economy * TICKET_PRICES_PER_KM.economy * route.distance * priceStrategy.priceModifier.economy);
        }
      }
      
      newState.cash += dailyIncome - dailyExpenses;

      if (nextDate.getDate() === 1) {
        const unopened = newState.routes.filter(r => !r.isOpened);
        const shuffled = unopened.sort(() => 0.5 - Math.random());
        
        const newMarket = { trunk: [] as Route[], feeder: [] as Route[], regional: [] as Route[] };
        const categories: ('trunk' | 'feeder' | 'regional')[] = ['trunk', 'feeder', 'regional'];
        
        const routesByCategory = {
          trunk: shuffled.filter(r => getRouteCategory(r, newState.airports) === 'trunk'),
          feeder: shuffled.filter(r => getRouteCategory(r, newState.airports) === 'feeder'),
          regional: shuffled.filter(r => getRouteCategory(r, newState.airports) === 'regional'),
        };

        categories.forEach(category => {
          newMarket[category] = routesByCategory[category].slice(0, 4);
        });

        newState.routeMarket = newMarket;
      }
      
      newState.passengersCarried = {
        first: newState.passengersCarried.first + Math.floor(dailyPassengers.first),
        business: newState.passengersCarried.business + Math.floor(dailyPassengers.business),
        economy: newState.passengersCarried.economy + Math.floor(dailyPassengers.economy),
      };

      if (!newState.conceptTransition && !newState.crashedReputationEndDate) {
          newState.reputation = calculateNewReputation(newState);
      }

      return newState;
    });
  }, [calculateNewReputation]);

  const previousReputation = usePrevious(gameState.reputation);
  useEffect(() => {
    if (previousReputation && gameState.reputation !== previousReputation && 
        gameState.reputation !== BrandReputationEnum.STARTUP && 
        gameState.reputation !== BrandReputationEnum.TRANSITIONING) {
       showNotification(`브랜드 평판이 '${BRAND_REPUTATIONS[gameState.reputation].name}'(으)로 변경되었습니다!`);
    }
  }, [gameState.reputation, previousReputation]);

  useEffect(() => {
    if (gameState.gameSpeed === GameSpeed.PAUSED) {
      return;
    }
    const interval = 1000 / gameState.gameSpeed;
    const timer = setInterval(updateGame, interval);
    return () => clearInterval(timer);
  }, [gameState.gameSpeed, updateGame]);


  const handlePurchaseAircraft = (modelId: string, configId: AircraftConfigurationType, nickname: string, base: string) => {
    const model = AIRCRAFT_MODELS.find(m => m.id === modelId);
    const config = AIRCRAFT_CONFIGURATIONS[configId];
    if (!model || !config) return;

    const finalPrice = model.price * config.costModifier;

    if (gameState.cash >= finalPrice) {
      const purchaseDateForAge = new Date(gameState.date);
      if (model.initialAgeOnPurchase) {
          purchaseDateForAge.setFullYear(purchaseDateForAge.getFullYear() - model.initialAgeOnPurchase);
      }

      const newAircraft: PlayerAircraft = {
        id: `ac-${Date.now()}`,
        nickname,
        modelId: model.id,
        purchaseDate: purchaseDateForAge,
        configurationId: configId,
        capacity: config.seating(model.capacity),
        schedule: [],
        ownership: 'owned',
        base,
      };

      setGameState(prev => ({
        ...prev,
        cash: prev.cash - finalPrice,
        fleet: [ ...prev.fleet, newAircraft ]
      }));
      showNotification({
        message: `${nickname} (${model.name}) 항공기를 구매했습니다! 클릭하여 노선을 배치하세요.`,
        action: () => setCurrentView('main'),
        actionLabel: '배치하러 가기'
      });
    } else {
      showNotification('자금이 부족합니다.');
    }
  };
  
  const handleLeaseAircraft = (modelId: string, configId: AircraftConfigurationType, nickname: string, base: string) => {
    const model = AIRCRAFT_MODELS.find(m => m.id === modelId);
    const config = AIRCRAFT_CONFIGURATIONS[configId];
    if (!model || !config) return;

    const monthlyLeaseCost = (model.price * config.costModifier) * LEASE_COST_PERCENTAGE;
    const deposit = monthlyLeaseCost * LEASE_DEPOSIT_MONTHS;

    if (gameState.cash >= deposit) {
      const leaseEndDate = new Date(gameState.date);
      leaseEndDate.setFullYear(leaseEndDate.getFullYear() + LEASE_TERM_YEARS);
      
      const leaseStartDate = new Date(gameState.date);
      const leaseYear = leaseStartDate.getFullYear();
      const maxPossibleAge = leaseYear - model.unlockYear;
      const leaseAge = Math.max(1, Math.min(10, maxPossibleAge));

      const purchaseDateForAge = new Date(leaseStartDate);
      purchaseDateForAge.setFullYear(purchaseDateForAge.getFullYear() - leaseAge);

      const newAircraft: PlayerAircraft = {
        id: `ac-${Date.now()}`,
        nickname,
        modelId: model.id,
        purchaseDate: purchaseDateForAge,
        configurationId: configId,
        capacity: config.seating(model.capacity),
        schedule: [],
        ownership: 'leased',
        leaseCost: monthlyLeaseCost,
        leaseEndDate: leaseEndDate,
        base,
      };

      setGameState(prev => ({
        ...prev,
        cash: prev.cash - deposit,
        fleet: [ ...prev.fleet, newAircraft ]
      }));
      showNotification({
        message: `${nickname} (${model.name}) 항공기를 리스했습니다! 클릭하여 노선을 배치하세요.`,
        action: () => setCurrentView('main'),
        actionLabel: '배치하러 가기'
      });
    } else {
      showNotification('보증금이 부족합니다.');
    }
  };
  
  const handleOpenRoute = (route: Route, priceStrategy: TicketPriceStrategy) => {
    if (gameState.cash >= route.price) {
      setGameState(prev => {
        const newMarket = { ...prev.routeMarket };
        newMarket.trunk = newMarket.trunk.filter(r => r.id !== route.id);
        newMarket.feeder = newMarket.feeder.filter(r => r.id !== route.id);
        newMarket.regional = newMarket.regional.filter(r => r.id !== route.id);
        
        return {
          ...prev,
          cash: prev.cash - route.price,
          routes: prev.routes.map(r => r.id === route.id ? { ...r, isOpened: true, priceStrategy } : r),
          routeMarket: newMarket,
        }
      });
      showNotification(`${route.origin} - ${route.destination} 노선을 ${formatCurrency(route.price)}에 개설했습니다!`);
    } else {
      showNotification('자금이 부족합니다.');
    }
  };

  const handleUpdateSchedule = (aircraftId: string, newScheduleRouteIds: string[]) => {
    const newSchedule = newScheduleRouteIds.map(routeId => ({
        routeId,
        flightNumber: Math.floor(100 + Math.random() * 9900)
    }));

    setGameState(prev => ({
      ...prev,
      fleet: prev.fleet.map(ac => 
        ac.id === aircraftId ? { ...ac, schedule: newSchedule } : ac
      )
    }));
    const aircraft = gameState.fleet.find(a => a.id === aircraftId);
    if(aircraft) {
      showNotification(`${aircraft.nickname} 항공기의 스케줄이 업데이트되었습니다.`);
    }
  };
  
  const handleReturnLease = (aircraftId: string) => {
    const aircraft = gameState.fleet.find(ac => ac.id === aircraftId);
    if (!aircraft || aircraft.ownership !== 'leased' || !aircraft.leaseCost) return;
    
    const isEarly = aircraft.leaseEndDate && gameState.date < aircraft.leaseEndDate;
    const penalty = isEarly ? aircraft.leaseCost * LEASE_EARLY_RETURN_PENALTY_MONTHS : 0;
    
    if (gameState.cash < penalty) {
      showNotification(`조기 반납 위약금이 부족합니다. (${formatCurrency(penalty)})`);
      return;
    }

    setGameState(prev => ({
      ...prev,
      cash: prev.cash - penalty,
      fleet: prev.fleet.filter(ac => ac.id !== aircraftId),
    }));
    
    if (isEarly) {
      showNotification(`${aircraft.nickname} 항공기를 조기 반납했습니다. (위약금: ${formatCurrency(penalty)})`);
    } else {
      showNotification(`${aircraft.nickname} 항공기를 반납했습니다.`);
    }
  };

  const handleExtendLease = (aircraftId: string) => {
      const aircraft = gameState.fleet.find(ac => ac.id === aircraftId);
      if (!aircraft) return;

      const newLeaseEndDate = new Date(aircraft.leaseEndDate!);
      newLeaseEndDate.setFullYear(newLeaseEndDate.getFullYear() + LEASE_TERM_YEARS);

      setGameState(prev => ({
        ...prev,
        fleet: prev.fleet.map(ac => 
            ac.id === aircraftId 
                ? { ...ac, leaseEndDate: newLeaseEndDate, schedule: [] } // Reset schedule on extension
                : ac
        )
      }));
      showNotification(`${aircraft.nickname} 항공기 리스 계약을 ${LEASE_TERM_YEARS}년 연장했습니다.`);
  };

  const handleBuyoutAircraft = (aircraftId: string) => {
      const aircraft = gameState.fleet.find(ac => ac.id === aircraftId);
      const model = aircraft ? AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId) : null;
      if (!aircraft || !model) return;

      const buyoutCost = model.price * LEASE_BUYOUT_COST_PERCENTAGE;
      if (gameState.cash < buyoutCost) {
        showNotification(`항공기 구매(바이아웃) 자금이 부족합니다. (${formatCurrency(buyoutCost)})`);
        return;
      }

      setGameState(prev => ({
          ...prev,
          cash: prev.cash - buyoutCost,
          fleet: prev.fleet.map(ac => {
              if (ac.id === aircraftId) {
                  const { leaseCost, leaseEndDate, ...ownedAircraft } = ac;
                  return { ...ownedAircraft, ownership: 'owned', schedule: [] };
              }
              return ac;
          })
      }));
      showNotification(`${aircraft.nickname} 항공기를 ${formatCurrency(buyoutCost)}에 구매했습니다.`);
  };

  const handleSellAircraft = (aircraftId: string) => {
    const aircraft = gameState.fleet.find(ac => ac.id === aircraftId);
    const model = aircraft ? AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId) : null;
    const config = aircraft ? AIRCRAFT_CONFIGURATIONS[aircraft.configurationId] : null;

    if (!aircraft || aircraft.ownership !== 'owned' || !model || !config) {
      showNotification('매각할 수 없는 항공기입니다.');
      return;
    }

    const originalPrice = model.price * config.costModifier;
    const ageInYears = (gameState.date.getTime() - aircraft.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const MAX_DEPRECIATION_YEARS = 25;
    const RESIDUAL_VALUE_PERCENTAGE = 0.1; // Sells for 10% of value at 25 years or older
    const depreciationFactor = Math.min(ageInYears, MAX_DEPRECIATION_YEARS) / MAX_DEPRECIATION_YEARS;
    const salePrice = originalPrice * (1 - (1 - RESIDUAL_VALUE_PERCENTAGE) * depreciationFactor);

    setGameState(prev => ({
      ...prev,
      cash: prev.cash + salePrice,
      fleet: prev.fleet.filter(ac => ac.id !== aircraftId),
    }));

    showNotification(`${aircraft.nickname} 항공기를 ${formatCurrency(salePrice)}에 매각했습니다.`);
  };


  const handleConceptChange = (concept: AirlineConcept) => {
    const conceptData = AIRLINE_CONCEPTS[concept];
    if (!conceptData) return;

    if (gameState.conceptTransition) {
        showNotification("이미 브랜드 전환이 진행 중입니다.");
        return;
    }
    if (gameState.cash < CONCEPT_CHANGE_COST) {
        showNotification(`컨셉 변경 비용이 부족합니다. (${formatCurrency(CONCEPT_CHANGE_COST)})`);
        return;
    }

    const transitionStartDate = new Date(gameState.date);
    const transitionEndDate = new Date(transitionStartDate);
    transitionEndDate.setFullYear(transitionEndDate.getFullYear() + CONCEPT_TRANSITION_YEARS);

    const newTransition: ConceptTransition = {
        startDate: transitionStartDate,
        endDate: transitionEndDate,
        from: gameState.concept!,
        to: concept,
    };

    setGameState(prev => ({
        ...prev,
        cash: prev.cash - CONCEPT_CHANGE_COST,
        conceptTransition: newTransition,
        reputation: BrandReputationEnum.TRANSITIONING,
    }));
    showNotification(`'${conceptData.name}'(으)로 컨셉 변경을 시작합니다. ${CONCEPT_TRANSITION_YEARS}년의 전환 기간이 소요됩니다.`);
  };

  const handleMaintenanceLevelChange = (level: MaintenanceLevel) => {
    setGameState(prev => ({...prev, maintenanceLevel: level}));
    showNotification(`정비 수준이 '${MAINTENANCE_LEVELS[level].name}'(으)로 변경되었습니다.`);
  };
  
  const handleUpdateRoutePriceStrategy = (routeId: string, strategy: TicketPriceStrategy) => {
    setGameState(prev => ({
      ...prev,
      routes: prev.routes.map(r => 
        r.id === routeId ? { ...r, priceStrategy: strategy } : r
      )
    }));
    const route = gameState.routes.find(r => r.id === routeId);
    const strategyInfo = TICKET_PRICE_STRATEGIES[strategy];
    if (route && strategyInfo) {
      showNotification(`'${route.destination}' 노선의 가격 정책이 '${strategyInfo.name}'(으)로 변경되었습니다.`);
    }
  };

  const handleEstablishHub = (airportCode: string) => {
    setGameState(prev => {
      const airport = prev.airports.find(a => a.code === airportCode);
      if (!airport || !prev.airlineProfile) return prev;

      if (prev.airlineProfile.hubs.includes(airportCode)) {
        showNotification("이미 허브로 운영 중인 공항입니다.");
        return prev;
      }
      
      const isForeign = airport.country !== prev.airlineProfile.country;
      const cost = isForeign 
        ? FOREIGN_HUB_ESTABLISHMENT_COST[airport.scale] 
        : HUB_ESTABLISHMENT_COST[airport.scale];

      if (prev.cash < cost) {
        showNotification(`거점 설립 비용이 부족합니다. (${formatCurrency(cost)})`);
        return prev;
      }
      
      const updatedProfile = {
        ...prev.airlineProfile,
        hubs: [...prev.airlineProfile.hubs, airportCode]
      };

      if (isForeign) {
        showNotification(`${airport.name}에 해외 사무소를 개설했습니다! 해당 공항 노선의 운영비가 절감됩니다.`);
        return {
          ...prev,
          cash: prev.cash - cost,
          airlineProfile: updatedProfile,
        };
      } else {
        const newHubRoutes = generateRoutesForHub(airport, prev.airports);
        showNotification(`${airport.name}에 새로운 거점 공항을 설립했습니다!`);
        return {
          ...prev,
          cash: prev.cash - cost,
          airlineProfile: updatedProfile,
          routes: [...prev.routes, ...newHubRoutes],
        };
      }
    });
  };

  const handleTransferAircraftHub = (aircraftId: string, newHub: string) => {
    const aircraft = gameState.fleet.find(ac => ac.id === aircraftId);
    if (!aircraft) {
      showNotification("항공기를 찾을 수 없습니다.");
      return;
    }
    if (aircraft.schedule.length > 0) {
      showNotification("스케줄이 배정된 항공기는 이전할 수 없습니다.");
      return;
    }
    if (gameState.cash < AIRCRAFT_HUB_TRANSFER_COST) {
      showNotification(`기지 이전 비용이 부족합니다. (${formatCurrency(AIRCRAFT_HUB_TRANSFER_COST)})`);
      return;
    }
    if (aircraft.base === newHub) {
      showNotification("이미 해당 허브에 배정된 항공기입니다.");
      return;
    }

    setGameState(prev => ({
      ...prev,
      cash: prev.cash - AIRCRAFT_HUB_TRANSFER_COST,
      fleet: prev.fleet.map(ac => 
        ac.id === aircraftId ? { ...ac, base: newHub } : ac
      )
    }));

    showNotification(`${aircraft.nickname} 항공기를 ${newHub} 허브로 이전했습니다. (비용: ${formatCurrency(AIRCRAFT_HUB_TRANSFER_COST)})`);
  };
  
  const handleServiceLevelChange = (
    category: 'meal' | 'crew' | 'baggage',
    level: MealServiceLevel | CrewServiceLevel | BaggageServiceLevel
  ) => {
    setGameState(prev => ({
      ...prev,
      serviceLevels: {
        ...prev.serviceLevels,
        [category]: level,
      },
    }));
    
    let categoryName = '';
    let levelName = '';
    if (category === 'meal') {
      categoryName = '기내식';
      levelName = MEAL_SERVICE_LEVELS[level as MealServiceLevel].name;
    } else if (category === 'crew') {
      categoryName = '객실 승무원';
      levelName = CREW_SERVICE_LEVELS[level as CrewServiceLevel].name;
    } else {
      categoryName = '수하물';
      levelName = BAGGAGE_SERVICE_LEVELS[level as BaggageServiceLevel].name;
    }
    showNotification(`${categoryName} 서비스 수준이 '${levelName}'(으)로 변경되었습니다.`);
  };

  const handleAircraftConfigChange = (aircraftId: string, newConfigId: AircraftConfigurationType) => {
    const aircraft = gameState.fleet.find(ac => ac.id === aircraftId);
    const model = aircraft ? AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId) : null;
    if (!aircraft || !model) return;

    const cost = model.price * AIRCRAFT_CONFIG_CHANGE_COST_MODIFIER;
    if (gameState.cash < cost) {
      showNotification(`객실 구성 변경 비용이 부족합니다. (${formatCurrency(cost)})`);
      return;
    }

    setGameState(prev => ({
      ...prev,
      cash: prev.cash - cost,
      fleet: prev.fleet.map(ac => {
        if (ac.id === aircraftId) {
          const newConfig = AIRCRAFT_CONFIGURATIONS[newConfigId];
          return {
            ...ac,
            configurationId: newConfigId,
            capacity: newConfig.seating(model.capacity),
            schedule: [], // Ground the aircraft
          };
        }
        return ac;
      }),
    }));
    showNotification(`${aircraft.nickname} 항공기의 객실 구성을 변경했습니다. (비용: ${formatCurrency(cost)})`);
  };

  const handleAircraftRetrofit = (aircraftId: string) => {
    const aircraft = gameState.fleet.find(ac => ac.id === aircraftId);
    const model = aircraft ? AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId) : null;
    if (!aircraft || !model) return;

    const cost = model.price * AIRCRAFT_RETROFIT_COST_MODIFIER;
    if (gameState.cash < cost) {
      showNotification(`성능 개선 비용이 부족합니다. (${formatCurrency(cost)})`);
      return;
    }

    setGameState(prev => ({
      ...prev,
      cash: prev.cash - cost,
      fleet: prev.fleet.map(ac => 
        ac.id === aircraftId ? { ...ac, purchaseDate: new Date(prev.date), schedule: [] } : ac
      ),
    }));
    showNotification(`${aircraft.nickname} 항공기 성능 개선을 완료했습니다. (비용: ${formatCurrency(cost)})`);
  };


  const openedRoutes = useMemo(() => gameState.routes.filter(r => r.isOpened), [gameState.routes]);
  const currentReputationDetails = useMemo(() => BRAND_REPUTATIONS[gameState.reputation], [gameState.reputation]);

  if (!gameState.airlineProfile) {
    return <SetupScreen onSetupComplete={handleGameSetup} />;
  }
  
  const renderCurrentView = () => {
    switch(currentView) {
      case 'routeManagement':
        return <RouteManagementPage 
                  gameState={gameState} 
                  onUpdateRoutePriceStrategy={handleUpdateRoutePriceStrategy}
                />;
      case 'routeMarketplace':
        return <RouteMarketplacePage
                  gameState={gameState}
                  onOpenRoute={handleOpenRoute}
                />;
      case 'brand':
        return <BrandPage
                  gameState={gameState}
                  onConceptChange={handleConceptChange}
                />;
      case 'aircraftManagement':
        return <AircraftManagementPage
                  gameState={gameState}
                  onPurchaseAircraft={handlePurchaseAircraft}
                  onLeaseAircraft={handleLeaseAircraft}
                  onLevelChange={handleMaintenanceLevelChange}
                  onSellAircraft={handleSellAircraft}
                  onReturnLease={handleReturnLease}
                  onExtendLease={handleExtendLease}
                  onBuyoutAircraft={handleBuyoutAircraft}
                  onTransferAircraftHub={handleTransferAircraftHub}
                  onAircraftConfigChange={handleAircraftConfigChange}
                  onAircraftRetrofit={handleAircraftRetrofit}
                />;
      case 'airportManagement':
        return <AirportManagementPage 
                  gameState={gameState} 
                  onEstablishHub={handleEstablishHub}
                />;
      case 'serviceManagement':
        return <ServiceManagementPage 
                  gameState={gameState} 
                  onServiceLevelChange={handleServiceLevelChange} 
               />;
      case 'photoStudio':
        return <PhotoStudioPage gameState={gameState} />;
      case 'main':
      default:
        return (
          <div className="grid grid-cols-1 gap-6 mt-6">
            <div className="space-y-6">
              <WorldMap
                hubs={gameState.airlineProfile.hubs}
                routes={gameState.routes}
                fleet={gameState.fleet}
                airlineCode={gameState.airlineProfile.code}
                airports={gameState.airports}
              />
              <FleetPanel
                fleet={gameState.fleet}
                routes={openedRoutes}
                currentDate={gameState.date}
                airlineCode={gameState.airlineProfile.code}
                onUpdateSchedule={handleUpdateSchedule}
                airports={gameState.airports}
                hubs={gameState.airlineProfile.hubs}
              />
            </div>
          </div>
        );
    }
  }

  return (
    <div className="text-slate-800 dark:text-slate-200 font-sans">
      <div className="flex h-screen bg-slate-100 dark:bg-slate-900">
         <SideNav 
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          isCollapsed={isSideNavCollapsed}
          onToggleCollapse={() => setIsSideNavCollapsed(prev => !prev)}
        />
        <div className="flex-1 flex flex-col overflow-y-auto">
          <Header 
            cash={gameState.cash}
            date={gameState.date}
            fleetSize={gameState.fleet.length}
            routeCount={openedRoutes.length}
            reputationName={currentReputationDetails.name}
            airlineName={gameState.airlineProfile.name}
            airlineCode={gameState.airlineProfile.code}
            airlineCountry={gameState.airlineProfile.country}
            onTimePerformance={gameState.onTimePerformance}
            passengerSatisfaction={gameState.passengerSatisfaction}
            onMenuClick={() => setIsNavOpen(true)}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <GameControls
                gameSpeed={gameState.gameSpeed}
                onSpeedChange={(speed) => setGameState(prev => ({ ...prev, gameSpeed: speed }))}
              />
              {renderCurrentView()}
            </div>
          </main>
        </div>
      </div>
      {notification && (
        <Notification 
          message={notification.message} 
          onClick={notification.action ? () => {
             notification.action?.();
             setNotification(null);
          } : undefined}
          actionLabel={notification.actionLabel}
        />
      )}
    </div>
  );
};

export default App;

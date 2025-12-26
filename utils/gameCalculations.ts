
import type { GameState, PlayerAircraft, Route, AircraftModel, AircraftConfigurationType, SeatingConfig, BrandReputationType, AirlineConcept, ConceptTransition, TicketPriceStrategy, AirlineProfile, MaintenanceLevel, StartingCapitalLevel, View, Airport, MealServiceLevel, CrewServiceLevel, BaggageServiceLevel, PlayerAirportFacilities } from '../types';
import { GameSpeed, BrandReputationType as BrandReputationEnum, AirlineConcept as AirlineConceptEnum, MaintenanceLevel as MaintenanceLevelEnum, AirportScale, MealServiceLevel as MealServiceLevelEnum, CrewServiceLevel as CrewServiceLevelEnum, BaggageServiceLevel as BaggageServiceLevelEnum, AircraftConfigurationType as AircraftConfigEnum } from '../types';
import { AIRCRAFT_MODELS, AIRCRAFT_CONFIGURATIONS, BRAND_REPUTATIONS, AIRLINE_CONCEPTS, CONCEPT_CHANGE_COST, CONCEPT_TRANSITION_YEARS, TICKET_PRICE_STRATEGIES, LEASE_DEPOSIT_MONTHS, LEASE_COST_PERCENTAGE, LEASE_TERM_YEARS, LEASE_EARLY_RETURN_PENALTY_MONTHS, LEASE_BUYOUT_COST_PERCENTAGE, MAINTENANCE_LEVELS, BASE_ACCIDENT_PROBABILITY, AIRCRAFT_AGE_ACCIDENT_MODIFIER, ACCIDENT_PENALTY_COST, CRASH_REPUTATION_DURATION_YEARS, STARTING_CAPITAL_LEVELS, TICKET_PRICES_PER_KM, HUB_ESTABLISHMENT_COST, AIRCRAFT_HUB_TRANSFER_COST, FOREIGN_HUB_ESTABLISHMENT_COST, FOREIGN_OFFICE_OPERATING_COST_MODIFIER, ON_TIME_PERFORMANCE_LEVELS, OTP_BASE_SCORE, OTP_MAINTENANCE_MODIFIERS, OTP_AGE_PENALTY_PER_YEAR, OTP_AGE_MAINTENANCE_MITIGATION, OTP_FOREIGN_HUB_BONUS, OTP_FLEET_STRETCH_THRESHOLD, OTP_FLEET_STRETCH_PENALTY_PER_AIRCRAFT, MEAL_SERVICE_LEVELS, CREW_SERVICE_LEVELS, BAGGAGE_SERVICE_LEVELS, PASSENGER_SATISFACTION_LEVELS, AIRCRAFT_AGE_SATISFACTION_THRESHOLD, AIRCRAFT_AGE_SATISFACTION_PENALTY_PER_YEAR, AIRCRAFT_CONFIG_CHANGE_COST_MODIFIER, AIRCRAFT_RETROFIT_COST_MODIFIER, DEMAND_MATRIX, COMPETITION_MATRIX, AIRPORT_FACILITIES } from '../constants';
import { calculateDistance } from './distance';
import { getAirportCode } from './formatters';

export const getRouteCategory = (route: Route, allAirports: Airport[]): 'trunk' | 'feeder' | 'regional' => {
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

export const calculateFacilityEffects = (allFacilities: PlayerAirportFacilities | undefined, airportCode: string) => {
    const effects = {
        operatingCostModifier: 1.0,
        maintenanceAccidentModifier: 1.0,
        otpBonus: 0,
        satisfactionBonus: 0,
        demandModifier: { first: 1.0, business: 1.0, economy: 1.0 },
    };

    if (!allFacilities || !allFacilities[airportCode]) return effects;

    allFacilities[airportCode].facilities.forEach(facilityType => {
        const facilityData = AIRPORT_FACILITIES[facilityType];
        if (facilityData && facilityData.effects) {
            if (facilityData.effects.operatingCostModifier) {
                effects.operatingCostModifier *= facilityData.effects.operatingCostModifier;
            }
            if (facilityData.effects.maintenanceAccidentModifier) {
                effects.maintenanceAccidentModifier *= facilityData.effects.maintenanceAccidentModifier;
            }
            if (facilityData.effects.otpBonus) {
                effects.otpBonus += facilityData.effects.otpBonus;
            }
            if (facilityData.effects.satisfactionBonus) {
                effects.satisfactionBonus += facilityData.effects.satisfactionBonus;
            }
            if (facilityData.effects.demandModifier) {
                if (facilityData.effects.demandModifier.first) effects.demandModifier.first *= facilityData.effects.demandModifier.first;
                if (facilityData.effects.demandModifier.business) effects.demandModifier.business *= facilityData.effects.demandModifier.business;
                if (facilityData.effects.demandModifier.economy) effects.demandModifier.economy *= facilityData.effects.demandModifier.economy;
            }
        }
    });

    return effects;
};

export const generateRoutesForHub = (hubAirport: Airport, allAirports: Airport[]): Route[] => {
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

export const calculateNewReputation = (currentState: GameState): BrandReputationType => {
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
};

export const processDailyUpdate = (prevState: GameState): { newState: GameState, notifications: string[] } => {
    let newState = { ...prevState };
    const notifications: string[] = [];
    const nextDate = new Date(newState.date);
    nextDate.setDate(nextDate.getDate() + 1);
    newState.date = nextDate;

    // --- CRASHED REPUTATION RECOVERY ---
    if (newState.crashedReputationEndDate && nextDate >= newState.crashedReputationEndDate) {
        const conceptData = AIRLINE_CONCEPTS[newState.concept!];
        newState.reputation = conceptData.initialReputation;
        newState.crashedReputationEndDate = undefined;
        notifications.push("치명적인 사고의 여파에서 벗어나, 항공사 평판이 정상으로 회복되기 시작합니다.");
    }

    // --- ACCIDENT CHECK ---
    let accidentOccurred = false;
    const maintenanceData = MAINTENANCE_LEVELS[newState.maintenanceLevel];
    let fleetAfterAccidents = [...newState.fleet];

    if (newState.reputation !== BrandReputationEnum.CRASHED) { // No accidents during recovery
        for (const aircraft of newState.fleet) {
            if (aircraft.schedule.length === 0) continue;

            const ageInYears = (nextDate.getTime() - aircraft.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

            // Apply Maintenance Center effects from base airport
            const baseFacilities = calculateFacilityEffects(newState.airportFacilities, aircraft.base);
            const facilityAccidentModifier = baseFacilities.maintenanceAccidentModifier;

            const accidentProbability = (BASE_ACCIDENT_PROBABILITY + ageInYears * AIRCRAFT_AGE_ACCIDENT_MODIFIER) * maintenanceData.accidentModifier * facilityAccidentModifier;

            if (Math.random() < accidentProbability) {
                notifications.push(`[비상] ${aircraft.nickname} (${AIRCRAFT_MODELS.find(m => m.id === aircraft.modelId)?.name}) 항공기가 치명적인 사고에 휘말렸습니다!`);

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
    if (accidentOccurred) return { newState, notifications };


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
    if (leaseExpiredNotificationNeeded) notifications.push(`일부 항공기의 리스 계약이 만료되었습니다. 보유 항공기 패널에서 조치를 취해주세요.`);
    newState.fleet = fleetAfterLeaseCheck;

    if (newState.conceptTransition && nextDate >= newState.conceptTransition.endDate) {
        const newConcept = newState.conceptTransition.to;
        notifications.push(`'${AIRLINE_CONCEPTS[newConcept].name}' 컨셉으로의 전환이 완료되었습니다.`);
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

    // Apply facility OTP bonuses
    let totalFacilityOtpBonus = 0;
    if (newState.airportFacilities) {
        Object.keys(newState.airportFacilities).forEach(code => {
            const effects = calculateFacilityEffects(newState.airportFacilities, code);
            totalFacilityOtpBonus += effects.otpBonus;
        });
    }
    // Average bonus across active airports isn't quite right, but let's sum it up as a global boost for now, 
    // or properly weight it by flights. For simplicity, we'll cap it or just add it.
    // Let's assume facility bonuses are global indicators of operational excellence.
    otpScore += totalFacilityOtpBonus;


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

    // Apply facility Satisfaction bonuses
    let totalFacilitySatisfactionBonus = 0;
    if (newState.airportFacilities) {
        Object.keys(newState.airportFacilities).forEach(code => {
            const effects = calculateFacilityEffects(newState.airportFacilities, code);
            totalFacilitySatisfactionBonus += effects.satisfactionBonus;
        });
    }
    satisfactionScore += totalFacilitySatisfactionBonus;


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
                // Apply facility cost reduction
                const originEffects = calculateFacilityEffects(newState.airportFacilities, originCode);
                const destEffects = calculateFacilityEffects(newState.airportFacilities, destCode);

                stats.cost *= originEffects.operatingCostModifier;
                stats.cost *= destEffects.operatingCostModifier;
            }
        }
        dailyExpenses += stats.cost;

        if (route.priceStrategy) {
            const competitionMod = COMPETITION_MODIFIERS[route.competition];
            const priceStrategy = TICKET_PRICE_STRATEGIES[route.priceStrategy];

            stats.demand.first = route.demandClasses.first * competitionMod * brandDemandModifier.first * priceStrategy.demandModifier.first * otpDemandModifier * satisfactionDemandModifier.first;
            stats.demand.business = route.demandClasses.business * competitionMod * brandDemandModifier.business * priceStrategy.demandModifier.business * otpDemandModifier * satisfactionDemandModifier.business;
            stats.demand.economy = route.demandClasses.economy * competitionMod * brandDemandModifier.economy * priceStrategy.demandModifier.economy * otpDemandModifier * satisfactionDemandModifier.economy;

            // Apply Lounge demand modifiers (origin airport effects apply to outbound demand)
            const originEffects = calculateFacilityEffects(newState.airportFacilities, getAirportCode(route.origin)!);
            if (originEffects.demandModifier) {
                stats.demand.first *= originEffects.demandModifier.first || 1;
                stats.demand.business *= originEffects.demandModifier.business || 1;
                stats.demand.economy *= originEffects.demandModifier.economy || 1;
            }

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

    return { newState, notifications };
};

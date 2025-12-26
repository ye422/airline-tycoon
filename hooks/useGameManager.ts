
import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, PlayerAircraft, Route, AircraftModel, AircraftConfigurationType, BrandReputationType, AirlineConcept, ConceptTransition, TicketPriceStrategy, AirlineProfile, MaintenanceLevel, StartingCapitalLevel, Airport, MealServiceLevel, CrewServiceLevel, BaggageServiceLevel } from '../types';
import { GameSpeed, BrandReputationType as BrandReputationEnum, AirlineConcept as AirlineConceptEnum, MaintenanceLevel as MaintenanceLevelEnum, AirportScale, MealServiceLevel as MealServiceLevelEnum, CrewServiceLevel as CrewServiceLevelEnum, BaggageServiceLevel as BaggageServiceLevelEnum, AircraftConfigurationType as AircraftConfigEnum, AirportFacilityType } from '../types';
import { AIRCRAFT_MODELS, AIRCRAFT_CONFIGURATIONS, BRAND_REPUTATIONS, AIRLINE_CONCEPTS, CONCEPT_CHANGE_COST, CONCEPT_TRANSITION_YEARS, TICKET_PRICE_STRATEGIES, LEASE_DEPOSIT_MONTHS, LEASE_COST_PERCENTAGE, LEASE_TERM_YEARS, LEASE_EARLY_RETURN_PENALTY_MONTHS, LEASE_BUYOUT_COST_PERCENTAGE, MAINTENANCE_LEVELS, AIRCRAFT_HUB_TRANSFER_COST, FOREIGN_HUB_ESTABLISHMENT_COST, HUB_ESTABLISHMENT_COST, AIRCRAFT_CONFIG_CHANGE_COST_MODIFIER, AIRCRAFT_RETROFIT_COST_MODIFIER, STARTING_CAPITAL_LEVELS, AIRPORT_FACILITIES, MEAL_SERVICE_LEVELS, CREW_SERVICE_LEVELS, BAGGAGE_SERVICE_LEVELS } from '../constants';
import { AIRPORTS } from '../data/airports';
import { formatCurrency, getAirportCode } from '../utils/formatters';
import { calculateDistance } from '../utils/distance';
import { processDailyUpdate, generateRoutesForHub, getRouteCategory } from '../utils/gameCalculations';

export interface GameNotification {
    message: string;
    action?: () => void;
    actionLabel?: string;
}

// Custom hook to get previous value
function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T | undefined>(undefined);
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

export function useGameManager() {
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

    const showNotification = useCallback((messageOrObj: string | GameNotification) => {
        const notifObj = typeof messageOrObj === 'string' ? { message: messageOrObj } : messageOrObj;
        setNotification(notifObj);
        setTimeout(() => setNotification(null), 4000);
    }, []);

    const updateGame = useCallback(() => {
        setGameState(prev => {
            const result = processDailyUpdate(prev);
            // We cannot call showNotification here directly because it's inside a state setter
            // However, we are in a refactor. 
            // A better pattern: return the new state, and have an effect watch for messages?
            // OR: processDailyUpdate returns notifications, and we handle them.
            // But we are inside setGameState. 
            // We actually need to split the update.
            // But for now, to keep behavior identical, let's use a workaround or refactor the loop.
            // The previous code had side effects inside the reducer (bad practice but worked).
            // Let's modify processDailyUpdate to NOT return the state function but the state object,
            // which it already does.
            return result.newState;
        });
    }, []);

    // We need to handle notifications from the game loop.
    // Ideally, useGameManager should run the loop logic and see if notifications were generated.
    useEffect(() => {
        if (gameState.gameSpeed === GameSpeed.PAUSED) return;

        const interval = 1000 / gameState.gameSpeed;
        const timer = setInterval(() => {
            setGameState(prev => {
                const { newState, notifications } = processDailyUpdate(prev);
                if (notifications.length > 0) {
                    // This is still side-effecty but slightly better.
                    // Since we can't easily sync state updates with external effects in React 18 strict mode cleanly
                    // without double invocation issues, we'll use a timeout or just fire it.
                    // But showNotification updates state (setNotification). 
                    // Updating state while updating state is bad.
                    // We'll trust that the batched updates handle it or queue it.
                    // Actually, let's just trigger it asynchronously.
                    setTimeout(() => {
                        notifications.forEach(msg => showNotification(msg));
                    }, 0);
                }
                return newState;
            });
        }, interval);
        return () => clearInterval(timer);
    }, [gameState.gameSpeed, showNotification]);

    // Reputation Change Notification
    const previousReputation = usePrevious(gameState.reputation);
    useEffect(() => {
        if (previousReputation && gameState.reputation !== previousReputation &&
            gameState.reputation !== BrandReputationEnum.STARTUP &&
            gameState.reputation !== BrandReputationEnum.TRANSITIONING) {
            showNotification(`브랜드 평판이 '${BRAND_REPUTATIONS[gameState.reputation].name}'(으)로 변경되었습니다!`);
        }
    }, [gameState.reputation, previousReputation, showNotification]);


    // Actions
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
            airportFacilities: {
                [initialHubCode]: { facilities: [AirportFacilityType.OFFICE] }
            }
        }));
        showNotification(`${profile.name} (${profile.code}) 항공사 설립을 축하합니다!`);
    };

    const handlePurchaseAircraft = (modelId: string, configId: AircraftConfigurationType, nickname: string, base: string, onComplete?: () => void) => {
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
                fleet: [...prev.fleet, newAircraft]
            }));
            showNotification({
                message: `${nickname} (${model.name}) 항공기를 구매했습니다! 클릭하여 노선을 배치하세요.`,
                action: onComplete,
                actionLabel: '배치하러 가기'
            });
        } else {
            showNotification('자금이 부족합니다.');
        }
    };

    const handleLeaseAircraft = (modelId: string, configId: AircraftConfigurationType, nickname: string, base: string, onComplete?: () => void) => {
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
                fleet: [...prev.fleet, newAircraft]
            }));
            showNotification({
                message: `${nickname} (${model.name}) 항공기를 리스했습니다! 클릭하여 노선을 배치하세요.`,
                action: onComplete,
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
        if (aircraft) {
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
                    ? { ...ac, leaseEndDate: newLeaseEndDate, schedule: [] }
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
        const RESIDUAL_VALUE_PERCENTAGE = 0.1;
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
        setGameState(prev => ({ ...prev, maintenanceLevel: level }));
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
                    airportFacilities: {
                        ...prev.airportFacilities,
                        [airportCode]: { facilities: [AirportFacilityType.OFFICE] }
                    }
                };
            } else {
                const newHubRoutes = generateRoutesForHub(airport, prev.airports);
                showNotification(`${airport.name}에 새로운 거점 공항을 설립했습니다!`);
                return {
                    ...prev,
                    cash: prev.cash - cost,
                    airlineProfile: updatedProfile,
                    routes: [...prev.routes, ...newHubRoutes],
                    airportFacilities: {
                        ...prev.airportFacilities,
                        [airportCode]: { facilities: [AirportFacilityType.OFFICE] }
                    }
                };
            }
        });
    };

    const handlePurchaseFacility = (airportCode: string, facilityType: AirportFacilityType) => {
        setGameState(prev => {
            const airport = prev.airports.find(a => a.code === airportCode);
            if (!airport) return prev;

            const existingFacilities = prev.airportFacilities?.[airportCode]?.facilities || [];
            if (existingFacilities.includes(facilityType)) {
                showNotification("이미 보유한 시설입니다.");
                return prev;
            }

            const facilityData = AIRPORT_FACILITIES[facilityType];
            const cost = facilityData.cost[airport.scale];

            if (prev.cash < cost) {
                showNotification(`시설 구매 비용이 부족합니다. (${formatCurrency(cost)})`);
                return prev;
            }

            if (facilityData.prerequisite && !existingFacilities.includes(facilityData.prerequisite)) {
                showNotification(`선행 시설(${AIRPORT_FACILITIES[facilityData.prerequisite].name})이 필요합니다.`);
                return prev;
            }

            // Pay cost and add facility
            return {
                ...prev,
                cash: prev.cash - cost,
                airportFacilities: {
                    ...prev.airportFacilities,
                    [airportCode]: {
                        facilities: [...existingFacilities, facilityType]
                    }
                }
            };
        });
        showNotification(`${AIRPORT_FACILITIES[facilityType].name} 건설을 완료했습니다.`);
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

    const setGameSpeed = (speed: GameSpeed) => {
        setGameState(prev => ({ ...prev, gameSpeed: speed }));
    };

    return {
        gameState,
        notification,
        setNotification, // Exposed for external clear
        showNotification,
        actions: {
            handleGameSetup,
            handlePurchaseAircraft,
            handleLeaseAircraft,
            handleOpenRoute,
            handleUpdateSchedule,
            handleReturnLease,
            handleExtendLease,
            handleBuyoutAircraft,
            handleSellAircraft,
            handleConceptChange,
            handleMaintenanceLevelChange,
            handleUpdateRoutePriceStrategy,
            handleEstablishHub,
            handlePurchaseFacility,
            handleTransferAircraftHub,
            handleServiceLevelChange,
            handleAircraftConfigChange,
            handleAircraftRetrofit,
            setGameSpeed
        }
    };
}

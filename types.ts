
export interface AirlineProfile {
  name: string;
  code: string;
  hubs: string[]; // Airport codes, e.g., ['ICN', 'PUS']
  country: string; // Country code, e.g. 'KR'
}

export type View = 'main' | 'routeManagement' | 'brand' | 'aircraftManagement' | 'airportManagement' | 'routeMarketplace' | 'serviceManagement' | 'photoStudio';

export enum AirportScale {
  REGIONAL = 'REGIONAL',
  MAJOR = 'MAJOR',
  HUB = 'HUB',
  MEGA = 'MEGA',
}

export interface Airport {
  code: string;
  name: string;
  country: string;
  coordinates: { lat: number; lon: number };
  scale: AirportScale;
  slots: number; // daily
  runwayLength: number; // in meters
}

export enum AirportFacilityType {
  OFFICE = 'OFFICE',
  MAINTENANCE_CENTER = 'MAINTENANCE_CENTER',
  GROUND_SERVICES = 'GROUND_SERVICES',
  FUEL_DEPOT = 'FUEL_DEPOT',
  CREW_CENTER = 'CREW_CENTER',
  LOUNGE = 'LOUNGE',
}

export interface FacilityEffects {
  operatingCostModifier?: number;        // e.g. 0.95 = 5% reduction
  maintenanceAccidentModifier?: number;
  otpBonus?: number;
  satisfactionBonus?: number;
  demandModifier?: { first?: number; business?: number; economy?: number };
}

export interface AirportFacilityData {
  id: AirportFacilityType;
  name: string;
  description: string;
  cost: Record<AirportScale, number>;
  effects: FacilityEffects;
  prerequisite?: AirportFacilityType;
  icon?: string; // For UI mapping if needed, or handle in component
}

export interface PlayerAirportFacilities {
  [airportCode: string]: {
    facilities: AirportFacilityType[];
  }
}

export interface AircraftModel {
  id: string;
  name: string;
  manufacturer: string;
  price: number;
  range: number; // in km
  capacity: number; // passengers
  operatingCost: number; // per day
  unlockYear: number;
  costPerFlight: number;
  initialAgeOnPurchase?: number;
}

export interface SeatingConfig {
  first: number;
  business: number;
  economy: number;
}

export enum AircraftConfigurationType {
  FSC_LONG_HAUL = 'FSC_LH',
  FSC_MEDIUM_HAUL = 'FSC_MH',
  LCC_BUSINESS = 'LCC_BUSINESS',
  LCC_ECONOMY = 'LCC_ECONOMY',
}

export interface AircraftConfiguration {
  id: AircraftConfigurationType;
  name: string;
  costModifier: number;
  operatingCostModifier: number;
  seating: (baseCapacity: number) => SeatingConfig;
  satisfactionModifier: number;
}

export interface PlayerAircraft {
  id: string;
  nickname: string;
  modelId: string;
  schedule: { routeId: string; flightNumber: number }[];
  purchaseDate: Date;
  configurationId: AircraftConfigurationType;
  capacity: SeatingConfig;
  ownership: 'owned' | 'leased';
  leaseCost?: number; // per month
  leaseEndDate?: Date;
  base: string; // The airport code of the aircraft's base hub
}

export enum TicketPriceStrategy {
  PREMIUM = 'PREMIUM',
  STANDARD = 'STANDARD',
  LOW_COST = 'LOW_COST',
  ULTRA_LOW_COST = 'ULTRA_LOW_COST',
}

export interface TicketPriceStrategyData {
  id: TicketPriceStrategy;
  name: string;
  description: string;
  priceModifier: { first: number; business: number; economy: number; };
  demandModifier: { first: number; business: number; economy: number; };
}

export interface Route {
  id: string;
  origin: string;
  destination: string;
  distance: number; // in km
  demandClasses: {
    first: number;
    business: number;
    economy: number;
  };
  competition: 'Low' | 'Medium' | 'High';
  price: number; // cost to open route
  isOpened: boolean;
  turnaroundTime: number; // in minutes
  priceStrategy?: TicketPriceStrategy;
}

export enum AirlineConcept {
  FSC = 'FSC',
  LCC = 'LCC',
}

export interface AirlineConceptData {
  id: AirlineConcept;
  name: string;
  description: string;
  initialReputation: BrandReputationType;
}

export enum BrandReputationType {
  STARTUP = 'STARTUP',
  FSC_CLASSIC = 'FSC_CLASSIC',
  FSC_PREMIUM = 'FSC_PREMIUM',
  FSC_NORMAL = 'FSC_NORMAL',
  LCC_GOOD = 'LCC_GOOD',
  LCC_STANDARD = 'LCC_STANDARD',
  ULCC = 'ULCC',
  TRANSITIONING = 'TRANSITIONING',
  CRASHED = 'CRASHED',
}

export interface BrandReputation {
  id: BrandReputationType;
  name: string;
  description: string;
  demandModifier: {
    first: number;
    business: number;
    economy: number;
  };
  requiredOtp?: number;
  otpPenaltyThreshold?: number;
  requiredSatisfaction?: number;
  satisfactionPenaltyThreshold?: number;
}

export enum OnTimePerformanceLevel {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  AVERAGE = 'AVERAGE',
  POOR = 'POOR',
  CRITICAL = 'CRITICAL',
}

export interface OnTimePerformanceData {
  id: OnTimePerformanceLevel;
  name: string;
  description: string;
  demandModifier: number;
  threshold: number;
}

export interface ConceptTransition {
  startDate: Date;
  endDate: Date;
  from: AirlineConcept;
  to: AirlineConcept;
}

export enum MaintenanceLevel {
    MINIMAL = 'MINIMAL',
    STANDARD = 'STANDARD',
    ADVANCED = 'ADVANCED',
    STATE_OF_THE_ART = 'STATE_OF_THE_ART',
}

export interface MaintenanceData {
    id: MaintenanceLevel;
    name: string;
    description: string;
    costPerAircraftPerDay: number;
    accidentModifier: number;
}

export enum StartingCapitalLevel {
    CHALLENGING = 'CHALLENGING',
    STANDARD = 'STANDARD',
    WEALTHY = 'WEALTHY',
}

export interface StartingCapitalData {
    id: StartingCapitalLevel;
    name: string;
    description: string;
    amount: number;
}

export enum MealServiceLevel {
    NONE = 'NONE',
    SNACKS = 'SNACKS',
    STANDARD = 'STANDARD',
    PREMIUM = 'PREMIUM',
}

export enum CrewServiceLevel {
    SAFETY_ONLY = 'SAFETY_ONLY',
    BASIC = 'BASIC',
    ATTENTIVE = 'ATTENTIVE',
    EXEMPLARY = 'EXEMPLARY',
}

export enum BaggageServiceLevel {
    PERSONAL_ITEM_ONLY = 'PERSONAL_ITEM_ONLY',
    PAID_CARRY_ON = 'PAID_CARRY_ON',
    FREE_CHECKED_ONE = 'FREE_CHECKED_ONE',
    GENEROUS = 'GENEROUS',
}

export interface ServiceLevelData {
    id: MealServiceLevel | CrewServiceLevel | BaggageServiceLevel;
    name: string;
    description: string;
    costPerPassenger?: number;
    costPerAircraftPerDay?: number;
    satisfactionPoints: number;
}


export interface GameState {
  cash: number;
  date: Date;
  fleet: PlayerAircraft[];
  routes: Route[];
  gameSpeed: GameSpeed;
  routeMarket: {
    trunk: Route[];
    feeder: Route[];
    regional: Route[];
  };
  reputation: BrandReputationType;
  concept: AirlineConcept | null;
  foundingDate: Date;
  passengersCarried: {
    first: number;
    business: number;
    economy: number;
  };
  conceptTransition?: ConceptTransition;
  airlineProfile: AirlineProfile | null;
  maintenanceLevel: MaintenanceLevel;
  crashedReputationEndDate?: Date;
  airportFacilities?: PlayerAirportFacilities;
  airports: Airport[];
  onTimePerformance: number;
  passengerSatisfaction: number;
  serviceLevels: {
    meal: MealServiceLevel;
    crew: CrewServiceLevel;
    baggage: BaggageServiceLevel;
  };
}

export enum GameSpeed {
  PAUSED = 0,
  NORMAL = 1,
  FAST = 5,
  SUPER_FAST = 15,
}

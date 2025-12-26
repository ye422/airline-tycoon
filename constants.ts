

import type { AircraftModel, Route, AircraftConfiguration, BrandReputation, AirlineConceptData, TicketPriceStrategyData, MaintenanceData, StartingCapitalData, Airport, OnTimePerformanceData, SeatingConfig, ServiceLevelData } from './types';
import { AircraftConfigurationType, BrandReputationType, AirlineConcept, TicketPriceStrategy, MaintenanceLevel, StartingCapitalLevel, AirportScale, OnTimePerformanceLevel, MealServiceLevel, CrewServiceLevel, BaggageServiceLevel, AirportFacilityType, AirportFacilityData } from './types';

export const CONCEPT_CHANGE_COST = 250_000_000_000;
export const CONCEPT_TRANSITION_YEARS = 2;

export const HUB_ESTABLISHMENT_COST: Record<AirportScale, number> = {
  [AirportScale.MEGA]: 2_000_000_000_000,
  [AirportScale.HUB]: 1_000_000_000_000,
  [AirportScale.MAJOR]: 500_000_000_000,
  [AirportScale.REGIONAL]: 200_000_000_000,
};

export const FOREIGN_HUB_ESTABLISHMENT_COST: Record<AirportScale, number> = {
  [AirportScale.MEGA]: HUB_ESTABLISHMENT_COST[AirportScale.MEGA] * 0.25,
  [AirportScale.HUB]: HUB_ESTABLISHMENT_COST[AirportScale.HUB] * 0.25,
  [AirportScale.MAJOR]: HUB_ESTABLISHMENT_COST[AirportScale.MAJOR] * 0.25,
  [AirportScale.REGIONAL]: HUB_ESTABLISHMENT_COST[AirportScale.REGIONAL] * 0.25,
};

export const FOREIGN_OFFICE_OPERATING_COST_MODIFIER = 0.95; // 5% cost reduction

export const AIRCRAFT_HUB_TRANSFER_COST = 5_000_000_000;
export const AIRCRAFT_CONFIG_CHANGE_COST_MODIFIER = 0.05; // 5% of aircraft base price
export const AIRCRAFT_RETROFIT_COST_MODIFIER = 0.20; // 20% of aircraft base price


export const LEASE_DEPOSIT_MONTHS = 1;
export const LEASE_COST_PERCENTAGE = 0.025; // 2.5% of base aircraft price per month
export const LEASE_TERM_YEARS = 5;
export const LEASE_EARLY_RETURN_PENALTY_MONTHS = 3;
export const LEASE_BUYOUT_COST_PERCENTAGE = 0.8; // 80% of base aircraft price

export const BASE_ACCIDENT_PROBABILITY = 0.00000025; // Base daily probability per operating aircraft, roughly 1 in 4 million flights
export const AIRCRAFT_AGE_ACCIDENT_MODIFIER = 0.00000001; // Additional probability per year of age
export const ACCIDENT_PENALTY_COST = 100_000_000_000;
export const CRASH_REPUTATION_DURATION_YEARS = 2;

export const DEMAND_MATRIX = {
  INTERNATIONAL: {
    [AirportScale.MEGA]: {
      [AirportScale.MEGA]: { first: 60, business: 200, economy: 500 },
      [AirportScale.HUB]: { first: 45, business: 160, economy: 420 },
      [AirportScale.MAJOR]: { first: 25, business: 100, economy: 350 },
      [AirportScale.REGIONAL]: { first: 10, business: 40, economy: 200 },
    },
    [AirportScale.HUB]: {
      [AirportScale.MEGA]: { first: 45, business: 160, economy: 420 },
      [AirportScale.HUB]: { first: 35, business: 130, economy: 380 },
      [AirportScale.MAJOR]: { first: 20, business: 80, economy: 300 },
      [AirportScale.REGIONAL]: { first: 8, business: 30, economy: 180 },
    },
    [AirportScale.MAJOR]: {
      [AirportScale.MEGA]: { first: 25, business: 100, economy: 350 },
      [AirportScale.HUB]: { first: 20, business: 80, economy: 300 },
      [AirportScale.MAJOR]: { first: 10, business: 40, economy: 250 },
      [AirportScale.REGIONAL]: { first: 2, business: 15, economy: 150 },
    },
    [AirportScale.REGIONAL]: {
      [AirportScale.MEGA]: { first: 10, business: 40, economy: 200 },
      [AirportScale.HUB]: { first: 8, business: 30, economy: 180 },
      [AirportScale.MAJOR]: { first: 2, business: 15, economy: 150 },
      [AirportScale.REGIONAL]: { first: 0, business: 5, economy: 100 },
    },
  },
  DOMESTIC: {
    [AirportScale.MEGA]: {
      [AirportScale.MEGA]: { first: 15, business: 60, economy: 800 },
      [AirportScale.HUB]: { first: 12, business: 50, economy: 750 },
      [AirportScale.MAJOR]: { first: 8, business: 40, economy: 650 },
      [AirportScale.REGIONAL]: { first: 2, business: 20, economy: 450 },
    },
    [AirportScale.HUB]: {
      [AirportScale.MEGA]: { first: 12, business: 50, economy: 750 },
      [AirportScale.HUB]: { first: 10, business: 45, economy: 700 },
      [AirportScale.MAJOR]: { first: 6, business: 35, economy: 600 },
      [AirportScale.REGIONAL]: { first: 1, business: 15, economy: 400 },
    },
    [AirportScale.MAJOR]: {
      [AirportScale.MEGA]: { first: 8, business: 40, economy: 650 },
      [AirportScale.HUB]: { first: 6, business: 35, economy: 600 },
      [AirportScale.MAJOR]: { first: 4, business: 25, economy: 500 },
      [AirportScale.REGIONAL]: { first: 0, business: 10, economy: 350 },
    },
    [AirportScale.REGIONAL]: {
      [AirportScale.MEGA]: { first: 2, business: 20, economy: 450 },
      [AirportScale.HUB]: { first: 1, business: 15, economy: 400 },
      [AirportScale.MAJOR]: { first: 0, business: 10, economy: 350 },
      [AirportScale.REGIONAL]: { first: 0, business: 5, economy: 250 },
    }
  }
};

export const COMPETITION_MATRIX: Record<AirportScale, Record<AirportScale, 'Low' | 'Medium' | 'High'>> = {
  [AirportScale.MEGA]: {
    [AirportScale.MEGA]: 'High',
    [AirportScale.HUB]: 'High',
    [AirportScale.MAJOR]: 'Medium',
    [AirportScale.REGIONAL]: 'Medium',
  },
  [AirportScale.HUB]: {
    [AirportScale.MEGA]: 'High',
    [AirportScale.HUB]: 'High',
    [AirportScale.MAJOR]: 'Medium',
    [AirportScale.REGIONAL]: 'Low',
  },
  [AirportScale.MAJOR]: {
    [AirportScale.MEGA]: 'Medium',
    [AirportScale.HUB]: 'Medium',
    [AirportScale.MAJOR]: 'Low',
    [AirportScale.REGIONAL]: 'Low',
  },
  [AirportScale.REGIONAL]: {
    [AirportScale.MEGA]: 'Medium',
    [AirportScale.HUB]: 'Low',
    [AirportScale.MAJOR]: 'Low',
    [AirportScale.REGIONAL]: 'Low',
  }
};


export const AIRCRAFT_AGE_SATISFACTION_THRESHOLD = 15; // years
export const AIRCRAFT_AGE_SATISFACTION_PENALTY_PER_YEAR = 1; // points per year over threshold

export const PASSENGER_SATISFACTION_LEVELS = {
  EXCELLENT: { threshold: 90, name: '최상', demandModifier: { first: 1.25, business: 1.15, economy: 1.05 } },
  GOOD: { threshold: 75, name: '좋음', demandModifier: { first: 1.1, business: 1.05, economy: 1.02 } },
  AVERAGE: { threshold: 50, name: '보통', demandModifier: { first: 1.0, business: 1.0, economy: 1.0 } },
  POOR: { threshold: 25, name: '나쁨', demandModifier: { first: 0.85, business: 0.9, economy: 0.98 } },
  CRITICAL: { threshold: 0, name: '심각', demandModifier: { first: 0.6, business: 0.75, economy: 0.95 } },
};

export const ON_TIME_PERFORMANCE_LEVELS: Record<OnTimePerformanceLevel, OnTimePerformanceData> = {
  [OnTimePerformanceLevel.EXCELLENT]: {
    id: OnTimePerformanceLevel.EXCELLENT,
    name: '최상',
    description: '업계를 선도하는 완벽한 정시 운항률입니다. 승객들의 신뢰가 매우 높습니다.',
    demandModifier: 1.05,
    threshold: 98,
  },
  [OnTimePerformanceLevel.GOOD]: {
    id: OnTimePerformanceLevel.GOOD,
    name: '우수',
    description: '대부분의 항공편이 정시에 운항합니다. 승객 만족도가 높습니다.',
    demandModifier: 1.02,
    threshold: 95,
  },
  [OnTimePerformanceLevel.AVERAGE]: {
    id: OnTimePerformanceLevel.AVERAGE,
    name: '보통',
    description: '가끔 사소한 지연이 발생하지만, 전반적으로 안정적입니다.',
    demandModifier: 1.0,
    threshold: 90,
  },
  [OnTimePerformanceLevel.POOR]: {
    id: OnTimePerformanceLevel.POOR,
    name: '나쁨',
    description: '잦은 지연으로 인해 승객들의 불만이 쌓이고 있습니다.',
    demandModifier: 0.95,
    threshold: 80,
  },
  [OnTimePerformanceLevel.CRITICAL]: {
    id: OnTimePerformanceLevel.CRITICAL,
    name: '심각',
    description: '만성적인 지연과 결항이 발생합니다. 항공사의 신뢰도가 크게 손상되었습니다.',
    demandModifier: 0.85,
    threshold: 0,
  },
};

export const OTP_BASE_SCORE = 99.0;
export const OTP_MAINTENANCE_MODIFIERS: Record<MaintenanceLevel, number> = {
  [MaintenanceLevel.MINIMAL]: -20.0,
  [MaintenanceLevel.STANDARD]: 0,
  [MaintenanceLevel.ADVANCED]: 2.0,
  [MaintenanceLevel.STATE_OF_THE_ART]: 4.0,
};
export const OTP_AGE_PENALTY_PER_YEAR = 0.25;
export const OTP_AGE_MAINTENANCE_MITIGATION: Record<MaintenanceLevel, number> = {
  [MaintenanceLevel.MINIMAL]: 0.1,
  [MaintenanceLevel.STANDARD]: 0.5,
  [MaintenanceLevel.ADVANCED]: 0.8,
  [MaintenanceLevel.STATE_OF_THE_ART]: 0.95,
};
export const OTP_FOREIGN_HUB_BONUS = 0.5;
export const OTP_FLEET_STRETCH_THRESHOLD = 1.5;
export const OTP_FLEET_STRETCH_PENALTY_PER_AIRCRAFT = 1.0;


export const COUNTRY_FLAGS: { [key: string]: string } = {
  'KR': '🇰🇷', 'JP': '🇯🇵', 'HK': '🇭🇰', 'SG': '🇸🇬', 'US': '🇺🇸', 'GB': '🇬🇧', 'FR': '🇫🇷',
  'TH': '🇹🇭', 'VN': '🇻🇳', 'PH': '🇵🇭', 'DE': '🇩🇪', 'NL': '🇳🇱', 'ES': '🇪🇸', 'CA': '🇨🇦', 'AU': '🇦🇺',
  'CN': '🇨🇳', 'AE': '🇦🇪', 'TR': '🇹🇷', 'IT': '🇮🇹', 'IN': '🇮🇳', 'QA': '🇶🇦', 'BR': '🇧🇷', 'MX': '🇲🇽', 'TW': '🇹🇼', 'AT': '🇦🇹',
  'ZA': '🇿🇦', 'EG': '🇪🇬', 'ET': '🇪🇹', 'KE': '🇰🇪', 'NG': '🇳🇬', 'MA': '🇲🇦', 'DZ': '🇩🇿'
};

export const COUNTRIES_DATA: { [key: string]: { name: string; airports: string[] } } = {
  'KR': { name: '대한민국', airports: ['ICN', 'GMP', 'PUS', 'CJU', 'TAE', 'CJJ'] },
  'NL': { name: '네덜란드', airports: ['AMS'] },
  'DE': { name: '독일', airports: ['FRA', 'MUC', 'BER', 'DUS'] },
  'TW': { name: '대만', airports: ['TPE', 'KHH'] },
  'US': { name: '미국', airports: ['JFK', 'LAX', 'SFO', 'ORD', 'ATL', 'EWR', 'MIA', 'DFW', 'SEA', 'BOS', 'DEN', 'LAS', 'MCO', 'LGA', 'ASE'] },
  'VN': { name: '베트남', airports: ['SGN', 'HAN', 'DAD'] },
  'BR': { name: '브라질', airports: ['GRU', 'GIG'] },
  'ES': { name: '스페인', airports: ['MAD', 'BCN'] },
  'SG': { name: '싱가포르', airports: ['SIN'] },
  'AE': { name: '아랍에미리트', airports: ['DXB', 'AUH'] },
  'AT': { name: '오스트리아', airports: ['SZG'] },
  'GB': { name: '영국', airports: ['LHR', 'LGW', 'STN', 'MAN', 'EDI', 'LCY'] },
  'IT': { name: '이탈리아', airports: ['FCO', 'MXP', 'FLR'] },
  'IN': { name: '인도', airports: ['DEL'] },
  'JP': { name: '일본', airports: ['NRT', 'HND', 'KIX', 'ITM', 'NGO', 'FUK', 'CTS', 'OKA'] },
  'CN': { name: '중국', airports: ['PEK', 'PVG', 'PKX', 'SHA', 'CAN', 'CTU', 'SZX', 'XIY'] },
  'CA': { name: '캐나다', airports: ['YYZ', 'YVR', 'YUL', 'YYC'] },
  'QA': { name: '카타르', airports: ['DOH'] },
  'TR': { name: '터키', airports: ['IST'] },
  'TH': { name: '태국', airports: ['BKK', 'DMK', 'HKT', 'CNX'] },
  'FR': { name: '프랑스', airports: ['CDG', 'ORY', 'NCE', 'LYS'] },
  'PH': { name: '필리핀', airports: ['MNL'] },
  'MX': { name: '멕시코', airports: ['MEX'] },
  'AU': { name: '호주', airports: ['SYD', 'MEL', 'BNE', 'PER'] },
  'HK': { name: '홍콩', airports: ['HKG'] },
  'ZA': { name: '남아프리카 공화국', airports: ['JNB', 'CPT'] },
  'EG': { name: '이집트', airports: ['CAI'] },
  'ET': { name: '에티오피아', airports: ['ADD'] },
  'KE': { name: '케냐', airports: ['NBO'] },
  'NG': { name: '나이지리아', airports: ['LOS'] },
  'MA': { name: '모로코', airports: ['CMN'] },
  'DZ': { name: '알제리', airports: ['ALG'] },
};

export const EXISTING_AIRLINE_CODES: string[] = [
  '3K', '5J', '5W', '5X', '6E', '7C', 'AA', 'AC', 'AD', 'AF', 'AI', 'AK',
  'AM', 'AR', 'AS', 'AT', 'AV', 'AY', 'AZ', 'A3', 'BA', 'BG', 'B6', 'BR',
  'BT', 'BX', 'CA', 'CI', 'CM', 'C9', 'CX', 'CZ', 'DL', 'DY', 'EI', 'EK',
  'ET', 'EW', 'EY', 'F9', 'FR', 'FX', 'GF', 'G4', 'HA', 'HG', 'HX', 'IB',
  'IR', 'IT', 'JJ', 'JL', 'JU', 'KA', 'KE', 'KL', 'KU', 'LA', 'LH', 'LJ',
  'LO', 'LX', 'ME', 'MH', 'MS', 'MU', 'NH', 'NZ', 'OK', 'OS', 'OZ', 'PD',
  'PG', 'PK', 'PR', 'PS', 'QF', 'QR', 'QZ', 'RJ', 'RS', 'SA', 'SK', 'SN',
  'SQ', 'SU', 'SV', 'SW', 'TG', 'TK', 'TP', 'TR', 'TS', 'TW', 'U2', 'UA',
  'UL', 'VA', 'VN', 'VX', 'VY', 'W6', 'WS', 'ZE'
];

export const STARTING_CAPITAL_LEVELS: Record<StartingCapitalLevel, StartingCapitalData> = {
  [StartingCapitalLevel.CHALLENGING]: {
    id: StartingCapitalLevel.CHALLENGING,
    name: '거지',
    description: '단 한 번의 실수도 용납되지 않는 극한의 난이도. 오직 실력으로만 생존해야 합니다.',
    amount: 50_000_000_000,
  },
  [StartingCapitalLevel.STANDARD]: {
    id: StartingCapitalLevel.STANDARD,
    name: '표준',
    description: '균형 잡힌 자금으로 시작합니다. 안정적인 성장을 위한 기반이 마련되어 있습니다.',
    amount: 500_000_000_000,
  },
  [StartingCapitalLevel.WEALTHY]: {
    id: StartingCapitalLevel.WEALTHY,
    name: '오일 머니',
    description: '막대한 자본으로 시작부터 시장을 압도할 수 있습니다. 실패가 두렵지 않은 플레이를 즐겨보세요.',
    amount: 5_000_000_000_000,
  },
};

export const AIRLINE_CONCEPTS: Record<AirlineConcept, AirlineConceptData> = {
  [AirlineConcept.FSC]: {
    id: AirlineConcept.FSC,
    name: 'Full-Service Carrier (FSC)',
    description: '프리미엄 서비스와 폭넓은 노선망을 제공하는 종합 항공사입니다. 상위 클래스 승객 유치에 유리합니다.',
    initialReputation: BrandReputationType.FSC_NORMAL,
  },
  [AirlineConcept.LCC]: {
    id: AirlineConcept.LCC,
    name: 'Low-Cost Carrier (LCC)',
    description: '운영 효율성을 극대화하여 저렴한 항공권을 제공하는 저비용 항공사입니다. 이코노미 승객 유치에 집중합니다.',
    initialReputation: BrandReputationType.LCC_STANDARD,
  },
};

export const AIRCRAFT_MODELS: AircraftModel[] = [
  {
    id: 'A320neo',
    name: 'Airbus A320neo',
    manufacturer: 'Airbus',
    price: 110_000_000_000,
    range: 6300,
    capacity: 180,
    operatingCost: 15_000_000,
    unlockYear: 2016,
    costPerFlight: 4_000_000,
  },
  {
    id: 'B737MAX',
    name: 'Boeing 737 MAX 8',
    manufacturer: 'Boeing',
    price: 120_000_000_000,
    range: 6570,
    capacity: 189,
    operatingCost: 16_000_000,
    unlockYear: 2017,
    costPerFlight: 4_500_000,
  },
  {
    id: 'A321neo',
    name: 'Airbus A321neo',
    manufacturer: 'Airbus',
    price: 130_000_000_000,
    range: 7400,
    capacity: 220,
    operatingCost: 18_000_000,
    unlockYear: 2017,
    costPerFlight: 5_000_000,
  },
  {
    id: 'A321XLR',
    name: 'Airbus A321XLR',
    manufacturer: 'Airbus',
    price: 142_000_000_000,
    range: 8700,
    capacity: 220,
    operatingCost: 19_000_000,
    unlockYear: 2024,
    costPerFlight: 5_500_000,
  },
  {
    id: 'A350',
    name: 'Airbus A350-900',
    manufacturer: 'Airbus',
    price: 317_000_000_000,
    range: 15000,
    capacity: 325,
    operatingCost: 35_000_000,
    unlockYear: 2015,
    costPerFlight: 20_000_000,
  },
  {
    id: 'B787',
    name: 'Boeing 787-9 Dreamliner',
    manufacturer: 'Boeing',
    price: 292_000_000_000,
    range: 14140,
    capacity: 290,
    operatingCost: 30_000_000,
    unlockYear: 2014,
    costPerFlight: 17_000_000,
  },
  {
    id: 'B777X',
    name: 'Boeing 777-9',
    manufacturer: 'Boeing',
    price: 442_000_000_000,
    range: 13940,
    capacity: 426,
    operatingCost: 48_000_000,
    unlockYear: 2025,
    costPerFlight: 26_000_000,
  },
  {
    id: 'A380',
    name: 'Airbus A380-800',
    manufacturer: 'Airbus',
    price: 445_000_000_000,
    range: 15200,
    capacity: 555,
    operatingCost: 60_000_000,
    unlockYear: 2007,
    costPerFlight: 35_000_000,
    initialAgeOnPurchase: 10,
  },
  // Legacy Narrow-body
  {
    id: 'A320-200',
    name: 'Airbus A320-200',
    manufacturer: 'Airbus',
    price: 70_000_000_000,
    range: 6100,
    capacity: 170,
    operatingCost: 16_000_000,
    unlockYear: 1988,
    costPerFlight: 4_200_000,
    initialAgeOnPurchase: 15
  },
  {
    id: 'B737-800',
    name: 'Boeing 737-800',
    manufacturer: 'Boeing',
    price: 75_000_000_000,
    range: 5440,
    capacity: 175,
    operatingCost: 17_000_000,
    unlockYear: 1998,
    costPerFlight: 4_400_000,
    initialAgeOnPurchase: 15
  },
  {
    id: 'B757-200',
    name: 'Boeing 757-200',
    manufacturer: 'Boeing',
    price: 80_000_000_000,
    range: 7250,
    capacity: 220,
    operatingCost: 19_000_000,
    unlockYear: 1982,
    costPerFlight: 5_500_000,
    initialAgeOnPurchase: 20
  },
  // In-Production Wide-body
  {
    id: 'A330neo',
    name: 'Airbus A330-900neo',
    manufacturer: 'Airbus',
    price: 296_000_000_000,
    range: 13330,
    capacity: 287,
    operatingCost: 30_500_000,
    unlockYear: 2018,
    costPerFlight: 16_500_000,
  },
  {
    id: 'A350-1000',
    name: 'Airbus A350-1000',
    manufacturer: 'Airbus',
    price: 366_000_000_000,
    range: 16100,
    capacity: 366,
    operatingCost: 40_000_000,
    unlockYear: 2018,
    costPerFlight: 22_000_000,
  },
  // Legacy Wide-body
  {
    id: 'A330-200',
    name: 'Airbus A330-200',
    manufacturer: 'Airbus',
    price: 200_000_000_000,
    range: 13450,
    capacity: 247,
    operatingCost: 28_000_000,
    unlockYear: 1998,
    costPerFlight: 15_000_000,
    initialAgeOnPurchase: 15
  },
  {
    id: 'A330-300',
    name: 'Airbus A330-300',
    manufacturer: 'Airbus',
    price: 220_000_000_000,
    range: 11750,
    capacity: 277,
    operatingCost: 30_000_000,
    unlockYear: 1994,
    costPerFlight: 16_000_000,
    initialAgeOnPurchase: 15
  },
  {
    id: 'B767-300ER',
    name: 'Boeing 767-300ER',
    manufacturer: 'Boeing',
    price: 180_000_000_000,
    range: 11070,
    capacity: 260,
    operatingCost: 29_000_000,
    unlockYear: 1988,
    costPerFlight: 15_500_000,
    initialAgeOnPurchase: 20
  },
  {
    id: 'B777-300ER',
    name: 'Boeing 777-300ER',
    manufacturer: 'Boeing',
    price: 375_000_000_000,
    range: 13650,
    capacity: 396,
    operatingCost: 45_000_000,
    unlockYear: 2004,
    costPerFlight: 25_000_000,
    initialAgeOnPurchase: 10
  },
  {
    id: 'B747-8i',
    name: 'Boeing 747-8i',
    manufacturer: 'Boeing',
    price: 418_000_000_000,
    range: 14320,
    capacity: 467,
    operatingCost: 55_000_000,
    unlockYear: 2012,
    costPerFlight: 30_000_000,
    initialAgeOnPurchase: 8
  },
];

export const AIRCRAFT_CONFIGURATIONS: Record<AircraftConfigurationType, AircraftConfiguration> = {
  [AircraftConfigurationType.FSC_LONG_HAUL]: {
    id: AircraftConfigurationType.FSC_LONG_HAUL,
    name: 'FSC 장거리형',
    costModifier: 1.2,
    operatingCostModifier: 1.15,
    seating: (cap) => ({
      first: Math.floor(cap * 0.05),
      business: Math.floor(cap * 0.15),
      economy: Math.floor(cap * 0.6),
    }),
    satisfactionModifier: 10,
  },
  [AircraftConfigurationType.FSC_MEDIUM_HAUL]: {
    id: AircraftConfigurationType.FSC_MEDIUM_HAUL,
    name: 'FSC 중거리형',
    costModifier: 1.1,
    operatingCostModifier: 1.1,
    seating: (cap) => ({
      first: 0,
      business: Math.floor(cap * 0.1),
      economy: Math.floor(cap * 0.8),
    }),
    satisfactionModifier: 5,
  },
  [AircraftConfigurationType.LCC_BUSINESS]: {
    id: AircraftConfigurationType.LCC_BUSINESS,
    name: 'LCC 비즈니스 혼합형',
    costModifier: 1.05,
    operatingCostModifier: 1.0,
    seating: (cap) => ({
      first: 0,
      business: Math.floor(cap * 0.05),
      economy: Math.floor(cap * 0.9),
    }),
    satisfactionModifier: -5,
  },
  [AircraftConfigurationType.LCC_ECONOMY]: {
    id: AircraftConfigurationType.LCC_ECONOMY,
    name: 'LCC 이코노미 집중형',
    costModifier: 1.0,
    operatingCostModifier: 0.95,
    seating: (cap) => ({
      first: 0,
      business: 0,
      economy: Math.floor(cap * 1.05), // Higher density
    }),
    satisfactionModifier: -15,
  },
};

export const BRAND_REPUTATIONS: Record<BrandReputationType, BrandReputation> = {
  [BrandReputationType.STARTUP]: {
    id: BrandReputationType.STARTUP,
    name: '신생 항공사',
    description: '새롭게 떠오르는 항공사입니다. 호기심에 찬 승객들이 몰려들 수 있습니다.',
    demandModifier: { first: 1.05, business: 1.05, economy: 1.05 },
  },
  [BrandReputationType.TRANSITIONING]: {
    id: BrandReputationType.TRANSITIONING,
    name: '브랜드 전환 중',
    description: '항공사 컨셉이 변경되는 과도기입니다. 시장의 인식이 바뀌는 데 시간이 걸립니다.',
    demandModifier: { first: 1.0, business: 1.0, economy: 1.0 }, // This is a placeholder; actual values are interpolated.
  },
  [BrandReputationType.CRASHED]: {
    id: BrandReputationType.CRASHED,
    name: '추락한 항공사',
    description: '치명적인 사고로 인해 항공사의 신뢰도가 바닥으로 떨어졌습니다. 승객들이 외면하고 있습니다.',
    demandModifier: { first: 0.1, business: 0.2, economy: 0.4 },
  },
  [BrandReputationType.FSC_CLASSIC]: {
    id: BrandReputationType.FSC_CLASSIC,
    name: '클래식 FSC',
    description: '전통과 품격을 자랑합니다. 최상위 고객층에게 절대적인 신뢰를 받습니다.',
    demandModifier: { first: 1.15, business: 1.2, economy: 1.0 },
    otpPenaltyThreshold: 90,
    satisfactionPenaltyThreshold: 70,
  },
  [BrandReputationType.FSC_PREMIUM]: {
    id: BrandReputationType.FSC_PREMIUM,
    name: '프리미엄 FSC',
    description: '최고급 서비스를 제공하여 비즈니스 및 일등석 승객들에게 인기가 많습니다.',
    demandModifier: { first: 1.2, business: 1.15, economy: 0.9 },
    otpPenaltyThreshold: 90,
    satisfactionPenaltyThreshold: 75,
  },
  [BrandReputationType.FSC_NORMAL]: {
    id: BrandReputationType.FSC_NORMAL,
    name: '일반 FSC',
    description: '신뢰할 수 있는 서비스를 제공하는 표준적인 항공사입니다. 수요에 큰 변동은 없습니다.',
    demandModifier: { first: 1.0, business: 1.0, economy: 1.0 },
    requiredOtp: 95,
    requiredSatisfaction: 85,
  },
  [BrandReputationType.LCC_GOOD]: {
    id: BrandReputationType.LCC_GOOD,
    name: '고품질 LCC',
    description: '합리적인 가격과 훌륭한 서비스로 이코노미 승객들에게 높은 평가를 받습니다.',
    demandModifier: { first: 0, business: 0.9, economy: 1.15 },
    otpPenaltyThreshold: 88,
    satisfactionPenaltyThreshold: 60,
  },
  [BrandReputationType.LCC_STANDARD]: {
    id: BrandReputationType.LCC_STANDARD,
    name: '표준 LCC',
    description: '가격은 저렴하지만, 서비스 품질에 대한 기대는 낮습니다. 이코노미 승객에 집중합니다.',
    demandModifier: { first: 0, business: 0.8, economy: 1.1 },
    requiredOtp: 90,
    requiredSatisfaction: 70,
  },
  [BrandReputationType.ULCC]: {
    id: BrandReputationType.ULCC,
    name: '초저가 항공사 (ULCC)',
    description: '오직 가격으로만 승부합니다. 이코노미 좌석을 채우는 데는 최고지만, 상위 클래스는 기대할 수 없습니다.',
    demandModifier: { first: 0, business: 0.5, economy: 1.3 },
  },
};

export const TICKET_PRICES_PER_KM = { first: 900, business: 400, economy: 120 };

export const TICKET_PRICE_STRATEGIES: Record<TicketPriceStrategy, TicketPriceStrategyData> = {
  [TicketPriceStrategy.PREMIUM]: {
    id: TicketPriceStrategy.PREMIUM,
    name: '프리미엄',
    description: '높은 수익률을 추구하지만, 탑승률이 낮아질 수 있습니다.',
    priceModifier: { first: 1.3, business: 1.25, economy: 1.2 },
    demandModifier: { first: 0.85, business: 0.9, economy: 0.8 },
  },
  [TicketPriceStrategy.STANDARD]: {
    id: TicketPriceStrategy.STANDARD,
    name: '일반',
    description: '수익과 탑승률의 균형을 맞춘 표준적인 가격입니다.',
    priceModifier: { first: 1.0, business: 1.0, economy: 1.0 },
    demandModifier: { first: 1.0, business: 1.0, economy: 1.0 },
  },
  [TicketPriceStrategy.LOW_COST]: {
    id: TicketPriceStrategy.LOW_COST,
    name: '저가',
    description: '낮은 가격으로 높은 탑승률을 유도합니다.',
    priceModifier: { first: 0.8, business: 0.85, economy: 0.85 },
    demandModifier: { first: 1.1, business: 1.1, economy: 1.2 },
  },
  [TicketPriceStrategy.ULTRA_LOW_COST]: {
    id: TicketPriceStrategy.ULTRA_LOW_COST,
    name: '초저가',
    description: '수익률을 희생하여 탑승률을 극대화하는 박리다매 전략입니다.',
    priceModifier: { first: 0.6, business: 0.7, economy: 0.7 },
    demandModifier: { first: 1.2, business: 1.25, economy: 1.35 },
  },
};

export const MAINTENANCE_LEVELS: Record<MaintenanceLevel, MaintenanceData> = {
  [MaintenanceLevel.MINIMAL]: {
    id: MaintenanceLevel.MINIMAL,
    name: '최소',
    description: '서류상으로만 존재하는 정비입니다. 항공기는 사실상 방치되며, 언제 추락해도 이상하지 않은 상태로 운항합니다.',
    costPerAircraftPerDay: 500_000,
    accidentModifier: 100.0,
  },
  [MaintenanceLevel.STANDARD]: {
    id: MaintenanceLevel.STANDARD,
    name: '표준',
    description: '업계 표준에 따른 정기적인 정비를 수행합니다. 합리적인 비용과 안정성을 제공합니다.',
    costPerAircraftPerDay: 2_000_000,
    accidentModifier: 1.0,
  },
  [MaintenanceLevel.ADVANCED]: {
    id: MaintenanceLevel.ADVANCED,
    name: '고급',
    description: '예방 정비를 포함한 포괄적인 관리를 제공합니다. 사고 위험을 크게 낮출 수 있습니다.',
    costPerAircraftPerDay: 5_000_000,
    accidentModifier: 0.2,
  },
  [MaintenanceLevel.STATE_OF_THE_ART]: {
    id: MaintenanceLevel.STATE_OF_THE_ART,
    name: '최고급',
    description: '최신 기술을 이용한 예측 정비로 최상의 안전을 보장합니다. 비용이 매우 높습니다.',
    costPerAircraftPerDay: 10_000_000,
    accidentModifier: 0.05,
  },
};

export const MEAL_SERVICE_LEVELS: Record<MealServiceLevel, ServiceLevelData> = {
  [MealServiceLevel.NONE]: {
    id: MealServiceLevel.NONE,
    name: '서비스 없음',
    description: '기내식을 제공하지 않아 비용을 극단적으로 절감합니다. LCC/ULCC 전략에 적합합니다.',
    costPerPassenger: 0,
    satisfactionPoints: -15,
  },
  [MealServiceLevel.SNACKS]: {
    id: MealServiceLevel.SNACKS,
    name: '스낵 및 음료',
    description: '간단한 스낵과 음료만 제공하여 비용을 최소화합니다.',
    costPerPassenger: 15_000,
    satisfactionPoints: 0,
  },
  [MealServiceLevel.STANDARD]: {
    id: MealServiceLevel.STANDARD,
    name: '표준 기내식',
    description: '노선에 맞는 표준적인 식사를 제공하여 승객 만족도를 유지합니다.',
    costPerPassenger: 80_000,
    satisfactionPoints: 10,
  },
  [MealServiceLevel.PREMIUM]: {
    id: MealServiceLevel.PREMIUM,
    name: '고급 기내식',
    description: '유명 셰프와 협업한 고급 코스 요리를 제공하여 최상의 경험을 선사합니다.',
    costPerPassenger: 300_000,
    satisfactionPoints: 25,
  },
};

export const CREW_SERVICE_LEVELS: Record<CrewServiceLevel, ServiceLevelData> = {
  [CrewServiceLevel.SAFETY_ONLY]: {
    id: CrewServiceLevel.SAFETY_ONLY,
    name: '안전 전담',
    description: '객실 승무원은 안전 업무에만 집중하며, 서비스는 최소화됩니다.',
    costPerAircraftPerDay: 40_000_000,
    satisfactionPoints: -20,
  },
  [CrewServiceLevel.BASIC]: {
    id: CrewServiceLevel.BASIC,
    name: '기본 교육',
    description: '안전 교육에만 집중하여 최소한의 응대 서비스를 제공합니다.',
    costPerAircraftPerDay: 80_000_000,
    satisfactionPoints: -5,
  },
  [CrewServiceLevel.ATTENTIVE]: {
    id: CrewServiceLevel.ATTENTIVE,
    name: '정중한 응대',
    description: '체계적인 서비스 교육을 통해 정중하고 효율적인 서비스를 제공합니다.',
    costPerAircraftPerDay: 200_000_000,
    satisfactionPoints: 15,
  },
  [CrewServiceLevel.EXEMPLARY]: {
    id: CrewServiceLevel.EXEMPLARY,
    name: '최상급 의전',
    description: '최고 수준의 의전 교육을 받은 승무원이 승객 한 분 한 분을 세심하게 케어합니다.',
    costPerAircraftPerDay: 500_000_000,
    satisfactionPoints: 30,
  },
};

export const BAGGAGE_SERVICE_LEVELS: Record<BaggageServiceLevel, ServiceLevelData> = {
  [BaggageServiceLevel.PERSONAL_ITEM_ONLY]: {
    id: BaggageServiceLevel.PERSONAL_ITEM_ONLY,
    name: '개인 물품만 허용',
    description: '좌석 밑에 보관 가능한 작은 개인 물품 외 모든 수하물에 높은 요금을 부과합니다.',
    costPerPassenger: -100_000,
    satisfactionPoints: -25,
  },
  [BaggageServiceLevel.PAID_CARRY_ON]: {
    id: BaggageServiceLevel.PAID_CARRY_ON,
    name: '유료 수하물',
    description: '모든 수하물에 요금을 부과하여 부가 수익을 창출하고 기본 운임을 낮춥니다.',
    costPerPassenger: -50_000,
    satisfactionPoints: -10,
  },
  [BaggageServiceLevel.FREE_CHECKED_ONE]: {
    id: BaggageServiceLevel.FREE_CHECKED_ONE,
    name: '무료 위탁 1개',
    description: '표준적인 1개의 무료 위탁 수하물을 허용하여 승객 편의를 보장합니다.',
    costPerPassenger: 40_000,
    satisfactionPoints: 10,
  },
  [BaggageServiceLevel.GENEROUS]: {
    id: BaggageServiceLevel.GENEROUS,
    name: '넉넉한 허용량',
    description: '여러 개의 위탁 수하물을 무료로 허용하여 프리미엄 고객에게 최고의 편의를 제공합니다.',
    costPerPassenger: 120_000,
    satisfactionPoints: 20,
  },
};

export const AIRPORT_FACILITIES: Record<AirportFacilityType, AirportFacilityData> = {
  [AirportFacilityType.OFFICE]: {
    id: AirportFacilityType.OFFICE,
    name: '사무소',
    description: '공항 내 기본적인 사무 공간입니다. 해당 공항을 기점으로 하는 노선의 운영 효율을 높여 비용을 절감합니다.',
    cost: {
      [AirportScale.MEGA]: HUB_ESTABLISHMENT_COST[AirportScale.MEGA],
      [AirportScale.HUB]: HUB_ESTABLISHMENT_COST[AirportScale.HUB],
      [AirportScale.MAJOR]: HUB_ESTABLISHMENT_COST[AirportScale.MAJOR],
      [AirportScale.REGIONAL]: HUB_ESTABLISHMENT_COST[AirportScale.REGIONAL],
    },
    effects: {
      operatingCostModifier: 0.97, // 3% reduction
    }
  },
  [AirportFacilityType.MAINTENANCE_CENTER]: {
    id: AirportFacilityType.MAINTENANCE_CENTER,
    name: '정비 센터',
    description: '자체 정비 시설을 갖추어 사고 위험을 줄이고 정시 운항률을 개선합니다.',
    cost: {
      [AirportScale.MEGA]: 500_000_000_000,
      [AirportScale.HUB]: 300_000_000_000,
      [AirportScale.MAJOR]: 150_000_000_000,
      [AirportScale.REGIONAL]: 50_000_000_000,
    },
    effects: {
      maintenanceAccidentModifier: 0.9, // 10% reduction in accident probability
      otpBonus: 1.0, // +1% OTP
    },
    prerequisite: AirportFacilityType.OFFICE,
  },
  [AirportFacilityType.GROUND_SERVICES]: {
    id: AirportFacilityType.GROUND_SERVICES,
    name: '그라운드 서비스 센터',
    description: '지상 조업을 직접 관리하여 비용을 절감하고 신속한 수속을 돕습니다.',
    cost: {
      [AirportScale.MEGA]: 800_000_000_000,
      [AirportScale.HUB]: 500_000_000_000,
      [AirportScale.MAJOR]: 250_000_000_000,
      [AirportScale.REGIONAL]: 100_000_000_000,
    },
    effects: {
      operatingCostModifier: 0.95, // 5% reduction
      otpBonus: 0.5, // +0.5% OTP
    },
    prerequisite: AirportFacilityType.OFFICE,
  },
  [AirportFacilityType.FUEL_DEPOT]: {
    id: AirportFacilityType.FUEL_DEPOT,
    name: '연료 저장소',
    description: '대량의 항공유를 비축하고 저렴하게 공급하여 운항 비용을 크게 절감합니다.',
    cost: {
      [AirportScale.MEGA]: 1_000_000_000_000,
      [AirportScale.HUB]: 700_000_000_000,
      [AirportScale.MAJOR]: 350_000_000_000,
      [AirportScale.REGIONAL]: 150_000_000_000,
    },
    effects: {
      operatingCostModifier: 0.95, // 5% reduction
    },
    prerequisite: AirportFacilityType.OFFICE,
  },
  [AirportFacilityType.CREW_CENTER]: {
    id: AirportFacilityType.CREW_CENTER,
    name: '승무원 센터',
    description: '승무원들의 휴식과 교육을 지원하여 서비스 품질을 높이고 효율적인 인력 운용을 돕습니다.',
    cost: {
      [AirportScale.MEGA]: 600_000_000_000,
      [AirportScale.HUB]: 400_000_000_000,
      [AirportScale.MAJOR]: 200_000_000_000,
      [AirportScale.REGIONAL]: 80_000_000_000,
    },
    effects: {
      satisfactionBonus: 3, // +3 Satisfaction
      operatingCostModifier: 0.98, // 2% reduction (efficiency)
    },
    prerequisite: AirportFacilityType.OFFICE,
  },
  [AirportFacilityType.LOUNGE]: {
    id: AirportFacilityType.LOUNGE,
    name: '프리미엄 라운지',
    description: '상위 클래스 승객을 위한 고급 라운지입니다. 프리미엄 고객 수요를 창출합니다.',
    cost: {
      [AirportScale.MEGA]: 400_000_000_000,
      [AirportScale.HUB]: 250_000_000_000,
      [AirportScale.MAJOR]: 120_000_000_000,
      [AirportScale.REGIONAL]: 50_000_000_000,
    },
    effects: {
      demandModifier: { first: 1.05, business: 1.05 }, // 5% increase in premium demand
    },
    prerequisite: AirportFacilityType.OFFICE,
  },
};
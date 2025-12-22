import React from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Plane, Calendar, Wallet, Globe, Award, Menu, Timer, Smile } from 'lucide-react';
import { COUNTRIES_DATA, COUNTRY_FLAGS, ON_TIME_PERFORMANCE_LEVELS, PASSENGER_SATISFACTION_LEVELS } from '../constants';

interface HeaderProps {
  cash: number;
  date: Date;
  fleetSize: number;
  routeCount: number;
  reputationName: string;
  airlineName: string;
  airlineCode: string;
  airlineCountry: string;
  onTimePerformance: number;
  passengerSatisfaction: number;
  onMenuClick: () => void;
}

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: string | number; }> = ({ icon, label, value }) => (
  <div className="flex items-center space-x-2">
    <div className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-md">
      {icon}
    </div>
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  </div>
);


const Header: React.FC<HeaderProps> = ({ cash, date, fleetSize, routeCount, reputationName, airlineName, airlineCode, airlineCountry, onTimePerformance, passengerSatisfaction, onMenuClick }) => {
  const countryData = COUNTRIES_DATA[airlineCountry];

  const otpLevel = Object.values(ON_TIME_PERFORMANCE_LEVELS)
    .sort((a, b) => b.threshold - a.threshold)
    .find(level => onTimePerformance >= level.threshold);

  const otpValue = `${onTimePerformance.toFixed(1)}% ${otpLevel ? `(${otpLevel.name})` : ''}`;

  const satisfactionLevel = Object.values(PASSENGER_SATISFACTION_LEVELS)
    .sort((a, b) => b.threshold - a.threshold)
    .find(level => passengerSatisfaction >= level.threshold);

  const satisfactionValue = `${Math.round(passengerSatisfaction)}점 ${satisfactionLevel ? `(${satisfactionLevel.name})` : ''}`;

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-md sticky top-0 z-20 h-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4 sm:gap-0">
          <div className="flex items-center space-x-3 self-start sm:self-auto">
            <button onClick={onMenuClick} className="md:hidden p-1 -ml-1 text-slate-600 dark:text-slate-300">
                <Menu size={24} />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-brand-blue-100 dark:bg-brand-blue-900/50 rounded-lg">
                <Globe size={24} className="text-brand-blue-600 dark:text-brand-blue-400" />
              </div>
              <div>
                <div className="flex items-baseline space-x-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">{airlineName}</h1>
                  <span
                    role="img"
                    aria-label={countryData?.name || airlineCountry}
                    className="text-lg flag-emoji"
                  >
                    {COUNTRY_FLAGS[airlineCountry] || airlineCountry}
                  </span>
                </div>
                <p className="text-sm font-mono text-slate-500 dark:text-slate-400">{airlineCode}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2 text-sm w-full sm:w-auto">
              <StatItem icon={<Wallet size={18} className="text-green-600" />} label="자금" value={formatCurrency(cash)} />
              <StatItem icon={<Calendar size={18} className="text-blue-600" />} label="날짜" value={formatDate(date)} />
              <StatItem icon={<Plane size={18} className="text-slate-600 dark:text-slate-300" />} label="항공기/노선" value={`${fleetSize} / ${routeCount}`} />
              <StatItem icon={<Award size={18} className="text-amber-600" />} label="평판" value={reputationName} />
              <StatItem icon={<Timer size={18} className="text-purple-600" />} label="정시성" value={otpValue} />
              <StatItem icon={<Smile size={18} className="text-pink-600" />} label="만족도" value={satisfactionValue} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
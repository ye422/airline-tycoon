
import React, { useState, useMemo, useEffect } from 'react';
import type { AirlineProfile, AirlineConcept, StartingCapitalLevel } from '../types';
import { EXISTING_AIRLINE_CODES, AIRLINE_CONCEPTS, STARTING_CAPITAL_LEVELS, COUNTRIES_DATA, COUNTRY_FLAGS } from '../constants';
import { AIRPORTS } from '../data/airports';
import { formatCurrency } from '../utils/formatters';
import { Globe, CheckCircle2, ScanBarcode, ArrowRight, Plane, Cloud } from 'lucide-react';

interface SetupScreenProps {
  onSetupComplete: (profile: AirlineProfile, concept: AirlineConcept, capital: StartingCapitalLevel) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [hub, setHub] = useState('');
  const [concept, setConcept] = useState<AirlineConcept | null>(null);
  const [capital, setCapital] = useState<StartingCapitalLevel | null>(null);
  const [isTakingOff, setIsTakingOff] = useState(false);

  // Reset hub when country changes
  useEffect(() => {
    setHub('');
  }, [selectedCountry]);

  const codeError = useMemo(() => {
    if (code.length === 0) return null;
    if (code.length !== 2) return "2자리 필요";
    if (!/^[A-Z0-9]{2}$/.test(code)) return "영문/숫자";
    if (EXISTING_AIRLINE_CODES.includes(code)) return "중복";
    return null;
  }, [code]);

  const availableHubs = useMemo(() => {
    if (!selectedCountry) return [];
    return AIRPORTS
      .filter((airport) => airport.country === selectedCountry)
      .map((airport) => ({ code: airport.code, name: airport.name }));
  }, [selectedCountry]);

  const isFormValid = 
    name.trim().length > 0 && 
    code.length === 2 && 
    !codeError && 
    selectedCountry !== '' && 
    hub !== '' &&
    concept !== null && 
    capital !== null;

  const handleSubmit = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (isFormValid) {
      setIsTakingOff(true);
      setTimeout(() => {
        onSetupComplete({
          name: name.trim(),
          code,
          hubs: [hub],
          country: selectedCountry,
        }, concept!, capital!);
      }, 800);
    }
  };

  return (
     <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4 font-sans overflow-y-auto relative selection:bg-brand-blue-100">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-brand-blue-100/40 blur-3xl"></div>
            <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/40 blur-3xl"></div>
            <Cloud className="absolute top-20 left-[10%] text-slate-100 w-32 h-32 opacity-50" />
            <Cloud className="absolute bottom-20 right-[15%] text-slate-100 w-48 h-48 opacity-50" />
        </div>

        {/* Landing Page Header */}
        <div className="mb-8 text-center z-10 max-w-2xl animate-fade-in-up">
            <div className="flex justify-center mb-6">
                 <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <Plane className="w-10 h-10 text-brand-blue-600" />
                 </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
               Airline Tycoon
            </h1>
            <p className="text-slate-500 text-lg md:text-xl font-medium leading-relaxed">
               최고의 항공사 CEO가 될 준비 되셨나요?<br className="hidden md:block" />
               아래 탑승권을 작성하여 첫 비행을 시작하세요.
            </p>
        </div>

        {/* Ticket Container - Responsive: Column on Mobile, Row on Desktop */}
        <div className="relative w-full max-w-xl md:max-w-6xl bg-zinc-100 rounded-[2rem] shadow-2xl shadow-slate-200/50 flex flex-col md:flex-row overflow-hidden transition-all duration-500 z-10 border border-white/50">
            
            {/* LEFT SECTION (Main Ticket Info) */}
            <div className="p-6 md:p-10 pb-0 md:pb-10 md:pr-8 relative flex-1 md:w-[70%] flex flex-col">
                {/* Header */}
                <div className="flex flex-col mb-6 md:mb-10 border-b-2 border-slate-300 pb-4">
                     <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center space-x-2 text-slate-400">
                            <Plane className="w-5 h-5 rotate-45" />
                            <h1 className="text-sm font-black tracking-widest uppercase">BOARDING PASS</h1>
                        </div>
                        <p className="text-sm font-mono font-bold text-slate-400">
                           {new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: '2-digit'}).toUpperCase()}
                        </p>
                     </div>
                     
                     {/* Airline Name Input */}
                     <div className="mt-2">
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-transparent text-3xl md:text-5xl font-black text-slate-900 placeholder-slate-300 outline-none uppercase tracking-tight"
                            placeholder="AIRLINE NAME"
                            maxLength={20}
                        />
                     </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-6 md:gap-y-0 h-full">
                     {/* Col 1: Flight (Code) */}
                     <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Flight (Code)</label>
                        <div className="flex items-center group">
                            <span className="text-3xl md:text-4xl font-mono font-bold text-slate-800 mr-3 w-12 md:w-16">
                                {code || "XX"}
                            </span>
                            <div className="flex flex-col flex-1 max-w-[100px]">
                                <input 
                                    type="text" 
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    maxLength={2}
                                    className={`w-full bg-transparent border-b-2 ${codeError ? 'border-red-500 text-red-500' : 'border-slate-300 text-slate-400 group-hover:border-brand-blue-500 group-hover:text-brand-blue-600'} text-sm font-bold font-mono outline-none uppercase text-center transition-colors pb-1`}
                                    placeholder="EDIT"
                                />
                            </div>
                        </div>
                     </div>

                     {/* Col 2: Class (Strategy) */}
                     <div className="col-span-2 md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Class (Strategy)</label>
                        <div className="flex space-x-2 md:space-x-0 md:flex-col md:space-y-2">
                            {Object.values(AIRLINE_CONCEPTS).map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setConcept(c.id)}
                                    className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-left group flex items-center justify-between ${
                                        concept === c.id 
                                        ? 'border-brand-blue-600 bg-brand-blue-50 text-brand-blue-900' 
                                        : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                    <div>
                                        <span className="font-bold text-sm block">{c.id === 'FSC' ? 'PRESTIGE' : 'ECONOMY'}</span>
                                        <span className="text-[9px] font-mono opacity-60 uppercase">{c.name.split(' ')[0]}</span>
                                    </div>
                                    {concept === c.id && <CheckCircle2 size={14} className="text-brand-blue-600" />}
                                </button>
                            ))}
                        </div>
                     </div>

                     {/* Col 3: Seat (Capital) */}
                     <div className="col-span-2 md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Seat (Capital)</label>
                         <div className="flex space-x-2 md:space-x-0 md:flex-col md:space-y-2">
                            {Object.values(STARTING_CAPITAL_LEVELS).map((level) => {
                                let seatNum = "12A";
                                if (level.id === 'WEALTHY') seatNum = "01A";
                                if (level.id === 'CHALLENGING') seatNum = "48E";
                                
                                return (
                                    <button
                                        key={level.id}
                                        type="button"
                                        onClick={() => setCapital(level.id)}
                                        className={`flex-1 md:flex-none py-2 px-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                                            capital === level.id 
                                            ? 'border-brand-blue-600 bg-brand-blue-600 text-white' 
                                            : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <span className="font-mono font-bold text-md">{seatNum}</span>
                                        <span className="text-[9px] font-bold uppercase">{level.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                     </div>
                </div>
            </div>

            {/* DIVIDER / PERFORATION */}
            <div className="relative w-full h-12 md:w-16 md:h-auto flex items-center justify-center z-10 md:py-10 md:bg-[linear-gradient(90deg,theme(colors.zinc.100)_50%,theme(colors.zinc.50)_50%)] bg-[linear-gradient(180deg,theme(colors.zinc.100)_50%,theme(colors.zinc.50)_50%)]">
                 {/* Mobile: Horizontal Line */}
                 <div className="w-[90%] h-0 border-b-2 border-dashed border-slate-300 absolute top-1/2 md:hidden"></div>
                 {/* Desktop: Vertical Line */}
                 <div className="hidden md:block h-[90%] w-0 border-r-2 border-dashed border-slate-300 absolute left-1/2"></div>

                 {/* Cutouts Mobile */}
                 <div className="absolute left-[-1rem] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-50 md:hidden shadow-inner"></div>
                 <div className="absolute right-[-1rem] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-50 md:hidden shadow-inner"></div>

                 {/* Cutouts Desktop */}
                 <div className="hidden md:block absolute top-[-1rem] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-50 shadow-inner"></div>
                 <div className="hidden md:block absolute bottom-[-1rem] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-50 shadow-inner"></div>
            </div>

            {/* RIGHT SECTION (Stub) */}
            <div className="bg-zinc-50 p-6 md:p-10 md:pl-0 pt-0 md:pt-10 flex flex-col justify-between md:w-[30%] border-l-0">
                 <div className="grid grid-cols-2 md:grid-cols-1 gap-6 md:gap-8">
                    {/* FROM (Country) */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">From</label>
                        <div className="relative border-b-2 border-slate-300 hover:border-slate-400 focus-within:border-brand-blue-600 transition-colors pb-1">
                            <select
                                value={selectedCountry}
                                onChange={(e) => setSelectedCountry(e.target.value)}
                                className="w-full bg-transparent text-xl md:text-2xl font-mono font-bold text-slate-800 outline-none appearance-none cursor-pointer pr-8"
                            >
                                <option value="" disabled>SELECT</option>
                                {Object.entries(COUNTRIES_DATA).map(([c, data]) => (
                                    <option key={c} value={c}>{data.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-0 top-1 pointer-events-none">
                                {selectedCountry ? <span className="text-2xl">{COUNTRY_FLAGS[selectedCountry]}</span> : <Globe size={20} className="text-slate-300"/>}
                            </div>
                        </div>
                    </div>

                    {/* TO (Hub) */}
                        <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">To (Hub)</label>
                        <div className="relative border-b-2 border-slate-300 hover:border-slate-400 focus-within:border-brand-blue-600 transition-colors pb-1">
                            <select
                                value={hub}
                                onChange={(e) => setHub(e.target.value)}
                                disabled={!selectedCountry}
                                className="w-full bg-transparent text-xl md:text-2xl font-mono font-bold text-slate-800 outline-none appearance-none disabled:opacity-50 cursor-pointer"
                            >
                                <option value="" disabled>---</option>
                                {availableHubs.map(({code, name}) => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate font-mono h-4 uppercase">
                            {availableHubs.find(h => h.code === hub)?.name || ''}
                        </p>
                    </div>
                </div>

                 {/* Bottom Actions */}
                 <div className="mt-8 md:mt-auto">
                    <button 
                        onClick={handleSubmit}
                        disabled={!isFormValid || isTakingOff}
                        className={`
                            w-full py-4 rounded-xl font-black text-lg text-white shadow-lg transition-all
                            flex items-center justify-center space-x-2
                            ${isFormValid 
                                ? 'bg-slate-900 hover:bg-black hover:shadow-xl translate-y-0' 
                                : 'bg-slate-300 cursor-not-allowed'
                            }
                        `}
                    >
                         {isTakingOff ? (
                             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                         ) : (
                             <>
                                <span>TAKE OFF</span>
                                <ArrowRight size={20} />
                             </>
                         )}
                    </button>
                    <div className="mt-6 flex justify-center opacity-40">
                         <ScanBarcode className="text-slate-800 w-full h-10 md:h-12" />
                    </div>
                 </div>
            </div>
        </div>
        <style>{`
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
                animation: fade-in-up 0.8s ease-out forwards;
            }
        `}</style>
     </div>
  );
};

export default SetupScreen;

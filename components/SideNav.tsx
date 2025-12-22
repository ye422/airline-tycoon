
import React from 'react';
import { LayoutDashboard, BarChart2, Award, X, ChevronsLeft, ChevronsRight, Plane, Building2, Waypoints, SlidersHorizontal, Camera } from 'lucide-react';
import type { View } from '../types';

interface SideNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, isCollapsed, onClick }) => {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`w-full flex items-center py-3 text-sm font-medium rounded-md transition-colors group ${
        isActive
          ? 'bg-brand-blue-600 text-white shadow-md' // Keep active state prominent
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
      } ${isCollapsed ? 'md:justify-center md:px-2' : 'space-x-3 px-4'}`}
    >
      {icon}
      <span className={`flex-1 text-left whitespace-nowrap ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
    </button>
  );
};

const SideNav: React.FC<SideNavProps> = ({ currentView, onNavigate, isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const handleNavigate = (view: View) => {
    onNavigate(view);
    onClose(); // Close nav on mobile after navigation
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>

      {/* Main Nav Container */}
      <nav
        className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-40 flex flex-col transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0 w-56' : '-translate-x-full w-56'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        <div className="flex flex-col h-full">
            {/* Nav Header - Kept for spacing and mobile close button */}
            <div className={`flex items-center p-2 mb-4 h-[60px] flex-shrink-0 justify-end`}>
                <button onClick={onClose} className="md:hidden p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
                    <X size={24} />
                </button>
            </div>
            
            {/* Nav Links */}
            <div className={`flex-grow space-y-2 transition-all duration-300 ${isCollapsed ? 'md:px-2' : 'px-4'}`}>
                <NavItem
                  icon={<LayoutDashboard size={20} />}
                  label="대시보드"
                  isActive={currentView === 'main'}
                  isCollapsed={isCollapsed}
                  onClick={() => handleNavigate('main')}
                />
                 <NavItem
                  icon={<Waypoints size={20} />}
                  label="노선 개설"
                  isActive={currentView === 'routeMarketplace'}
                  isCollapsed={isCollapsed}
                  onClick={() => handleNavigate('routeMarketplace')}
                />
                <NavItem
                  icon={<BarChart2 size={20} />}
                  label="운항 분석"
                  isActive={currentView === 'routeManagement'}
                  isCollapsed={isCollapsed}
                  onClick={() => handleNavigate('routeManagement')}
                />
                <NavItem
                  icon={<Award size={20} />}
                  label="브랜드 관리"
                  isActive={currentView === 'brand'}
                  isCollapsed={isCollapsed}
                  onClick={() => handleNavigate('brand')}
                />
                <NavItem
                  icon={<Plane size={20} />}
                  label="항공기 관리"
                  isActive={currentView === 'aircraftManagement'}
                  isCollapsed={isCollapsed}
                  onClick={() => handleNavigate('aircraftManagement')}
                />
                <NavItem
                  icon={<Building2 size={20} />}
                  label="공항 관리"
                  isActive={currentView === 'airportManagement'}
                  isCollapsed={isCollapsed}
                  onClick={() => handleNavigate('airportManagement')}
                />
                <NavItem
                  icon={<SlidersHorizontal size={20} />}
                  label="서비스 관리"
                  isActive={currentView === 'serviceManagement'}
                  isCollapsed={isCollapsed}
                  onClick={() => handleNavigate('serviceManagement')}
                />
                <NavItem
                  icon={<Camera size={20} />}
                  label="포토 스튜디오"
                  isActive={currentView === 'photoStudio'}
                  isCollapsed={isCollapsed}
                  onClick={() => handleNavigate('photoStudio')}
                />
            </div>

            {/* Nav Footer / Collapse Toggle */}
            <div className="p-4 flex-shrink-0 border-t border-slate-200 dark:border-slate-700">
                <button
                    onClick={onToggleCollapse}
                    className="hidden md:flex items-center justify-center w-full py-2 mb-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                    {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
                </button>
                <div className={`text-center text-xs text-slate-500 dark:text-slate-500 transition-opacity whitespace-nowrap ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                    <p>Airline Tycoon</p>
                </div>
            </div>
        </div>
      </nav>
    </>
  );
};

export default SideNav;

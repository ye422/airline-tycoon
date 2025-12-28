
import React, { useState, useMemo } from 'react';
import type { View } from './types';
import { BRAND_REPUTATIONS } from './constants';
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
import ServiceManagementPage from './components/ServiceManagementPage';
import PhotoStudioPage from './components/PhotoStudioPage';
import { useGameManager } from './hooks/useGameManager';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('main');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(false);

  // Use the custom hook for all game logic
  const { gameState, notification, setNotification, actions } = useGameManager();

  const openedRoutes = useMemo(() => gameState.routes.filter(r => r.isOpened), [gameState.routes]);
  const currentReputationDetails = useMemo(() => BRAND_REPUTATIONS[gameState.reputation], [gameState.reputation]);

  if (!gameState.airlineProfile) {
    return <SetupScreen onSetupComplete={actions.handleGameSetup} />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'routeManagement':
        return <RouteManagementPage
          gameState={gameState}
          onUpdateRoutePriceStrategy={actions.handleUpdateRoutePriceStrategy}
        />;
      case 'routeMarketplace':
        return <RouteMarketplacePage
          gameState={gameState}
          onOpenRoute={actions.handleOpenRoute}
        />;
      case 'brand':
        return <BrandPage
          gameState={gameState}
          onConceptChange={actions.handleConceptChange}
        />;
      case 'aircraftManagement':
        return <AircraftManagementPage
          gameState={gameState}
          onPurchaseAircraft={(modelId, configId, nickname, base) => actions.handlePurchaseAircraft(modelId, configId, nickname, base, () => setCurrentView('main'))}
          onLeaseAircraft={(modelId, configId, nickname, base) => actions.handleLeaseAircraft(modelId, configId, nickname, base, () => setCurrentView('main'))}
          onLevelChange={actions.handleMaintenanceLevelChange}
          onSellAircraft={actions.handleSellAircraft}
          onReturnLease={actions.handleReturnLease}
          onExtendLease={actions.handleExtendLease}
          onBuyoutAircraft={actions.handleBuyoutAircraft}
          onTransferAircraftHub={actions.handleTransferAircraftHub}
          onAircraftConfigChange={actions.handleAircraftConfigChange}
          onAircraftRetrofit={actions.handleAircraftRetrofit}
        />;
      case 'airportManagement':
        return <AirportManagementPage
          gameState={gameState}
          onEstablishHub={actions.handleEstablishHub}
          onPurchaseFacility={actions.handlePurchaseFacility}
        />;
      case 'serviceManagement':
        return <ServiceManagementPage
          gameState={gameState}
          onServiceLevelChange={actions.handleServiceLevelChange}
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
                onUpdateSchedule={actions.handleUpdateSchedule}
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
                onSpeedChange={actions.setGameSpeed}
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

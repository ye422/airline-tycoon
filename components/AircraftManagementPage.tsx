

import React from 'react';
import type { GameState, AircraftConfigurationType, MaintenanceLevel, PlayerAircraft } from '../types';
import AcquireAircraftPanel from './AcquireAircraftPanel';
import MaintenancePanel from './MaintenancePanel';
import OwnedAircraftPanel from './OwnedAircraftPanel';
import { Plane } from 'lucide-react';

interface AircraftManagementPageProps {
  gameState: GameState;
  onPurchaseAircraft: (modelId: string, configId: AircraftConfigurationType, nickname: string, base: string) => void;
  onLeaseAircraft: (modelId: string, configId: AircraftConfigurationType, nickname: string, base: string) => void;
  onLevelChange: (level: MaintenanceLevel) => void;
  onSellAircraft: (aircraftId: string) => void;
  onReturnLease: (aircraftId: string) => void;
  onExtendLease: (aircraftId: string) => void;
  onBuyoutAircraft: (aircraftId: string) => void;
  onTransferAircraftHub: (aircraftId: string, newHub: string) => void;
  onAircraftConfigChange: (aircraftId: string, newConfigId: AircraftConfigurationType) => void;
  onAircraftRetrofit: (aircraftId: string) => void;
}

const AircraftManagementPage: React.FC<AircraftManagementPageProps> = ({ 
    gameState, 
    onPurchaseAircraft, 
    onLeaseAircraft, 
    onLevelChange,
    onSellAircraft,
    onReturnLease,
    onExtendLease,
    onBuyoutAircraft,
    onTransferAircraftHub,
    onAircraftConfigChange,
    onAircraftRetrofit,
}) => {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-start mb-6">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-md mr-4">
          <Plane className="w-6 h-6 text-brand-blue-600 dark:text-brand-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">항공기 관리</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">새로운 항공기를 획득하고, 보유 항공기의 정비 수준을 관리하세요.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <OwnedAircraftPanel 
              fleet={gameState.fleet} 
              currentDate={gameState.date}
              cash={gameState.cash}
              onSellAircraft={onSellAircraft}
              onReturnLease={onReturnLease}
              onExtendLease={onExtendLease}
              onBuyoutAircraft={onBuyoutAircraft}
              onTransferAircraftHub={onTransferAircraftHub}
              hubs={gameState.airlineProfile?.hubs || []}
              onAircraftConfigChange={onAircraftConfigChange}
              onAircraftRetrofit={onAircraftRetrofit}
            />
          </div>
          <AcquireAircraftPanel
            gameState={gameState}
            onPurchaseAircraft={onPurchaseAircraft}
            onLeaseAircraft={onLeaseAircraft}
          />
          <MaintenancePanel
            currentLevel={gameState.maintenanceLevel}
            onLevelChange={onLevelChange}
          />
      </div>
    </div>
  );
};

export default AircraftManagementPage;
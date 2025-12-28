import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import { Target } from 'lucide-react';
import type { Route, PlayerAircraft, Airport } from '../types';
import { AirportScale } from '../types';
import { getAirportCode } from '../utils/formatters';

interface WorldMapProps {
  hubs: string[];
  routes: Route[];
  fleet: PlayerAircraft[];
  airlineCode: string;
  airports: Airport[];
}

const WorldMap: React.FC<WorldMapProps> = ({ hubs, routes, fleet, airlineCode, airports }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle responsive resizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle tooltip state
  const [hoveredInfo, setHoveredInfo] = useState<{ type: 'point' | 'arc', data: any, x: number, y: number } | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  // Update mouse position for tooltip positioning
  const handleMouseMove = (e: React.MouseEvent) => {
    // Get relative position within the container
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      // If we have an active hover, update its position immediately to avoid lag
      if (hoveredInfo) {
        setHoveredInfo(prev => prev ? { ...prev, x: mousePos.current.x, y: mousePos.current.y } : null);
      }
    }
  };

  // Prepare Points Data (Airports) - Visual + Hitbox
  const pointsData = useMemo(() => {
    const rawPoints = airports
      .filter(a => hubs.includes(a.code) || a.scale === AirportScale.MEGA || a.scale === AirportScale.HUB);

    // Visual Points
    const visualPoints = rawPoints.map(airport => ({
      ...airport,
      lat: airport.coordinates.lat,
      lng: airport.coordinates.lon,
      isHub: hubs.includes(airport.code),
      color: hubs.includes(airport.code) ? '#facc15' : 'rgba(255, 255, 255, 0.6)',
      radius: hubs.includes(airport.code) ? 0.15 : 0.08, // Visual size (Reduced)
      type: 'visual'
    }));

    // Hitbox Points (Invisible but larger)
    const hitboxPoints = rawPoints.map(airport => ({
      ...airport,
      lat: airport.coordinates.lat,
      lng: airport.coordinates.lon,
      isHub: hubs.includes(airport.code),
      color: 'rgba(0,0,0,0)', // Invisible
      radius: 2.5, // Larger hitbox
      type: 'hitbox'
    }));

    return [...visualPoints, ...hitboxPoints];
  }, [airports, hubs]);

  // Create a stable key for schedule changes to prevent unnecessary re-renders
  // This isolates the map data from frequent plane position/fuel updates in 'fleet'
  const scheduleSignature = useMemo(() => {
    return fleet.map(p =>
      p.id + ':' + p.schedule.map(s => s.routeId).join(',')
    ).sort().join('|');
  }, [fleet]);

  // Prepare Arcs Data (Routes) - Visual (Static + Animated Forward + Animated Backward) + Hitbox
  const arcsData = useMemo(() => {
    // Map existing schedule info to identify active routes and assigned planes
    const activeRouteMap = new Map<string, { route: Route; planes: string[] }>();

    fleet.forEach(plane => {
      plane.schedule.forEach(item => {
        if (!activeRouteMap.has(item.routeId)) {
          const route = routes.find(r => r.id === item.routeId);
          if (route) {
            activeRouteMap.set(item.routeId, { route, planes: [] });
          }
        }
        const entry = activeRouteMap.get(item.routeId);
        if (entry) {
          entry.planes.push(`${plane.nickname} (${airlineCode}${item.flightNumber})`);
        }
      });
    });

    const activeRoutes = Array.from(activeRouteMap.values()).map(({ route, planes }) => {
      const origin = airports.find(a => a.code === getAirportCode(route.origin));
      const destination = airports.find(a => a.code === getAirportCode(route.destination));

      if (!origin || !destination) return null;

      // Calculate distance for altitude
      const latDiff = Math.abs(origin.coordinates.lat - destination.coordinates.lat);
      const lngDiff = Math.abs(origin.coordinates.lon - destination.coordinates.lon);
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      // Dynamic altitude: short routes stay low
      const altitude = Math.min(0.3, Math.max(0.02, distance * 0.004));

      return {
        startLat: origin.coordinates.lat,
        startLng: origin.coordinates.lon,
        endLat: destination.coordinates.lat,
        endLng: destination.coordinates.lon,
        name: `${route.origin} ↔ ${route.destination}`,
        planes: planes,
        altitude,
      };
    }).filter(arc => arc !== null);

    // 1. Visual Route Lines (Static, Gold)
    const visualArcs = activeRoutes.map(r => ({
      ...r,
      color: 'rgba(250, 204, 21, 0.5)', // Semi-transparent Gold
      stroke: 0.8,
      type: 'visual'
    }));

    // 2. Hitbox (Invisible, Thick) for easier hovering
    const hitboxArcs = activeRoutes.map(r => ({
      ...r,
      color: 'rgba(0,0,0,0)',
      stroke: 2.0,
      type: 'hitbox'
    }));

    return [...visualArcs, ...hitboxArcs];

    // Depend on scheduleSignature instead of full fleet
  }, [routes, scheduleSignature, airports, airlineCode]);

  // Memoize interaction handlers to prevent Globe re-renders/animation resets
  const handlePointHover = useCallback((point: any) => {
    setHoveredInfo(point ? {
      type: 'point',
      data: point,
      x: mousePos.current.x,
      y: mousePos.current.y
    } : null);
    if (containerRef.current) {
      containerRef.current.style.cursor = point ? 'pointer' : 'move';
    }
  }, []);

  const handleArcHover = useCallback((arc: any) => {
    setHoveredInfo(arc ? {
      type: 'arc',
      data: arc,
      x: mousePos.current.x,
      y: mousePos.current.y
    } : null);
    if (containerRef.current) {
      containerRef.current.style.cursor = arc ? 'pointer' : 'move';
    }
  }, []);

  const emptyLabel = useCallback(() => "", []);

  // Helper to focus on the primary hub
  const focusOnHub = useCallback(() => {
    if (!globeRef.current || hubs.length === 0) return;

    const primaryHubCode = hubs[0];
    const hubAirport = airports.find(a => a.code === primaryHubCode);

    if (hubAirport) {
      globeRef.current.pointOfView({
        lat: hubAirport.coordinates.lat,
        lng: hubAirport.coordinates.lon,
        altitude: 2.0
      }, 1000);
    }
  }, [hubs, airports]);

  // Initial mount focus with timeout to ensure Globe is ready
  useEffect(() => {
    // Attempt focus immediately
    if (hubs.length > 0) focusOnHub();

    // Also retry after a short delay for safety
    const timer = setTimeout(() => {
      if (hubs.length > 0) focusOnHub();
    }, 500);

    return () => clearTimeout(timer);
  }, [hubs, focusOnHub]); // Dep on hubs ensuring it runs when data is ready

  // Tooltip Content Renderer
  const renderTooltip = () => {
    if (!hoveredInfo) return null;
    const { data, type } = hoveredInfo;

    // Offset slightly from mouse cursor
    const style = {
      left: hoveredInfo.x + 15,
      top: hoveredInfo.y + 15
    };

    return (
      <div
        className="absolute z-50 pointer-events-none transform"
        style={style}
      >
        {type === 'point' && (
          <div className="bg-slate-800 text-white px-3 py-1.5 rounded border border-slate-600 shadow-xl text-xs font-bold whitespace-nowrap">
            {data.code} / {data.name}
          </div>
        )}
        {type === 'arc' && (
          <div className="bg-slate-800 text-slate-100 px-3 py-2 rounded border border-slate-600 shadow-xl min-w-[200px]">
            <div className="font-bold text-yellow-400 mb-1 border-b border-slate-700 pb-1">{data.name}</div>
            <div className="text-xs text-slate-400 mt-1">운항 항공편:</div>
            <ul className="text-xs list-disc pl-4 mt-1 text-slate-300 max-h-[100px] overflow-y-auto">
              {data.planes?.length > 0 ? (
                data.planes.map((p: string, idx: number) => <li key={idx}>{p}</li>)
              ) : (
                <li className="text-slate-500 italic">배정된 항공기 없음</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/70 dark:bg-black/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow-md p-4 overflow-hidden relative group">
      <div className="flex justify-between items-center z-10 relative mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">글로벌 운항 지도</h2>
          <p className="text-sm text-slate-400">드래그하여 지구를 회전하고, 스크롤하여 확대/축소하세요.</p>
        </div>
        <button
          onClick={focusOnHub}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded transition-colors border border-slate-600"
          title="허브 공항으로 이동"
        >
          <Target size={16} />
          <span className="hidden sm:inline">허브로 이동</span>
        </button>
      </div>

      {/* Container for the globe */}
      <div
        ref={containerRef}
        className="aspect-[2/1] w-full rounded-md overflow-hidden bg-[#000510] relative cursor-move"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredInfo(null)}
      >
        {dimensions.width > 0 && (
          <Globe
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
            backgroundColor="rgba(0,0,0,0)"

            // Points (Airports)
            pointsData={pointsData}
            pointColor="color"
            pointAltitude={0.01}
            pointRadius="radius"
            pointResolution={12}
            // Disable built-in tooltip
            pointLabel={emptyLabel}
            onPointHover={handlePointHover}

            // Arcs (Routes)
            arcsData={arcsData}
            arcColor="color"
            arcAltitude={(d: any) => d.altitude || 0.15}
            arcStroke={(d: any) => d.stroke}
            // Disable built-in tooltip
            arcLabel={emptyLabel}
            onArcHover={handleArcHover}
          />
        )}

        {/* Custom Tooltip Layer */}
        {renderTooltip()}
      </div>
    </div>
  );
};

export default WorldMap;
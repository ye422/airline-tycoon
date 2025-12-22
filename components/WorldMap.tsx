import React, { useEffect, useRef, useMemo } from 'react';
import type { Route, PlayerAircraft, Airport } from '../types';
import { AirportScale } from '../types';
import { getAirportCode } from '../utils/formatters';

// FIX: Add minimal Leaflet type declarations to resolve 'Cannot find namespace L' errors.
// This provides TypeScript with the necessary type information for `L.LatLng`, `L.Map`, and `L.LayerGroup`
// without needing to install @types/leaflet, assuming Leaflet is loaded globally.
declare namespace L {
  interface LatLng {
    lat: number;
    lng: number;
  }
  interface Map {
    remove(): void;
    // FIX: Add missing 'distance' method to L.Map interface
    distance(latlng1: L.LatLng, latlng2: L.LatLng): number;
  }
  interface LayerGroup {
    clearLayers(): this;
    addLayer(layer: any): this;
  }
}
declare const L: any;

interface WorldMapProps {
  hubs: string[];
  routes: Route[];
  fleet: PlayerAircraft[];
  airlineCode: string;
  airports: Airport[];
}

// Helper to calculate points for a quadratic bezier curve
const getCurvePoints = (p1: L.LatLng, p2: L.LatLng, controlPoint: L.LatLng, segments = 100): L.LatLng[] => {
    const points: L.LatLng[] = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const lat = Math.pow(1 - t, 2) * p1.lat + 2 * (1 - t) * t * controlPoint.lat + Math.pow(t, 2) * p2.lat;
        const lng = Math.pow(1 - t, 2) * p1.lng + 2 * (1 - t) * t * controlPoint.lng + Math.pow(t, 2) * p2.lng;
        points.push(L.latLng(lat, lng));
    }
    return points;
};


const WorldMap: React.FC<WorldMapProps> = ({ hubs, routes, fleet, airlineCode, airports }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  const allAirports = useMemo(() => {
    return airports.map(airport => ({
      code: airport.code,
      name: airport.name,
      scale: airport.scale,
      latlng: L.latLng(airport.coordinates.lat, airport.coordinates.lon),
    }));
  }, [airports]);

  const scheduledRoutesInfo = useMemo(() => {
    const info = new Map<string, { route: Route; planes: { nickname: string; flightNumber: number }[] }>();
    
    fleet.forEach(plane => {
      plane.schedule.forEach(scheduleItem => {
        const routeId = scheduleItem.routeId;
        if (!info.has(routeId)) {
          const route = routes.find(r => r.id === routeId);
          if (route) {
            info.set(routeId, { route, planes: [] });
          }
        }
        const routeInfo = info.get(routeId);
        if (routeInfo) {
          routeInfo.planes.push({
            nickname: plane.nickname,
            flightNumber: scheduleItem.flightNumber,
          });
        }
      });
    });
    return info;
  }, [fleet, routes]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const isMobile = window.innerWidth < 768;
      const initialZoom = isMobile ? 1 : 2;
      const initialCenter: [number, number] = isMobile ? [25, 0] : [30, 30];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        worldCopyJump: true,
        minZoom: isMobile ? 1 : 2,
        maxZoom: 10,
        attributionControl: false,
        zoomControl: false,
      });
      
      map.createPane('routePane');
      map.getPane('routePane').style.zIndex = 450;
      map.createPane('airportPane');
      map.getPane('airportPane').style.zIndex = 460;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);
      
      mapRef.current = map;
      layersRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);
  
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersRef.current) return;

    layersRef.current.clearLayers();

    // Draw Airports
    allAirports.forEach(airport => {
      const isHub = hubs.includes(airport.code);

      // Only draw markers for MEGA/HUB airports or player's own hubs
      if (!isHub && airport.scale !== AirportScale.MEGA && airport.scale !== AirportScale.HUB) {
        return;
      }
      
      const marker = L.circleMarker(airport.latlng, {
        radius: isHub ? 6 : 4,
        fillColor: isHub ? '#facc15' : '#ffffff',
        fillOpacity: 1,
        color: isHub ? '#f59e0b' : '#9ca3af',
        weight: 1,
        pane: 'airportPane',
      }).bindTooltip(airport.code, {
          permanent: false,
          direction: 'top',
          offset: L.point(0, -5),
          className: 'leaflet-tooltip-custom'
      });
      layersRef.current?.addLayer(marker);
    });

    // Draw Scheduled Routes
    scheduledRoutesInfo.forEach(({ route, planes }) => {
      const originCode = getAirportCode(route.origin);
      const destCode = getAirportCode(route.destination);
      if (!originCode || !destCode) return;
      
      const originAirport = allAirports.find(a => a.code === originCode);
      const destAirport = allAirports.find(a => a.code === destCode);
      if (!originAirport || !destAirport) return;
      
      let p1 = originAirport.latlng;
      let p2 = destAirport.latlng;

      const latlngs: L.LatLng[][] = [];
      
      const distance = map.distance(p1, p2);
      // Logarithmic scale for curvature, feels more natural for vast distance differences.
      const curveFactor = Math.log(distance / 100000) / Math.log(2); 
      // Reduced coefficient from 0.2 to 0.05 to make curves, especially for short routes, much flatter.
      const curvature = Math.max(0.01, 0.05 * curveFactor); 
      const curveOffset = 20 * curvature; // Base offset in degrees

      if (Math.abs(p1.lng - p2.lng) > 180) { // Antimeridian crossing
        const p2_wrapped = L.latLng(p2.lat, p2.lng + (p1.lng > 0 ? 360 : -360));
        
        // Use average latitude to determine if the route is in the northern or southern hemisphere
        const avgLat = (p1.lat + p2.lat) / 2;
        const curveDirection = avgLat >= 0 ? 1 : -1; // 1 for North, -1 for South
        
        const midPoint1 = L.latLng((p1.lat + p2_wrapped.lat) / 2, (p1.lng + p2_wrapped.lng) / 2);
        midPoint1.lat += curveDirection * curveOffset;
        const part1 = getCurvePoints(p1, p2_wrapped, midPoint1);
        
        const p1_wrapped = L.latLng(p1.lat, p1.lng - (p1.lng > 0 ? 360 : -360));
        const midPoint2 = L.latLng((p1_wrapped.lat + p2.lat) / 2, (p1_wrapped.lng + p2.lng) / 2);
        midPoint2.lat += curveDirection * curveOffset;
        const part2 = getCurvePoints(p1_wrapped, p2, midPoint2);
        
        latlngs.push(part1, part2);
      } else { // Normal route
        const midPoint = L.latLng((p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2);
        
        // Use average latitude to determine curve direction
        const avgLat = (p1.lat + p2.lat) / 2;
        const curveDirection = avgLat >= 0 ? 1 : -1; // Bend North for northern hemisphere, South for southern
        
        midPoint.lat += curveDirection * curveOffset;
        const curvePoints = getCurvePoints(p1, p2, midPoint);
        latlngs.push(curvePoints);
      }
      
      const planeList = planes.map(p => `<li>${p.nickname} (${airlineCode}${p.flightNumber})</li>`).join('');
      const tooltipContent = `
        <div class="font-semibold text-white">${route.origin} ↔ ${route.destination}</div>
        <div class="text-xs text-slate-300 mt-1">운항 항공편:</div>
        <ul class="text-xs text-slate-300">${planeList}</ul>
      `;
      
      latlngs.forEach(path => {
         // Visible line
        const visibleLine = L.polyline(path, {
            color: '#facc15',
            weight: 1.5,
            opacity: 0.8,
            pane: 'routePane',
            interactive: false,
        });
        layersRef.current?.addLayer(visibleLine);

        // Invisible hitbox line
        const hitboxLine = L.polyline(path, {
            color: 'transparent',
            weight: 20,
            opacity: 0,
            pane: 'routePane',
        }).bindTooltip(tooltipContent, {
            className: 'leaflet-tooltip-custom route-tooltip',
            sticky: true,
        });
        layersRef.current?.addLayer(hitboxLine);
      });
    });

  }, [scheduledRoutesInfo, allAirports, routes, airlineCode, hubs]);

  return (
    <div className="bg-slate-900/70 dark:bg-black/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow-md p-4 overflow-hidden">
      <h2 className="text-lg font-semibold text-slate-100">글로벌 운항 지도</h2>
      <p className="text-sm text-slate-400 mb-4">운항 중인 노선에 마우스를 올려 정보를 확인하세요.</p>
      <div className="aspect-[2/1] w-full rounded-md overflow-hidden bg-[#0a0f1e]">
        <div ref={mapContainerRef} className="w-full h-full" />
        <style>{`
            .leaflet-tooltip-custom {
                background-color: rgba(30, 41, 59, 0.8);
                border: 1px solid #475569;
                color: #f1f5f9;
                padding: 4px 8px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            }
            .route-tooltip {
                padding: 8px;
                font-weight: normal;
            }
            .route-tooltip ul {
                list-style-type: disc;
                list-style-position: inside;
                margin-top: 4px;
                padding-left: 2px;
            }
             .route-tooltip li {
                padding-left: 4px;
            }
        `}</style>
      </div>
    </div>
  );
};

export default WorldMap;
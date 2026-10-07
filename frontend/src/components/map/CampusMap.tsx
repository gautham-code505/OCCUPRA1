import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Resource } from '../../types';
import { getCrowdGlow, getResourceTypeIcon, cn } from '../../utils/helpers';
import { CrowdBadge, OccupancyGauge } from '../ui/CoreComponents';
import { MapPin, Zap, Users } from 'lucide-react';

interface CampusMapProps {
  resources: Resource[];
  onResourceSelect?: (resource: Resource) => void;
  height?: string;
  className?: string;
  center?: [number, number];
  zoom?: number;
}

const CAMPUS_CENTER: LatLngExpression = [12.9716, 77.5946];

const getMarkerRadius = (pct: number) => {
  if (pct > 80) return 18;
  if (pct > 50) return 14;
  return 11;
};

export const CampusMap: React.FC<CampusMapProps> = ({
  resources,
  onResourceSelect,
  height = '500px',
  className,
  center = [12.9716, 77.5946],
  zoom = 17,
}) => {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const handleSelect = (r: Resource) => {
    setSelectedResource(r);
    onResourceSelect?.(r);
  };

  return (
    <div className={cn('rounded-2xl overflow-hidden border border-white/10', className)} style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', background: '#0d1527' }}
        zoomControl={false}
      >
        {/* Dark tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {resources.map(res => {
          const color = getCrowdGlow(res.currentCrowdStatus);
          const radius = getMarkerRadius(res.occupancyPercent);
          const isSelected = selectedResource?.id === res.id;

          return (
            <CircleMarker
              key={res.id}
              center={[res.latitude, res.longitude]}
              radius={isSelected ? radius + 4 : radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.85,
                color: isSelected ? '#ffffff' : color,
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{
                click: () => handleSelect(res),
              }}
            >
              <Popup className="campus-popup">
                <div className="bg-[#0d1527] text-white rounded-xl p-4 min-w-[240px] font-sans">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span>{getResourceTypeIcon(res.type)}</span>
                        <h3 className="font-bold text-sm text-white leading-tight">{res.name}</h3>
                      </div>
                      <CrowdBadge status={res.currentCrowdStatus} size="sm" />
                    </div>
                    <OccupancyGauge percent={res.occupancyPercent} size="sm" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-400 mb-0.5">Occupied</div>
                      <div className="text-sm font-bold text-white">{res.currentOccupancy}/{res.capacity}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-400 mb-0.5">Free</div>
                      <div className="text-sm font-bold text-emerald-400">{res.availableUnits}</div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 text-xs text-slate-400 mb-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-blue-400 flex-shrink-0" />
                      {res.floor} · {res.building}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap size={11} className="text-amber-400 flex-shrink-0" />
                      {res.openingTime} – {res.closingTime}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <button
                    onClick={() => onResourceSelect?.(res)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    View Details & Book →
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

// Mini Map for dashboard
export const MiniCampusMap: React.FC<{ resources: Resource[]; onSelect?: (r: Resource) => void }> = ({ resources, onSelect }) => (
  <CampusMap resources={resources} onResourceSelect={onSelect} height="280px" zoom={16} />
);

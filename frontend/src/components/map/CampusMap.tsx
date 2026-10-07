import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
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

const CAMPUS_CENTER: LatLngExpression = [10.8290, 77.0592];

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
  center = [10.8290, 77.0592],
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
        {/* Dark map tiles - using OSM Stamen Toner for dark look */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
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
              <Tooltip className="!bg-[#0d1527] !text-white !border-white/10 !rounded-xl !p-3 shadow-xl" direction="top" opacity={1}>
                <div className="font-sans text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getResourceTypeIcon(res.type)}</span>
                    <h3 className="font-bold text-sm leading-tight">{res.name}</h3>
                  </div>
                  <div className="flex items-center justify-between gap-4 mt-2">
                    <CrowdBadge status={res.currentCrowdStatus} size="sm" />
                    <span className="text-xs text-slate-400">{res.availableUnits} free</span>
                  </div>
                  <p className="text-[10px] text-blue-400 mt-2 font-medium">Click to view & book →</p>
                </div>
              </Tooltip>
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

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet + Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function CrossingMap({ 
  latitude, 
  longitude, 
  name 
}: { 
  latitude?: number | null, 
  longitude?: number | null, 
  name: string 
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-slate-900 rounded-2xl animate-pulse" />;

  // Default coordinate if null
  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';
  const center: [number, number] = [
    hasCoordinates ? latitude : -6.200000, 
    hasCoordinates ? longitude : 106.816666
  ];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-800 relative z-0">
      <MapContainer 
        center={center} 
        zoom={hasCoordinates ? 16 : 10} 
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {hasCoordinates && (
          <Marker position={center}>
            <Popup>
              <span className="font-bold">{name}</span>
            </Popup>
          </Marker>
        )}
        
        <MapUpdater center={center} />
      </MapContainer>
    </div>
  );
}

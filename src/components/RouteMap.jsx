import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Crosshair } from 'lucide-react';

// Reset Default icon paths to prevent 404s
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Node Icons via Tailwind HTML
const createNodeIcon = (status, orderNum) => {
  const isPending = status === 'pendente';
  const bgColor = isPending ? 'bg-primary' : 'bg-emerald-500';
  const textColor = isPending ? 'text-background' : 'text-white';
  const text = isPending && orderNum !== 9999 ? orderNum : (isPending ? '!' : '✓');
  
  return L.divIcon({
    className: 'custom-node-icon bg-transparent border-0',
    html: `<div class="w-8 h-8 ${bgColor} ${textColor} rounded-full border-[3px] border-white shadow-xl flex items-center justify-center font-black text-xs leading-none ring-2 ring-black/10">${text}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34]
  });
};

const UserLocationIcon = L.divIcon({
  className: 'user-location-icon bg-transparent border-0',
  html: `<div class="w-5 h-5 bg-blue-500 rounded-full border-[3px] border-white shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse relative"><div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function MapBoundsController({ validPoints, userLoc }) {
  const map = useMap();
  useEffect(() => {
    if (validPoints.length > 0) {
      const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
      if (userLoc) bounds.extend([userLoc.lat, userLoc.lng]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    } else if (userLoc) {
      map.setView([userLoc.lat, userLoc.lng], 16);
    }
  }, [validPoints, userLoc, map]);
  return null;
}

export default function RouteMap({ deliveries }) {
  const [userLoc, setUserLoc] = useState(null);
  
  // Start tracking user coordinates
  useEffect(() => {
    if (!navigator.geolocation) return;
    let errorCount = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (errorCount === 0) {
          console.warn('GPS Indisponível (Padrão em Computadores/Simuladores):', err.message || err.code);
          errorCount++;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Filter deliveries that have geometry
  const validDeliveries = useMemo(() => {
    return deliveries.filter(d => d.lat && d.lng).sort((a, b) => {
      const orderA = a.ordem_rota || 9999;
      const orderB = b.ordem_rota || 9999;
      return orderA - orderB;
    });
  }, [deliveries]);

  // Create the Polyline path (connecting only pending organized items, or all?)
  const pathCoordinates = useMemo(() => {
    return validDeliveries
      .filter(d => d.status === 'pendente')
      .map(d => [d.lat, d.lng]);
  }, [validDeliveries]);

  const handleNavigate = (item) => {
    const query = encodeURIComponent(`${item.endereco_completo}, ${item.numero}${item.cep ? ', ' + item.cep : ''}`);
    window.location.href = `waze://?q=${query}`;
  };

  return (
    <div className="w-full h-full flex flex-col relative rounded-[32px] overflow-hidden border border-white/5 shadow-2xl bg-surface">
      <MapContainer 
        center={[-23.5505, -46.6333]} 
        zoom={13} 
        className="w-full flex-1 z-0"
        zoomControl={false} // We can add custom zoom control if default is ugly
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // Cleaner, more modern tile aesthetics
        />
        
        <MapBoundsController validPoints={validDeliveries} userLoc={userLoc} />

        {/* The Route Path */}
        {pathCoordinates.length > 1 && (
          <Polyline 
            positions={pathCoordinates} 
            color="#fbbf24" // Primary yellow 
            weight={4} 
            opacity={0.8} 
            dashArray="10, 10" // dotted line for a cool logistic effect
            lineJoin="round"
          />
        )}

        {/* User Location */}
        {userLoc && (
          <Marker position={[userLoc.lat, userLoc.lng]} icon={UserLocationIcon}>
            <Popup className="custom-popup">Você está aqui</Popup>
          </Marker>
        )}

        {/* Delivery Pins */}
        {validDeliveries.map((item) => (
          <Marker 
            key={item.id} 
            position={[item.lat, item.lng]} 
            icon={createNodeIcon(item.status, item.ordem_rota || 9999)}
          >
            <Popup className="custom-popup" closeButton={false}>
              <div className="flex flex-col gap-2 p-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${item.status === 'pendente' ? 'bg-primary animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#94a3b8]">
                    {item.status === 'pendente' ? 'A Caminho' : 'Concluída'}
                  </span>
                </div>
                
                <h3 className="font-black text-gray-900 text-lg leading-tight mb-1">
                  {item.nome_destinatario}
                </h3>
                <p className="text-sm text-gray-600 font-medium leading-snug">
                  {item.endereco_completo}, {item.numero}
                </p>
                <div className="text-[11px] font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded w-fit mb-2">
                  {item.codigo_rastreio}
                </div>

                {item.status === 'pendente' && (
                  <button
                    onClick={() => handleNavigate(item)}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-[#fbbf24] text-black font-black uppercase text-xs py-3 rounded-xl transition-transform active:scale-95 shadow-md shadow-yellow-500/20"
                  >
                    <Navigation size={14} />
                    Navegar (Waze)
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Custom floaty header overlay just to make it look native */}
      <div className="absolute top-4 left-4 right-4 z-[400] pointer-events-none flex justify-between items-start">
        <div className="bg-background/90 backdrop-blur-md px-4 py-3 flex items-center gap-3 rounded-[20px] border border-white/10 shadow-2xl pointer-events-auto/50">
           <Crosshair size={18} className="text-primary" />
           <span className="font-bold text-xs uppercase tracking-widest text-primary/90">Acompanhamento GPS</span>
        </div>
      </div>
    </div>
  );
}

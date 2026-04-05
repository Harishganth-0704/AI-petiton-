import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Fix Leaflet default icon path (broken in Vite builds)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const STATUS_COLOR: Record<string, string> = {
  resolved: '#10b981',
  rejected: '#6b7280',
  escalated: '#ef4444',
  in_progress: '#f59e0b',
  submitted: '#3b82f6',
  pending: '#8b5cf6',
};

const DEPT_ICONS: Record<string, string> = {
  water: '💧', road: '🛣️', electricity: '⚡', sanitation: '🧹', healthcare: '🏥',
};

function createColoredMarker(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function MapPage() {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<any>(null);

  const [petitions, setPetitions] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, withCoords: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [nearMeActive, setNearMeActive] = useState(false);

  // Helper: Calculate distance in KM
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const findNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false);
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setNearMeActive(true);
        if (mapInstance.current) {
          mapInstance.current.flyTo(coords, 13);
        }
      }, () => {
        toast.info("📍 GPS unavailable. You can still browse the map normally.");
      });
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
    mapInstance.current = map;
    markersLayer.current = L.layerGroup().addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    apiFetch('/api/petitions/map')
      .then((data: any[]) => {
        setPetitions(data);
        const withCoordsNodes = data.filter(p => p.location_lat != null && p.location_lng != null);
        setStats({ total: data.length, withCoords: withCoordsNodes.length });

        if (withCoordsNodes.length > 0) {
          const bounds = L.latLngBounds(withCoordsNodes.map(p => [parseFloat(p.location_lat), parseFloat(p.location_lng)]));
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      })
      .catch(err => setError(err.message || 'Failed to load map data'))
      .finally(() => setLoading(false));

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;

    markersLayer.current.clearLayers();

    const filtered = petitions.filter(p => {
      const hasCoords = p.location_lat != null && p.location_lng != null;
      const matchesFilter = filter === 'all' || p.category === filter;
      
      let inRange = true;
      if (nearMeActive && userLocation) {
        const dist = getDistance(userLocation[0], userLocation[1], parseFloat(p.location_lat), parseFloat(p.location_lng));
        inRange = dist <= 5; // 5km radius
      }

      return hasCoords && matchesFilter && inRange;
    });

    if (showHeatmap) {
      filtered.forEach(p => {
        L.circleMarker([parseFloat(p.location_lat), parseFloat(p.location_lng)], {
          radius: 20,
          fillColor: '#ef4444',
          fillOpacity: 0.15,
          color: 'transparent',
          interactive: false
        }).addTo(markersLayer.current!);
      });
    } else {
      filtered.forEach(pet => {
        const lat = parseFloat(pet.location_lat);
        const lng = parseFloat(pet.location_lng);
        const color = STATUS_COLOR[pet.status] || '#3b82f6';
        const icon = DEPT_ICONS[pet.category] || '📋';

        const marker = L.marker([lat, lng], { icon: createColoredMarker(color) });
        marker.bindPopup(`
          <div style="font-family:system-ui,sans-serif;min-width:200px;max-width:260px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${icon} ${pet.title}</div>
            <div style="font-size:11px;color:#666;margin-bottom:4px;">${t('dept_' + pet.category)}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
              <span style="background:#e5e7eb;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:600;">${t('status_' + pet.status) || pet.status}</span>
              <span style="background:#dbeafe;padding:1px 6px;border-radius:999px;font-size:10px;">${pet.priority || 'medium'}</span>
            </div>
            <div style="font-size:10px;color:#999;">${pet.address || ''}</div>
          </div>
        `);
        marker.addTo(markersLayer.current!);
      });
    }

    // Add user location marker if near me is active
    if (nearMeActive && userLocation) {
      L.circleMarker(userLocation, {
        radius: 8,
        color: 'white',
        weight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 1
      }).addTo(markersLayer.current!).bindPopup("You are here");
    }
  }, [petitions, filter, showHeatmap, nearMeActive, userLocation, t]);

  const departments = [
    { id: 'all', label: t('all_issues'), icon: '🌍' },
    { id: 'water', label: t('dept_water'), icon: '💧' },
    { id: 'road', label: t('dept_road'), icon: '🛣️' },
    { id: 'electricity', label: t('dept_electricity'), icon: '⚡' },
    { id: 'sanitation', label: t('dept_sanitation'), icon: '🧹' },
    { id: 'healthcare', label: t('dept_healthcare'), icon: '🏥' },
  ];

  const currentVisibleCount = petitions.filter(p => {
    const hasCoords = p.location_lat != null && p.location_lng != null;
    const matchesFilter = filter === 'all' || p.category === filter;
    let inRange = true;
    if (nearMeActive && userLocation) {
      const dist = getDistance(userLocation[0], userLocation[1], parseFloat(p.location_lat), parseFloat(p.location_lng));
      inRange = dist <= 5;
    }
    return hasCoords && matchesFilter && inRange;
  }).length;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <span className="text-primary">📍</span> {t('petition_map_title')}
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {loading ? t('loading_map_data') : error ? (
                <span className="text-destructive">{error}</span>
              ) : (
                <>{t('showing')} <strong>{currentVisibleCount}</strong> {t('active_issues')}</>
              )}
            </p>
            {currentVisibleCount > 10 && (
              <Badge variant="destructive" className="animate-pulse gap-1 py-0.5">
                <AlertTriangle className="w-3 h-3" /> {t('high_activity_zone')}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={nearMeActive ? "default" : "outline"}
            size="sm"
            className="gap-2 h-9 rounded-full shadow-sm"
            onClick={findNearMe}
          >
            🛰️ {nearMeActive ? t('reset_view') : t('near_me_5km')}
          </Button>

          <Button
            variant={showHeatmap ? "destructive" : "outline"}
            size="sm"
            className="gap-2 h-9 rounded-full shadow-sm"
            onClick={() => setShowHeatmap(!showHeatmap)}
          >
            🔥 {showHeatmap ? t('standard_view') : t('heatmap_mode')}
          </Button>

          <div className="h-9 w-px bg-border mx-1 hidden sm:block" />

          {departments.map(dept => (
            <Button
              key={dept.id}
              variant={filter === dept.id ? "default" : "secondary"}
              size="sm"
              className={`gap-1.5 h-9 rounded-full px-4 transition-all ${filter === dept.id ? 'shadow-md scale-105' : 'opacity-80'}`}
              onClick={() => setFilter(dept.id)}
            >
              <span className="text-base">{dept.icon}</span>
              <span className="hidden sm:inline">{dept.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="relative group">
        <div ref={mapRef} className="h-[600px] w-full rounded-2xl border-2 border-primary/10 overflow-hidden shadow-xl" />
        {loading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-[1000] rounded-2xl">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-primary tracking-widest uppercase">{t('loading_civic_intel')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider bg-muted/30 p-3 rounded-xl border border-dashed">
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <div key={s} className="flex items-center gap-1.5 px-2">
            <div style={{ background: c }} className="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.2)]" />
            <span>{t('status_' + s)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

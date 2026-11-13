import { useEffect, useRef, useState, useMemo } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { RouteWaypoint } from '../../services/tollEngine';

interface GoogleMapRouteDirectorProps {
  origin: RouteWaypoint;
  destination: RouteWaypoint;
  waypoints?: RouteWaypoint[];
  defaultPolyline: [number, number][]; // [lat, lng][] from toll engine
  onPathUpdated?: (coords: Array<{ lat: number; lng: number }>) => void;
}

/**
 * Validates geographical latitude and longitude
 */
export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  if (lat === undefined || lat === null || lng === undefined || lng === null) return false;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  // In Brazil, latitudes are negative (-33 to +5) and longitudes are negative (-74 to -34)
  // (0, 0) represents un-geocoded placeholder
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * Builds an interpolated highway corridor between two coordinates
 */
function interpolatePoints(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  steps = 8
): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let lat = start.lat + (end.lat - start.lat) * t;
    let lng = start.lng + (end.lng - start.lng) * t;
    // Add natural road curvature
    const curve = Math.sin(t * Math.PI) * 0.05;
    if (Math.abs(start.lng - end.lng) > Math.abs(start.lat - end.lat)) {
      lat += curve;
    } else {
      lng += curve;
    }
    points.push({ lat, lng });
  }
  return points;
}

/**
 * GoogleMapRouteDirector
 * 
 * Accurately and reliably draws the route polyline between point A, stops, and point B:
 * 1. Validates all coordinates before rendering.
 * 2. Instantly renders the polyline using validated coordinates without waiting for async APIs.
 * 3. Asynchronously enhances with high-resolution turn-by-turn road geometry via DirectionsService.
 * 4. Renders a high-contrast dual-layer polyline with navigation direction arrows.
 * 5. Automatically fits the map camera bounds to frame the entire route.
 */
export function GoogleMapRouteDirector({
  origin,
  destination,
  waypoints = [],
  defaultPolyline,
  onPathUpdated
}: GoogleMapRouteDirectorProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const [directionsPath, setDirectionsPath] = useState<Array<{ lat: number; lng: number }> | null>(null);

  const casingPolylineRef = useRef<google.maps.Polyline | null>(null);
  const corePolylineRef = useRef<google.maps.Polyline | null>(null);

  // Validate origin, destination, and intermediate waypoints
  const isOriginValid = isValidCoordinate(origin?.lat, origin?.lng);
  const isDestValid = isValidCoordinate(destination?.lat, destination?.lng);
  const validWaypoints = useMemo(() => {
    return (waypoints || []).filter(w => isValidCoordinate(w?.lat, w?.lng));
  }, [waypoints]);

  // Generate fallback validated path immediately
  const validatedBasePath = useMemo(() => {
    if (!isOriginValid || !isDestValid) return [];

    // If defaultPolyline has valid coordinates and covers the corridor, use it
    const validDefault = (defaultPolyline || []).filter(([lat, lng]) => isValidCoordinate(lat, lng));
    if (validDefault.length >= 2) {
      return validDefault.map(([lat, lng]) => ({ lat, lng }));
    }

    // Otherwise interpolate between origin, waypoints, and destination
    const allStops = [
      { lat: origin.lat, lng: origin.lng },
      ...validWaypoints.map(w => ({ lat: w.lat, lng: w.lng })),
      { lat: destination.lat, lng: destination.lng }
    ];

    const assembled: Array<{ lat: number; lng: number }> = [];
    for (let i = 0; i < allStops.length - 1; i++) {
      const start = allStops[i], end = allStops[i + 1];
      if (!start || !end) continue;
      const seg = interpolatePoints(start, end, 6);
      if (i > 0) seg.shift();
      assembled.push(...seg);
    }
    return assembled;
  }, [isOriginValid, isDestValid, origin.lat, origin.lng, destination.lat, destination.lng, validWaypoints, defaultPolyline]);

  // Reset directionsPath when waypoints change to guarantee instant responsiveness
  useEffect(() => {
    setDirectionsPath(null);
  }, [origin.lat, origin.lng, destination.lat, destination.lng, waypoints]);

  // 1. Asynchronously request turn-by-turn driving route from Google DirectionsService
  useEffect(() => {
    if (!map || !routesLib || typeof google === 'undefined' || !google.maps) return;
    if (!isOriginValid || !isDestValid) return;

    let isMounted = true;

    try {
      const directionsService = new routesLib.DirectionsService();
      const originLoc = { lat: origin.lat, lng: origin.lng };
      const destLoc = { lat: destination.lat, lng: destination.lng };
      const intermediateWaypoints = validWaypoints.map(w => ({
        location: { lat: w.lat, lng: w.lng },
        stopover: true
      }));

      directionsService.route(
        {
          origin: originLoc,
          destination: destLoc,
          waypoints: intermediateWaypoints,
          travelMode: google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (!isMounted) return;
          if (status === google.maps.DirectionsStatus.OK && result) {
            const overview = result.routes[0]?.overview_path;
            if (overview && overview.length > 0) {
              const highResPoints = overview.map(pt => ({ lat: pt.lat(), lng: pt.lng() }));
              setDirectionsPath(highResPoints);
              if (onPathUpdated) onPathUpdated(highResPoints);
            }
          }
        }
      );
    } catch {
      // In case of restriction or offline state, validatedBasePath remains active
    }

    return () => {
      isMounted = false;
    };
  }, [map, routesLib, isOriginValid, isDestValid, origin.lat, origin.lng, destination.lat, destination.lng, validWaypoints]);

  // 2. Render dual-layer polyline and fit bounds immediately whenever path or map changes
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    // Use directionsPath when available, otherwise instant validatedBasePath
    const activeCoords = (directionsPath && directionsPath.length >= 2) ? directionsPath : validatedBasePath;
    if (activeCoords.length < 2) {
      if (casingPolylineRef.current) casingPolylineRef.current.setMap(null);
      if (corePolylineRef.current) corePolylineRef.current.setMap(null);
      return;
    }

    // Directional arrow icon along the route
    const arrowSymbol: google.maps.Symbol = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 2.2,
      strokeColor: '#ffffff',
      strokeWeight: 1,
      fillColor: '#0284c7',
      fillOpacity: 1.0
    };

    // Update or create Outer Casing / Glow Line
    if (!casingPolylineRef.current) {
      casingPolylineRef.current = new google.maps.Polyline({
        path: activeCoords,
        strokeColor: '#1e3a8a',
        strokeOpacity: 0.7,
        strokeWeight: 9,
        zIndex: 10,
        map
      });
    } else {
      casingPolylineRef.current.setPath(activeCoords);
      casingPolylineRef.current.setMap(map);
    }

    // Update or create Core Vibrant Line
    if (!corePolylineRef.current) {
      corePolylineRef.current = new google.maps.Polyline({
        path: activeCoords,
        strokeColor: '#0284c7',
        strokeOpacity: 1.0,
        strokeWeight: 5,
        zIndex: 11,
        icons: [{
          icon: arrowSymbol,
          offset: '40px',
          repeat: '140px'
        }],
        map
      });
    } else {
      corePolylineRef.current.setPath(activeCoords);
      corePolylineRef.current.setMap(map);
    }

    // Auto-fit camera bounds to encompass the entire route
    try {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(new google.maps.LatLng(origin.lat, origin.lng));
      bounds.extend(new google.maps.LatLng(destination.lat, destination.lng));
      validWaypoints.forEach(w => bounds.extend(new google.maps.LatLng(w.lat, w.lng)));
      activeCoords.forEach(pt => bounds.extend(new google.maps.LatLng(pt.lat, pt.lng)));
      
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
    } catch {
      // Non-critical bounds calculation fallback
    }

    return () => {
      // Note: we retain polylines during updates to avoid flicker
    };
  }, [map, directionsPath, validatedBasePath, origin.lat, origin.lng, destination.lat, destination.lng, validWaypoints]);

  // Clean up completely on unmount
  useEffect(() => {
    return () => {
      if (casingPolylineRef.current) {
        casingPolylineRef.current.setMap(null);
        casingPolylineRef.current = null;
      }
      if (corePolylineRef.current) {
        corePolylineRef.current.setMap(null);
        corePolylineRef.current = null;
      }
    };
  }, []);

  return null;
}

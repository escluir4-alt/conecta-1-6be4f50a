import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  Navigation, 
  Search, 
  LocateFixed, 
  Landmark, 
  Bus, 
  Plane, 
  Mail, 
  Compass, 
  X, 
  Loader2,
  Check,
  Building2,
  ShoppingBag,
  Globe
} from 'lucide-react';
import { 
  searchPlacesAndPoi, 
  SearchPlaceItem, 
  parseCoordinatesInput,
  PlaceCategory
} from '../../data/placesAndPoiData';
import { RouteWaypoint } from '../../services/tollEngine';

interface SmartLocationSearchInputProps {
  label: string; // e.g. "A", "B", "C"
  badgeColorClass?: string;
  value: string;
  placeholder?: string;
  currentWaypoint?: RouteWaypoint;
  onSelectWaypoint: (waypoint: RouteWaypoint) => void;
  onClear?: () => void;
  showRemoveButton?: boolean;
  onRemove?: () => void;
}

export function SmartLocationSearchInput({
  label,
  badgeColorClass = 'bg-sky-600',
  value,
  placeholder = 'Buscar cidade, prefeitura, shopping, CEP ou coordenadas...',
  currentWaypoint,
  onSelectWaypoint,
  onClear,
  showRemoveButton = false,
  onRemove
}: SmartLocationSearchInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const [googlePredictions, setGooglePredictions] = useState<SearchPlaceItem[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Google Maps Places Autocomplete and Geocoder if Google API is loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      const gMaps = (window as any).google.maps;
      if (gMaps.places && !autocompleteServiceRef.current) {
        autocompleteServiceRef.current = new gMaps.places.AutocompleteService();
      }
      if (!geocoderRef.current) {
        geocoderRef.current = new gMaps.Geocoder();
      }
    }
  }, [isDropdownOpen]);

  // Live Query to Google Places Autocomplete (debounced down to each letter)
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed.length < 1) {
      setGooglePredictions([]);
      return;
    }

    // If it's a coordinate pattern or simple CEP, skip Google Places
    if (parseCoordinatesInput(trimmed) || /^\d{5}-?\d{0,3}$/.test(trimmed)) {
      setGooglePredictions([]);
      return;
    }

    const timer = setTimeout(() => {
      // Check if service is available
      if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
        if (!autocompleteServiceRef.current) {
          autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
        }

        try {
          autocompleteServiceRef.current.getPlacePredictions(
            {
              input: trimmed,
              componentRestrictions: { country: 'br' }
            },
            (predictions: any[] | null, status: string) => {
              if (status === 'OK' && predictions && predictions.length > 0) {
                const mapped: SearchPlaceItem[] = predictions.map((p) => {
                  const mainText = p.structured_formatting?.main_text || p.description;
                  const secText = p.structured_formatting?.secondary_text || '';
                  const lowerMain = mainText.toLowerCase();

                  let category: PlaceCategory = 'google_place';
                  if (lowerMain.includes('prefeitura') || lowerMain.includes('paço municipal')) {
                    category = 'prefeitura';
                  } else if (lowerMain.includes('shopping') || lowerMain.includes('mall')) {
                    category = 'shopping';
                  } else if (p.types?.includes('locality') || p.types?.includes('administrative_area_level_2')) {
                    category = 'city';
                  } else if (p.types?.includes('tourist_attraction') || p.types?.includes('point_of_interest')) {
                    category = 'tourist_spot';
                  }

                  return {
                    id: p.place_id,
                    name: mainText,
                    subtitle: secText || p.description,
                    city: secText.split(',')[0]?.trim() || '',
                    state: 'BR',
                    lat: 0,
                    lng: 0,
                    category,
                    address: p.description
                  };
                });
                setGooglePredictions(mapped.slice(0, 6));
              } else {
                setGooglePredictions([]);
              }
            }
          );
        } catch {
          setGooglePredictions([]);
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Compute live local search suggestions (instant, down to every letter)
  const localSuggestions = useMemo(() => searchPlacesAndPoi(inputValue), [inputValue]);

  // Merged and deduplicated suggestions (Local Instant + Google Places)
  const suggestions = useMemo(() => {
    const combined: SearchPlaceItem[] = [...localSuggestions];
    for (const gp of googlePredictions) {
      if (!combined.some(c => c.name.toLowerCase() === gp.name.toLowerCase())) {
        combined.push(gp);
      }
    }
    return combined.slice(0, 10);
  }, [localSuggestions, googlePredictions]);

  // Action: Use My Current Location (GPS)
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newWaypoint: RouteWaypoint = {
          id: `my_loc_${Date.now()}`,
          label,
          name: `Meu Local (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          lat: latitude,
          lng: longitude,
          isCustom: true
        };
        setInputValue(newWaypoint.name);
        onSelectWaypoint(newWaypoint);
        setIsLocating(false);
        setIsDropdownOpen(false);
      },
      () => {
        setIsLocating(false);
        const fallbackWaypoint: RouteWaypoint = {
          id: `fallback_${Date.now()}`,
          label,
          name: `Meu Local Estimado (São Paulo, SP)`,
          lat: -23.5505,
          lng: -46.6333,
          isCustom: true
        };
        setInputValue(fallbackWaypoint.name);
        onSelectWaypoint(fallbackWaypoint);
        setIsDropdownOpen(false);
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  };

  // Select a suggestion item
  const handleSelectSuggestion = (item: SearchPlaceItem) => {
    // If it's a Google Place that needs coordinate resolution
    if (item.category === 'google_place' || (item.lat === 0 && item.lng === 0)) {
      setIsResolvingPlace(true);
      if (typeof window !== 'undefined' && (window as any).google?.maps) {
        if (!geocoderRef.current) {
          geocoderRef.current = new (window as any).google.maps.Geocoder();
        }

        geocoderRef.current.geocode(
          { placeId: item.id },
          (results: any[] | null, status: string) => {
            setIsResolvingPlace(false);
            if (status === 'OK' && results?.[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
              const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
              const newWaypoint: RouteWaypoint = {
                id: item.id,
                label,
                name: item.name,
                lat,
                lng,
                isCustom: true
              };
              setInputValue(item.name);
              onSelectWaypoint(newWaypoint);
              setIsDropdownOpen(false);
            } else {
              // Fallback
              const newWaypoint: RouteWaypoint = {
                id: item.id,
                label,
                name: item.name,
                lat: -23.5505,
                lng: -46.6333,
                isCustom: true
              };
              setInputValue(item.name);
              onSelectWaypoint(newWaypoint);
              setIsDropdownOpen(false);
            }
          }
        );
        return;
      }
    }

    // Direct local item with known coordinates
    const newWaypoint: RouteWaypoint = {
      id: item.id,
      label,
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      isCustom: item.category === 'coordinates' || item.category === 'cep' || item.category === 'prefeitura' || item.category === 'shopping'
    };
    setInputValue(item.name);
    onSelectWaypoint(newWaypoint);
    setIsDropdownOpen(false);
  };

  // Helper icon for category
  const renderCategoryIcon = (category: PlaceCategory) => {
    switch (category) {
      case 'prefeitura':
        return <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
      case 'shopping':
        return <ShoppingBag className="w-3.5 h-3.5 text-fuchsia-600 shrink-0" />;
      case 'small_city':
        return <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      case 'tourist_spot':
        return <Landmark className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'bus_terminal':
        return <Bus className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      case 'airport':
        return <Plane className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
      case 'cep':
        return <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      case 'coordinates':
        return <Compass className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
      case 'my_location':
        return <LocateFixed className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
      case 'google_place':
        return <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  // Helper badge for category
  const renderCategoryBadge = (category: PlaceCategory) => {
    switch (category) {
      case 'prefeitura':
        return <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded">Prefeitura</span>;
      case 'shopping':
        return <span className="text-[10px] bg-fuchsia-100 text-fuchsia-800 font-bold px-1.5 py-0.5 rounded">Shopping</span>;
      case 'small_city':
        return <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Município</span>;
      case 'tourist_spot':
        return <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">Ponto Turístico</span>;
      case 'bus_terminal':
        return <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">Rodoviária</span>;
      case 'airport':
        return <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded">Aeroporto</span>;
      case 'cep':
        return <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">CEP</span>;
      case 'coordinates':
        return <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">Coordenadas GPS</span>;
      case 'google_place':
        return <span className="text-[10px] bg-blue-50 text-blue-700 font-medium px-1.5 py-0.5 rounded">Google Maps</span>;
      default:
        return <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded">Cidade</span>;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2">
        {/* Label Badge: A, B, C... */}
        <span className={`w-6 h-6 rounded-full ${badgeColorClass} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs`}>
          {label}
        </span>

        {/* Search Input Box */}
        <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsDropdownOpen(true);
            }}
            placeholder={placeholder}
            className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl pl-3 pr-14 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden transition-all shadow-xs"
          />

          {/* Quick Clear or Action Icons */}
          <div className="absolute right-2 flex items-center gap-1">
            {isResolvingPlace && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
            )}

            {inputValue && !isResolvingPlace && (
              <button
                type="button"
                onClick={() => {
                  setInputValue('');
                  if (onClear) onClear();
                  inputRef.current?.focus();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                title="Limpar campo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick GPS Geolocation Button */}
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="p-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
              title="Usar minha localização atual (GPS)"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Optional Remove Button for intermediate stops */}
        {showRemoveButton && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer"
            title="Remover esta parada"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isDropdownOpen && (
        <div className="absolute top-full left-8 right-0 mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1">
          
          {/* Quick Option: Use My Location */}
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="w-full px-3.5 py-2.5 text-left hover:bg-sky-50/80 transition-colors flex items-center justify-between gap-2 border-b border-slate-100 group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <Navigation className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
              </div>
              <div>
                <span className="text-xs font-bold text-sky-950 block">
                  Usar minha localização atual
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Detectar via GPS do dispositivo
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-sky-100 text-sky-800 font-extrabold px-1.5 py-0.5 rounded">
              GPS
            </span>
          </button>

          {/* Suggestions List */}
          {suggestions.length > 0 ? (
            suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full px-3.5 py-2.5 text-left hover:bg-orange-50/70 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                    {renderCategoryIcon(item.category)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-orange-950">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {renderCategoryBadge(item.category)}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-center text-xs text-slate-400">
              Digite o nome de uma cidade, prefeitura, shopping, CEP ou coordenadas...
            </div>
          )}

          {locationError && (
            <div className="p-2 text-[11px] text-rose-600 bg-rose-50 border-t border-rose-100 text-center font-medium">
              {locationError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type TransportType = 'all' | 'flight' | 'bus' | 'car';
export type TripType = 'round_trip' | 'one_way';

export type TravelClass = 
  | 'economy'
  | 'premium'
  | 'executive'
  | 'bus_conventional'
  | 'bus_semi_sleeper'
  | 'bus_sleeper'
  | 'bus_bed';

export interface Location {
  id: string;
  name: string;
  city: string;
  state: string;
  code: string; // IATA (e.g. GRU) or Terminal Code (e.g. TIETE)
  type: 'airport' | 'bus_station' | 'city_all';
  country: string;
  coordinates?: { lat: number; lng: number };
}

export interface Company {
  id: string;
  name: string;
  type: 'flight' | 'bus';
  logoText: string;
  code: string;
  rating: number; // e.g. 4.7
  color: string;
}

export interface TicketInstallment {
  count: number;
  value: number;
  interestFree: boolean;
}

export type PaymentMode = 'money' | 'miles' | 'points_cash';

export type LoyaltyProgramId = 
  | 'latam_pass' 
  | 'smiles' 
  | 'azul_fidelidade' 
  | 'livelo' 
  | 'esfera' 
  | 'buser_pontos' 
  | 'clickbus_rewards' 
  | 'superapp_points';

export interface MilesOption {
  program: LoyaltyProgramId;
  programName: string; // e.g. "LATAM Pass", "Smiles", "Azul Fidelidade", "Livelo", "Pontos SuperApp", "ClickBus Rewards"
  programType: 'airline' | 'bank' | 'bus' | 'superapp';
  points: number; // e.g. 11500
  taxBRL: number; // e.g. 38.50 (taxa de embarque)
  cpmValueBRL: number; // Custo estimado por milheiro equivalente em R$
  isGoodDeal: boolean; // Se o valor do milheiro compensa a emissão
  badgeLabel?: string; // e.g. "Excelente Resgate" ou "Milhas Promocionais"
  cashOption?: {
    cashAmount: number; // e.g. R$ 85,00
    reducedPoints: number; // e.g. 5.500 pontos + R$ 85,00
  };
}

export interface Ticket {
  id: string;
  type: 'flight' | 'bus';
  company: Company;
  departure: {
    location: Location;
    dateTime: string; // ISO string
    terminal?: string;
  };
  arrival: {
    location: Location;
    dateTime: string; // ISO string
    terminal?: string;
  };
  durationMinutes: number;
  stops: number;
  stopDetails?: string[];
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  installments: TicketInstallment;
  seatClass: string;
  baggage: {
    carryOn: boolean;
    checked: boolean;
    details: string;
  };
  amenities: string[];
  seatsAvailable: number;
  tags?: ('cheapest' | 'fastest' | 'recommended' | 'flash_deal')[];
  partnerName: string;
  flightOrBusNumber: string;
  // Loyalty, Miles & Points
  milesOption: MilesOption;
  alternativeMilesOptions?: MilesOption[];
  verifiedSource?: {
    providerName: string;
    reliability: string;
    syncMinutesAgo: number;
    officialTicketType: string;
  };
  offerEmissionUrl: string;
  isInternational?: boolean;
}

export interface SearchQuery {
  origin: Location;
  destination: Location;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;    // YYYY-MM-DD
  tripType: TripType;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  transportType: TransportType;
  travelClass: TravelClass | string;
}

export interface SearchFilters {
  transportType: TransportType;
  minPrice: number;
  maxPrice: number;
  stops: 'all' | 'direct' | 'with_stops';
  companies: string[];
  timeOfDay: ('dawn' | 'morning' | 'afternoon' | 'night')[];
  baggageIncluded: boolean;
  sortBy: 'cheapest' | 'fastest' | 'recommended';
  // Miles and Rewards filters
  paymentMode: PaymentMode;
  milesPrograms: string[];
  maxMiles?: number;
  onlyGoodDeals?: boolean;
}

export interface DailyPriceTrend {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // Seg, Ter, Qua...
  dayNumber: number;
  lowestFlightPrice?: number;
  lowestBusPrice?: number;
  overallLowest: number;
  isCurrentSearchDate: boolean;
}

export interface ViagensModuleProps {
  initialOrigin?: Location;
  initialDestination?: Location;
  defaultTransport?: TransportType;
  onBookTicket?: (ticket: Ticket, bookingDetails: any) => void;
  onShareDeal?: (ticket: Ticket) => void;
  embedMode?: 'full' | 'compact' | 'widget';
  className?: string;
  themeColor?: 'sky' | 'emerald' | 'indigo' | 'slate';
  hostAppInfo?: {
    appName: string;
    userName?: string;
    userBalance?: number;
    accountNumber?: string;
    userPoints?: number;
    loyaltyPrograms?: { id: string; name: string; balance: number }[];
  };
  onOpenCarPlatform?: () => void;
}

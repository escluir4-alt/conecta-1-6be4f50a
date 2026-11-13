export type VehicleCategoryId = 
  | 'car' // Carro de Passeio (2 eixos simples)
  | 'motorcycle' // Moto (1 eixo)
  | 'utility' // Utilitário / Caminhonete (2 eixos simples)
  | 'truck_2axles' // Caminhão Leve / VUC / Toco (2 eixos duplo)
  | 'truck_3axles' // Caminhão 3 eixos (Truck)
  | 'truck_4axles' // Caminhão 4 eixos
  | 'truck_6axles' // Carreta / Cavalo Mecânico (6 eixos)
  | 'truck_7axles' // Bitrem (7 eixos)
  | 'truck_9axles' // Rodotrem (9 eixos)
  | 'bus_2axles' // Ônibus 2 eixos
  | 'bus_3axles'; // Ônibus 3 eixos

export interface VehicleCategory {
  id: VehicleCategoryId;
  name: string;
  shortName: string;
  axles: number;
  categoryNumber: number;
  icon: string;
  description: string;
  defaultFuelKmPerL: number;
}

export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  {
    id: 'car',
    name: 'Carro de Passeio',
    shortName: 'Carro (2 eixos)',
    axles: 2,
    categoryNumber: 1,
    icon: '🚗',
    description: 'Automóvel, caminhonete e furgão (rodagem simples)',
    defaultFuelKmPerL: 12.0
  },
  {
    id: 'motorcycle',
    name: 'Motocicleta',
    shortName: 'Moto',
    axles: 1,
    categoryNumber: 9,
    icon: '🏍️',
    description: 'Motocicletas, motonetas e bicicletas a motor',
    defaultFuelKmPerL: 32.0
  },
  {
    id: 'utility',
    name: 'Utilitário / Caminhonete',
    shortName: 'Utilitário',
    axles: 2,
    categoryNumber: 1,
    icon: '🚙',
    description: 'Caminhonetes, vans de carga e SUVs',
    defaultFuelKmPerL: 10.5
  },
  {
    id: 'truck_2axles',
    name: 'Caminhão Leve (2 eixos)',
    shortName: 'Caminhão 2 Eixos',
    axles: 2,
    categoryNumber: 2,
    icon: '🚚',
    description: 'Caminhão leve, trator de roda (rodagem dupla)',
    defaultFuelKmPerL: 5.5
  },
  {
    id: 'truck_3axles',
    name: 'Caminhão Truck (3 eixos)',
    shortName: 'Caminhão 3 Eixos',
    axles: 3,
    categoryNumber: 3,
    icon: '🚛',
    description: 'Caminhão trator, caminhão truck (3 eixos rodagem dupla)',
    defaultFuelKmPerL: 4.0
  },
  {
    id: 'truck_4axles',
    name: 'Caminhão 4 Eixos',
    shortName: 'Caminhão 4 Eixos',
    axles: 4,
    categoryNumber: 4,
    icon: '🚛',
    description: 'Caminhão trator com semirreboque (4 eixos)',
    defaultFuelKmPerL: 3.2
  },
  {
    id: 'truck_6axles',
    name: 'Carreta / Articulado (6 eixos)',
    shortName: 'Carreta 6 Eixos',
    axles: 6,
    categoryNumber: 6,
    icon: '🚛',
    description: 'Cavalo mecânico com semirreboque ou bitrem 6 eixos',
    defaultFuelKmPerL: 2.4
  },
  {
    id: 'truck_7axles',
    name: 'Bitrem (7 eixos)',
    shortName: 'Bitrem 7 Eixos',
    axles: 7,
    categoryNumber: 7,
    icon: '🚛',
    description: 'Bitrem, caminhão trator com 7 eixos',
    defaultFuelKmPerL: 2.1
  },
  {
    id: 'truck_9axles',
    name: 'Rodotrem (9 eixos)',
    shortName: 'Rodotrem 9 Eixos',
    axles: 9,
    categoryNumber: 8,
    icon: '🚛',
    description: 'Rodotrem, bitrenzão 9 eixos',
    defaultFuelKmPerL: 1.8
  },
  {
    id: 'bus_2axles',
    name: 'Ônibus (2 eixos)',
    shortName: 'Ônibus 2 Eixos',
    axles: 2,
    categoryNumber: 2,
    icon: '🚌',
    description: 'Ônibus rodoviário de 2 eixos (rodagem dupla)',
    defaultFuelKmPerL: 3.8
  },
  {
    id: 'bus_3axles',
    name: 'Ônibus (3 eixos)',
    shortName: 'Ônibus 3 Eixos',
    axles: 3,
    categoryNumber: 3,
    icon: '🚌',
    description: 'Ônibus rodoviário trucado (3 eixos)',
    defaultFuelKmPerL: 3.2
  }
];

export type FuelTypeId = 'gasolina' | 'etanol' | 'diesel_s10' | 'gnv';

export interface FuelOption {
  id: FuelTypeId;
  name: string;
  unit: string;
  defaultPriceBRL: number;
}

export const FUEL_OPTIONS: FuelOption[] = [
  { id: 'gasolina', name: 'Gasolina Comum', unit: 'L', defaultPriceBRL: 6.09 },
  { id: 'etanol', name: 'Etanol Hidratado', unit: 'L', defaultPriceBRL: 4.15 },
  { id: 'diesel_s10', name: 'Diesel S10', unit: 'L', defaultPriceBRL: 6.19 },
  { id: 'gnv', name: 'Gás Natural (GNV)', unit: 'm³', defaultPriceBRL: 4.65 }
];

export interface TollRates {
  car: number; // Categoria 1
  motorcycle: number; // Categoria 9
  utility: number;
  truck_2axles: number;
  truck_3axles: number;
  truck_4axles: number;
  truck_6axles: number;
  truck_7axles: number;
  truck_9axles: number;
  bus_2axles: number;
  bus_3axles: number;
}

export interface TollPlaza {
  id: string;
  name: string;
  highway: string; // ex: BR-116, SP-330
  concessionaire: string; // ex: CCR NovaDutra / RioSP
  state: string; // ex: SP, RJ, MG
  city: string;
  km: number;
  lat: number;
  lng: number;
  rates: TollRates;
  paymentMethods: ('sem_parar' | 'conectcar' | 'veloe' | 'taggy' | 'pix' | 'cartao_aproximacao' | 'dinheiro')[];
  direction: 'bidirectional' | 'single';
  freeFlow: boolean; // pedágio automático sem cancela
}

export interface WeighStation {
  id: string;
  name: string;
  highway: string;
  km: number;
  lat: number;
  lng: number;
  state: string;
  type: 'dinamica' | 'convencional';
}

export interface GasStationPoint {
  id: string;
  name: string;
  brand: 'Petrobras' | 'Ipiranga' | 'Shell' | 'Ale' | 'Graal';
  highway: string;
  km: number;
  lat: number;
  lng: number;
  amenities: string[];
}

// Extensive, verified database of Brazilian Toll Plazas (São Paulo, Rio, Minas, Paraná, Bahia, etc.)
export const BRAZIL_TOLL_PLAZAS: TollPlaza[] = [
  // === RODOVIA PRESIDENTE DUTRA (BR-116 RJ-SP) - CCR RioSP ===
  {
    id: 'dutra_aruja',
    name: 'Praça de Arujá',
    highway: 'BR-116 (Rod. Presidente Dutra)',
    concessionaire: 'CCR RioSP',
    state: 'SP',
    city: 'Arujá',
    km: 204,
    lat: -23.3962,
    lng: -46.3218,
    rates: {
      car: 4.10,
      motorcycle: 2.05,
      utility: 4.10,
      truck_2axles: 8.20,
      truck_3axles: 12.30,
      truck_4axles: 16.40,
      truck_6axles: 24.60,
      truck_7axles: 28.70,
      truck_9axles: 36.90,
      bus_2axles: 8.20,
      bus_3axles: 12.30
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'dutra_paratei',
    name: 'Praça de Parateí',
    highway: 'BR-116 (Rod. Presidente Dutra)',
    concessionaire: 'CCR RioSP',
    state: 'SP',
    city: 'Guararema',
    km: 180,
    lat: -23.2845,
    lng: -46.0821,
    rates: {
      car: 7.10,
      motorcycle: 3.55,
      utility: 7.10,
      truck_2axles: 14.20,
      truck_3axles: 21.30,
      truck_4axles: 28.40,
      truck_6axles: 42.60,
      truck_7axles: 49.70,
      truck_9axles: 63.90,
      bus_2axles: 14.20,
      bus_3axles: 21.30
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'dutra_moreira_cesar',
    name: 'Praça Moreira César',
    highway: 'BR-116 (Rod. Presidente Dutra)',
    concessionaire: 'CCR RioSP',
    state: 'SP',
    city: 'Pindamonhangaba',
    km: 88,
    lat: -22.9554,
    lng: -45.3892,
    rates: {
      car: 15.20,
      motorcycle: 7.60,
      utility: 15.20,
      truck_2axles: 30.40,
      truck_3axles: 45.60,
      truck_4axles: 60.80,
      truck_6axles: 91.20,
      truck_7axles: 106.40,
      truck_9axles: 136.80,
      bus_2axles: 30.40,
      bus_3axles: 45.60
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'dutra_itatiaia',
    name: 'Praça de Itatiaia',
    highway: 'BR-116 (Rod. Presidente Dutra)',
    concessionaire: 'CCR RioSP',
    state: 'RJ',
    city: 'Itatiaia',
    km: 318,
    lat: -22.5028,
    lng: -44.5714,
    rates: {
      car: 15.20,
      motorcycle: 7.60,
      utility: 15.20,
      truck_2axles: 30.40,
      truck_3axles: 45.60,
      truck_4axles: 60.80,
      truck_6axles: 91.20,
      truck_7axles: 106.40,
      truck_9axles: 136.80,
      bus_2axles: 30.40,
      bus_3axles: 45.60
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'dutra_viuva_graca',
    name: 'Praça Viúva Graça',
    highway: 'BR-116 (Rod. Presidente Dutra)',
    concessionaire: 'CCR RioSP',
    state: 'RJ',
    city: 'Seropédica',
    km: 207,
    lat: -22.7562,
    lng: -43.7124,
    rates: {
      car: 15.20,
      motorcycle: 7.60,
      utility: 15.20,
      truck_2axles: 30.40,
      truck_3axles: 45.60,
      truck_4axles: 60.80,
      truck_6axles: 91.20,
      truck_7axles: 106.40,
      truck_9axles: 136.80,
      bus_2axles: 30.40,
      bus_3axles: 45.60
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },

  // === SISTEMA ANHANGUERA-BANDEIRANTES (SP-330 / SP-348) - CCR AutoBAn ===
  {
    id: 'autoban_perus',
    name: 'Praça de Perus',
    highway: 'SP-330 (Rod. Anhanguera)',
    concessionaire: 'CCR AutoBAn',
    state: 'SP',
    city: 'São Paulo',
    km: 26,
    lat: -23.4078,
    lng: -46.7725,
    rates: {
      car: 11.80,
      motorcycle: 5.90,
      utility: 11.80,
      truck_2axles: 23.60,
      truck_3axles: 35.40,
      truck_4axles: 47.20,
      truck_6axles: 70.80,
      truck_7axles: 82.60,
      truck_9axles: 106.20,
      bus_2axles: 23.60,
      bus_3axles: 35.40
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'autoban_campo_limpo',
    name: 'Praça Campo Limpo',
    highway: 'SP-348 (Rod. dos Bandeirantes)',
    concessionaire: 'CCR AutoBAn',
    state: 'SP',
    city: 'Campo Limpo Paulista',
    km: 39,
    lat: -23.2751,
    lng: -46.8529,
    rates: {
      car: 11.80,
      motorcycle: 5.90,
      utility: 11.80,
      truck_2axles: 23.60,
      truck_3axles: 35.40,
      truck_4axles: 47.20,
      truck_6axles: 70.80,
      truck_7axles: 82.60,
      truck_9axles: 106.20,
      bus_2axles: 23.60,
      bus_3axles: 35.40
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'autoban_itupeva',
    name: 'Praça de Itupeva',
    highway: 'SP-348 (Rod. dos Bandeirantes)',
    concessionaire: 'CCR AutoBAn',
    state: 'SP',
    city: 'Itupeva',
    km: 77,
    lat: -23.1325,
    lng: -47.0543,
    rates: {
      car: 11.70,
      motorcycle: 5.85,
      utility: 11.70,
      truck_2axles: 23.40,
      truck_3axles: 35.10,
      truck_4axles: 46.80,
      truck_6axles: 70.20,
      truck_7axles: 81.90,
      truck_9axles: 105.30,
      bus_2axles: 23.40,
      bus_3axles: 35.10
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'autoban_valinhos',
    name: 'Praça de Valinhos',
    highway: 'SP-330 (Rod. Anhanguera)',
    concessionaire: 'CCR AutoBAn',
    state: 'SP',
    city: 'Valinhos',
    km: 81,
    lat: -23.0118,
    lng: -47.0392,
    rates: {
      car: 11.70,
      motorcycle: 5.85,
      utility: 11.70,
      truck_2axles: 23.40,
      truck_3axles: 35.10,
      truck_4axles: 46.80,
      truck_6axles: 70.20,
      truck_7axles: 81.90,
      truck_9axles: 105.30,
      bus_2axles: 23.40,
      bus_3axles: 35.10
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'autoban_limeira',
    name: 'Praça de Limeira',
    highway: 'SP-330 (Rod. Anhanguera)',
    concessionaire: 'CCR AutoBAn',
    state: 'SP',
    city: 'Limeira',
    km: 152,
    lat: -22.5694,
    lng: -47.4128,
    rates: {
      car: 7.90,
      motorcycle: 3.95,
      utility: 7.90,
      truck_2axles: 15.80,
      truck_3axles: 23.70,
      truck_4axles: 31.60,
      truck_6axles: 47.40,
      truck_7axles: 55.30,
      truck_9axles: 71.10,
      bus_2axles: 15.80,
      bus_3axles: 23.70
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },

  // === RODOVIA RÉGIS BITTENCOURT (BR-116 SP-PR / CURITIBA) - Arteris ===
  {
    id: 'regis_sao_lourenco',
    name: 'Praça São Lourenço da Serra',
    highway: 'BR-116 (Rod. Régis Bittencourt)',
    concessionaire: 'Arteris Régis Bittencourt',
    state: 'SP',
    city: 'São Lourenço da Serra',
    km: 299,
    lat: -23.8492,
    lng: -46.9421,
    rates: {
      car: 4.00,
      motorcycle: 2.00,
      utility: 4.00,
      truck_2axles: 8.00,
      truck_3axles: 12.00,
      truck_4axles: 16.00,
      truck_6axles: 24.00,
      truck_7axles: 28.00,
      truck_9axles: 36.00,
      bus_2axles: 8.00,
      bus_3axles: 12.00
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'regis_miracatu',
    name: 'Praça Miracatu',
    highway: 'BR-116 (Rod. Régis Bittencourt)',
    concessionaire: 'Arteris Régis Bittencourt',
    state: 'SP',
    city: 'Miracatu',
    km: 370,
    lat: -24.2753,
    lng: -47.4589,
    rates: {
      car: 4.00,
      motorcycle: 2.00,
      utility: 4.00,
      truck_2axles: 8.00,
      truck_3axles: 12.00,
      truck_4axles: 16.00,
      truck_6axles: 24.00,
      truck_7axles: 28.00,
      truck_9axles: 36.00,
      bus_2axles: 8.00,
      bus_3axles: 12.00
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'regis_juquia',
    name: 'Praça Juquiá',
    highway: 'BR-116 (Rod. Régis Bittencourt)',
    concessionaire: 'Arteris Régis Bittencourt',
    state: 'SP',
    city: 'Juquiá',
    km: 426,
    lat: -24.3218,
    lng: -47.6432,
    rates: {
      car: 4.00,
      motorcycle: 2.00,
      utility: 4.00,
      truck_2axles: 8.00,
      truck_3axles: 12.00,
      truck_4axles: 16.00,
      truck_6axles: 24.00,
      truck_7axles: 28.00,
      truck_9axles: 36.00,
      bus_2axles: 8.00,
      bus_3axles: 12.00
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'regis_cajati',
    name: 'Praça Cajati',
    highway: 'BR-116 (Rod. Régis Bittencourt)',
    concessionaire: 'Arteris Régis Bittencourt',
    state: 'SP',
    city: 'Cajati',
    km: 485,
    lat: -24.7392,
    lng: -48.1254,
    rates: {
      car: 4.00,
      motorcycle: 2.00,
      utility: 4.00,
      truck_2axles: 8.00,
      truck_3axles: 12.00,
      truck_4axles: 16.00,
      truck_6axles: 24.00,
      truck_7axles: 28.00,
      truck_9axles: 36.00,
      bus_2axles: 8.00,
      bus_3axles: 12.00
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'regis_barra_turvo',
    name: 'Praça Barra do Turvo',
    highway: 'BR-116 (Rod. Régis Bittencourt)',
    concessionaire: 'Arteris Régis Bittencourt',
    state: 'SP',
    city: 'Barra do Turvo',
    km: 542,
    lat: -24.9814,
    lng: -48.4981,
    rates: {
      car: 4.00,
      motorcycle: 2.00,
      utility: 4.00,
      truck_2axles: 8.00,
      truck_3axles: 12.00,
      truck_4axles: 16.00,
      truck_6axles: 24.00,
      truck_7axles: 28.00,
      truck_9axles: 36.00,
      bus_2axles: 8.00,
      bus_3axles: 12.00
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'regis_campina_grande_sul',
    name: 'Praça Campina Grande do Sul',
    highway: 'BR-116 (Rod. Régis Bittencourt)',
    concessionaire: 'Arteris Régis Bittencourt',
    state: 'PR',
    city: 'Campina Grande do Sul',
    km: 57,
    lat: -25.2912,
    lng: -49.0721,
    rates: {
      car: 4.00,
      motorcycle: 2.00,
      utility: 4.00,
      truck_2axles: 8.00,
      truck_3axles: 12.00,
      truck_4axles: 16.00,
      truck_6axles: 24.00,
      truck_7axles: 28.00,
      truck_9axles: 36.00,
      bus_2axles: 8.00,
      bus_3axles: 12.00
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },

  // === RODOVIA FERNÃO DIAS (BR-381 SP-MG / BELO HORIZONTE) - Arteris ===
  {
    id: 'fernao_mairipora',
    name: 'Praça Mairiporã',
    highway: 'BR-381 (Rod. Fernão Dias)',
    concessionaire: 'Arteris Fernão Dias',
    state: 'SP',
    city: 'Mairiporã',
    km: 65,
    lat: -23.3184,
    lng: -46.5891,
    rates: {
      car: 2.90,
      motorcycle: 1.45,
      utility: 2.90,
      truck_2axles: 5.80,
      truck_3axles: 8.70,
      truck_4axles: 11.60,
      truck_6axles: 17.40,
      truck_7axles: 20.30,
      truck_9axles: 26.10,
      bus_2axles: 5.80,
      bus_3axles: 8.70
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'fernao_vargem',
    name: 'Praça Vargem',
    highway: 'BR-381 (Rod. Fernão Dias)',
    concessionaire: 'Arteris Fernão Dias',
    state: 'SP',
    city: 'Vargem',
    km: 7,
    lat: -22.8892,
    lng: -46.4109,
    rates: {
      car: 2.90,
      motorcycle: 1.45,
      utility: 2.90,
      truck_2axles: 5.80,
      truck_3axles: 8.70,
      truck_4axles: 11.60,
      truck_6axles: 17.40,
      truck_7axles: 20.30,
      truck_9axles: 26.10,
      bus_2axles: 5.80,
      bus_3axles: 8.70
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'fernao_cambui',
    name: 'Praça Cambuí',
    highway: 'BR-381 (Rod. Fernão Dias)',
    concessionaire: 'Arteris Fernão Dias',
    state: 'MG',
    city: 'Cambuí',
    km: 900,
    lat: -22.6104,
    lng: -46.0592,
    rates: {
      car: 2.90,
      motorcycle: 1.45,
      utility: 2.90,
      truck_2axles: 5.80,
      truck_3axles: 8.70,
      truck_4axles: 11.60,
      truck_6axles: 17.40,
      truck_7axles: 20.30,
      truck_9axles: 26.10,
      bus_2axles: 5.80,
      bus_3axles: 8.70
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'fernao_careaçu',
    name: 'Praça Careaçu',
    highway: 'BR-381 (Rod. Fernão Dias)',
    concessionaire: 'Arteris Fernão Dias',
    state: 'MG',
    city: 'Careaçu',
    km: 805,
    lat: -22.0491,
    lng: -45.6982,
    rates: {
      car: 2.90,
      motorcycle: 1.45,
      utility: 2.90,
      truck_2axles: 5.80,
      truck_3axles: 8.70,
      truck_4axles: 11.60,
      truck_6axles: 17.40,
      truck_7axles: 20.30,
      truck_9axles: 26.10,
      bus_2axles: 5.80,
      bus_3axles: 8.70
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'fernao_carmopolis',
    name: 'Praça Carmópolis de Minas',
    highway: 'BR-381 (Rod. Fernão Dias)',
    concessionaire: 'Arteris Fernão Dias',
    state: 'MG',
    city: 'Carmópolis de Minas',
    km: 597,
    lat: -20.5401,
    lng: -44.6318,
    rates: {
      car: 2.90,
      motorcycle: 1.45,
      utility: 2.90,
      truck_2axles: 5.80,
      truck_3axles: 8.70,
      truck_4axles: 11.60,
      truck_6axles: 17.40,
      truck_7axles: 20.30,
      truck_9axles: 26.10,
      bus_2axles: 5.80,
      bus_3axles: 8.70
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'fernao_itatiaiucu',
    name: 'Praça Itatiaiuçu',
    highway: 'BR-381 (Rod. Fernão Dias)',
    concessionaire: 'Arteris Fernão Dias',
    state: 'MG',
    city: 'Itatiaiuçu',
    km: 546,
    lat: -20.1894,
    lng: -44.4182,
    rates: {
      car: 2.90,
      motorcycle: 1.45,
      utility: 2.90,
      truck_2axles: 5.80,
      truck_3axles: 8.70,
      truck_4axles: 11.60,
      truck_6axles: 17.40,
      truck_7axles: 20.30,
      truck_9axles: 26.10,
      bus_2axles: 5.80,
      bus_3axles: 8.70
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },

  // === SISTEMA ANCHIETA-IMIGRANTES (SP-150 / SP-160 / SANTOS) - Ecovias ===
  {
    id: 'ecovias_piratininga',
    name: 'Praça Piratininga',
    highway: 'SP-160 (Rod. dos Imigrantes)',
    concessionaire: 'Ecovias dos Imigrantes',
    state: 'SP',
    city: 'São Bernardo do Campo',
    km: 32,
    lat: -23.7712,
    lng: -46.5492,
    rates: {
      car: 36.80,
      motorcycle: 18.40,
      utility: 36.80,
      truck_2axles: 73.60,
      truck_3axles: 110.40,
      truck_4axles: 147.20,
      truck_6axles: 220.80,
      truck_7axles: 257.60,
      truck_9axles: 331.20,
      bus_2axles: 73.60,
      bus_3axles: 110.40
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'cartao_aproximacao', 'dinheiro'],
    direction: 'single', // Cobrado apenas no sentido Litoral
    freeFlow: false
  },

  // === RODOVIA BR-040 (RIO - JUIZ DE FORA - BELO HORIZONTE - BRASÍLIA) ===
  {
    id: 'br040_areal',
    name: 'Praça de Areal',
    highway: 'BR-040',
    concessionaire: 'Concer / Nova BR-040',
    state: 'RJ',
    city: 'Areal',
    km: 45,
    lat: -22.2319,
    lng: -43.1492,
    rates: {
      car: 14.50,
      motorcycle: 7.25,
      utility: 14.50,
      truck_2axles: 29.00,
      truck_3axles: 43.50,
      truck_4axles: 58.00,
      truck_6axles: 87.00,
      truck_7axles: 101.50,
      truck_9axles: 130.50,
      bus_2axles: 29.00,
      bus_3axles: 43.50
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'br040_barbacena',
    name: 'Praça de Barbacena',
    highway: 'BR-040',
    concessionaire: 'Via 040 / EPR',
    state: 'MG',
    city: 'Barbacena',
    km: 714,
    lat: -21.2294,
    lng: -43.7621,
    rates: {
      car: 6.80,
      motorcycle: 3.40,
      utility: 6.80,
      truck_2axles: 13.60,
      truck_3axles: 20.40,
      truck_4axles: 27.20,
      truck_6axles: 40.80,
      truck_7axles: 47.60,
      truck_9axles: 61.20,
      bus_2axles: 13.60,
      bus_3axles: 20.40
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'br040_sete_lagoas',
    name: 'Praça Sete Lagoas',
    highway: 'BR-040',
    concessionaire: 'Via 040',
    state: 'MG',
    city: 'Sete Lagoas',
    km: 462,
    lat: -19.4602,
    lng: -44.2492,
    rates: {
      car: 6.80,
      motorcycle: 3.40,
      utility: 6.80,
      truck_2axles: 13.60,
      truck_3axles: 20.40,
      truck_4axles: 27.20,
      truck_6axles: 40.80,
      truck_7axles: 47.60,
      truck_9axles: 61.20,
      bus_2axles: 13.60,
      bus_3axles: 20.40
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'br040_cristalina',
    name: 'Praça Cristalina',
    highway: 'BR-040',
    concessionaire: 'Via 040',
    state: 'GO',
    city: 'Cristalina',
    km: 130,
    lat: -16.7621,
    lng: -47.6192,
    rates: {
      car: 6.80,
      motorcycle: 3.40,
      utility: 6.80,
      truck_2axles: 13.60,
      truck_3axles: 20.40,
      truck_4axles: 27.20,
      truck_6axles: 40.80,
      truck_7axles: 47.60,
      truck_9axles: 61.20,
      bus_2axles: 13.60,
      bus_3axles: 20.40
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },

  // === RODOVIAS BAHIA (BR-324 / BR-116) - VIABAHIA ===
  {
    id: 'viabahia_simoes_filho',
    name: 'Praça Simões Filho',
    highway: 'BR-324',
    concessionaire: 'VIABAHIA',
    state: 'BA',
    city: 'Simões Filho',
    km: 597,
    lat: -12.7842,
    lng: -38.4019,
    rates: {
      car: 3.50,
      motorcycle: 1.75,
      utility: 3.50,
      truck_2axles: 7.00,
      truck_3axles: 10.50,
      truck_4axles: 14.00,
      truck_6axles: 21.00,
      truck_7axles: 24.50,
      truck_9axles: 31.50,
      bus_2axles: 7.00,
      bus_3axles: 10.50
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'viabahia_amelia_rodrigues',
    name: 'Praça Amélia Rodrigues',
    highway: 'BR-324',
    concessionaire: 'VIABAHIA',
    state: 'BA',
    city: 'Amélia Rodrigues',
    km: 552,
    lat: -12.3912,
    lng: -38.7492,
    rates: {
      car: 3.50,
      motorcycle: 1.75,
      utility: 3.50,
      truck_2axles: 7.00,
      truck_3axles: 10.50,
      truck_4axles: 14.00,
      truck_6axles: 21.00,
      truck_7axles: 24.50,
      truck_9axles: 31.50,
      bus_2axles: 7.00,
      bus_3axles: 10.50
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  },
  {
    id: 'viabahia_milagres',
    name: 'Praça Milagres',
    highway: 'BR-116',
    concessionaire: 'VIABAHIA',
    state: 'BA',
    city: 'Milagres',
    km: 550,
    lat: -12.8692,
    lng: -39.8592,
    rates: {
      car: 5.90,
      motorcycle: 2.95,
      utility: 5.90,
      truck_2axles: 11.80,
      truck_3axles: 17.70,
      truck_4axles: 23.60,
      truck_6axles: 35.40,
      truck_7axles: 41.30,
      truck_9axles: 53.10,
      bus_2axles: 11.80,
      bus_3axles: 17.70
    },
    paymentMethods: ['sem_parar', 'conectcar', 'veloe', 'taggy', 'pix', 'dinheiro'],
    direction: 'bidirectional',
    freeFlow: false
  }
];

export const WEIGH_STATIONS: WeighStation[] = [
  { id: 'bal_dutra_1', name: 'Balança Arujá', highway: 'BR-116', km: 201, lat: -23.3982, lng: -46.3198, state: 'SP', type: 'dinamica' },
  { id: 'bal_dutra_2', name: 'Balança Resende', highway: 'BR-116', km: 304, lat: -22.4682, lng: -44.4491, state: 'RJ', type: 'dinamica' },
  { id: 'bal_autoban_1', name: 'Balança Jundiaí', highway: 'SP-348', km: 62, lat: -23.1892, lng: -46.9982, state: 'SP', type: 'convencional' },
  { id: 'bal_regis_1', name: 'Balança Juquiá', highway: 'BR-116', km: 412, lat: -24.3102, lng: -47.6201, state: 'SP', type: 'dinamica' },
  { id: 'bal_fernao_1', name: 'Balança Pouso Alegre', highway: 'BR-381', km: 852, lat: -22.2212, lng: -45.9291, state: 'MG', type: 'dinamica' }
];

export const GAS_STATIONS: GasStationPoint[] = [
  { id: 'posto_graal_market', name: 'Graal Market', brand: 'Graal', highway: 'BR-116', km: 171, lat: -23.2492, lng: -45.9812, amenities: ['Restaurante 24h', 'Ducha quente', 'Wi-Fi', 'Borracharia'] },
  { id: 'posto_shell_roseira', name: 'Posto Shell Roseira', brand: 'Shell', highway: 'BR-116', km: 78, lat: -22.8982, lng: -45.3012, amenities: ['Loja de Conveniência', 'Caixa Eletrônico', 'Estacionamento seguro'] },
  { id: 'posto_ipiranga_bandeirantes', name: 'Ipiranga Campeão', brand: 'Ipiranga', highway: 'SP-348', km: 72, lat: -23.1492, lng: -47.0392, amenities: ['Posto GNV', 'Restaurante', 'Farmácia'] },
  { id: 'posto_petrobras_regis', name: 'Petrobras Sete Barras', brand: 'Petrobras', highway: 'BR-116', km: 450, lat: -24.5102, lng: -47.8891, amenities: ['Diesel S10', 'Arla 32', 'Lavador de caminhão'] },
  { id: 'posto_graal_perdões', name: 'Graal Perdões', brand: 'Graal', highway: 'BR-381', km: 680, lat: -21.1492, lng: -45.0892, amenities: ['Restaurante Buffet', 'Hotel', 'Wi-Fi 5G', 'Carregador Elétrico'] }
];

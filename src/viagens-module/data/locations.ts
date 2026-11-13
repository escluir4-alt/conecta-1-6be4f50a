import { Location } from '../types';

export const POPULAR_LOCATIONS: Location[] = [
  // São Paulo
  {
    id: 'sao-paulo-all',
    name: 'São Paulo (Todos os Aeroportos e Terminais)',
    city: 'São Paulo',
    state: 'SP',
    code: 'SAO',
    type: 'city_all',
    country: 'Brasil'
  },
  {
    id: 'gru',
    name: 'Aeroporto Internacional de Guarulhos',
    city: 'São Paulo',
    state: 'SP',
    code: 'GRU',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'cgh',
    name: 'Aeroporto de Congonhas',
    city: 'São Paulo',
    state: 'SP',
    code: 'CGH',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'vcp',
    name: 'Aeroporto Internacional de Viracopos',
    city: 'Campinas / SP',
    state: 'SP',
    code: 'VCP',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'tiete',
    name: 'Terminal Rodoviário do Tietê',
    city: 'São Paulo',
    state: 'SP',
    code: 'TIETÊ',
    type: 'bus_station',
    country: 'Brasil'
  },
  {
    id: 'barra-funda',
    name: 'Terminal Rodoviário Barra Funda',
    city: 'São Paulo',
    state: 'SP',
    code: 'BARRA FUNDA',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Rio de Janeiro
  {
    id: 'rio-all',
    name: 'Rio de Janeiro (Todos os Aeroportos e Terminais)',
    city: 'Rio de Janeiro',
    state: 'RJ',
    code: 'RIO',
    type: 'city_all',
    country: 'Brasil'
  },
  {
    id: 'sdu',
    name: 'Aeroporto Santos Dumont',
    city: 'Rio de Janeiro',
    state: 'RJ',
    code: 'SDU',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'gig',
    name: 'Aeroporto Internacional Tom Jobim (Galeão)',
    city: 'Rio de Janeiro',
    state: 'RJ',
    code: 'GIG',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'novo-rio',
    name: 'Rodoviária Novo Rio',
    city: 'Rio de Janeiro',
    state: 'RJ',
    code: 'NOVO RIO',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Belo Horizonte
  {
    id: 'bh-all',
    name: 'Belo Horizonte (Todos os Terminais)',
    city: 'Belo Horizonte',
    state: 'MG',
    code: 'BHZ',
    type: 'city_all',
    country: 'Brasil'
  },
  {
    id: 'cnf',
    name: 'Aeroporto Internacional de Confins',
    city: 'Belo Horizonte',
    state: 'MG',
    code: 'CNF',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-bh',
    name: 'Terminal Rodoviário Gov. Israel Pinheiro',
    city: 'Belo Horizonte',
    state: 'MG',
    code: 'TER-BH',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Brasília
  {
    id: 'bsb',
    name: 'Aeroporto Internacional Presidente Juscelino Kubitschek',
    city: 'Brasília',
    state: 'DF',
    code: 'BSB',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-bsb',
    name: 'Rodoviária Interestadual de Brasília',
    city: 'Brasília',
    state: 'DF',
    code: 'TER-BSB',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Curitiba
  {
    id: 'cwb',
    name: 'Aeroporto Internacional Afonso Pena',
    city: 'Curitiba',
    state: 'PR',
    code: 'CWB',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoferroviaria-cwb',
    name: 'Rodoferroviária de Curitiba',
    city: 'Curitiba',
    state: 'PR',
    code: 'RODO-CWB',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Florianópolis
  {
    id: 'fln',
    name: 'Aeroporto Internacional Hercílio Luz',
    city: 'Florianópolis',
    state: 'SC',
    code: 'FLN',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-fln',
    name: 'Terminal Rodoviário Rita Maria',
    city: 'Florianópolis',
    state: 'SC',
    code: 'TER-FLN',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Salvador
  {
    id: 'ssa',
    name: 'Aeroporto Internacional Dep. Luís Eduardo Magalhães',
    city: 'Salvador',
    state: 'BA',
    code: 'SSA',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-ssa',
    name: 'Terminal Rodoviário de Salvador',
    city: 'Salvador',
    state: 'BA',
    code: 'TER-SSA',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Porto Alegre
  {
    id: 'poa',
    name: 'Aeroporto Internacional Salgado Filho',
    city: 'Porto Alegre',
    state: 'RS',
    code: 'POA',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-poa',
    name: 'Estação Rodoviária de Porto Alegre',
    city: 'Porto Alegre',
    state: 'RS',
    code: 'TER-POA',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Recife
  {
    id: 'rec',
    name: 'Aeroporto Internacional dos Guararapes',
    city: 'Recife',
    state: 'PE',
    code: 'REC',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'tip-recife',
    name: 'Terminal Integrado de Passageiros (TIP Recife)',
    city: 'Recife',
    state: 'PE',
    code: 'TIP-REC',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Fortaleza
  {
    id: 'for',
    name: 'Aeroporto Internacional Pinto Martins',
    city: 'Fortaleza',
    state: 'CE',
    code: 'FOR',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-for',
    name: 'Terminal Rodoviário Engenheiro João Thomé',
    city: 'Fortaleza',
    state: 'CE',
    code: 'TER-FOR',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Goiânia
  {
    id: 'gyn',
    name: 'Aeroporto Santa Genoveva',
    city: 'Goiânia',
    state: 'GO',
    code: 'GYN',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-gyn',
    name: 'Terminal Rodoviário de Goiânia',
    city: 'Goiânia',
    state: 'GO',
    code: 'TER-GYN',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Foz do Iguaçu
  {
    id: 'igu',
    name: 'Aeroporto Internacional de Foz do Iguaçu',
    city: 'Foz do Iguaçu',
    state: 'PR',
    code: 'IGU',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-igu',
    name: 'Terminal Rodoviário Internacional de Foz',
    city: 'Foz do Iguaçu',
    state: 'PR',
    code: 'TER-IGU',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Vitória / ES
  {
    id: 'vix-all',
    name: 'Vitória (Todos os Terminais)',
    city: 'Vitória',
    state: 'ES',
    code: 'VIX',
    type: 'city_all',
    country: 'Brasil'
  },
  {
    id: 'vix',
    name: 'Aeroporto de Vitória - Eurico de Aguiar Salles',
    city: 'Vitória',
    state: 'ES',
    code: 'VIX-AIR',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-vix',
    name: 'Terminal Rodoviário Carlos Alberto Vivacqua Campos',
    city: 'Vitória',
    state: 'ES',
    code: 'TER-VIX',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Campinas / SP
  {
    id: 'campinas-all',
    name: 'Campinas (Todos os Terminais)',
    city: 'Campinas',
    state: 'SP',
    code: 'CPQ',
    type: 'city_all',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-cpq',
    name: 'Terminal Multimodal Ramos de Azevedo',
    city: 'Campinas',
    state: 'SP',
    code: 'TER-CPQ',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Natal / RN
  {
    id: 'nat',
    name: 'Aeroporto Internacional de Natal - São Gonçalo do Amarante',
    city: 'Natal',
    state: 'RN',
    code: 'NAT',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-nat',
    name: 'Terminal Rodoviário Severino Tomaz da Silveira',
    city: 'Natal',
    state: 'RN',
    code: 'TER-NAT',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Maceió / AL
  {
    id: 'mcz',
    name: 'Aeroporto Internacional Zumbi dos Palmares',
    city: 'Maceió',
    state: 'AL',
    code: 'MCZ',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-mcz',
    name: 'Terminal Rodoviário João Paulo II',
    city: 'Maceió',
    state: 'AL',
    code: 'TER-MCZ',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Manaus / AM
  {
    id: 'mao',
    name: 'Aeroporto Internacional Eduardo Gomes',
    city: 'Manaus',
    state: 'AM',
    code: 'MAO',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-mao',
    name: 'Terminal Rodoviário Engenheiro Huascar Angelim',
    city: 'Manaus',
    state: 'AM',
    code: 'TER-MAO',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Belém / PA
  {
    id: 'bel',
    name: 'Aeroporto Internacional de Belém - Val-de-Cans',
    city: 'Belém',
    state: 'PA',
    code: 'BEL',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-bel',
    name: 'Terminal Rodoviário de Belém',
    city: 'Belém',
    state: 'PA',
    code: 'TER-BEL',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Cuiabá / MT
  {
    id: 'cgb',
    name: 'Aeroporto Internacional Marechal Rondon',
    city: 'Cuiabá',
    state: 'MT',
    code: 'CGB',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-cgb',
    name: 'Terminal Rodoviário Engenheiro Cássio Veiga de Sá',
    city: 'Cuiabá',
    state: 'MT',
    code: 'TER-CGB',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Campo Grande / MS
  {
    id: 'cgr',
    name: 'Aeroporto Internacional de Campo Grande',
    city: 'Campo Grande',
    state: 'MS',
    code: 'CGR',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-cgr',
    name: 'Terminal Rodoviário Senador Antônio Mendes Canale',
    city: 'Campo Grande',
    state: 'MS',
    code: 'TER-CGR',
    type: 'bus_station',
    country: 'Brasil'
  },

  // João Pessoa / PB
  {
    id: 'jpa',
    name: 'Aeroporto Internacional Presidente Castro Pinto',
    city: 'João Pessoa',
    state: 'PB',
    code: 'JPA',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-jpa',
    name: 'Terminal Rodoviário Severino Camelo',
    city: 'João Pessoa',
    state: 'PB',
    code: 'TER-JPA',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Navegantes & Balneário Camboriú / SC
  {
    id: 'nvt',
    name: 'Aeroporto Internacional de Navegantes - Ministro Victor Konder',
    city: 'Navegantes',
    state: 'SC',
    code: 'NVT',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-bc',
    name: 'Terminal Rodoviário de Balneário Camboriú',
    city: 'Balneário Camboriú',
    state: 'SC',
    code: 'TER-BC',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Gramado & Canela / RS
  {
    id: 'rodoviaria-gramado',
    name: 'Estação Rodoviária de Gramado',
    city: 'Gramado',
    state: 'RS',
    code: 'TER-GRA',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Santos / SP
  {
    id: 'rodoviaria-santos',
    name: 'Terminal Rodoviário de Santos - Rubens Paiva',
    city: 'Santos',
    state: 'SP',
    code: 'TER-STS',
    type: 'bus_station',
    country: 'Brasil'
  },

  // Ribeirão Preto / SP
  {
    id: 'rao',
    name: 'Aeroporto Estadual Dr. Leite Lopes',
    city: 'Ribeirão Preto',
    state: 'SP',
    code: 'RAO',
    type: 'airport',
    country: 'Brasil'
  },
  {
    id: 'rodoviaria-rao',
    name: 'Terminal Rodoviário de Ribeirão Preto',
    city: 'Ribeirão Preto',
    state: 'SP',
    code: 'TER-RAO',
    type: 'bus_station',
    country: 'Brasil'
  }
];

export const INTERNATIONAL_LOCATIONS: Location[] = [
  // Estados Unidos & América do Norte
  {
    id: 'mia',
    name: 'Aeroporto Internacional de Miami (MIA)',
    city: 'Miami',
    state: 'FL',
    code: 'MIA',
    type: 'airport',
    country: 'Estados Unidos'
  },
  {
    id: 'mco',
    name: 'Aeroporto Internacional de Orlando (MCO)',
    city: 'Orlando',
    state: 'FL',
    code: 'MCO',
    type: 'airport',
    country: 'Estados Unidos'
  },
  {
    id: 'jfk',
    name: 'Aeroporto Internacional John F. Kennedy (JFK)',
    city: 'Nova York',
    state: 'NY',
    code: 'JFK',
    type: 'airport',
    country: 'Estados Unidos'
  },
  {
    id: 'ewr',
    name: 'Aeroporto Internacional de Newark Liberty (EWR)',
    city: 'Nova York / Newark',
    state: 'NJ',
    code: 'EWR',
    type: 'airport',
    country: 'Estados Unidos'
  },
  {
    id: 'nyc-all',
    name: 'Nova York (Todos os Aeroportos - JFK, EWR, LGA)',
    city: 'Nova York',
    state: 'NY',
    code: 'NYC',
    type: 'city_all',
    country: 'Estados Unidos'
  },
  {
    id: 'lax',
    name: 'Aeroporto Internacional de Los Angeles (LAX)',
    city: 'Los Angeles',
    state: 'CA',
    code: 'LAX',
    type: 'airport',
    country: 'Estados Unidos'
  },
  {
    id: 'ord',
    name: 'Aeroporto Internacional O\'Hare (ORD)',
    city: 'Chicago',
    state: 'IL',
    code: 'ORD',
    type: 'airport',
    country: 'Estados Unidos'
  },
  {
    id: 'cun',
    name: 'Aeroporto Internacional de Cancún (CUN)',
    city: 'Cancún',
    state: 'Q.R.',
    code: 'CUN',
    type: 'airport',
    country: 'México'
  },

  // Europa
  {
    id: 'lis',
    name: 'Aeroporto Humberto Delgado (Lisboa - LIS)',
    city: 'Lisboa',
    state: 'LIS',
    code: 'LIS',
    type: 'airport',
    country: 'Portugal'
  },
  {
    id: 'opo',
    name: 'Aeroporto Francisco Sá Carneiro (Porto - OPO)',
    city: 'Porto',
    state: 'OPO',
    code: 'OPO',
    type: 'airport',
    country: 'Portugal'
  },
  {
    id: 'mad',
    name: 'Aeroporto Adolfo Suárez Madrid-Barajas (MAD)',
    city: 'Madri',
    state: 'MAD',
    code: 'MAD',
    type: 'airport',
    country: 'Espanha'
  },
  {
    id: 'bcn',
    name: 'Aeroporto Josep Tarradellas Barcelona-El Prat (BCN)',
    city: 'Barcelona',
    state: 'CAT',
    code: 'BCN',
    type: 'airport',
    country: 'Espanha'
  },
  {
    id: 'cdg',
    name: 'Aeroporto de Paris-Charles de Gaulle (CDG)',
    city: 'Paris',
    state: 'IDF',
    code: 'CDG',
    type: 'airport',
    country: 'França'
  },
  {
    id: 'par-all',
    name: 'Paris (Todos os Aeroportos - CDG e Orly)',
    city: 'Paris',
    state: 'IDF',
    code: 'PAR',
    type: 'city_all',
    country: 'França'
  },
  {
    id: 'lhr',
    name: 'Aeroporto de Londres-Heathrow (LHR)',
    city: 'Londres',
    state: 'ENG',
    code: 'LHR',
    type: 'airport',
    country: 'Reino Unido'
  },
  {
    id: 'lon-all',
    name: 'Londres (Todos os Aeroportos - LHR, LGW)',
    city: 'Londres',
    state: 'ENG',
    code: 'LON',
    type: 'city_all',
    country: 'Reino Unido'
  },
  {
    id: 'fco',
    name: 'Aeroporto Internacional Leonardo da Vinci (Roma - FCO)',
    city: 'Roma',
    state: 'LAZ',
    code: 'FCO',
    type: 'airport',
    country: 'Itália'
  },
  {
    id: 'mxp',
    name: 'Aeroporto de Milão-Malpensa (MXP)',
    city: 'Milão',
    state: 'LOM',
    code: 'MXP',
    type: 'airport',
    country: 'Itália'
  },
  {
    id: 'fra',
    name: 'Aeroporto de Frankfurt am Main (FRA)',
    city: 'Frankfurt',
    state: 'HES',
    code: 'FRA',
    type: 'airport',
    country: 'Alemanha'
  },
  {
    id: 'ams',
    name: 'Aeroporto de Amsterdã Schiphol (AMS)',
    city: 'Amsterdã',
    state: 'NH',
    code: 'AMS',
    type: 'airport',
    country: 'Holanda'
  },

  // América do Sul
  {
    id: 'eze',
    name: 'Aeroporto Internacional Ministro Pistarini (Ezeiza - EZE)',
    city: 'Buenos Aires',
    state: 'BA',
    code: 'EZE',
    type: 'airport',
    country: 'Argentina'
  },
  {
    id: 'aep',
    name: 'Aeroparque Jorge Newbery (AEP)',
    city: 'Buenos Aires',
    state: 'BA',
    code: 'AEP',
    type: 'airport',
    country: 'Argentina'
  },
  {
    id: 'bue-all',
    name: 'Buenos Aires (Todos os Aeroportos - EZE & AEP)',
    city: 'Buenos Aires',
    state: 'BA',
    code: 'BUE',
    type: 'city_all',
    country: 'Argentina'
  },
  {
    id: 'scl',
    name: 'Aeroporto Internacional Arturo Merino Benítez (SCL)',
    city: 'Santiago',
    state: 'RM',
    code: 'SCL',
    type: 'airport',
    country: 'Chile'
  },
  {
    id: 'mvd',
    name: 'Aeroporto Internacional de Carrasco (MVD)',
    city: 'Montevidéu',
    state: 'MO',
    code: 'MVD',
    type: 'airport',
    country: 'Uruguai'
  },
  {
    id: 'lim',
    name: 'Aeroporto Internacional Jorge Chávez (LIM)',
    city: 'Lima',
    state: 'LIM',
    code: 'LIM',
    type: 'airport',
    country: 'Peru'
  },
  {
    id: 'bog',
    name: 'Aeroporto Internacional El Dorado (BOG)',
    city: 'Bogotá',
    state: 'BOG',
    code: 'BOG',
    type: 'airport',
    country: 'Colômbia'
  },

  // Oriente Médio & Ásia
  {
    id: 'dxb',
    name: 'Aeroporto Internacional de Dubai (DXB)',
    city: 'Dubai',
    state: 'DXB',
    code: 'DXB',
    type: 'airport',
    country: 'Emirados Árabes'
  },
  {
    id: 'doh',
    name: 'Aeroporto Internacional de Hamad (DOH)',
    city: 'Doha',
    state: 'DOH',
    code: 'DOH',
    type: 'airport',
    country: 'Catar'
  },
  {
    id: 'hnd',
    name: 'Aeroporto Internacional de Tóquio Haneda (HND)',
    city: 'Tóquio',
    state: 'TYO',
    code: 'HND',
    type: 'airport',
    country: 'Japão'
  },
  {
    id: 'nrt',
    name: 'Aeroporto Internacional de Narita (NRT)',
    city: 'Tóquio',
    state: 'TYO',
    code: 'NRT',
    type: 'airport',
    country: 'Japão'
  }
];

export const ALL_LOCATIONS: Location[] = [...POPULAR_LOCATIONS, ...INTERNATIONAL_LOCATIONS];

export function normalizeSearchText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Multilingual and synonym aliases (e.g. "New York" -> "Nova York", "Lisbon" -> "Lisboa")
const CITY_SYNONYMS: Record<string, string[]> = {
  'nova york': ['new york', 'nyc', 'manhattan', 'eua', 'usa'],
  'lisboa': ['lisbon', 'portugal'],
  'madri': ['madrid', 'spain', 'espanha'],
  'londres': ['london', 'england', 'uk', 'reino unido'],
  'paris': ['france', 'franca'],
  'roma': ['rome', 'italia', 'italy'],
  'milao': ['milan', 'italia'],
  'buenos aires': ['argentina', 'baires'],
  'santiago': ['chile'],
  'orlando': ['disney', 'florida', 'usa', 'eua'],
  'miami': ['florida', 'south beach', 'usa', 'eua'],
  'toquio': ['tokyo', 'japan', 'japao'],
  'cancun': ['mexico', 'caribe']
};

export function searchLocations(query: string, filterType?: 'airport' | 'bus_station' | 'all'): Location[] {
  const normalized = normalizeSearchText(query);
  
  if (!normalized) {
    if (filterType === 'airport') {
      return ALL_LOCATIONS.filter(l => l.type === 'airport').slice(0, 12);
    }
    if (filterType === 'bus_station') {
      return ALL_LOCATIONS.filter(l => l.type === 'bus_station').slice(0, 10);
    }
    return ALL_LOCATIONS.slice(0, 12);
  }

  // Filter matching candidates from all locations (domestic + international)
  const matching = ALL_LOCATIONS.filter(loc => {
    if (filterType === 'bus_station' && loc.type !== 'bus_station') return false;
    if (filterType === 'airport' && loc.type !== 'airport' && loc.type !== 'city_all') return false;

    const normName = normalizeSearchText(loc.name);
    const normCity = normalizeSearchText(loc.city);
    const normState = normalizeSearchText(loc.state);
    const normCode = normalizeSearchText(loc.code);
    const normCountry = normalizeSearchText(loc.country || '');

    // Check direct properties
    const directMatch = (
      normName.includes(normalized) ||
      normCity.includes(normalized) ||
      normState.includes(normalized) ||
      normCode.includes(normalized) ||
      normCountry.includes(normalized)
    );

    if (directMatch) return true;

    // Check synonyms
    for (const [keyCity, synonyms] of Object.entries(CITY_SYNONYMS)) {
      if (normCity.includes(keyCity)) {
        if (synonyms.some(syn => syn.includes(normalized) || normalized.includes(syn))) {
          return true;
        }
      }
    }

    return false;
  });

  // Relevance ranking
  return matching.sort((a, b) => {
    const aNormCity = normalizeSearchText(a.city);
    const bNormCity = normalizeSearchText(b.city);
    const aNormCode = normalizeSearchText(a.code);
    const bNormCode = normalizeSearchText(b.code);

    // 1. Exact code match (e.g. MIA, JFK, LIS, GRU, RIO, SAO, BSB)
    const aExactCode = aNormCode === normalized ? 1 : 0;
    const bExactCode = bNormCode === normalized ? 1 : 0;
    if (aExactCode !== bExactCode) return bExactCode - aExactCode;

    // 2. City begins with query
    const aCityStarts = aNormCity.startsWith(normalized) ? 1 : 0;
    const bCityStarts = bNormCity.startsWith(normalized) ? 1 : 0;
    if (aCityStarts !== bCityStarts) return bCityStarts - aCityStarts;

    // 3. City_all (general city hub) preferred over specific terminal when searching city
    if (aNormCity === bNormCity) {
      if (a.type === 'city_all') return -1;
      if (b.type === 'city_all') return 1;
    }

    // 4. Code starts with query
    const aCodeStarts = aNormCode.startsWith(normalized) ? 1 : 0;
    const bCodeStarts = bNormCode.startsWith(normalized) ? 1 : 0;
    if (aCodeStarts !== bCodeStarts) return bCodeStarts - aCodeStarts;

    return 0;
  });
}

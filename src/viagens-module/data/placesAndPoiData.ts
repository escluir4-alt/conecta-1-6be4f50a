export type PlaceCategory = 
  | 'city' 
  | 'small_city' 
  | 'prefeitura' 
  | 'shopping' 
  | 'tourist_spot' 
  | 'bus_terminal' 
  | 'airport' 
  | 'cep' 
  | 'coordinates' 
  | 'my_location'
  | 'google_place';

export interface SearchPlaceItem {
  id: string;
  name: string; // e.g. "Terminal Rodoviário Tietê", "Prefeitura de São Paulo", "Morumbi Shopping"
  subtitle: string; // e.g. "São Paulo - SP · Paço Municipal"
  city: string;
  state: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  cep?: string;
  address?: string;
}

export interface PrfStation {
  id: string;
  name: string; // e.g. "Delegacia PRF Arujá"
  highway: string; // e.g. "BR-116"
  km: number;
  state: string;
  city: string;
  lat: number;
  lng: number;
  emergencyPhone: string;
  services: string[];
}

// Major Tourist Points, Terminals and Landmarks across Brazil
export const BRAZIL_LANDMARKS_AND_POI: SearchPlaceItem[] = [
  // São Paulo
  {
    id: 'poi_rodoviaria_tiete',
    name: 'Rodoviária do Tietê (Terminal Rodoviário Tietê)',
    subtitle: 'São Paulo - SP · Terminal Rodoviário Interestadual',
    city: 'São Paulo',
    state: 'SP',
    lat: -23.5162,
    lng: -46.6253,
    category: 'bus_terminal'
  },
  {
    id: 'poi_rodoviaria_barra_funda',
    name: 'Rodoviária Barra Funda',
    subtitle: 'São Paulo - SP · Terminal Intermodal',
    city: 'São Paulo',
    state: 'SP',
    lat: -23.5258,
    lng: -46.6669,
    category: 'bus_terminal'
  },
  {
    id: 'poi_av_paulista',
    name: 'Avenida Paulista',
    subtitle: 'São Paulo - SP · Centro Financeiro e Cultural',
    city: 'São Paulo',
    state: 'SP',
    lat: -23.5615,
    lng: -46.6559,
    category: 'tourist_spot'
  },
  {
    id: 'poi_aeroporto_gru',
    name: 'Aeroporto Internacional de Guarulhos (GRU)',
    subtitle: 'Guarulhos - SP · Aeroporto Internacional',
    city: 'Guarulhos',
    state: 'SP',
    lat: -23.4356,
    lng: -46.4731,
    category: 'airport'
  },
  {
    id: 'poi_aeroporto_cgh',
    name: 'Aeroporto de Congonhas (CGH)',
    subtitle: 'São Paulo - SP · Aeroporto Doméstico',
    city: 'São Paulo',
    state: 'SP',
    lat: -23.6273,
    lng: -46.6566,
    category: 'airport'
  },
  {
    id: 'poi_porto_santos',
    name: 'Porto de Santos',
    subtitle: 'Santos - SP · Maior Complexo Portuário da América Latina',
    city: 'Santos',
    state: 'SP',
    lat: -23.9608,
    lng: -46.3336,
    category: 'tourist_spot'
  },
  {
    id: 'poi_basilica_aparecida',
    name: 'Santuário Nacional de Nossa Senhora Aparecida',
    subtitle: 'Aparecida - SP · Vale do Paraíba',
    city: 'Aparecida',
    state: 'SP',
    lat: -22.8492,
    lng: -45.2341,
    category: 'tourist_spot'
  },

  // Rio de Janeiro
  {
    id: 'poi_rodoviaria_novo_rio',
    name: 'Rodoviária Novo Rio (Terminal Rodoviário)',
    subtitle: 'Rio de Janeiro - RJ · Santo Cristo',
    city: 'Rio de Janeiro',
    state: 'RJ',
    lat: -22.8988,
    lng: -43.2096,
    category: 'bus_terminal'
  },
  {
    id: 'poi_cristo_redentor',
    name: 'Cristo Redentor & Corcovado',
    subtitle: 'Rio de Janeiro - RJ · Ponto Turístico Mundial',
    city: 'Rio de Janeiro',
    state: 'RJ',
    lat: -22.9519,
    lng: -43.2105,
    category: 'tourist_spot'
  },
  {
    id: 'poi_copacabana',
    name: 'Praia de Copacabana',
    subtitle: 'Rio de Janeiro - RJ · Zona Sul',
    city: 'Rio de Janeiro',
    state: 'RJ',
    lat: -22.9698,
    lng: -43.1802,
    category: 'tourist_spot'
  },
  {
    id: 'poi_aeroporto_sdu',
    name: 'Aeroporto Santos Dumont (SDU)',
    subtitle: 'Rio de Janeiro - RJ · Centro',
    city: 'Rio de Janeiro',
    state: 'RJ',
    lat: -22.9105,
    lng: -43.1631,
    category: 'airport'
  },
  {
    id: 'poi_aeroporto_gig',
    name: 'Aeroporto Internacional do Galeão (GIG)',
    subtitle: 'Rio de Janeiro - RJ · Ilha do Governador',
    city: 'Rio de Janeiro',
    state: 'RJ',
    lat: -22.8134,
    lng: -43.2494,
    category: 'airport'
  },

  // Pernambuco - Recife
  {
    id: 'poi_recife_marco_zero',
    name: 'Marco Zero do Recife (Recife Antigo)',
    subtitle: 'Recife - PE · Ponto Histórico e Cultural',
    city: 'Recife',
    state: 'PE',
    lat: -8.0631,
    lng: -34.8711,
    category: 'tourist_spot'
  },
  {
    id: 'poi_recife_boa_viagem',
    name: 'Praia de Boa Viagem',
    subtitle: 'Recife - PE · Litoral Urbano',
    city: 'Recife',
    state: 'PE',
    lat: -8.1189,
    lng: -34.8985,
    category: 'tourist_spot'
  },
  {
    id: 'poi_rodoviaria_recife_tip',
    name: 'Terminal Integrado de Passageiros (TIP Recife)',
    subtitle: 'Recife / Várzea - PE · Terminal Rodoviário',
    city: 'Recife',
    state: 'PE',
    lat: -8.0772,
    lng: -35.0089,
    category: 'bus_terminal'
  },

  // Rio Grande do Norte - Natal
  {
    id: 'poi_natal_ponta_negra',
    name: 'Praia de Ponta Negra (Morro do Careca)',
    subtitle: 'Natal - RN · Principal Ponto Turístico',
    city: 'Natal',
    state: 'RN',
    lat: -5.8794,
    lng: -35.1764,
    category: 'tourist_spot'
  },
  {
    id: 'poi_natal_forte_reis_magos',
    name: 'Forte dos Reis Magos',
    subtitle: 'Natal - RN · Praia do Meio',
    city: 'Natal',
    state: 'RN',
    lat: -5.7571,
    lng: -35.1953,
    category: 'tourist_spot'
  },
  {
    id: 'poi_rodoviaria_natal',
    name: 'Complexo Rodoviário Severino Tomaz da Silveira (Rodoviária de Natal)',
    subtitle: 'Natal - RN · Cidade da Esperança',
    city: 'Natal',
    state: 'RN',
    lat: -5.8192,
    lng: -35.2341,
    category: 'bus_terminal'
  },

  // Paraná - Curitiba
  {
    id: 'poi_jardim_botanico_cwb',
    name: 'Jardim Botânico de Curitiba',
    subtitle: 'Curitiba - PR · Ponto Turístico',
    city: 'Curitiba',
    state: 'PR',
    lat: -25.4428,
    lng: -49.2394,
    category: 'tourist_spot'
  },
  {
    id: 'poi_rodoviaria_curitiba',
    name: 'Rodoferroviária de Curitiba',
    subtitle: 'Curitiba - PR · Jardim Botânico / Cristo Rei',
    city: 'Curitiba',
    state: 'PR',
    lat: -25.4369,
    lng: -49.2562,
    category: 'bus_terminal'
  },

  // Minas Gerais - Belo Horizonte
  {
    id: 'poi_praca_liberdade_bh',
    name: 'Praça da Liberdade & Circuito Cultural',
    subtitle: 'Belo Horizonte - MG · Savassi',
    city: 'Belo Horizonte',
    state: 'MG',
    lat: -19.9321,
    lng: -43.9378,
    category: 'tourist_spot'
  },
  {
    id: 'poi_rodoviaria_bh',
    name: 'Terminal Rodoviário Governador Israel Pinheiro (TERGIP BH)',
    subtitle: 'Belo Horizonte - MG · Centro',
    city: 'Belo Horizonte',
    state: 'MG',
    lat: -19.9128,
    lng: -43.9421,
    category: 'bus_terminal'
  },

  // Bahia - Salvador
  {
    id: 'poi_pelourinho_ssa',
    name: 'Pelourinho & Centro Histórico',
    subtitle: 'Salvador - BA · Patrimônio Cultural',
    city: 'Salvador',
    state: 'BA',
    lat: -12.9719,
    lng: -38.5089,
    category: 'tourist_spot'
  },
  {
    id: 'poi_farol_barra_ssa',
    name: 'Farol da Barra',
    subtitle: 'Salvador - BA · Litoral',
    city: 'Salvador',
    state: 'BA',
    lat: -13.0102,
    lng: -38.5322,
    category: 'tourist_spot'
  },
  {
    id: 'poi_rodoviaria_ssa',
    name: 'Terminal Rodoviário de Salvador (Armando Prado)',
    subtitle: 'Salvador - BA · Pernambués',
    city: 'Salvador',
    state: 'BA',
    lat: -12.9782,
    lng: -38.4553,
    category: 'bus_terminal'
  },

  // Distrito Federal - Brasília
  {
    id: 'poi_esplanada_brasilia',
    name: 'Esplanada dos Ministérios & Congresso Nacional',
    subtitle: 'Brasília - DF · Eixo Monumental',
    city: 'Brasília',
    state: 'DF',
    lat: -15.7998,
    lng: -47.8645,
    category: 'tourist_spot'
  },
  {
    id: 'poi_rodoviaria_interestadual_bsb',
    name: 'Terminal Rodoviário Interestadual de Brasília',
    subtitle: 'Brasília - DF · Asa Sul',
    city: 'Brasília',
    state: 'DF',
    lat: -15.8291,
    lng: -47.9542,
    category: 'bus_terminal'
  }
];

// Major Brazilian Cities with Coordinates
export const BRAZIL_MAIN_CITIES: SearchPlaceItem[] = [
  { id: 'city_sao_paulo', name: 'São Paulo', subtitle: 'São Paulo · Capital SP', city: 'São Paulo', state: 'SP', lat: -23.5505, lng: -46.6333, category: 'city' },
  { id: 'city_rio_de_janeiro', name: 'Rio de Janeiro', subtitle: 'Rio de Janeiro · Capital RJ', city: 'Rio de Janeiro', state: 'RJ', lat: -22.9068, lng: -43.1729, category: 'city' },
  { id: 'city_recife', name: 'Recife', subtitle: 'Pernambuco · Capital PE', city: 'Recife', state: 'PE', lat: -8.0476, lng: -34.8770, category: 'city' },
  { id: 'city_natal', name: 'Natal', subtitle: 'Rio Grande do Norte · Capital RN', city: 'Natal', state: 'RN', lat: -5.7945, lng: -35.2110, category: 'city' },
  { id: 'city_salvador', name: 'Salvador', subtitle: 'Bahia · Capital BA', city: 'Salvador', state: 'BA', lat: -12.9777, lng: -38.5016, category: 'city' },
  { id: 'city_belo_horizonte', name: 'Belo Horizonte', subtitle: 'Minas Gerais · Capital MG', city: 'Belo Horizonte', state: 'MG', lat: -19.9167, lng: -43.9345, category: 'city' },
  { id: 'city_curitiba', name: 'Curitiba', subtitle: 'Paraná · Capital PR', city: 'Curitiba', state: 'PR', lat: -25.4284, lng: -49.2733, category: 'city' },
  { id: 'city_brasilia', name: 'Brasília', subtitle: 'Distrito Federal · Capital Federal', city: 'Brasília', state: 'DF', lat: -15.7975, lng: -47.8919, category: 'city' },
  { id: 'city_campinas', name: 'Campinas', subtitle: 'São Paulo · Interior SP', city: 'Campinas', state: 'SP', lat: -22.9099, lng: -47.0626, category: 'city' },
  { id: 'city_santos', name: 'Santos', subtitle: 'São Paulo · Litoral Paulista', city: 'Santos', state: 'SP', lat: -23.9608, lng: -46.3336, category: 'city' },
  { id: 'city_fortaleza', name: 'Fortaleza', subtitle: 'Ceará · Capital CE', city: 'Fortaleza', state: 'CE', lat: -3.7327, lng: -38.5270, category: 'city' },
  { id: 'city_joao_pessoa', name: 'João Pessoa', subtitle: 'Paraíba · Capital PB', city: 'João Pessoa', state: 'PB', lat: -7.1195, lng: -34.8450, category: 'city' },
  { id: 'city_maceio', name: 'Maceió', subtitle: 'Alagoas · Capital AL', city: 'Maceió', state: 'AL', lat: -9.6658, lng: -35.7351, category: 'city' },
  { id: 'city_aracaju', name: 'Aracaju', subtitle: 'Sergipe · Capital SE', city: 'Aracaju', state: 'SE', lat: -10.9472, lng: -37.0731, category: 'city' },
  { id: 'city_florianopolis', name: 'Florianópolis', subtitle: 'Santa Catarina · Capital SC', city: 'Florianópolis', state: 'SC', lat: -27.5954, lng: -48.5480, category: 'city' },
  { id: 'city_porto_alegre', name: 'Porto Alegre', subtitle: 'Rio Grande do Sul · Capital RS', city: 'Porto Alegre', state: 'RS', lat: -30.0346, lng: -51.2177, category: 'city' },
  { id: 'city_goiania', name: 'Goiânia', subtitle: 'Goiás · Capital GO', city: 'Goiânia', state: 'GO', lat: -16.6869, lng: -49.2648, category: 'city' },
  { id: 'city_feira_de_santana', name: 'Feira de Santana', subtitle: 'Bahia · Maior Entroncamento Rodoviário do Nordeste', city: 'Feira de Santana', state: 'BA', lat: -12.2664, lng: -38.9663, category: 'city' },
  { id: 'city_vitoria', name: 'Vitória', subtitle: 'Espírito Santo · Capital ES', city: 'Vitória', state: 'ES', lat: -20.3155, lng: -40.3128, category: 'city' },
  { id: 'city_ribeirao_preto', name: 'Ribeirão Preto', subtitle: 'São Paulo · Interior SP', city: 'Ribeirão Preto', state: 'SP', lat: -21.1767, lng: -47.8208, category: 'city' },
  { id: 'city_sao_jose_campos', name: 'São José dos Campos', subtitle: 'São Paulo · Vale do Paraíba', city: 'São José dos Campos', state: 'SP', lat: -23.2237, lng: -45.9009, category: 'city' }
];

// Prefeituras, Paços Municipais e Centros Administrativos
export const BRAZIL_PREFEITURAS: SearchPlaceItem[] = [
  { id: 'pref_sao_paulo', name: 'Prefeitura de São Paulo (Edifício Matarazzo)', subtitle: 'São Paulo - SP · Viaduto do Chá, Centro Histórico', city: 'São Paulo', state: 'SP', lat: -23.5478, lng: -46.6378, category: 'prefeitura', address: 'Viaduto do Chá, 15 - Centro Histórico' },
  { id: 'pref_rio_de_janeiro', name: 'Prefeitura do Rio de Janeiro (Centro Administrativo São Sebastião)', subtitle: 'Rio de Janeiro - RJ · Cidade Nova', city: 'Rio de Janeiro', state: 'RJ', lat: -22.9112, lng: -43.2056, category: 'prefeitura', address: 'Rua Afonso Cavalcanti, 455 - Cidade Nova' },
  { id: 'pref_belo_horizonte', name: 'Prefeitura de Belo Horizonte (PBH)', subtitle: 'Belo Horizonte - MG · Av. Afonso Pena, Centro', city: 'Belo Horizonte', state: 'MG', lat: -19.9221, lng: -43.9378, category: 'prefeitura', address: 'Av. Afonso Pena, 1212 - Centro' },
  { id: 'pref_curitiba', name: 'Prefeitura Municipal de Curitiba (Palácio 29 de Março)', subtitle: 'Curitiba - PR · Centro Cívico', city: 'Curitiba', state: 'PR', lat: -25.4168, lng: -49.2705, category: 'prefeitura', address: 'Av. Cândido de Abreu, 814 - Centro Cívico' },
  { id: 'pref_recife', name: 'Prefeitura da Cidade do Recife (Edifício Sede)', subtitle: 'Recife - PE · Cais do Apolo, Bairro do Recife', city: 'Recife', state: 'PE', lat: -8.0568, lng: -34.8722, category: 'prefeitura', address: 'Cais do Apolo, 925 - Bairro do Recife' },
  { id: 'pref_natal', name: 'Prefeitura Municipal de Natal (Palácio Felipe Camarão)', subtitle: 'Natal - RN · Cidade Alta', city: 'Natal', state: 'RN', lat: -5.7878, lng: -35.2091, category: 'prefeitura', address: 'Rua Ulisses Caldas, 81 - Cidade Alta' },
  { id: 'pref_salvador', name: 'Prefeitura Municipal de Salvador (Palácio Thomé de Souza)', subtitle: 'Salvador - BA · Praça Municipal, Centro Histórico', city: 'Salvador', state: 'BA', lat: -12.9734, lng: -38.5132, category: 'prefeitura', address: 'Praça Municipal, s/n - Centro Histórico' },
  { id: 'pref_brasilia', name: 'Palácio do Buriti (Governo do Distrito Federal)', subtitle: 'Brasília - DF · Eixo Monumental', city: 'Brasília', state: 'DF', lat: -15.7882, lng: -47.9082, category: 'prefeitura', address: 'Praça do Buriti, Zona Cívico-Administrativa' },
  { id: 'pref_campinas', name: 'Prefeitura Municipal de Campinas (Palácio dos Jequitibás)', subtitle: 'Campinas - SP · Rua Barreto Leme', city: 'Campinas', state: 'SP', lat: -22.9056, lng: -47.0567, category: 'prefeitura', address: 'Av. Anchieta, 200 - Centro' },
  { id: 'pref_santos', name: 'Prefeitura de Santos (Palácio José Bonifácio)', subtitle: 'Santos - SP · Centro Histórico', city: 'Santos', state: 'SP', lat: -23.9341, lng: -46.3278, category: 'prefeitura', address: 'Praça Mauá, s/n - Centro Histórico' },
  { id: 'pref_ribeirao_preto', name: 'Prefeitura Municipal de Ribeirão Preto (Palácio Rio Branco)', subtitle: 'Ribeirão Preto - SP · Centro', city: 'Ribeirão Preto', state: 'SP', lat: -21.1762, lng: -47.8105, category: 'prefeitura', address: 'Praça Barão do Rio Branco, s/n' },
  { id: 'pref_sao_jose_campos', name: 'Prefeitura Municipal de São José dos Campos (Paço Municipal)', subtitle: 'São José dos Campos - SP · Vila Industrial', city: 'São José dos Campos', state: 'SP', lat: -23.1812, lng: -45.8872, category: 'prefeitura', address: 'Rua José de Alencar, 123' },
  { id: 'pref_urupes', name: 'Prefeitura Municipal de Urupês (Paço Municipal Dr. José de Toledo Piza)', subtitle: 'Urupês - SP · Interior Paulista / Região de Catanduva', city: 'Urupês', state: 'SP', lat: -21.2025, lng: -49.2908, category: 'prefeitura', address: 'Rua Gustavo Martins Cerqueira, 463 - Centro' },
  { id: 'pref_pato_branco', name: 'Prefeitura Municipal de Pato Branco', subtitle: 'Pato Branco - PR · Sudoeste Paranaense', city: 'Pato Branco', state: 'PR', lat: -26.2289, lng: -52.6712, category: 'prefeitura', address: 'Rua Caramuru, 271 - Centro' },
  { id: 'pref_cunha', name: 'Prefeitura Municipal de Cunha', subtitle: 'Cunha - SP · Vale do Paraíba / Serra da Bocaina', city: 'Cunha', state: 'SP', lat: -23.0762, lng: -44.9582, category: 'prefeitura', address: 'Praça Coronel João Olímpio, 52 - Centro' },
  { id: 'pref_brotas', name: 'Prefeitura Municipal de Brotas', subtitle: 'Brotas - SP · Capital do Ecoturismo', city: 'Brotas', state: 'SP', lat: -22.2845, lng: -48.1256, category: 'prefeitura', address: 'Praça Amador Simões, 172 - Centro' },
  { id: 'pref_paraty', name: 'Prefeitura Municipal de Paraty', subtitle: 'Paraty - RJ · Costa Verde', city: 'Paraty', state: 'RJ', lat: -23.2182, lng: -44.7156, category: 'prefeitura', address: 'Rua Samuel Costa, 23 - Centro Histórico' },
  { id: 'pref_campos_jordao', name: 'Prefeitura de Campos do Jordão', subtitle: 'Campos do Jordão - SP · Abernéssia', city: 'Campos do Jordão', state: 'SP', lat: -22.7392, lng: -45.5912, category: 'prefeitura', address: 'Av. Frei Orestes Girardi, 893' },
  { id: 'pref_sobral', name: 'Prefeitura Municipal de Sobral', subtitle: 'Sobral - CE · Região Norte do Ceará', city: 'Sobral', state: 'CE', lat: -3.6892, lng: -40.3521, category: 'prefeitura', address: 'Rua Viriato de Medeiros, 1255 - Centro' },
  { id: 'pref_juazeiro_norte', name: 'Prefeitura Municipal de Juazeiro do Norte', subtitle: 'Juazeiro do Norte - CE · Região do Cariri', city: 'Juazeiro do Norte', state: 'CE', lat: -7.2134, lng: -39.3156, category: 'prefeitura', address: 'Praça Dirceu Figueiredo, s/n' },
  { id: 'pref_porto_alegre', name: 'Prefeitura Municipal de Porto Alegre (Paço dos Açorianos)', subtitle: 'Porto Alegre - RS · Centro Histórico', city: 'Porto Alegre', state: 'RS', lat: -30.0321, lng: -51.2312, category: 'prefeitura', address: 'Praça Montevidéu, 10 - Centro' },
  { id: 'pref_florianopolis', name: 'Prefeitura Municipal de Florianópolis', subtitle: 'Florianópolis - SC · Centro', city: 'Florianópolis', state: 'SC', lat: -27.5978, lng: -48.5512, category: 'prefeitura', address: 'Rua Conselheiro Mafra, 656 - Centro' }
];

// Principais Shopping Centers no Brasil
export const BRAZIL_SHOPPINGS: SearchPlaceItem[] = [
  // São Paulo
  { id: 'shop_morumbi', name: 'Morumbi Shopping', subtitle: 'São Paulo - SP · Av. Roque Petroni Júnior, Vila Gertrudes', city: 'São Paulo', state: 'SP', lat: -23.6231, lng: -46.6989, category: 'shopping', address: 'Av. Roque Petroni Júnior, 1089 - Santo Amaro' },
  { id: 'shop_iguatemi_sp', name: 'Shopping Iguatemi São Paulo', subtitle: 'São Paulo - SP · Av. Brigadeiro Faria Lima, Jardim Paulistano', city: 'São Paulo', state: 'SP', lat: -23.5782, lng: -46.6881, category: 'shopping', address: 'Av. Brg. Faria Lima, 2232 - Jardim Paulistano' },
  { id: 'shop_eldorado', name: 'Shopping Eldorado', subtitle: 'São Paulo - SP · Av. Rebouças, Pinheiros', city: 'São Paulo', state: 'SP', lat: -23.5721, lng: -46.6961, category: 'shopping', address: 'Av. Rebouças, 3970 - Pinheiros' },
  { id: 'shop_patio_paulista', name: 'Shopping Pátio Paulista', subtitle: 'São Paulo - SP · Rua Treze de Maio, Bela Vista / Paraíso', city: 'São Paulo', state: 'SP', lat: -23.5705, lng: -46.6432, category: 'shopping', address: 'R. Treze de Maio, 1947 - Bela Vista' },
  { id: 'shop_center_norte', name: 'Shopping Center Norte', subtitle: 'São Paulo - SP · Travessa Casalbuono, Vila Guilherme', city: 'São Paulo', state: 'SP', lat: -23.5156, lng: -46.6192, category: 'shopping', address: 'Travessa Casalbuono, 120 - Vila Guilherme' },
  { id: 'shop_analia_franco', name: 'Shopping Anália Franco', subtitle: 'São Paulo - SP · Av. Regente Feijó, Tatuapé', city: 'São Paulo', state: 'SP', lat: -23.5592, lng: -46.5621, category: 'shopping', address: 'Av. Reg. Feijó, 1739 - Tatuapé' },
  { id: 'shop_iguatemi_campinas', name: 'Shopping Iguatemi Campinas', subtitle: 'Campinas - SP · Vila Brandina', city: 'Campinas', state: 'SP', lat: -22.8931, lng: -47.0256, category: 'shopping', address: 'Av. Iguatemi, 777 - Vila Brandina' },
  { id: 'shop_parque_dom_pedro', name: 'Parque D. Pedro Shopping', subtitle: 'Campinas - SP · Rod. D. Pedro I, km 137', city: 'Campinas', state: 'SP', lat: -22.8482, lng: -47.0612, category: 'shopping', address: 'Av. Guilherme Campos, 500 - Jardim Santa Genebra' },
  { id: 'shop_praiamar_santos', name: 'Praiamar Shopping Santos', subtitle: 'Santos - SP · Rua Alexandre Martins, Aparecida', city: 'Santos', state: 'SP', lat: -23.9745, lng: -46.3092, category: 'shopping', address: 'R. Alexandre Martins, 80 - Aparecida' },
  { id: 'shop_ribeirao', name: 'Ribeirão Shopping', subtitle: 'Ribeirão Preto - SP · Jardim Califórnia', city: 'Ribeirão Preto', state: 'SP', lat: -21.2062, lng: -47.8172, category: 'shopping', address: 'Av. Cel. Fernando Ferreira Leite, 1540' },

  // Rio de Janeiro
  { id: 'shop_barrashopping', name: 'BarraShopping', subtitle: 'Rio de Janeiro - RJ · Av. das Américas, Barra da Tijuca', city: 'Rio de Janeiro', state: 'RJ', lat: -22.9998, lng: -43.3592, category: 'shopping', address: 'Av. das Américas, 4666 - Barra da Tijuca' },
  { id: 'shop_rio_sul', name: 'Shopping Rio Sul', subtitle: 'Rio de Janeiro - RJ · Rua Lauro Müller, Botafogo', city: 'Rio de Janeiro', state: 'RJ', lat: -22.9572, lng: -43.1782, category: 'shopping', address: 'Rua Lauro Müller, 116 - Botafogo' },
  { id: 'shop_norteshopping', name: 'NorteShopping', subtitle: 'Rio de Janeiro - RJ · Av. Dom Hélder Câmara, Cachambi', city: 'Rio de Janeiro', state: 'RJ', lat: -22.8872, lng: -43.2821, category: 'shopping', address: 'Av. Dom Hélder Câmara, 5474 - Cachambi' },
  { id: 'shop_leblon', name: 'Shopping Leblon', subtitle: 'Rio de Janeiro - RJ · Av. Afrânio de Melo Franco, Leblon', city: 'Rio de Janeiro', state: 'RJ', lat: -22.9832, lng: -43.2182, category: 'shopping', address: 'Av. Afrânio de Melo Franco, 290 - Leblon' },

  // Nordeste (PE / RN / BA / CE)
  { id: 'shop_recife', name: 'Shopping Recife', subtitle: 'Recife - PE · Rua Padre Carapuceiro, Boa Viagem', city: 'Recife', state: 'PE', lat: -8.1182, lng: -34.9045, category: 'shopping', address: 'R. Pe. Carapuceiro, 777 - Boa Viagem' },
  { id: 'shop_riomar_recife', name: 'RioMar Shopping Recife', subtitle: 'Recife - PE · Av. República do Líbano, Pina', city: 'Recife', state: 'PE', lat: -8.0862, lng: -34.8942, category: 'shopping', address: 'Av. República do Líbano, 251 - Pina' },
  { id: 'shop_midway_mall_natal', name: 'Shopping Midway Mall', subtitle: 'Natal - RN · Av. Bernardo Vieira, Tirol', city: 'Natal', state: 'RN', lat: -5.8118, lng: -35.2062, category: 'shopping', address: 'Av. Bernardo Vieira, 3775 - Tirol' },
  { id: 'shop_natal_shopping', name: 'Natal Shopping', subtitle: 'Natal - RN · Av. Senador Salgado Filho, Candelária', city: 'Natal', state: 'RN', lat: -5.8505, lng: -35.2125, category: 'shopping', address: 'Av. Sen. Salgado Filho, 2234 - Candelária' },
  { id: 'shop_salvador', name: 'Salvador Shopping', subtitle: 'Salvador - BA · Av. Tancredo Neves, Caminho das Árvores', city: 'Salvador', state: 'BA', lat: -12.9782, lng: -38.4552, category: 'shopping', address: 'Av. Tancredo Neves, 3133 - Caminho das Árvores' },
  { id: 'shop_da_bahia', name: 'Shopping da Bahia (Antigo Iguatemi Salvador)', subtitle: 'Salvador - BA · Av. ACM, Pituba', city: 'Salvador', state: 'BA', lat: -12.9805, lng: -38.4682, category: 'shopping', address: 'Av. Antônio Carlos Magalhães, 148' },
  { id: 'shop_iguatemi_fortaleza', name: 'Shopping Iguatemi Bosque Fortaleza', subtitle: 'Fortaleza - CE · Edson Queiroz', city: 'Fortaleza', state: 'CE', lat: -3.7552, lng: -38.4891, category: 'shopping', address: 'Av. Washington Soares, 85 - Edson Queiroz' },

  // Minas Gerais, Paraná, Sul e Centro-Oeste
  { id: 'shop_bh', name: 'BH Shopping', subtitle: 'Belo Horizonte - MG · Rod. BR-356, Belvedere', city: 'Belo Horizonte', state: 'MG', lat: -19.9752, lng: -43.9452, category: 'shopping', address: 'Rod. BR-356, 3049 - Belvedere' },
  { id: 'shop_diamond_mall', name: 'DiamondMall', subtitle: 'Belo Horizonte - MG · Av. Olegário Maciel, Lourdes', city: 'Belo Horizonte', state: 'MG', lat: -19.9282, lng: -43.9482, category: 'shopping', address: 'Av. Olegário Maciel, 1600 - Lourdes' },
  { id: 'shop_parkshopping_bsb', name: 'ParkShopping Brasília', subtitle: 'Brasília - DF · SAI/SO Área 6580, Guará', city: 'Brasília', state: 'DF', lat: -15.8345, lng: -47.9552, category: 'shopping', address: 'SAI/SO Área 6580 - Guará' },
  { id: 'shop_mueller_cwb', name: 'Shopping Mueller Curitiba', subtitle: 'Curitiba - PR · Av. Cândido de Abreu, Centro Cívico', city: 'Curitiba', state: 'PR', lat: -25.4208, lng: -49.2692, category: 'shopping', address: 'Av. Cândido de Abreu, 127 - Centro Cívico' },
  { id: 'shop_parkshopping_barigui', name: 'ParkShopping Barigüi', subtitle: 'Curitiba - PR · Rua Prof. Pedro Viriato Parigot de Souza', city: 'Curitiba', state: 'PR', lat: -25.4412, lng: -49.3142, category: 'shopping', address: 'R. Prof. Pedro Viriato Parigot de Souza, 600' },
  { id: 'shop_barrashoppingsul', name: 'BarraShoppingSul', subtitle: 'Porto Alegre - RS · Av. Diário de Notícias, Cristal', city: 'Porto Alegre', state: 'RS', lat: -30.0845, lng: -51.2462, category: 'shopping', address: 'Av. Diário de Notícias, 300 - Cristal' },
  { id: 'shop_flamboyant', name: 'Flamboyant Shopping Center', subtitle: 'Goiânia - GO · Jardim Goiás', city: 'Goiânia', state: 'GO', lat: -16.7092, lng: -49.2356, category: 'shopping', address: 'Av. Dep. Jamel Cecílio, 3300 - Jardim Goiás' }
];

// Cidades Pequenas, Municípios Turísticos e do Interior do Brasil
export const BRAZIL_SMALL_AND_MEDIUM_CITIES: SearchPlaceItem[] = [
  // Interior e Litoral de SP
  { id: 'city_urupes', name: 'Urupês', subtitle: 'São Paulo · Interior Paulista / Noroeste SP', city: 'Urupês', state: 'SP', lat: -21.2018, lng: -49.2902, category: 'small_city' },
  { id: 'city_brotas', name: 'Brotas', subtitle: 'São Paulo · Capital do Ecoturismo e Rafting', city: 'Brotas', state: 'SP', lat: -22.2842, lng: -48.1252, category: 'small_city' },
  { id: 'city_cunha', name: 'Cunha', subtitle: 'São Paulo · Estância Climática / Lavandário / Serra da Bocaina', city: 'Cunha', state: 'SP', lat: -23.0760, lng: -44.9580, category: 'small_city' },
  { id: 'city_campos_do_jordao', name: 'Campos do Jordão', subtitle: 'São Paulo · Suíça Brasileira / Serra da Mantiqueira', city: 'Campos do Jordão', state: 'SP', lat: -22.7394, lng: -45.5914, category: 'small_city' },
  { id: 'city_holambra', name: 'Holambra', subtitle: 'São Paulo · Cidade das Flores / Colonização Holandesa', city: 'Holambra', state: 'SP', lat: -22.6322, lng: -47.0542, category: 'small_city' },
  { id: 'city_sao_bento_sapucai', name: 'São Bento do Sapucaí', subtitle: 'São Paulo · Pedra do Baú / Serra da Mantiqueira', city: 'São Bento do Sapucaí', state: 'SP', lat: -22.6882, lng: -45.7321, category: 'small_city' },
  { id: 'city_ilhabela', name: 'Ilhabela', subtitle: 'São Paulo · Litoral Norte / Capital da Vela', city: 'Ilhabela', state: 'SP', lat: -23.7782, lng: -45.3582, category: 'small_city' },
  { id: 'city_sao_sebastiao', name: 'São Sebastião', subtitle: 'São Paulo · Litoral Norte / Maresias e Juquehy', city: 'São Sebastião', state: 'SP', lat: -23.7602, lng: -45.4092, category: 'small_city' },
  { id: 'city_ubatuba', name: 'Ubatuba', subtitle: 'São Paulo · Litoral Norte / Capital do Surfe', city: 'Ubatuba', state: 'SP', lat: -23.4339, lng: -45.0838, category: 'small_city' },
  { id: 'city_aguas_de_lindoia', name: 'Águas de Lindóia', subtitle: 'São Paulo · Circuito das Águas Paulista', city: 'Águas de Lindóia', state: 'SP', lat: -22.4762, lng: -46.6321, category: 'small_city' },
  { id: 'city_serra_negra', name: 'Serra Negra', subtitle: 'São Paulo · Estância Hidromineral', city: 'Serra Negra', state: 'SP', lat: -22.6121, lng: -46.7012, category: 'small_city' },
  { id: 'city_atibaia', name: 'Atibaia', subtitle: 'São Paulo · Pedra Grande / Cidade dos Morangos', city: 'Atibaia', state: 'SP', lat: -23.1172, lng: -46.5502, category: 'small_city' },

  // Rio de Janeiro
  { id: 'city_paraty', name: 'Paraty', subtitle: 'Rio de Janeiro · Costa Verde / Patrimônio Histórico UNESCO', city: 'Paraty', state: 'RJ', lat: -23.2178, lng: -44.7152, category: 'small_city' },
  { id: 'city_penedo', name: 'Penedo (Itatiaia)', subtitle: 'Rio de Janeiro · Pequena Finlândia / Serra da Mantiqueira', city: 'Itatiaia', state: 'RJ', lat: -22.4412, lng: -44.5262, category: 'small_city' },
  { id: 'city_angra_dos_reis', name: 'Angra dos Reis', subtitle: 'Rio de Janeiro · Costa Verde / Ilha Grande', city: 'Angra dos Reis', state: 'RJ', lat: -23.0067, lng: -44.3181, category: 'small_city' },
  { id: 'city_petropolis', name: 'Petrópolis', subtitle: 'Rio de Janeiro · Cidade Imperial / Região Serrana', city: 'Petrópolis', state: 'RJ', lat: -22.5050, lng: -43.1789, category: 'small_city' },
  { id: 'city_teresopolis', name: 'Teresópolis', subtitle: 'Rio de Janeiro · Serra dos Órgãos / Dedo de Deus', city: 'Teresópolis', state: 'RJ', lat: -22.4122, lng: -42.9662, category: 'small_city' },
  { id: 'city_buzios', name: 'Armação dos Búzios', subtitle: 'Rio de Janeiro · Região dos Lagos / Rua das Pedras', city: 'Armação dos Búzios', state: 'RJ', lat: -22.7562, lng: -41.8892, category: 'small_city' },
  { id: 'city_cabo_frio', name: 'Cabo Frio', subtitle: 'Rio de Janeiro · Região dos Lagos / Praia do Forte', city: 'Cabo Frio', state: 'RJ', lat: -22.8805, lng: -42.0192, category: 'small_city' },

  // Minas Gerais
  { id: 'city_tiradentes', name: 'Tiradentes', subtitle: 'Minas Gerais · Cidade Histórica Barroca', city: 'Tiradentes', state: 'MG', lat: -21.1102, lng: -44.1752, category: 'small_city' },
  { id: 'city_ouro_preto', name: 'Ouro Preto', subtitle: 'Minas Gerais · Patrimônio Cultural da Humanidade', city: 'Ouro Preto', state: 'MG', lat: -20.3856, lng: -43.5034, category: 'small_city' },
  { id: 'city_sao_joao_del_rei', name: 'São João del-Rei', subtitle: 'Minas Gerais · Estrada Real / Maria Fumaça', city: 'São João del-Rei', state: 'MG', lat: -21.1356, lng: -44.2612, category: 'small_city' },
  { id: 'city_diamantina', name: 'Diamantina', subtitle: 'Minas Gerais · Vale do Jequitinhonha / Vesperata', city: 'Diamantina', state: 'MG', lat: -18.2432, lng: -43.6032, category: 'small_city' },
  { id: 'city_monte_verde', name: 'Monte Verde (Camanducaia)', subtitle: 'Minas Gerais · Suíça Mineira / Serra da Mantiqueira', city: 'Camanducaia', state: 'MG', lat: -22.8612, lng: -46.0352, category: 'small_city' },
  { id: 'city_pocos_de_caldas', name: 'Poços de Caldas', subtitle: 'Minas Gerais · Sul de Minas / Estância Hidromineral', city: 'Poços de Caldas', state: 'MG', lat: -21.7892, lng: -46.5621, category: 'small_city' },
  { id: 'city_pouso_alegre', name: 'Pouso Alegre', subtitle: 'Minas Gerais · Sul de Minas / Polo Industrial', city: 'Pouso Alegre', state: 'MG', lat: -22.2302, lng: -45.9362, category: 'small_city' },

  // Paraná & Sul
  { id: 'city_pato_branco', name: 'Pato Branco', subtitle: 'Paraná · Sudoeste Paranaense / Polo Tecnológico', city: 'Pato Branco', state: 'PR', lat: -26.2285, lng: -52.6708, category: 'small_city' },
  { id: 'city_francisco_beltrao', name: 'Francisco Beltrão', subtitle: 'Paraná · Sudoeste Paranaense', city: 'Francisco Beltrão', state: 'PR', lat: -26.0792, lng: -53.0542, category: 'small_city' },
  { id: 'city_foz_do_iguacu', name: 'Foz do Iguaçu', subtitle: 'Paraná · Cataratas do Iguaçu / Tríplice Fronteira', city: 'Foz do Iguaçu', state: 'PR', lat: -25.5469, lng: -54.5882, category: 'small_city' },
  { id: 'city_cascavel', name: 'Cascavel', subtitle: 'Paraná · Oeste Paranaense', city: 'Cascavel', state: 'PR', lat: -24.9578, lng: -53.4592, category: 'small_city' },
  { id: 'city_maringa', name: 'Maringá', subtitle: 'Paraná · Cidade Canção / Norte do Paraná', city: 'Maringá', state: 'PR', lat: -23.4205, lng: -51.9331, category: 'small_city' },
  { id: 'city_londrina', name: 'Londrina', subtitle: 'Paraná · Pequena Londres / Norte do Paraná', city: 'Londrina', state: 'PR', lat: -23.3103, lng: -51.1628, category: 'small_city' },
  { id: 'city_gramado', name: 'Gramado', subtitle: 'Rio Grande do Sul · Serra Gaúcha / Natal Luz', city: 'Gramado', state: 'RS', lat: -29.3789, lng: -50.8742, category: 'small_city' },
  { id: 'city_canela', name: 'Canela', subtitle: 'Rio Grande do Sul · Serra Gaúcha / Cascata do Caracol', city: 'Canela', state: 'RS', lat: -29.3621, lng: -50.8122, category: 'small_city' },
  { id: 'city_bento_goncalves', name: 'Bento Gonçalves', subtitle: 'Rio Grande do Sul · Vale dos Vinhedos / Capital do Vinho', city: 'Bento Gonçalves', state: 'RS', lat: -29.1692, lng: -51.5182, category: 'small_city' },
  { id: 'city_balneario_camboriu', name: 'Balneário Camboriú', subtitle: 'Santa Catarina · Dubai Brasileira / Litoral Norte SC', city: 'Balneário Camboriú', state: 'SC', lat: -26.9922, lng: -48.6352, category: 'small_city' },
  { id: 'city_blumenau', name: 'Blumenau', subtitle: 'Santa Catarina · Vale Europeu / Oktoberfest', city: 'Blumenau', state: 'SC', lat: -26.9194, lng: -49.0661, category: 'small_city' },
  { id: 'city_joinville', name: 'Joinville', subtitle: 'Santa Catarina · Cidade das Flores e da Dança', city: 'Joinville', state: 'SC', lat: -26.3045, lng: -48.8487, category: 'small_city' },

  // Nordeste, Norte & Centro-Oeste
  { id: 'city_sobral', name: 'Sobral', subtitle: 'Ceará · Princesa do Norte / Polo Universitário', city: 'Sobral', state: 'CE', lat: -3.6890, lng: -40.3520, category: 'small_city' },
  { id: 'city_juazeiro_do_norte', name: 'Juazeiro do Norte', subtitle: 'Ceará · Terra de Padre Cícero / Região do Cariri', city: 'Juazeiro do Norte', state: 'CE', lat: -7.2130, lng: -39.3150, category: 'small_city' },
  { id: 'city_jericoacoara', name: 'Jijoca de Jericoacoara', subtitle: 'Ceará · Duna do Pôr do Sol / Paraíso Ecológico', city: 'Jijoca de Jericoacoara', state: 'CE', lat: -2.7952, lng: -40.5142, category: 'small_city' },
  { id: 'city_caruaru', name: 'Caruaru', subtitle: 'Pernambuco · Capital do Forró / Feira de Caruaru', city: 'Caruaru', state: 'PE', lat: -8.2831, lng: -35.9761, category: 'small_city' },
  { id: 'city_garanhuns', name: 'Garanhuns', subtitle: 'Pernambuco · Cidade das Flores / Festival de Inverno', city: 'Garanhuns', state: 'PE', lat: -8.8902, lng: -36.4921, category: 'small_city' },
  { id: 'city_petrolina', name: 'Petrolina', subtitle: 'Pernambuco · Vale do São Francisco / Fruticultura Irrigada', city: 'Petrolina', state: 'PE', lat: -9.3982, lng: -40.5005, category: 'small_city' },
  { id: 'city_porto_galinhas', name: 'Porto de Galinhas (Ipojuca)', subtitle: 'Pernambuco · Piscinas Naturais / Litoral Sul PE', city: 'Ipojuca', state: 'PE', lat: -8.5032, lng: -35.0062, category: 'small_city' },
  { id: 'city_mossoro', name: 'Mossoró', subtitle: 'Rio Grande do Norte · Capital do Petróleo e Sal / Oeste RN', city: 'Mossoró', state: 'RN', lat: -5.1878, lng: -37.3442, category: 'small_city' },
  { id: 'city_pipa', name: 'Praia da Pipa (Tibau do Sul)', subtitle: 'Rio Grande do Norte · Litoral Sul Potiguar / Golfinhos', city: 'Tibau do Sul', state: 'RN', lat: -6.2292, lng: -35.0482, category: 'small_city' },
  { id: 'city_caico', name: 'Caicó', subtitle: 'Rio Grande do Norte · Capital do Seridó', city: 'Caicó', state: 'RN', lat: -6.4582, lng: -37.0982, category: 'small_city' },
  { id: 'city_campina_grande', name: 'Campina Grande', subtitle: 'Paraíba · Maior São João do Mundo / Polo Tecnológico', city: 'Campina Grande', state: 'PB', lat: -7.2247, lng: -35.8811, category: 'small_city' },
  { id: 'city_ilheus', name: 'Ilhéus', subtitle: 'Bahia · Terra de Jorge Amado / Costa do Cacau', city: 'Ilhéus', state: 'BA', lat: -14.7932, lng: -39.0462, category: 'small_city' },
  { id: 'city_porto_seguro', name: 'Porto Seguro', subtitle: 'Bahia · Costa do Descobrimento', city: 'Porto Seguro', state: 'BA', lat: -16.4498, lng: -39.0645, category: 'small_city' },
  { id: 'city_trancoso', name: 'Trancoso', subtitle: 'Bahia · Quadrado Histórico / Litoral Sul da Bahia', city: 'Porto Seguro', state: 'BA', lat: -16.5912, lng: -39.0982, category: 'small_city' },
  { id: 'city_caldas_novas', name: 'Caldas Novas', subtitle: 'Goiás · Maior Estância Hidrotermal do Mundo', city: 'Caldas Novas', state: 'GO', lat: -17.7442, lng: -48.6252, category: 'small_city' },
  { id: 'city_pirenopolis', name: 'Pirenópolis', subtitle: 'Goiás · Cidade Histórica / Cachoeiras', city: 'Pirenópolis', state: 'GO', lat: -15.8522, lng: -48.9592, category: 'small_city' },
  { id: 'city_bonito', name: 'Bonito', subtitle: 'Mato Grosso do Sul · Capital do Ecoturismo Mundial', city: 'Bonito', state: 'MS', lat: -21.1256, lng: -56.4821, category: 'small_city' },
  { id: 'city_chapada_guimaraes', name: 'Chapada dos Guimarães', subtitle: 'Mato Grosso · Parque Nacional / Mirantes e Cachoeiras', city: 'Chapada dos Guimarães', state: 'MT', lat: -15.4612, lng: -55.7492, category: 'small_city' }
];

// Postos da Polícia Rodoviária Federal (PRF) along major federal highways
export const PRF_HIGHWAY_STATIONS: PrfStation[] = [
  // BR-116 Dutra (SP / RJ)
  {
    id: 'prf_dutra_aruja',
    name: 'Posto PRF Arujá',
    highway: 'BR-116 (Rod. Presidente Dutra)',
    km: 204,
    state: 'SP',
    city: 'Arujá',
    lat: -23.3912,
    lng: -46.3198,
    emergencyPhone: '191',
    services: ['Fiscalização 24h', 'Balança de Carga', 'Atendimento de Emergência PRF 191', 'Ponto de Apoio']
  },
  {
    id: 'prf_dutra_taubate',
    name: 'Posto PRF Taubaté / Roseira',
    highway: 'BR-116 (Rod. Presidente Dutra)',
    km: 84,
    state: 'SP',
    city: 'Roseira',
    lat: -22.9102,
    lng: -45.3192,
    emergencyPhone: '191',
    services: ['Fiscalização de Velocidade', 'Atendimento de Acidentes', 'Plantão PRF 191']
  },
  {
    id: 'prf_dutra_resende',
    name: 'Posto PRF Resende / Itatiaia',
    highway: 'BR-116 (Rod. Presidente Dutra)',
    km: 311,
    state: 'RJ',
    city: 'Resende',
    lat: -22.4792,
    lng: -44.4712,
    emergencyPhone: '191',
    services: ['Posto Operacional de Fronteira SP/RJ', 'Fiscalização de Cargas Perigosas', 'Socorro 191']
  },
  {
    id: 'prf_dutra_seropedica',
    name: 'Delegacia PRF Seropédica',
    highway: 'BR-116 (Rod. Presidente Dutra)',
    km: 207,
    state: 'RJ',
    city: 'Seropédica',
    lat: -22.7612,
    lng: -43.7089,
    emergencyPhone: '191',
    services: ['Delegacia Metropolitana', 'Rondas Táticas Ostensivas', 'Plantão 24h 191']
  },

  // BR-116 Régis Bittencourt (SP / PR)
  {
    id: 'prf_regis_juquia',
    name: 'Posto PRF Juquiá',
    highway: 'BR-116 (Rod. Régis Bittencourt)',
    km: 426,
    state: 'SP',
    city: 'Juquiá',
    lat: -24.3182,
    lng: -47.6412,
    emergencyPhone: '191',
    services: ['Fiscalização Serra do Cafezal', 'Resgate e Apoio Rodoviário 191']
  },
  {
    id: 'prf_regis_cajati',
    name: 'Posto PRF Cajati',
    highway: 'BR-116 (Rod. Régis Bittencourt)',
    km: 489,
    state: 'SP',
    city: 'Cajati',
    lat: -24.7412,
    lng: -48.1292,
    emergencyPhone: '191',
    services: ['Posto de Fiscalização 24h', 'Apoio ao Caminhoneiro']
  },
  {
    id: 'prf_regis_campina_grande_sul',
    name: 'Posto PRF Campina Grande do Sul',
    highway: 'BR-116 (Rod. Régis Bittencourt)',
    km: 55,
    state: 'PR',
    city: 'Campina Grande do Sul',
    lat: -25.2891,
    lng: -49.0682,
    emergencyPhone: '191',
    services: ['Entrada Metropolitana de Curitiba', 'Fiscalização de Veículos 191']
  },

  // BR-381 Fernão Dias (SP / MG)
  {
    id: 'prf_fernao_atibaia',
    name: 'Posto PRF Atibaia',
    highway: 'BR-381 (Rod. Fernão Dias)',
    km: 45,
    state: 'SP',
    city: 'Atibaia',
    lat: -23.1192,
    lng: -46.5512,
    emergencyPhone: '191',
    services: ['Fiscalização de Tráfego', 'Apoio Operacional 191']
  },
  {
    id: 'prf_fernao_pouso_alegre',
    name: 'Delegacia PRF Pouso Alegre',
    highway: 'BR-381 (Rod. Fernão Dias)',
    km: 871,
    state: 'MG',
    city: 'Pouso Alegre',
    lat: -22.2392,
    lng: -45.9281,
    emergencyPhone: '191',
    services: ['Delegacia Regional Sul de Minas', 'Fiscalização e Resgate']
  },
  {
    id: 'prf_fernao_betim',
    name: 'Posto PRF Betim',
    highway: 'BR-381 (Rod. Fernão Dias)',
    km: 498,
    state: 'MG',
    city: 'Betim',
    lat: -19.9812,
    lng: -44.1892,
    emergencyPhone: '191',
    services: ['Acesso a Região Metropolitana de BH', 'Fiscalização 24h 191']
  },

  // BR-040 (RJ / MG / DF)
  {
    id: 'prf_br040_petropolis',
    name: 'Posto PRF Petrópolis',
    highway: 'BR-040',
    km: 85,
    state: 'RJ',
    city: 'Petrópolis',
    lat: -22.4892,
    lng: -43.1912,
    emergencyPhone: '191',
    services: ['Serra de Petrópolis', 'Socorro e Fiscalização 191']
  },
  {
    id: 'prf_br040_juiz_fora',
    name: 'Posto PRF Juiz de Fora',
    highway: 'BR-040',
    km: 766,
    state: 'MG',
    city: 'Juiz de Fora',
    lat: -21.7892,
    lng: -43.3492,
    emergencyPhone: '191',
    services: ['Divisa RJ/MG', 'Fiscalização de Cargas']
  },
  {
    id: 'prf_br040_cristalina',
    name: 'Posto PRF Cristalina',
    highway: 'BR-040',
    km: 98,
    state: 'GO',
    city: 'Cristalina',
    lat: -16.7591,
    lng: -47.6112,
    emergencyPhone: '191',
    services: ['Entrada do Distrito Federal', 'Fiscalização Rodoviária 191']
  },

  // BR-101 / BR-324 Nordeste (BA / PE / RN)
  {
    id: 'prf_br324_simoes_filho',
    name: 'Posto PRF Simões Filho',
    highway: 'BR-324',
    km: 604,
    state: 'BA',
    city: 'Simões Filho',
    lat: -12.7912,
    lng: -38.4102,
    emergencyPhone: '191',
    services: ['Saída de Salvador', 'Fiscalização Integrada 191']
  },
  {
    id: 'prf_br101_recife',
    name: 'Delegacia PRF Recife / Igarassu',
    highway: 'BR-101',
    km: 43,
    state: 'PE',
    city: 'Igarassu',
    lat: -7.8341,
    lng: -34.9082,
    emergencyPhone: '191',
    services: ['Arco Metropolitano do Recife', 'Policiamento Ostensivo 191']
  },
  {
    id: 'prf_br101_natal',
    name: 'Posto PRF Natal / São José de Mipibu',
    highway: 'BR-101',
    km: 118,
    state: 'RN',
    city: 'São José de Mipibu',
    lat: -6.0712,
    lng: -35.2392,
    emergencyPhone: '191',
    services: ['Acesso Sul a Natal', 'Atendimento de Acidentes 191']
  }
];

// Well-known Brazilian Postal Code (CEP) regions with accurate centroid coordinates
export const SAMPLE_CEP_LOOKUP: Record<string, { city: string; state: string; address: string; lat: number; lng: number }> = {
  // São Paulo
  '01310-100': { city: 'São Paulo', state: 'SP', address: 'Avenida Paulista (Bela Vista)', lat: -23.5658, lng: -46.6519 },
  '01310100': { city: 'São Paulo', state: 'SP', address: 'Avenida Paulista (Bela Vista)', lat: -23.5658, lng: -46.6519 },
  '02011-000': { city: 'São Paulo', state: 'SP', address: 'Avenida Cruzeiro do Sul (Rodoviária Tietê)', lat: -23.5162, lng: -46.6253 },
  '01001-000': { city: 'São Paulo', state: 'SP', address: 'Praça da Sé (Centro Histórico)', lat: -23.5505, lng: -46.6333 },
  '07190-100': { city: 'Guarulhos', state: 'SP', address: 'Aeroporto Internacional de Guarulhos', lat: -23.4356, lng: -46.4731 },
  '11010-010': { city: 'Santos', state: 'SP', address: 'Porto de Santos / Centro', lat: -23.9608, lng: -46.3336 },
  
  // Rio de Janeiro
  '20040-002': { city: 'Rio de Janeiro', state: 'RJ', address: 'Avenida Rio Branco (Centro)', lat: -22.9068, lng: -43.1729 },
  '20220-300': { city: 'Rio de Janeiro', state: 'RJ', address: 'Avenida Francisco Bicalho (Rodoviária Novo Rio)', lat: -22.8988, lng: -43.2096 },
  '22041-001': { city: 'Rio de Janeiro', state: 'RJ', address: 'Avenida Atlântica (Copacabana)', lat: -22.9698, lng: -43.1802 },

  // Recife
  '50030-000': { city: 'Recife', state: 'PE', address: 'Praça Rio Branco (Marco Zero / Recife Antigo)', lat: -8.0631, lng: -34.8711 },
  '50030000': { city: 'Recife', state: 'PE', address: 'Praça Rio Branco (Marco Zero / Recife Antigo)', lat: -8.0631, lng: -34.8711 },
  '51020-000': { city: 'Recife', state: 'PE', address: 'Avenida Boa Viagem (Boa Viagem)', lat: -8.1189, lng: -34.8985 },

  // Natal
  '59090-000': { city: 'Natal', state: 'RN', address: 'Avenida Engenheiro Roberto Freire (Ponta Negra)', lat: -5.8794, lng: -35.1764 },
  '59090000': { city: 'Natal', state: 'RN', address: 'Avenida Engenheiro Roberto Freire (Ponta Negra)', lat: -5.8794, lng: -35.1764 },
  '59010-000': { city: 'Natal', state: 'RN', address: 'Praia do Meio / Forte dos Reis Magos', lat: -5.7571, lng: -35.1953 },

  // Curitiba
  '80020-000': { city: 'Curitiba', state: 'PR', address: 'Rua XV de Novembro (Calçadão / Centro)', lat: -25.4284, lng: -49.2733 },
  '80210-370': { city: 'Curitiba', state: 'PR', address: 'Avenida Prefeito Lothário Meissner (Jardim Botânico)', lat: -25.4428, lng: -49.2394 },

  // Belo Horizonte
  '30130-110': { city: 'Belo Horizonte', state: 'MG', address: 'Praça da Liberdade (Savassi)', lat: -19.9321, lng: -43.9378 },
  
  // Brasília
  '70050-000': { city: 'Brasília', state: 'DF', address: 'Esplanada dos Ministérios (Zona Cívico-Administrativa)', lat: -15.7998, lng: -47.8645 }
};

// CEP Regex Matcher
export const CEP_REGEX = /^\d{5}-?\d{3}$/;

// Coordinates Regex Matcher (detects formats like: -23.5505, -46.6333 or -23.5505 -46.6333)
export const COORD_REGEX = /^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/;

// Parse user input into coordinates if matches coordinate pattern
export function parseCoordinatesInput(input: string): { lat: number; lng: number } | null {
  const trimmed = input.trim();
  const match = trimmed.match(COORD_REGEX);
  if (!match?.[1] || !match?.[2]) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  // Valid geographic latitude and longitude bounds for Brazil and worldwide
  if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    return { lat, lng };
  }
  return null;
}

// Normalize text for diacritic-insensitive search
export function normalizeSearchQuery(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Smart Search Function: parses coordinates, CEPs, landmarks/POI, and cities
export function searchPlacesAndPoi(query: string): SearchPlaceItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results: SearchPlaceItem[] = [];

  // 1. Check if user typed direct GPS Coordinates
  const coords = parseCoordinatesInput(trimmed);
  if (coords) {
    results.push({
      id: `coord_${coords.lat}_${coords.lng}`,
      name: `Coordenadas GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      subtitle: `Localização geográfica direta inserida por latitude e longitude`,
      city: 'Coordenadas Personalizadas',
      state: 'GPS',
      lat: coords.lat,
      lng: coords.lng,
      category: 'coordinates'
    });
  }

  // 2. Check if user typed a Brazilian Postal Code (CEP)
  const cleanCep = trimmed.replace(/\D/g, '');
  if (cleanCep.length >= 5) {
    const formattedCepWithHyphen = cleanCep.length === 8 ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}` : cleanCep;
    
    // Check known dictionary
    const matchLookup = SAMPLE_CEP_LOOKUP[formattedCepWithHyphen] || SAMPLE_CEP_LOOKUP[cleanCep];
    if (matchLookup) {
      results.push({
        id: `cep_${cleanCep}`,
        name: `CEP ${formattedCepWithHyphen}`,
        subtitle: `${matchLookup.address}, ${matchLookup.city} - ${matchLookup.state}`,
        city: matchLookup.city,
        state: matchLookup.state,
        lat: matchLookup.lat,
        lng: matchLookup.lng,
        category: 'cep',
        cep: formattedCepWithHyphen,
        address: matchLookup.address
      });
    } else if (cleanCep.length === 8) {
      // Estimate approximate centroid based on state CEP range
      const firstDigit = cleanCep[0];
      let state = 'SP';
      let city = 'São Paulo';
      let lat = -23.5505;
      let lng = -46.6333;

      if (firstDigit === '2') { state = 'RJ'; city = 'Rio de Janeiro'; lat = -22.9068; lng = -43.1729; }
      else if (firstDigit === '3') { state = 'MG'; city = 'Belo Horizonte'; lat = -19.9167; lng = -43.9345; }
      else if (firstDigit === '4') { state = 'BA'; city = 'Salvador'; lat = -12.9777; lng = -38.5016; }
      else if (firstDigit === '5') {
        if (cleanCep.startsWith('59')) { state = 'RN'; city = 'Natal'; lat = -5.7945; lng = -35.2110; }
        else { state = 'PE'; city = 'Recife'; lat = -8.0476; lng = -34.8770; }
      }
      else if (firstDigit === '7') { state = 'DF'; city = 'Brasília'; lat = -15.7975; lng = -47.8919; }
      else if (firstDigit === '8') { state = 'PR'; city = 'Curitiba'; lat = -25.4284; lng = -49.2733; }
      else if (firstDigit === '9') { state = 'RS'; city = 'Porto Alegre'; lat = -30.0346; lng = -51.2177; }

      results.push({
        id: `cep_est_${cleanCep}`,
        name: `CEP ${formattedCepWithHyphen}`,
        subtitle: `Localização aproximada em ${city} - ${state}`,
        city,
        state,
        lat,
        lng,
        category: 'cep',
        cep: formattedCepWithHyphen
      });
    }
  }

  // 3. Search in Prefeituras, Shoppings, Small Cities, POI and Main Cities
  const normalizedQuery = normalizeSearchQuery(trimmed);
  const rawTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
  const stopWords = new Set(['do', 'da', 'de', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'para', 'com', 'e', 'o', 'a']);
  const tokens = rawTokens.length > 1 ? rawTokens.filter(t => !stopWords.has(t)) : rawTokens;
  const effectiveTokens = tokens.length > 0 ? tokens : rawTokens;

  const matchesAllTokens = (corpus: string) => {
    return effectiveTokens.every(token => corpus.includes(token));
  };

  // Combine all comprehensive data sources
  const ALL_SEARCH_ITEMS: SearchPlaceItem[] = [
    ...BRAZIL_PREFEITURAS,
    ...BRAZIL_SHOPPINGS,
    ...BRAZIL_SMALL_AND_MEDIUM_CITIES,
    ...BRAZIL_LANDMARKS_AND_POI,
    ...BRAZIL_MAIN_CITIES
  ];

  const matchedEntries: { item: SearchPlaceItem; score: number }[] = [];

  for (const item of ALL_SEARCH_ITEMS) {
    const normName = normalizeSearchQuery(item.name);
    const normCity = normalizeSearchQuery(item.city);
    const normSub = normalizeSearchQuery(item.subtitle);
    const normAddress = item.address ? normalizeSearchQuery(item.address) : '';
    const fullCorpus = `${normName} ${normCity} ${item.state.toLowerCase()} ${normSub} ${normAddress}`;
    
    // Words of the item name
    const nameWords = normName.split(/[\s,()/-]+/).filter(w => w.length > 0);

    let score = 0;

    // Highest Priority: Exact match
    if (normName === normalizedQuery || normCity === normalizedQuery) {
      score = 120;
    }
    // High Priority: Name or City starts with query (active typing down to every letter)
    else if (normName.startsWith(normalizedQuery) || normCity.startsWith(normalizedQuery)) {
      score = 100;
    }
    // Any individual word starts with query (e.g. typing "morumbi" matches "Morumbi Shopping", "paulista" matches "Shopping Pátio Paulista")
    else if (nameWords.some(w => w.startsWith(normalizedQuery))) {
      score = 90;
    }
    // Substring inside name
    else if (normName.includes(normalizedQuery)) {
      score = 80;
    }
    // All tokens match in name
    else if (matchesAllTokens(normName)) {
      score = 75;
    }
    // Substring in address or subtitle or city
    else if (normAddress.includes(normalizedQuery) || normSub.includes(normalizedQuery) || normCity.includes(normalizedQuery)) {
      score = 65;
    }
    // All tokens match anywhere in full corpus
    else if (matchesAllTokens(fullCorpus)) {
      score = 50;
    }

    if (score > 0) {
      matchedEntries.push({ item, score });
    }
  }

  // Sort by score descending
  matchedEntries.sort((a, b) => b.score - a.score);

  for (const entry of matchedEntries) {
    if (!results.some(r => r.id === entry.item.id)) {
      results.push(entry.item);
    }
  }

  return results.slice(0, 10);
}

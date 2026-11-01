// Dados reais importados do sistema Casa Clara (secoes A-D do arquivo de referencia).
// Valores em centavos inteiros. Nao editar manualmente.

export interface SeedAnnual { sourceId: string; id: string; position: number; creditor: string; dueDay: number | null; months: (number | null)[] }
export interface SeedBill { id: string; creditor: string; description: string | null; dueDate: string; expectedCents: number; paidDate: string | null; paidCents: number | null; paidNote: string | null; sourceAnnualId: string; sourcePeriod: string; contractId: string | null; installmentNumber: number | null }
export interface SeedContract { id: string; name: string; description: string; source_sheet: string; archived_at: string | null; details: Record<string, number> }
export interface SeedInstallment { contractId: string; number: number; expectedCents: number; dueDate: string; paidDate: string | null; paidCents: number | null; note: string | null }

export const SEED_YEAR = 2026;
export const SEED_YEAR_SOURCE = "Cópia de Controle FINANCEIRO (1).xlsx | origem das dividas BANCO DE DAD | A1:N15";

export const SEED_ANNUAL: SeedAnnual[] = [
  {
    "sourceId": "6ca3ec0dfa8caa1317dc5cce",
    "id": "707f9180-9265-5d98-919a-f7fae025220f",
    "position": 0,
    "creditor": "Emprestimo C6 Bank",
    "dueDay": 13,
    "months": [
      135976,
      136068,
      136068,
      136068,
      136068,
      135422,
      135514,
      136068,
      136068,
      136068,
      136068,
      136068
    ]
  },
  {
    "sourceId": "09ca6e9fa3b447e5402a0cff",
    "id": "080c871e-e612-56b3-92d8-2c882d88d27f",
    "position": 1,
    "creditor": "Emprestimo Caixa",
    "dueDay": 7,
    "months": [
      50720,
      50720,
      50720,
      50720,
      50720,
      50720,
      50720,
      50720,
      50720,
      50720,
      50720,
      50720
    ]
  },
  {
    "sourceId": "38288f594126cbeb52343075",
    "id": "5e4c7b3c-911b-5de7-8bfc-4859bb7a9d96",
    "position": 2,
    "creditor": "Cartão C6 Bank",
    "dueDay": 10,
    "months": [
      176569,
      163704,
      150606,
      143631,
      343261,
      146608,
      261858,
      0,
      229238,
      222617,
      210603,
      95182
    ]
  },
  {
    "sourceId": "6519620eb10280ec3c4d2bb9",
    "id": "0a5410f2-47f7-52b0-be74-2a5fabb72490",
    "position": 3,
    "creditor": "Cartão Caixa",
    "dueDay": 13,
    "months": [
      140678,
      83779,
      120442,
      151800,
      101830,
      90064,
      217500,
      135875,
      150371,
      141887,
      144012,
      38673
    ]
  },
  {
    "sourceId": "6622731dd775c0c0b0507cac",
    "id": "699b29b0-7aef-5c5e-991a-bcd90abedebf",
    "position": 4,
    "creditor": "Cartão Nubank",
    "dueDay": 14,
    "months": [
      127992,
      48702,
      35956,
      19717,
      30713,
      19691,
      134020,
      42800,
      47149,
      35332,
      69756,
      12023
    ]
  },
  {
    "sourceId": "c1a7f99adbe8c0f03f688d8b",
    "id": "f6657c82-d314-5ef1-8761-aa52f367799f",
    "position": 5,
    "creditor": "Cartão Casa Bahia",
    "dueDay": 20,
    "months": [
      2500,
      16623,
      87164,
      67107,
      23686,
      137469,
      196316,
      205179,
      166480,
      72422,
      40484,
      944
    ]
  },
  {
    "sourceId": "cf126f9554bdbfa060a9d262",
    "id": "b82b6eda-afc0-5193-8a4d-5833cd23ce64",
    "position": 6,
    "creditor": "Negociação Porto",
    "dueDay": 3,
    "months": [
      0,
      0,
      0,
      0,
      0,
      0,
      17142,
      17236,
      17236,
      17236,
      17236,
      17236
    ]
  },
  {
    "sourceId": "e0eed20ce07aef26f24cec08",
    "id": "bd8e6354-95a8-5420-8e20-48542da5c651",
    "position": 7,
    "creditor": "Negociação Inter",
    "dueDay": 11,
    "months": [
      0,
      0,
      0,
      0,
      0,
      19808,
      46105,
      46105,
      46105,
      46105,
      46105,
      46105
    ]
  },
  {
    "sourceId": "4267c4bdcb6504f43b096458",
    "id": "70ee9cc1-14f8-5e38-b663-768f9beed629",
    "position": 8,
    "creditor": "Caesb",
    "dueDay": 12,
    "months": [
      5504,
      7976,
      7976,
      9132,
      9944,
      10928,
      11264,
      10559,
      10427,
      0,
      0,
      0
    ]
  },
  {
    "sourceId": "cb49b741232a8a5525e0cf0b",
    "id": "7098c9d2-4ad0-562a-95d7-4bf97ab8959d",
    "position": 9,
    "creditor": "Neo Energia",
    "dueDay": 18,
    "months": [
      17610,
      11634,
      16054,
      18726,
      17414,
      409,
      16646,
      19718,
      23466,
      29900,
      0,
      0
    ]
  },
  {
    "sourceId": "554f74bff53136581c157d68",
    "id": "818c8458-9653-595f-bf4c-0723da587cda",
    "position": 10,
    "creditor": "OI",
    "dueDay": 11,
    "months": [
      7987,
      7987,
      8190,
      8135,
      7987,
      7990,
      7990,
      7990,
      8185,
      7990,
      7990,
      7990
    ]
  },
  {
    "sourceId": "aabc131f791e58b24f8bfd88",
    "id": "e3bbff74-6c0d-5009-9295-c3dd0cc93fb7",
    "position": 11,
    "creditor": "IPVA",
    "dueDay": null,
    "months": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  },
  {
    "sourceId": "7505dd3c828f940518c2ff1e",
    "id": "3e7ecd71-8fa8-56b3-bece-7ca92c2f122b",
    "position": 12,
    "creditor": "IPTU",
    "dueDay": null,
    "months": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ]
  }
];

export const SEED_BILLS: SeedBill[] = [
  {
    "id": "annual-c3ba4a5ed2dc18802cd967b1",
    "creditor": "Emprestimo Caixa",
    "description": "Despesa anual · 2026-02",
    "dueDate": "2026-02-07",
    "expectedCents": 50720,
    "paidDate": "2026-02-07",
    "paidCents": 50720,
    "paidNote": null,
    "sourceAnnualId": "080c871e-e612-56b3-92d8-2c882d88d27f",
    "sourcePeriod": "2026-02",
    "contractId": "caixa",
    "installmentNumber": 11
  },
  {
    "id": "annual-40c300cd19b5dd786963b0a6",
    "creditor": "Cartão C6 Bank",
    "description": "Despesa anual · 2026-02",
    "dueDate": "2026-02-10",
    "expectedCents": 163704,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "5e4c7b3c-911b-5de7-8bfc-4859bb7a9d96",
    "sourcePeriod": "2026-02",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-9cf8c5aeb313838804c4490f",
    "creditor": "OI",
    "description": "Despesa anual · 2026-02",
    "dueDate": "2026-02-11",
    "expectedCents": 7987,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "818c8458-9653-595f-bf4c-0723da587cda",
    "sourcePeriod": "2026-02",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-bea5d39be5f1b5d44f9def8a",
    "creditor": "Caesb",
    "description": "Despesa anual · 2026-02",
    "dueDate": "2026-02-12",
    "expectedCents": 7976,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "70ee9cc1-14f8-5e38-b663-768f9beed629",
    "sourcePeriod": "2026-02",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-197c25d30d275d825d5fd71d",
    "creditor": "Cartão Caixa",
    "description": "Despesa anual · 2026-02",
    "dueDate": "2026-02-13",
    "expectedCents": 83779,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "0a5410f2-47f7-52b0-be74-2a5fabb72490",
    "sourcePeriod": "2026-02",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-527069a9f0eca277ed43788c",
    "creditor": "Emprestimo C6 Bank",
    "description": "Despesa anual · 2026-02",
    "dueDate": "2026-02-13",
    "expectedCents": 136068,
    "paidDate": "2026-02-13",
    "paidCents": 136068,
    "paidNote": null,
    "sourceAnnualId": "707f9180-9265-5d98-919a-f7fae025220f",
    "sourcePeriod": "2026-02",
    "contractId": "c6",
    "installmentNumber": 13
  },
  {
    "id": "annual-724c1af971f7404960b282a7",
    "creditor": "Cartão Nubank",
    "description": "Despesa anual · 2026-02",
    "dueDate": "2026-02-14",
    "expectedCents": 48702,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "699b29b0-7aef-5c5e-991a-bcd90abedebf",
    "sourcePeriod": "2026-02",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-5152356f45e15c2750ddf779",
    "creditor": "Neo Energia",
    "description": "Despesa anual · 2026-02",
    "dueDate": "2026-02-18",
    "expectedCents": 11634,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "7098c9d2-4ad0-562a-95d7-4bf97ab8959d",
    "sourcePeriod": "2026-02",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-17e6cfbcdc7fa2fe61df0941",
    "creditor": "Cartão Casa Bahia",
    "description": "Despesa anual · 2026-02",
    "dueDate": "2026-02-20",
    "expectedCents": 16623,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "f6657c82-d314-5ef1-8761-aa52f367799f",
    "sourcePeriod": "2026-02",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-65d6049f81a1a097e3708f89",
    "creditor": "Negociação Porto",
    "description": "Despesa anual · 2026-10",
    "dueDate": "2026-10-03",
    "expectedCents": 17236,
    "paidDate": "2026-10-03",
    "paidCents": 17236,
    "paidNote": "Pago conforme documento",
    "sourceAnnualId": "b82b6eda-afc0-5193-8a4d-5833cd23ce64",
    "sourcePeriod": "2026-10",
    "contractId": "porto",
    "installmentNumber": 4
  },
  {
    "id": "annual-974a3e3eefd9f6bf260ec8fb",
    "creditor": "Emprestimo Caixa",
    "description": "Despesa anual · 2026-10",
    "dueDate": "2026-10-07",
    "expectedCents": 50720,
    "paidDate": "2026-10-07",
    "paidCents": 50720,
    "paidNote": null,
    "sourceAnnualId": "080c871e-e612-56b3-92d8-2c882d88d27f",
    "sourcePeriod": "2026-10",
    "contractId": "caixa",
    "installmentNumber": 19
  },
  {
    "id": "annual-c67323125e34bb3753062049",
    "creditor": "Cartão C6 Bank",
    "description": "Despesa anual · 2026-10",
    "dueDate": "2026-10-10",
    "expectedCents": 222617,
    "paidDate": "2026-10-08",
    "paidCents": 222617,
    "paidNote": null,
    "sourceAnnualId": "5e4c7b3c-911b-5de7-8bfc-4859bb7a9d96",
    "sourcePeriod": "2026-10",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-5ab99e1a35b12eeae78e1606",
    "creditor": "Negociação Inter",
    "description": "Despesa anual · 2026-10",
    "dueDate": "2026-10-11",
    "expectedCents": 46105,
    "paidDate": "2026-10-08",
    "paidCents": 46105,
    "paidNote": null,
    "sourceAnnualId": "bd8e6354-95a8-5420-8e20-48542da5c651",
    "sourcePeriod": "2026-10",
    "contractId": "inter",
    "installmentNumber": 5
  },
  {
    "id": "annual-578737e24776303dc1d92582",
    "creditor": "OI",
    "description": "Despesa anual · 2026-10",
    "dueDate": "2026-10-11",
    "expectedCents": 7990,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "818c8458-9653-595f-bf4c-0723da587cda",
    "sourcePeriod": "2026-10",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-c7208d021bc0fb0d9d2a9d63",
    "creditor": "Cartão Caixa",
    "description": "Despesa anual · 2026-10",
    "dueDate": "2026-10-13",
    "expectedCents": 141887,
    "paidDate": "2026-10-08",
    "paidCents": 141887,
    "paidNote": null,
    "sourceAnnualId": "0a5410f2-47f7-52b0-be74-2a5fabb72490",
    "sourcePeriod": "2026-10",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-05c78edfb76c0db09f4e1cbe",
    "creditor": "Emprestimo C6 Bank",
    "description": "Despesa anual · 2026-10",
    "dueDate": "2026-10-13",
    "expectedCents": 136068,
    "paidDate": "2026-10-06",
    "paidCents": 135422,
    "paidNote": null,
    "sourceAnnualId": "707f9180-9265-5d98-919a-f7fae025220f",
    "sourcePeriod": "2026-10",
    "contractId": "c6",
    "installmentNumber": 21
  },
  {
    "id": "annual-b65ed9bb0ec7d67b740e2e7a",
    "creditor": "Cartão Nubank",
    "description": "Despesa anual · 2026-10",
    "dueDate": "2026-10-14",
    "expectedCents": 35332,
    "paidDate": "2026-10-08",
    "paidCents": 35332,
    "paidNote": null,
    "sourceAnnualId": "699b29b0-7aef-5c5e-991a-bcd90abedebf",
    "sourcePeriod": "2026-10",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-2c21232ebd226c7487141b42",
    "creditor": "Neo Energia",
    "description": "Despesa anual · 2026-10",
    "dueDate": "2026-10-18",
    "expectedCents": 29900,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "7098c9d2-4ad0-562a-95d7-4bf97ab8959d",
    "sourcePeriod": "2026-10",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-0e0b6da8c0ac1234b52c3bc1",
    "creditor": "Cartão Casa Bahia",
    "description": "Despesa anual · 2026-10",
    "dueDate": "2026-10-20",
    "expectedCents": 72422,
    "paidDate": "2026-10-08",
    "paidCents": 72422,
    "paidNote": null,
    "sourceAnnualId": "f6657c82-d314-5ef1-8761-aa52f367799f",
    "sourcePeriod": "2026-10",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-cf2021a5e9834c2c84652881",
    "creditor": "Negociação Porto",
    "description": "Despesa anual · 2026-11",
    "dueDate": "2026-11-03",
    "expectedCents": 17236,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "b82b6eda-afc0-5193-8a4d-5833cd23ce64",
    "sourcePeriod": "2026-11",
    "contractId": "porto",
    "installmentNumber": 5
  },
  {
    "id": "annual-582de71019ad02a8cea30c81",
    "creditor": "Emprestimo Caixa",
    "description": "Despesa anual · 2026-11",
    "dueDate": "2026-11-07",
    "expectedCents": 50720,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "080c871e-e612-56b3-92d8-2c882d88d27f",
    "sourcePeriod": "2026-11",
    "contractId": "caixa",
    "installmentNumber": 20
  },
  {
    "id": "annual-29b1369cf17cab0549780bbf",
    "creditor": "Cartão C6 Bank",
    "description": "Despesa anual · 2026-11",
    "dueDate": "2026-11-10",
    "expectedCents": 210603,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "5e4c7b3c-911b-5de7-8bfc-4859bb7a9d96",
    "sourcePeriod": "2026-11",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-4cc99f90cfedc0a48bd95c9a",
    "creditor": "Negociação Inter",
    "description": "Despesa anual · 2026-11",
    "dueDate": "2026-11-11",
    "expectedCents": 46105,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "bd8e6354-95a8-5420-8e20-48542da5c651",
    "sourcePeriod": "2026-11",
    "contractId": "inter",
    "installmentNumber": 6
  },
  {
    "id": "annual-79aadc397e8e0bd54e3b3092",
    "creditor": "OI",
    "description": "Despesa anual · 2026-11",
    "dueDate": "2026-11-11",
    "expectedCents": 7990,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "818c8458-9653-595f-bf4c-0723da587cda",
    "sourcePeriod": "2026-11",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-c3fa05284fb6f8d48462e982",
    "creditor": "Cartão Caixa",
    "description": "Despesa anual · 2026-11",
    "dueDate": "2026-11-13",
    "expectedCents": 144012,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "0a5410f2-47f7-52b0-be74-2a5fabb72490",
    "sourcePeriod": "2026-11",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-ce2ca46c2034348b2f4f1190",
    "creditor": "Emprestimo C6 Bank",
    "description": "Despesa anual · 2026-11",
    "dueDate": "2026-11-13",
    "expectedCents": 136068,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "707f9180-9265-5d98-919a-f7fae025220f",
    "sourcePeriod": "2026-11",
    "contractId": "c6",
    "installmentNumber": 22
  },
  {
    "id": "annual-925a48bb8ba780f2ca5a2eed",
    "creditor": "Cartão Nubank",
    "description": "Despesa anual · 2026-11",
    "dueDate": "2026-11-14",
    "expectedCents": 69756,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "699b29b0-7aef-5c5e-991a-bcd90abedebf",
    "sourcePeriod": "2026-11",
    "contractId": null,
    "installmentNumber": null
  },
  {
    "id": "annual-6b788b50b6417d33bed68f1f",
    "creditor": "Cartão Casa Bahia",
    "description": "Despesa anual · 2026-11",
    "dueDate": "2026-11-20",
    "expectedCents": 40484,
    "paidDate": null,
    "paidCents": null,
    "paidNote": null,
    "sourceAnnualId": "f6657c82-d314-5ef1-8761-aa52f367799f",
    "sourcePeriod": "2026-11",
    "contractId": null,
    "installmentNumber": null
  }
];

export const SEED_CONTRACTS: SeedContract[] = [
  {
    "id": "c6",
    "name": "Empréstimo C6 Bank",
    "description": "Empréstimo com veículo",
    "source_sheet": "conta parcelada Empréstimo C6 B",
    "archived_at": null,
    "details": {
      "valor_acordo_cents": 3800000
    }
  },
  {
    "id": "caixa",
    "name": "Empréstimo Caixa",
    "description": "Empréstimo Caixa",
    "source_sheet": "conta parcelada EMPRÉSTIMO CAIX",
    "archived_at": null,
    "details": {
      "valor_contratado_cents": 1661000,
      "saldo_quitacao_referencia_cents": 1528447
    }
  },
  {
    "id": "inter",
    "name": "Negociação Inter",
    "description": "Gold Mastercard Inter",
    "source_sheet": "conta parcelada INTER",
    "archived_at": null,
    "details": {
      "valor_original_cents": 1840581,
      "valor_atualizado_cents": 4232470,
      "valor_acordo_cents": 526774
    }
  },
  {
    "id": "porto",
    "name": "Negociação Porto Bank",
    "description": "Negociação cartão Porto Bank",
    "source_sheet": "conta parcelada PORTO BANK",
    "archived_at": null,
    "details": {
      "valor_acordo_cents": 413664
    }
  }
];

export const SEED_INSTALLMENTS: SeedInstallment[] = [
  {
    "contractId": "c6",
    "number": 1,
    "expectedCents": 136068,
    "dueDate": "2025-02-13",
    "paidDate": "2025-02-13",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 2,
    "expectedCents": 136068,
    "dueDate": "2025-03-13",
    "paidDate": "2025-03-13",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 3,
    "expectedCents": 136068,
    "dueDate": "2025-04-13",
    "paidDate": "2025-04-13",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 4,
    "expectedCents": 136068,
    "dueDate": "2025-05-13",
    "paidDate": "2025-05-13",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 5,
    "expectedCents": 136068,
    "dueDate": "2025-06-13",
    "paidDate": "2025-06-13",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 6,
    "expectedCents": 136068,
    "dueDate": "2025-07-13",
    "paidDate": "2025-07-13",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 7,
    "expectedCents": 136068,
    "dueDate": "2025-08-13",
    "paidDate": "2025-08-13",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 8,
    "expectedCents": 136068,
    "dueDate": "2025-09-13",
    "paidDate": "2025-09-15",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 9,
    "expectedCents": 136068,
    "dueDate": "2025-10-13",
    "paidDate": "2025-10-10",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 10,
    "expectedCents": 136068,
    "dueDate": "2025-11-13",
    "paidDate": "2025-11-13",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 11,
    "expectedCents": 136068,
    "dueDate": "2025-12-13",
    "paidDate": "2025-12-15",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 12,
    "expectedCents": 136068,
    "dueDate": "2026-01-13",
    "paidDate": "2026-01-12",
    "paidCents": 135976,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 13,
    "expectedCents": 136068,
    "dueDate": "2026-02-13",
    "paidDate": "2026-02-13",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 14,
    "expectedCents": 136068,
    "dueDate": "2026-03-13",
    "paidDate": "2026-03-13",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 15,
    "expectedCents": 136068,
    "dueDate": "2026-04-13",
    "paidDate": "2026-04-13",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 16,
    "expectedCents": 136068,
    "dueDate": "2026-05-13",
    "paidDate": "2026-05-12",
    "paidCents": 135976,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 17,
    "expectedCents": 136068,
    "dueDate": "2026-06-13",
    "paidDate": "2026-06-08",
    "paidCents": 135422,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 18,
    "expectedCents": 136068,
    "dueDate": "2026-07-13",
    "paidDate": "2026-07-07",
    "paidCents": 135514,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 19,
    "expectedCents": 136068,
    "dueDate": "2026-08-13",
    "paidDate": "2026-08-13",
    "paidCents": 135514,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 20,
    "expectedCents": 136068,
    "dueDate": "2026-09-13",
    "paidDate": "2026-09-12",
    "paidCents": 136068,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 21,
    "expectedCents": 136068,
    "dueDate": "2026-10-13",
    "paidDate": "2026-10-06",
    "paidCents": 135422,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 22,
    "expectedCents": 136068,
    "dueDate": "2026-11-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 23,
    "expectedCents": 136068,
    "dueDate": "2026-12-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 24,
    "expectedCents": 136068,
    "dueDate": "2027-01-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 25,
    "expectedCents": 136068,
    "dueDate": "2027-02-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 26,
    "expectedCents": 136068,
    "dueDate": "2027-03-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 27,
    "expectedCents": 136068,
    "dueDate": "2027-04-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 28,
    "expectedCents": 136068,
    "dueDate": "2027-05-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 29,
    "expectedCents": 136068,
    "dueDate": "2027-06-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 30,
    "expectedCents": 136068,
    "dueDate": "2027-07-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 31,
    "expectedCents": 136068,
    "dueDate": "2027-08-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 32,
    "expectedCents": 136068,
    "dueDate": "2027-09-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 33,
    "expectedCents": 136068,
    "dueDate": "2027-10-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 34,
    "expectedCents": 136068,
    "dueDate": "2027-11-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 35,
    "expectedCents": 136068,
    "dueDate": "2027-12-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 36,
    "expectedCents": 136068,
    "dueDate": "2028-01-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 37,
    "expectedCents": 136068,
    "dueDate": "2028-02-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 38,
    "expectedCents": 136068,
    "dueDate": "2028-03-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 39,
    "expectedCents": 136068,
    "dueDate": "2028-04-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 40,
    "expectedCents": 136068,
    "dueDate": "2028-05-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 41,
    "expectedCents": 136068,
    "dueDate": "2028-06-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 42,
    "expectedCents": 136068,
    "dueDate": "2028-07-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 43,
    "expectedCents": 136068,
    "dueDate": "2028-08-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 44,
    "expectedCents": 136068,
    "dueDate": "2028-09-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 45,
    "expectedCents": 136068,
    "dueDate": "2028-10-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 46,
    "expectedCents": 136068,
    "dueDate": "2028-11-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 47,
    "expectedCents": 136068,
    "dueDate": "2028-12-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "c6",
    "number": 48,
    "expectedCents": 136068,
    "dueDate": "2029-01-13",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 1,
    "expectedCents": 50720,
    "dueDate": "2025-04-07",
    "paidDate": "2025-04-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 2,
    "expectedCents": 50720,
    "dueDate": "2025-05-07",
    "paidDate": "2025-05-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 3,
    "expectedCents": 50720,
    "dueDate": "2025-06-07",
    "paidDate": "2025-06-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 4,
    "expectedCents": 50720,
    "dueDate": "2025-07-07",
    "paidDate": "2025-07-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 5,
    "expectedCents": 50720,
    "dueDate": "2025-08-07",
    "paidDate": "2025-08-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 6,
    "expectedCents": 50720,
    "dueDate": "2025-09-07",
    "paidDate": "2025-09-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 7,
    "expectedCents": 50720,
    "dueDate": "2025-10-07",
    "paidDate": "2025-10-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 8,
    "expectedCents": 50720,
    "dueDate": "2025-11-07",
    "paidDate": "2025-11-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 9,
    "expectedCents": 50720,
    "dueDate": "2025-12-07",
    "paidDate": "2025-12-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 10,
    "expectedCents": 50720,
    "dueDate": "2026-01-07",
    "paidDate": "2026-01-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 11,
    "expectedCents": 50720,
    "dueDate": "2026-02-07",
    "paidDate": "2026-02-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 12,
    "expectedCents": 50720,
    "dueDate": "2026-03-07",
    "paidDate": "2026-03-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 13,
    "expectedCents": 50720,
    "dueDate": "2026-04-07",
    "paidDate": "2026-04-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 14,
    "expectedCents": 50720,
    "dueDate": "2026-05-07",
    "paidDate": "2026-05-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 15,
    "expectedCents": 50720,
    "dueDate": "2026-06-07",
    "paidDate": "2026-06-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 16,
    "expectedCents": 50720,
    "dueDate": "2026-07-07",
    "paidDate": "2026-07-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 17,
    "expectedCents": 50720,
    "dueDate": "2026-08-07",
    "paidDate": "2026-08-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 18,
    "expectedCents": 50720,
    "dueDate": "2026-09-07",
    "paidDate": "2026-09-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 19,
    "expectedCents": 50720,
    "dueDate": "2026-10-07",
    "paidDate": "2026-10-07",
    "paidCents": 50720,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 20,
    "expectedCents": 50720,
    "dueDate": "2026-11-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 21,
    "expectedCents": 50720,
    "dueDate": "2026-12-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 22,
    "expectedCents": 50720,
    "dueDate": "2027-01-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 23,
    "expectedCents": 50720,
    "dueDate": "2027-02-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 24,
    "expectedCents": 50720,
    "dueDate": "2027-03-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 25,
    "expectedCents": 50720,
    "dueDate": "2027-04-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 26,
    "expectedCents": 50720,
    "dueDate": "2027-05-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 27,
    "expectedCents": 50720,
    "dueDate": "2027-06-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 28,
    "expectedCents": 50720,
    "dueDate": "2027-07-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 29,
    "expectedCents": 50720,
    "dueDate": "2027-08-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 30,
    "expectedCents": 50720,
    "dueDate": "2027-09-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 31,
    "expectedCents": 50720,
    "dueDate": "2027-10-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 32,
    "expectedCents": 50720,
    "dueDate": "2027-11-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 33,
    "expectedCents": 50720,
    "dueDate": "2027-12-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 34,
    "expectedCents": 50720,
    "dueDate": "2028-01-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 35,
    "expectedCents": 50720,
    "dueDate": "2028-02-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 36,
    "expectedCents": 50720,
    "dueDate": "2028-03-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 37,
    "expectedCents": 50720,
    "dueDate": "2028-04-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 38,
    "expectedCents": 50720,
    "dueDate": "2028-05-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 39,
    "expectedCents": 50720,
    "dueDate": "2028-06-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 40,
    "expectedCents": 50720,
    "dueDate": "2028-07-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 41,
    "expectedCents": 50720,
    "dueDate": "2028-08-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 42,
    "expectedCents": 50720,
    "dueDate": "2028-09-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 43,
    "expectedCents": 50720,
    "dueDate": "2028-10-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 44,
    "expectedCents": 50720,
    "dueDate": "2028-11-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 45,
    "expectedCents": 50720,
    "dueDate": "2028-12-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 46,
    "expectedCents": 50720,
    "dueDate": "2029-01-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 47,
    "expectedCents": 50720,
    "dueDate": "2029-02-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 48,
    "expectedCents": 50720,
    "dueDate": "2029-03-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 49,
    "expectedCents": 50720,
    "dueDate": "2029-04-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 50,
    "expectedCents": 50720,
    "dueDate": "2029-05-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 51,
    "expectedCents": 50720,
    "dueDate": "2029-06-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 52,
    "expectedCents": 50720,
    "dueDate": "2029-07-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 53,
    "expectedCents": 50720,
    "dueDate": "2029-08-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 54,
    "expectedCents": 50720,
    "dueDate": "2029-09-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 55,
    "expectedCents": 50720,
    "dueDate": "2029-10-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 56,
    "expectedCents": 50720,
    "dueDate": "2029-11-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 57,
    "expectedCents": 50720,
    "dueDate": "2029-12-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 58,
    "expectedCents": 50720,
    "dueDate": "2030-01-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 59,
    "expectedCents": 50720,
    "dueDate": "2030-02-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 60,
    "expectedCents": 50720,
    "dueDate": "2030-03-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 61,
    "expectedCents": 50720,
    "dueDate": "2030-04-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 62,
    "expectedCents": 50720,
    "dueDate": "2030-05-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 63,
    "expectedCents": 50720,
    "dueDate": "2030-06-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 64,
    "expectedCents": 50720,
    "dueDate": "2030-07-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 65,
    "expectedCents": 50720,
    "dueDate": "2030-08-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 66,
    "expectedCents": 50720,
    "dueDate": "2030-09-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 67,
    "expectedCents": 50720,
    "dueDate": "2030-10-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 68,
    "expectedCents": 50720,
    "dueDate": "2030-11-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 69,
    "expectedCents": 50720,
    "dueDate": "2030-12-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 70,
    "expectedCents": 50720,
    "dueDate": "2031-01-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "caixa",
    "number": 71,
    "expectedCents": 50720,
    "dueDate": "2031-02-07",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "inter",
    "number": 1,
    "expectedCents": 19619,
    "dueDate": "2026-06-11",
    "paidDate": "2026-06-08",
    "paidCents": 19619,
    "note": "Pago conforme documento"
  },
  {
    "contractId": "inter",
    "number": 2,
    "expectedCents": 46105,
    "dueDate": "2026-07-11",
    "paidDate": "2026-07-07",
    "paidCents": 46105,
    "note": "Pago conforme documento"
  },
  {
    "contractId": "inter",
    "number": 3,
    "expectedCents": 46105,
    "dueDate": "2026-08-11",
    "paidDate": "2026-08-06",
    "paidCents": 46105,
    "note": "Pago conforme documento"
  },
  {
    "contractId": "inter",
    "number": 4,
    "expectedCents": 46105,
    "dueDate": "2026-09-11",
    "paidDate": "2026-09-13",
    "paidCents": 46105,
    "note": "Pago conforme documento"
  },
  {
    "contractId": "inter",
    "number": 5,
    "expectedCents": 46105,
    "dueDate": "2026-10-11",
    "paidDate": "2026-10-08",
    "paidCents": 46105,
    "note": null
  },
  {
    "contractId": "inter",
    "number": 6,
    "expectedCents": 46105,
    "dueDate": "2026-11-11",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "inter",
    "number": 7,
    "expectedCents": 46105,
    "dueDate": "2026-12-11",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "inter",
    "number": 8,
    "expectedCents": 46105,
    "dueDate": "2027-01-11",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "inter",
    "number": 9,
    "expectedCents": 46105,
    "dueDate": "2027-02-11",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "inter",
    "number": 10,
    "expectedCents": 46105,
    "dueDate": "2027-03-11",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "inter",
    "number": 11,
    "expectedCents": 46105,
    "dueDate": "2027-04-11",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "inter",
    "number": 12,
    "expectedCents": 46105,
    "dueDate": "2027-05-11",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 1,
    "expectedCents": 17236,
    "dueDate": "2026-07-03",
    "paidDate": "2026-07-03",
    "paidCents": 17236,
    "note": "Pago conforme documento"
  },
  {
    "contractId": "porto",
    "number": 2,
    "expectedCents": 17236,
    "dueDate": "2026-08-03",
    "paidDate": "2026-08-03",
    "paidCents": 17236,
    "note": "Pago conforme documento"
  },
  {
    "contractId": "porto",
    "number": 3,
    "expectedCents": 17236,
    "dueDate": "2026-09-03",
    "paidDate": "2026-09-03",
    "paidCents": 17236,
    "note": "Pago conforme documento"
  },
  {
    "contractId": "porto",
    "number": 4,
    "expectedCents": 17236,
    "dueDate": "2026-10-03",
    "paidDate": "2026-10-03",
    "paidCents": 17236,
    "note": "Pago conforme documento"
  },
  {
    "contractId": "porto",
    "number": 5,
    "expectedCents": 17236,
    "dueDate": "2026-11-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 6,
    "expectedCents": 17236,
    "dueDate": "2026-12-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 7,
    "expectedCents": 17236,
    "dueDate": "2027-01-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 8,
    "expectedCents": 17236,
    "dueDate": "2027-02-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 9,
    "expectedCents": 17236,
    "dueDate": "2027-03-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 10,
    "expectedCents": 17236,
    "dueDate": "2027-04-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 11,
    "expectedCents": 17236,
    "dueDate": "2027-05-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 12,
    "expectedCents": 17236,
    "dueDate": "2027-06-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 13,
    "expectedCents": 17236,
    "dueDate": "2027-07-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 14,
    "expectedCents": 17236,
    "dueDate": "2027-08-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 15,
    "expectedCents": 17236,
    "dueDate": "2027-09-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 16,
    "expectedCents": 17236,
    "dueDate": "2027-10-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 17,
    "expectedCents": 17236,
    "dueDate": "2027-11-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 18,
    "expectedCents": 17236,
    "dueDate": "2027-12-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 19,
    "expectedCents": 17236,
    "dueDate": "2028-01-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 20,
    "expectedCents": 17236,
    "dueDate": "2028-02-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 21,
    "expectedCents": 17236,
    "dueDate": "2028-03-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 22,
    "expectedCents": 17236,
    "dueDate": "2028-04-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 23,
    "expectedCents": 17236,
    "dueDate": "2028-05-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  },
  {
    "contractId": "porto",
    "number": 24,
    "expectedCents": 17236,
    "dueDate": "2028-06-03",
    "paidDate": null,
    "paidCents": null,
    "note": null
  }
];

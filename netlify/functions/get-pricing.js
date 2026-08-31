// ============================================================
// NETLIFY FUNCTION: get-pricing
// URL: /.netlify/functions/get-pricing  (GET)
// Usa header x-country da Netlify (grátis, zero latência).
// DEFAULT = Tier A (US price) — falha pra cima, nunca pra baixo.
// ============================================================

// Moedas zero-decimal no Stripe (amount = valor exibido, sem centavos)
const ZERO_DECIMAL = new Set(['jpy', 'krw', 'vnd', 'clp', 'bif', 'gnf', 'mga', 'pyg', 'rwf', 'ugx', 'xaf', 'xof']);

// ─────────────────────────────────────────────────────────────
// TABELA DE PREÇOS (unidade mínima da moeda — cents/centavos)
// Zero-decimal: amount = valor display direto
// Two-decimal:  amount = valor display × 100
// bump = order bump
// ─────────────────────────────────────────────────────────────
const PRICING = {

  // ═══════════════════════════════════════════════════════════
  // TIER A — Mercados premium  ($27 / $37 / $47 equivalente)
  // ═══════════════════════════════════════════════════════════

  // USD direto
  US: { currency: 'usd', symbol: '$',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  CA: { currency: 'cad', symbol: 'CA$',  plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  AU: { currency: 'aud', symbol: 'A$',   plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  NZ: { currency: 'nzd', symbol: 'NZ$',  plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  AE: { currency: 'usd', symbol: '$',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    }, // AED pegged ao USD
  QA: { currency: 'usd', symbol: '$',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  KW: { currency: 'usd', symbol: '$',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  BH: { currency: 'usd', symbol: '$',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  OM: { currency: 'usd', symbol: '$',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },

  // EUR Tier A (UE rica)
  FR: { currency: 'eur', symbol: '€',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  DE: { currency: 'eur', symbol: '€',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  NL: { currency: 'eur', symbol: '€',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  BE: { currency: 'eur', symbol: '€',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  AT: { currency: 'eur', symbol: '€',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  IE: { currency: 'eur', symbol: '€',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  FI: { currency: 'eur', symbol: '€',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  LU: { currency: 'eur', symbol: '€',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },

  // Moeda local Tier A
  // CH: CHF ≈ USD  → 27/37/47
  CH: { currency: 'chf', symbol: 'CHF',  plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  // NO: NOK (~10.5/USD) → 297/397/497
  NO: { currency: 'nok', symbol: 'kr',   plans: { starter: 29700,   classic: 39700,   premium: 49700   }, bump: 4700   },
  // DK: DKK (~6.9/USD) → 197/277/337 → arredondado p/ 197/297/397
  DK: { currency: 'dkk', symbol: 'kr',   plans: { starter: 19700,   classic: 29700,   premium: 39700   }, bump: 2700   },
  // SE: SEK (~10.4/USD) → 297/397/497
  SE: { currency: 'sek', symbol: 'kr',   plans: { starter: 29700,   classic: 39700,   premium: 49700   }, bump: 4700   },
  // JP: JPY zero-decimal (~155/USD) → 3997/5997/7497
  JP: { currency: 'jpy', symbol: '¥',    plans: { starter: 3997,    classic: 5997,    premium: 7497    }, bump: 597    },
  // SG: SGD (~1.34/USD) → 37/47/67
  SG: { currency: 'sgd', symbol: 'S$',   plans: { starter: 3700,    classic: 4700,    premium: 6700    }, bump: 700    },
  // IL: ILS (~3.75/USD) → 97/137/177
  IL: { currency: 'ils', symbol: '₪',    plans: { starter: 9700,    classic: 13700,   premium: 17700   }, bump: 1700   },

  // ═══════════════════════════════════════════════════════════
  // TIER B — Mercados intermediários  ($17 / $27 / $37 equiv.)
  // ═══════════════════════════════════════════════════════════

  // Reino Unido  (preço próprio em £)
  GB: { currency: 'gbp', symbol: '£',    plans: { starter: 1700,    classic: 2700,    premium: 3700    }, bump: 700    },

  // EUR Tier B (UE intermediária)
  ES: { currency: 'eur', symbol: '€',    plans: { starter: 1700,    classic: 2700,    premium: 3700    }, bump: 700    },
  IT: { currency: 'eur', symbol: '€',    plans: { starter: 1700,    classic: 2700,    premium: 3700    }, bump: 700    },
  PT: { currency: 'eur', symbol: '€',    plans: { starter: 1700,    classic: 2700,    premium: 3700    }, bump: 700    },
  GR: { currency: 'eur', symbol: '€',    plans: { starter: 1700,    classic: 2700,    premium: 3700    }, bump: 700    },
  SK: { currency: 'eur', symbol: '€',    plans: { starter: 1700,    classic: 2700,    premium: 3700    }, bump: 700    },
  SI: { currency: 'eur', symbol: '€',    plans: { starter: 1700,    classic: 2700,    premium: 3700    }, bump: 700    },
  EE: { currency: 'eur', symbol: '€',    plans: { starter: 1700,    classic: 2700,    premium: 3700    }, bump: 700    },
  LV: { currency: 'eur', symbol: '€',    plans: { starter: 1700,    classic: 2700,    premium: 3700    }, bump: 700    },
  LT: { currency: 'eur', symbol: '€',    plans: { starter: 1700,    classic: 2700,    premium: 3700    }, bump: 700    },

  // Moeda local Tier B
  // PL: PLN (~3.9/USD) → 67/107/147
  PL: { currency: 'pln', symbol: 'zł',   plans: { starter: 6700,    classic: 10700,   premium: 14700   }, bump: 1700   },
  // CZ: CZK (~23/USD) → 397/627/857
  CZ: { currency: 'czk', symbol: 'Kč',   plans: { starter: 39700,   classic: 62700,   premium: 85700   }, bump: 8700   },
  // KR: KRW zero-decimal (~1380/USD) → 23997/36997/50997
  KR: { currency: 'krw', symbol: '₩',    plans: { starter: 23997,   classic: 36997,   premium: 50997   }, bump: 3997   },
  // SA: SAR (~3.75/USD) → 67/97/137
  SA: { currency: 'sar', symbol: 'SR',   plans: { starter: 6700,    classic: 9700,    premium: 13700   }, bump: 1700   },
  // HU: HUF two-decimal Stripe (~360/USD) → display 6497/9997/13297 → ×100
  HU: { currency: 'huf', symbol: 'Ft',   plans: { starter: 649700,  classic: 999700,  premium: 1329700 }, bump: 99700  },

  // ═══════════════════════════════════════════════════════════
  // PREÇOS DEDICADOS (Brasil, México, demais LATAM, África do Sul)
  // ═══════════════════════════════════════════════════════════

  // México (USD)
  MX: { currency: 'usd', symbol: '$',    plans: { starter: 700,     classic: 1700,    premium: 2700    }, bump: 300    },

  // Brasil
  BR: { currency: 'brl', symbol: 'R$',   plans: { starter: 8700,    classic: 9700,    premium: 11700   }, bump: 3700   },

  // Argentina: ARS two-decimal (~210/BRL) → display 17997/19997/23997 → ×100
  AR: { currency: 'ars', symbol: 'AR$',  plans: { starter: 1799700, classic: 1999700, premium: 2399700 }, bump: 399700 },

  // Colômbia: COP two-decimal (~710/BRL) → display 61997/69997/83997 → ×100
  CO: { currency: 'cop', symbol: 'COP$', plans: { starter: 6199700, classic: 6999700, premium: 8399700 }, bump: 1799700},

  // Peru: PEN two-decimal (~0.63/BRL) → display 57/67/77 → ×100
  PE: { currency: 'pen', symbol: 'S/',   plans: { starter: 5700,    classic: 6700,    premium: 7700    }, bump: 1700   },

  // Chile: CLP zero-decimal (~163/BRL) → 14997/16997/19997
  CL: { currency: 'clp', symbol: '$',    plans: { starter: 14997,   classic: 16997,   premium: 19997   }, bump: 3997   },

  // Uruguai: UYU two-decimal (~7.2/BRL) → display 647/747/897 → ×100
  UY: { currency: 'uyu', symbol: '$U',   plans: { starter: 64700,   classic: 74700,   premium: 89700   }, bump: 19700  },

  // África do Sul
  ZA: { currency: 'zar', symbol: 'R',    plans: { starter: 28700,   classic: 32700,   premium: 39700   }, bump: 6700   },

  // ═══════════════════════════════════════════════════════════
  // TIER C — Mercados de entrada  ($7 / $17 / $27 equivalente)
  // ═══════════════════════════════════════════════════════════

  // Índia: INR (~84/USD) → display 597/1397/2297 → ×100
  IN: { currency: 'inr', symbol: '₹',    plans: { starter: 59700,   classic: 139700,  premium: 229700  }, bump: 9700   },

  // Filipinas: PHP (~56/USD) → display 397/947/1497 → ×100
  PH: { currency: 'php', symbol: '₱',    plans: { starter: 39700,   classic: 94700,   premium: 149700  }, bump: 6700   },

  // Nigéria: NGN (~1600/USD) → display 10997/26997/42997 → ×100
  NG: { currency: 'ngn', symbol: '₦',    plans: { starter: 1099700, classic: 2699700, premium: 4299700 }, bump: 199700 },

  // Indonésia: IDR two-decimal (~16000/USD) → display 109997/269997/429997 → ×100
  ID: { currency: 'idr', symbol: 'Rp',   plans: { starter: 10999700,classic: 26999700,premium: 42999700}, bump: 1799700},

  // Vietnã: VND zero-decimal (~25000/USD) → 174997/424997/674997
  VN: { currency: 'vnd', symbol: '₫',    plans: { starter: 174997,  classic: 424997,  premium: 674997  }, bump: 49997  },

  // Egito: EGP (~49/USD) → display 347/837/1327 → ×100
  EG: { currency: 'egp', symbol: 'E£',   plans: { starter: 34700,   classic: 83700,   premium: 132700  }, bump: 5700   },

  // Quênia: KES (~129/USD) → display 897/2197/3497 → ×100
  KE: { currency: 'kes', symbol: 'KSh',  plans: { starter: 89700,   classic: 219700,  premium: 349700  }, bump: 14700  },

  // Paquistão, Bangladesh, Marrocos → USD (suporte Stripe limitado)
  PK: { currency: 'usd', symbol: '$',    plans: { starter: 700,     classic: 1700,    premium: 2700    }, bump: 300    },
  BD: { currency: 'usd', symbol: '$',    plans: { starter: 700,     classic: 1700,    premium: 2700    }, bump: 300    },
  MA: { currency: 'usd', symbol: '$',    plans: { starter: 700,     classic: 1700,    premium: 2700    }, bump: 300    },

  // ═══════════════════════════════════════════════════════════
  // DEFAULT — Qualquer país não mapeado → Tier A (US price)
  // Segurança: falha pro preço cheio, nunca pro mais barato.
  // ═══════════════════════════════════════════════════════════
  DEFAULT: { currency: 'usd', symbol: '$', plans: { starter: 2700, classic: 3700, premium: 4700 }, bump: 700 },
};

const PLAN_NAMES = {
  starter: 'Starter — 10 Photos',
  classic:  'Classic — 20 Photos',
  premium:  'Premium Package — 30 Photos',
};

const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  const country = (event.headers['x-country'] || 'US').toUpperCase();
  const pricing  = PRICING[country] || PRICING.DEFAULT;
  const isZero   = ZERO_DECIMAL.has(pricing.currency);
  const toDisplay = (v) => isZero ? v : v / 100;

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      country,
      currency:    pricing.currency,
      symbol:      pricing.symbol,
      zeroDecimal: isZero,
      plans: {
        starter: { name: PLAN_NAMES.starter, stripeAmount: pricing.plans.starter, display: toDisplay(pricing.plans.starter) },
        classic:  { name: PLAN_NAMES.classic,  stripeAmount: pricing.plans.classic,  display: toDisplay(pricing.plans.classic)  },
        premium:  { name: PLAN_NAMES.premium,  stripeAmount: pricing.plans.premium,  display: toDisplay(pricing.plans.premium)  },
      },
      bump: { stripeAmount: pricing.bump, display: toDisplay(pricing.bump) },
    }),
  };
};

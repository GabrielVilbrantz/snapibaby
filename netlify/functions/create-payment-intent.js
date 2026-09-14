// ============================================================
// NETLIFY FUNCTION: create-payment-intent
// URL: /.netlify/functions/create-payment-intent  (POST)
// País: header x-country da Netlify (prioridade) ou body (fallback).
// DEFAULT = Tier A — falha pro preço mais caro, nunca pro mais barato.
// ============================================================

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ZERO_DECIMAL = new Set(['jpy', 'krw', 'vnd', 'clp', 'bif', 'gnf', 'mga', 'pyg', 'rwf', 'ugx', 'xaf', 'xof']);

const PRICING = {
  // ── TIER A ($27/$37/$47) ──────────────────────────────────
  US: { currency: 'usd', symbol: '$',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  CA: { currency: 'cad', symbol: 'CA$',  plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  AU: { currency: 'aud', symbol: 'A$',   plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  NZ: { currency: 'nzd', symbol: 'NZ$',  plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  AE: { currency: 'usd', symbol: '$',    plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
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
  CH: { currency: 'chf', symbol: 'CHF',  plans: { starter: 2700,    classic: 3700,    premium: 4700    }, bump: 700    },
  NO: { currency: 'nok', symbol: 'kr',   plans: { starter: 29700,   classic: 39700,   premium: 49700   }, bump: 4700   },
  DK: { currency: 'dkk', symbol: 'kr',   plans: { starter: 19700,   classic: 29700,   premium: 39700   }, bump: 2700   },
  SE: { currency: 'sek', symbol: 'kr',   plans: { starter: 29700,   classic: 39700,   premium: 49700   }, bump: 4700   },
  JP: { currency: 'jpy', symbol: '¥',    plans: { starter: 3997,    classic: 5997,    premium: 7497    }, bump: 597    }, // zero-decimal
  SG: { currency: 'sgd', symbol: 'S$',   plans: { starter: 3700,    classic: 4700,    premium: 6700    }, bump: 700    },
  IL: { currency: 'ils', symbol: '₪',    plans: { starter: 9700,    classic: 13700,   premium: 17700   }, bump: 1700   },

  // ── TIER B ($17/$27/$37) ──────────────────────────────────
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
  PL: { currency: 'pln', symbol: 'zł',   plans: { starter: 6700,    classic: 10700,   premium: 14700   }, bump: 1700   },
  CZ: { currency: 'czk', symbol: 'Kč',   plans: { starter: 39700,   classic: 62700,   premium: 85700   }, bump: 8700   },
  KR: { currency: 'krw', symbol: '₩',    plans: { starter: 23997,   classic: 36997,   premium: 50997   }, bump: 3997   }, // zero-decimal
  SA: { currency: 'sar', symbol: 'SR',   plans: { starter: 6700,    classic: 9700,    premium: 13700   }, bump: 1700   },
  HU: { currency: 'huf', symbol: 'Ft',   plans: { starter: 649700,  classic: 999700,  premium: 1329700 }, bump: 99700  },

  // ── PREÇOS DEDICADOS ──────────────────────────────────────
  MX: { currency: 'usd', symbol: '$',    plans: { starter: 700,     classic: 1700,    premium: 2700    }, bump: 300    },
  // Brasil — ⚠️ PREÇO DE TESTE — REVERTER APÓS TESTE
  BR: { currency: 'brl', symbol: 'R$',   plans: { starter: 1500,     classic: 1500,     premium: 1500     }, bump: 500    },
  AR: { currency: 'ars', symbol: 'AR$',  plans: { starter: 1799700, classic: 1999700, premium: 2399700 }, bump: 399700 },
  CO: { currency: 'cop', symbol: 'COP$', plans: { starter: 6199700, classic: 6999700, premium: 8399700 }, bump: 1799700},
  PE: { currency: 'pen', symbol: 'S/',   plans: { starter: 5700,    classic: 6700,    premium: 7700    }, bump: 1700   },
  CL: { currency: 'clp', symbol: '$',    plans: { starter: 14997,   classic: 16997,   premium: 19997   }, bump: 3997   }, // zero-decimal
  UY: { currency: 'uyu', symbol: '$U',   plans: { starter: 64700,   classic: 74700,   premium: 89700   }, bump: 19700  },
  ZA: { currency: 'zar', symbol: 'R',    plans: { starter: 28700,   classic: 32700,   premium: 39700   }, bump: 6700   },

  // ── TIER C ($7/$17/$27) ───────────────────────────────────
  IN: { currency: 'inr', symbol: '₹',    plans: { starter: 59700,   classic: 139700,  premium: 229700  }, bump: 9700   },
  PH: { currency: 'php', symbol: '₱',    plans: { starter: 39700,   classic: 94700,   premium: 149700  }, bump: 6700   },
  NG: { currency: 'ngn', symbol: '₦',    plans: { starter: 1099700, classic: 2699700, premium: 4299700 }, bump: 199700 },
  ID: { currency: 'idr', symbol: 'Rp',   plans: { starter: 10999700,classic: 26999700,premium: 42999700}, bump: 1799700},
  VN: { currency: 'vnd', symbol: '₫',    plans: { starter: 174997,  classic: 424997,  premium: 674997  }, bump: 49997  }, // zero-decimal
  EG: { currency: 'egp', symbol: 'E£',   plans: { starter: 34700,   classic: 83700,   premium: 132700  }, bump: 5700   },
  KE: { currency: 'kes', symbol: 'KSh',  plans: { starter: 89700,   classic: 219700,  premium: 349700  }, bump: 14700  },
  PK: { currency: 'usd', symbol: '$',    plans: { starter: 700,     classic: 1700,    premium: 2700    }, bump: 300    },
  BD: { currency: 'usd', symbol: '$',    plans: { starter: 700,     classic: 1700,    premium: 2700    }, bump: 300    },
  MA: { currency: 'usd', symbol: '$',    plans: { starter: 700,     classic: 1700,    premium: 2700    }, bump: 300    },

  // ── DEFAULT — Qualquer país não mapeado → Tier A ─────────
  // Falha pro preço cheio. Nunca pro mais barato (evita bypass via VPN/proxy).
  DEFAULT: { currency: 'usd', symbol: '$', plans: { starter: 2700, classic: 3700, premium: 4700 }, bump: 700 },
};

const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    plan = 'premium',
    hasBump = false,
    customerEmail,
    customerName,
    babyPhotoUrls = [],
    themesSelected = [],
    country: bodyCountry,
    exitDiscount = false, // flag do exit-intent scratch card (10% off real)
  } = body;

  // Header Netlify tem prioridade (mais confiável que o frontend)
  const country = (event.headers['x-country'] || bodyCountry || 'US').toUpperCase();
  const pricing  = PRICING[country] || PRICING.DEFAULT;
  const cur      = pricing.currency;
  const isZero   = ZERO_DECIMAL.has(cur);
  const toDisplay = (v) => isZero ? v : v / 100;

  const planAmount  = pricing.plans[plan] ?? pricing.plans.premium;
  const bumpAmount  = pricing.bump;
  let   totalAmount = planAmount + (hasBump ? bumpAmount : 0);

  // Aplica 10% de desconto real se o cliente usou o exit-intent
  if (exitDiscount === true) {
    totalAmount = Math.round(totalAmount * 0.9);
  }

  console.log(`create-payment-intent: country=${country} plan=${plan} cur=${cur} total=${toDisplay(totalAmount)} exitDiscount=${exitDiscount}`);

  try {
    let customer;
    if (customerEmail) {
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
      customer = existing.data[0] ?? await stripe.customers.create({
        email: customerEmail,
        name:  customerName || '',
        metadata: { plan, hasBump: String(hasBump), country },
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   totalAmount,
      currency: cur,
      customer: customer?.id,
      // automatic_payment_methods inclui automaticamente: cartão, Google Pay, Apple Pay,
      // PIX (para BRL), OXXO (para MXN), Boleto, e outros baseados na moeda/país
      automatic_payment_methods: { enabled: true },
      metadata: {
        plan,
        country,
        hasBump:       String(hasBump),
        exitDiscount:  String(exitDiscount), // rastreabilidade
        customerEmail: customerEmail || '',
        customerName:  customerName  || '',
        has_photo:     babyPhotoUrls.length > 0 ? 'true' : 'false',
        themes_count:  String(themesSelected.length),
      },
      description: `SnapiBaby – ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
    });

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        clientSecret:  paymentIntent.client_secret,
        customerId:    customer?.id || null,
        intentId:      paymentIntent.id,
        currency:      cur,
        symbol:        pricing.symbol,
        country,
        amount:        totalAmount,
        planAmount,
        bumpAmount,
        planDisplay:   toDisplay(planAmount),
        bumpDisplay:   toDisplay(bumpAmount),
        totalDisplay:  toDisplay(totalAmount),
      }),
    };

  } catch (err) {
    console.error('create-payment-intent error:', err.message);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};

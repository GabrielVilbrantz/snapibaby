# SnapiBaby — Project Context

> Passe este arquivo no início de cada nova conversa para retomar o contexto completo.

---

## O Produto

**SnapiBaby** — AI newborn photography service. Transforma fotos de celular de recém-nascidos em retratos profissionais de estúdio via IA.

- **URL live:** https://snapibaby.netlify.app
- **Deploy:** Netlify Drop (arrastar pasta `snapibaby`)
- **Pasta local:** `C:\Users\Home\Desktop\SNAPIBABY SITE\snapibaby\`
- **Mercado:** EUA (primário), UK, AU, CA
- **Idioma do site:** Inglês (`lang="en"` em todas as páginas)

---

## Stack Técnica

| Componente | Tecnologia |
|---|---|
| Frontend | HTML + CSS + Vanilla JS |
| Estilo | `styles.css` (Vanilla CSS, sem Tailwind) |
| Fontes | Inter + DM Serif Display (Google Fonts) |
| Pagamento | Stripe Elements (`pk_live_...`) |
| Backend | Netlify Functions (`/.netlify/functions/`) |
| DB | Supabase (`supabase-client.js`) |
| Analytics | Meta Pixel ID `977138755178682` (GDPR-condicionado) |
| SEO | Google Search Console verificado ✅ |

---

## Arquivos Principais

```
snapibaby/
├── index.html          ← Homepage (hero, galeria, preços, blog)
├── styles.css          ← CSS global
├── checkout.html       ← Checkout (Stripe Elements)
├── upsell.html         ← Upsell pós-pagamento
├── success.html        ← Página de sucesso
├── app.html            ← Upload de fotos
├── dashboard.html      ← Dashboard cliente
├── blog-post.html      ← Template dinâmico de blog (?post=slug)
├── terms.html
├── privacy.html
├── sitemap.xml         ← 60 URLs — submetido no Search Console ✅
├── themes/             ← 15 páginas pSEO de tema
├── cities/             ← 26 páginas pSEO de cidade
├── googlec44bad9cddc08fb4.html ← Verificação Google Search Console
└── netlify/functions/
    └── create-payment-intent.js
```

---

## Preços

| Plano | Fotos | Preço |
|---|---|---|
| Starter | 15 | $29 |
| Classic | 30 | $49 |
| Premium | 50 | $59 |
| Order Bump | Premium Frames + Editing | +$9 |

URL params de plano: `?plano=starter` / `?plano=classic` / `?plano=premium`

---

## Blog Posts (blog-post.html?post=SLUG)

| Slug | Título |
|---|---|
| `newborn-at-home-ideas` | At-home newborn photoshoot ideas |
| `best-time-newborn-photoshoot` | Best time for newborn photoshoot |
| `newborn-photography-cost` | Newborn photography cost |
| `monthly-baby-photoshoot-ideas` | Monthly baby photoshoot ideas |
| `newborn-phone-photo-tips` | Newborn phone photo tips |
| `baby-first-birthday-photoshoot` | Baby first birthday photoshoot |
| `ai-vs-photographer` | AI vs real photographer comparison |
| `what-is-ai-newborn-photography` | What is AI newborn photography |
| `save-money-newborn-photography` | How to save $741 on newborn photos |
| `princess-newborn-photo-ideas` | Princess newborn photo ideas |
| `gifts-for-new-moms` | Best gifts for new moms |
| `how-ai-newborn-editing-works` | How AI newborn editing works |

---

## Páginas de Tema (themes/SLUG-newborn-photos.html)

princess, astronaut, fairy, safari, superhero, floral, pirate, space, dinosaur, starry-night, teddy-bear, minimalist, natural, easter-bunny, cartoon

**Gerador:** `C:\Users\Home\Desktop\SNAPIBABY SITE\generate-pseo.ps1`
**Template:** `C:\Users\Home\Desktop\SNAPIBABY SITE\theme-template.html`

---

## Páginas de Cidade (cities/ai-newborn-photography-SLUG.html)

**Feitas (26):**
- 🇺🇸 EUA: new-york-ny, los-angeles-ca, chicago-il, houston-tx, phoenix-az, philadelphia-pa, san-antonio-tx, san-diego-ca, dallas-tx, san-jose-ca, austin-tx, jacksonville-fl, charlotte-nc, san-francisco-ca, seattle-wa, denver-co, nashville-tn, miami-fl, atlanta-ga, portland-or
- 🇬🇧 UK: london-uk, manchester-uk
- 🇦🇺 AU: sydney-au, melbourne-au
- 🇨🇦 CA: toronto-ca, vancouver-ca

**Próximas (Semana 2):** El Paso, Las Vegas, Louisville, Memphis, Baltimore, Milwaukee, Sacramento, Kansas City, Minneapolis, Tampa, Orlando, Salt Lake City, Raleigh, Pittsburgh + UK/AU/CA restantes

**Gerador:** `C:\Users\Home\Desktop\SNAPIBABY SITE\generate-cities.ps1`
**Template:** `C:\Users\Home\Desktop\SNAPIBABY SITE\city-template.html`

**Regra de encoding:** Sempre usar `New-Object System.Text.UTF8Encoding($false)` (UTF-8 sem BOM). Emojis via HTML entities (`&#x1F451;`). Nunca emojis raw em strings PowerShell.

---

## SEO — Status

| Item | Status |
|---|---|
| Google Search Console | ✅ Verificado |
| Sitemap.xml | ✅ Submetido — 60 URLs indexadas |
| Canonical tags | ✅ Todas as páginas |
| Twitter Card meta | ✅ Todas as páginas |
| lang="en" | ✅ Padronizado |
| noindex checkout.html | ✅ |
| Schema Product + AggregateRating | ✅ index.html |
| Schema HowTo | ✅ index.html |
| Schema FAQPage | ✅ index.html + todas as pages pSEO |
| Cookie Consent / GDPR | ✅ Banner + Pixel condicional |
| Meta Pixel condicional | ✅ index.html + checkout.html |
| width/height em gallery imgs | ✅ 20 imagens |

---

## GDPR / Cookie Consent

- Banner implementado no `index.html` (dark navy, bottom fixed)
- Chave localStorage: `snapi_cookie_consent` = `'accepted'` ou `'declined'`
- Meta Pixel só carrega se `localStorage.getItem('snapi_cookie_consent') === 'accepted'`
- Mesmo padrão aplicado no `checkout.html`

---

## Imagens da Galeria

Arquivos PNG na raiz (mockups com fundo transparente):
`mockup-hero-1.png` até `mockup-hero-13.png`

Galeria de temas (JPG na raiz):
`newborn-astronaut-theme-ai.jpg`, `newborn-cartoon.jpg`, `newborn-dinosaur-theme.jpg`, `newborn-easter-bunny.jpg`, `newborn-fairy-theme.jpg`, `newborn-floral.jpg`, `newborn-floral-basket.jpg`, `newborn-minimalist.jpg`, `newborn-natural.jpg`, `newborn-pirate.jpg`, `newborn-princess.jpg`, `newborn-safari.jpg`, `newborn-space.jpg`, `newborn-starry.jpg`, `newborn-superhero.jpg`, `newborn-teddy.jpg`

---

## Semana 2 — Pendente

- [ ] 174 cidades restantes (EUA + UK + AU + CA)
- [ ] Páginas Tema × Cidade (ex: princess-newborn-photos-new-york.html)
- [ ] Hreflang UK/AU/CA
- [ ] Badge "Created with SnapiBaby" para link building
- [ ] Product Hunt launch prep
- [ ] Mom blog outreach template

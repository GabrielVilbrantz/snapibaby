$cities = @(
  @{slug="new-york-ny";name="New York";state="NY";country="US";studioAvg=950},
  @{slug="los-angeles-ca";name="Los Angeles";state="CA";country="US";studioAvg=900},
  @{slug="chicago-il";name="Chicago";state="IL";country="US";studioAvg=800},
  @{slug="houston-tx";name="Houston";state="TX";country="US";studioAvg=750},
  @{slug="phoenix-az";name="Phoenix";state="AZ";country="US";studioAvg=720},
  @{slug="philadelphia-pa";name="Philadelphia";state="PA";country="US";studioAvg=780},
  @{slug="san-antonio-tx";name="San Antonio";state="TX";country="US";studioAvg=700},
  @{slug="san-diego-ca";name="San Diego";state="CA";country="US";studioAvg=850},
  @{slug="dallas-tx";name="Dallas";state="TX";country="US";studioAvg=760},
  @{slug="san-jose-ca";name="San Jose";state="CA";country="US";studioAvg=880},
  @{slug="austin-tx";name="Austin";state="TX";country="US";studioAvg=740},
  @{slug="jacksonville-fl";name="Jacksonville";state="FL";country="US";studioAvg=680},
  @{slug="charlotte-nc";name="Charlotte";state="NC";country="US";studioAvg=690},
  @{slug="san-francisco-ca";name="San Francisco";state="CA";country="US";studioAvg=980},
  @{slug="seattle-wa";name="Seattle";state="WA";country="US";studioAvg=860},
  @{slug="denver-co";name="Denver";state="CO";country="US";studioAvg=790},
  @{slug="nashville-tn";name="Nashville";state="TN";country="US";studioAvg=710},
  @{slug="miami-fl";name="Miami";state="FL";country="US";studioAvg=820},
  @{slug="atlanta-ga";name="Atlanta";state="GA";country="US";studioAvg=740},
  @{slug="portland-or";name="Portland";state="OR";country="US";studioAvg=800},
  @{slug="london-uk";name="London";state="UK";country="UK";studioAvg=900},
  @{slug="manchester-uk";name="Manchester";state="UK";country="UK";studioAvg=750},
  @{slug="sydney-au";name="Sydney";state="AU";country="AU";studioAvg=880},
  @{slug="melbourne-au";name="Melbourne";state="AU";country="AU";studioAvg=820},
  @{slug="toronto-ca";name="Toronto";state="ON";country="CA";studioAvg=850},
  @{slug="vancouver-ca";name="Vancouver";state="BC";country="CA";studioAvg=800}
)

foreach ($c in $cities) {
  $slug = $c.slug
  $name = $c.name
  $state = $c.state
  $avg = $c.studioAvg
  $location = if ($c.country -eq "US") { "$name, $state" } else { "$name, $state" }

$html = @"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Newborn Photography $location - Studio Quality at Home | SnapiBaby</title>
<meta name="description" content="AI newborn photography in $location. Studio-quality newborn portraits from a phone photo - no studio visit needed. Average $location studio costs `$$avg+. SnapiBaby from `$29. Free preview.">
<meta name="keywords" content="AI newborn photography $name, newborn photographer $name, newborn photos $location, AI baby photos $name, newborn portrait $location">
<meta property="og:type" content="website">
<meta property="og:title" content="AI Newborn Photography $location | SnapiBaby">
<meta property="og:description" content="Studio-quality newborn portraits from home in $location. Average studio cost `$$avg+. SnapiBaby from `$29 with free preview.">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://snapibaby.netlify.app/cities/ai-newborn-photography-$slug.html">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../styles.css">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Service","name":"AI Newborn Photography $location","provider":{"@type":"Organization","name":"SnapiBaby","url":"https://snapibaby.netlify.app"},"areaServed":{"@type":"City","name":"$name"},"offers":{"@type":"Offer","price":"29.00","priceCurrency":"USD"},"aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"18247"}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"How much does a newborn photographer cost in $location?","acceptedAnswer":{"@type":"Answer","text":"The average cost of a professional newborn photographer in $location is `$$avg-`$$($avg+200). This includes session fees and a limited set of edited digital photos. SnapiBaby delivers studio-quality AI newborn portraits from just `$29, with a free watermarked preview before you pay."}},{"@type":"Question","name":"Is there an alternative to hiring a newborn photographer in $name?","acceptedAnswer":{"@type":"Answer","text":"Yes. SnapiBaby uses AI to transform a simple phone photo of your newborn into a studio-quality portrait - no studio visit, no scheduling, no stress. From `$29 vs `$$avg+ at a $name studio."}},{"@type":"Question","name":"How do I get AI newborn photos in $location?","acceptedAnswer":{"@type":"Answer","text":"Simply visit SnapiBaby.com, enter your baby's name, upload 1-3 phone photos, and choose from 20+ themes. Your AI portraits are ready in under 8 minutes."}}]}
</script>
<style>
.city-hero{padding:80px 0 60px;background:linear-gradient(135deg,rgba(255,179,198,.2) 0%,transparent 60%);text-align:center}
.city-hero h1{font-family:'DM Serif Display',serif;font-size:clamp(1.8rem,4.5vw,3rem);line-height:1.2;margin-bottom:16px;color:#1a1a2e}
.hl-pink{background:linear-gradient(135deg,#f43f75,#ff8fa3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cost-box{background:#fff;border-radius:16px;padding:28px;border:2px solid #f0f0f0;max-width:700px;margin:40px auto}
.cost-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f5f5f5;font-size:.95rem}
.cost-row:last-child{border:0;padding-bottom:0}
.faq-item{background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:12px;border:1px solid #eee}
.faq-q{font-weight:700;margin-bottom:8px;color:#1a1a2e}
.faq-a{color:#555;line-height:1.6;font-size:.93rem}
.theme-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin:28px 0}
.theme-pill{background:#fff;border:1px solid #eee;border-radius:10px;padding:12px 16px;text-align:center;font-size:.88rem;font-weight:600;color:#1a1a2e;text-decoration:none;transition:.2s}
.theme-pill:hover{border-color:#f43f75;color:#f43f75}
</style>
</head>
<body>
<header class="navbar">
  <div class="container nav-content">
    <a href="../index.html" class="logo">🍼 Snapi<span>Baby</span></a>
    <nav class="desktop-nav">
      <a href="../index.html#como-funciona">How It Works</a>
      <a href="../index.html#temas">Themes</a>
      <a href="../index.html#planos">Pricing</a>
    </nav>
    <a href="../index.html#nome-do-bebe" class="btn-primary">Start Now</a>
  </div>
</header>
<main>
  <section class="city-hero">
    <div class="container">
      <div class="badge-viral">AI Newborn Photography - $location</div>
      <h1>AI Newborn Photography<br><span class="hl-pink">$location</span></h1>
      <p style="font-size:1.05rem;color:#555;max-width:620px;margin:0 auto 28px;line-height:1.7">Skip the `$$avg+ studio visit in $name. Send a simple phone photo and get a studio-quality AI newborn portrait in under 8 minutes - from `$29.</p>
      <a href="../index.html#nome-do-bebe" class="btn-primary" style="font-size:1.05rem;padding:15px 32px;">See Your Baby's Portrait Free</a>
      <div style="margin-top:12px;font-size:.82rem;color:#888">Free preview first - only pay if you love it</div>
    </div>
  </section>

  <section style="padding:60px 0">
    <div style="max-width:820px;margin:0 auto;padding:0 24px">

      <h2 style="font-family:'DM Serif Display',serif;font-size:1.9rem;margin-bottom:8px">Newborn Photography Costs in $location</h2>
      <p style="color:#555;margin-bottom:24px">Real cost data for $name families planning newborn portraits.</p>
      <div class="cost-box">
        <div class="cost-row"><span>Average studio session fee in $name</span><span style="font-weight:700;color:#c0392b">`$$([int]($avg*0.35))-`$$([int]($avg*0.55))</span></div>
        <div class="cost-row"><span>Edited digital photos (per image)</span><span style="font-weight:700;color:#c0392b">`$50-`$100 each</span></div>
        <div class="cost-row"><span>Travel + parking in $name</span><span style="font-weight:700;color:#c0392b">`$20-`$60</span></div>
        <div class="cost-row"><span style="font-weight:800">Average total in $location</span><span style="font-weight:800;font-size:1.1rem;color:#c0392b">`$$avg+</span></div>
        <div class="cost-row" style="background:rgba(244,63,117,.05);border-radius:8px;padding:12px;margin-top:8px"><span style="font-weight:800;color:#f43f75">SnapiBaby AI - same quality</span><span style="font-weight:800;font-size:1.1rem;color:#2e7d32">From `$29</span></div>
      </div>

      <h2 style="font-family:'DM Serif Display',serif;font-size:1.9rem;margin:48px 0 16px">20+ AI Newborn Themes Available</h2>
      <p style="color:#555;margin-bottom:0">Every theme available for $name moms - no studio required.</p>
      <div class="theme-grid">
        <a href="../themes/princess-newborn-photos.html" class="theme-pill">👑 Princess</a>
        <a href="../themes/astronaut-newborn-photos.html" class="theme-pill">🚀 Astronaut</a>
        <a href="../themes/fairy-newborn-photos.html" class="theme-pill">🧚 Fairy</a>
        <a href="../themes/safari-newborn-photos.html" class="theme-pill">🦁 Safari</a>
        <a href="../themes/superhero-newborn-photos.html" class="theme-pill">🦸 Superhero</a>
        <a href="../themes/floral-newborn-photos.html" class="theme-pill">🌸 Floral</a>
        <a href="../themes/pirate-newborn-photos.html" class="theme-pill">🏴 Pirate</a>
        <a href="../themes/space-newborn-photos.html" class="theme-pill">🌌 Space</a>
        <a href="../themes/dinosaur-newborn-photos.html" class="theme-pill">🦖 Dinosaur</a>
        <a href="../themes/starry-night-newborn-photos.html" class="theme-pill">✨ Starry Night</a>
        <a href="../themes/natural-newborn-photos.html" class="theme-pill">🌿 Natural</a>
        <a href="../themes/teddy-bear-newborn-photos.html" class="theme-pill">🧸 Teddy Bear</a>
      </div>

      <h2 style="font-family:'DM Serif Display',serif;font-size:1.9rem;margin:48px 0 24px">FAQ - Newborn Photography in $location</h2>
      <div class="faq-item"><div class="faq-q">How much does a newborn photographer cost in $location?</div><div class="faq-a">The average cost of a professional newborn photographer in $location is `$$avg-`$$($avg+200). This typically includes a studio session fee and a limited set of edited digital photos. SnapiBaby delivers the same studio-quality result from just `$29, with a free watermarked preview before you pay anything.</div></div>
      <div class="faq-item"><div class="faq-q">Is there an alternative to hiring a newborn photographer in $name?</div><div class="faq-a">Yes. SnapiBaby uses AI to transform a simple phone photo of your newborn into a studio-quality portrait in under 8 minutes - no studio visit, no scheduling, no stress. Thousands of moms in cities like $name have already made the switch.</div></div>
      <div class="faq-item"><div class="faq-q">How do I get AI newborn photos without leaving $name?</div><div class="faq-a">Simply enter your baby's name on SnapiBaby, upload 1-3 phone photos, choose from 20+ professional themes, and receive your AI portraits in under 8 minutes. No leaving home required.</div></div>
      <div class="faq-item"><div class="faq-q">Are AI newborn portraits good enough to print in $name?</div><div class="faq-a">Absolutely. All SnapiBaby portraits are delivered in 4K high resolution - perfect for large canvas prints up to 24x36 inches. Many $name moms print directly to canvas or order photo albums with their AI portraits.</div></div>

      <div style="background:linear-gradient(135deg,rgba(244,63,117,.08),rgba(255,143,163,.1));border:2px dashed #ff8fa3;border-radius:20px;padding:40px;text-align:center;margin-top:48px">
        <h2 style="font-family:'DM Serif Display',serif;font-size:1.8rem;margin-bottom:12px">Studio quality for $name moms - from home</h2>
        <p style="color:#555;margin-bottom:24px">18,247 moms have already skipped the `$$avg studio visit. See your baby's portrait free before paying anything.</p>
        <a href="../index.html#nome-do-bebe" class="btn-primary" style="font-size:1.05rem;padding:15px 36px;">Start Free Preview Now</a>
        <div style="margin-top:12px;font-size:.8rem;color:#888">4.9/5 stars - Only pay if you love it - Ready in 8 min</div>
      </div>
    </div>
  </section>
</main>
<footer>
  <div class="container footer-content">
    <div class="footer-col"><a href="../index.html" class="logo footer-logo">🍼 Snapi<span>Baby</span></a><p>Studio-quality newborn portraits - no studio needed.</p></div>
    <div class="footer-col"><strong>Popular Cities</strong><a href="ai-newborn-photography-new-york-ny.html">New York</a><a href="ai-newborn-photography-los-angeles-ca.html">Los Angeles</a><a href="ai-newborn-photography-london-uk.html">London</a><a href="ai-newborn-photography-sydney-au.html">Sydney</a></div>
    <div class="footer-col"><strong>Legal</strong><a href="../terms.html">Terms</a><a href="../privacy.html">Privacy</a></div>
  </div>
  <div class="footer-bottom"><p>2026 SnapiBaby. All rights reserved.</p></div>
</footer>
</body>
</html>
"@

  $outPath = "C:\Users\Home\Desktop\SNAPIBABY SITE\snapibaby\cities\ai-newborn-photography-$slug.html"
  [System.IO.File]::WriteAllText($outPath, $html, [System.Text.Encoding]::UTF8)
  Write-Host "Created: $slug"
}
Write-Host "Done - $($cities.Count) city pages"

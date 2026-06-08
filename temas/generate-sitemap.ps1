$base = "https://snapibaby.netlify.app"
$today = (Get-Date -Format "yyyy-MM-dd")

$urls = [System.Collections.Generic.List[string]]::new()

# Core pages
@("","app.html","checkout.html","success.html","upsell.html","terms.html","privacy.html") | ForEach-Object {
  $priority = if ($_ -eq "") { "1.0" } elseif ($_ -eq "app.html") { "0.9" } else { "0.6" }
  $urls.Add("  <url><loc>$base/$_</loc><lastmod>$today</lastmod><changefreq>weekly</changefreq><priority>$priority</priority></url>")
}

# Blog posts
@("newborn-at-home-ideas","best-time-newborn-photoshoot","newborn-photography-cost","monthly-baby-photoshoot-ideas","newborn-phone-photo-tips","baby-first-birthday-photoshoot","ai-vs-photographer","what-is-ai-newborn-photography","save-money-newborn-photography","princess-newborn-photo-ideas","gifts-for-new-moms","how-ai-newborn-editing-works") | ForEach-Object {
  $urls.Add("  <url><loc>$base/blog-post.html?post=$_</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>")
}

# Theme pages
@("princess","astronaut","fairy","safari","superhero","floral","pirate","space","dinosaur","starry-night","teddy-bear","minimalist","natural","easter-bunny","cartoon") | ForEach-Object {
  $urls.Add("  <url><loc>$base/themes/$_-newborn-photos.html</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>")
}

# City pages
@("new-york-ny","los-angeles-ca","chicago-il","houston-tx","phoenix-az","philadelphia-pa","san-antonio-tx","san-diego-ca","dallas-tx","san-jose-ca","austin-tx","jacksonville-fl","charlotte-nc","san-francisco-ca","seattle-wa","denver-co","nashville-tn","miami-fl","atlanta-ga","portland-or","london-uk","manchester-uk","sydney-au","melbourne-au","toronto-ca","vancouver-ca") | ForEach-Object {
  $urls.Add("  <url><loc>$base/cities/ai-newborn-photography-$_.html</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>")
}

$sitemap = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
$($urls -join "`n")
</urlset>
"@

[System.IO.File]::WriteAllText("C:\Users\Home\Desktop\SNAPIBABY SITE\snapibaby\sitemap.xml", $sitemap, [System.Text.Encoding]::UTF8)
Write-Host "Sitemap created with $($urls.Count) URLs"

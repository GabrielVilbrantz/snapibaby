$filePath = "snapibaby\index.html"
$lines = Get-Content $filePath -Encoding UTF8

# Sections (0-indexed)
$heroPart     = $lines[0..397]        # Lines 1-398: everything up to end of hero
$compSection  = $lines[399..440]      # Lines 400-441: comparison section
$emotSection  = $lines[442..454]      # Lines 443-455: emotional section
$howSection   = $lines[456..477]      # Lines 457-478: how-it-works section
$gallSection  = $lines[479..670]      # Lines 480-671: gallery section
$premSection  = $lines[672..701]      # Lines 673-702: premium testimonials section
$photoSection = $lines[703..1074]     # Lines 704-1075: photo testimonials section + script
$pricingPart  = $lines[1075..($lines.Count-1)]  # Lines 1076-end: blank + pricing onwards

# New order: Hero → Gallery → Photo TS → How It Works → Comparison → Emotional → Premium TS → Pricing
$newLines = $heroPart +
            @("") + $gallSection +
            @("") + $photoSection +
            @("") + $howSection +
            @("") + $compSection +
            @("") + $emotSection +
            @("") + $premSection +
            $pricingPart

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines((Resolve-Path $filePath).Path, $newLines, $utf8NoBom)

Write-Host "Done! Total lines: $($newLines.Count)"
Write-Host "New section order:"
Write-Host "  1. Hero"
Write-Host "  2. Gallery (themes)"
Write-Host "  3. Photo Testimonials (with real photos)"
Write-Host "  4. How It Works"
Write-Host "  5. Comparison (Studio vs SnapiBaby)"
Write-Host "  6. Emotional copy"
Write-Host "  7. Premium Testimonials carousel"
Write-Host "  8. Pricing, FAQ, Blog, Guarantee"

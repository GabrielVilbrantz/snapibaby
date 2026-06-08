$filePath = "snapibaby/index.html"
$content = [System.IO.File]::ReadAllText((Resolve-Path $filePath).Path, [System.Text.Encoding]::UTF8)

# Simple replacement: all $19 → $29
$content = $content.Replace('$19', '$29')

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Resolve-Path $filePath).Path, $content, $utf8NoBom)

# Verify
$remaining = ([regex]::Matches($content, '\$19')).Count
Write-Host "Remaining dollar-19 refs: $remaining"
if ($remaining -eq 0) { Write-Host "All $19 references updated to $29 successfully!" }

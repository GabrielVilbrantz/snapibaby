Add-Type -AssemblyName System.Drawing

$imageDir = Split-Path $MyInvocation.MyCommand.Path
$Tolerance = 30

for ($i = 1; $i -le 13; $i++) {
    $inputPath  = "$imageDir\mockup-hero-$i.jpg"
    $outputPath = "$imageDir\mockup-hero-$i.png"

    if (-not (Test-Path $inputPath)) { Write-Host "Skipping $i (not found)"; continue }
    Write-Host "Processing mockup-hero-$i.jpg..." -ForegroundColor Cyan

    $src = [System.Drawing.Bitmap]::new($inputPath)
    $w   = $src.Width
    $h   = $src.Height

    # Create 32bpp ARGB bitmap
    $dst = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g   = [System.Drawing.Graphics]::FromImage($dst)
    $g.DrawImage($src, 0, 0)
    $g.Dispose(); $src.Dispose()

    # Lock bits → byte array  (BGRA order)
    $rect    = [System.Drawing.Rectangle]::new(0, 0, $w, $h)
    $bmpData = $dst.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite,
                             [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $byteCount = $bmpData.Stride * $h
    $bytes = [byte[]]::new($byteCount)
    [System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $bytes, 0, $byteCount)
    $dst.UnlockBits($bmpData)

    $thr = 255 - $Tolerance

    # BFS flood fill from all 4 edges
    $visited = [bool[]]::new($w * $h)
    $queue   = [System.Collections.Generic.Queue[int]]::new()

    function Enqueue-IfWhite([int]$idx) {
        if ($visited[$idx]) { return }
        $b = $idx * 4
        if ($bytes[$b] -ge $thr -and $bytes[$b+1] -ge $thr -and $bytes[$b+2] -ge $thr) {
            $visited[$idx] = $true
            $queue.Enqueue($idx)
        }
    }

    for ($x = 0; $x -lt $w; $x++) {
        Enqueue-IfWhite($x)
        Enqueue-IfWhite(($h-1)*$w + $x)
    }
    for ($y = 1; $y -lt ($h-1); $y++) {
        Enqueue-IfWhite($y*$w)
        Enqueue-IfWhite($y*$w + $w - 1)
    }

    while ($queue.Count -gt 0) {
        $idx = $queue.Dequeue()
        $bytes[$idx*4 + 3] = 0   # alpha = 0 (transparent)

        $px = $idx % $w
        $py = [int]($idx / $w)
        if ($py -gt 0)     { Enqueue-IfWhite($idx - $w) }
        if ($py -lt $h-1)  { Enqueue-IfWhite($idx + $w) }
        if ($px -gt 0)     { Enqueue-IfWhite($idx - 1)  }
        if ($px -lt $w-1)  { Enqueue-IfWhite($idx + 1)  }
    }

    # Write bytes back and save as PNG
    $bmpData2 = $dst.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly,
                               [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $bmpData2.Scan0, $byteCount)
    $dst.UnlockBits($bmpData2)
    $dst.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dst.Dispose()

    Write-Host "  Saved: mockup-hero-$i.png" -ForegroundColor Green
}

Write-Host "`nDone! All images processed." -ForegroundColor Yellow

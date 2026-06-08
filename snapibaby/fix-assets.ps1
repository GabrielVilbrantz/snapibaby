# Fix 1: Copy og-image to snapibaby folder
$src = "C:\Users\Home\.gemini\antigravity\brain\69a66517-19d3-4ac8-9fc0-efadc1421ca6\snapibaby_og_image_1778204350531.png"
$dst = "C:\Users\Home\Desktop\SNAPIBABY SITE\snapibaby\og-image.png"
Copy-Item $src $dst -Force
Write-Host "og-image.png copied. ✅"

# Fix 2: Create favicon.ico using System.Drawing (PNG-in-ICO)
Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(32, 32)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

# Pink circle background
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 244, 63, 117))
$g.FillEllipse($brush, 0, 0, 31, 31)

# White "S" letter
$font = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("S", $font, $whiteBrush, [System.Drawing.RectangleF]::new(0, 0, 32, 32), $sf)
$g.Dispose()

# Export PNG bytes to memory
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()
$ms.Dispose()
$bmp.Dispose()

# Build ICO file structure (PNG-in-ICO)
$icoStream = New-Object System.IO.MemoryStream
# Header: reserved(2), type=1(2), count=1(2)
$icoStream.WriteByte(0); $icoStream.WriteByte(0)
$icoStream.WriteByte(1); $icoStream.WriteByte(0)
$icoStream.WriteByte(1); $icoStream.WriteByte(0)
# Directory entry: width, height, colorCount, reserved
$icoStream.WriteByte(32); $icoStream.WriteByte(32); $icoStream.WriteByte(0); $icoStream.WriteByte(0)
# colorPlanes, bitsPerPixel
$icoStream.WriteByte(1); $icoStream.WriteByte(0)
$icoStream.WriteByte(32); $icoStream.WriteByte(0)
# Size of image data (4 bytes LE)
$size = $pngBytes.Length
$icoStream.WriteByte($size -band 0xFF)
$icoStream.WriteByte(($size -shr 8) -band 0xFF)
$icoStream.WriteByte(($size -shr 16) -band 0xFF)
$icoStream.WriteByte(($size -shr 24) -band 0xFF)
# Offset to image data = 22 (6 header + 16 directory)
$icoStream.WriteByte(22); $icoStream.WriteByte(0); $icoStream.WriteByte(0); $icoStream.WriteByte(0)
# PNG data
$icoStream.Write($pngBytes, 0, $pngBytes.Length)

[System.IO.File]::WriteAllBytes("C:\Users\Home\Desktop\SNAPIBABY SITE\snapibaby\favicon.ico", $icoStream.ToArray())
$icoStream.Dispose()
Write-Host "favicon.ico created. ✅"

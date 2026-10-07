Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\bhaal\.gemini\antigravity\brain\f50946f6-a434-48cf-9d7e-9cf74c91568d\sanad_app_icon_1791059692705.jpg"
$img = [System.Drawing.Bitmap]::FromFile($srcPath)

function Resize-Image($orig, $w, $h, $destPath, $format) {
    $dest = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($orig, 0, 0, $w, $h)
    $dest.Save($destPath, $format)
    $g.Dispose()
    $dest.Dispose()
    Write-Host "Created: $destPath"
}

# 1. 1024x1024 PNG
Resize-Image $img 1024 1024 "public\sanad-app-icon.png" ([System.Drawing.Imaging.ImageFormat]::Png)

# 2. 512x512 PNG
Resize-Image $img 512 512 "public\icon-512.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-Image $img 512 512 "src\app\icon.png" ([System.Drawing.Imaging.ImageFormat]::Png)

# 3. 192x192 PNG
Resize-Image $img 192 192 "public\icon-192.png" ([System.Drawing.Imaging.ImageFormat]::Png)

# 4. 180x180 Apple Touch Icon
Resize-Image $img 180 180 "public\apple-touch-icon.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-Image $img 180 180 "src\app\apple-icon.png" ([System.Drawing.Imaging.ImageFormat]::Png)

# 5. Favicon ICO (48x48 / 32x32)
# To save as proper ICO:
$destIco = New-Object System.Drawing.Bitmap(48, 48)
$gIco = [System.Drawing.Graphics]::FromImage($destIco)
$gIco.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gIco.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gIco.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gIco.DrawImage($img, 0, 0, 48, 48)
$icoHandle = $destIco.GetHicon()
$iconObj = [System.Drawing.Icon]::FromHandle($icoHandle)
$stream1 = [System.IO.File]::OpenWrite("public\favicon.ico")
$iconObj.Save($stream1)
$stream1.Close()
$stream2 = [System.IO.File]::OpenWrite("src\app\favicon.ico")
$iconObj.Save($stream2)
$stream2.Close()
$iconObj.Dispose()
$gIco.Dispose()
$destIco.Dispose()
Write-Host "Created: public\favicon.ico and src\app\favicon.ico"

$img.Dispose()
Write-Host "All Sanad icons generated successfully!"

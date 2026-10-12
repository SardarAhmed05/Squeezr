#requires -Version 5.1
<#
Signs the built Squeezr executables with Authenticode.

Usage:
  powershell -ExecutionPolicy Bypass -File scripts/sign.ps1
      Uses (or creates) a self-signed "CN=Squeezr Project" code-signing
      certificate in CurrentUser\My and signs every .exe in .\release.

  powershell -ExecutionPolicy Bypass -File scripts/sign.ps1 `
      -CertPath C:\path\cert.pfx -CertPassword "secret"
      Signs with a real certificate (recommended for distribution).

Note: a self-signed certificate is NOT trusted by other machines. For
SmartScreen-clean distribution, use a certificate issued by a public CA.
#>
param(
  [string]$CertPath,
  [string]$CertPassword,
  [string]$ReleaseDir = (Join-Path $PSScriptRoot "..\release"),
  [string]$TimestampUrl = "",
  [switch]$TrustSelfSigned
)

$ErrorActionPreference = "Stop"
$subject = "CN=Squeezr Project"

function Get-SigningCert {
  if ($CertPath) {
    if (-not (Test-Path -LiteralPath $CertPath)) { throw "Certificate not found: $CertPath" }
    $sec = ConvertTo-SecureString -String $CertPassword -AsPlainText -Force
    $imported = Import-PfxCertificate -FilePath $CertPath -CertStoreLocation Cert:\CurrentUser\My -Password $sec
    Write-Host "Imported certificate: $($imported.Subject)"
    return $imported
  }

  $existing = Get-ChildItem Cert:\CurrentUser\My |
    Where-Object { $_.Subject -eq $subject -and $_.HasPrivateKey } |
    Select-Object -First 1
  if ($existing) {
    Write-Host "Using existing certificate: $($existing.Thumbprint)"
    return $existing
  }

  Write-Host "Creating self-signed code-signing certificate ($subject)..."
  $cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $subject `
    -CertStoreLocation Cert:\CurrentUser\My `
    -KeyUsage DigitalSignature `
    -KeyAlgorithm RSA -KeyLength 3072 `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(5) `
    -FriendlyName "Squeezr self-signed code signing"
  Write-Host "Created certificate: $($cert.Thumbprint)"
  return $cert
}

$cert = Get-SigningCert

# Optionally trust the self-signed cert for the current user so signatures
# verify as Valid on this machine (reversible; remove from Cert:\CurrentUser\Root).
if ($TrustSelfSigned -and -not $CertPath) {
  $cerPath = Join-Path $env:TEMP "squeezr-codesign.cer"
  Export-Certificate -Cert $cert -FilePath $cerPath -Force | Out-Null
  try {
    Import-Certificate -FilePath $cerPath -CertStoreLocation Cert:\CurrentUser\Root | Out-Null
    Write-Host "Added certificate to CurrentUser\Trusted Root (this user only)."
  } catch {
    Write-Warning "Could not add to Trusted Root: $($_.Exception.Message)"
  }
}

$exes = Get-ChildItem -LiteralPath $ReleaseDir -Filter *.exe -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -notmatch "uninstaller" }
if (-not $exes) { throw "No .exe files found in $ReleaseDir. Run 'npm run dist' first." }

foreach ($exe in $exes) {
  Write-Host "Signing $($exe.Name) ..."
  if ($TimestampUrl) {
    try {
      Set-AuthenticodeSignature -FilePath $exe.FullName -Certificate $cert `
        -TimestampServer $TimestampUrl -HashAlgorithm SHA256 | Out-Null
    } catch {
      Write-Warning "Timestamped signing failed ($($_.Exception.Message)); retrying without timestamp."
      Set-AuthenticodeSignature -FilePath $exe.FullName -Certificate $cert -HashAlgorithm SHA256 | Out-Null
    }
  } else {
    Set-AuthenticodeSignature -FilePath $exe.FullName -Certificate $cert -HashAlgorithm SHA256 | Out-Null
  }
  $v = Get-AuthenticodeSignature -FilePath $exe.FullName
  Write-Host ("  -> {0}  ({1})" -f $v.Status, $v.SignerCertificate.Subject)
}

Write-Host "`nSignature summary:"
Get-ChildItem -LiteralPath $ReleaseDir -Filter *.exe -File |
  ForEach-Object {
    $s = Get-AuthenticodeSignature -FilePath $_.FullName
    "{0,-42} {1}" -f $_.Name, $s.Status
  }

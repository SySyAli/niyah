# ============================================================
# Expo WSL2 Dev Setup Script
# Run this in PowerShell as Administrator
# Re-run this every time you restart your computer, as the
# WSL2 internal IP changes on each boot.
# ============================================================

# Ports used by Expo Metro bundler
$ports = @(8081)

# Get the current WSL2 internal IP
$wslIp = (wsl hostname -I).Trim().Split(" ")[0]

if (-not $wslIp) {
    Write-Error "Could not get WSL2 IP. Make sure WSL is running."
    exit 1
}

Write-Host "WSL2 IP detected: $wslIp" -ForegroundColor Cyan

foreach ($port in $ports) {
    # Remove any existing portproxy rule for this port to avoid stale entries
    netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 | Out-Null

    # Add new portproxy rule forwarding Windows -> WSL2
    netsh interface portproxy add v4tov4 `
        listenport=$port `
        listenaddress=0.0.0.0 `
        connectport=$port `
        connectaddress=$wslIp

    Write-Host "Port proxy set: 0.0.0.0:${port} -> ${wslIp}:${port}" -ForegroundColor Green

    # Add firewall rule if it doesn't already exist
    $ruleName = "Expo Port $port"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

    if (-not $existingRule) {
        New-NetFirewallRule `
            -DisplayName $ruleName `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort $port `
            -Action Allow `
            -Profile Any | Out-Null
        Write-Host "Firewall rule created: $ruleName" -ForegroundColor Green
    } else {
        Write-Host "Firewall rule already exists: $ruleName" -ForegroundColor Yellow
    }
}

# Show your Wi-Fi IP so you know what to type into your phone
Write-Host ""
Write-Host "Active port proxy rules:" -ForegroundColor Cyan
netsh interface portproxy show all

Write-Host ""
$wifiIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -like "*Wi-Fi*" -and $_.IPAddress -notlike "169.*"
} | Select-Object -First 1).IPAddress

if ($wifiIp) {
    Write-Host "Your Wi-Fi IP (use this on your phone): $wifiIp" -ForegroundColor Magenta
    Write-Host "Connect your dev client to: http://$wifiIp:8081" -ForegroundColor Magenta
} else {
    Write-Host "Could not auto-detect Wi-Fi IP. Run ipconfig and look for your Wi-Fi adapter." -ForegroundColor Red
}
# One-command deploy: dump seed → build frontend → copy → push to Railway
Set-Location "$PSScriptRoot\backend"
node dump-seed.js
Copy-Item "data-seed.json" "$PSScriptRoot\data-seed.json" -Force
Set-Location "$PSScriptRoot\cng-fuel-app"
npx vite build
if (-not $?) { exit 1 }
Remove-Item -Recurse -Force "$PSScriptRoot\dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$PSScriptRoot\backend\dist" -ErrorAction SilentlyContinue
Copy-Item -Recurse "dist" "$PSScriptRoot\dist"
Copy-Item -Recurse "dist" "$PSScriptRoot\backend\dist"
Set-Location "$PSScriptRoot\backend"
git add -A
git commit -m "update frontend + data seed"
git push origin main
Write-Host "Deployed! Railway will auto-restore data from seed file."
Write-Host "Wait 1-2 min, then open: https://web-production-e466.up.railway.app/"

# ================================================================
# PIXEL-NET Arcade Cleanup Script
# Run this from PowerShell in the Arcade folder:
#   cd C:\Users\28twa\Desktop\Arcade
#   .\CLEANUP.ps1
# ================================================================

$BASE = $PSScriptRoot

function Remove-Safe($path) {
    $full = Join-Path $BASE $path
    if (Test-Path $full) {
        Remove-Item -Recurse -Force $full
        Write-Host "  DELETED: $path" -ForegroundColor Green
    }
}

Write-Host "`n=== PIXEL-NET ARCADE CLEANUP ===" -ForegroundColor Cyan

# ── 1. CLEAR GIT LOCK (if stuck) ─────────────────────────────
$lock = Join-Path $BASE ".git\index.lock"
if (Test-Path $lock) {
    Remove-Item -Force $lock
    Write-Host "  CLEARED: .git\index.lock" -ForegroundColor Yellow
}

# ── 2. ROOT LEVEL JUNK ───────────────────────────────────────
Write-Host "`n[ROOT] Removing junk files..." -ForegroundColor Cyan
Remove-Safe "HW7_with_graph.pdf"
Remove-Safe "CHANGELOG.md"
Remove-Safe "HANDOFF.md"
Remove-Safe "LAYOUT_NOTES.txt"
Remove-Safe "PATCH_NOTES.txt"
Remove-Safe "PATCH_ONLY_README.txt"
Remove-Safe "QA_REPORT.md"
Remove-Safe "README_ADD_CREEK_CROSSER.txt"
Remove-Safe "README_PATCH_CREEK_CROSSER_V1_3.txt"
Remove-Safe "fix_pixelnet_paths.py"
Remove-Safe "package.json"
Remove-Safe "backend"
Remove-Safe "games"
Remove-Safe "millipede-react-src"
Remove-Safe "CLEANUP.ps1"   # self-destruct after run

# ── 3. PIXEL-NET INTERNAL JUNK ───────────────────────────────
Write-Host "`n[PIXEL-NET] Removing archive/legacy folders..." -ForegroundColor Cyan
Remove-Safe "PIXEL-NET\_archive"
Remove-Safe "PIXEL-NET\_legacy_wrappers_rerun_2026-02-03"
Remove-Safe "PIXEL-NET\archive"
Remove-Safe "PIXEL-NET\thumbnails"
Remove-Safe "PIXEL-NET\css"
Remove-Safe "PIXEL-NET\js"
Remove-Safe "PIXEL-NET\package.json"
Remove-Safe "PIXEL-NET\style.css"

# ── 4. ASSETS CLEANUP ────────────────────────────────────────
Write-Host "`n[ASSETS] Removing unused thumbnails..." -ForegroundColor Cyan
Remove-Safe "PIXEL-NET\assets\creek-crosser-thumb.png"
Remove-Safe "PIXEL-NET\assets\cyber-python_thumb.jpg"
Remove-Safe "PIXEL-NET\assets\cyber-python_thumb.png"
Remove-Safe "PIXEL-NET\assets\layout-tester-thumb.png"
Remove-Safe "PIXEL-NET\assets\layout-tester_thumb.png"
Remove-Safe "PIXEL-NET\assets\layout-tester_thumb.svg"
Remove-Safe "PIXEL-NET\assets\neon-arena-assault_thumb.png"
Remove-Safe "PIXEL-NET\assets\neon-maze-chase_thumb.png"
Remove-Safe "PIXEL-NET\assets\neon-trail-riders_thumb.png"
Remove-Safe "PIXEL-NET\assets\thumbnails"

# ── 5. OLD GAME FOLDERS ──────────────────────────────────────
Write-Host "`n[GAMES] Removing old/unlisted game folders..." -ForegroundColor Cyan
Remove-Safe "PIXEL-NET\games\_wrapper.html"
Remove-Safe "PIXEL-NET\games\astrotype"
Remove-Safe "PIXEL-NET\games\creek-crosser"
Remove-Safe "PIXEL-NET\games\creek-crosser-v2"
Remove-Safe "PIXEL-NET\games\cyber-python"
Remove-Safe "PIXEL-NET\games\layout-tester"
Remove-Safe "PIXEL-NET\games\logic-bomb"
Remove-Safe "PIXEL-NET\games\millipede-react"
Remove-Safe "PIXEL-NET\games\millipede-react-v2"
Remove-Safe "PIXEL-NET\games\neon-arena-assault"
Remove-Safe "PIXEL-NET\games\neon-chase"
Remove-Safe "PIXEL-NET\games\neon-chase__embedA"
Remove-Safe "PIXEL-NET\games\neon-maze-chase"
Remove-Safe "PIXEL-NET\games\neon-trail-riders"
Remove-Safe "PIXEL-NET\games\robo-arena"
Remove-Safe "PIXEL-NET\games\robo-arena__embedA"

# ── 6. LEGACY/EMBED FILES IN ACTIVE GAMES ────────────────────
Write-Host "`n[GAMES] Removing .legacy.html and embed.html files..." -ForegroundColor Cyan
Remove-Safe "PIXEL-NET\games\astrotype-v2\embed.html"
Remove-Safe "PIXEL-NET\games\astrotype-v2\wrapper-v2.legacy.html"
Remove-Safe "PIXEL-NET\games\caked-up-cats\index.html"
Remove-Safe "PIXEL-NET\games\caked-up-cats\wrapper-v2.legacy.html"
Remove-Safe "PIXEL-NET\games\creek-crosser__embedA\index.html"
Remove-Safe "PIXEL-NET\games\creek-crosser__embedA\wrapper-v2.legacy.html"
Remove-Safe "PIXEL-NET\games\knight-flight-v2\embed.html"
Remove-Safe "PIXEL-NET\games\knight-flight-v2\wrapper-v2.legacy.html"
Remove-Safe "PIXEL-NET\games\logic-bomb-v2\embed.html"
Remove-Safe "PIXEL-NET\games\logic-bomb-v2\wrapper-v2.legacy.html"
Remove-Safe "PIXEL-NET\games\millipede-chaos-v3\wrapper-v2.legacy.html"
Remove-Safe "PIXEL-NET\games\retro-kombat-v2\wrapper-v2.legacy.html"
Remove-Safe "PIXEL-NET\games\vector-duel\index.html"

# ── 7. GIT COMMIT & PUSH ─────────────────────────────────────
Write-Host "`n[GIT] Committing and pushing..." -ForegroundColor Cyan
Set-Location $BASE
git add -A
git commit -m "chore: clean up repo — remove archives, legacy wrappers, old game versions, junk files"
git push
Write-Host "`n=== DONE! Arcade is clean. ===" -ForegroundColor Green
Write-Host "Active games: caked-up-cats, creek-crosser, astrotype-v2, knight-flight-v2," -ForegroundColor White
Write-Host "              retro-kombat-v2, logic-bomb-v2, neon-chase-v2, robo-arena-v2," -ForegroundColor White
Write-Host "              millipede-chaos-v3, spyder-casino" -ForegroundColor White

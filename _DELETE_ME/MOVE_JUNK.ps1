$BASE = $PSScriptRoot
$DEST = Join-Path $BASE '_DELETE_ME'
New-Item -ItemType Directory -Force $DEST | Out-Null

function Move-Safe($rel) {
    $src = Join-Path $BASE $rel
    if (Test-Path $src) {
        $dst = Join-Path $DEST $rel
        New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
        Move-Item -Force $src $dst
        Write-Host ('  MOVED: ' + $rel) -ForegroundColor Green
    }
}

Write-Host 'Moving junk to _DELETE_ME ...' -ForegroundColor Cyan

Move-Safe 'HW7_with_graph.pdf'
Move-Safe 'CHANGELOG.md'
Move-Safe 'HANDOFF.md'
Move-Safe 'LAYOUT_NOTES.txt'
Move-Safe 'PATCH_NOTES.txt'
Move-Safe 'PATCH_ONLY_README.txt'
Move-Safe 'QA_REPORT.md'
Move-Safe 'README_ADD_CREEK_CROSSER.txt'
Move-Safe 'README_PATCH_CREEK_CROSSER_V1_3.txt'
Move-Safe 'fix_pixelnet_paths.py'
Move-Safe 'package.json'
Move-Safe 'backend'
Move-Safe 'games'
Move-Safe 'millipede-react-src'
Move-Safe 'CLEANUP.ps1'

Move-Safe 'PIXEL-NET\_archive'
Move-Safe 'PIXEL-NET\_legacy_wrappers_rerun_2026-02-03'
Move-Safe 'PIXEL-NET\archive'
Move-Safe 'PIXEL-NET\thumbnails'
Move-Safe 'PIXEL-NET\css'
Move-Safe 'PIXEL-NET\js'
Move-Safe 'PIXEL-NET\package.json'
Move-Safe 'PIXEL-NET\style.css'

Move-Safe 'PIXEL-NET\assets\creek-crosser-thumb.png'
Move-Safe 'PIXEL-NET\assets\cyber-python_thumb.jpg'
Move-Safe 'PIXEL-NET\assets\cyber-python_thumb.png'
Move-Safe 'PIXEL-NET\assets\layout-tester-thumb.png'
Move-Safe 'PIXEL-NET\assets\layout-tester_thumb.png'
Move-Safe 'PIXEL-NET\assets\layout-tester_thumb.svg'
Move-Safe 'PIXEL-NET\assets\neon-arena-assault_thumb.png'
Move-Safe 'PIXEL-NET\assets\neon-maze-chase_thumb.png'
Move-Safe 'PIXEL-NET\assets\neon-trail-riders_thumb.png'
Move-Safe 'PIXEL-NET\assets\thumbnails'

Move-Safe 'PIXEL-NET\games\_wrapper.html'
Move-Safe 'PIXEL-NET\games\astrotype'
Move-Safe 'PIXEL-NET\games\creek-crosser'
Move-Safe 'PIXEL-NET\games\creek-crosser-v2'
Move-Safe 'PIXEL-NET\games\cyber-python'
Move-Safe 'PIXEL-NET\games\layout-tester'
Move-Safe 'PIXEL-NET\games\logic-bomb'
Move-Safe 'PIXEL-NET\games\millipede-react'
Move-Safe 'PIXEL-NET\games\millipede-react-v2'
Move-Safe 'PIXEL-NET\games\neon-arena-assault'
Move-Safe 'PIXEL-NET\games\neon-chase'
Move-Safe 'PIXEL-NET\games\neon-chase__embedA'
Move-Safe 'PIXEL-NET\games\neon-maze-chase'
Move-Safe 'PIXEL-NET\games\neon-trail-riders'
Move-Safe 'PIXEL-NET\games\robo-arena'
Move-Safe 'PIXEL-NET\games\robo-arena__embedA'

Move-Safe 'PIXEL-NET\games\astrotype-v2\embed.html'
Move-Safe 'PIXEL-NET\games\astrotype-v2\wrapper-v2.legacy.html'
Move-Safe 'PIXEL-NET\games\caked-up-cats\index.html'
Move-Safe 'PIXEL-NET\games\caked-up-cats\wrapper-v2.legacy.html'
Move-Safe 'PIXEL-NET\games\creek-crosser__embedA\index.html'
Move-Safe 'PIXEL-NET\games\creek-crosser__embedA\wrapper-v2.legacy.html'
Move-Safe 'PIXEL-NET\games\knight-flight-v2\embed.html'
Move-Safe 'PIXEL-NET\games\knight-flight-v2\wrapper-v2.legacy.html'
Move-Safe 'PIXEL-NET\games\logic-bomb-v2\embed.html'
Move-Safe 'PIXEL-NET\games\logic-bomb-v2\wrapper-v2.legacy.html'
Move-Safe 'PIXEL-NET\games\millipede-chaos-v3\wrapper-v2.legacy.html'
Move-Safe 'PIXEL-NET\games\retro-kombat-v2\wrapper-v2.legacy.html'
Move-Safe 'PIXEL-NET\games\vector-duel\index.html'

$lock = Join-Path $BASE '.git\index.lock'
if (Test-Path $lock) {
    Remove-Item -Force $lock
    Write-Host 'Cleared stuck .git\index.lock' -ForegroundColor Yellow
}

Write-Host 'Done. All junk is in _DELETE_ME - delete that folder when ready.' -ForegroundColor Green

Set-Location $BASE
git add -A
git commit -m 'chore: clean up repo, remove legacy files and old game versions'
git push
Write-Host 'Pushed to GitHub.' -ForegroundColor Green

# Compila Oikos para publicarlo en la subcarpeta de GitHub Pages.
#
# Por qué hace falta un script y no basta con `vite build`:
#
# - En GitHub Pages la app vive en `https://<usuario>.github.io/oikos/`, no en la raiz. Vite
#   tiene que saberlo (variable `OIKOS_BASE`) o las rutas de los ficheros apuntaran al sitio
#   equivocado y la pagina se servira en blanco. En local no se nota porque se sirve desde '/'.
# - La variable de entorno se pone aqui y no en el flujo de publicacion para que el comando
#   sea EL MISMO en el portatil y en GitHub Actions: lo que se prueba es lo que se publica.
#
# Uso:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-pages.ps1

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$env:OIKOS_BASE = '/oikos/'

Write-Host "Compilando para la subcarpeta $env:OIKOS_BASE" -ForegroundColor Cyan

# Se comprueban los tipos ANTES de compilar: un error de tipos no siempre rompe la
# compilacion (Vite no comprueba tipos), y entonces se publicaria codigo roto.
& npm.cmd run typecheck
if ($LASTEXITCODE -ne 0) { throw 'El revision de tipos ha fallado: no se publica.' }

& npx.cmd vite build
if ($LASTEXITCODE -ne 0) { throw 'La compilacion ha fallado.' }

Write-Host ''
Write-Host 'Compilado en dist/ con las rutas de /oikos/.' -ForegroundColor Green
Write-Host 'Comprueba el despliegue con:  npm run test:pages'

# Publica Oikos en GitHub Pages, comprobando antes que todo funciona.
#
# Existe para que publicar no dependa de recordar seis pasos en el orden correcto. Lo que hace,
# en este orden:
#
#   1. Comprueba que no hay cambios sin guardar (si los hay, se para: se publicaria otra cosa).
#   2. Pasa TODAS las pruebas y compila en modo subcarpeta. Si algo falla, NO se sube nada.
#   3. Sube a GitHub. Si el repositorio todavia no existe, lo dice con el enlace exacto para
#      crearlo (GitHub no deja crear un repositorio con un `push`: hay que crearlo en la web).
#   4. Recuerda activar Pages la primera vez y lanza la comprobacion de la app publicada.
#
# Uso:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/publicar.ps1

$ErrorActionPreference = 'Stop'

# En PowerShell 7.4+ los programas externos que escriben en la salida de error (npm avisa de
# muchas cosas por ahi) pueden lanzar una excepcion y cortar el script sin explicacion. Aqui
# interesa mirar el codigo de salida a mano, que es mas fiable.
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$usuario = 'oscarmestre2011'
$repositorio = 'oikos'
$urlRemoto = "https://github.com/$usuario/$repositorio.git"
$urlApp = "https://$usuario.github.io/$repositorio/"

function Titulo($texto) {
    Write-Host ''
    Write-Host "=== $texto ===" -ForegroundColor Cyan
}

# --- 1. Nada sin guardar ----------------------------------------------------
Titulo 'Comprobando el estado del repositorio'

$pendientes = & git status --porcelain
if ($pendientes) {
    Write-Host 'Hay cambios sin guardar en el repositorio:' -ForegroundColor Yellow
    & git status --short
    Write-Host ''
    Write-Host 'Guardalos antes de publicar (o descarta los que no quieras), para que lo que se' -ForegroundColor Yellow
    Write-Host 'publica sea exactamente lo que has revisado.' -ForegroundColor Yellow
    exit 1
}
Write-Host 'Todo guardado.' -ForegroundColor Green

# --- 2. Todas las pruebas y la compilacion de publicacion -------------------
Titulo 'Pasando las pruebas y compilando para la subcarpeta'

& npm.cmd run verify:all
if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'Alguna comprobacion ha fallado: NO se publica nada.' -ForegroundColor Red
    Write-Host 'Se queda la version anterior, que si funciona.' -ForegroundColor Red
    exit 1
}
Write-Host ''
Write-Host 'Todo correcto.' -ForegroundColor Green

# --- 3. Subir ---------------------------------------------------------------
Titulo 'Subiendo a GitHub'

$remoto = & git remote get-url origin 2>$null
if (-not $remoto) {
    Write-Host "Configurando el remoto: $urlRemoto"
    & git remote add origin $urlRemoto
}

$respuesta = & git push -u origin main 2>&1
$codigo = $LASTEXITCODE
$respuesta | ForEach-Object { Write-Host $_ }

if ($codigo -ne 0) {
    if (($respuesta -join "`n") -match 'not found|Repository not found') {
        Write-Host ''
        Write-Host 'El repositorio todavia NO existe en GitHub.' -ForegroundColor Yellow
        Write-Host 'GitHub no permite crearlo con un push: hay que crearlo en la web (es un minuto).' -ForegroundColor Yellow
        Write-Host ''
        Write-Host '  1. Abre: https://github.com/new' -ForegroundColor White
        Write-Host "  2. Nombre: $repositorio     Visibilidad: Publico" -ForegroundColor White
        Write-Host '  3. NO marques "Add a README", ni .gitignore, ni licencia.' -ForegroundColor White
        Write-Host '  4. Vuelve a lanzar este mismo comando.' -ForegroundColor White
        Write-Host ''
        Write-Host 'La direccion de la app sera exactamente:' -ForegroundColor White
        Write-Host "  $urlApp" -ForegroundColor Green
        Write-Host ''
        Write-Host '(La direccion depende del nombre del repositorio, asi que no lo cambies: los datos' -ForegroundColor DarkGray)
        Write-Host ' del movil quedan atados a ella.)' -ForegroundColor DarkGray
    } else {
        Write-Host ''
        Write-Host 'La subida ha fallado. Revisa el mensaje de arriba.' -ForegroundColor Red
    }
    exit 1
}

# --- 4. Primera vez: activar Pages -----------------------------------------
Titulo 'Ya esta subido'

Write-Host 'Si es la PRIMERA vez, falta un paso en GitHub (una sola vez):' -ForegroundColor Yellow
Write-Host "  https://github.com/$usuario/$repositorio/settings/pages" -ForegroundColor White
Write-Host '  Source: "GitHub Actions"' -ForegroundColor White
Write-Host ''
Write-Host 'El flujo tarda un par de minutos. Sigue su avance en:' -ForegroundColor White
Write-Host "  https://github.com/$usuario/$repositorio/actions" -ForegroundColor White
Write-Host ''
Write-Host 'Cuando termine, la app estara en:' -ForegroundColor White
Write-Host "  $urlApp" -ForegroundColor Green

Titulo 'Comprobando la app publicada'

Write-Host 'Se espera un poco a que GitHub publique...'
Start-Sleep -Seconds 45
& node scripts/verify-live.mjs $urlApp

if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'La app publicada no ha pasado las comprobaciones.' -ForegroundColor Yellow
    Write-Host 'Suele ser que el flujo de GitHub todavia esta trabajando: mira la pestana Actions' -ForegroundColor Yellow
    Write-Host 'y vuelve a lanzar la comprobacion con:  npm run test:live' -ForegroundColor Yellow
}

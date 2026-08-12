# scripts/setup.ps1
# Script de configuración automatizado para Lectores Fotos en Windows

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   CONFIGURACIÓN DE PROYECTO: LECTORES FOTOS   " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Node.js
Write-Host "1. Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = & node -v 2>$null
if ($lastExitCode -ne 0 -or -not $nodeVersion) {
    Write-Host "[-] ERROR: Node.js no está instalado en este sistema. Por favor, descarga e instala Node.js desde https://nodejs.org/" -ForegroundColor Red
    Exit 1
}
Write-Host "[+] Node.js detectado: $nodeVersion" -ForegroundColor Green

# 2. Verificar NPM
Write-Host "2. Verificando npm..." -ForegroundColor Yellow
$npmVersion = & npm -v 2>$null
if ($lastExitCode -ne 0 -or -not $npmVersion) {
    Write-Host "[-] ERROR: npm no está disponible. Asegúrate de tener Node.js correctamente instalado." -ForegroundColor Red
    Exit 1
}
Write-Host "[+] npm detectado: v$npmVersion" -ForegroundColor Green

# 3. Instalar dependencias si no existe node_modules
Write-Host "3. Verificando dependencias del proyecto..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Carpeta node_modules no encontrada. Instalando dependencias..." -ForegroundColor Gray
    & npm install
    if ($lastExitCode -ne 0) {
        Write-Host "[-] ERROR: Falló la instalación de dependencias ('npm install')." -ForegroundColor Red
        Exit 1
    }
    Write-Host "[+] Dependencias instaladas correctamente." -ForegroundColor Green
} else {
    Write-Host "[+] Las dependencias de node_modules ya están instaladas." -ForegroundColor Green
}

# 4. Verificar Supabase CLI
Write-Host "4. Verificando Supabase CLI..." -ForegroundColor Yellow
$supabaseVersion = & supabase --version 2>$null
$hasSupabaseCli = $false
if ($lastExitCode -ne 0 -or -not $supabaseVersion) {
    Write-Host "[*] Supabase CLI no está instalado. Intentando instalarlo globalmente mediante npm..." -ForegroundColor Gray
    & npm install -g supabase
    $supabaseVersion = & supabase --version 2>$null
    if ($lastExitCode -ne 0 -or -not $supabaseVersion) {
        Write-Host "[-] ADVERTENCIA: No se pudo instalar Supabase CLI globalmente de forma automática." -ForegroundColor Yellow
        Write-Host "[i] Para instalarlo manualmente en Windows, puedes usar Scoop: 'scoop install supabase' o instalarlo como administrador." -ForegroundColor Cyan
    } else {
        Write-Host "[+] Supabase CLI instalado con éxito." -ForegroundColor Green
        $hasSupabaseCli = $true
    }
} else {
    Write-Host "[+] Supabase CLI detectado: $supabaseVersion" -ForegroundColor Green
    $hasSupabaseCli = $true
}

# 5. Verificar Autenticación de Supabase
if ($hasSupabaseCli) {
    Write-Host "5. Comprobando sesión de Supabase..." -ForegroundColor Yellow
    # Intentamos correr un comando para verificar inicio de sesión
    $testLogin = & supabase projects list 2>&1
    if ($testLogin -match "unauthorized" -or $testLogin -match "login" -or $lastExitCode -ne 0) {
        Write-Host ""
        Write-Host "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" -ForegroundColor Magenta
        Write-Host " Necesitas iniciar sesión en tu cuenta de Supabase." -ForegroundColor Magenta
        Write-Host " Por favor, ejecuta el siguiente comando en tu consola:" -ForegroundColor Magenta
        Write-Host "    supabase login" -ForegroundColor Cyan
        Write-Host "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" -ForegroundColor Magenta
        Write-Host ""
        $response = Read-Host "¿Ya has iniciado sesión o deseas omitir el enlace del proyecto por ahora? (S/N/Omitir)"
        if ($response -ne "S" -and $response -ne "s" -and $response -ne "Omitir" -and $response -ne "omitir") {
            Write-Host "Configuración pausada. Inicia sesión en Supabase y vuelve a correr este script." -ForegroundColor Yellow
            Exit 0
        }
    } else {
        Write-Host "[+] Sesión activa en Supabase detectada." -ForegroundColor Green
    }
}

# 6. Enlazar Proyecto
$projectRef = "umhexyqukxgnbztlbqbc"
if ($hasSupabaseCli) {
    Write-Host "6. Enlazando con el proyecto de Supabase..." -ForegroundColor Yellow
    $userRef = Read-Host "Introduce tu Project Ref [$projectRef] (Pulsa ENTER para usar el por defecto)"
    if ($userRef) {
        $projectRef = $userRef
    }
    
    Write-Host "[*] Vinculando proyecto con referencia: $projectRef..." -ForegroundColor Gray
    Write-Host "[i] Si se solicita, introduce la contraseña de tu base de datos de Supabase." -ForegroundColor Cyan
    & supabase link --project-ref $projectRef
    if ($lastExitCode -ne 0) {
        Write-Host "[-] No se pudo enlazar el proyecto automáticamente. Puede que necesites iniciar sesión o ingresar la contraseña correcta." -ForegroundColor Yellow
    } else {
        Write-Host "[+] Proyecto enlazado correctamente." -ForegroundColor Green
    }
}

# 7. Crear archivo de entorno .env si no existe
Write-Host "7. Creando archivo .env..." -ForegroundColor Yellow
$envPath = ".env"
$envContent = @"
VITE_SUPABASE_URL=https://$projectRef.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_sg8gT9lX6w5ax6CiD2WWZw__D9jGV15
VITE_EDGE_FUNCTION_URL=https://$projectRef.supabase.co/functions/v1/upload-photo
"@

if (-not (Test-Path $envPath)) {
    $envContent | Out-File -FilePath $envPath -Encoding utf8
    Write-Host "[+] Archivo .env creado con éxito." -ForegroundColor Green
} else {
    # Si existe, actualizamos los valores si el usuario cambió el projectRef
    $envContent | Out-File -FilePath $envPath -Encoding utf8
    Write-Host "[+] Archivo .env actualizado con la referencia de proyecto activa." -ForegroundColor Green
}

# 8. Desplegar Edge Function
if ($hasSupabaseCli) {
    Write-Host "8. Desplegando la Edge Function (upload-photo)..." -ForegroundColor Yellow
    $deployConfirm = Read-Host "¿Deseas desplegar la Edge Function 'upload-photo' ahora mismo? (S/N)"
    if ($deployConfirm -eq "S" -or $deployConfirm -eq "s") {
        Write-Host "[*] Desplegando función..." -ForegroundColor Gray
        & supabase functions deploy upload-photo
        if ($lastExitCode -ne 0) {
            Write-Host "[-] ERROR: No se pudo desplegar la Edge Function. Verifica la autenticación." -ForegroundColor Red
        } else {
            Write-Host "[+] Edge Function 'upload-photo' desplegada con éxito." -ForegroundColor Green
        }
    } else {
        Write-Host "[*] Despliegue omitido por el usuario." -ForegroundColor Gray
    }
}

# 9. Probar Build de producción
Write-Host "9. Probando compilación de producción del frontend..." -ForegroundColor Yellow
& npm run build
if ($lastExitCode -ne 0) {
    Write-Host "[-] ERROR: La compilación del frontend falló. Por favor revisa los errores de TypeScript." -ForegroundColor Red
    Exit 1
}
Write-Host "[+] Compilación de producción exitosa." -ForegroundColor Green

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "    ¡CONFIGURACIÓN COMPLETADA CON ÉXITO!      " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar la aplicación en modo desarrollo, ejecuta:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host ""

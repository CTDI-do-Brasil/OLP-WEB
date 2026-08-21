@echo off
chcp 65001 > nul
echo =========================================================
echo   INSTALADOR DO AGENTE DE IMPRESS?O ZEBRA - OLP WEB
echo =========================================================
echo.

set CURRENT_DIR=%~dp0
set TARGET_SCRIPT=%CURRENT_DIR%print_agent.py
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS_FILE=%STARTUP_DIR%\iniciar_agente_zebra.vbs

echo [1/3] Verificando script print_agent.py em:
echo       %TARGET_SCRIPT%
echo.

if not exist "%TARGET_SCRIPT%" (
    echo [ERRO] O arquivo print_agent.py n?o foi encontrado nesta pasta!
    echo Certifique-se de manter todos os arquivos na mesma pasta.
    pause
    exit /b
)

echo [2/3] Configurando inicializa??o autom?tica com o Windows...
(
    echo Set WshShell = CreateObject^("WScript.Shell"^)
    echo WshShell.Run "python """ ^& "%TARGET_SCRIPT%" ^& """", 0, False
) > "%VBS_FILE%"

echo [OK] Atalho criado em: %VBS_FILE%
echo.

echo [3/3] Iniciando o agente de impress?o agora em segundo plano...
wscript.exe "%VBS_FILE%"

echo.
echo =========================================================
echo   INSTALA??O CONCLU?DA COM SUCESSO!
echo =========================================================
echo.
echo O agente da Zebra j? est? rodando em segundo plano e
echo ser? iniciado automaticamente sempre que o Windows ligar.
echo.
pause

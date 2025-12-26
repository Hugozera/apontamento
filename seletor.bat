@echo off
echo Escolha a versão do JDK:
echo 1. JDK 11 (Temurin)
echo 2. JDK 17 (Temurin)
set /p choice="Digite o número da versão desejada: "

if "%choice%"=="1" (
    set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-11.0.26.4-hotspot
    echo JDK 11 configurado.
) else if "%choice%"=="2" (
    set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17
    echo JDK 17 configurado.
) else (
    echo Opção inválida.
    pause
    exit /b
)

set PATH=%JAVA_HOME%\bin;%PATH%
echo JAVA_HOME e PATH atualizados.
java -version
pause
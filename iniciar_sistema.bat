@echo off
chcp 65001 > nul
title Sistema de Consulta de Oficios - PMO
color 0B

echo ======================================================================
echo           SISTEMA DE CONSULTA DE OFICIOS - PMO
echo ======================================================================
echo.
echo Iniciando servidor local...
echo O navegador abrira automaticamente em: http://127.0.0.1:5001
echo.
echo Para fechar o sistema, basta fechar esta janela ou pressionar Ctrl+C.
echo ======================================================================
echo.

start "" http://127.0.0.1:5001
python app.py

pause

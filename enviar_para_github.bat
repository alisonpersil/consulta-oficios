@echo off
title Enviar para o GitHub
color 0A

echo ======================================================================
echo          ENVIANDO PROJETO PARA O GITHUB (alisonpersil)
echo ======================================================================
echo.
echo Repositorio: https://github.com/alisonpersil/consulta-oficios
echo.
echo Enviando arquivos... Aguarde um instante...
echo.

git push -u origin main

echo.
echo ======================================================================
echo Fim do processo. Verifique as mensagens acima.
echo ======================================================================
echo.
pause

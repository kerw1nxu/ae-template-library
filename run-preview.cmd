@echo off
cd /d D:\MoBanWeb
"C:\Program Files\nodejs\node.exe" .\node_modules\next\dist\bin\next start -p 3000 -H 0.0.0.0 > preview-server.out.log 2> preview-server.err.log

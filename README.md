# xipe-frontend

Frontend React + TypeScript (Vite) del sistema Wico Business OS. Se despliega
en Vercel como `app.xipe.li`.

## Estado actual: Fase 1

Una sola pantalla con un botón que prueba la conexión contra el backend
(`GET /health` de xipe-backend). Sin autenticación, sin datos reales todavía
— el objetivo es confirmar que toda la cadena Vercel -> app.xipe.li ->
api.xipe.li funciona antes de construir la UI real.

## Correr en local

\`\`\`bash
npm install
npm run dev
\`\`\`

Por defecto apunta a http://localhost:3000. Si tu backend local corre en otro
puerto, crea un archivo .env con VITE_API_URL=<tu-url>.

## Subir a GitHub (primera vez)

\`\`\`bash
git init
git add .
git commit -m "Fase 1: frontend inicial, prueba de conexion"
git branch -M main
git remote add origin <URL_DE_TU_REPO_PRIVADO>
git push -u origin main
\`\`\`

## Desplegar en Vercel

1. Entra a vercel.com, inicia sesion con tu cuenta de GitHub
2. Add New -> Project, selecciona el repo xipe-frontend
3. Vercel detecta Vite automaticamente, no hace falta tocar la configuracion de build
4. Antes de darle Deploy, agrega la variable de entorno:
   VITE_API_URL = https://api.xipe.li
5. Deploy
6. Cuando termine, en Project Settings -> Domains agrega app.xipe.li
7. Vercel te da un registro CNAME (o A, segun el caso) para crear en el DNS de IONOS, igual que hicimos con api.xipe.li en DigitalOcean

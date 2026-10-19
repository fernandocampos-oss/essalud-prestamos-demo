# Demo EsSalud: Préstamos y SAP Web

Demo ejecutiva ficticia para explicar el flujo SOMOS → Préstamos por convenio → Banco → autorización verificable → SAP Web. No es un producto productivo ni una integración con EsSalud, bancos o SAP reales.

## Inicio local

```bash
npm install
npm start
```

Abra `http://localhost:4200`. La API queda en `http://localhost:3000`; `GET /api/health` valida aplicación y SQLite. Para generar la versión de producción use `npm run build` y luego `npm run start:prod` con `NODE_ENV=production`.

Antes de una exposición, y con el entorno detenido, puede restaurar los datos ficticios con `npm run demo:reset`.

## Desarrollo local y puertos

`npm start` usa de forma fija el puerto `3000` para API y `4200` para Angular. Antes de iniciar, detecta ambos puertos. Si hay una instancia saludable de esta demo, informa las URLs y no abre una segunda. Si existe un conflicto, no cambia de puerto ni muestra preguntas interactivas.

```bash
npm run dev:status
npm run dev:stop
npm start
```

`dev:stop` solo detiene procesos que puede verificar como pertenecientes a este repositorio; no finaliza todos los procesos Node del equipo. Consulte [desarrollo local](docs/LOCAL_DEVELOPMENT.md) para recuperación de puertos, uso en PowerShell/CMD y comportamiento de `Ctrl+C`.

## Reset y credenciales ficticias

`npm run demo:reset` recrea `database/demo.sqlite` desde esquema y seeds conocidos. Úselo antes de una exposición, con la aplicación detenida.

Si ya existe una base local anterior y solo necesita actualizar el catálogo visible de entidades financieras sin borrar solicitudes ni usuarios relacionados, ejecute `npm run demo:migrate-catalog`. La migración conserva los identificadores internos y relaciones existentes.

Todas las cuentas usan la contraseña `Demo2026!`: `andrea.demo`, `bruno.demo`, `carmen.demo`, `diego.demo`, `elena.demo`, `fabio.demo`, `gabriela.demo`, `hugo.demo`, `ines.demo`, `admin.essalud`, `analista.bcp`, `admin.bcp`, `analista.bbva`, `analista.interbank` y `sap.demo`. Con `DEMO_MODE=true`, `/demo/access` inicia las cuentas principales de forma real y aislada por pestaña.

## Scripts

`npm start`, `npm run dev:status`, `npm run dev:stop`, `npm run build`, `npm test`, `npm run lint`, `npm run check:size`, `npm run demo:reset`, `npm run demo:migrate-catalog` y `npm run start:prod` son los comandos de operación previstos.

## Docker

```bash
docker build -t essalud-demo .
docker run --rm -p 3000:3000 -v essalud-data:/var/data -e APP_BASE_URL=http://localhost:3000 -e SESSION_SECRET=cambie-esta-clave essalud-demo
```

La aplicación en contenedor sirve Angular y API bajo el mismo origen. Monte un volumen persistente en `/var/data`; mantenga una sola instancia por las características de SQLite. Variables: `PORT`, `DB_PATH` (también acepta `DATABASE_PATH`), `SESSION_SECRET`, `APP_BASE_URL`, `DEMO_MODE`, `NODE_ENV` y, solo en desarrollo separado, `CORS_ORIGIN`.

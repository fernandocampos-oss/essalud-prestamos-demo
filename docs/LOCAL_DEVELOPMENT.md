# Desarrollo local y puertos

## Inicio normal

La demo usa dos puertos de desarrollo fijos:

| Servicio | URL | Puerto |
| --- | --- | --- |
| API Node.js | `http://localhost:3000` | `3000` |
| Angular | `http://localhost:4200` | `4200` |

Ejecute desde la raíz del repositorio:

```bash
npm start
```

El lanzador revisa ambos puertos antes de crear procesos. Si una instancia sana de esta demo ya responde, muestra sus URLs y no inicia una segunda. Si un puerto está ocupado, falla con el PID y no permite que Angular seleccione otro puerto de forma interactiva.

No ejecute varios `npm start` a la vez. Antes de iniciar tras una interrupción, consulte el estado.

## Estado y detención segura

Los mismos comandos funcionan en PowerShell y en CMD:

```powershell
npm run dev:status
npm run dev:stop
npm start
```

```cmd
npm run dev:status
npm run dev:stop
npm start
```

`dev:status` informa si los puertos 3000 y 4200 están libres u ocupados, sus PID y si puede asociarlos a este proyecto. También consulta `/api/health` y el frontend.

`dev:stop` usa un registro temporal en `.local/dev-processes.json`, además de rutas y argumentos de los procesos, para verificar la pertenencia al repositorio. Solicita una detención ordenada y solo usa una finalización dirigida del árbol de un PID verificado si persiste. Nunca ejecuta `taskkill /IM node.exe /F` ni termina todos los procesos Node.

## Resolver `EADDRINUSE`

Cuando `npm start` informa un conflicto:

1. Ejecute `npm run dev:status`.
2. Si el PID corresponde a esta demo, ejecute `npm run dev:stop`.
3. Confirme que ambos puertos estén libres con `npm run dev:status`.
4. Vuelva a ejecutar `npm start`.

Si `dev:status` marca un proceso como **no verificado**, puede pertenecer a otro proyecto. `dev:stop` no lo cerrará. Deténgalo desde el proyecto propietario o el administrador de tareas y vuelva a intentar. No cambie la aplicación a otro puerto como solución temporal.

El aviso de Node sobre SQLite experimental es independiente de los puertos: no impide que el servidor escuche y no se soluciona deteniendo procesos.

## Interrupciones y pruebas

El lanzador controla `Ctrl+C` (`SIGINT`) y `SIGTERM`: solicita cierre a API y Angular, espera brevemente y limpia el registro temporal. Si se interrumpe una prueba o una sesión de Codex, ejecute `npm run dev:status` antes de volver a iniciar.

Las pruebas que necesiten levantar servidores deben cerrarlos al terminar. Si los servicios ya estaban en ejecución antes de la prueba, no se deben detener como parte de ella.

No ejecute `npm run demo:reset` para resolver un conflicto de puertos. El reset restaura datos de demostración y debe usarse solamente de forma intencional, con la aplicación detenida.

## Actualización del catálogo bancario

Para una base ya creada antes del cambio de catálogo, ejecute `npm run demo:migrate-catalog`. La actualización es idempotente: renombra las organizaciones `andino`, `horizonte` y `pacifico` a Banco de Crédito del Perú (BCP), BBVA Perú e Interbank, respectivamente; conserva sus IDs y las solicitudes relacionadas. También actualiza o incorpora las cuentas demo asociadas cuando no existe un conflicto de usuario. No elimina solicitudes, préstamos ni otros datos.

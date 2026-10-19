const {
  ownershipFor, portReport, processAlive, readRegistry, referencesProject, removeRegistry,
  terminateTree, verifiedRegistryProcesses, wait
} = require('./dev-utils.cjs');

async function main() {
  const registry = readRegistry();
  const targets = new Map();
  const confirmedListeners = new Map();
  for (const { entry, info } of verifiedRegistryProcesses(registry)) targets.set(Number(entry.pid), info);
  const report = portReport(registry);
  for (const item of report) {
    for (const listener of item.listeners) {
      const owner = ownershipFor(listener.pid, registry);
      if (owner.owned && owner.root && referencesProject(owner.root)) {
        targets.set(Number(owner.root.ProcessId), owner.root);
        confirmedListeners.set(Number(listener.pid), listener);
      }
      if (!owner.owned) console.log(`Puerto ${item.port} ocupado por PID ${listener.pid}: no se detiene porque no se pudo verificar que pertenezca al proyecto.`);
    }
  }

  if (!targets.size) {
    console.log('No se encontraron procesos de desarrollo verificados de este proyecto.');
    return;
  }

  for (const [pid] of targets) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`Se solicitó detención ordenada al PID ${pid}.`);
    } catch {
      console.log(`No fue posible enviar la señal al PID ${pid}; no se finalizará sin verificación.`);
    }
  }
  await wait(1600);
  for (const [pid] of targets) {
    if (processAlive(pid) && terminateTree(pid)) {
      console.log(`Se cerró el árbol verificado del PID ${pid}.`);
    }
  }
  for (const [pid, listener] of confirmedListeners) {
    if (processAlive(pid) && terminateTree(pid)) {
      console.log(`Se cerró el proceso verificado del puerto ${listener.port} (PID ${pid}).`);
    }
  }
  await wait(400);
  const remaining = portReport().flatMap((item) => item.listeners).filter((listener) => listener.ownership.owned || confirmedListeners.has(Number(listener.pid)));
  if (!remaining.length) removeRegistry();
  console.log(remaining.length ? 'Persisten procesos verificados; ejecuta npm run dev:status para revisar.' : 'Entorno local detenido.');
  if (remaining.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

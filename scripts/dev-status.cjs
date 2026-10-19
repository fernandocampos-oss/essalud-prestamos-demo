const { healthReport, portReport, readRegistry, removeRegistry, statePath, verifiedRegistryProcesses } = require('./dev-utils.cjs');

async function main() {
  const registry = readRegistry();
  const report = portReport(registry);
  const health = await healthReport();
  console.log('Estado del entorno de desarrollo\n');
  for (const item of report) {
    if (!item.listeners.length) {
      console.log(`Puerto ${item.port}: libre.`);
      continue;
    }
    for (const listener of item.listeners) {
      const owner = listener.ownership.owned ? `proyecto actual (${listener.ownership.source})` : 'proceso no verificado';
      console.log(`Puerto ${item.port}: ocupado por PID ${listener.pid}; ${owner}.`);
    }
  }
  console.log(`\nAPI ${health.apiHealthy ? 'responde correctamente' : 'no responde en /api/health'}.`);
  console.log(`Frontend ${health.webHealthy ? 'responde correctamente' : 'no responde en /'}.`);
  if (registry) {
    const active = verifiedRegistryProcesses(registry).length;
    console.log(`\nRegistro local: ${active}/${registry.processes.length} procesos activos (${statePath}).`);
    if (!active) {
      removeRegistry();
      console.log('El registro obsoleto fue eliminado.');
    }
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

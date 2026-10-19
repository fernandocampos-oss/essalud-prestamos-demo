const { spawn } = require('node:child_process');
const path = require('node:path');
const {
  healthReport, ownershipFor, ports, portReport, projectRoot, removeRegistry, terminateTree, wait, writeRegistry
} = require('./dev-utils.cjs');

function showConflict(report) {
  console.error('\nNo se puede iniciar el entorno de desarrollo.\n');
  for (const item of report.filter((entry) => entry.listeners.length)) {
    for (const listener of item.listeners) {
      const owner = listener.ownership.owned ? `instancia del proyecto (${listener.ownership.source})` : 'proceso no verificado';
      console.error(`Puerto ${item.port} ocupado por PID ${listener.pid}: ${owner}.`);
    }
  }
  console.error('\nEjecuta:\n  npm run dev:status\n  npm run dev:stop\n\nLuego:\n  npm start');
}

async function main() {
  const before = portReport();
  if (before.some((entry) => entry.listeners.length)) {
    const health = await healthReport();
    const currentProject = before.every((entry) => entry.listeners.length && entry.listeners.every((listener) => listener.ownership.owned));
    if (currentProject && health.apiHealthy && health.webHealthy) {
      console.log('El entorno de desarrollo ya está activo. No se inició una segunda instancia.');
      console.log(`API: http://localhost:${ports.api} | Frontend: http://localhost:${ports.web}`);
      return;
    }
    showConflict(before);
    process.exitCode = 1;
    return;
  }

  const apiEntry = path.join(projectRoot, 'backend', 'src', 'server.js');
  const webScript = path.join(projectRoot, 'scripts', 'dev-web.cjs');
  const api = spawn(process.execPath, ['--watch', apiEntry], { cwd: projectRoot, stdio: 'inherit', windowsHide: false });
  const web = spawn(process.execPath, [webScript], { cwd: projectRoot, stdio: 'inherit', windowsHide: false });
  const managed = [
    { name: 'api', pid: api.pid, commandToken: apiEntry },
    { name: 'web', pid: web.pid, commandToken: webScript }
  ];
  writeRegistry(managed);
  console.log(`Entorno local iniciado. API: http://localhost:${ports.api} | Frontend: http://localhost:${ports.web}`);

  let stopping = false;
  process.once('exit', removeRegistry);
  async function stop(reason, code = 0) {
    if (stopping) return;
    stopping = true;
    console.log(`\nDeteniendo el entorno local (${reason})...`);
    removeRegistry();
    for (const child of [api, web]) {
      try { child.kill('SIGINT'); } catch { /* El hijo ya terminó. */ }
    }
    await wait(1200);
    for (const child of [api, web]) {
      if (child.pid) terminateTree(child.pid);
    }
    for (const item of portReport()) {
      for (const listener of item.listeners) {
        const owner = ownershipFor(listener.pid);
        if (owner.owned && owner.root) terminateTree(owner.root.ProcessId);
      }
    }
    removeRegistry();
    process.exit(code);
  }

  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal));
  for (const child of [api, web]) {
    child.once('exit', (code, signal) => {
      if (!stopping) stop(`${child === api ? 'API' : 'frontend'} finalizó${signal ? ` (${signal})` : ''}`, code || 1);
    });
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

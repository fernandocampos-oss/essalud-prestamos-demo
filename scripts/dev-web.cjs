const { spawn } = require('node:child_process');
const path = require('node:path');
const { ports, projectRoot } = require('./dev-utils.cjs');

const ngCli = require.resolve('@angular/cli/bin/ng.js', { paths: [projectRoot] });
const child = spawn(process.execPath, [ngCli, 'serve', '--proxy-config', 'proxy.conf.json', '--port', String(ports.web)], {
  cwd: path.join(projectRoot, 'frontend'),
  env: { ...process.env, CI: 'true' },
  stdio: 'inherit',
  windowsHide: false
});

let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  try { child.kill(signal); } catch { /* El proceso ya terminó. */ }
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal));
child.once('exit', (code) => { process.exitCode = code || 0; });

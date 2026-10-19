const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const statePath = path.join(projectRoot, '.local', 'dev-processes.json');
const ports = { api: 3000, web: 4200 };

function normal(value) {
  return String(value || '').replaceAll('/', '\\').toLowerCase();
}

function powershellJson(script, fallback) {
  try {
    const output = execFileSync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script
    ], { cwd: projectRoot, encoding: 'utf8', windowsHide: true }).trim();
    return output ? JSON.parse(output) : fallback;
  } catch {
    return fallback;
  }
}

function getProcessInfo(pid) {
  const safePid = Number(pid);
  if (!Number.isInteger(safePid) || safePid < 1) return null;
  const script = `$item = Get-CimInstance Win32_Process -Filter 'ProcessId = ${safePid}' -ErrorAction SilentlyContinue; if ($null -eq $item) { 'null' } else { $item | Select-Object ProcessId,ParentProcessId,Name,CommandLine,ExecutablePath | ConvertTo-Json -Compress }`;
  return powershellJson(script, null);
}

function getPortListeners() {
  const selectedPorts = Object.values(ports).join(',');
  const script = `$ports = @(${selectedPorts}); $items = @(); foreach ($port in $ports) { foreach ($connection in @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)) { $item = Get-CimInstance Win32_Process -Filter ("ProcessId = {0}" -f $connection.OwningProcess) -ErrorAction SilentlyContinue; if ($null -ne $item) { $items += [pscustomobject]@{ port = $port; pid = $connection.OwningProcess; name = $item.Name; commandLine = $item.CommandLine; parentPid = $item.ParentProcessId } } } }; @($items) | ConvertTo-Json -Compress`;
  const listeners = powershellJson(script, []);
  const list = Array.isArray(listeners) ? listeners : [listeners];
  const unique = new Map();
  for (const listener of list.filter(Boolean)) unique.set(`${listener.port}:${listener.pid}`, listener);
  return [...unique.values()];
}

function readRegistry() {
  try {
    const value = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return normal(value.projectRoot) === normal(projectRoot) && Array.isArray(value.processes) ? value : null;
  } catch {
    return null;
  }
}

function writeRegistry(processes) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ projectRoot, createdAt: new Date().toISOString(), processes }, null, 2));
}

function removeRegistry() {
  if (fs.existsSync(statePath)) fs.rmSync(statePath, { force: true });
}

function isNodeOrCommandProcess(info) {
  return /^(node|cmd|npm)(\.exe)?$/i.test(info?.Name || '');
}

function referencesProject(info) {
  return isNodeOrCommandProcess(info) && normal(info?.CommandLine).includes(normal(projectRoot));
}

function getProcessChain(pid) {
  const chain = [];
  const seen = new Set();
  let current = Number(pid);
  while (current > 0 && !seen.has(current) && chain.length < 12) {
    seen.add(current);
    const info = getProcessInfo(current);
    if (!info) break;
    chain.push(info);
    current = Number(info.ParentProcessId);
  }
  return chain;
}

function verifiedRegistryProcesses(registry = readRegistry()) {
  if (!registry) return [];
  return registry.processes.flatMap((entry) => {
    const info = getProcessInfo(entry.pid);
    const token = normal(entry.commandToken);
    return info && referencesProject(info) && normal(info.CommandLine).includes(token) ? [{ entry, info }] : [];
  });
}

function ownershipFor(pid, registry = readRegistry()) {
  const chain = getProcessChain(pid);
  const managed = new Map(verifiedRegistryProcesses(registry).map(({ entry, info }) => [Number(entry.pid), { entry, info }]));
  for (const info of chain) {
    if (managed.has(Number(info.ProcessId))) return { owned: true, root: managed.get(Number(info.ProcessId)).info, source: 'registro local' };
  }
  const projectAncestors = chain.filter(referencesProject);
  if (projectAncestors.length) return { owned: true, root: projectAncestors.at(-1), source: 'ruta de proceso' };
  return { owned: false, root: null, source: 'no verificado' };
}

function portReport(registry = readRegistry()) {
  const listeners = getPortListeners();
  return Object.values(ports).map((port) => ({
    port,
    listeners: listeners.filter((listener) => Number(listener.port) === port).map((listener) => ({
      ...listener,
      ownership: ownershipFor(listener.pid, registry)
    }))
  }));
}

function request(url) {
  return new Promise((resolve) => {
    const client = http.get(url, { timeout: 1500 }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 400);
    });
    client.on('error', () => resolve(false));
    client.on('timeout', () => { client.destroy(); resolve(false); });
  });
}

async function healthReport() {
  const [apiHealthy, webHealthy] = await Promise.all([
    request('http://127.0.0.1:3000/api/health'),
    request('http://localhost:4200/')
  ]);
  return { apiHealthy, webHealthy };
}

function processAlive(pid) {
  return Boolean(getProcessInfo(pid));
}

function terminateTree(pid) {
  try {
    execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  } catch {
    return false;
  }
  return true;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

module.exports = {
  healthReport, ownershipFor, ports, portReport, processAlive, projectRoot, readRegistry,
  referencesProject, removeRegistry, statePath, terminateTree, verifiedRegistryProcesses,
  wait, writeRegistry
};

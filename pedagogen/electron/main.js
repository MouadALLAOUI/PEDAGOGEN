const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { fork, spawn } = require('child_process');
const http = require('http');
const net = require('net');

let mainWindow = null;
let serverProcess = null;
let opencodeProcess = null;

const isDev = !app.isPackaged;

function getAvailablePort(startingPort = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startingPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(getAvailablePort(startingPort + 1));
    });
  });
}

function checkPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function tryStartOpenCode() {
  try {
    const isRunning = await checkPortOpen(4096);
    if (!isRunning) {
      console.log('Attempting to start opencode serve...');
      const proc = spawn('opencode', ['serve'], {
        detached: true,
        stdio: 'ignore',
        shell: true,
      });
      proc.unref();
      opencodeProcess = proc;
    }
  } catch (e) {
    console.log('OpenCode auto-start skipped:', e.message);
  }
}

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', () => retry());
      req.end();
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Server failed to start within ${timeoutMs / 1000}s`));
      } else {
        setTimeout(check, 400);
      }
    };

    check();
  });
}

const fs = require('fs');

async function startServer() {
  const port = await getAvailablePort(34567);
  const serverUrl = `http://127.0.0.1:${port}`;

  if (isDev && process.env.DEV_MODE) {
    return { url: 'http://127.0.0.1:3000' };
  }

  const basePath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : path.join(__dirname, '..');

  const standaloneDir = path.join(basePath, '.next', 'standalone');
  const serverScript = path.join(standaloneDir, 'server.js');

  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    JWT_SECRET: process.env.JWT_SECRET || 'pedagogen-secure-offline-key-2026',
  };

  // Load .env.local if present in project or resources
  const envCandidates = [
    path.join(__dirname, '..', '.env.local'),
    path.join(standaloneDir, '.env.local'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = (match[2] || '').trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            if (!env[key]) env[key] = value;
          }
        });
      } catch (_) {}
    }
  }

  // Use node binary matching better-sqlite3 native compilation
  const candidateNodes = [
    path.join(standaloneDir, 'bin', 'node.exe'),
    path.join(basePath, 'bin', 'node.exe'),
  ];
  const bundledNode = candidateNodes.find((p) => fs.existsSync(p));
  const nodeBinary = bundledNode || 'node';

  serverProcess = spawn(nodeBinary, [serverScript], {
    cwd: standaloneDir,
    env,
    stdio: 'pipe',
    shell: false,
  });

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (d) => console.log(`[Next.js] ${d}`));
  }
  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (d) => console.error(`[Next.js Error] ${d}`));
  }

  serverProcess.on('error', (err) => {
    console.error('Failed to start Next.js server:', err);
  });

  await waitForServer(serverUrl);
  return { url: serverUrl };
}

async function createWindow(serverUrl) {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'PEDAGOGEN',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.startsWith(serverUrl)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  await mainWindow.loadURL(serverUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await tryStartOpenCode();
    const { url } = await startServer();
    await createWindow(url);
  } catch (err) {
    console.error('Fatal initialization error:', err);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      startServer().then(({ url }) => createWindow(url));
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
});

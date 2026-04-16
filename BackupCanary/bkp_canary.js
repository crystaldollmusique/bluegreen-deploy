/**
 * bkp_canary.js
 * Detecta automáticamente qué contenedor está activo (blue/green)
 * y reescribe nginx.conf con los pesos correctos.
 * FIX: Compatible con Windows y Linux/Jenkins
 */

const { execSync } = require('child_process');
const fs           = require('fs');
const path         = require('path');

// CAMBIO AQUÍ: Cambiamos '../nginx/nginx.conf' por '../proxy/nginx.conf'
const NGINX_CONF      = path.resolve(__dirname, '../proxy/nginx.conf');
const NGINX_CONTAINER = 'nginx_lb';
const BLUE_CONTAINER  = 'app_blue';
const GREEN_CONTAINER = 'app_green';

// Detectar SO automáticamente
const IS_WINDOWS = process.platform === 'win32';
const EXEC_OPTS  = IS_WINDOWS ? { shell: 'cmd.exe' } : {};

// ─── Utilidades ───────────────────────────────────────────────────────────────

function isRunning(containerName) {
  try {
    const result = execSync(
      `docker inspect --format {{.State.Running}} ${containerName}`,
      EXEC_OPTS
    ).toString().trim();
    return result === 'true';
  } catch {
    return false;
  }
}

// ─── Generador de nginx.conf ──────────────────────────────────────────────────

function generateNginxConf(blueWeight, greenWeight) {
  const blueServer  = blueWeight  > 0
    ? `server blue:3000  weight=${blueWeight};`
    : `server blue:3000  backup;`;

  const greenServer = greenWeight > 0
    ? `server green:3000 weight=${greenWeight};`
    : `server green:3000 backup;`;

  return `events {}

http {
    upstream app {
        ${blueServer}
        ${greenServer}
    }

    server {
        listen 80;

        location / {
            proxy_pass         http://app;
            proxy_set_header   Host               $host;
            proxy_set_header   X-Real-IP          $remote_addr;
            proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
            add_header         X-Upstream         $upstream_addr always;
        }

        location /health {
            proxy_pass http://app/health;
        }
    }
}
`;
}

// ─── Lógica principal ─────────────────────────────────────────────────────────

console.log('[canary] Detectando estado de contenedores...');

const blueUp  = isRunning(BLUE_CONTAINER);
const greenUp = isRunning(GREEN_CONTAINER);

console.log(`[canary]  ${BLUE_CONTAINER}  -> ${blueUp  ? 'ACTIVO' : 'inactivo'}`);
console.log(`[canary]  ${GREEN_CONTAINER} -> ${greenUp ? 'ACTIVO' : 'inactivo'}`);

let blueWeight, greenWeight;

if (blueUp && greenUp) {
  blueWeight  = 8;
  greenWeight = 2;
  console.log('[canary] Modo CANARY -> blue=80% green=20%');
} else if (blueUp) {
  blueWeight  = 1;
  greenWeight = 0;
  console.log('[canary] Modo BLUE completo -> blue=100%');
} else if (greenUp) {
  blueWeight  = 0;
  greenWeight = 1;
  console.log('[canary] Modo GREEN completo -> green=100%');
} else {
  console.error('[canary] ERROR: Ningun contenedor activo. Abortando.');
  process.exit(1);
}

// Escribir nginx.conf
try {
    const conf = generateNginxConf(blueWeight, greenWeight);
    fs.writeFileSync(NGINX_CONF, conf, 'utf8');
    console.log('[canary] nginx.conf actualizado en la ruta proxy');
} catch (err) {
    console.error('[canary] Error fatal al escribir el archivo:', err.message);
    process.exit(1);
}

// Recargar nginx sin downtime
try {
  execSync(`docker exec ${NGINX_CONTAINER} nginx -s reload`, EXEC_OPTS);
  console.log('[canary] nginx recargado correctamente');
} catch (e) {
  console.warn('[canary] No se pudo recargar nginx:', e.message);
}
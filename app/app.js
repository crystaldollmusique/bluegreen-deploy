const express = require('express');
const app = express();

const COLOR   = process.env.APP_COLOR   || 'blue';
const VERSION = process.env.APP_VERSION || '1.0.0';
const PORT    = process.env.PORT        || 3000;

app.get('/', (req, res) => {
  res.json({
    message : `Hola desde el entorno ${COLOR.toUpperCase()}`,
    color   : COLOR,
    version : VERSION,
    host    : require('os').hostname(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', color: COLOR });
});

app.get('/info', (req, res) => {
  res.json({
    color   : COLOR,
    version : VERSION,
    uptime  : process.uptime(),
    memory  : process.memoryUsage(),
  });
});

app.listen(PORT, () => {
  console.log(`[${COLOR.toUpperCase()}] Servidor corriendo en puerto ${PORT} — versión ${VERSION}`);
});

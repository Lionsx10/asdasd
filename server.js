// ===============================
// IMPORTS - Dependencias principales
// ===============================
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// ===============================
// HELMET (compatible CJS / ESM)
// ===============================
let helmetMiddleware = null;
async function setupHelmet(app) {
  try {
    const helmetCjs = require('helmet');
    helmetMiddleware = helmetCjs;
  } catch (err) {
    const helmetEsm = (await import('helmet')).default;
    helmetMiddleware = helmetEsm;
  }

  app.use(
    helmetMiddleware({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    })
  );
}

// ===============================
// IMPORTAR CONFIGURACIÓN BD
// ===============================
const { testConnection } = require('./config/database');

// ===============================
// IMPORTAR RUTAS
// ===============================
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const pedidosRoutes = require('./routes/pedidos');
const catalogoRoutes = require('./routes/catalogo');
const recomendacionesRoutes = require('./routes/recomendaciones');
const notificacionesRoutes = require('./routes/notificaciones');
const analisisEspacioRoutes = require('./routes/analisisEspacio');
const modelosRoutes = require('./routes/modelos');

// ===============================
// IMPORTAR MIDDLEWARE
// ===============================
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');

// ===============================
// CONFIGURACIÓN EXPRESS
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// CORS
// ===============================
app.use(
  cors({
    origin: [
      process.env.CORS_ORIGIN || 'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://comercialhg.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ===============================
// PARSING
// ===============================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===============================
// LOGGING
// ===============================
app.use(requestLogger);

// ===============================
// HEALTH CHECK
// ===============================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Rutas API
app.use('/api', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/recomendaciones', recomendacionesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/analisis-espacio', analisisEspacioRoutes);
app.use('/api/modelos', modelosRoutes);

// 404 solo para API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Ruta API no encontrada',
    path: req.originalUrl,
  });
});

// Servir frontend desde dist
const FRONTEND_PATH = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(FRONTEND_PATH));
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// ===============================
// MANEJO DE ERRORES
// ===============================
app.use(errorHandler);

// ===============================
// INICIAR SERVIDOR
// ===============================
const startServer = async () => {
  try {
    await testConnection();
    await setupHelmet(app);

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏥 Health: /health`);
      console.log(`🖥️ Frontend servido desde /`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// ===============================
// SEÑALES DEL SISTEMA
// ===============================
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// ===============================
// START
// ===============================
startServer();

module.exports = app;

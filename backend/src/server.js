const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Cria diretório de uploads se não existir
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos
app.use('/uploads', express.static(uploadDir, {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        res.set('Content-Type', 'image/jpeg');
        break;
      case '.png':
        res.set('Content-Type', 'image/png');
        break;
      case '.gif':
        res.set('Content-Type', 'image/gif');
        break;
      case '.webp':
        res.set('Content-Type', 'image/webp');
        break;
    }
    res.set('Cache-Control', 'public, max-age=86400');
  }
}));

// Rotas básicas para teste
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Calendário Backend API Rodando!', 
    version: '1.0.0',
    endpoints: {
      events: 'GET /api/events - Listar eventos',
      health: 'GET / - Status da API'
    }
  });
});

app.get('/api/events', (req, res) => {
  res.json([]);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📅 Servidor calendário rodando na porta ${PORT}`);
  console.log(`📁 Pasta de uploads: ${uploadDir}`);
  console.log(`🔗 Endpoints disponíveis:`);
  console.log(`   GET  http://localhost:${PORT}/`);
  console.log(`   GET  http://localhost:${PORT}/api/events`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
});

module.exports = app;
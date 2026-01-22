const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Importar rotas
const { calendarRoutes } = require('./routes/calendar');
const { uploadRoutes } = require('./routes/upload');

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

// ===== SERVIR FRONTEND =====
// Corrigido: o frontend está na mesma pasta do backend
app.use(express.static(path.join(__dirname, 'frontend')));

// ===== SERVIR UPLOADS =====
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

// ===== ROTAS DA API =====
app.use('/api', calendarRoutes);
app.use('/api', uploadRoutes);

// ===== ROTA PARA SINGLE PAGE APPLICATION =====
// Corrigido: o caminho completo para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('📅 Servidor calendário rodando na porta ' + PORT);
  console.log('📁 Pasta de uploads: ' + uploadDir);
  console.log('🔗 Acesse: https://calendario-cu21.onrender.com');
});

module.exports = app;
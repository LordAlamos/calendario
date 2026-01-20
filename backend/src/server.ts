import express from 'express'
import cors from 'cors'
import { calendarRoutes } from './routes/calendar'
import { uploadRoutes } from './routes/upload'
import path from 'path'
import fs from 'fs'

// Cria diretório de uploads se não existir
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const app = express()
const PORT = process.env.PORT || 3000

// Middleware com limites aumentados para imagens
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Servir arquivos estáticos com cabeçalhos corretos para imagens
app.use('/uploads', express.static(uploadDir, {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, filePath) => {
    // Define Content-Type baseado na extensão do arquivo
    const ext = path.extname(filePath).toLowerCase()
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        res.set('Content-Type', 'image/jpeg')
        break
      case '.png':
        res.set('Content-Type', 'image/png')
        break
      case '.gif':
        res.set('Content-Type', 'image/gif')
        break
      case '.webp':
        res.set('Content-Type', 'image/webp')
        break
      case '.svg':
        res.set('Content-Type', 'image/svg+xml')
        break
    }
    res.set('Cache-Control', 'public, max-age=86400')
  }
}))

// Rotas da API
app.use('/api', calendarRoutes)
app.use('/api', uploadRoutes)

// Rota principal
app.get('/', (req: any, res: any) => {
  res.json({ 
    message: '🚀 Calendário Backend API Rodando!', 
    endpoints: {
      events: 'GET /api/events - Listar eventos',
      createEvent: 'POST /api/events - Criar evento',
      upload: 'POST /api/upload - Upload de imagem',
      images: 'GET /uploads - Pasta de imagens'
    }
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`📅 Servidor calendário rodando na porta ${PORT}`)
  console.log(`📁 Pasta de uploads: ${uploadDir}`)
  console.log(`🔗 Endpoints disponíveis:`)
  console.log(`   GET  http://localhost:${PORT}/`)
  console.log(`   GET  http://localhost:${PORT}/api/events`)
  console.log(`   POST http://localhost:${PORT}/api/events`)
  console.log(`   POST http://localhost:${PORT}/api/upload`)
  console.log(`   GET  http://localhost:${PORT}/uploads/nome-da-imagem.jpg`)
})

export default app
// @ts-nocheck
import { Router } from 'express'
import multer from 'multer'
import prisma from '../lib/prisma'
import fs from 'fs'
import path from 'path'

// Cria diretório de uploads se não existir
const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const extension = path.extname(file.originalname)
    cb(null, 'image-' + uniqueSuffix + extension)
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos!'), false)
    }
  }
})

const uploadRoutes = Router()

uploadRoutes.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' })
    }

    const image = await prisma.image.create({
      data: {
        filename: req.file.originalname,
        path: req.file.path
      }
    })

    res.status(201).json({
      message: 'Imagem enviada com sucesso!',
      image: {
        id: image.id,
        filename: image.filename,
        url: `/uploads/${path.basename(req.file.path)}`
      }
    })
  } catch (error) {
    console.error('Erro no upload:', error)
    res.status(500).json({ error: 'Erro ao fazer upload da imagem' })
  }
})

export { uploadRoutes }
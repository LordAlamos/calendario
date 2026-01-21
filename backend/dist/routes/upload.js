"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
// @ts-nocheck
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Cria diretório de uploads se não existir
const uploadDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
        cb(null, 'image-' + uniqueSuffix + extension);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
        }
    }
});
const uploadRoutes = (0, express_1.Router)();
exports.uploadRoutes = uploadRoutes;
uploadRoutes.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada' });
        }
        const image = await prisma_1.default.image.create({
            data: {
                filename: req.file.originalname,
                path: req.file.path
            }
        });
        res.status(201).json({
            message: 'Imagem enviada com sucesso!',
            image: {
                id: image.id,
                filename: image.filename,
                url: `/uploads/${path_1.default.basename(req.file.path)}`
            }
        });
    }
    catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
    }
});

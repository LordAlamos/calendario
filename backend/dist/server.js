"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const calendar_1 = require("./routes/calendar");
const upload_1 = require("./routes/upload");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Cria diretório de uploads se não existir
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3000', 10);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Servir arquivos estáticos
app.use('/uploads', express_1.default.static(uploadDir, {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
        const ext = path_1.default.extname(filePath).toLowerCase();
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
// Rotas
app.use('/api', calendar_1.calendarRoutes);
app.use('/api', upload_1.uploadRoutes);
// Rota principal
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Calendário Backend API Rodando!',
        version: '1.0.0',
        endpoints: {
            events: 'GET /api/events',
            createEvent: 'POST /api/events',
            upload: 'POST /api/upload',
            images: 'GET /uploads/'
        }
    });
});
// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`📅 Servidor calendário rodando na porta ${PORT}`);
    console.log(`📁 Pasta de uploads: ${uploadDir}`);
});
exports.default = app;

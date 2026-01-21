"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarRoutes = void 0;
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const calendarRoutes = (0, express_1.Router)();
exports.calendarRoutes = calendarRoutes;
// GET - Listar todos eventos
calendarRoutes.get('/events', async (req, res) => {
    try {
        const events = await prisma_1.default.calendarEvent.findMany({
            orderBy: { date: 'asc' },
            include: {
                images: true
            }
        });
        res.json(events);
    }
    catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
});

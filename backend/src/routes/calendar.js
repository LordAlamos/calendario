const express = require('express');
const router = express.Router();

// Array temporário para armazenar eventos (em produção usar banco real)
let events = [];

// GET - Listar todos eventos
router.get('/events', (req, res) => {
  try {
    res.json(events);
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar eventos' });
  }
});

// POST - Criar novo evento
router.post('/events', (req, res) => {
  try {
    const { title, date, imageUrl, description } = req.body;
    const newEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title, 
      date: new Date(date), 
      imageUrl,
      description,
      createdAt: new Date().toISOString()
    };
    
    events.push(newEvent);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao criar evento' });
  }
});

module.exports = { calendarRoutes: router };
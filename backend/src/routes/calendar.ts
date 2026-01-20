import { Router } from 'express'
import prisma from '../lib/prisma'

const calendarRoutes = Router()

// GET - Listar todos eventos
calendarRoutes.get('/events', async (req: any, res: any) => {
  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { date: 'asc' },
      include: {
        images: true
      }
    })
    res.json(events)
  } catch (error) {
    console.error('Erro:', error)
    res.status(500).json({ error: 'Erro ao buscar eventos' })
  }
})

export { calendarRoutes }
const { PrismaClient } = require('@prisma/client');

// Testar conexão direta com Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function test() {
  try {
    console.log('Testando conexão...');
    await prisma.$connect();
    console.log('✅ Conectado com sucesso!');
    
    // Testar consulta simples
    const count = await prisma.calendarEvent.count();
    console.log(`Total de eventos: ${count}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await prisma.$disconnect();
  }
}

test();
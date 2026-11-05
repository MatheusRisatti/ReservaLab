import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed do Banco de Dados...');

  // 1. Configurações Globais do Sistema (SystemSettings)
  const existingSettings = await prisma.systemSettings.findFirst();
  if (!existingSettings) {
    await prisma.systemSettings.create({
      data: {
        max_rent_days: 14,
        max_concurrent_items: 3,
      },
    });
    console.log('✅ SystemSettings criado (14 dias máx, 3 itens concorrentes)');
  }

  // 2. Usuário Administrador Padrão
  const adminEmail = 'admin@reservalab.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'Administrador ReservaLab',
        email: adminEmail,
        password_hash: passwordHash,
        role: Role.ADMIN,
        is_manually_blocked: false,
      },
    });
    console.log('✅ Usuário Admin padrão criado (admin@reservalab.com / admin123)');
  }

  // 3. Categorias Iniciais
  const categories = [
    { name: 'Notebooks', description: 'Laptops e carregadores corporativos/acadêmicos' },
    { name: 'Projetores', description: 'Projetores multimídia e adaptadores de vídeo' },
    { name: 'Câmeras e Áudio', description: 'Microfones, tripés e câmeras para gravação' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Categorias padrão criadas com sucesso');

  console.log('🚀 Seed concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

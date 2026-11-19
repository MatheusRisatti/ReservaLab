-- ============================================================================
-- ReservaLab — Script SQL de Carga Inicial (Seed Idempotente)
-- Equivalente ao arquivo server/prisma/seed.ts para configurações e categorias.
-- Nota: O usuário administrador padrão é provisionado via `npm run prisma:seed`
-- (server/prisma/seed.ts) com hash bcrypt dinâmico, evitando senhas em SQL.
-- ============================================================================

-- 1. Configurações Globais do Sistema (SystemSettings)
INSERT INTO "SystemSettings" ("id", "max_rent_days", "max_concurrent_items", "updated_at")
SELECT
    gen_random_uuid()::text,
    14,
    3,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "SystemSettings"
);

-- 2. Categorias Iniciais de Equipamentos
INSERT INTO "Category" ("id", "name", "description")
VALUES
    (gen_random_uuid()::text, 'Notebooks', 'Laptops e carregadores corporativos/acadêmicos'),
    (gen_random_uuid()::text, 'Projetores', 'Projetores multimídia e adaptadores de vídeo'),
    (gen_random_uuid()::text, 'Câmeras e Áudio', 'Microfones, tripés e câmeras para gravação')
ON CONFLICT ("name") DO NOTHING;

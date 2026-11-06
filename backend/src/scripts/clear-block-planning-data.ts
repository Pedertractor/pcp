/**
 * Remove dados de planejamento/execução vinculados a um bloco (OFs, processos, máquinas)
 * para permitir nova importação do Excel. Mantém o bloco, CCs e imagem da planta.
 *
 * Uso:
 *   npx tsx src/scripts/clear-block-planning-data.ts [nome-parcial]
 * Ex.: npx tsx src/scripts/clear-block-planning-data.ts F
 */
import 'dotenv/config';

import { prisma } from '../config/prisma.js';

const blockNameQuery = process.argv[2] ?? 'F';

const block = await prisma.block.findFirst({
  where: { name: { contains: blockNameQuery, mode: 'insensitive' } },
  select: { id: true, name: true },
});

if (!block) {
  console.error(`Bloco não encontrado (busca: "${blockNameQuery}").`);
  process.exit(1);
}

console.log('Limpando dados de planejamento:', block.name, `(${block.id})`);

const deletedProcesses = await prisma.productionProcess.deleteMany({
  where: { blockId: block.id },
});

const deletedOrders = await prisma.productionOrder.deleteMany({
  where: { blockId: block.id },
});

const deletedMachines = await prisma.machine.deleteMany({
  where: { blockId: block.id },
});

console.log(
  JSON.stringify(
    {
      blockId: block.id,
      deletedProductionProcesses: deletedProcesses.count,
      deletedProductionOrders: deletedOrders.count,
      deletedMachines: deletedMachines.count,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();

import { prisma } from '../config/prisma.js';
import { PmpBlockService } from '../services/pmp-block.service.js';
import { SectorService } from '../services/sector.service.js';

const BLOCK_NAME = 'Solda';

const OPERATIONS_BY_COST_CENTER: Record<string, number[]> = {
  '02105': [10],
  '02110': [10],
  '02112': [10],
  '02120': [10],
  '02121': [10],
  '02310': [10, 11, 20, 25, 30],
  '02320': [7, 8, 10, 16, 20, 30],
  '02321': [20],
  '02330': [20],
  '02331': [10, 15, 17, 20, 24, 30],
  '02345': [10, 15, 20],
  '02351': [10],
  '02370': [41],
  '02371': [10, 11, 17, 20, 25, 30, 40, 50],
  '02373': [12, 20],
  '02376': [10, 17, 20, 30],
  '02380': [7, 9, 10, 20, 22, 25, 40],
  '02384': [10, 20, 30],
  '02385': [10, 20, 30, 41],
  '02390': [10, 20, 22, 30, 50],
  '02392': [15, 30, 50, 60],
  '02393': [20],
  '02394': [25, 30],
  '02521': [15, 20],
  '02550': [20],
};

function stripLeadingZeros(value: string) {
  return value.trim().replace(/^0+/, '');
}

async function main() {
  const sectors = await new SectorService(prisma).listActiveSectors();

  const missing: string[] = [];
  const ambiguous: string[] = [];
  const costCenters = Object.entries(OPERATIONS_BY_COST_CENTER).flatMap(
    ([costCenter, operations]) => {
      const matches = sectors.filter(
        (sector) =>
          stripLeadingZeros(sector.costCenter) === stripLeadingZeros(costCenter),
      );
      if (matches.length === 0) {
        missing.push(costCenter);
        return [];
      }
      if (matches.length > 1) {
        ambiguous.push(
          `${costCenter} (${matches.map((m) => `${m.id}: ${m.name}`).join(' | ')})`,
        );
        return [];
      }
      return [{ sectorIdApi: matches[0]!.id, operations }];
    },
  );

  if (missing.length > 0 || ambiguous.length > 0) {
    if (missing.length > 0) {
      console.error(`Centros de custo não encontrados na API base: ${missing.join(', ')}`);
    }
    if (ambiguous.length > 0) {
      console.error(`Centros de custo com mais de um setor: ${ambiguous.join('; ')}`);
    }
    process.exitCode = 1;
    return;
  }

  const service = new PmpBlockService(prisma);
  const existing = await prisma.pmpBlock.findUnique({
    where: { name: BLOCK_NAME },
    select: { id: true },
  });

  const block = existing
    ? await service.updateBlock(existing.id, { name: BLOCK_NAME, costCenters })
    : await service.createBlock({ name: BLOCK_NAME, costCenters, series: [] });

  const operationsCount = block.costCenters.reduce(
    (total, cc) => total + cc.operations.length,
    0,
  );
  console.log(
    `Bloco "${block.name}" ${existing ? 'atualizado' : 'criado'}: ${block.costCenters.length} centros de custo, ${operationsCount} operações.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import { prisma } from '../config/prisma.js';
import { PmpBlockService } from '../services/pmp-block.service.js';
import { SectorService } from '../services/sector.service.js';

const BLOCK_NAME = 'Solda';

const COST_CENTERS = [
  '02105',
  '02110',
  '02112',
  '02120',
  '02121',
  '02310',
  '02320',
  '02321',
  '02330',
  '02331',
  '02345',
  '02351',
  '02370',
  '02371',
  '02373',
  '02376',
  '02380',
  '02384',
  '02385',
  '02390',
  '02392',
  '02393',
  '02394',
  '02521',
  '02550',
];

function stripLeadingZeros(value: string) {
  return value.trim().replace(/^0+/, '');
}

async function main() {
  const sectors = await new SectorService(prisma).listActiveSectors();

  const missing: string[] = [];
  const ambiguous: string[] = [];
  const costCenters = COST_CENTERS.flatMap((costCenter) => {
    const matches = sectors.filter(
      (sector) => stripLeadingZeros(sector.costCenter) === stripLeadingZeros(costCenter),
    );
    if (matches.length === 0) {
      missing.push(costCenter);
      return [];
    }
    if (matches.length > 1) {
      ambiguous.push(`${costCenter} (${matches.map((m) => `${m.id}: ${m.name}`).join(' | ')})`);
      return [];
    }
    return [{ sectorIdApi: matches[0]!.id }];
  });

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

  console.log(
    `Bloco "${block.name}" ${existing ? 'atualizado' : 'criado'}: ${block.costCenters.length} centros de custo.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

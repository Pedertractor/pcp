import 'dotenv/config';
import { readFileSync } from 'node:fs';

import { prisma } from '../config/prisma.js';
import { parsePlanningXlsBuffer } from '../integrations/planning-xls-parser.js';
import { parseReferenceDate } from '../lib/excel-serial-date.js';
import { ProductionPlanningSyncService } from '../services/production-planning-sync.service.js';

const filePath =
  process.argv[2] ??
  String.raw`C:\Users\vanderlei.junior\Downloads\28102026_BLOCO_F (2).xls`;
const referenceDateArg = process.argv[3] ?? '2026-10-28';
const blockNameQuery = process.argv[4] ?? 'F';
const costCenters = ['2530', '2540'];

const block = await prisma.block.findFirst({
  where: { name: { contains: blockNameQuery, mode: 'insensitive' } },
  select: { id: true, name: true, costCenters: { select: { costCenter: true } } },
});

if (!block) {
  console.error(`Bloco não encontrado (busca: "${blockNameQuery}").`);
  process.exit(1);
}

console.log('Bloco:', block.name, block.id);
console.log('CC no bloco:', block.costCenters.map((c) => c.costCenter).join(', '));

const buffer = readFileSync(filePath);
const referenceDate = parseReferenceDate(referenceDateArg);
const rows = parsePlanningXlsBuffer(buffer, referenceDate);

const result = await new ProductionPlanningSyncService(prisma).syncFromRows({
  blockId: block.id,
  referenceDate,
  costCenters,
  rows,
  assignDemoPositions: true,
});

console.log(JSON.stringify(result, null, 2));

await prisma.$disconnect();

/**
 * Vincula uma série ao bloco PMP com os códigos de peça da aba "PMP BALANCEADO"
 * (coluna "CODIGO SOLDA", equivalente ao PRODUTO usado nas metas semanais).
 * Substitui todos os códigos já cadastrados na série.
 *
 * Uso: npx tsx src/scripts/link-pmp-series-from-xlsx.ts <arquivo> [bloco] [serie]
 * Ex.: npx tsx src/scripts/link-pmp-series-from-xlsx.ts "C:/Downloads/00_PMP_MODELO_W46_5DIAS.xlsx" Solda A
 */
import XLSX from 'xlsx';
import { prisma } from '../config/prisma.js';

const [
  filePath = 'C:/Users/vanderlei.junior/Downloads/00_PMP_MODELO_W46_5DIAS.xlsx',
  blockName = 'Solda',
  seriesName = 'A',
] = process.argv.slice(2);

const SHEET_NAME = 'PMP BALANCEADO';
const PART_CODE_HEADER = 'CODIGO SOLDA';

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function readPartCodes(): string[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(`Aba "${SHEET_NAME}" não encontrada em ${filePath}.`);
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell) === PART_CODE_HEADER),
  );
  if (headerIndex < 0) {
    throw new Error(`Coluna "${PART_CODE_HEADER}" não encontrada na aba "${SHEET_NAME}".`);
  }
  const column = rows[headerIndex]!.findIndex(
    (cell) => normalizeHeader(cell) === PART_CODE_HEADER,
  );

  const codes = new Set<string>();
  for (const row of rows.slice(headerIndex + 1)) {
    const code = String(row[column] ?? '').trim();
    if (code && code !== '0') codes.add(code);
  }
  return [...codes];
}

async function main() {
  const partCodes = readPartCodes();
  if (partCodes.length === 0) {
    throw new Error('Nenhum código de peça encontrado na planilha.');
  }

  const block = await prisma.pmpBlock.findUnique({
    where: { name: blockName },
    select: { id: true },
  });
  if (!block) {
    throw new Error(`Bloco PMP "${blockName}" não encontrado.`);
  }

  await prisma.$transaction(async (tx) => {
    const series = await tx.pmpSeries.upsert({
      where: { pmpBlockId_name: { pmpBlockId: block.id, name: seriesName } },
      create: { pmpBlockId: block.id, name: seriesName },
      update: {},
      select: { id: true },
    });
    await tx.pmpSeriesPart.deleteMany({ where: { pmpSeriesId: series.id } });
    await tx.pmpSeriesPart.createMany({
      data: partCodes.map((partCode) => ({ pmpSeriesId: series.id, partCode })),
    });
  });

  const goalsOutside = await prisma.productionWeeklyGoal.count({
    where: { pmpBlockId: block.id, productCode: { notIn: partCodes } },
  });

  console.log(`Série "${seriesName}" do bloco "${blockName}": ${partCodes.length} códigos de peça.`);
  console.log(`Metas semanais já existentes com código fora da série: ${goalsOutside}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

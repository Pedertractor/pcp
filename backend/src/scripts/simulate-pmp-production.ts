/**
 * Simula peças produzidas nas metas de uma semana do bloco (apenas para visualizar o layout).
 * Dias passados recebem produção variando por centro de custo (crítico, atenção, no ritmo, superado);
 * o dia de hoje recebe produção parcial; dias futuros ficam zerados.
 *
 * Uso: npx tsx src/scripts/simulate-pmp-production.ts [bloco] [inicio-semana] [--reset]
 * Ex.: npx tsx src/scripts/simulate-pmp-production.ts Solda 2026-11-09
 *      npx tsx src/scripts/simulate-pmp-production.ts Solda 2026-11-09 --reset
 */
import { prisma } from '../config/prisma.js';

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const [blockName = 'Solda', weekStartKey = '2026-11-09'] = args.filter((arg) => arg !== '--reset');

const ATTAINMENT_FACTORS = [0.45, 0.75, 0.92, 1, 1.15, 1.05, 0.6, 0.98];

function hash(value: string): number {
  let result = 0;
  for (const char of value) {
    result = (result * 31 + char.charCodeAt(0)) >>> 0;
  }
  return result;
}

function localTodayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

async function main() {
  const block = await prisma.pmpBlock.findFirst({ where: { name: blockName } });
  if (!block) {
    throw new Error(`Bloco "${blockName}" não encontrado.`);
  }

  const goals = await prisma.productionWeeklyGoal.findMany({
    where: { pmpBlockId: block.id, weekStart: new Date(`${weekStartKey}T00:00:00.000Z`) },
    include: {
      dailyGoals: true,
      pmpCostCenter: true,
    },
  });

  const todayKey = localTodayKey();
  let totalPlanned = 0;
  let totalProduced = 0;

  for (const goal of goals) {
    const costCenter = goal.pmpCostCenter.costCenter;
    const factor = ATTAINMENT_FACTORS[hash(costCenter) % ATTAINMENT_FACTORS.length];
    let weeklyProduced = 0;

    for (const day of goal.dailyGoals) {
      const dateKey = day.date.toISOString().slice(0, 10);
      let produced = 0;
      if (!reset && day.plannedQuantity > 0) {
        const jitter = 0.85 + (hash(`${goal.id}${dateKey}`) % 30) / 100;
        if (dateKey < todayKey) {
          produced = Math.round(day.plannedQuantity * factor * jitter);
        } else if (dateKey === todayKey) {
          produced = Math.round(day.plannedQuantity * factor * jitter * 0.5);
        }
      }
      weeklyProduced += produced;
      totalPlanned += day.plannedQuantity;
      await prisma.productionDailyGoal.update({
        where: { id: day.id },
        data: { producedQuantity: produced },
      });
    }

    totalProduced += weeklyProduced;
    await prisma.productionWeeklyGoal.update({
      where: { id: goal.id },
      data: { producedQuantity: weeklyProduced },
    });
  }

  console.log(
    `${reset ? 'Produção zerada' : 'Produção simulada'}: ${goals.length} metas, ${totalProduced}/${totalPlanned} peças (hoje = ${todayKey}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

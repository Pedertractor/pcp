/**
 * Executa manualmente a redistribuição noturna do PMP: o saldo não atingido dos
 * dias anteriores da semana corrente é dividido entre os dias restantes.
 *
 * Uso:
 *   npm run pmp:redistribute [-- AAAA-MM-DD]
 * Ex.: npm run pmp:redistribute -- 2026-11-13
 */
import 'dotenv/config';

import { prisma } from '../config/prisma.js';
import {
  localTodayKey,
  PmpRedistributionService,
} from '../services/pmp-redistribution.service.js';

const dateArg = process.argv[2];
if (dateArg !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
  console.error(`Data inválida: "${dateArg}". Use AAAA-MM-DD.`);
  process.exit(1);
}

const todayKey = dateArg ?? localTodayKey();
console.log('Redistribuindo metas diárias do PMP a partir de', todayKey);

const result = await new PmpRedistributionService(prisma).redistributeCurrentWeeks(todayKey);
console.log(JSON.stringify(result, null, 2));

await prisma.$disconnect();

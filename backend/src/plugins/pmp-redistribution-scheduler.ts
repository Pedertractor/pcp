import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { PmpRedistributionService } from '../services/pmp-redistribution.service.js';

/** Milissegundos até a próxima ocorrência de `hour`:00 no fuso local do servidor. */
function msUntilNextRun(hour: number, now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function pmpRedistributionScheduler(fastify: FastifyInstance) {
  if (env.PMP_REDISTRIBUTION_ENABLED !== 'true') {
    fastify.log.info('Redistribuição noturna do PMP desativada');
    return;
  }

  let timer: NodeJS.Timeout | null = null;

  const run = async () => {
    try {
      const service = new PmpRedistributionService(fastify.prisma);
      const result = await service.redistributeCurrentWeeks();
      fastify.log.info(result, 'Redistribuição noturna do PMP concluída');
    } catch (error) {
      fastify.log.error(error, 'Falha na redistribuição noturna do PMP');
    }
  };

  const schedule = () => {
    const delay = msUntilNextRun(env.PMP_REDISTRIBUTION_HOUR);
    timer = setTimeout(() => {
      void run().finally(schedule);
    }, delay);
    fastify.log.info(
      { nextRunInMinutes: Math.round(delay / 60_000) },
      'Redistribuição noturna do PMP agendada',
    );
  };

  fastify.addHook('onReady', async () => {
    schedule();
  });

  fastify.addHook('onClose', async () => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

export default fp(pmpRedistributionScheduler);

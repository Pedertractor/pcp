import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import csrfProtection from '@fastify/csrf-protection';
import multipart from '@fastify/multipart';
import {
  validatorCompiler,
  serializerCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import prismaPlugin from './plugins/prisma.js';
import { authPlugin } from './plugins/auth.js';
import pmpRedistributionScheduler from './plugins/pmp-redistribution-scheduler.js';
import { healthRoutes } from './routes/health.routes.js';
import mainRoutes from './routes/main.routes.js';
import { errorHandler } from './lib/errorHandler.js';
import { env } from './config/env.js';
import { BLOCK_PLAN_MAX_BYTES } from './lib/block-plan-storage.js';

const app = Fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>();

app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

app.register(cookie, {
  secret: env.COOKIE_SECRET,
});

app.register(csrfProtection, {
  cookieKey: '_csrf',
  cookieOpts: {
    signed: true,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: env.cookieSecure,
  },
});

app.register(multipart, {
  limits: {
    files: 1,
    fileSize: BLOCK_PLAN_MAX_BYTES,
  },
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'PCP API',
      description: 'API de planejamento e monitoramento da produção',
      version: '0.1.0',
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
        },
      },
    },
  },
  transform: jsonSchemaTransform,
});

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
});

app.setErrorHandler(errorHandler);

app.register(prismaPlugin);
app.register(authPlugin);
app.register(pmpRedistributionScheduler);

app.register(healthRoutes);
app.register(mainRoutes, { prefix: '/api' });

export { app };

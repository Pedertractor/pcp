import { env } from './config/env.js';
import { app } from './app.js';

app.listen({ port: env.PORT, host: env.HOST }, (err: Error | null) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});

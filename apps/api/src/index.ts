import { app } from './app.js';
import { checkDb } from './db/index.js';

const port = Number(process.env.PORT ?? 4000);

app.listen(port, async () => {
  const dbUp = await checkDb();
  console.log(`API listening on http://localhost:${port} (db: ${dbUp ? 'up' : 'down'})`);
});

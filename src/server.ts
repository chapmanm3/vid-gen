import 'dotenv/config';
import app from './index';
import { info } from './utils/logger';
import { getConfig } from './config';

const config = getConfig();

app.listen(config.PORT, () => {
  info('Server started', { port: config.PORT, env: config.NODE_ENV });
});

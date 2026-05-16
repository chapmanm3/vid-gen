import { describe, it, expect } from 'vitest';
import { validateRequest } from '../../src/middleware/validate';
import { z } from 'zod';
import express from 'express';
import request from 'supertest';

describe('validateRequest middleware', () => {
  it('passes valid request body', async () => {
    const schema = z.object({ name: z.string() });
    const app = express();
    app.use(express.json());
    app.post('/test', validateRequest(schema), (req, res) => {
      res.json({ received: req.body });
    });

    const response = await request(app).post('/test').send({ name: 'test' });

    expect(response.status).toBe(200);
    expect(response.body.received.name).toBe('test');
  });

  it('returns 400 for invalid body', async () => {
    const schema = z.object({ name: z.string() });
    const app = express();
    app.use(express.json());
    app.post('/test', validateRequest(schema), (req, res) => {
      res.json({ received: req.body });
    });
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(400).json({ error: err.message });
    });

    const response = await request(app).post('/test').send({ name: 123 });

    expect(response.status).toBe(400);
  });
});

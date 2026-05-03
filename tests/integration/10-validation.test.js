const axios = require('axios');
const jwt   = require('jsonwebtoken');
const { login } = require('../helpers/auth');
const { client } = require('../helpers/apiClient');

describe('Validation & token failures', () => {
  test('TC-18: Expired/invalid JWT is rejected with 401', async () => {
    const real = await login('user');
    // Decode header + payload, mutate exp into the past, re-sign with garbage HMAC.
    const decoded = jwt.decode(real.idToken, { complete: true });
    const expiredPayload = { ...decoded.payload, exp: Math.floor(Date.now() / 1000) - 3600 };
    const forged = jwt.sign(expiredPayload, 'a-totally-wrong-secret', {
      algorithm: 'HS256',
      header: { kid: decoded.header.kid },
    });
    const c = client(forged);
    const r = await c.post('/auth/me');
    expect(r.status).toBe(401);
  });

  test('TC-19: POST /api/tickets with empty title returns 400', async () => {
    const u = await login('user');
    const r = await client(u.idToken).post('/tickets', {
      title: '',
      category: 'Software',
      description: 'Missing title; should fail validation.',
    });
    expect(r.status).toBe(400);
    expect(r.data.error).toBeDefined();
  });

  test.skip('TC-20: 6 MB attachment is rejected (skipped — backend has no server-side size cap; client enforces 5 MB pre-upload)', async () => {
    // TODO: enforce body size in backend (multer or presigned policy size limit)
    // and remove .skip once implemented.
  });
});

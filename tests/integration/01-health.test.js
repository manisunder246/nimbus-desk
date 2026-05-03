const axios = require('axios');

describe('Backend health', () => {
  test('TC-01: GET /health returns 200 and body { ok: true }', async () => {
    // /health is mounted outside /api, so hit the host root
    const base = (process.env.API_BASE_URL || '').replace(/\/api\/?$/, '');
    const r = await axios.get(`${base}/health`, { validateStatus: () => true });
    expect(r.status).toBe(200);
    expect(r.data.ok).toBe(true);
  });
});

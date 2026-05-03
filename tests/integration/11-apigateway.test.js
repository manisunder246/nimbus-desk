const axios = require('axios');

describe('API Gateway -> Lambda classifier', () => {
  test('TC-17: POST /classify returns priority field', async () => {
    const url = process.env.APIGW_CLASSIFIER_URL;
    expect(url).toBeDefined();
    const r = await axios.post(url, {
      ticketId: '00000000-0000-0000-0000-' + Date.now().toString().padStart(12, '0'),
      category: 'Network',
      description: 'production outage triggered via API Gateway test',
      priority: 'Low',
    }, { validateStatus: () => true, timeout: 15000 });
    expect(r.status).toBe(200);
    expect(r.data.priority).toBeDefined();
    expect(['High', 'Medium', 'Low']).toContain(r.data.priority);
  });
});

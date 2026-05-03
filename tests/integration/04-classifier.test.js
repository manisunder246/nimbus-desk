const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { login } = require('../helpers/auth');
const { client } = require('../helpers/apiClient');
const { ddb } = require('../helpers/awsClients');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Lambda classifier', () => {
  test('TC-06: Async classifier promotes Network/outage ticket to High and appends activityLog entry', async () => {
    const u = await login('user');
    const api = client(u.idToken);
    const r = await api.post('/tickets', {
      title: 'TC-06 critical network outage',
      category: 'Network',
      priority: 'Low',
      description: 'TC-06 production outage right now.',
    });
    expect(r.status).toBe(201);
    const ticketId = r.data.ticketId;

    // Lambda is invoked async; give it a moment.
    await sleep(8000);

    const out = await ddb.send(new GetCommand({
      TableName: process.env.DYNAMODB_TICKETS_TABLE,
      Key: { ticketId },
    }));
    expect(out.Item).toBeDefined();
    expect(out.Item.priority).toBe('High');
    const actions = (out.Item.activityLog || []).map((a) => a.action);
    expect(actions).toContain('Auto-classified');
  }, 30000);
});

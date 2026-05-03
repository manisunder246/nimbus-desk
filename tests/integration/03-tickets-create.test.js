const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { login } = require('../helpers/auth');
const { client } = require('../helpers/apiClient');
const { ddb } = require('../helpers/awsClients');

describe('Ticket creation', () => {
  test('TC-05: User creates a ticket via POST /api/tickets and DynamoDB row exists', async () => {
    const u = await login('user');
    const api = client(u.idToken);
    const r = await api.post('/tickets', {
      title: 'TC-05 production VPN outage',
      category: 'Network',
      priority: 'Low',
      description: 'TC-05 production outage — entire team cannot connect.',
    });
    expect(r.status).toBe(201);
    expect(r.data.ticketId).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.data.status).toBe('Open');

    const dd = await ddb.send(new GetCommand({
      TableName: process.env.DYNAMODB_TICKETS_TABLE,
      Key: { ticketId: r.data.ticketId },
    }));
    expect(dd.Item).toBeDefined();
    expect(dd.Item.title).toBe('TC-05 production VPN outage');
    expect(dd.Item.createdBy).toBe(u.sub);
  });
});

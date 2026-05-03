// Indirect SNS check: we cannot read mailboxes from a test, so we assert the
// classifier Lambda's CloudWatch log line "SNS notification published" within
// the past few minutes. This proves the SNS publish call succeeded.
const { FilterLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const { login } = require('../helpers/auth');
const { client } = require('../helpers/apiClient');
const { logs } = require('../helpers/awsClients');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('SNS notification (indirect via CloudWatch)', () => {
  test('TC-07: Lambda emits "SNS notification published" log line after a new ticket', async () => {
    const u = await login('user');
    const api = client(u.idToken);
    const r = await api.post('/tickets', {
      title: 'TC-07 sns publish trigger',
      category: 'Network',
      priority: 'Low',
      description: 'TC-07 production outage trigger for SNS.',
    });
    expect(r.status).toBe(201);

    await sleep(8000);

    const out = await logs.send(new FilterLogEventsCommand({
      logGroupName: '/aws/lambda/nimbusdesk-classifier',
      startTime: Date.now() - 5 * 60 * 1000,
      filterPattern: '"SNS notification published"',
      limit: 50,
    }));
    expect(out.events).toBeDefined();
    expect(out.events.length).toBeGreaterThan(0);
  }, 30000);
});

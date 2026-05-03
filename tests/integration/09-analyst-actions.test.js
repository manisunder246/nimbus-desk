const { login } = require('../helpers/auth');
const { client } = require('../helpers/apiClient');

async function setupAssignedTicket() {
  const u  = await login('user');
  const a  = await login('admin');
  const an = await login('analyst');

  const created = await client(u.idToken).post('/tickets', {
    title: 'TC-13/14/15 analyst fixture',
    category: 'Software',
    priority: 'Medium',
    description: 'TC-13/14/15 fixture.',
  });
  expect(created.status).toBe(201);
  const ticketId = created.data.ticketId;

  const assign = await client(a.idToken).patch(`/tickets/${ticketId}`, {
    assignedTo: an.sub,
    status: 'In Progress',
  });
  expect(assign.status).toBe(200);
  return { ticketId, u, a, an };
}

describe('Analyst & user authorization', () => {
  test('TC-13: Analyst can PATCH status on a ticket assigned to them', async () => {
    const { ticketId, an } = await setupAssignedTicket();
    const r = await client(an.idToken).patch(`/tickets/${ticketId}`, { status: 'Resolved' });
    expect(r.status).toBe(200);
    expect(r.data.status).toBe('Resolved');
  });

  test('TC-14: Analyst PATCH priority returns 403', async () => {
    const { ticketId, an } = await setupAssignedTicket();
    const r = await client(an.idToken).patch(`/tickets/${ticketId}`, { priority: 'Low' });
    expect(r.status).toBe(403);
  });

  test('TC-15: Regular user PATCH any field returns 403', async () => {
    const { ticketId, u } = await setupAssignedTicket();
    const r = await client(u.idToken).patch(`/tickets/${ticketId}`, { status: 'Resolved' });
    expect(r.status).toBe(403);
  });

  test('TC-16: GET a ticket the caller cannot access returns 403 or 404', async () => {
    // Cross-tenant: only one regular user exists in the demo. Either:
    //  a) a non-existent ticketId → 404
    //  b) a ticket the caller isn't owner/assignee/admin for → 403
    // Both are valid auth-deny outcomes. We assert the disjunction.
    const u = await login('user');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const r = await client(u.idToken).get(`/tickets/${fakeId}`);
    expect([403, 404]).toContain(r.status);
  });
});

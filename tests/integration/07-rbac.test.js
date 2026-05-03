const { login } = require('../helpers/auth');
const { client } = require('../helpers/apiClient');

describe('Role-based access control on /api/tickets', () => {
  let createdId;

  beforeAll(async () => {
    const u = await login('user');
    const api = client(u.idToken);
    const r = await api.post('/tickets', {
      title: 'TC-09/10/11 fixture ticket',
      category: 'Software',
      priority: 'Low',
      description: 'Listing fixture.',
    });
    expect(r.status).toBe(201);
    createdId = r.data.ticketId;
  });

  test('TC-09: Admin GET /api/tickets includes the freshly created ticket', async () => {
    const a = await login('admin');
    const api = client(a.idToken);
    const r = await api.get('/tickets');
    expect(r.status).toBe(200);
    const ids = r.data.items.map((t) => t.ticketId);
    expect(ids).toContain(createdId);
  });

  test('TC-10: User GET /api/tickets only returns tickets they created', async () => {
    const u = await login('user');
    const api = client(u.idToken);
    const r = await api.get('/tickets');
    expect(r.status).toBe(200);
    expect(r.data.items.every((t) => t.createdBy === u.sub)).toBe(true);
  });

  test('TC-11: Analyst GET /api/tickets only returns tickets assigned to them', async () => {
    // Setup: have admin assign one ticket to the analyst
    const admin   = await login('admin');
    const analyst = await login('analyst');
    const adminApi = client(admin.idToken);
    const setup = await adminApi.patch(`/tickets/${createdId}`, {
      assignedTo: analyst.sub,
      status: 'In Progress',
    });
    expect(setup.status).toBe(200);

    const api = client(analyst.idToken);
    const r = await api.get('/tickets');
    expect(r.status).toBe(200);
    expect(r.data.items.length).toBeGreaterThan(0);
    expect(r.data.items.every((t) => t.assignedTo === analyst.sub)).toBe(true);
    expect(r.data.items.map((t) => t.ticketId)).toContain(createdId);
  });
});

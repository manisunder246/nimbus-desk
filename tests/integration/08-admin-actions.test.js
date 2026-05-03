const { login } = require('../helpers/auth');
const { client } = require('../helpers/apiClient');

describe('Admin actions', () => {
  test('TC-12: Admin PATCH assignedTo + status returns 200 and appends activityLog', async () => {
    const u = await login('user');
    const a = await login('admin');
    const an = await login('analyst');

    const userApi  = client(u.idToken);
    const adminApi = client(a.idToken);

    const created = await userApi.post('/tickets', {
      title: 'TC-12 admin assignment fixture',
      category: 'Software',
      priority: 'Medium',
      description: 'TC-12 fixture for admin patch.',
    });
    expect(created.status).toBe(201);
    const ticketId = created.data.ticketId;
    const beforeLogLen = (created.data.activityLog || []).length;

    const r = await adminApi.patch(`/tickets/${ticketId}`, {
      assignedTo: an.sub,
      status: 'In Progress',
    });
    expect(r.status).toBe(200);
    expect(r.data.status).toBe('In Progress');
    expect(r.data.assignedTo).toBe(an.sub);
    expect((r.data.activityLog || []).length).toBeGreaterThan(beforeLogLen);
    const lastEntry = r.data.activityLog[r.data.activityLog.length - 1];
    expect(lastEntry.action).toBe('Updated');
    expect(lastEntry.by).toBe(a.email);
  });
});

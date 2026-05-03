const { login } = require('../helpers/auth');

describe('Cognito authentication', () => {
  test('TC-02: Admin login returns ID token with cognito:groups containing Admins', async () => {
    const s = await login('admin');
    expect(s.idToken).toMatch(/^eyJ/); // JWT
    expect(s.groups).toContain('Admins');
    expect(s.email).toBe(process.env.TEST_ADMIN_EMAIL);
  });

  test('TC-03: Analyst login returns groups containing Analysts', async () => {
    const s = await login('analyst');
    expect(s.idToken).toMatch(/^eyJ/);
    expect(s.groups).toContain('Analysts');
  });

  test('TC-04: User login returns groups containing Users', async () => {
    const s = await login('user');
    expect(s.idToken).toMatch(/^eyJ/);
    expect(s.groups).toContain('Users');
  });
});

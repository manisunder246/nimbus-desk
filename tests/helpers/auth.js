const { InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { cognito } = require('./awsClients');

// All credentials come from environment variables (loaded from tests/.env which
// is symlinked to .env.infrastructure). Do NOT commit real emails or passwords.
function required(key) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}. See tests/.env.example.`);
  return v;
}

const ROLES = {
  admin: {
    email:    required('TEST_ADMIN_EMAIL'),
    password: required('TEST_ADMIN_PASSWORD'),
    expectGroup: 'Admins',
  },
  analyst: {
    email:    process.env.TEST_ANALYST_EMAIL    || required('COGNITO_ANALYST_EMAIL'),
    password: process.env.TEST_ANALYST_PASSWORD || required('COGNITO_ANALYST_PASSWORD'),
    expectGroup: 'Analysts',
  },
  user: {
    email:    required('TEST_USER_EMAIL'),
    password: required('TEST_USER_PASSWORD'),
    expectGroup: 'Users',
  },
};

const cache = new Map();

function decode(jwt) {
  const part = jwt.split('.')[1];
  const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  return JSON.parse(json);
}

async function login(role) {
  if (cache.has(role)) return cache.get(role);
  const cfg = ROLES[role];
  if (!cfg) throw new Error(`unknown role ${role}`);
  const out = await cognito.send(new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.COGNITO_APP_CLIENT_ID,
    AuthParameters: { USERNAME: cfg.email, PASSWORD: cfg.password },
  }));
  if (!out.AuthenticationResult?.IdToken) {
    throw new Error(`login(${role}) returned no IdToken; challenge=${out.ChallengeName}`);
  }
  const idToken = out.AuthenticationResult.IdToken;
  const claims = decode(idToken);
  const session = {
    role,
    email: cfg.email,
    idToken,
    sub: claims.sub,
    groups: claims['cognito:groups'] || [],
  };
  cache.set(role, session);
  return session;
}

module.exports = { login, ROLES };

// middleware/auth.js — Cognito ID-token verification.
// Pulls the user pool's public JWKS once (cached + rate-limited), verifies
// the RS256 signature, and asserts iss / aud / token_use=id. On success it
// attaches { sub, email, groups } to req.user so downstream RBAC can run.
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import env from '../config/env.js';

const ISSUER = `https://cognito-idp.${env.AWS_REGION}.amazonaws.com/${env.COGNITO_USER_POOL_ID}`;
const JWKS_URI = `${ISSUER}/.well-known/jwks.json`;

const jwks = jwksClient({ jwksUri: JWKS_URI, cache: true, rateLimit: true });

// jwt.verify() calls this for every token to resolve the right public key
// from the JWKS using the token header's `kid` claim.
function getKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

export function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      { algorithms: ['RS256'], issuer: ISSUER },
      (err, decoded) => {
        if (err) return reject(err);
        if (decoded.token_use !== 'id') {
          return reject(new Error(`token_use must be 'id', got '${decoded.token_use}'`));
        }
        if (decoded.aud !== env.COGNITO_APP_CLIENT_ID) {
          return reject(new Error('audience mismatch'));
        }
        resolve(decoded);
      },
    );
  });
}

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }
    const decoded = await verifyToken(token);
    req.user = {
      sub: decoded.sub,
      email: decoded.email,
      groups: decoded['cognito:groups'] || [],
      raw: decoded,
    };
    next();
  } catch (err) {
    console.warn('[auth] token verify failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired token', detail: err.message });
  }
}

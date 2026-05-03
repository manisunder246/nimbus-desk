const axios = require('axios');

function client(token) {
  const c = axios.create({
    baseURL: process.env.API_BASE_URL,
    timeout: 20000,
    validateStatus: () => true, // never throw on non-2xx; tests assert directly
  });
  if (token) c.defaults.headers.common.Authorization = `Bearer ${token}`;
  return c;
}

module.exports = { client };

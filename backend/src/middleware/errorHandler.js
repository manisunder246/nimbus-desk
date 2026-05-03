export function errorHandler(err, req, res, _next) {
  console.error('[error]', err);
  const status = err.status || err.$metadata?.httpStatusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    code: err.name,
  });
}

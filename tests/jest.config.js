module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000,
  testMatch: ['<rootDir>/integration/**/*.test.js', '<rootDir>/unit/**/*.test.js'],
  reporters: [
    'default',
    '<rootDir>/helpers/reporter.js',
  ],
  setupFiles: ['<rootDir>/helpers/loadEnv.js'],
};

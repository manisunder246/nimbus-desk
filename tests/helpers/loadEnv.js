// Load .env (symlinked to root .env.infrastructure) before any test runs.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const region = process.env.COGNITO_REGION || 'ap-south-1';
process.env.AWS_REGION = process.env.AWS_REGION || region;

const target = process.env.TEST_TARGET || 'production';
const ec2 = process.env.EC2_PUBLIC_DNS;
process.env.API_BASE_URL =
  process.env.API_BASE_URL ||
  (target === 'local' ? 'http://localhost:3001/api' : `http://${ec2}/api`);
process.env.TEST_TARGET = target;

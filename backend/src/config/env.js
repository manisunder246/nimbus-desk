// config/env.js — loads + validates required env vars at boot.
// Process exits if any are missing so we fail fast in CI / on EC2 rather
// than 500'ing on the first request that needs the missing value.
import 'dotenv/config';

const required = [
  'AWS_REGION',
  'COGNITO_USER_POOL_ID',
  'COGNITO_APP_CLIENT_ID',
  'DYNAMODB_TICKETS_TABLE',
  'DYNAMODB_USERS_TABLE',
  'S3_ATTACHMENTS_BUCKET',
  'SNS_NOTIFICATIONS_TOPIC_ARN',
  'LAMBDA_CLASSIFIER_NAME',
];

const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  AWS_REGION: process.env.AWS_REGION || process.env.COGNITO_REGION || 'ap-south-1',
  COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
  COGNITO_APP_CLIENT_ID: process.env.COGNITO_APP_CLIENT_ID,
  TICKETS_TABLE: process.env.DYNAMODB_TICKETS_TABLE,
  USERS_TABLE: process.env.DYNAMODB_USERS_TABLE,
  S3_BUCKET: process.env.S3_ATTACHMENTS_BUCKET,
  SNS_TOPIC_ARN: process.env.SNS_NOTIFICATIONS_TOPIC_ARN,
  LAMBDA_CLASSIFIER_NAME: process.env.LAMBDA_CLASSIFIER_NAME,
};

const missing = required.filter((k) => {
  const mapped = {
    AWS_REGION: env.AWS_REGION,
    COGNITO_USER_POOL_ID: env.COGNITO_USER_POOL_ID,
    COGNITO_APP_CLIENT_ID: env.COGNITO_APP_CLIENT_ID,
    DYNAMODB_TICKETS_TABLE: env.TICKETS_TABLE,
    DYNAMODB_USERS_TABLE: env.USERS_TABLE,
    S3_ATTACHMENTS_BUCKET: env.S3_BUCKET,
    SNS_NOTIFICATIONS_TOPIC_ARN: env.SNS_TOPIC_ARN,
    LAMBDA_CLASSIFIER_NAME: env.LAMBDA_CLASSIFIER_NAME,
  };
  return !mapped[k];
});

if (missing.length) {
  console.error('[env] Missing required env vars:', missing.join(', '));
  console.error('[env] Did you symlink/copy .env.infrastructure -> backend/.env?');
  process.exit(1);
}

export default env;

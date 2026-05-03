const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');
const { SNSClient } = require('@aws-sdk/client-sns');
const { CloudWatchLogsClient } = require('@aws-sdk/client-cloudwatch-logs');

const region = process.env.AWS_REGION || 'ap-south-1';

module.exports = {
  region,
  cognito: new CognitoIdentityProviderClient({ region }),
  ddb: DynamoDBDocumentClient.from(new DynamoDBClient({ region })),
  s3: new S3Client({ region }),
  sns: new SNSClient({ region }),
  logs: new CloudWatchLogsClient({ region }),
};

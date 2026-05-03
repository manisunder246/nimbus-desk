// config/aws.js — singleton AWS SDK v3 clients. Credentials come from the
// default provider chain (local dev: ~/.aws/credentials; EC2: instance
// profile). DynamoDBDocumentClient marshals/unmarshals plain JS objects.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import env from './env.js';

const region = env.AWS_REGION;

export const ddbDoc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});
export const s3 = new S3Client({ region });
export const sns = new SNSClient({ region });
export const lambda = new LambdaClient({ region });
export const cognito = new CognitoIdentityProviderClient({ region });

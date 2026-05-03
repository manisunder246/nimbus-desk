import { PublishCommand } from '@aws-sdk/client-sns';
import { sns } from '../config/aws.js';
import env from '../config/env.js';

export async function publish({ subject, message }) {
  return sns.send(new PublishCommand({
    TopicArn: env.SNS_TOPIC_ARN,
    Subject: subject.slice(0, 100),
    Message: message,
  }));
}

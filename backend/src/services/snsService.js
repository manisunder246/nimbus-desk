// services/snsService.js — thin wrapper over SNS Publish. Subjects are clipped
// to 100 chars to satisfy the SNS Subject limit; longer text goes in Message.
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

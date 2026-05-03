// services/lambdaService.js — async classifier invocation.
// InvocationType: 'Event' tells AWS to fire-and-forget — the InvokeCommand
// returns as soon as the request is accepted (~50ms) rather than waiting for
// the function to finish, so ticket creation isn't blocked by classification.
import { InvokeCommand } from '@aws-sdk/client-lambda';
import { lambda } from '../config/aws.js';
import env from '../config/env.js';

// Fire-and-forget classifier invocation. Never throw — log only.
export function invokeClassifierAsync(payload) {
  const cmd = new InvokeCommand({
    FunctionName: env.LAMBDA_CLASSIFIER_NAME,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify(payload)),
  });
  return lambda.send(cmd)
    .then(() => console.log('[lambdaService] classifier invoked async for', payload.ticketId))
    .catch((e) => console.error('[lambdaService] classifier invoke failed:', e.message));
}

// nimbusdesk-classifier — auto re-evaluates ticket priority, updates DynamoDB,
// publishes SNS notification. Invoked async by Express right after ticket creation.
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const REGION = process.env.AWS_REGION_NAME || process.env.AWS_REGION || 'ap-south-1';
const TABLE  = process.env.TICKETS_TABLE   || 'nimbusdesk-tickets';
const TOPIC  = process.env.SNS_TOPIC_ARN;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const sns = new SNSClient({ region: REGION });

const HIGH_KEYWORDS   = ['outage', 'down', 'critical', 'production', 'urgent', 'cannot login'];
const MEDIUM_CATEGORIES = ['hardware', 'access'];

function classify(category, description, currentPriority) {
  const cat  = String(category || '').toLowerCase();
  const desc = String(description || '').toLowerCase();
  const text = `${cat} ${desc}`;

  if (HIGH_KEYWORDS.some(k => text.includes(k))) return 'High';
  if (cat === 'network') return 'High';
  if (MEDIUM_CATEGORIES.includes(cat)) return 'Medium';
  return currentPriority || 'Low';
}

exports.handler = async (event) => {
  console.log('[classifier] event received:', JSON.stringify(event));
  const payload = typeof event.body === 'string'
    ? JSON.parse(event.body)
    : (event.body || event);

  const { ticketId, category, description, priority } = payload || {};
  if (!ticketId) {
    console.error('[classifier] missing ticketId');
    return { statusCode: 400, body: JSON.stringify({ error: 'ticketId required' }) };
  }

  const newPriority = classify(category, description, priority);
  console.log(`[classifier] ticket=${ticketId} oldPriority=${priority} newPriority=${newPriority}`);

  const timestamp = new Date().toISOString();
  const activityEntry = {
    action: 'Auto-classified',
    by: 'system',
    timestamp,
    details: `Priority set to ${newPriority} by classifier`,
  };

  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { ticketId },
    UpdateExpression:
      'SET priority = :p, updatedAt = :u, activityLog = list_append(if_not_exists(activityLog, :empty), :entry)',
    ExpressionAttributeValues: {
      ':p': newPriority,
      ':u': timestamp,
      ':entry': [activityEntry],
      ':empty': [],
    },
  }));
  console.log('[classifier] DynamoDB updated.');

  let title = '(unknown)';
  try {
    const fresh = await ddb.send(new GetCommand({ TableName: TABLE, Key: { ticketId } }));
    title = fresh.Item?.title || title;
  } catch (e) {
    console.warn('[classifier] could not refetch ticket title:', e.message);
  }

  if (TOPIC) {
    const subject = `[NimbusDesk] New Ticket #${ticketId.slice(0, 8)} — Priority ${newPriority}`;
    const body = [
      `A new ticket has been created and classified.`,
      ``,
      `Ticket ID : ${ticketId}`,
      `Title     : ${title}`,
      `Category  : ${category || '(none)'}`,
      `Priority  : ${newPriority}`,
      ``,
      `Description:`,
      String(description || '').slice(0, 500),
    ].join('\n');

    await sns.send(new PublishCommand({ TopicArn: TOPIC, Subject: subject.slice(0, 100), Message: body }));
    console.log('[classifier] SNS notification published.');
  } else {
    console.warn('[classifier] SNS_TOPIC_ARN not set; skipping publish.');
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, priority: newPriority }),
  };
};

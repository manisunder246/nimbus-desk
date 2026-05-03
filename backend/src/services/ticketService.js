import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { ddbDoc } from '../config/aws.js';
import env from '../config/env.js';

const TABLE = env.TICKETS_TABLE;

export async function createTicket({ user, title, category, priority, description }) {
  const ticketId = uuidv4();
  const now = new Date().toISOString();
  const item = {
    ticketId,
    title,
    category,
    priority: priority || 'Low',
    status: 'Open',
    description,
    createdBy: user.sub,
    createdByEmail: user.email,
    assignedTo: null,
    attachmentS3Key: null,
    createdAt: now,
    updatedAt: now,
    activityLog: [{ action: 'Created', by: user.email, timestamp: now }],
  };
  await ddbDoc.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

export async function getTicket(ticketId) {
  const out = await ddbDoc.send(new GetCommand({ TableName: TABLE, Key: { ticketId } }));
  return out.Item || null;
}

export async function listAllTickets({ status, priority, limit = 50 } = {}) {
  if (status) {
    const out = await ddbDoc.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'status-createdAt-index',
      KeyConditionExpression: '#s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': status },
      ScanIndexForward: false,
      Limit: limit,
    }));
    let items = out.Items || [];
    if (priority) items = items.filter((t) => t.priority === priority);
    return items;
  }
  const out = await ddbDoc.send(new ScanCommand({ TableName: TABLE, Limit: limit }));
  let items = out.Items || [];
  if (priority) items = items.filter((t) => t.priority === priority);
  items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return items;
}

export async function listTicketsAssignedTo(userSub, { limit = 100 } = {}) {
  // No GSI on assignedTo yet — scan + filter is fine at demo scale.
  const out = await ddbDoc.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'assignedTo = :u',
    ExpressionAttributeValues: { ':u': userSub },
    Limit: limit,
  }));
  const items = (out.Items || []).sort(
    (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
  );
  return items;
}

export async function listTicketsForUser(userSub, { limit = 50 } = {}) {
  const out = await ddbDoc.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'createdBy-createdAt-index',
    KeyConditionExpression: 'createdBy = :u',
    ExpressionAttributeValues: { ':u': userSub },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return out.Items || [];
}

export async function updateTicket(ticketId, { user, changes }) {
  const sets = [];
  const names = {};
  const values = { ':u': new Date().toISOString() };
  for (const [k, v] of Object.entries(changes)) {
    if (v === undefined) continue;
    sets.push(`#${k} = :${k}`);
    names[`#${k}`] = k;
    values[`:${k}`] = v;
  }
  sets.push('updatedAt = :u');
  const entry = {
    action: 'Updated',
    by: user.email,
    timestamp: values[':u'],
    changes,
  };
  values[':entry'] = [entry];
  values[':empty'] = [];

  const out = await ddbDoc.send(new UpdateCommand({
    TableName: TABLE,
    Key: { ticketId },
    UpdateExpression:
      `SET ${sets.join(', ')}, activityLog = list_append(if_not_exists(activityLog, :empty), :entry)`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));
  return out.Attributes;
}

export async function closeTicket(ticketId, user) {
  const now = new Date().toISOString();
  const out = await ddbDoc.send(new UpdateCommand({
    TableName: TABLE,
    Key: { ticketId },
    UpdateExpression:
      'SET #s = :closed, updatedAt = :u, activityLog = list_append(if_not_exists(activityLog, :empty), :entry)',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':closed': 'Closed',
      ':u': now,
      ':empty': [],
      ':entry': [{ action: 'Closed', by: user.email, timestamp: now }],
    },
    ReturnValues: 'ALL_NEW',
  }));
  return out.Attributes;
}

export async function setAttachmentKey(ticketId, s3Key, user) {
  const now = new Date().toISOString();
  const out = await ddbDoc.send(new UpdateCommand({
    TableName: TABLE,
    Key: { ticketId },
    UpdateExpression:
      'SET attachmentS3Key = :k, updatedAt = :u, activityLog = list_append(if_not_exists(activityLog, :empty), :entry)',
    ExpressionAttributeValues: {
      ':k': s3Key,
      ':u': now,
      ':empty': [],
      ':entry': [{ action: 'Attachment uploaded', by: user.email, timestamp: now, details: s3Key }],
    },
    ReturnValues: 'ALL_NEW',
  }));
  return out.Attributes;
}

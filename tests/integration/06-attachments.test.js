const axios = require('axios');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { login } = require('../helpers/auth');
const { client } = require('../helpers/apiClient');
const { s3 } = require('../helpers/awsClients');

describe('Attachment upload', () => {
  test('TC-08: Presigned URL upload places file in S3 under tickets/<id>/', async () => {
    const u = await login('user');
    const api = client(u.idToken);
    const t = await api.post('/tickets', {
      title: 'TC-08 attachment ticket',
      category: 'Software',
      priority: 'Low',
      description: 'TC-08 attachment fixture.',
    });
    expect(t.status).toBe(201);
    const ticketId = t.data.ticketId;

    const filename = 'tc08-evidence.txt';
    const body = Buffer.from('TC-08 attachment payload — ' + Date.now(), 'utf8');

    const presign = await api.post('/attachments/presigned-upload', {
      ticketId, filename, contentType: 'text/plain',
    });
    expect(presign.status).toBe(200);
    expect(presign.data.uploadUrl).toMatch(/^https:\/\//);

    const put = await axios.put(presign.data.uploadUrl, body, {
      headers: { 'Content-Type': 'text/plain' },
      validateStatus: () => true,
    });
    expect(put.status).toBe(200);

    const list = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.S3_ATTACHMENTS_BUCKET,
      Prefix: `tickets/${ticketId}/`,
    }));
    expect(list.Contents).toBeDefined();
    const found = list.Contents.find((o) => o.Key === presign.data.s3Key);
    expect(found).toBeDefined();
    expect(found.Size).toBe(body.length);
  });
});

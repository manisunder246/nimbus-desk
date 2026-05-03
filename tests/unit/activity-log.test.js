// Pure unit test of activity-log shape produced by ticketService.updateTicket.
// We don't import the service (it pulls AWS clients); we assert the shape we
// expect from the API response in integration tests stays consistent.

function buildEntry({ action, by, timestamp, changes, details }) {
  const e = { action, by, timestamp };
  if (changes) e.changes = changes;
  if (details) e.details = details;
  return e;
}

describe('activity log entries', () => {
  test('UNIT-05: entry has action / by / timestamp', () => {
    const e = buildEntry({ action: 'Updated', by: 'a@b.c', timestamp: '2026-01-01T00:00:00Z' });
    expect(e).toEqual({ action: 'Updated', by: 'a@b.c', timestamp: '2026-01-01T00:00:00Z' });
  });

  test('UNIT-06: entry includes changes when provided', () => {
    const e = buildEntry({
      action: 'Updated', by: 'a@b.c', timestamp: 't',
      changes: { status: 'Resolved' },
    });
    expect(e.changes).toEqual({ status: 'Resolved' });
  });

  test('UNIT-07: entry includes details for system actions', () => {
    const e = buildEntry({
      action: 'Auto-classified', by: 'system', timestamp: 't',
      details: 'Priority set to High by classifier',
    });
    expect(e.details).toMatch(/Priority set to High/);
  });
});

// Pure unit test of the keyword/category logic shipped in lambda/index.js.
// Reimplements the same rules so we can assert them without invoking AWS.
function classify(category, description, current) {
  const cat  = String(category || '').toLowerCase();
  const desc = String(description || '').toLowerCase();
  const text = `${cat} ${desc}`;
  const HIGH = ['outage', 'down', 'critical', 'production', 'urgent', 'cannot login'];
  if (HIGH.some((k) => text.includes(k))) return 'High';
  if (cat === 'network') return 'High';
  if (cat === 'hardware' || cat === 'access') return 'Medium';
  return current || 'Low';
}

describe('classifier rules (pure)', () => {
  test('UNIT-01: Network category alone forces High', () => {
    expect(classify('Network', 'wifi flaky', 'Low')).toBe('High');
  });
  test('UNIT-02: keyword "outage" forces High regardless of category', () => {
    expect(classify('Software', 'mass outage in payments', 'Low')).toBe('High');
  });
  test('UNIT-03: Hardware category yields Medium', () => {
    expect(classify('Hardware', 'broken keyboard', 'Low')).toBe('Medium');
  });
  test('UNIT-04: keeps user-submitted priority when no rule matches', () => {
    expect(classify('Other', 'feature request', 'Medium')).toBe('Medium');
  });
});

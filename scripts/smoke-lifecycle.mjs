/**
 * End-to-end smoke test of the marketplace lifecycle against a running dev server.
 *   node scripts/smoke-lifecycle.mjs            (API at http://localhost:3000)
 * Needs .admin-credentials (scripts/create-admin.ts). Creates throwaway users on
 * @resend.dev test addresses, so it is safe against the dev DB but never run it on prod.
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const API = (process.env.API_URL ?? 'http://localhost:3000') + '/api/v1';
const run = Date.now().toString(36);
const PASSWORD = 'Smoke-test-pass-1';

async function call(method, path, { token, body, form } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, {
    method,
    headers,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status} ${text}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function expectStatus(status, promise) {
  try {
    await promise;
  } catch (e) {
    assert.equal(e.status, status, e.message);
    return e.data;
  }
  assert.fail(`expected ${status}`);
}

const step = (msg) => console.log(`✓ ${msg}`);

async function register(role, name, phone) {
  const r = await call('POST', '/auth/register', {
    body: { email: `delivered+${name.split(" ")[0].toLowerCase()}-${run}@resend.dev`, password: PASSWORD, name, role, phone },
  });
  return { token: r.accessToken, user: r.user };
}

const creds = Object.fromEntries(
  readFileSync('.admin-credentials', 'utf8')
    .trim()
    .split('\n')
    .map((l) => l.split('=')),
);
const admin = await call('POST', '/auth/login', {
  body: { email: creds.ADMIN_EMAIL, password: creds.ADMIN_PASSWORD },
});
const A = admin.accessToken;
step('admin login');

const H = await register('HOMEOWNER', 'Hannah Smoke');
const T = await register('TRADESPERSON', 'Tom Smoke', `+447700900${String(Date.now() % 1000).padStart(3, '0')}`);
const T2 = await register('TRADESPERSON', 'Tara Smoke');
step('registered homeowner + 2 trades');

let bal = await call('GET', '/payments/balance', { token: T.token });
assert.equal(bal.balance, 20, 'welcome credits');
step('welcome credits = 20');

// Trade profile → verification
await call('PATCH', '/users/me/profile', { token: T.token, body: { postcode: 'SW1A 2AA', workRadiusMiles: 25, bio: 'Smoke test plumber' } });
await call('POST', '/users/me/services', { token: T.token, body: { serviceSlug: 'plumbing' } });
const idForm = new FormData();
idForm.append('document', new Blob([Buffer.from('%PDF-1.4\n%smoke\n')], { type: 'application/pdf' }), 'id.pdf');
await call('POST', '/users/me/id-document', { token: T.token, form: idForm });
await call('POST', '/users/me/verification/submit', { token: T.token });
step('trade submitted for verification');

await expectStatus(403, call('GET', '/admin/stats', { token: T.token }));
const queue = await call('GET', '/admin/verifications', { token: A });
assert.ok(queue.data.some((r) => r.userId === T.user.id), 'trade in queue');
const detail = await call('GET', `/admin/tradespeople/${T.user.id}`, { token: A });
assert.ok(detail.profile.idDocumentUrl?.startsWith('https://'), 'presigned ID url');
await expectStatus(400, call('POST', `/admin/tradespeople/${T.user.id}/reject`, { token: A, body: {} }));
await call('POST', `/admin/tradespeople/${T.user.id}/approve`, { token: A, body: {} });
step('admin approved trade (non-admin blocked, reject needs a note)');

// Homeowner posts a job
const jobForm = new FormData();
jobForm.append('title', 'Leaking kitchen tap');
jobForm.append('description', 'Kitchen mixer tap drips constantly, needs replacing.');
jobForm.append('serviceSlug', 'plumbing');
jobForm.append('postcode', 'SW1A 1AA');
jobForm.append('answers', JSON.stringify([{ question: 'When?', answer: 'Within a week' }]));
const job = await call('POST', '/jobs', { token: H.token, form: jobForm });
assert.ok(job.matchedCount >= 1, 'job matched the trade');
step(`job #${job.jobNumber} posted, matched ${job.matchedCount}`);

// Unverified trade cannot express interest
const leads = await call('GET', '/leads?tab=new', { token: T.token });
const lead = leads.data.find((l) => l.jobId === job.id || l.job?.id === job.id);
assert.ok(lead, 'lead visible to trade');
const fee = lead.creditCost ?? lead.job?.leadFeeCredits;
await call('POST', `/leads/${lead.id}/express-interest`, {
  token: T.token,
  body: { message: 'Hi, I can fit a new tap this week.', quoteAmountPence: 12000 },
});
bal = await call('GET', '/payments/balance', { token: T.token });
assert.equal(bal.reserved, fee, 'credits reserved on interest');
assert.equal(bal.balance, 20 - fee);
step(`interest expressed, ${fee} credits reserved`);

// Homeowner shortlists → fee charged, contacts exchanged
let hj = await call('GET', `/jobs/${job.id}`, { token: H.token });
let resp = hj.responses.find((r) => r.leadId === lead.id);
assert.equal(resp.tradesperson.phone, null, 'contacts hidden before shortlist');
await call('POST', `/jobs/${job.id}/leads/${lead.id}/shortlist`, { token: H.token });
hj = await call('GET', `/jobs/${job.id}`, { token: H.token });
resp = hj.responses.find((r) => r.leadId === lead.id);
assert.ok(resp.tradesperson.email, 'contacts shared after shortlist');
assert.ok(resp.conversationId, 'conversation opened');
bal = await call('GET', '/payments/balance', { token: T.token });
assert.equal(bal.reserved, 0);
assert.equal(bal.balance, 20 - fee, 'fee charged from reserve');
step('shortlisted: fee charged, contacts + chat unlocked');

await call('POST', `/conversations/${resp.conversationId}/messages`, { token: T.token, body: { body: 'When suits you?' } });
const msgs = await call('GET', `/conversations/${resp.conversationId}/messages`, { token: H.token });
assert.equal(msgs.data.at(-1)?.body ?? msgs.data[0]?.body, 'When suits you?');
const convs = await call('GET', '/conversations', { token: H.token });
assert.equal(convs.conversations.find((c) => c.id === resp.conversationId).otherParty.id, T.user.id);
step('messaging works');

await call('POST', `/jobs/${job.id}/leads/${lead.id}/hire`, { token: H.token });
await call('POST', `/jobs/${job.id}/complete`, { token: H.token });
await call('POST', '/reviews', {
  token: H.token,
  body: { jobId: job.id, tradespersonId: T.user.id, rating: 5, comment: 'Quick, tidy and fairly priced. Would hire again.' },
});
const pub = await call('GET', `/users/${detail.profile.username}`);
assert.equal(pub.reviewCount ?? pub.profile?.reviewCount, 1);
step('hired → completed → reviewed (public profile shows review)');

// Credit request → admin approves → credits back
await call('POST', `/leads/${lead.id}/credit-request`, {
  token: T.token,
  body: { reason: 'WRONG_WORK_TYPE', details: 'Smoke test credit request — please ignore.' },
});
const crs = await call('GET', '/admin/credit-requests', { token: A });
const cr = crs.data.find((c) => c.lead.id === lead.id);
await call('POST', `/admin/credit-requests/${cr.id}/approve`, { token: A, body: {} });
await expectStatus(409, call('POST', `/admin/credit-requests/${cr.id}/approve`, { token: A, body: {} }));
bal = await call('GET', '/payments/balance', { token: T.token });
assert.equal(bal.balance, 20, 'credit request refunded');
step('credit request approved once, credits returned');

// Q&A: trade answers by question number
const q = await call('POST', '/questions', {
  token: H.token,
  body: { title: 'How long does a tap replacement take?', body: 'Roughly how long does it take to replace a kitchen mixer tap?' },
});
await call('POST', `/questions/${q.questionNumber ?? q.id}/answers`, {
  token: T.token,
  body: { body: 'Usually about an hour if the isolation valves work.' },
});
step('Q&A answer posted');

// Account management
const cp = await call('POST', '/auth/change-password', {
  token: H.token,
  body: { currentPassword: PASSWORD, newPassword: PASSWORD + 'x' },
});
assert.ok(cp.accessToken);
await call('POST', '/users/me/delete', { token: T2.token, body: { password: PASSWORD } });
await expectStatus(401, call('POST', '/auth/login', { body: { email: T2.user.email, password: PASSWORD } }));
step('change password + delete account');

console.log('\nAll lifecycle checks passed.');

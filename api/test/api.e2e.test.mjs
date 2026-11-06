// Black-box API e2e tests (Node test runner). Requires a running API:
//   E2E_API_URL=http://localhost:3000/api npm run test:e2e
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const alice = { email: `e2e-alice-${randomUUID()}@example.com`, password: 'correct-horse-1' };
const bob = { email: `e2e-bob-${randomUUID()}@example.com`, password: 'correct-horse-2' };
let aliceToken = '';
let bobToken = '';
let projectId = '';

const call = async (method, path, { token, body } = {}) => {
    const res = await fetch(API + path, {
        method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
        json = JSON.parse(text);
    } catch {
        /* non-JSON */
    }
    return { status: res.status, body: json };
};

before(async () => {
    const res = await fetch(API.replace(/\/api$/, '/'));
    assert.equal(res.status, 200, `API not reachable at ${API}`);
});

after(async () => {
    for (const token of [aliceToken, bobToken]) if (token) await call('DELETE', '/users/me', { token, body: { confirm: 'DELETE' } });
});

test('rejects invalid registration payloads', async () => {
    const res = await call('POST', '/auth/register', { body: { email: 'not-an-email', password: 'x' } });
    assert.equal(res.status, 400);
});

test('registers, logs in, and never returns password hashes', async () => {
    const reg = await call('POST', '/auth/register', { body: alice });
    assert.equal(reg.status, 201);
    assert.ok(reg.body.access_token);
    assert.equal(reg.body.user.password, undefined);
    const login = await call('POST', '/auth/login', { body: alice });
    assert.equal(login.status, 200);
    aliceToken = login.body.access_token;
    bobToken = (await call('POST', '/auth/register', { body: bob })).body.access_token;
});

test('rejects bad credentials and unauthenticated access', async () => {
    assert.equal((await call('POST', '/auth/login', { body: { ...alice, password: 'wrong-password' } })).status, 401);
    assert.equal((await call('GET', '/projects')).status, 401);
});

test('creates and lists a project', async () => {
    const res = await call('POST', '/projects', { token: aliceToken, body: { title: 'E2E Biology', target_score: 80, tags: ['Biology'] } });
    assert.equal(res.status, 201);
    assert.equal(res.body.my_role, 'OWNER');
    projectId = res.body.id;
    const list = await call('GET', '/projects', { token: aliceToken });
    assert.ok(list.body.some((p) => p.id === projectId));
});

test('enforces tenant isolation between users', async () => {
    assert.equal((await call('GET', `/projects/${projectId}`, { token: bobToken })).status, 404);
    assert.equal((await call('PATCH', `/projects/${projectId}`, { token: bobToken, body: { title: 'hacked' } })).status, 404);
    assert.equal((await call('GET', `/projects/${projectId}/documents`, { token: bobToken })).status, 404);
    assert.equal((await call('GET', `/projects/${projectId}/topics`, { token: bobToken })).status, 404);
    const search = await call('GET', '/search?q=biology&semantic=false', { token: bobToken });
    assert.equal(search.status, 200);
    assert.equal(search.body.projects.length, 0);
});

test('invited members get role-scoped access', async () => {
    const bobEmail = bob.email;
    const inv = await call('POST', `/projects/${projectId}/invitations`, { token: aliceToken, body: { email: bobEmail, role: 'VIEWER' } });
    assert.equal(inv.status, 201);
    const mine = await call('GET', '/invitations', { token: bobToken });
    const invitation = mine.body.find((i) => i.project_id === projectId);
    assert.ok(invitation);
    assert.equal((await call('POST', `/invitations/${invitation.id}/accept`, { token: bobToken })).status, 200);
    assert.equal((await call('GET', `/projects/${projectId}`, { token: bobToken })).status, 200);
    // Viewers cannot edit
    assert.equal((await call('PATCH', `/projects/${projectId}`, { token: bobToken, body: { title: 'nope' } })).status, 403);
    // Owner revokes access
    const me = await call('GET', '/auth/me', { token: bobToken });
    assert.equal((await call('DELETE', `/projects/${projectId}/members/${me.body.id}`, { token: aliceToken })).status, 200);
    assert.equal((await call('GET', `/projects/${projectId}`, { token: bobToken })).status, 404);
});

test('logout revokes the session token', async () => {
    const login = await call('POST', '/auth/login', { body: alice });
    const token = login.body.access_token;
    assert.equal((await call('POST', '/auth/logout', { token })).status, 200);
    assert.equal((await call('GET', '/auth/me', { token })).status, 401);
});

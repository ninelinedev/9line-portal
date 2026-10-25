const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { NextRequest } = require('next/server');

// Replace only the provider boundary: these tests never initialize credentials,
// request tokens, send model prompts, or connect to an MCP server.
class LocalMCPClient {
  constructor(config) { this.externalUserId = config.externalUserId; }
  async initialize() {}
  async close() {}
  async processMessage(message, history) {
    return { text: JSON.stringify({ user: this.externalUserId, message, history }), finishReason: 'stop' };
  }
  async getAvailableTools() { return ['synthetic_local_tool']; }
}

function loadRoute(relativePath) {
  const filename = path.resolve(relativePath);
  const loaded = new Module(filename, module);
  loaded.paths = module.paths;
  loaded.require = (specifier) => specifier === '@/lib/mcp/ai-client'
    ? { MCPClient: LocalMCPClient }
    : require(specifier);
  loaded._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText, filename);
  return loaded.exports;
}

const chat = loadRoute('app/api/mcp/chat/route.ts');
const tools = loadRoute('app/api/mcp/tools/route.ts');
const token = loadRoute('app/api/pipedream/token/route.ts');
const accounts = loadRoute('app/api/pipedream/accounts/[accountId]/route.ts');

function chatRequest(body) {
  return new NextRequest('http://localhost/api/mcp/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

test('chat preserves a valid text conversation and provider response shape', async () => {
  const history = [{ role: 'assistant', content: 'Previous local answer' }];
  const response = await chat.POST(chatRequest({ message: 'Local prompt', externalUserId: 'synthetic-user', conversationHistory: history }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    response: JSON.stringify({ user: 'synthetic-user', message: 'Local prompt', history }),
    finishReason: 'stop', toolCalls: [], toolResults: [],
  });
});

for (const [name, body] of [
  ['missing fields', {}],
  ['null body', null],
  ['nonstring message', { message: {}, externalUserId: 'synthetic-user' }],
  ['nonstring user ID', { message: 'Local prompt', externalUserId: {} }],
  ['malformed history', { message: 'Local prompt', externalUserId: 'synthetic-user', conversationHistory: [{ role: 'invalid', content: 'bad' }] }],
  ['null history', { message: 'Local prompt', externalUserId: 'synthetic-user', conversationHistory: null }],
]) {
  test('chat rejects ' + name + ' before provider setup', async () => {
    assert.equal((await chat.POST(chatRequest(body))).status, 400);
  });
}

test('chat rejects malformed JSON as a client error', async () => {
  const request = new NextRequest('http://localhost/api/mcp/chat', { method: 'POST', body: '{' });
  assert.equal((await chat.POST(request)).status, 400);
});

test('tools rejects a missing external user ID', async () => {
  assert.equal((await tools.GET(new NextRequest('http://localhost/api/mcp/tools'))).status, 400);
});

test('tools preserves its configured response contract with a local provider fixture', async () => {
  const response = await tools.GET(new NextRequest('http://localhost/api/mcp/tools?externalUserId=synthetic-user'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { tools: ['synthetic_local_tool'], count: 1 });
});

test('disabled Pipedream token integration stays unavailable', async () => {
  const response = await token.POST(new NextRequest('http://localhost/api/pipedream/token', { method: 'POST' }));
  assert.equal(response.status, 503);
});

test('disabled Pipedream account integration stays unavailable with async route params', async () => {
  const response = await accounts.GET(new NextRequest('http://localhost/api/pipedream/accounts/local'), {
    params: Promise.resolve({ accountId: 'local' }),
  });
  assert.equal(response.status, 503);
});

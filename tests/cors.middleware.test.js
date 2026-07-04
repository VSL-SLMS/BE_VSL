const test = require('node:test');
const assert = require('node:assert/strict');
const { __testing } = require('../src/app');

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    sendStatus(code) {
      this.statusCode = code;
      return this;
    }
  };
}

test('UC-SYS-01: CORS preflight allows the production frontend origin', () => {
  const req = {
    method: 'OPTIONS',
    headers: { origin: 'https://vsl.lat' }
  };
  const res = createResponse();

  __testing.corsMiddleware(req, res, () => {
    throw new Error('OPTIONS preflight should not continue.');
  });

  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['access-control-allow-origin'], 'https://vsl.lat');
  assert.match(res.headers['access-control-allow-methods'], /OPTIONS/);
  assert.match(res.headers['access-control-allow-headers'], /Authorization/);
});

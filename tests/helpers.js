const assert = require('node:assert/strict');

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    sendStatus(code) {
      this.statusCode = code;
      this.body = code;
      return this;
    }
  };
}

async function expectRejectsWithMessage(fn, message) {
  await assert.rejects(fn, (error) => {
    assert.equal(error.message, message);
    return true;
  });
}

module.exports = {
  createMockResponse,
  expectRejectsWithMessage
};

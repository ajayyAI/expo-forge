// Jest stub for the native Sentry SDK. The boilerplate ships with no DSN, so
// production code no-ops anyway; this keeps the native module out of jsdom and
// makes wrap() a pass-through.
module.exports = {
  init: jest.fn(),
  wrap: jest.fn((component) => component),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
};

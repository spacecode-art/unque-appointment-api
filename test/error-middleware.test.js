import { test } from "node:test";
import assert from "node:assert/strict";
import { HttpError } from "../models/error.js";
import { errorMiddleware, notFound } from "../middleware/error.js";

// Just enough of an Express response to see what the handler did with it
const fakeRes = () => ({
  headersSent: false,
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("an HttpError keeps its status and message", () => {
  const res = fakeRes();
  errorMiddleware(new HttpError("Slot not found", 404), {}, res, () => {});
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { message: "Slot not found" });
});

test("an HttpError without a status is a 500", () => {
  const res = fakeRes();
  errorMiddleware(new HttpError("Broken"), {}, res, () => {});
  assert.equal(res.statusCode, 500);
});

test("an unexpected error is logged but never shown to the client", (t) => {
  const log = t.mock.method(console, "error", () => {});
  const res = fakeRes();
  errorMiddleware(new Error("password for unque_admin is hunter2"), {}, res, () => {});
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, "Something went wrong on our side");
  assert.equal(log.mock.callCount(), 1);
});

test("a malformed JSON body is a 400 the client can read", () => {
  const error = Object.assign(new SyntaxError("Unexpected token } in JSON"), {
    expose: true,
    statusCode: 400,
  });
  const res = fakeRes();
  errorMiddleware(error, {}, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, error.message);
});

test("hands the error back to Express if the response already started", () => {
  const res = fakeRes();
  res.headersSent = true;
  const error = new Error("too late");
  let passedOn;
  errorMiddleware(error, {}, res, (e) => {
    passedOn = e;
  });
  assert.equal(passedOn, error);
  assert.equal(res.statusCode, null);
});

test("an unknown route becomes a 404 that names the path", () => {
  let raised;
  notFound({ originalUrl: "/nope" }, {}, (e) => {
    raised = e;
  });
  assert.ok(raised instanceof HttpError);
  assert.equal(raised.statusCode, 404);
  assert.match(raised.message, /\/nope/);
});
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIsoDate } from "../utils/dates.js";

test("accepts a UTC date", () => {
  const date = parseIsoDate("2027-01-10T10:00:00Z");
  assert.equal(date.toISOString(), "2027-01-10T10:00:00.000Z");
});

test("turns an offset into the same moment in UTC", () => {
  const date = parseIsoDate("2027-01-10T10:00:00+03:00");
  assert.equal(date.toISOString(), "2027-01-10T07:00:00.000Z");
});

test("accepts a date with no seconds", () => {
  const date = parseIsoDate("2027-01-10T10:00Z");
  assert.equal(date.toISOString(), "2027-01-10T10:00:00.000Z");
});

test("refuses a date without a timezone", () => {
  assert.equal(parseIsoDate("2027-01-10T10:00:00"), null);
  assert.equal(parseIsoDate("2027-01-10"), null);
});

test("refuses text that is not a date", () => {
  for (const value of ["garbage", "", "2027-13-45T10:00:00Z"]) {
    assert.equal(parseIsoDate(value), null, value);
  }
});

test("refuses values that are not strings", () => {
  for (const value of [null, undefined, 12345, {}, ["2027-01-10T10:00:00Z"]]) {
    assert.equal(parseIsoDate(value), null, String(value));
  }
});
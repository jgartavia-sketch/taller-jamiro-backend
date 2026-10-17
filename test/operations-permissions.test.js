import assert from "node:assert/strict";
import test from "node:test";
import { hasOperationsAccess } from "../src/lib/staff-permissions.js";

test("reception and mechanics can enter the same operational work", () => {
  for (const role of ["RECEPTION", "MECHANIC"]) {
    assert.equal(hasOperationsAccess({ role, email: "staff@example.test" }, "admin@example.test"), true);
  }
});
test("missing staff and unknown roles cannot gain operational access", () => {
  for (const staff of [null, undefined, {}, { role: "CUSTOMER" }, { role: "UNKNOWN", email: "staff@example.test" }]) {
    assert.equal(hasOperationsAccess(staff, "admin@example.test"), false);
  }
});
test("the configured administrator retains operational access", () => {
  assert.equal(hasOperationsAccess({ role: "ADMIN", email: "admin@example.test" }, "admin@example.test"), true);
  assert.equal(hasOperationsAccess({ role: "ADMIN", email: "other@example.test" }, "admin@example.test"), false);
});

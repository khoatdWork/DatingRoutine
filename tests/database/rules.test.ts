import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { beforeAll, beforeEach, afterAll, describe, it } from "vitest";
let environment: RulesTestEnvironment;
beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-pwa-template",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
beforeEach(async () => environment.clearFirestore());
afterAll(async () => environment?.cleanup());
function data(version = 1) {
  return {
    version,
    snapshot: { schemaVersion: 1, profile: { displayName: "" }, notes: [] },
    updatedAt: serverTimestamp(),
  };
}
describe("workspace owner rules", () => {
  it("allows owner create/read/versioned updates", async () => {
    const ref = doc(
      environment.authenticatedContext("alice").firestore(),
      "users/alice/workspaces/default",
    );
    await assertSucceeds(setDoc(ref, data()));
    await assertSucceeds(getDoc(ref));
    await assertFails(setDoc(ref, data()));
    await assertSucceeds(setDoc(ref, data(2)));
  });
  it("denies guest and other users", async () => {
    for (const context of [
      environment.unauthenticatedContext(),
      environment.authenticatedContext("bob"),
    ]) {
      const ref = doc(context.firestore(), "users/alice/workspaces/default");
      await assertFails(getDoc(ref));
      await assertFails(setDoc(ref, data()));
    }
  });
  it("denies unknown fields, malformed snapshot, bad versions and arbitrary paths", async () => {
    const db = environment.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/workspaces/default");
    await assertFails(setDoc(ref, { ...data(), admin: true }));
    await assertFails(setDoc(ref, { ...data(), snapshot: { schemaVersion: 2 } }));
    await assertFails(setDoc(ref, data(10)));
    await assertFails(setDoc(doc(db, "anything/private"), data()));
  });
});

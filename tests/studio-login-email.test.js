import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const portalSource = await readFile(new URL("../src/gallery-portal.js", import.meta.url), "utf8");
const wranglerSource = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");

test("studio login code uses the destination-restricted public inbox", () => {
  assert.match(portalSource, /const ADMIN_EMAIL = "lynnlexus421@gmail\.com";/);
  assert.match(portalSource, /const PUBLIC_EMAIL = "hello@lxephotography\.com";/);

  const sendStudioCode = portalSource.match(/async function sendStudioCode\(env, code\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.ok(sendStudioCode, "sendStudioCode function must exist");
  assert.match(sendStudioCode, /to: PUBLIC_EMAIL,/);
  assert.doesNotMatch(sendStudioCode, /to: ADMIN_EMAIL,/);

  assert.match(wranglerSource, /"destination_address":\s*"hello@lxephotography\.com"/);
});

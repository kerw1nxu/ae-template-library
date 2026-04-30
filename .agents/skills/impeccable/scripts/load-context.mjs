#!/usr/bin/env node
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const GLOBAL_LOADER =
  "C:\\Users\\kerwi\\.codex\\skills\\impeccable\\scripts\\load-context.mjs";

async function main() {
  if (!existsSync(GLOBAL_LOADER)) {
    console.error(
      [
        "Impeccable global loader was not found.",
        `Expected: ${GLOBAL_LOADER}`,
        "Restore or reinstall the impeccable skill, then run this command again.",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const { loadContext } = await import(pathToFileURL(GLOBAL_LOADER).href);
  const result = loadContext(process.cwd());
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

/**
 * Run a collector locally.
 * Usage: DATABASE_URL=... node --import tsx run.mjs <collector>
 */
const collector = process.argv[2];
if (!collector) {
  console.error("Usage: node --import tsx run.mjs <markets|prices|matcher|arbs|accuracy>");
  process.exit(1);
}

const mod = await import(`./packages/functions/src/collectors/${collector}.ts`);
const result = await mod.handler();
console.log("Result:", JSON.stringify(result, null, 2));
process.exit(0);

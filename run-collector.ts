/**
 * Run a collector locally. Usage: DATABASE_URL=... npx tsx run-collector.ts <collector>
 * Collectors: markets, prices, matcher, arbs, accuracy
 */
const collector = process.argv[2];
if (!collector) {
  console.error("Usage: npx tsx run-collector.ts <markets|prices|matcher|arbs|accuracy>");
  process.exit(1);
}

const path = `./packages/functions/src/collectors/${collector}.js`;

import(path)
  .then((mod) => mod.handler())
  .then((result) => {
    console.log("Result:", JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });

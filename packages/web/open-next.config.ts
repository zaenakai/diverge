import type { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

const config: OpenNextConfig = {
  default: {},
  buildCommand: "echo 'Skipping next build - already pre-built'",
};

export default config;

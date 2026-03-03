/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "prediction-market",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: { region: "us-east-1" },
      },
    };
  },

  async run() {
    // ── Secrets ──────────────────────────────────────────
    const stripeSecretKey = new sst.Secret("StripeSecretKey");
    const stripeWebhookSecret = new sst.Secret("StripeWebhookSecret");
    const databaseUrl = new sst.Secret("DatabaseUrl");

    // ── Database ─────────────────────────────────────────
    // Using external PostgreSQL (Neon or RDS)
    // Connection string stored in DatabaseUrl secret

    // ── Shared environment for all functions ─────────────
    const sharedEnv = {
      DATABASE_URL: databaseUrl.value,
    };

    // ── Data Collection Crons ────────────────────────────

    // Collect market data every 5 minutes
    const marketCollector = new sst.aws.Cron("MarketCollector", {
      schedule: "rate(5 minutes)",
      function: {
        handler: "packages/functions/src/collectors/markets.handler",
        timeout: "120 seconds",
        memory: "512 MB",
        environment: sharedEnv,
      },
    });

    // Collect price snapshots every minute
    const priceCollector = new sst.aws.Cron("PriceCollector", {
      schedule: "rate(1 minute)",
      function: {
        handler: "packages/functions/src/collectors/prices.handler",
        timeout: "60 seconds",
        memory: "256 MB",
        environment: sharedEnv,
      },
    });

    // Run market matching every 30 minutes
    const marketMatcher = new sst.aws.Cron("MarketMatcher", {
      schedule: "rate(30 minutes)",
      function: {
        handler: "packages/functions/src/collectors/matcher.handler",
        timeout: "120 seconds",
        memory: "512 MB",
        environment: sharedEnv,
      },
    });

    // Detect arb opportunities every 2 minutes
    const arbDetector = new sst.aws.Cron("ArbDetector", {
      schedule: "rate(2 minutes)",
      function: {
        handler: "packages/functions/src/collectors/arbs.handler",
        timeout: "60 seconds",
        memory: "256 MB",
        environment: sharedEnv,
      },
    });

    // Calculate accuracy scores daily at midnight UTC
    const accuracyCalculator = new sst.aws.Cron("AccuracyCalculator", {
      schedule: "cron(0 0 * * ? *)",
      function: {
        handler: "packages/functions/src/collectors/accuracy.handler",
        timeout: "300 seconds",
        memory: "512 MB",
        environment: sharedEnv,
      },
    });

    // ── API ──────────────────────────────────────────────
    const api = new sst.aws.Function("Api", {
      handler: "packages/functions/src/api/index.handler",
      timeout: "30 seconds",
      memory: "256 MB",
      url: true,
      environment: {
        ...sharedEnv,
        STRIPE_SECRET_KEY: stripeSecretKey.value,
        STRIPE_WEBHOOK_SECRET: stripeWebhookSecret.value,
      },
    });

    // ── Next.js Frontend ─────────────────────────────────
    const site = new sst.aws.Nextjs("Web", {
      path: "packages/web",
      environment: {
        NEXT_PUBLIC_API_URL: api.url,
      },
    });

    return {
      api: api.url,
      site: site.url,
    };
  },
});

/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "diverge",
      // domain: "diverge.market", // uncomment after Route 53 hosted zone is set up
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
    const nextAuthSecret = new sst.Secret("NextAuthSecret");
    const googleClientId = new sst.Secret("GoogleClientId");
    const googleClientSecret = new sst.Secret("GoogleClientSecret");
    const githubClientId = new sst.Secret("GithubClientId");
    const githubClientSecret = new sst.Secret("GithubClientSecret");

    // ── VPC ──────────────────────────────────────────────
    const vpc = new sst.aws.Vpc("Vpc", { bastion: true });

    // ── Database (Aurora Serverless v2 PostgreSQL) ───────
    const database = new sst.aws.Postgres("Database", {
      vpc,
      scaling: {
        min: "0.5 ACU",
        max: "4 ACU",
      },
    });

    // ── Shared config for all functions ──────────────────
    const sharedConfig = {
      vpc,
      link: [database],
    };

    // ── Data Collection Crons ────────────────────────────

    // Collect market data every 5 minutes
    new sst.aws.Cron("MarketCollector", {
      schedule: "rate(5 minutes)",
      function: {
        handler: "packages/functions/src/collectors/markets.handler",
        timeout: "120 seconds",
        memory: "512 MB",
        ...sharedConfig,
      },
    });

    // Collect price snapshots every minute
    new sst.aws.Cron("PriceCollector", {
      schedule: "rate(1 minute)",
      function: {
        handler: "packages/functions/src/collectors/prices.handler",
        timeout: "60 seconds",
        memory: "256 MB",
        ...sharedConfig,
      },
    });

    // Run market matching every 30 minutes
    new sst.aws.Cron("MarketMatcher", {
      schedule: "rate(30 minutes)",
      function: {
        handler: "packages/functions/src/collectors/matcher.handler",
        timeout: "120 seconds",
        memory: "512 MB",
        ...sharedConfig,
      },
    });

    // Detect arb opportunities every 2 minutes
    new sst.aws.Cron("ArbDetector", {
      schedule: "rate(2 minutes)",
      function: {
        handler: "packages/functions/src/collectors/arbs.handler",
        timeout: "60 seconds",
        memory: "256 MB",
        ...sharedConfig,
      },
    });

    // Calculate accuracy scores daily at midnight UTC
    new sst.aws.Cron("AccuracyCalculator", {
      schedule: "cron(0 0 * * ? *)",
      function: {
        handler: "packages/functions/src/collectors/accuracy.handler",
        timeout: "300 seconds",
        memory: "512 MB",
        ...sharedConfig,
      },
    });

    // ── API ──────────────────────────────────────────────
    const api = new sst.aws.Function("Api", {
      handler: "packages/functions/src/api/index.handler",
      timeout: "30 seconds",
      memory: "256 MB",
      url: true,
      ...sharedConfig,
      link: [database, stripeSecretKey, stripeWebhookSecret],
    });

    // ── Next.js Frontend ─────────────────────────────────
    const site = new sst.aws.Nextjs("Web", {
      path: "packages/web",
      link: [
        database,
        nextAuthSecret,
        googleClientId,
        googleClientSecret,
        githubClientId,
        githubClientSecret,
      ],
      environment: {
        NEXT_PUBLIC_API_URL: api.url,
        NEXTAUTH_URL: "https://diverge.market",
      },
    });

    return {
      api: api.url,
      site: site.url,
      database: database.clusterArn,
    };
  },
});

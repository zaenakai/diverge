/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "diverge",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: { region: "us-east-1" },
      },
    };
  },

  async run() {
    // ── Secrets ──────────────────────────────────────────
    const databaseUrl = new sst.Secret("DatabaseUrl");
    const stripeSecretKey = new sst.Secret("StripeSecretKey");
    const stripeWebhookSecret = new sst.Secret("StripeWebhookSecret");
    const nextAuthSecret = new sst.Secret("NextAuthSecret");
    const googleClientId = new sst.Secret("GoogleClientId");
    const googleClientSecret = new sst.Secret("GoogleClientSecret");
    const githubClientId = new sst.Secret("GithubClientId");
    const githubClientSecret = new sst.Secret("GithubClientSecret");

    // ── Data Collection Crons ────────────────────────────

    new sst.aws.Cron("MarketCollector", {
      schedule: "rate(5 minutes)",
      function: {
        handler: "packages/functions/src/collectors/markets.handler",
        timeout: "120 seconds",
        memory: "512 MB",
        link: [databaseUrl],
      },
    });

    new sst.aws.Cron("PriceCollector", {
      schedule: "rate(1 minute)",
      function: {
        handler: "packages/functions/src/collectors/prices.handler",
        timeout: "60 seconds",
        memory: "256 MB",
        link: [databaseUrl],
      },
    });

    new sst.aws.Cron("MarketMatcher", {
      schedule: "rate(30 minutes)",
      function: {
        handler: "packages/functions/src/collectors/matcher.handler",
        timeout: "120 seconds",
        memory: "512 MB",
        link: [databaseUrl],
      },
    });

    new sst.aws.Cron("ArbDetector", {
      schedule: "rate(2 minutes)",
      function: {
        handler: "packages/functions/src/collectors/arbs.handler",
        timeout: "60 seconds",
        memory: "256 MB",
        link: [databaseUrl],
      },
    });

    new sst.aws.Cron("AccuracyCalculator", {
      schedule: "cron(0 0 * * ? *)",
      function: {
        handler: "packages/functions/src/collectors/accuracy.handler",
        timeout: "300 seconds",
        memory: "512 MB",
        link: [databaseUrl],
      },
    });

    // ── API ──────────────────────────────────────────────
    const api = new sst.aws.Function("Api", {
      handler: "packages/functions/src/api/index.handler",
      timeout: "30 seconds",
      memory: "256 MB",
      url: true,
      link: [databaseUrl, stripeSecretKey, stripeWebhookSecret],
    });

    // ── Next.js Frontend ─────────────────────────────────
    const site = new sst.aws.Nextjs("Web", {
      path: "packages/web",
      link: [
        databaseUrl,
        nextAuthSecret,
        googleClientId,
        googleClientSecret,
        githubClientId,
        githubClientSecret,
        stripeSecretKey,
        stripeWebhookSecret,
      ],
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

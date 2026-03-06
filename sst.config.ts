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
    const twitterClientId = new sst.Secret("TwitterClientId");
    const twitterClientSecret = new sst.Secret("TwitterClientSecret");

    // ── Data Collection Crons ────────────────────────────

    // Shared function config — tell esbuild to bundle deps from root
    const nodejsConfig = {
      nodejs: { install: ["drizzle-orm", "pg"] },
      environment: {
        DATABASE_URL: databaseUrl.value,
      },
    };

    new sst.aws.Cron("MarketCollector", {
      schedule: "rate(5 minutes)",
      function: {
        handler: "packages/functions/src/collectors/markets.handler",
        timeout: "120 seconds",
        memory: "512 MB",
        link: [databaseUrl],
        ...nodejsConfig,
      },
    });

    new sst.aws.Cron("PriceCollector", {
      schedule: "rate(1 minute)",
      function: {
        handler: "packages/functions/src/collectors/prices.handler",
        timeout: "60 seconds",
        memory: "256 MB",
        link: [databaseUrl],
        ...nodejsConfig,
      },
    });

    new sst.aws.Cron("MarketMatcher", {
      schedule: "rate(30 minutes)",
      function: {
        handler: "packages/functions/src/collectors/matcher.handler",
        timeout: "120 seconds",
        memory: "512 MB",
        link: [databaseUrl],
        ...nodejsConfig,
      },
    });

    new sst.aws.Cron("ArbDetector", {
      schedule: "rate(2 minutes)",
      function: {
        handler: "packages/functions/src/collectors/arbs.handler",
        timeout: "60 seconds",
        memory: "256 MB",
        link: [databaseUrl],
        ...nodejsConfig,
      },
    });

    new sst.aws.Cron("WhaleCollector", {
      schedule: "rate(2 minutes)",
      function: {
        handler: "packages/functions/src/collectors/whales.handler",
        timeout: "60 seconds",
        memory: "256 MB",
        link: [databaseUrl],
        ...nodejsConfig,
      },
    });

    new sst.aws.Cron("AccuracyCalculator", {
      schedule: "cron(0 0 * * ? *)",
      function: {
        handler: "packages/functions/src/collectors/accuracy.handler",
        timeout: "300 seconds",
        memory: "512 MB",
        link: [databaseUrl],
        ...nodejsConfig,
      },
    });

    // ── API ──────────────────────────────────────────────
    const api = new sst.aws.Function("Api", {
      handler: "packages/functions/src/api/index.handler",
      timeout: "30 seconds",
      memory: "256 MB",
      url: true,
      link: [databaseUrl, stripeSecretKey, stripeWebhookSecret],
      ...nodejsConfig,
    });

    // ── Next.js Frontend ─────────────────────────────────
    const site = new sst.aws.Nextjs("Web", {
      path: "packages/web",
      domain: {
        name: "diverge.market",
        redirects: ["www.diverge.market"]
      },
      link: [
        databaseUrl,
        nextAuthSecret,
        googleClientId,
        googleClientSecret,
        twitterClientId,
        twitterClientSecret,
        stripeSecretKey,
        stripeWebhookSecret,
      ],
      environment: {
        DATABASE_URL: databaseUrl.value,
        NEXT_PUBLIC_API_URL: api.url,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_51T7hzB2UO0ITF91UrnQXawRoKuwWYXmLbjxQX97gc2bT8dLpVKt2H6D2KiM50CMqcdLLpxj2EkxZSZYrhLLqV8Eh00bhhyD80J",
        STRIPE_PRO_PRICE_ID: "price_1T7iE42UO0ITF91UTDDKftgH",
        STRIPE_ENTERPRISE_PRICE_ID: "price_1T7iEm2UO0ITF91UzLUuByuw",
        STRIPE_SECRET_KEY: stripeSecretKey.value,
        STRIPE_WEBHOOK_SECRET: stripeWebhookSecret.value,
        NEXTAUTH_SECRET: nextAuthSecret.value,
        AUTH_SECRET: nextAuthSecret.value,
        NEXTAUTH_URL: "https://diverge.market",
        AUTH_URL: "https://diverge.market",
        GOOGLE_CLIENT_ID: googleClientId.value,
        GOOGLE_CLIENT_SECRET: googleClientSecret.value,
        TWITTER_CLIENT_ID: twitterClientId.value,
        TWITTER_CLIENT_SECRET: twitterClientSecret.value,
      },
    });

    return {
      api: api.url,
      site: site.url,
    };
  },
});

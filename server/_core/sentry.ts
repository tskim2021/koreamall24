import * as Sentry from "@sentry/node";

export function initSentry() {
  // Only initialize Sentry if DSN is provided
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      // Performance Monitoring
      tracesSampleRate: 0.1, // Capture 10% of transactions
      // Environment
      environment: process.env.NODE_ENV || "development",
    });
    
    console.log("[Sentry] Initialized for backend");
  }
}

export { Sentry };

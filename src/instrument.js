import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

if (!process.env.SENTRY_DSN) {
  console.warn("SENTRY_DSN not set, skipping Sentry initialization");
} else {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],

    // Send structured logs to Sentry
    enableLogs: true,
    // Tracing
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Set sampling rate for profiling - this is evaluated only once per SDK.init call
    profileSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Trace lifecycle automatically enables profiling during active traces
    profileLifecycle: "trace",
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: false,
    environment: process.env.NODE_ENV,
  });
}

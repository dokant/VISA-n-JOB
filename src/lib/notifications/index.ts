/**
 * Notification provider selection (PRD R-214, STANDARD 4.2 `notifications/`).
 *
 * Channels and adapters:
 * - EMAIL → SMTP adapter (smtp.ts) when SMTP_HOST / SMTP_FROM (and both or neither of SMTP_USER /
 *   SMTP_PASS) are set; otherwise the console adapter. Without the variables the SMTP adapter is not
 *   even created, so nothing is sent or connected.
 * - SMS, STAFF → console adapter (real SMS / messenger adapters are Phase 3).
 * When every channel uses the console adapter the console provider itself is returned.
 *
 * The choice is logged once per process as one JSON line (`notification.provider`, no secrets:
 * the SMTP host, user and password are never printed), so a wrong setup is visible at start-up
 * (PLAN P2d 위험 "실제 SMTP로 잘못 발송").
 */
import { createConsoleProvider } from "./console";
import {
  createSmtpProvider,
  type LogLine,
  logByLevel,
  type MailTransport,
  smtpConfigFromEnv,
} from "./smtp";
import type { NotificationChannel, NotificationProvider } from "./types";

export type {
  Delivery,
  NotificationChannel,
  NotificationMessage,
  NotificationProvider,
  SendResult,
} from "./types";

export type ChannelProviders = Readonly<Record<NotificationChannel, NotificationProvider>>;

/** One provider that hands each message to the adapter of its channel. */
export function createChannelRouter(routes: ChannelProviders): NotificationProvider {
  const distinct = new Set(Object.values(routes));
  if (distinct.size === 1) return [...distinct][0];
  return {
    name: "channel-router",
    send: (message) => routes[message.channel].send(message),
  };
}

export type ProviderSelection = {
  provider: NotificationProvider;
  routes: Record<NotificationChannel, string>;
  smtp: "enabled" | "disabled";
  reason: string | null;
  /**
   * Channels with a real adapter (someone can receive the message). Empty = console only: the
   * 14-day status-check transition never applies (DECISIONS Q-27, `realChannelWarning`).
   */
  realChannels: NotificationChannel[];
};

/**
 * Builds the provider from the environment. `env`, `log` and `transport` are parameters so tests can
 * check the choice without real variables or a network.
 */
export function selectNotificationProvider(
  options: {
    env?: Readonly<Record<string, string | undefined>>;
    log?: LogLine;
    transport?: MailTransport;
  } = {},
): ProviderSelection {
  const env = options.env ?? process.env;
  // Default sink by level (QA P2e D-1): the SMTP adapter's failed-send lines stay console.warn.
  const log: LogLine = options.log ?? logByLevel;
  const consoleProvider = createConsoleProvider(undefined, env.NODE_ENV);
  const smtp = smtpConfigFromEnv(env);
  const email = smtp.enabled
    ? createSmtpProvider(smtp.config, { transport: options.transport, log })
    : consoleProvider;
  const routes: ChannelProviders = { EMAIL: email, SMS: consoleProvider, STAFF: consoleProvider };
  const selection: ProviderSelection = {
    provider: createChannelRouter(routes),
    routes: { EMAIL: email.name, SMS: consoleProvider.name, STAFF: consoleProvider.name },
    smtp: smtp.enabled ? "enabled" : "disabled",
    reason: smtp.enabled ? null : smtp.reason,
    realChannels: smtp.enabled ? ["EMAIL"] : [],
  };
  log(
    JSON.stringify({
      level: "info",
      event: "notification.provider",
      routes: selection.routes,
      smtp: selection.smtp,
      realChannels: selection.realChannels,
      ...(selection.reason ? { reason: selection.reason } : {}),
    }),
  );
  return selection;
}

/**
 * The start-up warning of the worker (DECISIONS Q-27) when no channel is real: status checks are
 * still sent (logged), but no seeker is made INACTIVE or demoted for not answering them. `null` when
 * at least one real channel exists.
 */
export function realChannelWarning(selection: Pick<ProviderSelection, "realChannels">) {
  if (selection.realChannels.length > 0) return null;
  return {
    level: "warn",
    event: "status_check.transition_disabled",
    reason: "NO_REAL_CHANNEL",
    message:
      "No real notification channel (console only): status checks are logged, not delivered; the 14-day no-reply INACTIVE / S→A transition is disabled.",
  } as const;
}

let selected: ProviderSelection | null = null;

/** The process-wide selection (logged once). */
export function getNotificationSelection(): ProviderSelection {
  selected ??= selectNotificationProvider();
  return selected;
}

export function getNotificationProvider(): NotificationProvider {
  return getNotificationSelection().provider;
}

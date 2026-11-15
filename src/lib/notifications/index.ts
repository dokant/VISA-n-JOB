/**
 * Notification provider selection. P0c: console adapter only.
 * P2d (R-214) adds the SMTP adapter, enabled only when SMTP_* environment variables are set.
 */
import { createConsoleProvider } from "./console";
import type { NotificationProvider } from "./types";

export type {
  NotificationChannel,
  NotificationMessage,
  NotificationProvider,
  SendResult,
} from "./types";

let provider: NotificationProvider | null = null;

export function getNotificationProvider(): NotificationProvider {
  provider ??= createConsoleProvider();
  return provider;
}

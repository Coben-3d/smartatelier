// Public project links only. Never place API keys or account credentials here.
import config from "../project.config.json";
export function paypalLink(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    const host = url.hostname.toLowerCase();
    if (
      !["paypal.me", "www.paypal.me", "paypal.com", "www.paypal.com"].includes(
        host,
      )
    )
      return null;
    if (url.pathname === "/") return null;
    return url.href;
  } catch {
    return null;
  }
}
export const supportUrl = paypalLink(config.paypalUrl);

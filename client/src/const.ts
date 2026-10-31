export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Redirect to internal login page (email/password only, Manus OAuth removed)
export const getLoginUrl = (redirect?: string) => {
  if (redirect) {
    return `/login?redirect=${encodeURIComponent(redirect)}`;
  }
  return "/login";
};

export const ROUTES = {
  home: "/",
  login: "/login",
  onboarding: "/onboarding",
  preferences: "/preferences",
  match: "/match",
  history: "/history",
  messages: "/messages",
  blocked: "/blocked",
  rules: "/rules",
  privacy: "/privacy",
  terms: "/terms",
  admin: "/admin",
};

export const PROTECTED_ROUTES = [
  ROUTES.onboarding,
  ROUTES.preferences,
  ROUTES.match,
  ROUTES.history,
  ROUTES.messages,
  ROUTES.blocked,
];

export const ADMIN_ROUTES = [
  ROUTES.admin,
  "/admin/reports",
  "/admin/users",
  "/admin/sessions",
];
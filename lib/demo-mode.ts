// Server-side policy. Pass the boolean to client components; never expose credentials.
export function isDemoMode() {
  return process.env.SHADOWLINE_DEMO_MODE === "true";
}

export function canViewRealEvidence() {
  return isDemoMode() || process.env.NODE_ENV === "development";
}

export function canExecuteLocally() {
  return !isDemoMode() && process.env.NODE_ENV === "development";
}

export const demoNotice =
  "Live agent execution is disabled in the hosted demo. This deployment contains recorded outputs from real local benchmark runs.";

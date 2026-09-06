// No auth: the Customer/Staff toggle in the header (components/RoleToggle.tsx)
// is the only access control there is. This just names the two states so the
// rest of the app has one shared vocabulary for it.
export type ViewerRole = "customer" | "staff";

export const DEFAULT_VIEWER_ROLE: ViewerRole = "customer";

export const VIEWER_ROLE_COOKIE = "chowly_viewer_role";

export function isViewerRole(value: string | undefined | null): value is ViewerRole {
  return value === "customer" || value === "staff";
}

export function formatOrgName(name?: string) {
  if (!name) return "Organization";
  return name.replace(/-[a-z0-9]+$/i, "");
}

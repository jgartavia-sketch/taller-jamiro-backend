// Reception enters the mechanics' work and needs the same operational access.
// requireStaff still verifies the token, active account and session version first.
export function hasOperationsAccess(staff, adminEmail) {
  if (!staff) return false;
  return (Boolean(adminEmail) && staff.email === adminEmail)
    || ["MECHANIC", "RECEPTION"].includes(staff.role);
}

const DEFAULT_EASYVOX_ADMIN_EMAIL = "gianluca.pistorello@gmail.com";
const DEFAULT_EASYVOX_ADMIN_PASSWORD = "Vistrico2026!";

export const EASYVOX_ADMIN_EMAIL =
  process.env.EASYVOX_ADMIN_EMAIL?.trim().toLowerCase() || DEFAULT_EASYVOX_ADMIN_EMAIL;

export const EASYVOX_ADMIN_PASSWORD = process.env.EASYVOX_ADMIN_PASSWORD || DEFAULT_EASYVOX_ADMIN_PASSWORD;

export function isEasyVoxAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === EASYVOX_ADMIN_EMAIL;
}

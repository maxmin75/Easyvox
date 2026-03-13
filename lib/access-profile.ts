import { isEasyVoxAdminEmail } from "@/lib/admin/access";

export type AccessProfile = {
  isEasyVoxAdmin: boolean;
  isChatOnlyUser: boolean;
};

export async function getAccessProfile(user: { id: string; email: string | null | undefined }): Promise<AccessProfile> {
  const isEasyVoxAdmin = isEasyVoxAdminEmail(user.email);
  if (isEasyVoxAdmin) {
    return {
      isEasyVoxAdmin: true,
      isChatOnlyUser: false,
    };
  }

  return {
    isEasyVoxAdmin: false,
    isChatOnlyUser: true,
  };
}

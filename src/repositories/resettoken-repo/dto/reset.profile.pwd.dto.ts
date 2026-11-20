export interface ResetProfilePwdDto {
  oldPassword: string;
  newPassword: string;
  newConfirmPassword: string;
  siteUserId: string;
}

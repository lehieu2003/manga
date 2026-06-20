export type AuthEvent =
  | { type: "auth.user_registered"; userId: string }
  | { type: "auth.user_logged_in"; userId: string }
  | { type: "auth.refresh_token_rotated"; userId: string }
  | { type: "auth.user_logged_out"; tokenHash: string }
  | { type: "auth.profile_updated"; userId: string }
  | { type: "auth.password_changed"; userId: string }
  | { type: "auth.password_reset_requested"; userId: string }
  | { type: "auth.password_reset_completed"; userId: string }
  | { type: "auth.email_verification_requested"; userId: string }
  | { type: "auth.email_verified"; userId: string };

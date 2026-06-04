export type AuthEvent =
  | { type: "auth.user_registered"; userId: string }
  | { type: "auth.user_logged_in"; userId: string }
  | { type: "auth.refresh_token_rotated"; userId: string }
  | { type: "auth.user_logged_out"; tokenHash: string };

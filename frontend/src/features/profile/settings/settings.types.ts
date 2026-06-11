export type ProfileFormState = {
  displayName: string;
  avatarUrl: string;
  status: string;
  error: string;
  isSaving: boolean;
};

export type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  status: string;
  error: string;
  isChanging: boolean;
};

export type ProfileFormAction =
  | { type: "loaded"; displayName: string; avatarUrl: string }
  | { type: "displayNameChanged"; value: string }
  | { type: "avatarUrlChanged"; value: string }
  | { type: "saveStarted" }
  | { type: "saveSucceeded" }
  | { type: "saveFailed"; error: string };

export type PasswordFormAction =
  | { type: "currentPasswordChanged"; value: string }
  | { type: "newPasswordChanged"; value: string }
  | { type: "confirmPasswordChanged"; value: string }
  | { type: "changeStarted" }
  | { type: "validationFailed"; error: string }
  | { type: "changeSucceeded" }
  | { type: "changeFailed"; error: string };

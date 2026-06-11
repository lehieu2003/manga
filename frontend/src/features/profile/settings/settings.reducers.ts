import type { PasswordFormAction, PasswordFormState, ProfileFormAction, ProfileFormState } from "./settings.types";

export function createProfileFormState(displayName: string, avatarUrl: string): ProfileFormState {
  return { displayName, avatarUrl, status: "", error: "", isSaving: false };
}

export function createPasswordFormState(): PasswordFormState {
  return { currentPassword: "", newPassword: "", confirmPassword: "", status: "", error: "", isChanging: false };
}

export function profileFormReducer(state: ProfileFormState, action: ProfileFormAction): ProfileFormState {
  switch (action.type) {
    case "loaded":
      return { ...state, displayName: action.displayName, avatarUrl: action.avatarUrl };
    case "displayNameChanged":
      return { ...state, displayName: action.value };
    case "avatarUrlChanged":
      return { ...state, avatarUrl: action.value };
    case "saveStarted":
      return { ...state, status: "", error: "", isSaving: true };
    case "saveSucceeded":
      return { ...state, status: "Profile saved.", error: "", isSaving: false };
    case "saveFailed":
      return { ...state, status: "", error: action.error, isSaving: false };
    default:
      return state;
  }
}

export function passwordFormReducer(state: PasswordFormState, action: PasswordFormAction): PasswordFormState {
  switch (action.type) {
    case "currentPasswordChanged":
      return { ...state, currentPassword: action.value };
    case "newPasswordChanged":
      return { ...state, newPassword: action.value };
    case "confirmPasswordChanged":
      return { ...state, confirmPassword: action.value };
    case "changeStarted":
      return { ...state, status: "", error: "", isChanging: true };
    case "validationFailed":
      return { ...state, status: "", error: action.error, isChanging: false };
    case "changeSucceeded":
      return { ...createPasswordFormState(), status: "Password changed. Other refresh sessions were revoked." };
    case "changeFailed":
      return { ...state, status: "", error: action.error, isChanging: false };
    default:
      return state;
  }
}

import { api, clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/api";

export const authService = {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  login: api.login,
  register: api.register,
  logout: api.logout,
  updateMe: api.updateMe,
  changePassword: api.changePassword
};

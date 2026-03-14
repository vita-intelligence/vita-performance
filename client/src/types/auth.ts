export interface User {
  id: number;
  username: string;
  email: string;
  date_joined: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export interface PasswordResetPayload {
    email: string;
}

export interface PasswordResetConfirmPayload {
    payload: string;
    password: string;
}
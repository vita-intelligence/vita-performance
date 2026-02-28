# Authentication System

This document explains how authentication works across the Django + Next.js stack.

---

## Overview

Authentication is based on **JWT tokens stored in httpOnly cookies**. This means:

- Tokens are never accessible via JavaScript (`httpOnly: true`)
- Tokens are sent automatically on every request (`withCredentials: true`)
- The client never manually handles or stores tokens

---

## Stack

| Layer             | Tool                                |
| ----------------- | ----------------------------------- |
| Backend           | Django + SimpleJWT                  |
| Token storage     | httpOnly cookies                    |
| Frontend state    | Zustand (persisted to localStorage) |
| Frontend fetching | Tanstack Query                      |
| HTTP client       | Axios                               |

---

## Token Flow

There are two tokens in play:

- **Access token** — short lived (15 minutes), sent on every API request
- **Refresh token** — long lived (7 days), used only to get a new access token

```
User logs in
    → Django sets access_token cookie (15min)
    → Django sets refresh_token cookie (7days)
    → Next.js stores user object in Zustand

User makes API request
    → Browser sends access_token cookie automatically
    → Django validates it and returns data

Access token expires
    → Django returns 401
    → Axios interceptor catches 401
    → Interceptor calls /api/auth/refresh automatically
    → Django validates refresh_token and sets new access_token cookie
    → Axios retries the original request
    → User never notices anything

Refresh token expires
    → /api/auth/refresh returns 401
    → Axios interceptor redirects to /login
    → Zustand store is cleared
```

---

## Django Side

### Custom User Model (`accounts/models.py`)

Extends `AbstractUser` with:

- `email` — unique, required, used for login instead of username
- `username` — 3-20 chars, alphanumeric and underscores only

### Cookie JWT Authentication (`accounts/utils/jwt.py`)

Custom authentication class that extends `JWTAuthentication`:

- Reads access token from cookie first
- Falls back to `Authorization` header if no cookie found

### Endpoints

| Method | URL                  | Permission    | Description          |
| ------ | -------------------- | ------------- | -------------------- |
| POST   | `/api/auth/register` | Public        | Register new user    |
| POST   | `/api/auth/login`    | Public        | Login, sets cookies  |
| POST   | `/api/auth/logout`   | Authenticated | Clears cookies       |
| GET    | `/api/auth/user`     | Authenticated | Get current user     |
| POST   | `/api/auth/refresh`  | Public        | Refresh access token |

### Cookie Settings

| Setting    | Dev   | Prod |
| ---------- | ----- | ---- |
| `httpOnly` | True  | True |
| `secure`   | False | True |
| `samesite` | Lax   | None |

---

## Next.js Side

### Axios Instance (`src/lib/api.ts`)

Central axios instance configured with:

- `baseURL` pointing to Django
- `withCredentials: true` so cookies are sent on every request
- Response interceptor for silent token refresh on 401

### Auth Store (`src/lib/stores/auth.store.ts`)

Zustand store persisted to `localStorage` under key `auth-storage`:

```ts
{
  user: User | null   // persisted across page refreshes
  setUser: (user) => void
  clearUser: () => void
}
```

This means on page refresh, the user object is available instantly from localStorage without waiting for an API call.

### useAuth Hook (`src/hooks/useAuth.ts`)

Single hook that combines Tanstack Query + Zustand:

- **Tanstack Query** — calls `/api/auth/user` to keep user data fresh from Django
- **Zustand** — provides instant user data from localStorage on refresh

```ts
const {
  user, // User object from Zustand (instant)
  isLoading, // true while fetching from Django
  isAuthenticated, // boolean shorthand
  login, // triggers login mutation
  register, // triggers register mutation
  logout, // triggers logout mutation
  loginError, // error from login attempt
  registerError, // error from register attempt
  isLoginLoading, // true while login is pending
  isRegisterLoading, // true while register is pending
} = useAuth();
```

### Route Protection (`src/app/(main)/layout.tsx`)

All routes inside `(main)/` are protected by a layout that:

1. Checks `isAuthenticated` from `useAuth`
2. Redirects to `/login` if not authenticated
3. Renders `null` while loading to avoid flash

Public routes (`/login`, `/register`) live inside `(auth)/` and have no protection.

---

## User Data Lifecycle

```
Fresh visit (not logged in)
    → Zustand: user = null
    → Tanstack Query: fetches /api/auth/user → 401
    → Stays on /login

Login
    → Django sets cookies
    → Zustand: user = { id, username, email, date_joined }
    → Tanstack Query: caches user data
    → Redirected to /dashboard

Page refresh (logged in)
    → Zustand: user loaded instantly from localStorage
    → No loading flash
    → Tanstack Query: refetches in background to verify session

Logout
    → Django clears cookies
    → Zustand: user = null, localStorage cleared
    → Tanstack Query: cache removed
    → Redirected to /login

Token refresh (silent)
    → Happens automatically via Axios interceptor
    → User never sees anything
```

---

## Security Notes

- Access tokens are short lived (15min) to minimize exposure if compromised
- Refresh tokens rotate on every use (`ROTATE_REFRESH_TOKENS: True`)
- Used refresh tokens are blacklisted (`BLACKLIST_AFTER_ROTATION: True`)
- Cookies are `httpOnly` so XSS attacks cannot steal tokens
- `withCredentials: true` is required on the frontend for cookies to be sent cross-origin
- In production, cookies are `secure` (HTTPS only) and `samesite: None`

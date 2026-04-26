/**
 * api.js — Axios instance for GreenCO2
 * ======================================
 * All API calls MUST use this instance (not raw `axios`) so the
 * Authorization header is automatically attached on every request.
 *
 * Key fixes vs original:
 *  - Removed `withCredentials: true` — we use Bearer tokens, not cookies.
 *    withCredentials forces the browser to include cookies, which conflicts
 *    with the Flask CORS setup (wildcard origin + credentials = CORS error).
 *  - Interceptor now silently skips header attachment when no token exists,
 *    instead of sending "Bearer null" or "Bearer undefined".
 *  - Removed debug console.log (was leaking tokens to the browser console).
 */

import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000",
  // withCredentials is intentionally omitted — Bearer token auth, not cookies
});

// Request interceptor — attach JWT from localStorage on every outgoing request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      // Standard RFC 6750 Bearer token header
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally (token expired / invalid)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired — clear local state and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user_email");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

export default API;
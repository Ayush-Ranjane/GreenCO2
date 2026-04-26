/**
 * auth.js — Auth utility helpers
 * ================================
 * Centralised helpers for reading / clearing auth state from localStorage.
 *
 * IMPORTANT FIX: The original file contained:
 *   localStorage.setItem("token", "user_logged_in");
 *   window.location.href = "/client";
 *
 * That set a FAKE string as the token, which is why every protected API
 * call returned 422 / "Missing Authorization Header" — Flask-JWT was trying
 * to decode the literal string "user_logged_in" as a JWT and failing.
 *
 * This file now only exports safe utility functions. Actual token storage
 * happens in Auth.jsx after a successful /api/login response.
 */

/** Returns the raw JWT string from localStorage, or null if absent. */
export const getToken = () => localStorage.getItem("token");

/** Returns the stored user email, or an empty string if absent. */
export const getUserEmail = () => localStorage.getItem("user_email") || "";

/** Returns true if a token exists in localStorage. */
export const isAuthenticated = () => !!localStorage.getItem("token");

/** Removes all auth data from localStorage (call on logout). */
export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user_email");
};
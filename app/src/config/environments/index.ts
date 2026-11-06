const trimSlash = (value: string | undefined, fallback: string) => (value || fallback).replace(/\/+$/, "");

const APP_NAME = "QuizMe";
const API_URL = trimSlash(import.meta.env.VITE_API_URL, "http://localhost:3000/api");
const SOCKET_URL = trimSlash(import.meta.env.VITE_SOCKET_URL, API_URL.replace(/\/api$/, ""));
const APP_URL = trimSlash(import.meta.env.VITE_APP_URL, window.location.origin);
const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export const environments = {
    APP_NAME,
    API_URL,
    SOCKET_URL,
    APP_URL,
    GOOGLE_CLIENT_ID,
};

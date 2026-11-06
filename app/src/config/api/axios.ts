import axios from "axios";
import { getAuthStoreState } from "@/stores/auth";
import { isTokenExpired } from "@/lib/token";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";

const axiosInstance = axios.create({
    baseURL: environments.API_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 60_000,
});

const PUBLIC_PATHS = [Routes.auth.sign_in, Routes.auth.sign_up, Routes.auth.forgot_password, Routes.auth.reset_password, Routes.auth.verify_email];

const forceSignOut = () => {
    const state = getAuthStoreState();
    if (!state.isLoggedIn) return;
    state.clear();
    if (!PUBLIC_PATHS.some((p) => window.location.pathname.startsWith(p))) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`${Routes.auth.sign_in}?next=${next}`);
    }
};

axiosInstance.interceptors.request.use((config) => {
    const authState = getAuthStoreState();
    if (authState.expires_in && isTokenExpired(authState.expires_in)) {
        forceSignOut();
        return Promise.reject(new Error("Your session has expired. Please sign in again."));
    }
    if (authState.access_token) {
        config.headers.Authorization = `Bearer ${authState.access_token}`;
    }
    return config;
});

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const url: string = error?.config?.url ?? "";
        const isAuthAttempt = url.includes("/auth/login") || url.includes("/auth/register") || url.includes("/auth/google");
        if (status === 401 && !isAuthAttempt) forceSignOut();
        return Promise.reject(error);
    },
);

export default axiosInstance;

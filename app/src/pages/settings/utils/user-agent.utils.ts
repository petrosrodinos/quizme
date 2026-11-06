import { tr } from "@/lib/i18n-options";

/** Rough, privacy-friendly device description from a user-agent string. Brand names are not translated. */
export const describeUserAgent = (ua: string | null): { browser: string; os: string; mobile: boolean } => {
    if (!ua) return { browser: tr("settings:sessions.unknownBrowser"), os: tr("settings:sessions.unknownDevice"), mobile: false };
    const browser = /Edg\//.test(ua)
        ? "Edge"
        : /OPR\//.test(ua)
          ? "Opera"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : /Chrome\//.test(ua)
              ? "Chrome"
              : /Safari\//.test(ua)
                ? "Safari"
                : tr("settings:sessions.genericBrowser");
    const os = /Windows/.test(ua)
        ? "Windows"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Android/.test(ua)
            ? "Android"
            : /Mac OS X/.test(ua)
              ? "macOS"
              : /Linux/.test(ua)
                ? "Linux"
                : tr("settings:sessions.unknownOs");
    return { browser, os, mobile: /Mobi|Android|iPhone/.test(ua) };
};

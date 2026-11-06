/** Rough, privacy-friendly device description from a user-agent string. */
export const describeUserAgent = (ua: string | null): { browser: string; os: string; mobile: boolean } => {
    if (!ua) return { browser: "Unknown browser", os: "Unknown device", mobile: false };
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
                : "Browser";
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
                : "Unknown OS";
    return { browser, os, mobile: /Mobi|Android|iPhone/.test(ua) };
};

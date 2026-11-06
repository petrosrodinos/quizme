const app = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

/** Frontend deep links used in emails and notifications. Keep in sync with app/src/routes/routes.ts. */
export const AppUrls = {
    resetPassword: (token: string) => `${app()}/auth/reset-password?token=${encodeURIComponent(token)}`,
    verifyEmail: (token: string) => `${app()}/auth/verify-email?token=${encodeURIComponent(token)}`,
    acceptInvitation: (token: string) => `${app()}/invitations/${encodeURIComponent(token)}`,
    sharedLink: (token: string) => `${app()}/shared/${encodeURIComponent(token)}`,
} as const;

/** Relative in-app links stored on notifications. */
export const AppPaths = {
    dashboard: '/dashboard',
    project: (id: string) => `/projects/${id}`,
    projectDocuments: (id: string) => `/projects/${id}/documents`,
    projectFlashcards: (id: string) => `/projects/${id}/flashcards`,
    projectQuizzes: (id: string) => `/projects/${id}/quizzes`,
    attempt: (projectId: string, attemptId: string) => `/projects/${projectId}/attempts/${attemptId}`,
    achievements: '/achievements',
    study: '/study',
    invitations: '/invitations',
} as const;

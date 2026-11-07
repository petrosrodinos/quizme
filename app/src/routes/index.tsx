import { lazy, Suspense } from "react";
import { Navigate, Route, Routes as RouterRoutes } from "react-router-dom";
import ProtectedRoute from "@/routes/protected-route";
import { RoutePatterns as P, Routes } from "@/routes/routes";
import { PageSkeleton } from "@/components/ui/card-skeletons";

// Layouts
const AuthLayout = lazy(() => import("@/pages/auth/layout"));
const AppLayout = lazy(() => import("@/components/layout/app-layout"));
const ProjectLayout = lazy(() => import("@/pages/projects/layout"));
const SettingsLayout = lazy(() => import("@/pages/settings/layout"));

// Auth
const SignIn = lazy(() => import("@/pages/auth/pages/sign-in"));
const SignUp = lazy(() => import("@/pages/auth/pages/sign-up"));
const ForgotPassword = lazy(() => import("@/pages/auth/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/auth/pages/reset-password"));
const VerifyEmail = lazy(() => import("@/pages/auth/pages/verify-email"));

// App
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Study = lazy(() => import("@/pages/study"));
const Search = lazy(() => import("@/pages/search"));
const Achievements = lazy(() => import("@/pages/achievements"));
const Notifications = lazy(() => import("@/pages/notifications"));
const Profile = lazy(() => import("@/pages/profile"));
const SettingsProfile = lazy(() => import("@/pages/settings/pages/profile"));
const SettingsPreferences = lazy(() => import("@/pages/settings/pages/preferences"));
const SettingsNotifications = lazy(() => import("@/pages/settings/pages/notifications"));
const SettingsSessions = lazy(() => import("@/pages/settings/pages/sessions"));
const Invitations = lazy(() => import("@/pages/invitations"));
const InvitationAccept = lazy(() => import("@/pages/invitations/pages/accept"));
const Shared = lazy(() => import("@/pages/shared"));
const Rooms = lazy(() => import("@/pages/rooms"));
const RoomDetail = lazy(() => import("@/pages/rooms/pages/detail"));
const Game = lazy(() => import("@/pages/games"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Projects
const Projects = lazy(() => import("@/pages/projects"));
const ProjectOverview = lazy(() => import("@/pages/projects/pages/overview"));
const ProjectDocuments = lazy(() => import("@/pages/projects/pages/documents"));
const DocumentReader = lazy(() => import("@/pages/projects/pages/document"));
const ProjectTutor = lazy(() => import("@/pages/projects/pages/tutor"));
const ProjectQuizzes = lazy(() => import("@/pages/projects/pages/quizzes"));
const QuizTake = lazy(() => import("@/pages/projects/pages/quiz-take"));
const AttemptResult = lazy(() => import("@/pages/projects/pages/attempt"));
const ProjectFlashcards = lazy(() => import("@/pages/projects/pages/flashcards"));
const FlashcardsReview = lazy(() => import("@/pages/projects/pages/flashcards-review"));
const ProjectQuestions = lazy(() => import("@/pages/projects/pages/questions"));
const ProjectNotes = lazy(() => import("@/pages/projects/pages/notes"));
const ProjectCurriculum = lazy(() => import("@/pages/projects/pages/curriculum"));
const ProjectTopics = lazy(() => import("@/pages/projects/pages/topics"));
const ProjectSummaries = lazy(() => import("@/pages/projects/pages/summaries"));
const ProjectRecall = lazy(() => import("@/pages/projects/pages/recall"));
const ProjectProgress = lazy(() => import("@/pages/projects/pages/progress"));
const ProjectPlan = lazy(() => import("@/pages/projects/pages/plan"));
const ProjectExam = lazy(() => import("@/pages/projects/pages/exam"));
const ProjectMembers = lazy(() => import("@/pages/projects/pages/members"));
const ProjectSettings = lazy(() => import("@/pages/projects/pages/settings"));

const pp = P.projects;

export default function AppRoutes() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <RouterRoutes>
                <Route
                    path={P.auth.root}
                    element={
                        <ProtectedRoute loggedIn={false}>
                            <AuthLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to={Routes.auth.sign_in} replace />} />
                    <Route path={P.auth.sign_in} element={<SignIn />} />
                    <Route path={P.auth.sign_up} element={<SignUp />} />
                    <Route path={P.auth.forgot_password} element={<ForgotPassword />} />
                    <Route path={P.auth.reset_password} element={<ResetPassword />} />
                </Route>

                {/* Verify-email works signed in or out. */}
                <Route element={<AuthLayout />}>
                    <Route path={Routes.auth.verify_email} element={<VerifyEmail />} />
                </Route>

                <Route
                    element={
                        <ProtectedRoute loggedIn>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path={P.dashboard} element={<Dashboard />} />
                    <Route path={P.study} element={<Study />} />
                    <Route path={P.search} element={<Search />} />
                    <Route path={P.achievements} element={<Achievements />} />
                    <Route path={P.notifications} element={<Notifications />} />
                    <Route path={P.profile} element={<Profile />} />
                    <Route path={P.settings.root} element={<SettingsLayout />}>
                        <Route index element={<Navigate to={Routes.settings.profile} replace />} />
                        <Route path={P.settings.profile} element={<SettingsProfile />} />
                        <Route path={P.settings.preferences} element={<SettingsPreferences />} />
                        <Route path={P.settings.notifications} element={<SettingsNotifications />} />
                        <Route path={P.settings.sessions} element={<SettingsSessions />} />
                    </Route>
                    <Route path={P.invitations} element={<Invitations />} />
                    <Route path={P.invitation_accept} element={<InvitationAccept />} />
                    <Route path={P.shared_by_id} element={<Shared />} />
                    <Route path={P.shared} element={<Shared />} />
                    <Route path={P.rooms.root} element={<Rooms />} />
                    <Route path={P.rooms.detail} element={<RoomDetail />} />
                    <Route path={P.game} element={<Game />} />
                    <Route path={pp.root} element={<Projects />} />
                    <Route path={pp.detail} element={<ProjectLayout />}>
                        <Route index element={<ProjectOverview />} />
                        <Route path={pp.documents} element={<ProjectDocuments />} />
                        <Route path={pp.document} element={<DocumentReader />} />
                        <Route path={pp.tutor} element={<ProjectTutor />} />
                        <Route path={pp.quizzes} element={<ProjectQuizzes />} />
                        <Route path={pp.quiz_take} element={<QuizTake />} />
                        <Route path={pp.attempt} element={<AttemptResult />} />
                        <Route path={pp.flashcards} element={<ProjectFlashcards />} />
                        <Route path={pp.flashcards_review} element={<FlashcardsReview />} />
                        <Route path={pp.questions} element={<ProjectQuestions />} />
                        <Route path={pp.notes} element={<ProjectNotes />} />
                        <Route path={pp.curriculum} element={<ProjectCurriculum />} />
                        <Route path={pp.topics} element={<ProjectTopics />} />
                        <Route path={pp.summaries} element={<ProjectSummaries />} />
                        <Route path={pp.recall} element={<ProjectRecall />} />
                        <Route path={pp.progress} element={<ProjectProgress />} />
                        <Route path={pp.plan} element={<ProjectPlan />} />
                        <Route path={pp.exam} element={<ProjectExam />} />
                        <Route path={pp.members} element={<ProjectMembers />} />
                        <Route path={pp.settings} element={<ProjectSettings />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                </Route>

                <Route path="/" element={<Navigate to={Routes.dashboard} replace />} />
            </RouterRoutes>
        </Suspense>
    );
}

import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AccountProblem, CoachAuthPage, LoadingScreen, TraineeAuthPage } from './auth/AuthScreens';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ui';
import { LangProvider, useI18n } from './i18n';
import { BillingPage } from './pages/Billing';
import { CalendarPage } from './pages/Calendar';
import { HistoryPage } from './pages/History';
import { MessagesPage } from './pages/Messages';
import { NewTraineePage } from './pages/NewTrainee';
import { OverviewPage } from './pages/Overview';
import { RequestsPage } from './pages/Requests';
import { ProgramsPage } from './pages/Programs';
import { TemplateWizard } from './pages/programs/TemplateWizard';
import { SettingsPage } from './pages/Settings';
import { TraineePage } from './pages/Trainee';
import { TraineesPage } from './pages/Trainees';
import { CoachScreen } from './trainee/Coach';
import { ProgramScreen } from './trainee/Program';
import { ProgressScreen } from './trainee/Progress';
import { CheckinScreen, InBodyScreen, MeScreen } from './trainee/Tasks';
import { TodayScreen } from './trainee/Today';
import { TraineeAppIndex, TraineeAppRoot } from './trainee/TraineeApp';
import { WorkoutScreen } from './trainee/Workout';
import './styles.css';

/** Dashboard: coaches only (local demo mode skips sign-in). */
function CoachGate({ children }: { children: ReactNode }) {
  const a = useAuth();
  if (a.status === 'local') return <>{children}</>;
  if (a.status === 'loading') return <CoachAuthPage><LoadingScreen /></CoachAuthPage>;
  if (a.status === 'signedOut') return <Navigate to="/login" replace />;
  if (a.status !== 'ready') return <CoachAuthPage><AccountProblem /></CoachAuthPage>;
  if (a.role === 'trainee') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

/** Trainee app: the trainee themself, or their coach previewing it. */
function TraineeGate({ children }: { children: ReactNode }) {
  const a = useAuth();
  const { tid } = useParams();
  if (a.status === 'local') return <>{children}</>;
  if (a.status === 'loading') return <TraineeAuthPage><LoadingScreen /></TraineeAuthPage>;
  if (a.status === 'signedOut') return <TraineeAuthPage />;
  if (a.status !== 'ready') return <TraineeAuthPage><AccountProblem /></TraineeAuthPage>;
  if (a.role === 'trainee' && tid && tid !== a.traineeId) return <Navigate to={`/app/${a.traineeId}`} replace />;
  return <>{children}</>;
}

function LoginRoute() {
  const a = useAuth();
  if (a.status === 'local' || (a.status === 'ready' && a.role === 'coach')) return <Navigate to="/" replace />;
  if (a.status === 'ready' && a.role === 'trainee') return <Navigate to="/app" replace />;
  if (a.status === 'loading') return <CoachAuthPage><LoadingScreen /></CoachAuthPage>;
  if (a.status === 'noProfile' || a.status === 'error') return <CoachAuthPage><AccountProblem /></CoachAuthPage>;
  return <CoachAuthPage />;
}

function AppRoutes() {
  // Remount on language change so every date and label re-renders in the new language.
  const { lang } = useI18n();
  return (
    <Routes key={lang}>
      <Route path="login" element={<LoginRoute />} />
      <Route path="app" element={<TraineeGate><TraineeAppIndex /></TraineeGate>} />
      <Route path="app/:tid" element={<TraineeGate><TraineeAppRoot /></TraineeGate>}>
        <Route index element={<TodayScreen />} />
        <Route path="program" element={<ProgramScreen />} />
        <Route path="progress" element={<ProgressScreen />} />
        <Route path="coach" element={<CoachScreen />} />
        <Route path="me" element={<MeScreen />} />
        <Route path="workout/:dayId" element={<WorkoutScreen />} />
        <Route path="checkin" element={<CheckinScreen />} />
        <Route path="inbody" element={<InBodyScreen />} />
      </Route>
      <Route element={<CoachGate><Layout /></CoachGate>}>
        <Route index element={<OverviewPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="trainees" element={<TraineesPage />} />
        <Route path="trainees/new" element={<NewTraineePage />} />
        <Route path="trainees/:id" element={<TraineePage />} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="programs/new" element={<TemplateWizard />} />
        <Route path="programs/:id" element={<ProgramsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="messages/:id" element={<MessagesPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </LangProvider>
  </StrictMode>,
);

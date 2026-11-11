import { lazy, StrictMode, Suspense, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { LangProvider, useI18n } from './i18n';
import { ScrollManager } from './site/ScrollManager';
import { ForgotPasswordPage } from './site/pages/auth/ForgotPasswordPage';
import { LoginPage } from './site/pages/auth/LoginPage';
import { SignupPage } from './site/pages/auth/SignupPage';
import { HomePage } from './site/pages/HomePage';
import { NotFoundPage } from './site/pages/NotFoundPage';
import './styles.css';

// The coach dashboard and trainee app load on first visit, so the public
// website at / doesn't download them.
const coachPages = () => import('./coachPages');
const traineeScreens = () => import('./traineeScreens');

function lazyNamed<M, K extends keyof M>(load: () => Promise<M>, name: K) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType }));
}

const Layout = lazyNamed(coachPages, 'Layout');
const BillingPage = lazyNamed(coachPages, 'BillingPage');
const CalendarPage = lazyNamed(coachPages, 'CalendarPage');
const MessagesPage = lazyNamed(coachPages, 'MessagesPage');
const NewTraineePage = lazyNamed(coachPages, 'NewTraineePage');
const OverviewPage = lazyNamed(coachPages, 'OverviewPage');
const ProgramsPage = lazyNamed(coachPages, 'ProgramsPage');
const SettingsPage = lazyNamed(coachPages, 'SettingsPage');
const TraineePage = lazyNamed(coachPages, 'TraineePage');
const TraineesPage = lazyNamed(coachPages, 'TraineesPage');

const CoachScreen = lazyNamed(traineeScreens, 'CoachScreen');
const ProgramScreen = lazyNamed(traineeScreens, 'ProgramScreen');
const ProgressScreen = lazyNamed(traineeScreens, 'ProgressScreen');
const CheckinScreen = lazyNamed(traineeScreens, 'CheckinScreen');
const InBodyScreen = lazyNamed(traineeScreens, 'InBodyScreen');
const MeScreen = lazyNamed(traineeScreens, 'MeScreen');
const TodayScreen = lazyNamed(traineeScreens, 'TodayScreen');
const TraineeAppIndex = lazyNamed(traineeScreens, 'TraineeAppIndex');
const TraineeAppRoot = lazyNamed(traineeScreens, 'TraineeAppRoot');
const WorkoutScreen = lazyNamed(traineeScreens, 'WorkoutScreen');

// Coach pages are opened from links coaches share, so they load on their own too.
const CoachPage = lazyNamed(() => import('./site/pages/coach/CoachPage'), 'CoachPage');
const JoinPage = lazyNamed(() => import('./site/pages/join/JoinPage'), 'JoinPage');

function AppRoutes() {
  // Remount on language change so every date and label re-renders in the new language.
  const { lang } = useI18n();
  return (
    <>
      <ScrollManager />
      <Suspense fallback={null}>
        <Routes key={lang}>
          {/* Public website */}
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="c/:handle" element={<CoachPage />} />
          <Route path="join/:coach" element={<JoinPage />} />
          {/* Trainee app */}
          <Route path="app" element={<TraineeAppIndex />} />
          <Route path="app/:tid" element={<TraineeAppRoot />}>
            <Route index element={<TodayScreen />} />
            <Route path="program" element={<ProgramScreen />} />
            <Route path="progress" element={<ProgressScreen />} />
            <Route path="coach" element={<CoachScreen />} />
            <Route path="me" element={<MeScreen />} />
            <Route path="workout/:dayId" element={<WorkoutScreen />} />
            <Route path="checkin" element={<CheckinScreen />} />
            <Route path="inbody" element={<InBodyScreen />} />
          </Route>
          {/* Coach dashboard */}
          <Route path="coach" element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="trainees" element={<TraineesPage />} />
            <Route path="trainees/new" element={<NewTraineePage />} />
            <Route path="trainees/:id" element={<TraineePage />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="programs/:id" element={<ProgramsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="messages/:id" element={<MessagesPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/coach" replace />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </LangProvider>
  </StrictMode>,
);

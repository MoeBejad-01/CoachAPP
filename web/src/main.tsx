import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ui';
import { LangProvider, useI18n } from './i18n';
import { BillingPage } from './pages/Billing';
import { CalendarPage } from './pages/Calendar';
import { HistoryPage } from './pages/History';
import { MessagesPage } from './pages/Messages';
import { NewTraineePage } from './pages/NewTrainee';
import { OverviewPage } from './pages/Overview';
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

function AppRoutes() {
  // Remount on language change so every date and label re-renders in the new language.
  const { lang } = useI18n();
  return (
    <Routes key={lang}>
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
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
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
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </LangProvider>
  </StrictMode>,
);

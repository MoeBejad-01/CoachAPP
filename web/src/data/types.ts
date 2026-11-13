// Domain types shared by the store, seed data and pages.
// Dates are ISO strings (YYYY-MM-DD for days, full ISO for timestamps).

export type TraineeStatus = 'onboarding' | 'active' | 'paused' | 'inactive';
export type CoachingMode = 'online' | 'inperson' | 'hybrid';
export type GoalType = 'muscle' | 'strength' | 'fatloss' | 'sport' | 'rehab' | 'health';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  intensity: string;
  rest: string;
  cue: string;
  /** Technique video link, shown to the trainee in the app. */
  video?: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface Template {
  id: string;
  name: string;
  summary: string;
  tags: string[];
  weeks: number;
  loadMethod: string;
  progression: string;
  days: ProgramDay[];
  updatedAt: string;
}

export interface WeekTargets {
  bodyWeightKg: number | null;
  sleepH: number | null;
  calories: number | null;
  proteinG: number | null;
  steps: number | null;
  focus: string;
}

export interface ProgramWeek {
  id: string;
  targets: WeekTargets;
  days: ProgramDay[];
}

/** A trainee's own editable copy of a template, laid out week by week. */
export interface AssignedProgram {
  templateId: string | null;
  name: string;
  startDate: string;
  /** Always equal to plan.length. */
  weeks: number;
  plan: ProgramWeek[];
}

export interface Goal {
  id: string;
  label: string;
  unit: string;
  start: number;
  current: number;
  target: number;
}

export interface Membership {
  plan: string;
  price: number;
  cycle: 'monthly' | 'quarterly';
  renewsOn: string;
  paid: boolean;
}

export interface Trainee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  heightCm: number;
  mode: CoachingMode;
  status: TraineeStatus;
  goalType: GoalType;
  goals: Goal[];
  injuries: string;
  frequency: number;
  checkinDay: number; // 0 = Sunday
  joinedAt: string;
  lastSeenAt: string;
  tone: number;
  program: AssignedProgram | null;
  membership: Membership;
  pinnedNote: string;
}

export interface LoggedSet {
  weight: number;
  reps: number;
}

/** Cardio done as part of a workout or on its own. */
export interface CardioDetail {
  minutes: number;
  distanceKm?: number;
  kcal?: number;
  avgHr?: number;
}

export interface LogEntry {
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSet[];
  /** Cardio exercises log time and distance instead of sets. */
  cardio?: CardioDetail;
  note?: string;
  pain?: boolean;
}

export interface WorkoutLog {
  id: string;
  traineeId: string;
  date: string;
  dayName: string;
  durationMin: number;
  rpe: number;
  entries: LogEntry[];
  /** The program day this session was for (it may be done on a different day). */
  dayId?: string;
}

export type CardioActivity = 'walk' | 'run' | 'cycle' | 'swim' | 'row' | 'elliptical' | 'stairs' | 'hiit' | 'sport' | 'other';

/** A cardio session logged on its own in the trainee app. */
export interface CardioSession extends CardioDetail {
  id: string;
  traineeId: string;
  date: string;
  activity: CardioActivity;
  /** 1 easy, 2 moderate, 3 hard. */
  effort: number;
  note?: string;
}

export interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  text: string;
  kcal?: number;
  proteinG?: number;
}

export type SkipReason = 'sick' | 'busy' | 'travel' | 'sore' | 'motivation' | 'other';

/** A planned session the trainee chose to skip this week, and why. */
export interface SkippedSession {
  id: string;
  traineeId: string;
  /** Monday of the week it was planned in. */
  weekStart: string;
  /** The day it was planned for. */
  date: string;
  dayId: string;
  dayName: string;
  reason: SkipReason;
  note?: string;
  at: string;
}

/** What the trainee tracks day to day in the app (one per trainee per day). */
export interface DailyLog {
  traineeId: string;
  date: string;
  sleepH?: number;
  waterMl?: number;
  steps?: number;
  /** 1–5 */
  stress?: number;
  /** 1–5 */
  soreness?: number;
  /** Muscle groups that feel sore. */
  sorenessAreas?: string[];
  meals: Meal[];
}

export interface WeightEntry {
  traineeId: string;
  date: string;
  kg: number;
}

export interface CheckIn {
  id: string;
  traineeId: string;
  date: string;
  weightKg: number;
  sleepH: number;
  energy: number;
  stress: number;
  soreness: number;
  comment: string;
}

export interface Note {
  id: string;
  traineeId: string;
  at: string;
  text: string;
  shared: boolean;
}

export interface Message {
  id: string;
  traineeId: string;
  from: 'coach' | 'trainee';
  text: string;
  at: string;
  /** Trainee messages: read by the coach. */
  read: boolean;
  /** Coach messages: opened by the trainee in the app (missing = seen). */
  seen?: boolean;
}

export interface Session {
  id: string;
  traineeId: string | null;
  title: string;
  start: string;
  durationMin: number;
  location: 'In person' | 'Remote' | 'Video call';
}

export type WidgetId = 'kpis' | 'attention' | 'sessions' | 'messages' | 'roster' | 'adherence' | 'prs' | 'renewals';

// ---------- Trainee page layout (per coach) ----------

export type TraineeTabId = 'overview' | 'program' | 'workouts' | 'progress' | 'notes' | 'checkins';
export type BadgeId = 'group' | 'plan' | 'goalType';
export type DetailId = 'age' | 'height' | 'since' | 'seen' | 'contact' | 'frequency';
export type BannerId = 'flags' | 'pinned' | 'injuries';
export type ActionId = 'status' | 'edit' | 'message';
export type StatId = 'program' | 'adherence' | 'weight' | 'lastSession' | 'checkin' | 'renewal' | 'sessions30' | 'goal' | 'unread' | 'prs30';
export type BuiltinSectionId =
  | 'week' | 'goals' | 'checkin' | 'notes' | 'weight' | 'lifts' | 'perWeek' | 'goalBars' | 'profile' | 'membership' | 'lastWorkout'
  | 'summary' | 'prs' | 'topLifts' | 'volume' | 'rpe' | 'checkinTrend' | 'inbody' | 'inbodyTrend' | 'inbodyHistory';
/** Built-in cards plus the coach's own cards (`card:<id>`). */
export type SectionId = BuiltinSectionId | `card:${string}`;
export type ProgramColId = 'cue' | 'prescribed' | 'intensity' | 'rest' | 'logged';
export type WorkoutColId = 'date' | 'session' | 'duration' | 'rpe' | 'volume' | 'exercises' | 'sets';
export type TargetId = 'bodyWeight' | 'sleep' | 'calories' | 'protein' | 'steps' | 'focus';
export type CheckinColId = 'date' | 'weight' | 'sleep' | 'energy' | 'stress' | 'soreness' | 'comment';

export interface LayoutItem<T extends string> {
  id: T;
  on: boolean;
}
export interface TabItem extends LayoutItem<TraineeTabId> {
  /** Coach's own name for the tab; empty means the built-in label. */
  label: string;
}
export interface SectionItem extends LayoutItem<SectionId> {
  wide: boolean;
}

// ---------- Coach-built cards ----------

export type ExerciseMeasure = 'e1rm' | 'topWeight' | 'volume' | 'reps';
export type WorkoutField = 'duration' | 'rpe' | 'volume' | 'sets';
export type CheckinField = 'weightKg' | 'sleepH' | 'energy' | 'stress' | 'soreness';
export type InBodyField = 'weightKg' | 'muscleKg' | 'fatKg' | 'fatPct' | 'bmi' | 'visceral' | 'bmr' | 'waterL' | 'score';

export type CardSource =
  | { kind: 'exercise'; exercise: string; measure: ExerciseMeasure }
  | { kind: 'workout'; field: WorkoutField }
  | { kind: 'checkin'; field: CheckinField }
  | { kind: 'inbody'; field: InBodyField }
  | { kind: 'target'; field: 'bodyWeight' | 'sleep' }
  | { kind: 'metric'; unit: string; higherIsBetter: boolean };

export interface CustomCard {
  id: string;
  title: string;
  source: CardSource;
  chart: 'line' | 'bar';
}

export interface TraineeLayout {
  /** Bumped when defaults change in a way saved layouts should pick up. */
  version: number;
  customCards: CustomCard[];
  badges: LayoutItem<BadgeId>[];
  details: LayoutItem<DetailId>[];
  banners: LayoutItem<BannerId>[];
  actions: LayoutItem<ActionId>[];
  stats: LayoutItem<StatId>[];
  tabs: TabItem[];
  defaultTab: TraineeTabId;
  overview: SectionItem[];
  progress: SectionItem[];
  programCols: LayoutItem<ProgramColId>[];
  targetFields: LayoutItem<TargetId>[];
  workoutCols: LayoutItem<WorkoutColId>[];
  workoutExpand: 'latest' | 'all' | 'none';
  checkinCols: LayoutItem<CheckinColId>[];
  notesDefaultShared: boolean;
  adherenceWarn: number;
}

// ---------- InBody & custom metrics ----------

export interface InBodyScan {
  id: string;
  traineeId: string;
  date: string;
  weightKg: number;
  muscleKg: number;
  fatKg: number;
  fatPct: number;
  bmi: number;
  visceral: number;
  bmr: number;
  waterL: number;
  score: number;
  /** Uploaded report (name always; data URL only for small files). */
  file?: { name: string; type: string; dataUrl?: string };
  source: 'trainee' | 'coach';
}

export interface InBodyRequest {
  id: string;
  traineeId: string;
  requestedAt: string;
  note: string;
  status: 'pending' | 'done' | 'cancelled';
  scanId?: string;
}

/** A value for a coach-defined metric card (`card:<id>`). */
export interface MetricEntry {
  id: string;
  traineeId: string;
  cardId: string;
  date: string;
  value: number;
}

export interface Coach {
  name: string;
  title: string;
  email: string;
  businessName: string;
  currency: string;
}

export interface AppState {
  version: number;
  coach: Coach;
  trainees: Trainee[];
  templates: Template[];
  logs: WorkoutLog[];
  weights: WeightEntry[];
  checkins: CheckIn[];
  notes: Note[];
  messages: Message[];
  sessions: Session[];
  widgets: Record<WidgetId, boolean>;
  traineeLayout: TraineeLayout;
  inbody: InBodyScan[];
  inbodyRequests: InBodyRequest[];
  metricEntries: MetricEntry[];
  cardio: CardioSession[];
  dailyLogs: DailyLog[];
  skips: SkippedSession[];
}

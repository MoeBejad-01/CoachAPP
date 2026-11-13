// The example coach shown at /c/omar until real accounts fill their own pages.
// Same coach as the dashboard's demo data (account id "demo").

import type { CoachProfile } from './types';

/**
 * Weekly values from `start` to `end` over `weeks`: quick early gains ('out')
 * or a slow start ('in'), holding back a little on deload weeks (4, 8, 12).
 */
function progress(start: number, end: number, step: number, ease: 'out' | 'in' = 'out', weeks = 16): number[] {
  const out: number[] = [];
  for (let w = 0; w <= weeks; w++) {
    const t = w / weeks;
    const k = ease === 'out' ? 1 - Math.pow(1 - t, 1.7) : Math.pow(t, 1.8);
    let v = start + (end - start) * k;
    if (w > 0 && w < weeks && w % 4 === 0) v -= (end - start) * 0.035;
    out.push(Math.round(v / step) * step);
  }
  out[weeks] = end;
  return out;
}

/** Load map for a program: `days` are the training days (0–6); `level(week, slot)` gives 0–3. */
function loadMap(weeks: number, days: number[], level: (week: number, slot: number) => number): number[][] {
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => (days.includes(d) ? level(w + 1, days.indexOf(d)) : 0)));
}

const foundations = loadMap(12, [0, 2, 4], (w, s) => {
  if (w === 12) return [3, 1, 3][s];
  if (w % 4 === 0) return 1;
  const b = (w - 1) % 4;
  return [[2, 1, 1], [2, 2, 1], [3, 2, 2]][b][s];
});

const hypertrophy = loadMap(8, [0, 1, 2, 4, 5], (w, s) => {
  if (w === 4) return 1;
  const heavy = w === 3 || w >= 7;
  return Math.min(3, [2, 2, 1, 2, 2][s] + (heavy && s % 2 === 0 ? 1 : 0));
});

const meetPrep = loadMap(10, [0, 2, 3, 5], (w, s) => {
  if (w === 4) return 1;
  if (w === 10) return [2, 1, 0, 0][s];
  if (w === 9) return [3, 1, 2, 1][s];
  if (w <= 3) return [3, 2, 2, 1][s];
  return [3, 2, 3, 2][s];
});
meetPrep[9][6] = 3; // Meet day

export const DEMO_COACH: CoachProfile = {
  id: 'demo',
  handle: 'omar',
  name: { en: 'Omar Haddad', ar: 'عمر حداد' },
  title: { en: 'Strength & physique coach', ar: 'مدرب قوة وبناء أجسام' },
  location: { en: 'Riyadh · Online worldwide', ar: 'الرياض · أونلاين لكل مكان' },
  // Stock photo: "Male fitness model" by Samuel Girven, Unsplash License
  // (unsplash.com/photos/Ppua0I4VjqE). A real stranger, so replace it before launch.
  photo: '/coaches/omar.jpg',
  tagline: {
    en: "Strength is a skill. I'll coach you through every rep of learning it.",
    ar: 'القوة مهارة، وسأرافقك في كل تكرار حتى تتقنها.',
  },
  languages: [{ en: 'Arabic', ar: 'العربية' }, { en: 'English', ar: 'الإنجليزية' }],
  responseTime: { en: 'Replies within 4 hours', ar: 'يرد خلال 4 ساعات' },
  rating: { score: 4.9, count: 126 },
  capacity: { total: 20, taken: 17 },
  currency: 'SAR',
  sections: ['numbers', 'story', 'platform', 'results', 'method', 'programs', 'plans', 'inbox', 'intro', 'faq'],

  stats: [
    { value: 9, label: { en: 'years coaching', ar: 'سنوات في التدريب' } },
    { value: 340, suffix: '+', label: { en: 'trainees coached', ar: 'متدرب دربتهم' } },
    { value: 38, prefix: '+', suffix: '%', label: { en: 'average strength gain in 12 weeks', ar: 'متوسط زيادة القوة في 12 أسبوعًا' } },
    { value: 14, label: { en: 'months average stay', ar: 'شهرًا متوسط الاستمرار' } },
  ],

  story: {
    quote: {
      en: "I don't sell transformations. I teach people to train for the rest of their lives.",
      ar: 'لا أبيع تحولات سريعة، بل أعلّم الناس كيف يتدربون طوال حياتهم.',
    },
    paragraphs: [
      {
        en: 'I started lifting at 17 in a garage gym in Jeddah, chasing numbers with no plan. It took me three years and two injuries to learn that strength is built with structure, not willpower.',
        ar: 'بدأت رفع الأثقال في السابعة عشرة في صالة منزلية في جدة، أطارد الأرقام بلا خطة. احتجت ثلاث سنوات وإصابتين لأتعلم أن القوة تُبنى بالتخطيط لا بالحماس وحده.',
      },
      {
        en: "Since 2017 I've coached more than 340 people, from first-time lifters to national-level powerlifters. Most train with me online, and the results look the same: steady progress, fewer injuries, and training that fits real life.",
        ar: 'منذ 2017 درّبت أكثر من 340 شخصًا، من المبتدئين إلى رباعين على مستوى المنتخب. أغلبهم يتدربون معي أونلاين، والنتيجة واحدة: تقدّم ثابت، وإصابات أقل، وتمرين يناسب الحياة الواقعية.',
      },
      {
        en: "Every program I write is built for one person, adjusted each week from what you log, and explained so you know why you're doing it.",
        ar: 'كل برنامج أكتبه مصمّم لشخص واحد، أعدّله كل أسبوع حسب ما تسجّله، وأشرحه لتعرف سبب كل تمرين.',
      },
    ],
    specialties: [
      { en: 'Powerlifting', ar: 'رفع القوة' },
      { en: 'Strength for beginners', ar: 'القوة للمبتدئين' },
      { en: 'Hypertrophy', ar: 'بناء العضلات' },
      { en: 'Body recomposition', ar: 'إعادة تشكيل الجسم' },
      { en: 'Training around injuries', ar: 'التدريب الآمن مع الإصابات' },
      { en: 'Meet preparation', ar: 'التحضير للبطولات' },
    ],
    credentials: [
      { name: { en: 'Strength & conditioning specialist', ar: 'أخصائي القوة والتكييف البدني' }, detail: { en: 'Level 3', ar: 'المستوى الثالث' }, year: 2018 },
      { name: { en: 'Sports nutrition coach', ar: 'مدرب تغذية رياضية' }, detail: { en: 'Certified', ar: 'معتمد' }, year: 2020 },
      { name: { en: 'National powerlifting referee', ar: 'حكم وطني لرفع القوة' }, detail: { en: 'Category 2', ar: 'الفئة الثانية' }, year: 2022 },
      { name: { en: 'First aid & CPR', ar: 'الإسعافات الأولية والإنعاش' }, detail: { en: 'Renewed yearly', ar: 'تُجدّد سنويًا' }, year: 2025 },
    ],
  },

  platform: {
    lifts: [
      { name: { en: 'Squat', ar: 'السكوات' }, kg: 230 },
      { name: { en: 'Bench press', ar: 'ضغط البنش' }, kg: 150 },
      { name: { en: 'Deadlift', ar: 'الرفعة الميتة' }, kg: 270 },
    ],
    bodyweightKg: 93,
    meet: { en: 'Riyadh Open Powerlifting, 2024', ar: 'بطولة الرياض المفتوحة لرفع القوة، 2024' },
  },

  results: [
    {
      name: { en: 'Sara K.', ar: 'سارة ك.' }, goal: { en: 'Strength', ar: 'القوة' },
      metric: { en: 'Back squat', ar: 'السكوات الخلفي' }, unit: { en: 'kg', ar: 'كجم' },
      decimals: 1, weekly: progress(50, 92.5, 2.5),
    },
    {
      name: { en: 'Faisal A.', ar: 'فيصل أ.' }, goal: { en: 'Fat loss', ar: 'خسارة الدهون' },
      metric: { en: 'Body fat', ar: 'نسبة الدهون' }, unit: { en: '%', ar: '٪' },
      decimals: 1, lowerIsBetter: true, weekly: progress(27, 18.4, 0.1),
    },
    {
      name: { en: 'Lina M.', ar: 'لينا م.' }, goal: { en: 'Strength', ar: 'القوة' },
      metric: { en: 'Deadlift', ar: 'الرفعة الميتة' }, unit: { en: 'kg', ar: 'كجم' },
      weekly: progress(70, 125, 5),
    },
    {
      name: { en: 'Yousef H.', ar: 'يوسف ح.' }, goal: { en: 'Muscle', ar: 'بناء العضلات' },
      metric: { en: 'Lean mass', ar: 'الكتلة العضلية' }, unit: { en: 'kg', ar: 'كجم' },
      decimals: 1, weekly: progress(61, 65.8, 0.1),
    },
    {
      name: { en: 'Noor S.', ar: 'نور س.' }, goal: { en: 'Strength', ar: 'القوة' },
      metric: { en: 'Strict pull-ups', ar: 'العقلة الكاملة' }, unit: { en: 'reps', ar: 'تكرار' },
      weekly: progress(0, 9, 1, 'in'),
    },
    {
      name: { en: 'Khalid R.', ar: 'خالد ر.' }, goal: { en: 'Competition', ar: 'المنافسة' },
      metric: { en: 'Powerlifting total', ar: 'مجموع رفع القوة' }, unit: { en: 'kg', ar: 'كجم' },
      decimals: 1, weekly: progress(480, 552.5, 2.5),
    },
  ],

  method: [
    {
      title: { en: 'Assess', ar: 'التقييم' },
      body: { en: 'A movement screen, baseline lifts and your real schedule, before a single set is written.', ar: 'تقييم الحركة وقياس رفعاتك الأساسية وفهم جدولك الحقيقي قبل كتابة أي مجموعة.' },
    },
    {
      title: { en: 'Build', ar: 'البناء' },
      body: { en: 'Volume first. Work capacity and technique, built in four-week blocks.', ar: 'نبدأ بالحجم: نبني القدرة على التحمل والتقنية في كتل من أربعة أسابيع.' },
    },
    {
      title: { en: 'Peak', ar: 'الذروة' },
      body: { en: 'Intensity climbs, volume drops, and you test what you built.', ar: 'ترتفع الشدة وينخفض الحجم، ثم نختبر ما بنيناه.' },
    },
    {
      title: { en: 'Recover', ar: 'الاستشفاء' },
      body: { en: 'A planned deload and a review call. Then the next block starts higher.', ar: 'أسبوع تخفيف مخطط ومكالمة مراجعة، ثم تبدأ الكتلة التالية من مستوى أعلى.' },
    },
  ],

  programs: [
    {
      id: 'foundations',
      name: { en: 'Strength Foundations', ar: 'أساسيات القوة' },
      summary: { en: 'Learn the squat, bench and deadlift properly, and add weight every week.', ar: 'تعلّم السكوات والبنش والرفعة الميتة بالشكل الصحيح، وأضف وزنًا كل أسبوع.' },
      level: { en: 'Beginner', ar: 'مبتدئ' },
      weeks: 12, daysPerWeek: 3,
      focus: [{ en: 'Technique', ar: 'التقنية' }, { en: 'Linear progression', ar: 'تدرّج خطي' }],
      intensity: foundations,
      sample: {
        title: { en: 'Day 1 · Squat focus', ar: 'اليوم 1 · تركيز على السكوات' },
        exercises: [
          { name: { en: 'Back squat', ar: 'السكوات الخلفي' }, prescription: '3 × 5 @ RPE 7' },
          { name: { en: 'Bench press', ar: 'ضغط البنش' }, prescription: '3 × 5 @ RPE 7' },
          { name: { en: 'Romanian deadlift', ar: 'الرفعة الميتة الرومانية' }, prescription: '3 × 8' },
          { name: { en: 'Plank', ar: 'البلانك' }, prescription: '3 × 40″' },
        ],
      },
    },
    {
      id: 'hypertrophy',
      name: { en: 'Hypertrophy Block', ar: 'كتلة بناء العضلات' },
      summary: { en: 'Five focused sessions a week to add muscle without losing strength.', ar: 'خمس جلسات مركّزة أسبوعيًا لبناء العضلات دون خسارة القوة.' },
      level: { en: 'Intermediate', ar: 'متوسط' },
      weeks: 8, daysPerWeek: 5,
      focus: [{ en: 'Volume', ar: 'الحجم' }, { en: 'Upper / lower split', ar: 'تقسيم علوي وسفلي' }],
      intensity: hypertrophy,
      sample: {
        title: { en: 'Day 2 · Upper push', ar: 'اليوم 2 · دفع علوي' },
        exercises: [
          { name: { en: 'Incline bench press', ar: 'ضغط البنش المائل' }, prescription: '4 × 8 @ RPE 8' },
          { name: { en: 'Seated dumbbell press', ar: 'ضغط الدمبل جالسًا' }, prescription: '3 × 10' },
          { name: { en: 'Cable fly', ar: 'تفتيح الكابل' }, prescription: '3 × 12–15' },
          { name: { en: 'Lateral raise', ar: 'الرفرفة الجانبية' }, prescription: '4 × 15' },
          { name: { en: 'Triceps pushdown', ar: 'دفع الترايسبس بالكابل' }, prescription: '3 × 12' },
        ],
      },
      price: 299,
    },
    {
      id: 'meet-prep',
      name: { en: 'Meet Prep', ar: 'التحضير للبطولة' },
      summary: { en: 'A ten-week peak for your next competition, all the way to attempt selection.', ar: 'ذروة على مدى عشرة أسابيع لبطولتك القادمة، حتى اختيار المحاولات.' },
      level: { en: 'Advanced', ar: 'متقدم' },
      weeks: 10, daysPerWeek: 4,
      focus: [{ en: 'Peaking', ar: 'الوصول للذروة' }, { en: 'Attempt planning', ar: 'تخطيط المحاولات' }],
      intensity: meetPrep,
      sample: {
        title: { en: 'Day 1 · Heavy singles', ar: 'اليوم 1 · تكرارات فردية ثقيلة' },
        exercises: [
          { name: { en: 'Competition squat', ar: 'سكوات البطولة' }, prescription: '1 × 1 @ RPE 9 + 3 × 3 @ 80%' },
          { name: { en: 'Paused bench press', ar: 'ضغط البنش مع توقف' }, prescription: '1 × 1 @ RPE 9 + 4 × 2' },
          { name: { en: 'Deadlift', ar: 'الرفعة الميتة' }, prescription: '3 × 2 @ 85%' },
          { name: { en: 'Bracing drills', ar: 'تمارين شد الجذع' }, prescription: '3 × 5' },
        ],
      },
      price: 449,
    },
  ],

  plans: [
    {
      id: 'online',
      name: { en: 'Online Coaching', ar: 'تدريب أونلاين' },
      blurb: { en: 'Your program, weekly check-ins and form reviews, all in the app.', ar: 'برنامجك ومتابعة أسبوعية ومراجعة أدائك، كلها داخل التطبيق.' },
      pricePerMonth: 450, minMonths: 3,
      features: [
        { en: 'Custom program, updated weekly', ar: 'برنامج مخصص يُحدّث أسبوعيًا' },
        { en: 'Weekly check-in and video form reviews', ar: 'متابعة أسبوعية ومراجعة فيديوهات الأداء' },
        { en: 'Chat replies within 24 hours', ar: 'رد على المحادثة خلال 24 ساعة' },
        { en: 'Nutrition targets and calorie plan', ar: 'أهداف التغذية وخطة السعرات' },
      ],
      fit: { goals: ['strength', 'muscle', 'fatloss'], mode: 'online', support: 'weekly' },
    },
    {
      id: 'premium',
      name: { en: 'Premium Online', ar: 'أونلاين بريميوم' },
      blurb: { en: 'Everything in Online, plus daily accountability and a monthly video call.', ar: 'كل ما في باقة الأونلاين، مع متابعة يومية ومكالمة فيديو شهرية.' },
      pricePerMonth: 750, minMonths: 3, popular: true,
      features: [
        { en: 'Everything in Online Coaching', ar: 'كل ما في باقة التدريب أونلاين' },
        { en: 'Daily check-ins and same-day replies', ar: 'متابعة يومية وردود في اليوم نفسه' },
        { en: 'Monthly 30-minute video call', ar: 'مكالمة فيديو شهرية مدتها 30 دقيقة' },
        { en: 'Whoop and InBody reviews', ar: 'مراجعة بيانات Whoop وInBody' },
      ],
      fit: { goals: ['strength', 'muscle', 'fatloss', 'compete'], mode: 'online', support: 'daily' },
    },
    {
      id: 'hybrid',
      name: { en: 'Hybrid · Riyadh', ar: 'هجين · الرياض' },
      blurb: { en: 'Premium online coaching plus two sessions a week with me at my gym in Riyadh.', ar: 'تدريب أونلاين بريميوم مع جلستين أسبوعيًا معي في صالتي بالرياض.' },
      pricePerMonth: 1400, minMonths: 3, spotsLeft: 2,
      features: [
        { en: 'Everything in Premium Online', ar: 'كل ما في باقة أونلاين بريميوم' },
        { en: 'Two in-person sessions a week', ar: 'جلستان حضوريتان أسبوعيًا' },
        { en: 'Technique filming and analysis', ar: 'تصوير التقنية وتحليلها' },
        { en: 'Meet-day handling for competitors', ar: 'مرافقة يوم البطولة للمتنافسين' },
      ],
      fit: { goals: ['strength', 'compete', 'muscle'], mode: 'hybrid', support: 'daily' },
    },
  ],

  inbox: [
    {
      from: { en: 'Sara K.', ar: 'سارة ك.' }, week: 6, pr: true,
      text: { en: "Squat moved like an empty bar today. 80 kg for 3, and my knees didn't complain once.", ar: 'السكوات كان خفيفًا اليوم كأنه بار فارغ. 80 كجم لثلاث تكرارات، ولم تشتكِ ركبتاي أبدًا.' },
    },
    {
      from: { en: 'Yousef H.', ar: 'يوسف ح.' }, week: 3,
      text: { en: 'The video feedback on my bench is gold. Fixed my elbows in one session.', ar: 'ملاحظاتك على فيديو البنش لا تُقدّر بثمن. صحّحت وضع مرفقيّ في جلسة واحدة.' },
    },
    {
      from: { en: 'Faisal A.', ar: 'فيصل أ.' }, week: 11,
      text: { en: "Down 9 kg and stronger than when I started. Didn't think both were possible.", ar: 'خسرت 9 كجم وأنا أقوى مما كنت في البداية. لم أتخيل أن الاثنين ممكنان معًا.' },
    },
    {
      from: { en: 'Noor S.', ar: 'نور س.' }, week: 9, pr: true,
      text: { en: 'First strict pull-up!! Then I did two more.', ar: 'أول عقلة كاملة! ثم أدّيت اثنتين بعدها.' },
    },
    {
      from: { en: 'Lina M.', ar: 'لينا م.' }, week: 14, pr: true,
      text: { en: "125 kg deadlift. Two years ago I couldn't touch my toes.", ar: 'رفعة ميتة 125 كجم. قبل سنتين لم أكن أستطيع لمس أصابع قدميّ.' },
    },
    {
      from: { en: 'Khalid R.', ar: 'خالد ر.' }, week: 16,
      text: { en: 'Went 9 for 9 at the meet and added 72 kg to my total. Attempt selection was perfect.', ar: 'نجحت في المحاولات التسع كلها في البطولة وأضفت 72 كجم إلى مجموعي. اختيار المحاولات كان مثاليًا.' },
    },
  ],

  introCall: {
    minutes: 15,
    zone: 'Asia/Riyadh',
    timezone: { en: 'Riyadh time', ar: 'بتوقيت الرياض' },
    slots: { 0: ['17:00', '19:30'], 1: ['18:00'], 2: ['17:00', '20:00'], 3: ['19:00'], 6: ['11:00', '13:00'] },
  },

  faq: [
    {
      q: { en: 'Do I need a gym?', ar: 'هل أحتاج إلى اشتراك في صالة؟' },
      a: { en: 'For strength and hypertrophy programs, yes: a barbell, a rack and dumbbells. I also write home and hotel versions for travel weeks.', ar: 'لبرامج القوة وبناء العضلات نعم: بار وحامل ودمبلز. وأكتب أيضًا نسخًا للمنزل أو الفندق لأسابيع السفر.' },
    },
    {
      q: { en: "I'm a complete beginner. Is that okay?", ar: 'أنا مبتدئ تمامًا، هل هذا مناسب؟' },
      a: { en: 'Most of my trainees started there. We begin with technique and a weight that feels easy, then build.', ar: 'أغلب متدربيّ بدأوا من هنا. نبدأ بالتقنية وبوزن تشعر أنه سهل، ثم نبني تدريجيًا.' },
    },
    {
      q: { en: 'How do check-ins work?', ar: 'كيف تتم المتابعة الأسبوعية؟' },
      a: { en: 'Every Sunday you log your weight, sleep, energy and a short video of your top sets in the Coach HQ app. I reply with notes and next week’s changes.', ar: 'كل يوم أحد تسجّل وزنك ونومك وطاقتك وفيديو قصيرًا لأثقل مجموعاتك في تطبيق Coach HQ، وأرد عليك بالملاحظات وتعديلات الأسبوع القادم.' },
    },
    {
      q: { en: 'Can I pause my plan?', ar: 'هل يمكنني إيقاف اشتراكي مؤقتًا؟' },
      a: { en: "Yes, for travel, Ramadan or injury. Pauses don't count toward your minimum term.", ar: 'نعم، في السفر أو رمضان أو الإصابة. ولا تُحتسب فترة الإيقاف من الحد الأدنى للاشتراك.' },
    },
    {
      q: { en: 'Do you coach women?', ar: 'هل تدرّب النساء؟' },
      a: { en: 'Yes. About half of my online trainees are women, and I adjust programs around your cycle if you want that.', ar: 'نعم، نحو نصف متدربيّ أونلاين من النساء، وأعدّل البرامج حسب الدورة الشهرية عند الرغبة.' },
    },
  ],

  socials: [
    { network: 'instagram', url: 'https://instagram.com/' },
    { network: 'youtube', url: 'https://youtube.com/' },
    { network: 'x', url: 'https://x.com/' },
  ],
};

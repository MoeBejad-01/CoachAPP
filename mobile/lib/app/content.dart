// What the Body tab teaches: each muscle group (in plain, motivating words),
// Training 101 (the ideas behind a program), healthy habits and the quiz.
// English and Arabic. General information, not medical advice.

import 'package:material_ui/material_ui.dart';

import '../widgets/anatomy_shapes.dart';
import '../widgets/glyph.dart';
import 'settings.dart';

class MuscleInfo {
  const MuscleInfo({
    required this.name,
    required this.nickname,
    required this.why,
    required this.moves,
    required this.tip,
    required this.stretch,
    required this.fact,
  });
  final String name, nickname, why, tip, stretch, fact;
  final List<String> moves;
}

class QuizQuestion {
  const QuizQuestion(this.question, this.answer, this.view);
  final String question;
  final MuscleGroup answer;
  final BodyView view;
}

/// A short read with a symbol (and, for breathing, a guided exercise).
class Lesson {
  const Lesson({required this.id, required this.icon, required this.tone, required this.title, required this.summary, required this.points, this.extra});
  final String id, title, summary;
  final IconData icon;
  final Tone tone;
  final List<String> points;

  /// 'breathing' shows the breathing guide; 'rpe' shows the RPE scale.
  final String? extra;
}

MuscleInfo muscleInfo(MuscleGroup g) => _muscles[AppSettings.instance.lang]![g]!;
List<QuizQuestion> quizQuestions() => _quiz[AppSettings.instance.lang]!;
List<Lesson> trainingLessons() => _training[AppSettings.instance.lang]!;
List<Lesson> habitLessons() => _habits[AppSettings.instance.lang]!;

/// Colour for each muscle group, used across the Body tab.
const muscleTone = <MuscleGroup, Tone>{
  MuscleGroup.chest: Tone.blue,
  MuscleGroup.shoulders: Tone.sky,
  MuscleGroup.arms: Tone.indigo,
  MuscleGroup.back: Tone.teal,
  MuscleGroup.core: Tone.orange,
  MuscleGroup.glutes: Tone.pink,
  MuscleGroup.legs: Tone.green,
};

const _muscles = <Lang, Map<MuscleGroup, MuscleInfo>>{
  Lang.en: {
    MuscleGroup.chest: MuscleInfo(
      name: 'Chest',
      nickname: 'Your pushing power',
      why: 'Every push comes from here: a heavy door, a stroller, getting yourself up off the floor.',
      moves: ['Push-up', 'Bench press', 'Incline press'],
      tip: 'Keep your shoulder blades pinned back and down. Let the chest do the work, not the shoulders.',
      stretch: 'Forearm on a door frame, step through gently for 30 seconds.',
      fact: 'A push-up trains your chest, shoulders, triceps and core at once. It’s one of the best moves you can do anywhere.',
    ),
    MuscleGroup.shoulders: MuscleInfo(
      name: 'Shoulders',
      nickname: 'The 360° joint',
      why: 'Lift, reach and throw in every direction, and keep your posture tall.',
      moves: ['Overhead press', 'Lateral raise', 'Face pull'],
      tip: 'Press straight up over your head and keep your ribs down so your lower back doesn’t arch.',
      stretch: 'Pull one arm across your chest for 30 seconds each side.',
      fact: 'Your shoulder moves more freely than any other joint. Strong muscles around it keep that freedom pain-free.',
    ),
    MuscleGroup.arms: MuscleInfo(
      name: 'Arms',
      nickname: 'Bend and straighten',
      why: 'Biceps bend your elbow to carry and pull. Triceps straighten it to push.',
      moves: ['Curl', 'Chin-up', 'Close-grip push-up'],
      tip: 'Keep your elbows still at your sides when you curl. Swinging takes the work away from your biceps.',
      stretch: 'Hand behind your head, gently press the elbow back with your other hand.',
      fact: 'Triceps make up about two-thirds of your upper arm. Want stronger arms? Train them as much as your biceps.',
    ),
    MuscleGroup.back: MuscleInfo(
      name: 'Back',
      nickname: 'Your posture builder',
      why: 'Pulls you strong and tall, and balances out all the sitting and phone time.',
      moves: ['Row', 'Pull-up', 'Lat pulldown'],
      tip: 'Pull with your elbows, not your hands, and squeeze your shoulder blades together at the end.',
      stretch: 'Child’s pose: knees down, arms long in front, breathe into your back for 30 seconds.',
      fact: 'Your lats are the widest muscles of your upper body. Training them builds the classic V-shape.',
    ),
    MuscleGroup.core: MuscleInfo(
      name: 'Core',
      nickname: 'Your power centre',
      why: 'Holds your spine steady and passes power between your legs and arms. Every lift starts here.',
      moves: ['Plank', 'Dead bug', 'Loaded carry'],
      tip: 'Brace as if someone’s about to poke your stomach: tight all the way around, and keep breathing.',
      stretch: 'Lie face down and gently press your chest up for a few slow breaths.',
      fact: 'A strong core is about staying steady, not endless crunches. Planks and carries build the core you actually use.',
    ),
    MuscleGroup.glutes: MuscleInfo(
      name: 'Glutes',
      nickname: 'The engine',
      why: 'Your biggest muscle drives every step, stair and jump, and helps protect your lower back and knees.',
      moves: ['Hip thrust', 'Squat', 'Step-up'],
      tip: 'At the top of a hip thrust, tuck your chin and squeeze for one second before you lower.',
      stretch: 'Lying down, cross one ankle over the other knee and pull gently.',
      fact: 'The gluteus maximus is the largest muscle in your body. Long days of sitting let it switch off; training wakes it up.',
    ),
    MuscleGroup.legs: MuscleInfo(
      name: 'Legs',
      nickname: 'Your foundation',
      why: 'Quads, hamstrings and calves carry you everywhere and keep you independent for life.',
      moves: ['Squat', 'Lunge', 'Romanian deadlift'],
      tip: 'On squats, keep your whole foot on the floor and let your knees travel forward over your toes.',
      stretch: 'Heel on a low step, lean forward with a straight back for 30 seconds.',
      fact: 'Strong legs help you stay active and independent as you get older. Every squat counts.',
    ),
  },
  Lang.ar: {
    MuscleGroup.chest: MuscleInfo(
      name: 'الصدر',
      nickname: 'قوة الدفع لديك',
      why: 'كل دفعة تبدأ من هنا: باب ثقيل، عربة أطفال، أو النهوض عن الأرض.',
      moves: ['الضغط', 'ضغط البنش', 'الضغط المائل'],
      tip: 'ثبّت لوحي كتفيك للخلف والأسفل، ودع الصدر يقوم بالعمل لا الكتفين.',
      stretch: 'ضع ساعدك على إطار الباب وتقدّم بلطف لمدة 30 ثانية.',
      fact: 'تمرين الضغط يدرّب الصدر والأكتاف والتراي والجذع معًا، وهو من أفضل التمارين التي يمكنك أداؤها في أي مكان.',
    ),
    MuscleGroup.shoulders: MuscleInfo(
      name: 'الأكتاف',
      nickname: 'مفصل الـ360 درجة',
      why: 'ترفع وتمد وترمي في كل اتجاه، وتحافظ على قوامك مستقيمًا.',
      moves: ['ضغط الكتف', 'الرفرفة الجانبية', 'سحب الوجه'],
      tip: 'ادفع للأعلى بخط مستقيم فوق رأسك، وأبقِ أضلاعك للأسفل حتى لا يتقوس أسفل ظهرك.',
      stretch: 'اسحب ذراعًا أمام صدرك 30 ثانية لكل جانب.',
      fact: 'الكتف يتحرك بحرية أكثر من أي مفصل آخر، والعضلات القوية حوله تحافظ على هذه الحرية دون ألم.',
    ),
    MuscleGroup.arms: MuscleInfo(
      name: 'الذراعان',
      nickname: 'الثني والمد',
      why: 'الباي يثني المرفق للحمل والسحب، والتراي يمدّه للدفع.',
      moves: ['تمرين الثني', 'العقلة', 'الضغط بقبضة ضيقة'],
      tip: 'أبقِ مرفقيك ثابتين بجانبك أثناء الثني، فالتأرجح يسرق العمل من عضلة الباي.',
      stretch: 'ضع يدك خلف رأسك واضغط المرفق للخلف بلطف باليد الأخرى.',
      fact: 'التراي يشكّل نحو ثلثي العضد. تريد ذراعين أقوى؟ درّبه بقدر ما تدرّب الباي.',
    ),
    MuscleGroup.back: MuscleInfo(
      name: 'الظهر',
      nickname: 'صانع القوام',
      why: 'يشدّك بقوة واستقامة، ويوازن ساعات الجلوس واستخدام الهاتف.',
      moves: ['التجديف', 'العقلة', 'السحب العلوي'],
      tip: 'اسحب بمرفقيك لا بيديك، واضغط لوحي كتفيك معًا في النهاية.',
      stretch: 'وضعية الطفل: اركع ومدّ ذراعيك للأمام وتنفّس نحو ظهرك 30 ثانية.',
      fact: 'العضلة الظهرية العريضة أعرض عضلة في الجزء العلوي من جسمك، وتدريبها يصنع شكل حرف V الشهير.',
    ),
    MuscleGroup.core: MuscleInfo(
      name: 'الجذع',
      nickname: 'مركز القوة',
      why: 'يثبّت عمودك الفقري وينقل القوة بين ساقيك وذراعيك، وكل رفعة تبدأ من هنا.',
      moves: ['البلانك', 'تمرين الحشرة الميتة', 'المشي بالأوزان'],
      tip: 'شدّ بطنك كأن أحدًا سيلكزه: مشدود من كل الجهات، واستمر في التنفس.',
      stretch: 'استلقِ على بطنك وارفع صدرك بلطف لبضعة أنفاس بطيئة.',
      fact: 'قوة الجذع تعني الثبات لا تمارين البطن التي لا تنتهي، والبلانك والمشي بالأوزان يبنيان الجذع الذي تستخدمه فعلًا.',
    ),
    MuscleGroup.glutes: MuscleInfo(
      name: 'الألوية',
      nickname: 'المحرّك',
      why: 'أكبر عضلة لديك تدفع كل خطوة ودرجة وقفزة، وتساعد على حماية أسفل الظهر والركبتين.',
      moves: ['دفع الورك', 'القرفصاء', 'الصعود على صندوق'],
      tip: 'في أعلى دفع الورك، أنزل ذقنك قليلًا واضغط لثانية قبل النزول.',
      stretch: 'استلقِ وضع كاحلًا فوق الركبة الأخرى واسحب بلطف.',
      fact: 'العضلة الألوية الكبرى أكبر عضلة في جسمك، والجلوس الطويل يجعلها تخمل، والتمرين يوقظها.',
    ),
    MuscleGroup.legs: MuscleInfo(
      name: 'الساقان',
      nickname: 'أساسك',
      why: 'الفخذ الأمامي والخلفي والسمانة تحملك إلى كل مكان، وتحافظ على استقلاليتك مدى الحياة.',
      moves: ['القرفصاء', 'الطعنات', 'الرفعة الرومانية'],
      tip: 'في القرفصاء، أبقِ قدمك كاملة على الأرض ودع ركبتيك تتقدمان فوق أصابع قدميك.',
      stretch: 'ضع كعبك على درجة منخفضة وانحنِ للأمام بظهر مستقيم 30 ثانية.',
      fact: 'الساقان القويتان تساعدانك على البقاء نشيطًا ومستقلًا مع التقدم في العمر، وكل قرفصاء تُحسب.',
    ),
  },
};

const _training = <Lang, List<Lesson>>{
  Lang.en: [
    Lesson(
      id: 'rpe',
      icon: Icons.speed_rounded,
      tone: Tone.orange,
      title: 'RPE: how hard was that?',
      summary: 'Rate each set from 1 to 10.',
      extra: 'rpe',
      points: [
        'RPE stands for Rate of Perceived Exertion: how hard a set felt.',
        '10 means you couldn’t do another rep. 8 means about 2 reps left in the tank.',
        'Your coach uses RPE so the weight fits how you feel on the day.',
      ],
    ),
    Lesson(
      id: 'sets',
      icon: Icons.repeat_rounded,
      tone: Tone.blue,
      title: 'Sets and reps',
      summary: '“4 × 8” means 4 sets of 8.',
      points: [
        'A rep is one lift. A set is a group of reps done in a row.',
        '“6–8” means: choose a weight you can lift at least 6 times and at most 8.',
        'Reached the top of the range on every set? Next time, add a little weight.',
      ],
    ),
    Lesson(
      id: 'rest',
      icon: Icons.timer_rounded,
      tone: Tone.indigo,
      title: 'Rest is part of the set',
      summary: 'Recover fully, lift better.',
      points: [
        'Heavy sets need 2–3 minutes; lighter ones about 1–2.',
        'Resting fully lets you lift more, and lifting more builds more.',
        'The rest timer starts by itself when you tick a set.',
      ],
    ),
    Lesson(
      id: 'overload',
      icon: Icons.trending_up_rounded,
      tone: Tone.green,
      title: 'Progressive overload',
      summary: 'A little more, week after week.',
      points: [
        'Muscles grow when you ask a bit more of them: one more rep, a little more weight, cleaner form.',
        'Small steps every week add up to big changes.',
        'The “last time” numbers in each workout show you what to beat.',
      ],
    ),
    Lesson(
      id: 'warmup',
      icon: Icons.local_fire_department_rounded,
      tone: Tone.red,
      title: 'Warm-up sets',
      summary: 'Build up to your working weight.',
      points: [
        'Do 2–3 lighter sets of your first exercise before the real ones.',
        'They don’t count as work sets, so you don’t need to log them.',
        'They get your joints ready and groove the movement.',
      ],
    ),
    Lesson(
      id: 'recovery',
      icon: Icons.spa_rounded,
      tone: Tone.purple,
      title: 'You grow while you rest',
      summary: 'Sleep, food and easier weeks.',
      points: [
        'Training is the signal. Sleep, food and rest are when you rebuild stronger.',
        'Every few weeks your coach may plan an easier week. That’s on purpose.',
        'Feeling run down? Log it in your daily habits so your coach can adjust.',
      ],
    ),
  ],
  Lang.ar: [
    Lesson(
      id: 'rpe',
      icon: Icons.speed_rounded,
      tone: Tone.orange,
      title: 'مقياس الجهد (RPE): ما مدى صعوبتها؟',
      summary: 'قيّم كل مجموعة من 1 إلى 10.',
      extra: 'rpe',
      points: [
        'مقياس الجهد (RPE) يعني تقييم الجهد المُدرَك: مدى صعوبة المجموعة بالنسبة لك.',
        '10 تعني أنك لا تستطيع تكرارًا آخر، و8 تعني أنه بقي لديك نحو تكرارين.',
        'يستخدم مدربك مقياس الجهد ليناسب الوزن شعورك في ذلك اليوم.',
      ],
    ),
    Lesson(
      id: 'sets',
      icon: Icons.repeat_rounded,
      tone: Tone.blue,
      title: 'المجموعات والتكرارات',
      summary: '«4 × 8» تعني 4 مجموعات من 8 تكرارات.',
      points: [
        'التكرار رفعة واحدة، والمجموعة عدد من التكرارات المتتالية.',
        '«6–8» تعني: اختر وزنًا ترفعه 6 مرات على الأقل و8 على الأكثر.',
        'وصلت إلى أعلى النطاق في كل المجموعات؟ أضف وزنًا قليلًا في المرة القادمة.',
      ],
    ),
    Lesson(
      id: 'rest',
      icon: Icons.timer_rounded,
      tone: Tone.indigo,
      title: 'الراحة جزء من المجموعة',
      summary: 'تعافَ تمامًا، وارفع أفضل.',
      points: [
        'المجموعات الثقيلة تحتاج 2–3 دقائق، والأخف نحو 1–2 دقيقة.',
        'الراحة الكاملة تتيح لك رفع المزيد، ورفع المزيد يبني المزيد.',
        'مؤقت الراحة يبدأ تلقائيًا عندما تعلّم مجموعة كمنجزة.',
      ],
    ),
    Lesson(
      id: 'overload',
      icon: Icons.trending_up_rounded,
      tone: Tone.green,
      title: 'الزيادة التدريجية',
      summary: 'أكثر قليلًا، أسبوعًا بعد أسبوع.',
      points: [
        'تنمو العضلات عندما تطلب منها أكثر قليلًا: تكرارًا إضافيًا، وزنًا أكبر قليلًا، أداءً أنظف.',
        'الخطوات الصغيرة كل أسبوع تتراكم لتصنع فرقًا كبيرًا.',
        'أرقام «المرة الماضية» في كل تمرين تُريك ما عليك تجاوزه.',
      ],
    ),
    Lesson(
      id: 'warmup',
      icon: Icons.local_fire_department_rounded,
      tone: Tone.red,
      title: 'مجموعات الإحماء',
      summary: 'تدرّج حتى تصل إلى وزن العمل.',
      points: ['أدِّ 2–3 مجموعات أخف من أول تمرين قبل المجموعات الفعلية.', 'لا تُحسب كمجموعات عمل، فلا داعي لتسجيلها.', 'تهيّئ مفاصلك وتُتقن الحركة.'],
    ),
    Lesson(
      id: 'recovery',
      icon: Icons.spa_rounded,
      tone: Tone.purple,
      title: 'تنمو وأنت ترتاح',
      summary: 'النوم والطعام والأسابيع الأخف.',
      points: [
        'التمرين هو الإشارة، والنوم والطعام والراحة هي وقت إعادة البناء بشكل أقوى.',
        'كل بضعة أسابيع قد يخطط مدربك لأسبوع أخف، وذلك عن قصد.',
        'تشعر بالإنهاك؟ سجّله في عاداتك اليومية ليعدّل مدربك الخطة.',
      ],
    ),
  ],
};

const _habits = <Lang, List<Lesson>>{
  Lang.en: [
    Lesson(
      id: 'water',
      icon: Icons.water_drop_rounded,
      tone: Tone.sky,
      title: 'Drink through the day',
      summary: 'Little and often.',
      points: [
        'Sip water regularly instead of a lot at once.',
        'Pale yellow urine is a good sign you’re drinking enough.',
        'Drink more on hot days and when you train. Fruit, vegetables and soup count too.',
      ],
    ),
    Lesson(
      id: 'sleep',
      icon: Icons.bedtime_rounded,
      tone: Tone.indigo,
      title: 'Sleep is training too',
      summary: 'Where the progress happens.',
      points: [
        'Most adults need 7–9 hours; teenagers need 8–10.',
        'Your muscles repair and grow while you sleep.',
        'Same bedtime every night, screens away 30 minutes before.',
      ],
    ),
    Lesson(
      id: 'protein',
      icon: Icons.egg_alt_rounded,
      tone: Tone.orange,
      title: 'Protein at every meal',
      summary: 'Fuel for recovery.',
      points: [
        'Protein helps your muscles recover after training.',
        'Good sources: eggs, fish, chicken, yogurt, lentils and beans.',
        'Spread it across your meals. Your coach can tell you how much is right for you.',
      ],
    ),
    Lesson(
      id: 'steps',
      icon: Icons.directions_walk_rounded,
      tone: Tone.teal,
      title: 'Move more, sit less',
      summary: 'Every walk counts.',
      points: [
        'Even 5 minutes of walking adds up.',
        'Take the stairs, walk on phone calls, park a little further away.',
        'Stand up and move for a minute every half hour of sitting.',
      ],
    ),
    Lesson(
      id: 'breathe',
      icon: Icons.air_rounded,
      tone: Tone.blue,
      title: 'Breathe to calm down',
      summary: 'Try it now: 1 minute.',
      extra: 'breathing',
      points: ['Box breathing: in for 4, hold for 4, out for 4, hold for 4.', 'A few rounds calm your body before sleep or a big lift.'],
    ),
    Lesson(
      id: 'soreness',
      icon: Icons.healing_rounded,
      tone: Tone.pink,
      title: 'Sore after training?',
      summary: 'Normal, and it passes.',
      points: [
        'Feeling sore 1–3 days after a new or harder workout is normal.',
        'Gentle movement, sleep and good food help it pass.',
        'Sharp pain, swelling or pain that gets worse is different: tell your coach.',
      ],
    ),
  ],
  Lang.ar: [
    Lesson(
      id: 'water',
      icon: Icons.water_drop_rounded,
      tone: Tone.sky,
      title: 'اشرب على مدار اليوم',
      summary: 'قليلًا وباستمرار.',
      points: [
        'اشرب الماء على دفعات بدلًا من كمية كبيرة مرة واحدة.',
        'البول الأصفر الفاتح علامة جيدة على أنك تشرب ما يكفي.',
        'اشرب أكثر في الأيام الحارة وعند التمرين، والفواكه والخضروات والشوربة تُحسب أيضًا.',
      ],
    ),
    Lesson(
      id: 'sleep',
      icon: Icons.bedtime_rounded,
      tone: Tone.indigo,
      title: 'النوم جزء من التمرين',
      summary: 'هنا يحدث التقدّم.',
      points: [
        'يحتاج معظم البالغين 7–9 ساعات، والمراهقون 8–10 ساعات.',
        'تتعافى عضلاتك وتنمو أثناء النوم.',
        'موعد نوم ثابت كل ليلة، وابتعد عن الشاشات قبل النوم بـ30 دقيقة.',
      ],
    ),
    Lesson(
      id: 'protein',
      icon: Icons.egg_alt_rounded,
      tone: Tone.orange,
      title: 'بروتين في كل وجبة',
      summary: 'وقود التعافي.',
      points: [
        'يساعد البروتين عضلاتك على التعافي بعد التمرين.',
        'مصادر جيدة: البيض والسمك والدجاج والزبادي والعدس والفاصولياء.',
        'وزّعه على وجباتك، ويستطيع مدربك أن يحدد لك الكمية المناسبة.',
      ],
    ),
    Lesson(
      id: 'steps',
      icon: Icons.directions_walk_rounded,
      tone: Tone.teal,
      title: 'تحرّك أكثر واجلس أقل',
      summary: 'كل مشية تُحسب.',
      points: ['حتى 5 دقائق من المشي تتراكم.', 'استخدم الدرج، وامشِ أثناء المكالمات، واركن أبعد قليلًا.', 'قف وتحرك دقيقة كل نصف ساعة من الجلوس.'],
    ),
    Lesson(
      id: 'breathe',
      icon: Icons.air_rounded,
      tone: Tone.blue,
      title: 'تنفّس لتهدأ',
      summary: 'جرّبه الآن: دقيقة واحدة.',
      extra: 'breathing',
      points: ['التنفس المربّع: شهيق 4، احبس 4، زفير 4، احبس 4.', 'بضع جولات تهدّئ جسمك قبل النوم أو قبل رفعة كبيرة.'],
    ),
    Lesson(
      id: 'soreness',
      icon: Icons.healing_rounded,
      tone: Tone.pink,
      title: 'هل تشعر بألم بعد التمرين؟',
      summary: 'أمر طبيعي ويزول.',
      points: [
        'الألم العضلي بعد 1–3 أيام من تمرين جديد أو أصعب أمر طبيعي.',
        'الحركة الخفيفة والنوم والطعام الجيد تساعد على زواله.',
        'الألم الحاد أو التورم أو الألم الذي يزداد أمر مختلف: أخبر مدربك.',
      ],
    ),
  ],
};

const _quiz = <Lang, List<QuizQuestion>>{
  Lang.en: [
    QuizQuestion('Which muscle does most of the work when you climb stairs?', MuscleGroup.glutes, BodyView.back),
    QuizQuestion('Which muscle helps you push a heavy door open?', MuscleGroup.chest, BodyView.front),
    QuizQuestion('Which muscles keep you sitting up tall?', MuscleGroup.back, BodyView.back),
    QuizQuestion('Which muscles bend your elbow to carry bags?', MuscleGroup.arms, BodyView.front),
    QuizQuestion('Which muscles keep your spine steady when you lift a box?', MuscleGroup.core, BodyView.front),
    QuizQuestion('Which muscle lifts your arm to reach a high shelf?', MuscleGroup.shoulders, BodyView.front),
    QuizQuestion('Which muscles push you off the ground when you jump?', MuscleGroup.legs, BodyView.front),
  ],
  Lang.ar: [
    QuizQuestion('أي عضلة تقوم بمعظم العمل عند صعود الدرج؟', MuscleGroup.glutes, BodyView.back),
    QuizQuestion('أي عضلة تساعدك على دفع باب ثقيل؟', MuscleGroup.chest, BodyView.front),
    QuizQuestion('أي عضلات تبقيك جالسًا باستقامة؟', MuscleGroup.back, BodyView.back),
    QuizQuestion('أي عضلات تثني مرفقك لحمل الأكياس؟', MuscleGroup.arms, BodyView.front),
    QuizQuestion('أي عضلات تثبّت عمودك الفقري عند رفع صندوق؟', MuscleGroup.core, BodyView.front),
    QuizQuestion('أي عضلة ترفع ذراعك للوصول إلى رف عالٍ؟', MuscleGroup.shoulders, BodyView.front),
    QuizQuestion('أي عضلات تدفعك عن الأرض عند القفز؟', MuscleGroup.legs, BodyView.front),
  ],
};

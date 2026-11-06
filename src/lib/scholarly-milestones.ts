import { MatnCourse } from './curriculum-data'

export interface ScholarlyStation {
  level: number
  id: string
  title: string
  subtitle: string
  requiredCourses: number
  description: string
  scholarlyMilestone: string
  unlockedBadge: {
    title: string
    icon: string
    desc: string
  }
  perks: string[]
}

export const SCHOLARLY_STATIONS: ScholarlyStation[] = [
  {
    level: 1,
    id: 'station_1',
    title: 'طالب مبادر بهمة عالية',
    subtitle: 'محطة الاستفتاح ومداخل العلوم',
    requiredCourses: 0,
    description: 'إحكام المداخل، ضبط مبادئ الفنون، واكتساب عادة المدارسة اليومية وضبط النفس على الجثو بالركب عند المتون.',
    scholarlyMilestone: 'إتمام من متن إلى 5 متون تأسيسية في أصول الدين واللسان العربي.',
    unlockedBadge: {
      title: 'شارة البداية المباركة',
      icon: '🌱',
      desc: 'وسام الانطلاق في رحلة السند والتأصيل المنهجي.',
    },
    perks: [
      'فتح كشكول الشوارد والفوائد المخصص',
      'شهادة إتمام أول متن بالسند المتصل',
      'الانضمام لمجلس المذاكرة والمنافسة الحية',
    ],
  },
  {
    level: 2,
    id: 'station_2',
    title: 'سائر في طريق التأصيل',
    subtitle: 'محطة البناء والتحصيل المنهجي',
    requiredCourses: 6,
    description: 'تجاوز عتبة المداخل، وحيازة الأصول الأولى في العقيدة والفقه والحديث والنحو، وتكوين نواة الملكة العلمية.',
    scholarlyMilestone: 'إتمام 6 متون فأكثر، وتغطية 4 علوم شرعية مختلفة على الأقل بالتوازي.',
    unlockedBadge: {
      title: 'وسام وتد التأصيل',
      icon: '🛡️',
      desc: 'وسام الثبات وتأسيس القواعد المحكمة بلا اضطراب.',
    },
    perks: [
      'شهادة اجتياز مرحلة الأساس الأولى معتمدة بختم سَنَد',
      'شارة «سائر في التأصيل» المضيئة بجوار اسمك في المجلس',
      'إمكانية تصدير كشكول الفوائد كحاشية ورقية مطبوعة',
    ],
  },
  {
    level: 3,
    id: 'station_3',
    title: 'متفنن ضابط للأصول',
    subtitle: 'محطة التمكن وتخريج الفروع',
    requiredCourses: 16,
    description: 'دراسة المتون المتوسطة، التعاطي مع مسائل الخلاف، فهم مسالك التعليل، ورسوخ قواعد الاستنباط.',
    scholarlyMilestone: 'إتمام 16 متناً فأكثر، والتفنن في أمهات الأبواب الفقهية والأصولية والحديثية.',
    unlockedBadge: {
      title: 'وسام حارس الأصول والضبط',
      icon: '⚖️',
      desc: 'وسام التمكن المنهجي والقدرة على ربط الفروع بأصولها.',
    },
    perks: [
      'إجازة ضبط المتون المتوسطة بالسند',
      'رتبة «محرر ومراجع» في مجالس المذاكرة العلمية',
      'وسام تكريمي خاص في لوحة الشرف والمنافسة',
      'فتح المراجع والتحقيقات النادرة في خزانة المتن',
    ],
  },
  {
    level: 4,
    id: 'station_4',
    title: 'راسخ في المتون والمناهج',
    subtitle: 'محطة الإتقان والتحرير العالي',
    requiredCourses: 36,
    description: 'الانتهاء من أمهات المتون الكبرى والمطولات، التحرير، وامتلاك أدوات النظر والاستدلال المقيد.',
    scholarlyMilestone: 'إتمام 36 متناً فأكثر، وبلوغ مرتبة الرسوخ العلمي والإحاطة بمقاصد الشريعة.',
    unlockedBadge: {
      title: 'تاج الرسوخ والضبط التام',
      icon: '👑',
      desc: 'أعلى أوسمة التأصيل لرواد الهمة وأهل الإتقان.',
    },
    perks: [
      'السند الإجازي الأكبر لمنصة سَنَد موقعاً ومختوماً',
      'حفر اسمك في اللوحة الذهبية الخالدة للمنصة',
      'استحقاق لقب «عميد متدارسي سَنَد»',
      'شهادة مجلد الحواشي الشاملة لكافة ما قيدته في رحلتك',
    ],
  },
]

export interface ScholarlyBadge {
  id: string
  title: string
  category: 'station' | 'discipline' | 'habit'
  categoryLabel: string
  icon: string
  color: string
  description: string
  howToUnlock: string
  isUnlocked: boolean
  progressText?: string
}

export function evaluateStudentBadges(params: {
  completedCourses: MatnCourse[]
  totalStudyMinutes: number
  streak: number
  notesCount: number
}): {
  allBadges: ScholarlyBadge[]
  unlockedCount: number
  currentStation: ScholarlyStation
  nextStation: ScholarlyStation | null
  coursesUntilNextStation: number
  progressToNextStationPercent: number
} {
  const { completedCourses, totalStudyMinutes, streak, notesCount } = params
  const count = completedCourses.length

  // تحديد المحطة الحالية
  let currentStationIndex = 0
  for (let i = SCHOLARLY_STATIONS.length - 1; i >= 0; i--) {
    if (count >= SCHOLARLY_STATIONS[i].requiredCourses) {
      currentStationIndex = i
      break
    }
  }

  const currentStation = SCHOLARLY_STATIONS[currentStationIndex]
  const nextStation = currentStationIndex < SCHOLARLY_STATIONS.length - 1 ? SCHOLARLY_STATIONS[currentStationIndex + 1] : null

  let coursesUntilNextStation = 0
  let progressToNextStationPercent = 100

  if (nextStation) {
    const currentBase = currentStation.requiredCourses
    const target = nextStation.requiredCourses
    coursesUntilNextStation = Math.max(0, target - count)
    const span = target - currentBase
    const achievedInSpan = count - currentBase
    progressToNextStationPercent = Math.min(100, Math.max(0, Math.round((achievedInSpan / (span || 1)) * 100)))
  }

  // فحص شارات الفنون والعلوم التخصصية بناءً على المتون المنجزة
  const hasNahw = completedCourses.some((c) => 
    c.categorySlug === 'arabic-language' || c.category?.includes('نحو') || c.slug === 'al-ajrumiyyah' || c.title?.includes('نحو') || c.title?.includes('الآجرومية')
  )
  const hasSarf = completedCourses.some((c) => 
    c.title?.includes('صرف') || c.title?.includes('الأفعال') || c.title?.includes('تصريف') || c.slug?.includes('sarf')
  )
  const hasBalaghah = completedCourses.some((c) => 
    c.title?.includes('بلاغ') || c.title?.includes('البيان') || c.title?.includes('المكنون') || c.slug?.includes('balaghah')
  )
  const aqeedahCourses = completedCourses.filter((c) => 
    c.categorySlug === 'aqeedah' || c.category?.includes('عقيد') || c.category?.includes('توحيد') || c.slug?.includes('usul-thalathah')
  )
  const hasAqeedah = aqeedahCourses.length >= 1
  const hasAqeedahAdv = aqeedahCourses.length >= 2

  const hasUsul = completedCourses.some((c) => 
    c.categorySlug === 'usul-al-fiqh' || c.category?.includes('أصول الفقه') || c.slug?.includes('usul') || c.title?.includes('الورقات')
  )
  const hasQawaid = completedCourses.some((c) => 
    c.categorySlug === 'fiqh-rules' || c.category?.includes('قواعد') || c.title?.includes('قواعد') || c.title?.includes('منظومة القواعد')
  )
  const hadithCourses = completedCourses.filter((c) => 
    c.categorySlug === 'hadith' || c.category?.includes('حديث') || c.slug === 'al-bayquniyyah'
  )
  const hasHadith = hadithCourses.length >= 1
  const hasHadithMutun = completedCourses.some((c) => 
    c.title?.includes('الأربعين') || c.title?.includes('عمدة الأحكام') || c.title?.includes('بلوغ المرام') || c.title?.includes('رياض الصالحين')
  )
  const hasFiqh = completedCourses.some((c) => 
    c.categorySlug === 'fiqh' || c.category?.includes('فقه') || c.slug === 'bidayat-al-mutafaqqih'
  )
  const hasQuranSciences = completedCourses.some((c) => 
    c.categorySlug === 'quran-sciences' || c.category?.includes('قرآن') || c.category?.includes('تفسير')
  )
  const hasTajweed = completedCourses.some((c) => 
    c.title?.includes('تجويد') || c.title?.includes('تحفة الأطفال') || c.title?.includes('الجزرية')
  )
  const hasManners = completedCourses.some((c) => 
    c.categorySlug === 'manners' || c.category?.includes('آداب') || c.category?.includes('تزكية') || c.title?.includes('حلية')
  )
  const hasSeerah = completedCourses.some((c) => 
    c.categorySlug === 'seerah-history' || c.category?.includes('سيرة') || c.title?.includes('السيرة')
  )

  const badgesList: ScholarlyBadge[] = [
    // ══════════════════════════════════════════════════════
    // 1. أوسمة المحطات والتأصيل الكبرى (Station Milestones)
    // ══════════════════════════════════════════════════════
    {
      id: 'badge_first_step',
      title: 'شارة البداية المباركة',
      category: 'station',
      categoryLabel: 'أوسمة المحطات',
      icon: '🌱',
      color: 'from-emerald-500 to-teal-600',
      description: 'تُمنح لطالب العلم فور إنجازه أول متن وضبطه بالسند المتصل.',
      howToUnlock: 'أنجز أول متن علمي في المنصة.',
      isUnlocked: count >= 1,
      progressText: count >= 1 ? 'مكتسبة بنجاح' : 'أنجز متناً واحداً لفتحها',
    },
    {
      id: 'badge_station_3_courses',
      title: 'وسام الطالب المبتدئ الراسخ',
      category: 'station',
      categoryLabel: 'أوسمة المحطات',
      icon: '🪴',
      color: 'from-teal-500 to-emerald-700',
      description: 'تُمنح لمن أتم 3 متون تأسيسية وثبت قدمه في مدارج الطلب.',
      howToUnlock: 'إتمام ضبط 3 متون تأصيلية.',
      isUnlocked: count >= 3,
      progressText: count >= 3 ? 'مكتسبة بنجاح' : `${count}/3 متون منجزة`,
    },
    {
      id: 'badge_station_2',
      title: 'وسام وتد التأصيل',
      category: 'station',
      categoryLabel: 'أوسمة المحطات',
      icon: '🛡️',
      color: 'from-amber-500 to-amber-700',
      description: 'تُمنح لمن اجتاز عتبة الأساس الأولى بضبط 6 متون تأصيلية.',
      howToUnlock: 'إتمام ضبط 6 متون في خريطة الطريق.',
      isUnlocked: count >= 6,
      progressText: count >= 6 ? 'مكتسبة بنجاح' : `${count}/6 متون منجزة`,
    },
    {
      id: 'badge_station_10_courses',
      title: 'وسام معقد التأصيل والضبط',
      category: 'station',
      categoryLabel: 'أوسمة المحطات',
      icon: '📜',
      color: 'from-amber-600 to-orange-700',
      description: 'تُمنح لمن أتم 10 متون علمية واستقر بناؤه المعرفي.',
      howToUnlock: 'إتمام ضبط 10 متون شرعية ولغوية.',
      isUnlocked: count >= 10,
      progressText: count >= 10 ? 'مكتسبة بنجاح' : `${count}/10 متون منجزة`,
    },
    {
      id: 'badge_station_3',
      title: 'وسام حارس الأصول',
      category: 'station',
      categoryLabel: 'أوسمة المحطات',
      icon: '⚖️',
      color: 'from-teal-600 to-emerald-800',
      description: 'تُمنح لمن رسخت قواعده بالانتهاء من 16 متناً في مختلف الفنون.',
      howToUnlock: 'إتمام ضبط 16 متناً علمياً.',
      isUnlocked: count >= 16,
      progressText: count >= 16 ? 'مكتسبة بنجاح' : `${count}/16 متناً منجزاً`,
    },
    {
      id: 'badge_station_25_courses',
      title: 'وسام فارس التحقيق وتخريج الفروع',
      category: 'station',
      categoryLabel: 'أوسمة المحطات',
      icon: '🗡️',
      color: 'from-indigo-600 to-blue-800',
      description: 'تُمنح لمن تجاوز 25 متناً وتمكن من أدوات النظر والجمع بين المتون.',
      howToUnlock: 'إتمام ضبط 25 متناً في المنصة.',
      isUnlocked: count >= 25,
      progressText: count >= 25 ? 'مكتسبة بنجاح' : `${count}/25 متناً منجزاً`,
    },
    {
      id: 'badge_station_4',
      title: 'تاج الرسوخ والضبط التام',
      category: 'station',
      categoryLabel: 'أوسمة المحطات',
      icon: '👑',
      color: 'from-yellow-400 via-amber-500 to-yellow-600',
      description: 'شارة تكريمية عليا في سَنَد لمن أتم 36 متناً وأحاط بأمهات المناهج.',
      howToUnlock: 'إتمام ضبط 36 متناً في المنهجية.',
      isUnlocked: count >= 36,
      progressText: count >= 36 ? 'مكتسبة بنجاح' : `${count}/36 متناً منجزاً`,
    },
    {
      id: 'badge_station_50_courses',
      title: 'وسام بحر المتون الزاخر',
      category: 'station',
      categoryLabel: 'أوسمة المحطات',
      icon: '🌊',
      color: 'from-cyan-600 to-blue-900',
      description: 'وسام شرفي استثنائي لمن قطع نصف قرن من المتون بإتمام 50 متناً.',
      howToUnlock: 'إتمام ضبط 50 متناً بالسند المتصل.',
      isUnlocked: count >= 50,
      progressText: count >= 50 ? 'مكتسبة بنجاح' : `${count}/50 متناً منجزاً`,
    },
    {
      id: 'badge_station_complete',
      title: 'قلادة الختمة المنهجية الكبرى',
      category: 'station',
      categoryLabel: 'أوسمة المحطات',
      icon: '🌟',
      color: 'from-amber-300 via-yellow-500 to-emerald-600',
      description: 'أسمى درجات الشرف في منصة سَنَد لمن أتم كامل متون المنصة الـ 78.',
      howToUnlock: 'إتمام كافة متون المنصة الـ 78 كاملة.',
      isUnlocked: count >= 78,
      progressText: count >= 78 ? 'مكتسبة بنجاح' : `${count}/78 متناً منجزاً`,
    },

    // ══════════════════════════════════════════════════════
    // 2. أوسمة الفنون والعلوم التخصصية (Disciplines)
    // ══════════════════════════════════════════════════════
    {
      id: 'badge_nahw',
      title: 'حامل لواء النحو واللسان',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '📜',
      color: 'from-blue-500 to-indigo-700',
      description: 'تُمنح لمن ضبط مبادئ لسان العرب ومتون النحو (كالآجرومية).',
      howToUnlock: 'أتمم أي متن في علم النحو وقواعد الإعراب.',
      isUnlocked: hasNahw,
      progressText: hasNahw ? 'مكتسبة بنجاح' : 'أنجز متناً في النحو',
    },
    {
      id: 'badge_sarf',
      title: 'خبير الصرف والاشتقاق',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '🔤',
      color: 'from-indigo-500 to-purple-700',
      description: 'تُمنح لمن غاص في أوزان الكلم ودقائق تصريف الأفعال والأسماء.',
      howToUnlock: 'أتمم متناً في علم الصرف والميزان الصرفي.',
      isUnlocked: hasSarf,
      progressText: hasSarf ? 'مكتسبة بنجاح' : 'أنجز متناً في الصرف',
    },
    {
      id: 'badge_balaghah',
      title: 'فصيح البلاغة والبيان',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '🪶',
      color: 'from-fuchsia-600 to-pink-800',
      description: 'تُمنح لمن تذوق أسرار الإعجاز في المعاني والبيان والبديع.',
      howToUnlock: 'أتمم متناً في علم البلاغة والبيان.',
      isUnlocked: hasBalaghah,
      progressText: hasBalaghah ? 'مكتسبة بنجاح' : 'أنجز متناً في البلاغة',
    },
    {
      id: 'badge_aqeedah',
      title: 'محرر المعتقد الحق',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '🕌',
      color: 'from-emerald-600 to-teal-800',
      description: 'تُمنح لمن أحكم دلائل التوحيد وأصول الاعتقاد السلفي الصافي.',
      howToUnlock: 'أتمم متناً في علم العقيدة والتوحيد.',
      isUnlocked: hasAqeedah,
      progressText: hasAqeedah ? 'مكتسبة بنجاح' : 'أنجز متناً في العقيدة',
    },
    {
      id: 'badge_tawheed_adv',
      title: 'ثاقب البصيرة في التوحيد',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '☀️',
      color: 'from-amber-500 to-emerald-700',
      description: 'تُمنح لمن تعمق في مسائل الأسماء والصفات وأحكم دلائل التوحيد بإتمام متنين فأكثر.',
      howToUnlock: 'أتمم متنين أو أكثر في علم العقيدة والتوحيد.',
      isUnlocked: hasAqeedahAdv,
      progressText: hasAqeedahAdv ? 'مكتسبة بنجاح' : `${aqeedahCourses.length}/2 متون في العقيدة`,
    },
    {
      id: 'badge_usul',
      title: 'ضابط أصول الفقه',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '📖',
      color: 'from-amber-600 to-orange-700',
      description: 'تُمنح لمن ملك مفاتيح الاستنباط ودلالات الألفاظ والقياس.',
      howToUnlock: 'أتمم متناً في أصول الفقه وقواعده.',
      isUnlocked: hasUsul,
      progressText: hasUsul ? 'مكتسبة بنجاح' : 'أنجز متناً في الأصول',
    },
    {
      id: 'badge_qawaid',
      title: 'محكم القواعد الفقهية والأشباه',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '🏛️',
      color: 'from-yellow-600 to-amber-800',
      description: 'تُمنح لمن جمع الفروع في كليات جامعة وأتقن قواعد الفقه الكبرى.',
      howToUnlock: 'أتمم متناً في القواعد الفقهية والأشباه والنظائر.',
      isUnlocked: hasQawaid,
      progressText: hasQawaid ? 'مكتسبة بنجاح' : 'أنجز متناً في القواعد الفقهية',
    },
    {
      id: 'badge_hadith',
      title: 'متقن مصطلح الحديث',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '✨',
      color: 'from-violet-500 to-purple-800',
      description: 'تُمنح لمن ميز الصحيح من السقيم وأحكم أصول الرواية والدراية.',
      howToUnlock: 'أتمم متناً في مصطلح الحديث وأصول الرواية.',
      isUnlocked: hasHadith,
      progressText: hasHadith ? 'مكتسبة بنجاح' : 'أنجز متناً في الحديث',
    },
    {
      id: 'badge_hadith_mutun',
      title: 'حافظ جوامع الأخبار النبوية',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '🌺',
      color: 'from-rose-600 to-red-800',
      description: 'تُمنح لمن تدارس وضبط المتون النبوية الكبرى كالأربعين وعمدة الأحكام.',
      howToUnlock: 'أتمم متناً في أحاديث الأحكام أو متون السنن.',
      isUnlocked: hasHadithMutun,
      progressText: hasHadithMutun ? 'مكتسبة بنجاح' : 'أنجز متناً في متون الأحاديث',
    },
    {
      id: 'badge_fiqh',
      title: 'فقيه الفروع والأدلة',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '💎',
      color: 'from-teal-500 to-emerald-700',
      description: 'تُمنح لمن ضبط أبواب العبادات والمعاملات وتفقه في الدين.',
      howToUnlock: 'أتمم متناً فقهياً معتمداً.',
      isUnlocked: hasFiqh,
      progressText: hasFiqh ? 'مكتسبة بنجاح' : 'أنجز متناً في الفقه',
    },
    {
      id: 'badge_tafseer',
      title: 'غائص درر التفسير وعلوم التنزيل',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '🌌',
      color: 'from-emerald-700 to-teal-900',
      description: 'تُمنح لمن اعتنى بكتاب الله وتدارس قواعد التفسير وعلوم القرآن.',
      howToUnlock: 'أتمم متناً في علوم القرآن أو قواعد التفسير.',
      isUnlocked: hasQuranSciences,
      progressText: hasQuranSciences ? 'مكتسبة بنجاح' : 'أنجز متناً في علوم القرآن والتفسير',
    },
    {
      id: 'badge_tajweed',
      title: 'مجوّد التلاوة وترتيل التنزيل',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '🕊️',
      color: 'from-teal-600 to-cyan-800',
      description: 'تُمنح لمن أحكم مخارج الحروف وصفاتها وأتقن أحكام التجويد.',
      howToUnlock: 'أتمم متناً في علم التجويد (كالتحفة أو الجزرية).',
      isUnlocked: hasTajweed,
      progressText: hasTajweed ? 'مكتسبة بنجاح' : 'أنجز متناً في التجويد',
    },
    {
      id: 'badge_tazkiyah',
      title: 'رباني السلوك وحلية الطالب',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '🌿',
      color: 'from-green-600 to-emerald-900',
      description: 'تُمنح لمن جمع بين العلم والعمل، وتخلق بآداب حملة الشريعة وتزكية النفس.',
      howToUnlock: 'أتمم متناً في الآداب العلمية والرقائق والتزكية.',
      isUnlocked: hasManners,
      progressText: hasManners ? 'مكتسبة بنجاح' : 'أنجز متناً في الآداب والتزكية',
    },
    {
      id: 'badge_seerah',
      title: 'مقتفي الأثر والشمائل النبوية',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '🐎',
      color: 'from-amber-700 to-stone-900',
      description: 'تُمنح لمن استوعب مغازي النبي ﷺ وأيامه وهديه الشريف.',
      howToUnlock: 'أتمم متناً في السيرة النبوية العطرة أو التاريخ.',
      isUnlocked: hasSeerah,
      progressText: hasSeerah ? 'مكتسبة بنجاح' : 'أنجز متناً في السيرة النبوية',
    },

    // ══════════════════════════════════════════════════════
    // 3. أوسمة الهمة والمواظبة والكشكول (Habit & Diligence)
    // ══════════════════════════════════════════════════════
    {
      id: 'badge_streak_3',
      title: 'شعلة الاستمرار والهمة',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '🔥',
      color: 'from-rose-500 to-orange-600',
      description: 'تُمنح لمن واظب على المدارسة 3 أيام متتالية دون انقطاع.',
      howToUnlock: 'حقّق سلسلة 3 أيام متتالية من المدارسة.',
      isUnlocked: streak >= 3,
      progressText: streak >= 3 ? 'مكتسبة بنجاح' : `${streak}/3 أيام مواظبة`,
    },
    {
      id: 'badge_streak_7',
      title: 'وتد الأسبوع الصامد',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '⚡',
      color: 'from-amber-500 to-yellow-600',
      description: 'تُمنح لمن أكمل أسبوعاً كاملاً من التحصيل اليومي بلا فتور.',
      howToUnlock: 'حافظ على المدارسة 7 أيام متتالية.',
      isUnlocked: streak >= 7,
      progressText: streak >= 7 ? 'مكتسبة بنجاح' : `${streak}/7 أيام مواظبة`,
    },
    {
      id: 'badge_streak_14',
      title: 'حصن الأسبوعين الراسخ',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '🏰',
      color: 'from-emerald-500 to-teal-700',
      description: 'تُمنح لمن واظب على الحضور والمدارسة أسبوعين متتاليين بلا انقطاع.',
      howToUnlock: 'حافظ على المدارسة 14 يوماً متتالية.',
      isUnlocked: streak >= 14,
      progressText: streak >= 14 ? 'مكتسبة بنجاح' : `${streak}/14 يوماً مواظبة`,
    },
    {
      id: 'badge_streak_30',
      title: 'بدر الشهر المكتمل',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '🌕',
      color: 'from-yellow-500 to-amber-700',
      description: 'تُمنح لمن تمم شهراً كاملاً (30 يوماً) من الرباط العلمي اليومي.',
      howToUnlock: 'حافظ على المدارسة 30 يوماً متتالية.',
      isUnlocked: streak >= 30,
      progressText: streak >= 30 ? 'مكتسبة بنجاح' : `${streak}/30 يوماً مواظبة`,
    },
    {
      id: 'badge_streak_40',
      title: 'خلوة الأربعين المباركة',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '🕯️',
      color: 'from-violet-600 to-purple-900',
      description: 'تُمنح لمن أحكم عادة الطلب لأربعين يوماً متواصلة حتى صارت سجية راسخة.',
      howToUnlock: 'حافظ على المدارسة 40 يوماً متتالية.',
      isUnlocked: streak >= 40,
      progressText: streak >= 40 ? 'مكتسبة بنجاح' : `${streak}/40 يوماً مواظبة`,
    },
    {
      id: 'badge_streak_100',
      title: 'مئوية الهمة والعزيمة الصادقة',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '💎',
      color: 'from-rose-600 via-pink-600 to-purple-800',
      description: 'وسام الهمم العالية لمن بلغ مائة يوم متصلة من الجثو على ركب العلم.',
      howToUnlock: 'حافظ على المدارسة 100 يوم متتالية دون انقطاع.',
      isUnlocked: streak >= 100,
      progressText: streak >= 100 ? 'مكتسبة بنجاح' : `${streak}/100 يوم مواظبة`,
    },
    {
      id: 'badge_hours_5',
      title: 'مبادر الساعات الخمس',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '⏳',
      color: 'from-teal-500 to-emerald-700',
      description: 'تُمنح لمن أمضى 5 ساعات كاملة في الاستماع والمدارسة الحية.',
      howToUnlock: 'استمع إلى 300 دقيقة (5 ساعات) في المحاريب.',
      isUnlocked: totalStudyMinutes >= 300,
      progressText: totalStudyMinutes >= 300 ? 'مكتسبة بنجاح' : `${Math.floor(totalStudyMinutes / 60)}/5 ساعات استماع`,
    },
    {
      id: 'badge_hours_10',
      title: 'عميد ساعات المدارسة',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '⏱️',
      color: 'from-sky-500 to-blue-700',
      description: 'تُمنح لمن قضى أكثر من 10 ساعات في الاستماع الحي لمجالس الشروح.',
      howToUnlock: 'استمع إلى 600 دقيقة (10 ساعات) من الشروح.',
      isUnlocked: totalStudyMinutes >= 600,
      progressText: totalStudyMinutes >= 600 ? 'مكتسبة بنجاح' : `${Math.floor(totalStudyMinutes / 60)}/10 ساعات استماع`,
    },
    {
      id: 'badge_hours_25',
      title: 'فارس المجالس الطويلة',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '🕰️',
      color: 'from-indigo-500 to-blue-800',
      description: 'تُمنح لمن أثبت صبره بقضاء 25 ساعة كاملة في رياض الشروح والتأصيل.',
      howToUnlock: 'استمع إلى 1500 دقيقة (25 ساعة) من الشروح.',
      isUnlocked: totalStudyMinutes >= 1500,
      progressText: totalStudyMinutes >= 1500 ? 'مكتسبة بنجاح' : `${Math.floor(totalStudyMinutes / 60)}/25 ساعة استماع`,
    },
    {
      id: 'badge_hours_50',
      title: 'صابر الأسحار والليالي',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '🌌',
      color: 'from-purple-600 to-indigo-900',
      description: 'تُمنح لمن ناهز 50 ساعة من المدارسة وعمر وقته بالخير والتحصيل.',
      howToUnlock: 'استمع إلى 3000 دقيقة (50 ساعة) في المنصة.',
      isUnlocked: totalStudyMinutes >= 3000,
      progressText: totalStudyMinutes >= 3000 ? 'مكتسبة بنجاح' : `${Math.floor(totalStudyMinutes / 60)}/50 ساعة استماع`,
    },
    {
      id: 'badge_hours_100',
      title: 'بحر الساعات المائة',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '🌊',
      color: 'from-cyan-600 via-blue-700 to-indigo-950',
      description: 'وسام كبار طلاب العلم لمن تجاوزت ساعات مدارسته 100 ساعة كاملة.',
      howToUnlock: 'استمع إلى 6000 دقيقة (100 ساعة) في المحاريب.',
      isUnlocked: totalStudyMinutes >= 6000,
      progressText: totalStudyMinutes >= 6000 ? 'مكتسبة بنجاح' : `${Math.floor(totalStudyMinutes / 60)}/100 ساعة استماع`,
    },
    {
      id: 'badge_notes_5',
      title: 'مقيّد المبتدئ والشوارد',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '✍️',
      color: 'from-stone-600 to-stone-800',
      description: 'تُمنح لمن قيد أول 5 فوائد ومسائل في كشكوله العلمي.',
      howToUnlock: 'قيّد 5 فوائد في كشكولك أثناء حضور المجالس.',
      isUnlocked: notesCount >= 5,
      progressText: notesCount >= 5 ? 'مكتسبة بنجاح' : `${notesCount}/5 فوائد مقيدة`,
    },
    {
      id: 'badge_notes_10',
      title: 'قيّد الأوابد والشوارد',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '🔖',
      color: 'from-purple-500 to-indigo-700',
      description: 'تُمنح لمن قيد 10 فوائد ومسائل محررة أو أكثر في كشكوله.',
      howToUnlock: 'قيّد 10 فوائد علمية أثناء حضور المجالس.',
      isUnlocked: notesCount >= 10,
      progressText: notesCount >= 10 ? 'مكتسبة بنجاح' : `${notesCount}/10 فوائد مقيدة`,
    },
    {
      id: 'badge_notes_25',
      title: 'صاحب الحاشية المحررة',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '📑',
      color: 'from-amber-600 to-yellow-800',
      description: 'تُمنح لمن قيد 25 فائدة علمية محررة وصار كشكوله كالحاشية المليئة بالدرر.',
      howToUnlock: 'قيّد 25 فائدة وضابط مسألة في كشكولك.',
      isUnlocked: notesCount >= 25,
      progressText: notesCount >= 25 ? 'مكتسبة بنجاح' : `${notesCount}/25 فائدة مقيدة`,
    },
    {
      id: 'badge_notes_50',
      title: 'جامع الفرائد والفرائد الكبرى',
      category: 'habit',
      categoryLabel: 'أوسمة الهمة',
      icon: '📚',
      color: 'from-emerald-600 to-teal-800',
      description: 'تُمنح لمن قيد 50 مسألة وفائدة وحاشية في كشكوله وصار مرجعاً لنفسه ولإخوانه.',
      howToUnlock: 'قيّد 50 فائدة علمية في كشكولك.',
      isUnlocked: notesCount >= 50,
      progressText: notesCount >= 50 ? 'مكتسبة بنجاح' : `${notesCount}/50 فائدة مقيدة`,
    },
  ]

  const unlockedCount = badgesList.filter((b) => b.isUnlocked).length

  return {
    allBadges: badgesList,
    unlockedCount,
    currentStation,
    nextStation,
    coursesUntilNextStation,
    progressToNextStationPercent,
  }
}

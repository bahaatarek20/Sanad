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

  // فحص شارات الفنون التخصصية
  const hasNahw = completedCourses.some((c) => c.categorySlug === 'nahw' || c.category?.includes('نحو') || c.slug === 'al-ajrumiyyah')
  const hasAqeedah = completedCourses.some((c) => c.categorySlug === 'aqeedah' || c.category?.includes('عقيد') || c.slug.includes('usul-thalathah'))
  const hasUsul = completedCourses.some((c) => c.categorySlug === 'usul-fiqh' || c.category?.includes('أصول الفقه') || c.slug.includes('usul'))
  const hasHadith = completedCourses.some((c) => c.categorySlug === 'mustalah-hadith' || c.category?.includes('حديث') || c.slug === 'al-bayquniyyah')
  const hasFiqh = completedCourses.some((c) => c.categorySlug === 'fiqh' || c.category?.includes('فقه') || c.slug === 'bidayat-al-mutafaqqih')

  const badgesList: ScholarlyBadge[] = [
    // 1. أوسمة المحطات الأربع الكبرى
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
      id: 'badge_station_4',
      title: 'تاج الرسوخ والضبط التام',
      category: 'station',
      categoryLabel: 'أوسمة المحطات',
      icon: '👑',
      color: 'from-yellow-400 via-amber-500 to-yellow-600',
      description: 'أعلى شارة تكريمية في سَنَد لمن أتم 36 متناً وأحاط بأمهات المناهج.',
      howToUnlock: 'إتمام ضبط 36 متناً في المنهجية.',
      isUnlocked: count >= 36,
      progressText: count >= 36 ? 'مكتسبة بنجاح' : `${count}/36 متناً منجزاً`,
    },

    // 2. أوسمة الفنون والعلوم التخصصية
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
      id: 'badge_aqeedah',
      title: 'محرر المعتقد الحق',
      category: 'discipline',
      categoryLabel: 'أوسمة العلوم',
      icon: '🕌',
      color: 'from-emerald-600 to-teal-800',
      description: 'تُمنح لمن أحكم دلائل التوحيد وأصول الاعتقاد السلفي.',
      howToUnlock: 'أتمم متناً في علم العقيدة والتوحيد.',
      isUnlocked: hasAqeedah,
      progressText: hasAqeedah ? 'مكتسبة بنجاح' : 'أنجز متناً في العقيدة',
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

    // 3. أوسمة المواظبة والهمة
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

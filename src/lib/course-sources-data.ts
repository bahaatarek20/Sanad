/**
 * بيانات التحقيق العلمي، الطبعات المعتمدة، وروابط المكتبات الرقمية المعتمدة
 * تدعم ميزة "التخريج والتوثيق المعتمد" و"المراجعة السريعة وأهم المسائل"
 */

export interface VerifiedEditionInfo {
  matnName: string
  author: string
  investigator?: string // المحقق العلمي
  publisher?: string // دار النشر أو الطبعة
  shamelaUrl?: string // رابط المتن في المكتبة الشاملة
  dorarUrl?: string // رابط تخريج الأحاديث أو المسائل في الدرر السنية
  waqfeyaUrl?: string // رابط النسخة المصورة في الوقفية
  verificationStatus: 'verified_canonical' | 'verified_standard'
  verificationNotes: string
}

export interface MatnSummaryBrief {
  mainGoal: string // ثمرة المتن ومقصده الأكبر
  coreThemes: string[] // المحاور والمسائل الكبرى
  recommendedStudyMethod: string // طريقة الضبط والاستظهار الموصى بها
  scholarlyQuotes?: string // قول أهل العلم في تعظيم هذا المتن
}

export const VERIFIED_EDITIONS_REGISTRY: Record<string, VerifiedEditionInfo> = {
  'hilyat-talib-al-ilm': {
    matnName: 'حلية طالب العلم',
    author: 'الشيخ بكر بن عبد الله أبو زيد (رحمه الله)',
    investigator: 'طبعة معتمدة بمراجعة المؤلف',
    publisher: 'دار العاصمة - الرياض / مؤسسة الرسالة',
    shamelaUrl: 'https://shamela.ws/book/10574',
    dorarUrl: 'https://dorar.net/article/1954',
    verificationStatus: 'verified_canonical',
    verificationNotes: 'متن تأسيسي في أدب الطلب والسمت، معتمد في حلقات ومراكز التأصيل الشرعي حول العالم الإسلامي.',
  },
  'bidayat-al-mutafaqqih': {
    matnName: 'بداية المتفقه',
    author: 'الشيخ وحيد بن عبد السلام بالي (حفظه الله)',
    investigator: 'اعتنى به المؤلف وخرج أحاديثه',
    publisher: 'دار ابن رجب / دار الصحابة للتراث',
    shamelaUrl: 'https://shamela.ws/book/31737',
    dorarUrl: 'https://dorar.net/feqh',
    verificationStatus: 'verified_canonical',
    verificationNotes: 'متن فقهي مرتب على طريقة المتون القديمة بعبارة عصرية وأدلة صريحة من الكتاب وصحيح السنة.',
  },
  '40-hadith-nawawi-1': {
    matnName: 'الأربعون النووية',
    author: 'الإمام محيي الدين يحيى بن شرف النووي (رحمه الله)',
    investigator: 'تحقيق د. عبد العزيز بن فهد الرومي وغيره من المحققين',
    publisher: 'دار المنهاج - بيروت / مجمع الملك فهد',
    shamelaUrl: 'https://shamela.ws/book/789',
    dorarUrl: 'https://dorar.net/hadith/search?q=%D8%A7%D9%84%D8%A3%D8%B1%D8%A8%D8%B9%D9%88%D9%86+%D8%A7%D9%84%D9%86%D9%88%D9%88%D9%8A%D8%A9',
    verificationStatus: 'verified_canonical',
    verificationNotes: 'أجلّ متن جامع لأصول الدين وقواعد الإسلام الكلية، أجمعت الأمة على قبوله ومدارسته.',
  },
  '40-hadith-nawawi-2': {
    matnName: 'الأربعون النووية (المجلس الوجيز)',
    author: 'الإمام محيي الدين يحيى بن شرف النووي',
    investigator: 'طبعة برنامج مهمات العلم - الشيخ صالح العصيمي',
    publisher: 'برنامج التسهيل في مهمات العلم',
    shamelaUrl: 'https://shamela.ws/book/789',
    dorarUrl: 'https://dorar.net/hadith',
    verificationStatus: 'verified_canonical',
    verificationNotes: 'ضبط نصوص الأحاديث بالأسانيد المقروءة على المشايخ المسندين.',
  },
  'al-bidayah-aqeedah': {
    matnName: 'كتاب البداية في علم العقيدة',
    author: 'الشيخ وحيد بن عبد السلام بالي',
    investigator: 'إشراف المؤلف',
    publisher: 'دار ابن رجب',
    shamelaUrl: 'https://shamela.ws',
    dorarUrl: 'https://dorar.net/aqeeda',
    verificationStatus: 'verified_standard',
    verificationNotes: 'رسالة تأسيسية في أركان الإيمان الستة مبسطة للمبتدئ.',
  },
  'sahih-al-adab': {
    matnName: 'صحيح الآداب الإسلامية',
    author: 'الشيخ وحيد بن عبد السلام بالي',
    investigator: 'خرج أحاديثه المؤلف',
    publisher: 'دار ابن رجب',
    shamelaUrl: 'https://shamela.ws',
    dorarUrl: 'https://dorar.net/akhlaq',
    verificationStatus: 'verified_standard',
    verificationNotes: 'جمع الآداب النبوية الثابتة في اليوم والليلة والمعاشرة.',
  },
  'kitab-al-tawhid': {
    matnName: 'كتاب التوحيد الذي هو حق الله على العبيد',
    author: 'الإمام المجدد محمد بن عبد الوهاب (رحمه الله)',
    investigator: 'تحقيق الشيخ د. فهد بن عبد الرحمن الرومي / طبعة الرئاسة العامة للبحوث العلمية',
    publisher: 'مؤسسة الرسالة / دار العاصمة',
    shamelaUrl: 'https://shamela.ws/book/1296',
    dorarUrl: 'https://dorar.net/aqeeda/search?q=%D9%83%D8%AA%D8%A7%D8%A8+%D8%A7%D9%84%D8%AA%D9%88%D8%AD%D9%8A%D8%AF',
    verificationStatus: 'verified_canonical',
    verificationNotes: 'كتاب جليل في إفراد الله بالعبادة وبيان نواقض التوحيد بالآيات والأحاديث والآثار.',
  },
  'al-aqeedah-al-wasitiyyah': {
    matnName: 'العقيدة الواسطية',
    author: 'شيخ الإسلام أحمد بن عبد الحليم بن تيمية (رحمه الله)',
    investigator: 'تحقيق د. أشرف بن عبد المقصود / مراجعة د. عبد العزيز بن عبد الله الراجحي',
    publisher: 'دار أضواء السلف / دار المنهاج',
    shamelaUrl: 'https://shamela.ws/book/10852',
    dorarUrl: 'https://dorar.net/aqeeda',
    verificationStatus: 'verified_canonical',
    verificationNotes: 'عمدة معتقد أهل السنة والجماعة في الأسماء والصفات وأصول الإيمان بعبارة محررة متينة.',
  },
  'al-ajrumiyyah': {
    matnName: 'المقدمة الآجرومية في أصول لسان العرب',
    author: 'أبو عبد الله محمد بن محمد بن آجرّوم الصنهاجي (رحمه الله)',
    investigator: 'تحقيق د. عثمان بن صالح الفريح',
    publisher: 'دار المنهاج - القويمة',
    shamelaUrl: 'https://shamela.ws/book/2183',
    dorarUrl: 'https://dorar.net',
    verificationStatus: 'verified_canonical',
    verificationNotes: 'باب العربية ومفتاح لسان التنزيل؛ أنفع ما يبدأ به المبتدئ في الإعراب والنحو.',
  },
  'al-waraqat': {
    matnName: 'الورقات في أصول الفقه',
    author: 'إمام الحرمين أبو المعالي عبد الملك بن عبد الله الجويني',
    investigator: 'تحقيق د. عبد اللطيف العبد / طبعة الشيخ عبد الله الفوزان',
    publisher: 'دار المسلم / دار ابن حزم',
    shamelaUrl: 'https://shamela.ws/book/11977',
    dorarUrl: 'https://dorar.net/usul',
    verificationStatus: 'verified_canonical',
    verificationNotes: 'المدخل الرصين لمعرفة أقسام الكلام والأمر والنهي والعام والخاص والقياس والاجتهاد.',
  },
  'al-bayquniyyah': {
    matnName: 'المنظومة البيقونية في مصطلح الحديث',
    author: 'الشيخ عمر بن محمد بن فتوح البيقوني (رحمه الله)',
    investigator: 'اعتناء جمع من أهل العلم والحديث',
    publisher: 'دار أطلس الخضراء / دار ابن حزم',
    shamelaUrl: 'https://shamela.ws/book/9605',
    dorarUrl: 'https://dorar.net/hadith',
    verificationStatus: 'verified_canonical',
    verificationNotes: 'أرجوزة عذبة من 34 بيتاً ضبطت أمهات ألقاب علوم الحديث ومصطلحاته.',
  },
}

export const MATN_BRIEFS_REGISTRY: Record<string, MatnSummaryBrief> = {
  'hilyat-talib-al-ilm': {
    mainGoal: 'تطهير نية طالب العلم والتلبس بآداب الشريعة وحفظ السمت في نفسه ومع شيخه وزملائه وكتبه.',
    coreThemes: [
      'آداب الطالب في نفسه: الإخلاص، وملازمة الخشية، ودوام المراقبة.',
      'كيفية الطلب والتلقي: حفظ المختصرات وضبطها على الأشياخ بدلاً من التخبط بين المطولات.',
      'أدب الطالب مع شيخه: التوقير اللائق، وحسن السؤال، والاستئذان.',
      'التحلي بالعمل: كتمان السر العلمي، زكاة العلم، وترك المماراة والجدل.',
    ],
    recommendedStudyMethod: 'قراءة الكتاب متأملاً مع الشيخ، وتلخيص القواعد السلوكية في كشكول دائم يُراجع عند فتور الهمة.',
    scholarlyQuotes: '«من لم يتأدب بالآداب، حُرم الوصول إلى لباب العلم وأسراره».',
  },
  'bidayat-al-mutafaqqih': {
    mainGoal: 'تصوير المسائل الفقهية الأساسية بأدلتها الشرعية من القرآن والحديث الصحيح دون استطراد.',
    coreThemes: [
      'كتاب الطهارة: المياه، الآنية، الوضوء والغسل ونواقضهما.',
      'كتاب الصلاة: الشروط، الأركان، السنن، وصلاة الجماعة والأعذار.',
      'كتاب الزكاة والصيام والحج والعمرة.',
      'كتاب المعاملات والنكاح والجنايات.',
    ],
    recommendedStudyMethod: 'حفظ ضوابط كل باب (مثال: أركان الوضوء أربعة، شروط الصلاة تسعة) مع حفظ الدليل المصاحب.',
    scholarlyQuotes: '«الفقه بالدليل يثبت في القلب، والتفريع بلا أصل يورث الشكوك والزلل».',
  },
  '40-hadith-nawawi-1': {
    mainGoal: 'استيعاب الأحاديث الأربعين الجامعة لقواعد الدين وأصول الشريعة التي يدور عليها الإسلام.',
    coreThemes: [
      'أحاديث النية والإخلاص ومقاصد الأعمال (حديث إنما الأعمال بالنيات).',
      'حديث جبريل عليه السلام وبيان مراتب الدين: الإسلام، الإيمان، والإحسان.',
      'قواعد المعاملات: لا ضرر ولا ضرار، والبيّنة على المدعي.',
      'أصول الزهد والورع والسمت النبوي القويم.',
    ],
    recommendedStudyMethod: 'حفظ ألفاظ الحديث بدقة متناهية، ثم استخراج خمس فوائد عقدية وسلوكية وفقهية من كل حديث.',
    scholarlyQuotes: 'قال الشافعي وأحمد: «يدور الإسلام على ثلاثة أحاديث أو أربعة، جمعها الإمام النووي في هذا المصنف».',
  },
}

/**
 * دالة مساعدة لجلب بيانات التوثيق العلمي للمتن
 */
export function getVerifiedEdition(slug: string): VerifiedEditionInfo | null {
  return VERIFIED_EDITIONS_REGISTRY[slug] || null
}

/**
 * دالة مساعدة لجلب ملخص المسائل والمراجعة السريعة
 */
export function getMatnBrief(slug: string): MatnSummaryBrief | null {
  return MATN_BRIEFS_REGISTRY[slug] || null
}

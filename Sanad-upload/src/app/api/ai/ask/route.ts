import { NextResponse } from 'next/server'

export const SANAD_AI_SYSTEM_PROMPT = `
أنت "رفيق المدارسة" (أو "صاحبك في الطلب") في منصة «سَنَد» للتعليم الشرعي التأصيلي.
منصة سَنَد متخصصة في دراسة المتون العلمية الشرعية الكلاسيكية: متون الفقه (كبداية المتفقه، الأربعين النووية)، ومتون العقيدة (كالعقيدة الواسطية، والسفارينية)، ومتون النحو (كالآجرومية وقطر الندى)، ومتون الحديث، ومتون أصول الفقه، وآداب طالب العلم (كحلية طالب العلم).

هويتك وطبيعة عملك:
أنت طالب علم نجيب جلست تذاكر مع أخيك؛ لست مفتياً ولا شيخاً، وإنما رفيق مدارسة دافئ يساعد على فهم عبارات المتون وضبط المسائل الأساسية.

══════════════════════════════
📚 المصادر والمكتبة العلمية الموثوقة (إلزامي):
══════════════════════════════
كل إجاباتك في العلوم الشرعية يجب أن تكون مستقاة ومؤصَّلة من المصادر التالية حصراً — ولا تقل شيئاً ليس له أصل فيها:

【القرآن الكريم】: الاستشهاد بالآيات مع ذكر اسم السورة ورقم الآية.
【السنة النبوية الصحيحة】: صحيح البخاري، صحيح مسلم، سنن أبي داود، سنن الترمذي، سنن النسائي، سنن ابن ماجه، مسند أحمد. اذكر اسم الكتاب ورقم الحديث أو الباب.
【كتب الفقه المعتمدة】: زاد المستقنع، الروض المربع، المغني لابن قدامة، بداية المجتهد لابن رشد، الإقناع للحجاوي، حاشية ابن عابدين، مختصر خليل، منهاج الطالبين للنووي.
【كتب العقيدة】: العقيدة الواسطية لابن تيمية، العقيدة الطحاوية، لمعة الاعتقاد لابن قدامة، شرح السفارينية، كتاب التوحيد لمحمد بن عبدالوهاب، معارج القبول للحكمي.
【كتب النحو واللغة】: الآجرومية، قطر الندى لابن هشام، ألفية ابن مالك، شرح ابن عقيل، أوضح المسالك لابن هشام.
【كتب الحديث ومصطلحه】: نخبة الفكر لابن حجر، البيقونية، تدريب الراوي للسيوطي، فتح الباري لابن حجر.
【كتب أصول الفقه】: الورقات للجويني، روضة الناظر لابن قدامة، مذكرة الشنقيطي في أصول الفقه.
【كتب التزكية والآداب】: حلية طالب العلم لبكر أبو زيد، جامع بيان العلم وفضله لابن عبد البر، مدارج السالكين لابن القيم.
【كتب التفسير】: تفسير ابن كثير، تفسير السعدي، تفسير الطبري، أضواء البيان للشنقيطي.

⚠️ قاعدة ذهبية: لا تذكر حكماً شرعياً أو قولاً إلا ومعه مصدره (اسم الكتاب أو الحديث أو الآية). إذا لم تكن متأكداً من المصدر قل: "هذا يحتاج مراجعة من كتب أهل العلم المعتمدة — ارجع لشيخك أو ابحث في المصدر الأصلي".

صفاتك وأسلوبك الحتمي:
1. **اللغة:** اتكلم بالعامية المصرية الهادئة الراقية (زي أخ كبير بيشجع صاحبه ووقاف في ضهره دايماً). لما الموضوع يحتاج دقة علمية، اقتبس النص الفصيح بين قوسين ثم اشرحه بالعامية.
2. **المهمة الأساسية:** تفكيك ألفاظ ومصطلحات المتون الشرعية الصعبة، وتبسيط المسائل بأمثلة من الحياة اليومية، والربط بين الفروع وأصولها وقواعدها، مع ذكر المصدر دائماً.
3. **منهج الشرح:** لما تشرح مسألة، استخدم هذا الترتيب: (أ) المعنى الإجمالي باختصار، (ب) التفصيل في نقاط مرقمة أو مفصولة مع الأدلة، (ج) مثال تطبيقي من الواقع، (د) ضابط أو قاعدة تجمع المسألة، (هـ) المصدر والمرجع.
4. **التشجيع:** حسّس الطالب بالتشجيع ورفع الهمة دائماً — «يا بطل، عاش يا هندسة، أنت ماشي في طريق العلماء العظماء».
5. **الفتوى والنوازل:** ممنوع تماماً الفتوى في النوازل المعاصرة أو المسائل السياسية أو الخلافات الحزبية أو المذهبية الحادة؛ قل ببساطة: «دي نرجع فيها لكبار علمائنا يا غالي — وإحنا هنا في المتن نضبط الأصول والقواعد الأول».
6. **عند الإحباط:** لو حسيت من كلام الطالب إنه متضايق أو بيفقد الهمة، اذكر له مواقف من سير أئمة العلم تشحذ همته — الإمام الشافعي وكان يعيد المسألة عشرات المرات، والإمام أحمد لم يترك الطلب حتى آخر لحظة.
7. **خارج نطاق التخصص:** إذا سألك أحد عن موضوع ليس له أي صلة بالعلوم الإسلامية أو اللغة العربية (مثل: وصفات الطبخ، البرمجة، الرياضة، الترفيه)، أجبه بلطف: «أنا متخصص في مدارسة متون العلوم الشرعية واللغة العربية يا صديقي — لو عندك سؤال في الفقه أو العقيدة أو النحو أو غيرها من علوم الشريعة، أنا معاك بكل سرور!»
8. **السرعة والإيجاز:** أجب بسرعة وبشكل مباشر ومركز. لا تُطِل الرد بدون فائدة — طالب العلم وقته ثمين ومحتاج يرجع للمذاكرة.
9. **ذكر المصادر في نهاية كل إجابة:** اختم ردك بسطر "📖 المرجع:" واذكر فيه المصادر التي اعتمدت عليها في إجابتك.
`

// محرك المعرفة الشرعية الذاتي المتقدم (يغذي المتون والمسائل حتى عند غياب الإنترنت أو نفاد الحصص)
function generateContextualScholarlyReply(
  question: string,
  courseTitle: string,
  categoryTitle: string,
  instructor?: string
): string {
  const q = question.toLowerCase()

  // 1. طلب التلخيص العام للمتن
  if (q.includes('لخص') || q.includes('ملخص') || q.includes('أهم مسألة') || q.includes('فكرة عامة')) {
    if (courseTitle.includes('حلية')) {
      return `يا هلا بيك يا بطل! متن «حلية طالب العلم» للشيخ بكر أبو زيد بيعتبر دستور أخلاقي وعلمي لكل من سلك طريق الطلب. عشان نلخصه في 3 ركائز ذهبية:
1. **آداب الطالب في نفسه:** الإخلاص لله، الخشية، ومداومة الاستغفار والمراقبة، والزهد الحقيقي مش المظهري.
2. **كيفية الطلب والتلقي:** التدرج، حفظ المتون الصغيرة قبل المطولات، والأخذ عن المشايخ المتقنين مش مجرد مطالعة الكتب.
3. **أدب الطالب مع شيخه وزملائه:** توقير المعلم، حسن السؤال والاستماع، وتجنب الجدال والمماراة العقيمة.
نصيحتي ليك: ابدأ بتطبيق أدب واحد كل يوم، والعلم بركة تظهر في سمتك وأخلاقك!`
    }
    if (courseTitle.includes('المتفقه') || categoryTitle.includes('فقه')) {
      return `منوّر يا غالي! متن «بداية المتفقه» للشيخ وحيد بالي تصميمه عبارة عن ضوابط وقواعد فقهية مركزة جداً:
1. **فقه العبادات:** مبني على الطهارة ثم الصلاة فالزكاة والصوم والحج، والشيخ مرتب كل باب في: (تعريف - شروط - أركان - واجبات - نواقض/مفسدات).
2. **القاعدة الذهبية:** في الفقه لازم تفرّق بين "الركن" (يبطل العمل بتركه عمداً أو سهواً) و"الواجب" (يجبره سجود السهو مثلاً)، و"الشرط" (يسبق العبادة كالوضوء ودخول الوقت).
3. **طريقة المدارسة الصحيحة:** احفظ الضابط الفقهي، وافهم دليله من الحديث الصحيح، هتلاقي أبواب الفقه كلها بتنفتح قدامك بسهولة!`
    }
    if (courseTitle.includes('الأربعين') || courseTitle.includes('النووية')) {
      return `أهلاً بالهمة العالية! «الأربعين النووية» للإمام النووي جمعت أحاديث هي قواعد الإسلام وأقطابه:
1. **أول قاعدة:** حديث «إنما الأعمال بالنيات».. ده ثلث العلم لأن كل حركة وسكون مبنية على مقصد قلبك.
2. **حديث جبريل:** ضبط مراتب الدين الثلاثة: (الإسلام: الأعمال الظاهرة، الإيمان: الاعتقادات الباطنة، الإحسان: عبادة المراقبة والمشاهدة).
3. **قواعد الضرر والكمال:** أحاديث «لا ضرر ولا ضرار» و«من حسن إسلام المرء تركه ما لا يعنيه».
كل حديث هنا يعتبر ميزاناً يوزن بيه عملك اليومي!`
    }
    if (courseTitle.includes('عقيدة') || courseTitle.includes('التوحيد')) {
      return `يا هلا يا بطل التوحيد! في دراسة العقيدة والتوحيد، المنهج كله بيدور حول:
1. **توحيد الربوبية:** إفراد الله بأفعاله هو (الخلق، الرزق، التدبير، الإحياء والإماتة).
2. **توحيد الألوهية:** إفراد الله بأفعال العباد (الصلاة، الدعاء، الذبح، النذر، التوكل، الرجاء).
3. **توحيد الأسماء والصفات:** إثبات ما أثبته الله لنفسه في كتابه وسنة نبيه بلا تمثيل ولا تكييف ولا تعطيل.
المسألة كلها يا صاحبي: إخلاص القلب لله، وصرف كل أنواع العبادة له وحده بلا شريك.`
    }
    if (courseTitle.includes('الآجرومية') || categoryTitle.includes('نحو') || categoryTitle.includes('لغة')) {
      return `يا مرحب بفرسان لغة القرآن! متن «الآجرومية» لابن آجروم هو مفتاح فهم القرآن والحديث:
1. **الكلام:** هو اللفظ المركب المفيد بالوضع، وأقسامه: اسم، وفعل، وحرف جاء لمعنى.
2. **الإعراب:** تغيير أواخر الكلم لاختلاف العوامل الداخلة عليها، وله 4 حالات: (رفع، ونصب، وخفض، وجزم).
3. **المرفوعات والمنصوبات:** الفاعل ونائبه والمبتدأ والخبر مرفوعات، والمفاعيل منصوبات، وخفض بحرف الجر أو بالإضافة.
افهم قاعدة الإعراب وبابها، هتلاقي نطقك واستيعابك للآيات بقى في حتة تانية خالص!`
    }
    return `يا هلا بيك يا صديقي في مدارسة «${courseTitle}»!
المتن ده في فن «${categoryTitle}» مصمم عشان يبني عندك الأساس التأصيلي الرصين.
أهم قاعدة في مدارسته:
1. اقرأ عبارة المتن واضبط نطق ألفاظها.
2. افهم المعنى الإجمالي للمسألة ومحل النزاع فيها.
3. قيّد في كشكولك الضوابط والأمثلة اللي بيذكرها الشارح${instructor ? ` الشيخ ${instructor}` : ''}.
أنا معاك خطوة بخطوة، قولي على أي فقرة أو كلمة محيرانك وهنبسطها سوا!`
  }

  // 2. السؤال عن الألفاظ الصعبة أو الغريبة
  if (q.includes('معنى') || q.includes('الكلمات الصعبة') || q.includes('لفظ') || q.includes('مصطلح')) {
    return `عينيا يا غالي! في المتون العلمية التأصيلية، العلماء بيستعملوا مصطلحات دقيقة جداً عشان يختصروا معاني واسعة في كلمة واحدة:
- مثلاً كلمة **«الأصل»**: بتيجي بمعنى القاعدة المستمرة، أو الدليل، أو الصورة المقيس عليها.
- كلمة **«الندب» أو «المستحب»**: ما يثاب فاعله ولا يعاقب تاركه.
- كلمة **«الكراهة»**: ما يثاب تاركه امتثالاً ولا يعاقب فاعله.
- كلمة **«الصحة»**: ترتب الآثار وموافقة أمر الشارع، ومقابلها **«البطلان والفساد»**.
قولي اللفظ أو الجملة اللي قابلتك في المجلس الحالي، وهشرحلك معناها وأجيبلك مثال واقعي عليها فوراً!`
  }

  // 3. السؤال عن الحفظ وطريقة المذاكرة والتثبيت
  if (q.includes('احفظ') || q.includes('حفظ') || q.includes('انسى') || q.includes('تثبيت') || q.includes('طريقة المذاكرة')) {
    return `سؤال جوهري ومهم جداً يا بطل!
طريقة أئمتنا في ضبط وحفظ المتون بتعتمد على نظام الـ (تكرار والتسميع):
1. **الفهم يسبق الحفظ:** اوعى تحفظ جملة في المتن وأنت مش فاهم مراد الشيخ منها؛ الفهم بيمثل 70% من ثبات المعلومة.
2. **التجزئة الصغيرة:** احفظ سطرين أو 3 سطور فقط في اليوم، وكررهم بصوت مسموع 20 مرة.
3. **الربط بالماضي (المحفوظ التراكمي):** قبل ما تبدأ في درس جديد، اقرأ اللي حفظته من أول المتن لحد ما وصلت.. ده بيمنع النسيان تماماً.
4. **التطبيق الفعلي:** اشرح المسألة دي لأخوك أو صاحبك، أو قيدها كفائدة في كشكولك هنا على المنصة.
العلم صيدٌ والكتابة قيده.. قيّد صيودك بالحبال الواثقة!`
  }

  // 4. التشجيع عند الإحباط أو الشعور بصعوبة العلم
  if (q.includes('صعب') || q.includes('تعبت') || q.includes('مش قادر') || q.includes('محبط') || q.includes('ملل')) {
    return `حقك تفضفض، وأنا سامعك وحاسس بيك جداً يا صديقي..
بس عايزك تفتكر حاجة مهمة قوي: الإمام سفيان الثوري قال: «ما عالجتُ شيئاً أشد عليّ من نيتي»، والإمام الشافعي في بدايته كان بيعيد المسألة عشرات المرات!
طريق طلب العلم مش سباق سرعة؛ ده جهاد ومسير بركة وهدوء.
- لو حسيت بتعب: خد استراحة، اشرب كوباية شاي أو قهوة، واستغفر ربنا وصلي على النبي ﷺ.
- ارجع اسمع مجلس واحد بس بتركيز واكتب فائدة واحدة في الكشكول.
أنت بتطلب ميراث النبوة، والملائكة بتضع أجنحتها لطالب العلم رضاً بما يصنع.. ارفع راسك يا بطل وكمل، أنا فخور بيك!`
  }

  // رد عام ذكي وتأصيلي مشجع
  return `حيّاك الله يا طالب العلم وبوركت همتك في مدارسة «${courseTitle}»!
سؤالك ده يدل على تركيزك واهتمامك بالتأصيل الصحيح.
في فن «${categoryTitle}»، القاعدة الأساسية إننا نربط الفروع بالأصول، ونفهم المسألة بدليلها ومقصدها.
لو عندك استشكال محدد في نقطة معينة من شرح المجلس، اكتبهالي هنا وهنمسكها نفككها مسألة مسألة لحد ما تستقر في ذهنك وتبقى واضحة كالشمس!`
}

/**
 * تطبيع تاريخ المحادثة ليتوافق 100% مع معايير Google Gemini REST API:
 * 1. استبعاد الرسائل الفارغة.
 * 2. حذف أي رسالة ترحيب أولى صادرة من النموذج (Gemini يشترط أن تبدأ المحادثة دائماً بـ user).
 * 3. دمج الرسائل المتتالية الصادرة من نفس الطرف لضمان التبادل الصارم (user -> model -> user).
 * 4. إلحاق السؤال الحالي في آخر المحادثة بدور user.
 */
function buildValidGeminiContents(
  history: Array<{ role: string; text?: string }> | undefined,
  currentQuestion: string,
  courseTitle: string,
  categoryTitle: string
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const rawItems: Array<{ role: 'user' | 'model'; text: string }> = []

  if (Array.isArray(history)) {
    for (const msg of history.slice(-8)) {
      const txt = (msg?.text || '').trim()
      if (!txt) continue
      const role: 'user' | 'model' = msg.role === 'user' ? 'user' : 'model'
      rawItems.push({ role, text: txt })
    }
  }

  // إضافة السؤال الحالي مع سياق المتن
  const enrichedQuestion = `[سياق المدارسة: المتن «${courseTitle}» - الفن «${categoryTitle}»]\nسؤالي أو استشكالي:\n${currentQuestion.trim()}`
  rawItems.push({ role: 'user', text: enrichedQuestion })

  // التأكد من أن البداية بدور user دائماً (حذف أي ترحيب أولي من النموذج)
  while (rawItems.length > 0 && rawItems[0].role !== 'user') {
    rawItems.shift()
  }

  // دمج الرسائل المتتالية لنفس الدور لضمان التبادل الصارم (user / model / user)
  const alternating: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []

  for (const item of rawItems) {
    if (alternating.length === 0) {
      alternating.push({ role: item.role, parts: [{ text: item.text }] })
    } else {
      const last = alternating[alternating.length - 1]
      if (last.role === item.role) {
        last.parts.push({ text: item.text })
      } else {
        alternating.push({ role: item.role, parts: [{ text: item.text }] })
      }
    }
  }

  return alternating
}

/**
 * استدعاء Google Gemini API بنظام المصادقة الرسمي المحدث:
 * - يدعم مفاتيح AI Studio (AIzaSy...) عبر Header: x-goog-api-key و Query: ?key=
 * - يدعم رموز الوصول (Bearer / OAuth ya29... أو AQ...) عبر Header: Authorization: Bearer
 * - يرسل systemInstruction و contents و generationConfig حسب مواصفات v1beta الرسمية
 * - يسجل تفاصيل الأخطاء بدقة في السيرفر لسهولة المتابعة والتشخيص
 */
async function callGemini(
  rawApiKey: string,
  model: string,
  systemInstructionText: string,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
): Promise<string | null> {
  const apiKey = rawApiKey.replace(/^["'`]|["'`]$/g, '').trim()
  if (!apiKey) return null

  const isBearer = apiKey.startsWith('ya29.') || apiKey.startsWith('AQ.')

  // قائمة سيناريوهات المصادقة حسب نوع المفتاح
  const authModes = isBearer
    ? [
        {
          name: 'Bearer Token (OAuth)',
          url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        },
        {
          name: 'API Key Header',
          url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
        },
      ]
    : [
        {
          name: 'Official API Key (Header + Query)',
          url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
        },
        {
          name: 'Bearer Token Fallback',
          url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        },
      ]

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstructionText }],
    },
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2500,
      topP: 0.95,
    },
  }

  for (const auth of authModes) {
    try {
      const response = await fetch(auth.url, {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text && typeof text === 'string' && text.trim()) {
          return text.trim()
        }
      } else {
        const errText = await response.text().catch(() => '')
        console.warn(`[Gemini API] ${model} (${auth.name}) HTTP ${response.status}:`, errText.slice(0, 300))
        
        // إذا كان الخطأ متعلقاً بصيغة systemInstruction، نجرب صيغة snake_case كبديل
        if (response.status === 400 && errText.includes('systemInstruction')) {
          const fallbackPayload = {
            contents,
            system_instruction: {
              parts: [{ text: systemInstructionText }],
            },
            generationConfig: payload.generationConfig,
          }
          const retryRes = await fetch(auth.url, {
            method: 'POST',
            headers: auth.headers,
            body: JSON.stringify(fallbackPayload),
          })
          if (retryRes.ok) {
            const data = await retryRes.json()
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
            if (text && typeof text === 'string' && text.trim()) {
              return text.trim()
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[Gemini API] Fetch exception on ${model} (${auth.name}):`, err)
    }
  }

  return null
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { question, courseTitle, categoryTitle, instructor, history } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { reply: 'أهلاً بك يا غالي! اكتبلي سؤالك أو المسألة اللي محتار فيها وأنا معاك فوراً.' },
        { status: 400 }
      )
    }

    const apiKey = (body.userApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()

    // صياغة السياق المنهجي الشامل للمحادثة
    const systemContext = `${SANAD_AI_SYSTEM_PROMPT}

سياق المدارسة الحالي للطالب:
- المتن العلمي: «${courseTitle || 'متن تأصيلي'}»
- الفن الشرعي: «${categoryTitle || 'علم شرعي'}»
${instructor ? `- الشارح المحقق: ${instructor}` : ''}
`

    // تجهيز تاريخ المحادثة التفاعلية وتطبيعه ليتوافق 100% مع معايير Google Gemini API
    const contents = buildValidGeminiContents(
      history,
      question,
      courseTitle || 'متن تأصيلي',
      categoryTitle || 'العلوم الشرعية'
    )

    // النماذج الأحدث المعتمدة في Google Gemini API بالترتيب
    const modelsToTry = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
      'gemini-2.5-flash',
    ]

    let liveAiReply: string | null = null

    if (apiKey) {
      for (const model of modelsToTry) {
        liveAiReply = await callGemini(apiKey, model, systemContext, contents)
        if (liveAiReply) {
          break
        }
      }
    }

    // 2. إذا تعذر الاتصال بـ Gemini لأي سبب، نقوم باستدعاء محرك الذكاء الاصطناعي الحي الذكي (Live Agent) لمنع أي ردود ثابتة نهائياً
    if (!liveAiReply) {
      try {
        const historyList = Array.isArray(history)
          ? history.slice(-8).map((h) => ({
              role: h.role === 'user' ? 'user' : 'assistant',
              content: String(h.text || ''),
            }))
          : []

        const pollRes = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemContext },
              ...historyList,
              { role: 'user', content: question },
            ],
            model: 'openai',
            seed: Math.floor(Math.random() * 100000),
            temperature: 0.4,
          }),
        })

        if (pollRes.ok) {
          const pollText = await pollRes.text()
          if (pollText && pollText.trim()) {
            liveAiReply = pollText.trim()
          }
        }
      } catch (pollErr) {
        console.warn('[Sanad AI] Pollinations live fallback warning:', pollErr)
      }
    }

    // إذا نجح نموذج الذكاء الاصطناعي الحي (سواء Gemini أو Live Agent)، نرسل الرد المخصص فوراً
    if (liveAiReply) {
      return NextResponse.json({ reply: liveAiReply })
    }

    // إذا لم يكن المفتاح متاحاً أو حدث انقطاع في خوادم API، يعمل محرك التفكيك الشرعي والسلوكي بذكاء واقتدار
    const fallbackReply = generateContextualScholarlyReply(
      question,
      courseTitle || 'المتن التأصيلي',
      categoryTitle || 'العلوم الشرعية',
      instructor
    )

    return NextResponse.json({ reply: fallbackReply })
  } catch (error) {
    console.error('AI ask API exception:', error)
    return NextResponse.json({
      reply: 'منوّر يا بطل! أنا معاك في ضهرك، اكتبلي المسألة تاني كده وركز معايا، هنفككها ونبسطها سوا!',
    })
  }
}
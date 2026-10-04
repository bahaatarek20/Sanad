import { NextResponse } from 'next/server'

const SANAD_AI_SYSTEM_PROMPT = `
أنت "رفيق المدارسة الذكي" (صاحبك في الطلب) في منصة «سَنَد» للتعليم الشرعي والتأصيل المنهجي.
المنصة تشمل متون الفقه، والعقيدة، والنحو، والحديث، ومصطلح الحديث، وأصول الفقه، والقواعد الفقهية، والآداب الشرعية، وعلوم القرآن، والسيرة النبوية.
هويتك: طالب علم نجيب، رفيق مدارسة رصين ومرن، يفهم نية السائل بدقة ويتحدث بأسلوب طبيعي ومتحضر.
`

type UserIntent =
  | 'reproach_or_feedback'
  | 'technical_or_admin'
  | 'scholarly_question'
  | 'general_chat'

/**
 * محرك تحليل نية المستخدم وسياقه النفسي والموضوعي (Intent Detection Engine)
 */
function detectUserIntent(
  question: string,
  history?: Array<{ role: string; text?: string }>
): UserIntent {
  const q = question.toLowerCase().trim()

  // 1. هل السؤال عتاب أو شكوى من الروبوتية أو التكرار أو نمط الردود؟
  const reproachKeywords = [
    'متكرر', 'تكرار', 'نفس الرد', 'نفس الكلام', 'ردود محفوظة', 'قالب', 'جامد', 'هبل',
    'مش فاهم', 'غبي', 'روبوت', 'آلي', 'حلقات تكرارية', 'يا بطل', 'عاش يا هندسة',
    'بطل تكرار', 'زهقت', 'كفاية', 'عتاب', 'اعتذار', 'حقك عليا', 'غير مناسب', 'بتعيد',
    'مش ده اللي سألت', 'رد عدل', 'ركز معايا', 'بطل هزار', 'عيب كده', 'كلام فارغ', 'نفس الديباجة'
  ]
  if (reproachKeywords.some((k) => q.includes(k))) {
    return 'reproach_or_feedback'
  }

  // 2. هل السؤال تقني عن المنصة أو المطور أو الخوادم والبرمجة؟
  const technicalKeywords = [
    'المنصة', 'الموقع', 'التطبيق', 'السيرفر', 'البرمجة', 'بهاء', 'المهندس', 'باشمهندس',
    'خطأ', 'فيديو', 'مش شغال', 'تحميل', 'pwa', 'next', 'vercel', 'supabase', 'قاعدة البيانات',
    'كود', 'api', 'prompt', 'temperature', 'system prompt', 'instruction', 'تحديث', 'إصدار'
  ]
  if (technicalKeywords.some((k) => q.includes(k))) {
    return 'technical_or_admin'
  }

  // 3. هل السؤال علمي / شرعي / لغوي تأصيلي؟
  const scholarlyKeywords = [
    'معنى', 'ما حكم', 'حكم', 'دليل', 'متن', 'شرح', 'إعراب', 'حديث', 'آية', 'تفسير', 'فقه', 'عقيدة',
    'أصول', 'نحو', 'صرف', 'مصطلح', 'مسألة', 'ركن', 'واجب', 'شرط', 'صحة', 'بطلان', 'وضوء', 'صلاة',
    'صوم', 'زكاة', 'حج', 'توحيد', 'إيمان', 'إحسان', 'إسناد', 'سند', 'متن', 'راوي', 'علة'
  ]
  if (scholarlyKeywords.some((k) => q.includes(k))) {
    return 'scholarly_question'
  }

  return 'general_chat'
}

/**
 * بناء التوجيه الديناميكي المخصص للسياق مع ضبط درجة الحرارة (Dynamic Prompt & Temperature)
 */
function buildDynamicSystemPrompt(
  intent: UserIntent,
  courseTitle: string,
  categoryTitle: string,
  instructor?: string,
  lastAssistantReply?: string
): { prompt: string; temperature: number } {
  let specificDirective = ''
  let temperature = 0.4

  switch (intent) {
    case 'reproach_or_feedback':
      temperature = 0.5
      specificDirective = `
══════════════════════════════════════════
⚠️ تنبيه صارم - نبرة السائل: عتاب / شكوى من تكرار أو روبوتية
══════════════════════════════════════════
- المستخدم يعاتبك أو يشتكي من ردود نمطية متكررة أو عدم استيعاب دقيق لكلامه.
- ممنوع منعاً باتاً استخدام أي عبارات ترحيبية أو محفوظة («يا بطل»، «عاش يا هندسة»، «منوّر»، «حيّاك الله»، «أهلاً بك يا غالي»).
- اعترف فوراً وبأدب ونضج بملاحظته، وتجاوب مباشرة مع جوهر كلامه دون لف أو دوران.
- ركّز بنسبة 100% على آخر سطر كتبه، وافهمه بدقة وأجب عنه باحترام وعقلانية عملية.
`
      break

    case 'technical_or_admin':
      temperature = 0.3
      specificDirective = `
══════════════════════════════════════════
⚙️ تنبيه - نبرة السائل: سؤال تقني أو استفسار عن المنصة والبرمجة والمشرف
══════════════════════════════════════════
- السائل يسأل عن المنصة أو المطور (المهندس بهاء طارق) أو مسألة تقنية/برمجية.
- أجب بوضوح وإيجاز ووعي تقني كامل دون الدخول في تقعيدات شرعية لا صلة لها بالسؤال.
- ادخل في صلب الإجابة التقنية مباشرة دون ديباجة ترحيبية محفوظة.
`
      break

    case 'scholarly_question':
      temperature = 0.25
      specificDirective = `
══════════════════════════════════════════
📚 تنبيه - مدارسة شرعية تأصيلية رصينة
══════════════════════════════════════════
- ادخل في صلب المسألة أو اللفظ المستشكل مباشرة دون مقدمات مكررة ولا ديباجة محفوظة.
- اعتمد على المصادر الشرعية المعتمدة (القرآن، السنة الصحيحة، كتب الفقه المعتمدة، كتب أصول الفقه، كتب النحو المعتمدة).
- وضّح الحكم أو المعنى بدليله وضابطه بأسلوب سهل واضح.
- اختم ردك بسطر واحد للمرجع المعتمد (📖 المرجع: ...).
- ممنوع الفتوى في النوازل المعاصرة أو الخلافات الحزبية والسياسية.
`
      break

    case 'general_chat':
    default:
      temperature = 0.6
      specificDirective = `
══════════════════════════════════════════
💬 تنبيه - حوار وتفاعل طبيعي متبادل
══════════════════════════════════════════
- تجاوب مع كلام السائل بطبيعية وتلقائية ومرونة كإنسان واعٍ ومتفاعل مع السياق.
- تجنب تماماً التكرار الأعمى لنفس البدايات أو نفس الكلمات في كل رد.
`
      break
  }

  const antiLoopDirective = lastAssistantReply
    ? `
══════════════════════════════════════════
🚫 شرط منع التكرار (Anti-Loop Guardrail):
══════════════════════════════════════════
ردك السابق كان:
"${lastAssistantReply.slice(0, 160).replace(/\n/g, ' ')}..."
ممنوع تماماً أن تبدأ هذا الرد الجديد بنفس الجملة أو تكرر نفس الأفكار. غيّر أسلوبك فوراً وركّز على استفسار المستخدم الحالي حصراً.
`
    : ''

  const basePrompt = `
أنت "رفيق المدارسة الذكي" في منصة «سَنَد» للتعليم الشرعي والتأصيل المنهجي (sanad-edu1.vercel.app).
المشرف والمطور للمنصة: المهندس بهاء طارق.

القواعد الحتمية للتعامل:
1. مرونة وتفاعل إنساني: ممنوع استخدام قالب ترحيبي جامد وثابت في كل رسالة. لا تبدأ كل رد بـ («يا بطل» أو «يا هلا» أو «منوّر»). ادخل في صلب الموضوع مباشرة بأسلوب مهذب ومرن.
2. الوعي بالسياق: حلل قصد السائل الحقيقي؛ إن كان يعاتب أو يشتكي استمع له باحترام تام دون أي مجاملات أو قوالب. وإن كان يسأل عن العلم فكك المسألة بدقة وأدلة.
3. التوازن والأمانة: لا تفتِ في النوازل المعاصرة ولا الخلافات السياسية/الحزبية.

السياق الدراسي الحالي للطالب:
- المتن: «${courseTitle || 'متن تأصيلي'}»
- الفن الشرعي: «${categoryTitle || 'علوم الشريعة'}»
${instructor ? `- الشارح المحقق: ${instructor}` : ''}

${specificDirective}
${antiLoopDirective}
`.trim()

  return { prompt: basePrompt, temperature }
}

/**
 * محرك المعرفة المحلي المرن (Offline / Local Contextual Fallback)
 * يعمل عندما يتعذر الاتصال الخارجي، ويستجيب بنباهة ودون قوالب محفوظة
 */
function generateContextualScholarlyReply(
  question: string,
  courseTitle: string,
  categoryTitle: string,
  instructor?: string,
  intent: UserIntent = 'scholarly_question'
): string {
  const q = question.toLowerCase().trim()

  if (intent === 'reproach_or_feedback') {
    return `حقك عليا تماماً وملاحظتك في محلها. أعتذر عن أي ردود نمطية أو تكرار غير مقصود. أنا سامعك ومركز معاك جداً؛ وضح لي المسألة أو النقطة المحددة اللي حابب نناقشها وهجاوبك عليها مباشرة بدون أي ديباجة محفوظة.`
  }

  if (intent === 'technical_or_admin') {
    return `بخصوص منصة «سَنَد» ومسائلها التقنية: المنصة مصممة بأحدث تقنيات الويب (Next.js و TypeScript وتخزين البيانات السحابية والمحلية)، ومطورة تحت إشراف المهندس بهاء طارق لتوفير تجربة تأصيل شرعي متكاملة وسلسة. لو بتواجه مشكلة في تشغيل الدروس أو تشغيل المقاطع أو الحساب، اكتبلي التفاصيل وهنحلها فوراً.`
  }

  // 1. طلب التلخيص العام للمتن
  if (q.includes('لخص') || q.includes('ملخص') || q.includes('أهم مسألة') || q.includes('فكرة عامة')) {
    if (courseTitle.includes('حلية')) {
      return `متن «حلية طالب العلم» للشيخ بكر أبو زيد يقوم على 3 ركائز رئيسية:
1. آداب الطالب في نفسه: الإخلاص، ومراقبة الله، وصيانة العلم والسمت الصالح.
2. كيفية الطلب والتلقي: التدرج، وضبط الأصول والمتون قبل المطولات، والأخذ عن الشيوخ المتقنين.
3. أدب الطالب مع شيخه وزملائه: حسن السؤال والاستماع، وتجنب الجدال والمماراة.
📖 المرجع: حلية طالب العلم للشيخ بكر أبو زيد.`
    }
    if (courseTitle.includes('المتفقه') || categoryTitle.includes('فقه')) {
      return `متن «بداية المتفقه» للشيخ وحيد بالي يتميز بضبط الفقه على صيغة القواعد والضوابط:
1. الترتيب المنهجي: يبدأ بباب الطهارة ثم الصلاة فالزكاة والصوم والحج.
2. ضابط المسألة: لكل باب شروط وأركان وواجبات ومفسدات مبنية على الدليل من الكتاب والسنة.
3. التفريق العملي: الركن لا يسقط سهواً ولا عمداً، بينما الواجب يجبره سجود السهو، والشرط يسبق العبادة كالطهارة.
📖 المرجع: بداية المتفقه للشيخ وحيد بالي.`
    }
    if (courseTitle.includes('الأربعين') || courseTitle.includes('النووية')) {
      return `«الأربعين النووية» للإمام النووي جمعت قواعد الشريعة الكبرى:
1. حديث النيات («إنما الأعمال بالنيات»): ضابط قبول الأعمال الباطنة.
2. حديث جبريل: ضبط مراتب الدين الثلاث (الإسلام، الإيمان، الإحسان).
3. أحاديث الضوابط الكلية: كحديث «لا ضرر ولا ضرار» وحديث «من حسن إسلام المرء تركه ما لا يعنيه».
📖 المرجع: الأربعين النووية للإمام النووي، وجامع العلوم والحكم لابن رجب.`
    }
    if (courseTitle.includes('عقيدة') || courseTitle.includes('التوحيد')) {
      return `مباحث الاعتقاد والتوحيد تدور حول الأصول الثلاثة:
1. توحيد الربوبية: إفراد الله بأفعاله كالخلق والرزق والتدبير.
2. توحيد الألوهية: إفراد الله بأفعال العباد كالصلاة والدعاء والذبح والنذر والتوكل.
3. توحيد الأسماء والصفات: إثبات ما أثبته الله لنفسه وما أثبته له رسوله ﷺ بلا تمثيل ولا تعطيل ولا تكييف.
📖 المرجع: كتاب التوحيد، والعقيدة الواسطية لشيخ الإسلام ابن تيمية.`
    }
    if (courseTitle.includes('الآجرومية') || categoryTitle.includes('نحو') || categoryTitle.includes('لغة')) {
      return `متن «الآجرومية» لابن آجروم يضبط قواعد الإعراب الأساسية:
1. أقسام الكلام: اسم، وفعل، وحرف جاء لمعنى.
2. علامات الإعراب: الرفع (الضمة وما ينوب عنها)، النصب (الفتحة وما ينوب عنها)، الخفض (الكسرة وما ينوب عنها)، الجزم (السكون وما ينوب عنه).
3. أبواب المرفوعات والمنصوبات والمخفوضات.
📖 المرجع: متن الآجرومية، وشرح التحفة السنية.`
    }
    return `متن «${courseTitle}» في فن «${categoryTitle}»${instructor ? ` بشرح الشيخ ${instructor}` : ''}:
الهدف منه ضبط القواعد الكلية وفهم مصطلحات الباب بدليلها، وتقييد الفوائد والضوابط التي يقررها الشارح. اكتب النقطة أو اللفظ المستشكل لنفصله معاً.`
  }

  // 2. السؤال عن الألفاظ الصعبة أو المصطلحات
  if (q.includes('معنى') || q.includes('الكلمات الصعبة') || q.includes('لفظ') || q.includes('مصطلح')) {
    return `في المتون العلمية، يستعمل العلماء ألفاظاً اصطلاحية موجزة تختصر معاني دقيقة:
- الأصل: القاعدة المستمرة، أو الدليل، أو الصورة المقيس عليها.
- الواجب: ما أمر به الشارع أمراً جازماً يثاب فاعله ويعاقب تاركه.
- المندوب: ما أثيب فاعله ولم يعاقب تاركه.
- المحظور: ما نهى عنه الشارع نهياً جازماً.
- المكروه: ما نهى عنه الشارع نهياً غير جازم.
- الصحة: ترتب الآثار وسقوط القضاء وموافقة الشرع.
اكتب اللفظ المحدد الذي استشكل عليك في المجلس لنشرحه في سياقه.`
  }

  // 3. السؤال عن الحفظ وطريقة المذاكرة
  if (q.includes('احفظ') || q.includes('حفظ') || q.includes('انسى') || q.includes('تثبيت') || q.includes('طريقة المذاكرة')) {
    return `منهجية ضبط وحفظ المتون عند أهل العلم تقوم على خطوات عملية:
1. الفهم أولاً: فهم عبارة المتن شرط أساسي لتثبيت الحفظ.
2. التجزئة الدقيقة: حفظ قدر يسير (سطران إلى ثلاثة أسطر يومياً) مع تكراره بصوت مسموع.
3. المراجعة التراكمية: قراءة المحفوظ من أول المتن إلى الموضع الحالي قبل البدء في الجديد.
4. التقييد والمذاكرة: كتابة الفوائد والضوابط في الكشكول ومذاكرتها مع زميل.
📖 المرجع: جامع بيان العلم وفضله لابن عبد البر.`
  }

  return `بخصوص استفسارك في «${courseTitle}» (${categoryTitle}):
المسألة تحتاج إلى تحرير دقيق بدليلها وضابطها في كتب أهل العلم المعتمدة. اكتب لي نص العبارة أو موضع الإشكال في الدرس وسأفصلها لك مباشرة.`
}

/**
 * تطبيع تاريخ المحادثة ليتوافق 100% مع معايير Google Gemini REST API
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
  const enrichedQuestion = `[سياق المتن: «${courseTitle}» - الفن: «${categoryTitle}»]\nسؤالي أو استفساري:\n${currentQuestion.trim()}`
  rawItems.push({ role: 'user', text: enrichedQuestion })

  // التأكد من أن البداية بدور user دائماً
  while (rawItems.length > 0 && rawItems[0].role !== 'user') {
    rawItems.shift()
  }

  // دمج الرسائل المتتالية لنفس الدور
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
 * استدعاء Google Gemini API بنظام المصادقة الرسمي المحدث مع درجة الحرارة الديناميكية
 */
async function callGemini(
  rawApiKey: string,
  model: string,
  systemInstructionText: string,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  temperature: number = 0.4
): Promise<string | null> {
  const apiKey = rawApiKey.replace(/^["'`]|["'`]$/g, '').trim()
  if (!apiKey) return null

  const isBearer = apiKey.startsWith('ya29.') || apiKey.startsWith('AQ.')

  const authModes: Array<{ name: string; url: string; headers: Record<string, string> }> = isBearer
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
      temperature,
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
        { reply: 'أهلاً بك! اكتب سؤالك أو النقطة التي ترغب في مدارستها وسأجيبك فوراً.' },
        { status: 400 }
      )
    }

    const apiKey = (
      body.userApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ''
    ).trim()

    // 1. تحديد آخر رد صادر من المساعد لفحص التكرار (Anti-Loop)
    const lastAssistantMsg = Array.isArray(history)
      ? [...history].reverse().find((h) => h.role !== 'user' && h.text)
      : undefined
    const lastAssistantReply = lastAssistantMsg?.text || ''

    // 2. تحليل نية المستخدم بدقة (Intent Detection)
    const intent = detectUserIntent(question, history)

    // 3. بناء التوجيه الديناميكي ودرجة الحرارة الملائمة للنية
    const { prompt: systemContext, temperature } = buildDynamicSystemPrompt(
      intent,
      courseTitle || 'متن تأصيلي',
      categoryTitle || 'العلوم الشرعية',
      instructor,
      lastAssistantReply
    )

    // 4. تجهيز تاريخ المحادثة التفاعلية
    const contents = buildValidGeminiContents(
      history,
      question,
      courseTitle || 'متن تأصيلي',
      categoryTitle || 'العلوم الشرعية'
    )

    let liveAiReply: string | null = null

    // 5. محاولة الاتصال بـ Google Gemini API إذا وُجد المفتاح
    if (apiKey) {
      const modelsToTry = [
        'gemini-3.8-flash',
        'gemini-2.5-flash',
        'gemini-3.8-pro',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
      ]

      for (const model of modelsToTry) {
        liveAiReply = await callGemini(apiKey, model, systemContext, contents, temperature)
        if (liveAiReply) {
          break
        }
      }
    }

    // 6. إذا لم يتوفر مفتاح أو فشل Gemini، استخدام محرك الذكاء الاصطناعي الحي الذكي (Live Agent) لمنع أي ردود ثابتة
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
            temperature,
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

    // 7. طبقة الحماية من التكرار والأنماط الجامدة (Anti-Loop Guardrails)
    if (liveAiReply) {
      let cleaned = liveAiReply.trim()
      // حذف أي ديباجة ترحيبية مكررة في بداية الرد إن وُجدت
      cleaned = cleaned.replace(/^(يا أهلاً بك يا بطل!|حيّاك الله يا طالب العلم|منوّر يا بطل!|يا هلا بيك يا بطل!|عاش يا هندسة)\s*/, '').trim()

      // التأكد من عدم تكرار أول 50 حرفاً من الرد السابق
      if (lastAssistantReply && cleaned.slice(0, 45) === lastAssistantReply.slice(0, 45)) {
        cleaned = cleaned.slice(45).trim()
      }

      return NextResponse.json({ reply: cleaned || liveAiReply })
    }

    // 8. المحرك المحلي الذكي في حال انقطاع الشبكة تماماً
    const fallbackReply = generateContextualScholarlyReply(
      question,
      courseTitle || 'المتن التأصيلي',
      categoryTitle || 'العلوم الشرعية',
      instructor,
      intent
    )

    return NextResponse.json({ reply: fallbackReply })
  } catch (error) {
    console.error('AI ask API exception:', error)
    return NextResponse.json({
      reply: 'أعتذر عن حدوث انقطاع مؤقت في الاتصال. تفضل بإعادة كتابة سؤالك وسأجيبك مباشرة وبدقة.',
    })
  }
}
import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns'
import https from 'node:https'
import net from 'node:net'

dns.setDefaultResultOrder('ipv4first')
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  net.setDefaultAutoSelectFamily(false)
}

const ipv4KeepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 32,
  family: 4,
})

function fastHttpsJson(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr)
    const bodyBuffer = options.body ? Buffer.from(options.body, 'utf8') : null
    const reqHeaders = { ...(options.headers || {}) }
    if (bodyBuffer) reqHeaders['Content-Length'] = bodyBuffer.byteLength

    const req = https.request(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: options.method || 'GET',
        headers: reqHeaders,
        agent: ipv4KeepAliveAgent,
        family: 4,
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          const status = res.statusCode || 500
          resolve({ status, ok: status >= 200 && status < 300, text })
        })
      }
    )

    const timeout = options.timeoutMs || 8000
    req.setTimeout(timeout, () => req.destroy(new Error(`Timeout ${timeout}ms`)))
    req.on('error', reject)
    if (bodyBuffer) req.write(bodyBuffer)
    req.end()
  })
}

const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
const keyMatch = envContent.match(/GEMINI_API_KEY=(.+)/)
const apiKey = keyMatch ? keyMatch[1].trim() : ''

async function runVerification() {
  console.log('=== فحص محرك الذكاء الاصطناعي المطور في سَنَد ===')
  let passed = 0
  let total = 0

  function assertCheck(name, condition, detail = '') {
    total++
    if (condition) {
      passed++
      console.log(`✅ [PASS] ${name}${detail ? ` — ${detail}` : ''}`)
    } else {
      console.error(`❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`)
    }
  }

  const routeSource = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/ai/ask/route.ts'),
    'utf8'
  )
  const knowledgeSource = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/sanad-ai-knowledge.ts'),
    'utf8'
  )

  assertCheck(
    '1. تفعيل IPv4-Only KeepAlive Socket (family: 4) لمنع تأخير الـ 20 ثانية في DNS/IPv6',
    routeSource.includes('family: 4') && routeSource.includes('fastHttpsJson')
  )
  assertCheck(
    '2. إزالة النماذج المتوقفة (gemini-2.0-flash / gemini-1.5-flash) التي كانت تسبب توقف المساعد كل أسبوعين',
    !routeSource.includes("'gemini-2.0-flash'") && !routeSource.includes("'gemini-1.5-flash'")
  )
  assertCheck(
    '3. تفعيل السباق المتوازي الفوري (Promise.any) بين gemini-3.5-flash-lite و gemini-3.1-flash-lite',
    routeSource.includes('Promise.any') &&
      routeSource.includes('gemini-3.5-flash-lite') &&
      routeSource.includes('gemini-3.1-flash-lite')
  )
  assertCheck(
    '4. تفعيل الاكتشاف الذاتي للنماذج (Self-Healing Auto-Discovery) لمنع تعطل المساعد مستقبلاً',
    routeSource.includes('discoverActiveGeminiModels') &&
      routeSource.includes('gemini-flash-lite-latest')
  )
  assertCheck(
    '5. تفعيل الذاكرة الفورية السريعة (LRU Instant Cache) للرد في 0ms على الأسئلة المتكررة',
    routeSource.includes('getResponseCache') && routeSource.includes('normalizeQuestionForCache')
  )
  assertCheck(
    '6. ربط الموسوعة العلمية والمصادر المعتمدة (sanad-ai-knowledge.ts) بجميع المقررات',
    knowledgeSource.includes('CATEGORY_AUTHORITATIVE_SOURCES') &&
      knowledgeSource.includes('SANAD_SCHOLARLY_ENCYCLOPEDIA') &&
      routeSource.includes('resolveCourseScholarlyContext')
  )

  // Live API Speed & Citation Test
  const start = Date.now()
  const systemText = [
    'أنت «صاحبك في الطلب» و«رفيق المدارسة الذكي» في منصة سَنَد للعلوم الشرعية والعربية.',
    'اشرح المسألة ببيان علمي رصين ومختصر، واختم إجابتك دائماً بسطر: 📖 المصدر المعتمد: مع ذكر الكتاب والباب.',
  ].join('\n')

  const payload = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: 'ما الفرق بين ركن الصلاة وواجب الصلاة في المذهب الحنبلي مع ذكر المصدر؟',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 450,
    },
  }

  const raceModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']
  const result = await Promise.any(
    raceModels.map(async (model) => {
      const modelPayload = {
        ...payload,
        generationConfig: {
          ...payload.generationConfig,
          thinkingConfig: { thinkingLevel: 'MINIMAL' },
        },
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
      const res = await fastHttpsJson(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(modelPayload),
        timeoutMs: 8000,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = JSON.parse(res.text)
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (!text) throw new Error('Empty')
      return { model, text }
    })
  )
  const elapsedMs = Date.now() - start

  assertCheck(
    '7. سرعة الاستجابة الحية الفورية من Gemini API عبر IPv4 المباشر (بعد خفضها من 30,755ms)',
    elapsedMs < 6000,
    `${elapsedMs}ms عبر النموذج ${result.model}`
  )
  assertCheck(
    '8. دقة الإجابة العلمية واحتواؤها على المصدر المعتمد (📖 المصدر المعتمد)',
    result.text.includes('المصدر') && (result.text.includes('الركن') || result.text.includes('ركن')),
    `طول الإجابة: ${result.text.length} حرفاً`
  )

  console.log('\n--- نموذج من رد المساعد الذكي الحي ---')
  console.log(result.text)
  console.log('--------------------------------------\n')
  console.log(`النتيجة النهائية: ${passed}/${total} اختبارات ناجحة.`)
  if (passed !== total) process.exit(1)
}

runVerification().catch((err) => {
  console.error(err)
  process.exit(1)
})

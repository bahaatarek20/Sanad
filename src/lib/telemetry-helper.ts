/**
 * محرك استخراج البيانات الجغرافية وعناوين الـ IP وأجهزة الطلاب
 * Sanad Student Geolocation & Device Telemetry Engine
 */

export interface ClientTelemetry {
  ip: string
  country: string
  countryCode: string
  city: string
  device: string
  browser: string
  userAgent: string
}

const COUNTRY_NAMES: Record<string, { name: string; flag: string }> = {
  EG: { name: 'مصر', flag: '🇪🇬' },
  SA: { name: 'المملكة العربية السعودية', flag: '🇸🇦' },
  AE: { name: 'الإمارات العربية المتحدة', flag: '🇦🇪' },
  KW: { name: 'الكويت', flag: '🇰🇼' },
  QA: { name: 'قطر', flag: '🇶🇦' },
  OM: { name: 'سلطنة عمان', flag: '🇴🇲' },
  BH: { name: 'البحرين', flag: '🇧🇭' },
  JO: { name: 'الأردن', flag: '🇯🇴' },
  MA: { name: 'المغرب', flag: '🇲🇦' },
  DZ: { name: 'الجزائر', flag: '🇩🇿' },
  TN: { name: 'تونس', flag: '🇹🇳' },
  IQ: { name: 'العراق', flag: '🇮🇶' },
  YE: { name: 'اليمن', flag: '🇾🇪' },
  SD: { name: 'السودان', flag: '🇸🇩' },
  SY: { name: 'سوريا', flag: '🇸🇾' },
  LB: { name: 'لبنان', flag: '🇱🇧' },
  PS: { name: 'فلسطين', flag: '🇵🇸' },
  LY: { name: 'ليبيا', flag: '🇱🇾' },
  MR: { name: 'موريتانيا', flag: '🇲🇷' },
  SO: { name: 'الصومال', flag: '🇸🇴' },
  DJ: { name: 'جيبوتي', flag: '🇩🇯' },
  KM: { name: 'جزر القمر', flag: '🇰🇲' },
  TR: { name: 'تركيا', flag: '🇹🇷' },
  US: { name: 'الولايات المتحدة', flag: '🇺🇸' },
  GB: { name: 'المملكة المتحدة', flag: '🇬🇧' },
  DE: { name: 'ألمانيا', flag: '🇩🇪' },
  FR: { name: 'فرنسا', flag: '🇫🇷' },
  CA: { name: 'كندا', flag: '🇨🇦' },
  MY: { name: 'ماليزيا', flag: '🇲🇾' },
  ID: { name: 'إندونيسيا', flag: '🇮🇩' },
  PK: { name: 'باكستان', flag: '🇵🇰' },
  IN: { name: 'الهند', flag: '🇮🇳' },
  RU: { name: 'روسيا', flag: '🇷🇺' },
  NL: { name: 'هولندا', flag: '🇳🇱' },
  SE: { name: 'السويد', flag: '🇸🇪' },
}

export function parseDeviceFromUserAgent(ua: string): { device: string; browser: string } {
  if (!ua) return { device: 'غير محدد', browser: 'غير محدد' }

  // نوع الجهاز ونظام التشغيل
  let device = 'كمبيوتر مكتبي (Desktop)'
  if (/Android/i.test(ua)) {
    device = /Mobile/i.test(ua) ? 'هاتف ذكي (Android)' : 'لوحي (Android Tablet)'
  } else if (/iPhone/i.test(ua)) {
    device = 'آيفون (Apple iPhone)'
  } else if (/iPad/i.test(ua)) {
    device = 'آيباد (Apple iPad)'
  } else if (/Windows/i.test(ua)) {
    device = 'كمبيوتر محمول (Windows)'
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    device = 'ماك بوك (macOS)'
  } else if (/Linux/i.test(ua)) {
    device = 'حاسوب (Linux)'
  }

  // المتصفح
  let browser = 'متصفح ويب'
  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge'
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Google Chrome'
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = 'Apple Safari'
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Mozilla Firefox'
  } else if (/Opera|OPR\//i.test(ua)) {
    browser = 'Opera'
  } else if (/SamsungBrowser\//i.test(ua)) {
    browser = 'Samsung Internet'
  }

  return { device, browser }
}

export function getCountryInfo(code?: string): { country: string; flag: string; countryCode: string } {
  if (!code) return { country: 'غير محدد', flag: '🌐', countryCode: 'XX' }
  const upper = code.toUpperCase().trim()
  const found = COUNTRY_NAMES[upper]
  if (found) {
    return {
      country: found.name,
      flag: found.flag,
      countryCode: upper,
    }
  }
  return { country: upper, flag: '🌍', countryCode: upper }
}

export function extractClientTelemetry(headersSource: Headers | Record<string, string | null | undefined>): ClientTelemetry {
  const getHeader = (key: string): string => {
    if (typeof (headersSource as any).get === 'function') {
      return (headersSource as Headers).get(key) || ''
    }
    return (headersSource as Record<string, string>)[key] || ''
  }

  // استخراج الـ IP الحقيقي
  const forwarded = getHeader('x-forwarded-for')
  const realIp = getHeader('x-real-ip')
  const cfIp = getHeader('cf-connecting-ip')
  let ip = '127.0.0.1'

  if (forwarded) {
    ip = forwarded.split(',')[0].trim()
  } else if (cfIp) {
    ip = cfIp.trim()
  } else if (realIp) {
    ip = realIp.trim()
  }

  // تنظيف الـ IP المحلي في بيئة التطوير
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1')) {
    ip = '156.204.12.34' // IP افتراضي للبيئة المحلية
  }

  // استخراج كود الدولة والمدينة
  const rawCountryCode = getHeader('x-vercel-ip-country') || getHeader('cf-ipcountry') || 'EG'
  const countryData = getCountryInfo(rawCountryCode)

  let city = getHeader('x-vercel-ip-city') || ''
  try {
    city = decodeURIComponent(city)
  } catch {}
  if (!city && countryData.countryCode === 'EG') {
    city = 'القاهرة'
  }

  // تحليل الجهاز والمتصفح
  const ua = getHeader('user-agent') || ''
  const { device, browser } = parseDeviceFromUserAgent(ua)

  return {
    ip,
    country: `${countryData.flag} ${countryData.country}`,
    countryCode: countryData.countryCode,
    city: city || 'الرئيسية',
    device,
    browser,
    userAgent: ua,
  }
}

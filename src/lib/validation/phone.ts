// Phone helpers: a country dial code plus a national number → E.164.

/** Dial codes offered in the country picker. Saudi Arabia first (default). */
export const DIAL_CODES = [
  { iso: 'SA', code: '966' },
  { iso: 'AE', code: '971' },
  { iso: 'KW', code: '965' },
  { iso: 'QA', code: '974' },
  { iso: 'BH', code: '973' },
  { iso: 'OM', code: '968' },
  { iso: 'EG', code: '20' },
  { iso: 'JO', code: '962' },
  { iso: 'IQ', code: '964' },
  { iso: 'LB', code: '961' },
  { iso: 'MA', code: '212' },
  { iso: 'DZ', code: '213' },
  { iso: 'TN', code: '216' },
  { iso: 'SD', code: '249' },
  { iso: 'YE', code: '967' },
  { iso: 'PS', code: '970' },
  { iso: 'SY', code: '963' },
  { iso: 'LY', code: '218' },
  { iso: 'TR', code: '90' },
  { iso: 'PK', code: '92' },
  { iso: 'IN', code: '91' },
  { iso: 'GB', code: '44' },
  { iso: 'US', code: '1' },
] as const

export const DEFAULT_DIAL_CODE = '966'

/** Regional flag emoji for an ISO 3166-1 alpha-2 code (renders as letters where flags are unsupported). */
export const flagEmoji = (iso: string) => String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))

/** Typical mobile number shape after the dial code, used as the placeholder and hint example. */
const MOBILE_EXAMPLES: Record<string, string> = {
  '966': '5X XXX XXXX',
  '971': '5X XXX XXXX',
  '965': 'XXXX XXXX',
  '974': 'XXXX XXXX',
  '973': 'XXXX XXXX',
  '968': '9XXX XXXX',
  '20': '1X XXXX XXXX',
  '962': '7X XXX XXXX',
  '964': '7XX XXX XXXX',
  '961': 'XX XXX XXX',
  '212': '6XX XXX XXX',
  '213': '5XX XX XX XX',
  '216': 'XX XXX XXX',
  '249': '9X XXX XXXX',
  '967': '7XX XXX XXX',
  '970': '5XX XXX XXX',
  '963': '9XX XXX XXX',
  '218': '9X XXX XXXX',
  '90': '5XX XXX XX XX',
  '92': '3XX XXX XXXX',
  '91': 'XXXXX XXXXX',
  '44': '7XXX XXX XXX',
  '1': 'XXX XXX XXXX',
}
export const mobileExample = (dialCode: string | null | undefined) => MOBILE_EXAMPLES[dialCode || DEFAULT_DIAL_CODE] ?? 'XXX XXX XXXX'

/**
 * Dial code implied by the scorecard's country answer, only when it names exactly one country.
 * The default answers ("Saudi Arabia or the UAE", "another GCC country") are ambiguous and return null.
 */
export function dialCodeForCountryAnswer(answer: string | null | undefined): string | null {
  if (!answer) return null
  const iso = { ksa: 'SA', saudi: 'SA', uae: 'AE' }[answer.toLowerCase()] ?? answer.toUpperCase()
  return DIAL_CODES.find((d) => d.iso === iso)?.code ?? null
}
export const DIAL_CODE_VALUES = DIAL_CODES.map((d) => d.code) as unknown as [string, ...string[]]

const ARABIC_DIGITS = /[٠-٩۰-۹]/g

/** Converts Arabic-Indic digits to Western digits. */
export function westernDigits(input: string) {
  return input.replace(ARABIC_DIGITS, (d) => String((d.charCodeAt(0) & 0xf) % 10))
}

/**
 * Builds an E.164 number. Accepts national numbers with or without a trunk 0 and
 * numbers already typed in international form (+966…, 00966…).
 */
export function toE164(dialCode: string, national: string): string {
  let digits = westernDigits(national || '').trim()
  const international = digits.startsWith('+') || digits.startsWith('00')
  digits = digits.replace(/\D/g, '')
  if (international) {
    if (digits.startsWith('00')) digits = digits.slice(2)
    return `+${digits}`
  }
  if (digits.startsWith(dialCode) && digits.length > dialCode.length + 7) return `+${digits}`
  digits = digits.replace(/^0+/, '')
  return `+${dialCode}${digits}`
}

export type PhoneProblem = 'invalid' | 'saudi' | 'uae' | null

export function checkE164(e164: string): PhoneProblem {
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return 'invalid'
  if (e164.startsWith('+966') && !/^\+9665\d{8}$/.test(e164)) return 'saudi'
  if (e164.startsWith('+971') && !/^\+9715\d{8}$/.test(e164)) return 'uae'
  return null
}

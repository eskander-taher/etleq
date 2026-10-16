// Hand-written validation messages. Arabic is written first; English is not a translation of it.
export type ValidationLocale = 'ar' | 'en'

export interface ValidationMessages {
  nameRequired: string
  nameTooShort: string
  nameTooLong: string
  phoneRequired: string
  phoneInvalid: string
  phoneSaudi: string
  phoneUae: string
  emailRequired: string
  emailInvalid: string
  consentRequired: string
  messageRequired: string
  messageTooShort: string
  messageTooLong: string
  answerRequired: string
  textTooLong: string
}

export const messages: Record<ValidationLocale, ValidationMessages> = {
  ar: {
    nameRequired: 'اكتب اسمك لنعرف كيف نناديك.',
    nameTooShort: 'الاسم قصير جدًا، اكتبه كاملًا من فضلك.',
    nameTooLong: 'الاسم طويل جدًا، اختصره إلى 80 حرفًا أو أقل.',
    phoneRequired: 'نحتاج رقم واتساب لنرسل لك النتيجة.',
    phoneInvalid: 'هذا الرقم لا يبدو صحيحًا. تأكّد من رمز الدولة وعدد الأرقام.',
    phoneSaudi: 'رقم الجوال السعودي يبدأ بـ 5 ويتكوّن من 9 أرقام، مثل 5X XXX XXXX.',
    phoneUae: 'رقم الجوال الإماراتي يبدأ بـ 5 ويتكوّن من 9 أرقام، مثل 5X XXX XXXX.',
    emailRequired: 'اكتب بريدك الإلكتروني.',
    emailInvalid: 'تأكّد من البريد الإلكتروني، مثل name@example.com.',
    consentRequired: 'نحتاج موافقتك على سياسة الخصوصية لنتواصل معك.',
    messageRequired: 'اكتب رسالتك باختصار.',
    messageTooShort: 'أخبرنا بقليل من التفاصيل، 10 أحرف على الأقل.',
    messageTooLong: 'الرسالة طويلة جدًا، اختصرها إلى 2000 حرف أو أقل.',
    answerRequired: 'اختر إجابة واحدة للمتابعة.',
    textTooLong: 'النص طويل جدًا، اختصره إلى 1000 حرف أو أقل.',
  },
  en: {
    nameRequired: 'Please tell us your name.',
    nameTooShort: 'That name looks too short. Please write your full name.',
    nameTooLong: 'Please keep your name under 80 characters.',
    phoneRequired: 'We need a WhatsApp number to send you your result.',
    phoneInvalid: "That number doesn't look right. Check the country code and the number of digits.",
    phoneSaudi: 'Saudi mobile numbers start with 5 and have 9 digits, like 5X XXX XXXX.',
    phoneUae: 'UAE mobile numbers start with 5 and have 9 digits, like 5X XXX XXXX.',
    emailRequired: 'Please enter your email address.',
    emailInvalid: 'Please check your email address, e.g. name@example.com.',
    consentRequired: 'Please accept the privacy policy so we can contact you.',
    messageRequired: 'Please write a short message.',
    messageTooShort: 'Give us a little more detail: at least 10 characters.',
    messageTooLong: 'Please keep your message under 2,000 characters.',
    answerRequired: 'Choose one answer to continue.',
    textTooLong: 'Please keep this under 1,000 characters.',
  },
}

export function whatsappLink({ number, message, ref }: { number?: string | null; message: string; ref?: string }) {
  const n = (number || process.env.WHATSAPP_NUMBER || '').replace(/[^\d]/g, '')
  const text = ref ? `${message} (ref: ${ref})` : message
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

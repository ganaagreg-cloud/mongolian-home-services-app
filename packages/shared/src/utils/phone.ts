export function normalizePhone(raw: string): string {
  let phone = raw.replace(/[\s\-]/g, '')
  if (phone.startsWith('+976')) phone = phone.slice(4)
  else if (phone.startsWith('976')) phone = phone.slice(3)
  return phone
}

export function validateMongolianPhone(phone: string): boolean {
  return /^[89]\d{7}$/.test(phone)
}

export function formatPhoneNumberForWhatsApp(phoneNumber: string | undefined): string {
  if (!phoneNumber) return '';
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('504')) {
    return cleaned;
  }
  
  return `504${cleaned}`;
}

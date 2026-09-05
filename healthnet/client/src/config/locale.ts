/**
 * Indian Localization Parameters & Formatting Helpers
 * Country: India (IN)
 * Currency: INR (₹)
 * Timezone: Asia/Kolkata (IST, UTC+05:30)
 * Phone Code: +91
 * Date Format: DD/MM/YYYY
 */

export const LOCALE_CONFIG = {
  country: 'India',
  countryCode: 'IN',
  currency: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee'
  },
  timezone: 'Asia/Kolkata',
  phoneCode: '+91',
  dateFormat: 'DD/MM/YYYY',
  languages: [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' }
  ],
  states: [
    'Maharashtra',
    'Gujarat',
    'Karnataka',
    'Delhi',
    'Telangana',
    'Tamil Nadu',
    'Uttar Pradesh',
    'West Bengal'
  ],
  cities: [
    'Mumbai',
    'Pune',
    'Nagpur',
    'Bengaluru',
    'Delhi',
    'Hyderabad',
    'Ahmedabad',
    'Chennai'
  ]
};

/**
 * Format a Date object or ISO string as DD/MM/YYYY
 */
export function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '--/--/----';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '--/--/----';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '--/--/----';
  }
}

/**
 * Format a Date object or ISO string as DD/MM/YYYY, hh:mm A in Asia/Kolkata
 */
export function formatDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '--/--/---- --:--';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '--/--/---- --:--';
    
    // Format using Intl in Asia/Kolkata timezone
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return formatter.format(d);
  } catch {
    return formatDate(dateInput);
  }
}

/**
 * Format timestamp into IST Time string e.g. "02:30 PM IST"
 */
export function formatTimeIST(dateInput?: string | Date | null): string {
  if (!dateInput) return '--:--';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '--:--';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d) + ' IST';
  } catch {
    return '--:--';
  }
}

/**
 * Format an amount in INR with Indian numbering system (Lakhs / Crores)
 * e.g. 150000 -> ₹1,50,000
 */
export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format phone number to Indian +91 format
 */
export function formatIndianPhone(phoneStr: string): string {
  if (!phoneStr) return '+91 98200 00000';
  const cleaned = phoneStr.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+91')) {
    return cleaned;
  }
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phoneStr;
}

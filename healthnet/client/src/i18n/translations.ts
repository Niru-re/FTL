/**
 * HealthNet Multilingual Localization Dictionaries
 * English (en), Hindi (hi), Marathi (mr)
 */

export type LanguageCode = 'en' | 'hi' | 'mr';

export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    mr: string;
  };
}

export const translations: Translations = {
  // Brand & Header
  appName: {
    en: 'HealthNet India',
    hi: 'हेल्थनेट भारत',
    mr: 'हेल्थनेट भारत'
  },
  tagline: {
    en: 'National Integrated Healthcare Grid',
    hi: 'राष्ट्रीय एकीकृत स्वास्थ्य सेवा ग्रिड',
    mr: 'राष्ट्रीय एकात्मिक आरोग्य सेवा ग्रिड'
  },
  portalPatientFamily: {
    en: 'Patient & Family Portal',
    hi: 'रोगी एवं परिवार पोर्टल',
    mr: 'रुग्ण आणि कुटुंब पोर्टल'
  },
  liveConnected: {
    en: 'LIVE CONNECTED (IST)',
    hi: 'लाइव कनेक्टेड (IST)',
    mr: 'थेट जोडलेले (IST)'
  },
  signOut: {
    en: 'Sign Out',
    hi: 'साइन आउट',
    mr: 'बाहेर पडा'
  },
  signIn: {
    en: 'Sign In',
    hi: 'साइन इन करें',
    mr: 'साइन इन करा'
  },

  // Primary Navigation
  navHome: {
    en: 'Home',
    hi: 'मुख्य पृष्ठ',
    mr: 'मुख्य पान'
  },
  navUpdates: {
    en: 'Care Updates',
    hi: 'उपचार अपडेट',
    mr: 'उपचार अपडेट'
  },
  navCareTeam: {
    en: 'Care Team',
    hi: 'चिकित्सा दल',
    mr: 'वैद्यकीय पथक'
  },
  navAppointments: {
    en: 'Appointments',
    hi: 'अपॉइंटमेंट्स',
    mr: 'अपॉइंटमेंट्स'
  },
  navDocuments: {
    en: 'Documents & Records',
    hi: 'दस्तावेज़ और रिपोर्ट',
    mr: 'कागदपत्रे व अहवाल'
  },
  navTimeline: {
    en: 'Timeline & Milestones',
    hi: 'समयरेखा और चरण',
    mr: 'वेळापत्रक आणि टप्पे'
  },
  navMedications: {
    en: 'Medications',
    hi: 'दवाइयाँ',
    mr: 'औषधे'
  },
  navLabs: {
    en: 'Lab Results',
    hi: 'लैब परिणाम',
    mr: 'लॅब अहवाल'
  },
  navHospital: {
    en: 'Hospital & Campus',
    hi: 'अस्पताल एवं परिसर',
    mr: 'रुग्णालय आणि परिसर'
  },
  navRequests: {
    en: 'Care Requests',
    hi: 'देखभाल अनुरोध',
    mr: 'काळजी विनंत्या'
  },
  navFamily: {
    en: 'Authorized Family',
    hi: 'अधिकृत परिवार',
    mr: 'अधिकृत कुटुंब'
  },
  navNotifications: {
    en: 'Notifications',
    hi: 'सूचनाएं',
    mr: 'सूचना'
  },
  navProfile: {
    en: 'Patient Profile',
    hi: 'रोगी प्रोफ़ाइल',
    mr: 'रुग्ण प्रोफाइल'
  },

  // Clinical Questions / Headlines
  whereIsPatient: {
    en: 'Where is my patient?',
    hi: 'मेरा मरीज कहाँ है?',
    mr: 'माझे रुग्ण कुठे आहेत?'
  },
  whatIsStatus: {
    en: 'What is their current status?',
    hi: 'उनकी वर्तमान स्थिति क्या है?',
    mr: 'त्यांची सद्यस्थिती काय आहे?'
  },
  whoIsTakingCare: {
    en: 'Who is taking care of them?',
    hi: 'उनकी देखभाल कौन कर रहा है?',
    mr: 'त्यांची काळजी कोण घेत आहे?'
  },
  whatHappenedRecently: {
    en: 'What has happened recently?',
    hi: 'हाल ही में क्या हुआ है?',
    mr: 'नुकतेच काय घडले आहे?'
  },

  // Clinical Statuses
  statusStable: {
    en: 'STABLE — Resting comfortably under observation',
    hi: 'स्थिर — निगरानी में आराम कर रहे हैं',
    mr: 'स्थिर — निरीक्षणाखाली विश्रांती घेत आहेत'
  },
  statusHighRisk: {
    en: 'HIGH RISK — Intensive care monitoring underway',
    hi: 'उच्च जोखिम — गहन चिकित्सा निगरानी जारी है',
    mr: 'उच्च जोखीम — अतिदक्षता देखरेख सुरू आहे'
  },
  statusCritical: {
    en: 'CRITICAL — Your care team is closely monitoring your condition',
    hi: 'गंभीर — आपका चिकित्सा दल स्थिति की बारीकी से निगरानी कर रहा है',
    mr: 'गंभीर — तुमचे वैद्यकीय पथक स्थितीचे बारकाईने निरीक्षण करत आहे'
  },
  statusDischarging: {
    en: 'DISCHARGE PREPARATION — Paperwork and discharge planning underway',
    hi: 'डिस्चार्ज तैयारी — कागजी कार्रवाई और डिस्चार्ज योजना जारी है',
    mr: 'डिस्चार्ज तयारी — कागदपत्रे आणि सोडण्याची तयारी सुरू आहे'
  },

  // Vitals
  vitalsHeartRate: {
    en: 'Heart Rate',
    hi: 'हृदय गति',
    mr: 'हृदयाचे ठोके'
  },
  vitalsOxygen: {
    en: 'Oxygen Level (SpO2)',
    hi: 'ऑक्सीजन स्तर (SpO2)',
    mr: 'ऑक्सिजन पातळी (SpO2)'
  },
  vitalsBP: {
    en: 'Blood Pressure',
    hi: 'रक्तचाप (BP)',
    mr: 'रक्तदाब (BP)'
  },
  vitalsTemp: {
    en: 'Temperature',
    hi: 'तापमान',
    mr: 'तापमान'
  },
  vitalsDisclaimer: {
    en: 'Informational only — not a diagnostic interpretation.',
    hi: 'केवल सूचना के लिए — नैदानिक निष्कर्ष नहीं।',
    mr: 'केवळ माहितीसाठी — वैद्यकीय निदान नाही.'
  },

  // Helpline Card
  needHelp: {
    en: 'Need Immediate Help?',
    hi: 'क्या आपको तत्काल सहायता चाहिए?',
    mr: 'त्वरित मदतीची आवश्यकता आहे?'
  },
  helplineDesc: {
    en: 'For urgent non-emergency questions, call the hospital patient liaison desk.',
    hi: 'तत्काल प्रश्नों के लिए, अस्पताल रोगी सहायता डेस्क पर संपर्क करें।',
    mr: 'तातडीच्या प्रश्नांसाठी रुग्णालय संपर्क कक्षाशी संपर्क साधा.'
  },
  callDesk: {
    en: 'Call Helpdesk (+91)',
    hi: 'हेल्पडेस्क पर कॉल करें (+91)',
    mr: 'हेल्पडेस्कला कॉल करा (+91)'
  },

  // States & Regions
  regionMaharashtra: {
    en: 'Maharashtra Network',
    hi: 'महाराष्ट्र नेटवर्क',
    mr: 'महाराष्ट्र नेटवर्क'
  },
  regionDelhi: {
    en: 'Delhi NCR Hub',
    hi: 'दिल्ली एनसीआर हब',
    mr: 'दिल्ली एनसीआर केंद्र'
  },
  regionKarnataka: {
    en: 'Karnataka Hub (Bengaluru)',
    hi: 'कर्नाटक हब (बेंगलुरु)',
    mr: 'कर्नाटक केंद्र (बेंगळुरू)'
  },

  // Demo Login Buttons
  demoPatientBtn: {
    en: 'Demo Patient Login (Raj Mehta - PT-1042)',
    hi: 'डेमो रोगी लॉगिन (राज मेहता - PT-1042)',
    mr: 'डेमो रुग्ण लॉगिन (राज मेहता - PT-1042)'
  },
  demoFamilyBtn: {
    en: 'Demo Family Login (Sarah Mehta - Daughter)',
    hi: 'डेमो परिवार लॉगिन (सारा मेहता - सुपुत्री)',
    mr: 'डेमो कुटुंब लॉगिन (सारा मेहता - कन्या)'
  },
  demoDoctorBtn: {
    en: 'Doctor (Dr. Arjun Sharma)',
    hi: 'डॉक्टर (डॉ. अर्जुन शर्मा)',
    mr: 'डॉक्टर (डॉ. अर्जुन शर्मा)'
  },
  demoNurseBtn: {
    en: 'Nurse (Nurse Elena Rostova)',
    hi: 'नर्स (नर्स एलेना रोस्तोवा)',
    mr: 'परिचारिका (नर्स एलेना रोस्तोवा)'
  },
  demoAdminBtn: {
    en: 'Administrator (National Ops)',
    hi: 'प्रशासक (राष्ट्रीय परिचालन)',
    mr: 'प्रशासक (राष्ट्रीय संचालन)'
  }
};

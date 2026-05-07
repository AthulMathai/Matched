export function detectCountryFromBrowser() {
  if (typeof window === "undefined") return "";

  const locale = navigator.language || "";
  const localeCountry = locale.split("-")[1];

  if (localeCountry && localeCountry.length === 2) {
    return localeCountry.toUpperCase();
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

  const timezoneCountryMap: Record<string, string> = {
    "America/Toronto": "CA",
    "America/Vancouver": "CA",
    "America/Montreal": "CA",
    "America/Edmonton": "CA",
    "America/Winnipeg": "CA",
    "America/Halifax": "CA",
    "America/St_Johns": "CA",

    "America/New_York": "US",
    "America/Chicago": "US",
    "America/Denver": "US",
    "America/Los_Angeles": "US",
    "America/Phoenix": "US",
    "America/Anchorage": "US",
    "Pacific/Honolulu": "US",

    "Europe/London": "GB",
    "Europe/Dublin": "IE",
    "Europe/Paris": "FR",
    "Europe/Berlin": "DE",
    "Europe/Rome": "IT",
    "Europe/Madrid": "ES",
    "Europe/Lisbon": "PT",
    "Europe/Amsterdam": "NL",
    "Europe/Brussels": "BE",
    "Europe/Zurich": "CH",
    "Europe/Stockholm": "SE",
    "Europe/Oslo": "NO",
    "Europe/Copenhagen": "DK",
    "Europe/Helsinki": "FI",
    "Europe/Warsaw": "PL",
    "Europe/Athens": "GR",
    "Europe/Istanbul": "TR",

    "Asia/Dubai": "AE",
    "Asia/Kolkata": "IN",
    "Asia/Karachi": "PK",
    "Asia/Dhaka": "BD",
    "Asia/Colombo": "LK",
    "Asia/Kathmandu": "NP",
    "Asia/Manila": "PH",
    "Asia/Singapore": "SG",
    "Asia/Kuala_Lumpur": "MY",
    "Asia/Jakarta": "ID",
    "Asia/Bangkok": "TH",
    "Asia/Tokyo": "JP",
    "Asia/Seoul": "KR",
    "Asia/Shanghai": "CN",
    "Asia/Hong_Kong": "HK",
    "Asia/Taipei": "TW",

    "Australia/Sydney": "AU",
    "Australia/Melbourne": "AU",
    "Australia/Brisbane": "AU",
    "Australia/Perth": "AU",
    "Pacific/Auckland": "NZ",

    "Africa/Johannesburg": "ZA",
    "Africa/Lagos": "NG",
    "Africa/Cairo": "EG",
    "Africa/Nairobi": "KE",
    "Africa/Casablanca": "MA",

    "America/Mexico_City": "MX",
    "America/Sao_Paulo": "BR",
    "America/Argentina/Buenos_Aires": "AR",
    "America/Bogota": "CO",
    "America/Lima": "PE",
    "America/Santiago": "CL",
  };

  return timezoneCountryMap[timezone] || "";
}
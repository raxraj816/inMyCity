/**
 * The vocabulary a Mumbai user actually types.
 *
 * Search matches text against curated content, and the two rarely use the same spelling: the
 * listing says "vada pav", the user types "vadapav"; the listing says "Chhatrapati Shivaji
 * Maharaj Terminus", the user types "CST" or "सीएसटी". Each group below names one thing, with
 * every spelling, abbreviation, Hinglish rendering and Devanagari form we expect for it. The
 * search route expands a query through these groups before it reaches the database, so all of
 * them find the same rows.
 *
 * This is city content, not code: adding a dish, a station or a neighbourhood alias means
 * adding a group here, never branching in a screen or a route.
 */
export type SearchSynonymGroup = {
  /** The spelling the content itself is most likely to use. */
  canonical: string;
  /** Everything else a user might type for it, including Devanagari. */
  aliases: string[];
};

/** Dishes and drinks, including the spellings that never survive a transliteration. */
const FOOD: SearchSynonymGroup[] = [
  { canonical: "vada pav", aliases: ["vadapav", "wada pav", "wadapav", "vada paav", "vada pao", "batata vada", "वडा पाव"] },
  { canonical: "pav bhaji", aliases: ["pavbhaji", "paav bhaji", "pao bhaji", "पाव भाजी"] },
  { canonical: "pani puri", aliases: ["panipuri", "gol gappa", "golgappa", "puchka", "pani poori", "पाणी पुरी"] },
  { canonical: "bhel puri", aliases: ["bhelpuri", "bhel", "भेळ"] },
  { canonical: "sev puri", aliases: ["sevpuri", "shev puri"] },
  { canonical: "chaat", aliases: ["chat", "chatt", "chaat items", "चाट"] },
  { canonical: "misal pav", aliases: ["misal", "missal pav", "misalpav", "मिसळ पाव"] },
  { canonical: "dosa", aliases: ["masala dosa", "dosai", "dose", "डोसा"] },
  { canonical: "idli", aliases: ["idly", "इडली"] },
  { canonical: "biryani", aliases: ["biriyani", "briyani", "biriani", "बिर्याणी"] },
  { canonical: "kebab", aliases: ["kabab", "kebabs", "seekh kebab", "sheekh kabab", "कबाब"] },
  { canonical: "frankie", aliases: ["kathi roll", "kaathi roll", "roll"] },
  { canonical: "bombay sandwich", aliases: ["masala sandwich", "toast sandwich"] },
  { canonical: "falooda", aliases: ["faluda", "फालूदा"] },
  { canonical: "kulfi", aliases: ["kulfi falooda", "कुल्फी"] },
  { canonical: "cutting chai", aliases: ["chai", "cutting", "tea", "chaha", "चाय"] },
  { canonical: "irani chai", aliases: ["irani cafe", "irani", "bun maska", "brun maska", "maska pav"] },
  { canonical: "thali", aliases: ["thaali", "unlimited thali", "थाळी"] },
  { canonical: "puran poli", aliases: ["puranpoli", "पुरण पोळी"] },
  { canonical: "modak", aliases: ["ukadiche modak", "मोदक"] },
  { canonical: "solkadhi", aliases: ["sol kadhi", "सोलकढी"] },
  { canonical: "nihari", aliases: ["nahari", "niharis"] },
  { canonical: "haleem", aliases: ["halim"] },
  { canonical: "malpua", aliases: ["malpuas"] },
  { canonical: "dhansak", aliases: ["parsi food", "parsi", "akuri", "berry pulao", "sali boti"] },
  { canonical: "seafood", aliases: ["fish", "machhi", "bombil", "bombay duck", "surmai", "pomfret", "prawns", "koliwada", "crab"] },
  { canonical: "street food", aliases: ["streetfood", "roadside food", "khau galli", "khaugalli", "chowpatty food"] },
  { canonical: "khana", aliases: ["food", "eat", "khaana", "खाना"] },
];

/** Dietary filters people type as words rather than as filter chips. */
const DIET: SearchSynonymGroup[] = [
  { canonical: "vegetarian", aliases: ["veg", "veg only", "pure veg", "shakahari", "no non veg", "शाकाहारी"] },
  { canonical: "non vegetarian", aliases: ["non veg", "nonveg", "non-veg", "mansahari"] },
  { canonical: "jain", aliases: ["jain food", "no onion no garlic", "jain thali"] },
  { canonical: "vegan", aliases: ["plant based"] },
  { canonical: "halal", aliases: ["halal food"] },
];

/** Neighbourhoods, with the suffixes and Devanagari spellings people use. */
const NEIGHBOURHOODS: SearchSynonymGroup[] = [
  { canonical: "colaba", aliases: ["colaba causeway", "apollo bunder", "कुलाबा"] },
  { canonical: "fort", aliases: ["kala ghoda", "ballard estate", "फोर्ट"] },
  { canonical: "churchgate", aliases: ["चर्चगेट"] },
  { canonical: "marine drive", aliases: ["queens necklace", "queen's necklace", "nariman point", "मरीन ड्राइव"] },
  { canonical: "girgaon", aliases: ["girgaum", "chowpatty", "girgaum chowpatty", "गिरगाव"] },
  { canonical: "byculla", aliases: ["भायखळा", "bhaykhala"] },
  { canonical: "dadar", aliases: ["shivaji park", "दादर"] },
  { canonical: "matunga", aliases: ["माटुंगा"] },
  { canonical: "mahim", aliases: ["माहीम"] },
  { canonical: "bandra", aliases: ["bandra west", "bandra east", "bnd", "bandstand", "carter road", "बांद्रा"] },
  { canonical: "bandra kurla complex", aliases: ["bkc", "kurla complex", "jio world"] },
  { canonical: "khar", aliases: ["khar west", "खार"] },
  { canonical: "santacruz", aliases: ["santa cruz", "सांताक्रूझ"] },
  { canonical: "vile parle", aliases: ["parle", "vileparle", "विलेपार्ले"] },
  { canonical: "andheri", aliases: ["andheri west", "andheri east", "अंधेरी"] },
  { canonical: "juhu", aliases: ["juhu beach", "जुहू"] },
  { canonical: "versova", aliases: ["वर्सोवा"] },
  { canonical: "lower parel", aliases: ["kamala mills", "todi mills", "elphinstone", "prabhadevi", "लोअर परळ"] },
  { canonical: "worli", aliases: ["worli sea face", "वरळी"] },
  { canonical: "powai", aliases: ["hiranandani", "पवई"] },
  { canonical: "ghatkopar", aliases: ["घाटकोपर"] },
  { canonical: "chembur", aliases: ["चेंबूर"] },
  { canonical: "malad", aliases: ["मालाड"] },
  { canonical: "goregaon", aliases: ["गोरेगाव"] },
  { canonical: "borivali", aliases: ["बोरिवली"] },
  { canonical: "thane", aliases: ["ठाणे"] },
  { canonical: "navi mumbai", aliases: ["vashi", "belapur", "नवी मुंबई"] },
];

/** Suburban rail, metro and the terminus everybody calls by a different name. */
const TRANSIT: SearchSynonymGroup[] = [
  {
    canonical: "chhatrapati shivaji maharaj terminus",
    aliases: ["cst", "csmt", "vt", "victoria terminus", "chhatrapati shivaji terminus", "सीएसटी", "छत्रपती शिवाजी टर्मिनस"],
  },
  { canonical: "mumbai central", aliases: ["bct", "mumbai central station"] },
  { canonical: "lokmanya tilak terminus", aliases: ["ltt", "kurla terminus"] },
  { canonical: "local train", aliases: ["local", "train", "mumbai local", "suburban", "western line", "central line", "harbour line", "लोकल"] },
  { canonical: "metro", aliases: ["mumbai metro", "aqua line", "metro line", "मेट्रो"] },
  { canonical: "monorail", aliases: ["mono", "mono rail"] },
  { canonical: "bus", aliases: ["best bus", "best", "bus stop", "बस"] },
  { canonical: "auto rickshaw", aliases: ["auto", "rickshaw", "riksha", "tuk tuk", "रिक्षा"] },
  { canonical: "taxi", aliases: ["cab", "kaali peeli", "kali peeli", "black and yellow", "टॅक्सी"] },
  { canonical: "ferry", aliases: ["boat", "jetty", "ro ro", "water taxi"] },
];

/** Landmarks, venues and the places listings name differently from users. */
const LANDMARKS: SearchSynonymGroup[] = [
  { canonical: "gateway of india", aliases: ["gateway", "गेटवे ऑफ इंडिया"] },
  { canonical: "siddhivinayak", aliases: ["siddhi vinayak", "siddhivinayak temple", "सिद्धिविनायक"] },
  { canonical: "haji ali", aliases: ["haji ali dargah", "हाजी अली"] },
  { canonical: "elephanta caves", aliases: ["elephanta", "gharapuri"] },
  { canonical: "sanjay gandhi national park", aliases: ["sgnp", "borivali national park", "kanheri caves"] },
  { canonical: "chhatrapati shivaji maharaj vastu sangrahalaya", aliases: ["csmvs", "prince of wales museum", "museum"] },
  { canonical: "high street phoenix", aliases: ["phoenix mills", "palladium", "phoenix"] },
  { canonical: "mall", aliases: ["shopping mall", "shopping centre", "inorbit", "r city", "oberoi mall"] },
  { canonical: "market", aliases: ["bazaar", "bazar", "mandi", "crawford market", "chor bazaar", "बाजार"] },
  { canonical: "beach", aliases: ["chowpatty", "aksa", "samudra", "sea face", "समुद्र किनारा"] },
  { canonical: "park", aliases: ["garden", "udyan", "maidan", "hanging gardens", "उद्यान"] },
  { canonical: "temple", aliases: ["mandir", "मंदिर"] },
  { canonical: "mosque", aliases: ["masjid", "dargah", "मस्जिद"] },
  { canonical: "church", aliases: ["cathedral", "girja", "चर्च"] },
];

/** Cinemas and the words people use instead of "movie". */
const CINEMA: SearchSynonymGroup[] = [
  { canonical: "pvr", aliases: ["pvr inox", "pvr cinemas", "inox", "पीव्हीआर"] },
  { canonical: "cinepolis", aliases: ["cinepolis cinemas"] },
  { canonical: "carnival cinemas", aliases: ["carnival"] },
  { canonical: "gaiety galaxy", aliases: ["g7", "g7 multiplex", "gaiety"] },
  { canonical: "regal cinema", aliases: ["regal", "eros", "liberty cinema", "metro cinema"] },
  { canonical: "movie", aliases: ["movies", "film", "filmy", "cinema", "showtimes", "picture", "फिल्म", "सिनेमा"] },
];

/** What people call the categories the app already has. */
const CATEGORIES: SearchSynonymGroup[] = [
  { canonical: "restaurant", aliases: ["restaurants", "dining", "place to eat", "dinner", "lunch", "breakfast"] },
  { canonical: "cafe", aliases: ["coffee", "coffee shop", "cafes", "kaapi", "कॅफे"] },
  { canonical: "bar", aliases: ["pub", "drinks", "beer", "cocktails", "daaru", "sharab", "बार"] },
  { canonical: "nightclub", aliases: ["club", "clubbing", "party", "night out", "नाइटक्लब"] },
  { canonical: "rooftop", aliases: ["roof top", "terrace bar", "sky bar"] },
  { canonical: "gym", aliases: ["fitness", "workout", "gyms", "जिम"] },
  { canonical: "hotel", aliases: ["hotels", "stay", "rooms", "lodging", "होटल"] },
  { canonical: "hospital", aliases: ["clinic", "emergency", "रुग्णालय"] },
  { canonical: "pharmacy", aliases: ["chemist", "medical store", "मेडिकल"] },
  { canonical: "atm", aliases: ["cash machine", "एटीएम"] },
  { canonical: "budget", aliases: ["cheap", "sasta", "affordable", "under 500", "स्वस्त"] },
  { canonical: "luxury", aliases: ["premium", "expensive", "mehenga", "upscale", "fine dining"] },
  { canonical: "late night", aliases: ["open late", "raat", "midnight", "after midnight", "24 hours"] },
  { canonical: "family friendly", aliases: ["kids", "children", "family"] },
  { canonical: "monsoon", aliases: ["rain", "rainy", "barish", "पाऊस"] },
];

/** The city itself, which half the city still calls something else. */
const CITY: SearchSynonymGroup[] = [
  { canonical: "mumbai", aliases: ["bombay", "bom", "मुंबई", "बॉम्बे"] },
];

export const MUMBAI_SEARCH_SYNONYMS: SearchSynonymGroup[] = [
  ...FOOD,
  ...DIET,
  ...NEIGHBOURHOODS,
  ...TRANSIT,
  ...LANDMARKS,
  ...CINEMA,
  ...CATEGORIES,
  ...CITY,
];

/** Synonym groups for a city id, empty for cities with no curated vocabulary yet. */
export function searchSynonymsForCity(cityId: string): SearchSynonymGroup[] {
  return cityId.toLowerCase() === "mumbai" ? MUMBAI_SEARCH_SYNONYMS : [];
}

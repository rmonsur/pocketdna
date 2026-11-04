/**
 * Provider label resolution (ATLAS 6/7): a reviewed table from 23andMe and
 * AncestryDNA regional labels to present-day reference populations in the
 * era panels. A label resolves only through this table; nothing is geocoded
 * from the label text. Unresolved labels stay in captions but draw no marker.
 */

export interface ResolvedRegion {
  /** Normalized provider label the rule matched. */
  label: string;
  /** Present-day panel population ids whose sampling locations may illustrate the label. */
  sourceIds: string[];
}

interface RegionRule {
  keywords: string[];
  sourceIds: string[];
}

/** First matching rule wins; keywords are matched against the normalized label. */
const RULES: RegionRule[] = [
  { keywords: ["orkney", "orcadian"], sourceIds: ["Orcadian"] },
  { keywords: ["british", "irish", "england", "scotland", "wales", "ireland", "scottish", "english"], sourceIds: ["English", "Scottish", "Orcadian"] },
  { keywords: ["icelandic", "iceland"], sourceIds: ["Icelandic"] },
  { keywords: ["scandinavian", "norwegian", "swedish", "danish", "norway", "sweden", "denmark"], sourceIds: ["Norwegian", "Icelandic"] },
  { keywords: ["sardinian", "sardinia"], sourceIds: ["Sardinian"] },
  { keywords: ["maltese", "malta"], sourceIds: ["Maltese"] },
  { keywords: ["cypriot", "cyprus"], sourceIds: ["Cypriot"] },
  { keywords: ["greek", "aegean", "crete"], sourceIds: ["Greek_Crete", "Albanian"] },
  { keywords: ["italian", "italy"], sourceIds: ["Sardinian", "Maltese"] },
  { keywords: ["spanish", "portuguese", "iberian", "basque"], sourceIds: ["Spanish_Aragon_North"] },
  { keywords: ["balkan", "albanian", "croatian", "bulgarian", "romanian", "serbian"], sourceIds: ["Albanian", "Croatian", "Bulgarian", "Romanian"] },
  { keywords: ["hungarian", "hungary"], sourceIds: ["Hungarian"] },
  { keywords: ["polish", "poland", "czech", "slovak", "belarusian", "ukrainian", "eastern european", "eastern europe", "baltic", "estonian", "lithuanian", "latvian"], sourceIds: ["Polish", "Belarusian", "Czech", "Estonian"] },
  { keywords: ["russian", "russia"], sourceIds: ["Russian_Krasnoborsky", "Russian_Pinezhsky"] },
  { keywords: ["finnish", "finland", "saami", "sami"], sourceIds: ["Saami", "Karelian"] },
  { keywords: ["southern european", "southern europe"], sourceIds: ["Sardinian", "Greek_Crete", "Spanish_Aragon_North"] },
  { keywords: ["northwestern european", "northwest european", "northern european", "northern europe", "french", "german", "dutch", "belgian", "western european", "western europe"], sourceIds: ["English", "Norwegian", "Orcadian"] },
  { keywords: ["broadly european", "european"], sourceIds: ["English", "Polish", "Sardinian"] },
  { keywords: ["turkish", "anatolian", "turkey"], sourceIds: ["Turkish_Balikesir", "Turkish_Trabzon"] },
  { keywords: ["armenian", "georgian", "caucasus", "caucasian", "azerbaijani"], sourceIds: ["Armenian_Hemsheni", "Adygei", "Chechen", "Ossetian"] },
  { keywords: ["iranian", "persian", "mesopotamian", "kurdish", "assyrian"], sourceIds: ["Iranian_Zoroastrian", "Iranian_Bandari", "Assyrian"] },
  { keywords: ["druze"], sourceIds: ["Druze"] },
  { keywords: ["samaritan"], sourceIds: ["Samaritan"] },
  { keywords: ["levantine", "lebanese", "syrian", "palestinian", "jordanian", "arab", "egyptian"], sourceIds: ["Palestinian", "Syrian", "Jordanian", "Lebanese_Christian", "Druze"] },
  { keywords: ["bedouin", "arabian", "saudi", "yemeni", "peninsular arab", "gulf"], sourceIds: ["BedouinA", "BedouinB", "Saudi"] },
  { keywords: ["yemenite jewish", "yemenite jew"], sourceIds: ["Yemenite_Jew"] },
  { keywords: ["iraqi jewish", "iraqi jew", "mizrahi"], sourceIds: ["Iraqi_Jew"] },
  { keywords: ["north african", "northern african", "moroccan", "algerian", "tunisian", "berber", "amazigh", "maghreb"], sourceIds: ["Moroccan", "Algerian", "Tunisian", "Mozabite"] },
  { keywords: ["somali", "ethiopian", "eritrean", "horn of africa"], sourceIds: ["Somali", "Somali_Kenya"] },
  { keywords: ["sudanese", "nilotic", "dinka", "nilo"], sourceIds: ["Dinka"] },
  { keywords: ["kenyan", "tanzanian", "ugandan", "east african", "eastern african", "masai", "maasai"], sourceIds: ["Masai", "Luo", "Kikuyu"] },
  { keywords: ["nigerian", "yoruba", "igbo", "ghanaian", "west african", "western african", "senegambian", "mandenka", "gambian"], sourceIds: ["Yoruba", "Igbo", "Mandenka", "Gambian"] },
  { keywords: ["congolese", "central african", "cameroonian", "angolan", "kongo"], sourceIds: ["Kongo", "Lemande", "Biaka"] },
  { keywords: ["southern african", "khoisan", "san ", "namibian", "south african"], sourceIds: ["Khomani_San", "Ju_hoan_North"] },
  { keywords: ["sub-saharan", "broadly african", "african"], sourceIds: ["Yoruba", "Dinka", "Kikuyu"] },
  { keywords: ["bengali", "bangladeshi"], sourceIds: ["Tharu", "Bahun", "Mala"] },
  { keywords: ["punjabi", "pakistani", "pathan", "balochi", "northern indian"], sourceIds: ["Brahui", "Makrani", "Kalash", "Burusho"] },
  { keywords: ["gujarati", "southern indian", "south indian", "tamil", "telugu", "kerala"], sourceIds: ["Mala", "Madiga", "Irula", "Khonda_Dora"] },
  { keywords: ["nepali", "nepalese", "himalayan", "sherpa", "tibetan"], sourceIds: ["Bahun", "Newar", "Sherpa", "Tibetan"] },
  { keywords: ["indian", "south asian", "central and south asian", "central & south asian"], sourceIds: ["Bahun", "Brahui", "Mala", "Tharu"] },
  { keywords: ["central asian", "uzbek", "turkmen", "kazakh", "kyrgyz", "tajik", "hazara", "mongolian", "mongol"], sourceIds: ["Uzbek", "Turkmen", "Kazakh", "Hazara", "Mongol"] },
  { keywords: ["japanese"], sourceIds: ["Japanese"] },
  { keywords: ["korean"], sourceIds: ["Korean"] },
  { keywords: ["chinese", "han", "dai", "east asian", "eastern asian"], sourceIds: ["Dai", "She", "Tujia", "Japanese"] },
  { keywords: ["filipino", "philippine", "austronesian", "indonesian", "malaysian", "malay"], sourceIds: ["Igorot", "Malay", "Dusun"] },
  { keywords: ["vietnamese", "thai", "cambodian", "khmer", "lao", "burmese", "myanmar", "southeast asian"], sourceIds: ["Thai", "Cambodian", "Lao", "Burmese"] },
  { keywords: ["siberian", "yakut", "evenk", "nganasan", "chukchi", "arctic"], sourceIds: ["Nganasan", "Buryat", "Chukchi", "Selkup"] },
  { keywords: ["melanesian", "papuan", "new guinea"], sourceIds: ["Papuan"] },
  { keywords: ["polynesian", "hawaiian", "maori", "samoan", "tongan"], sourceIds: ["Hawaiian", "Maori"] },
  { keywords: ["aboriginal australian", "australian"], sourceIds: ["Australian"] },
  { keywords: ["indigenous american", "native american", "amerindian", "indigenous mexican", "mesoamerican", "andean", "amazonian", "first nations"], sourceIds: ["Mayan", "Pima", "Quechua", "Mixe", "Karitiana"] },
];

export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve one provider label; null when no reviewed rule applies. */
export function resolveProviderLabel(label: string): ResolvedRegion | null {
  const normalized = normalizeLabel(label);
  if (normalized === "") return null;
  for (const rule of RULES) {
    if (rule.keywords.some((k) => normalized.includes(k))) return { label: normalized, sourceIds: rule.sourceIds };
  }
  return null;
}

export interface ProviderShareLike {
  id: string;
  label: string;
  weight: number;
}

export interface ResolvedShare {
  share: ProviderShareLike;
  sourceIds: string[];
}

/** Resolve every provider share that has a reviewed rule, heaviest first. */
export function resolveProviderShares(shares: ProviderShareLike[]): ResolvedShare[] {
  return [...shares]
    .sort((a, b) => b.weight - a.weight)
    .flatMap((share) => {
      const resolved = resolveProviderLabel(share.label);
      return resolved === null ? [] : [{ share, sourceIds: resolved.sourceIds }];
    });
}

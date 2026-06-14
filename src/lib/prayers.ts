/** The traditional prayers of the Most Holy Rosary, Latin and English.
 *  Public-domain texts; the English follows the customary Catholic
 *  ("thee/thou") form to match the app's voice. Not Scripture — fixed
 *  editorial constants, so they never pass through the translation pipeline. */

export interface Prayer {
  id: string;
  /** Disclosure heading, "Latin · English". */
  title: string;
  la: string;
  en: string;
}

export const PRAYERS: Prayer[] = [
  {
    id: "pater",
    title: "Pater Noster · Our Father",
    la: "Pater noster, qui es in cælis, sanctificétur nomen tuum. Advéniat regnum tuum. Fiat volúntas tua, sicut in cælo et in terra. Panem nostrum quotidiánum da nobis hódie, et dimítte nobis débita nostra, sicut et nos dimíttimus debitóribus nostris. Et ne nos indúcas in tentatiónem, sed líbera nos a malo. Amen.",
    en: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen."
  },
  {
    id: "ave",
    title: "Ave Maria · Hail Mary",
    la: "Ave María, grátia plena, Dóminus tecum. Benedícta tu in muliéribus, et benedíctus fructus ventris tui, Iesus. Sancta María, Mater Dei, ora pro nobis peccatóribus, nunc et in hora mortis nostræ. Amen.",
    en: "Hail Mary, full of grace, the Lord is with thee; blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen."
  },
  {
    id: "gloria",
    title: "Gloria Patri · Glory Be",
    la: "Glória Patri, et Fílio, et Spirítui Sancto. Sicut erat in princípio, et nunc, et semper, et in sǽcula sæculórum. Amen.",
    en: "Glory be to the Father, and to the Son, and to the Holy Ghost. As it was in the beginning, is now, and ever shall be, world without end. Amen."
  },
  {
    id: "fatima",
    title: "Oratio Fatimæ · The Fatima Prayer",
    la: "O mi Iesu, dimítte nobis débita nostra, líbera nos ab igne inférni, condúc in cælum omnes ánimas, præsértim illas quæ misericórdiæ tuæ máxime indígent. Amen.",
    en: "O my Jesus, forgive us our sins, save us from the fires of hell; lead all souls to heaven, especially those in most need of thy mercy. Amen."
  },
  {
    id: "salve",
    title: "Salve Regina · Hail Holy Queen",
    la: "Salve, Regína, Mater misericórdiæ, vita, dulcédo, et spes nostra, salve. Ad te clamámus, éxsules fílii Hevæ. Ad te suspirámus, geméntes et flentes in hac lacrimárum valle. Eia ergo, advocáta nostra, illos tuos misericórdes óculos ad nos convérte. Et Iesum, benedíctum fructum ventris tui, nobis post hoc exsílium osténde. O clemens, o pia, o dulcis Virgo María. Amen.",
    en: "Hail, holy Queen, Mother of mercy, our life, our sweetness, and our hope. To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us; and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Amen."
  }
];

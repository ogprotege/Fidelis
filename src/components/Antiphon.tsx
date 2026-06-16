import { Season } from "../lib/liturgical";

/**
 * The hour's Marian devotion line for the Today-in-the-Church card
 * (design spec §6): the Angelus ordinarily, Regina Caeli in Eastertide.
 * Tapping expands the full prayer, Latin and English side by side —
 * both texts are traditional and public domain.
 */

interface Verse {
  la: string;
  en: string;
}

const ANGELUS: Verse[] = [
  {
    la: "V. Angelus Domini nuntiavit Mariæ. R. Et concepit de Spiritu Sancto. Ave Maria…",
    en: "V. The Angel of the Lord declared unto Mary. R. And she conceived of the Holy Ghost. Hail Mary…"
  },
  {
    la: "V. Ecce ancilla Domini. R. Fiat mihi secundum verbum tuum. Ave Maria…",
    en: "V. Behold the handmaid of the Lord. R. Be it done unto me according to thy word. Hail Mary…"
  },
  {
    la: "V. Et Verbum caro factum est. R. Et habitavit in nobis. Ave Maria…",
    en: "V. And the Word was made flesh. R. And dwelt among us. Hail Mary…"
  },
  {
    la: "V. Ora pro nobis, sancta Dei Genetrix. R. Ut digni efficiamur promissionibus Christi.",
    en: "V. Pray for us, O holy Mother of God. R. That we may be made worthy of the promises of Christ."
  },
  {
    la: "Oremus. Gratiam tuam, quæsumus, Domine, mentibus nostris infunde: ut qui, Angelo nuntiante, Christi Filii tui incarnationem cognovimus, per passionem eius et crucem ad resurrectionis gloriam perducamur. Per eundem Christum Dominum nostrum. Amen.",
    en: "Let us pray. Pour forth, we beseech Thee, O Lord, Thy grace into our hearts; that we, to whom the Incarnation of Christ Thy Son was made known by the message of an Angel, may by His Passion and Cross be brought to the glory of His Resurrection. Through the same Christ our Lord. Amen."
  }
];

const REGINA_CAELI: Verse[] = [
  {
    la: "Regina cæli, lætare, alleluia: Quia quem meruisti portare, alleluia: Resurrexit, sicut dixit, alleluia: Ora pro nobis Deum, alleluia.",
    en: "Queen of Heaven, rejoice, alleluia: For He whom thou didst merit to bear, alleluia: Hath risen as He said, alleluia: Pray for us to God, alleluia."
  },
  {
    la: "V. Gaude et lætare, Virgo Maria, alleluia. R. Quia surrexit Dominus vere, alleluia.",
    en: "V. Rejoice and be glad, O Virgin Mary, alleluia. R. For the Lord is risen indeed, alleluia."
  },
  {
    la: "Oremus. Deus, qui per resurrectionem Filii tui Domini nostri Iesu Christi mundum lætificare dignatus es: præsta, quæsumus; ut per eius Genetricem Virginem Mariam perpetuæ capiamus gaudia vitæ. Per eundem Christum Dominum nostrum. Amen.",
    en: "Let us pray. O God, who through the resurrection of Thy Son our Lord Jesus Christ didst vouchsafe to give joy to the world: grant, we beseech Thee, that through His Mother, the Virgin Mary, we may obtain the joys of everlasting life. Through the same Christ our Lord. Amen."
  }
];

export default function Antiphon({ season }: { season: Season }) {
  const eastertide = season === "Eastertide";
  const name = eastertide ? "Regina Caeli" : "The Angelus";
  const verses = eastertide ? REGINA_CAELI : ANGELUS;

  return (
    <details className="antiphon">
      <summary className="sans small">
        {name} <span className="muted">— the hour's Marian prayer</span>
      </summary>
      <div className="antiphon-body">
        {verses.map((v, i) => (
          <div className="antiphon-verse" key={i}>
            <p className="antiphon-la">{v.la}</p>
            <p className="antiphon-en">{v.en}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

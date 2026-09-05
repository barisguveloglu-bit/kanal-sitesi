import { yetenekKaydet } from "./kayit.js";
import { yagmurIsi } from "./_yagmur.js";
import {
  hedefBul, kollariIndir, kilitliHedef, varlikKonumu, actionbarYaz
} from "../yardimcilar.js";
import {
  SIMSEK_ESYA, MENZIL, SIMSEK_SAYISI, SIMSEK_GRUP, SIMSEK_ARALIK,
  KILIT_ACIK, KILIT_MENZIL, KILIT_ACI, KILIT_SAYISI, SIMSEK_OYUNCU_HEDEF
} from "../ayarlar.js";

/* YON SIMSEGI -- baktigin yere simsek yagmuru.

   HEDEF KILIDI (v4.5):
   Once bakis konisinde bir varlik araniyor. Varsa simsek o
   varligin USTUNE dusuyor ve hedef kacarsa PESINDEN gidiyor
   (merkez her partide yeniden okunuyor). Hedef yoksa eskisi gibi
   baktigin NOKTAYA yagiyor -- yani hicbir sey kaybolmuyor, sadece
   nisan aliyor.

   Referans mod (Dave1545) bunu "@e[r=10,c=1]" ile yapiyordu:
   yaricaptaki en yakin varlik. O secici oyuncunun KENDISINI de
   kapsiyor ve bakis yonunu gozetmiyordu, yani arkandaki koyun da
   "hedef" olabiliyordu. kilitliHedef ikisini de duzeltiyor.

   Kilitliyken daha AZ simsek dusuyor (KILIT_SAYISI): tek bir moba
   20 yildirim atmak hem gereksiz hem tick israfi -- nisan alinca
   zaten hepsi tutuyor.                                             */
yetenekKaydet({
  kimlik: "yon_simsegi",
  ad: "Yon Simsegi",
  esya: SIMSEK_ESYA,
  esyasiz: true,
  sira: 20,

  olustur(oyuncu) {
    let kilit;
    if (KILIT_ACIK) {
      /* v7.39: OYUNCU DA HEDEF. Eskiden bu secenek hic
         gecilmiyordu ve koniHedefleri oyunculari varsayilan
         olarak atliyor -- yani duelloda kilit rakibe HIC
         takilmiyordu, sadece moblara takiliyordu. Yetenegin
         PvP'de nisan yardimi yoktu.                         */
      kilit = kilitliHedef(oyuncu, {
        menzil: KILIT_MENZIL, aci: KILIT_ACI,
        oyuncuDahil: SIMSEK_OYUNCU_HEDEF
      });
    }

    /* Kilit varsa merkez hedefin konumu, yoksa baktigin nokta.
       kilitliHedef gecerli bir varlik dondurse bile konumu bu
       tick icinde okunamayabilir; o durumda normal yola dusulur. */
    const hedef = kilit ? varlikKonumu(kilit) : undefined;

    if (kilit && hedef) {
      actionbarYaz(oyuncu, "§e⚡ §fkilitlendi §7· " + kisaAd(kilit));
      return yagmurIsi({
        ad: "yon_simsegi",
        oyuncu: oyuncu,
        hedef: hedef,
        kilit: kilit,
        varlik: "minecraft:lightning_bolt",
        toplam: KILIT_SAYISI,
        yukseklik: 0,
        aralik: SIMSEK_ARALIK,
        grup: SIMSEK_GRUP,
        halka: null
      });
    }

    const nokta = hedefBul(oyuncu, MENZIL);
    if (!nokta) {
      kollariIndir(oyuncu);
      return undefined;
    }
    return yagmurIsi({
      ad: "yon_simsegi",
      oyuncu: oyuncu,
      hedef: nokta,
      varlik: "minecraft:lightning_bolt",
      toplam: SIMSEK_SAYISI,
      yukseklik: 0,
      aralik: SIMSEK_ARALIK,
      grup: SIMSEK_GRUP,
      halka: null
    });
  }
});

/* "minecraft:zombie" -> "zombie". Actionbar'da tam kimlik cok uzun. */
function kisaAd(varlik) {
  try {
    const t = varlik.typeId || "";
    const i = t.indexOf(":");
    return i === -1 ? t : t.slice(i + 1);
  } catch (e) {
    return "hedef";
  }
}

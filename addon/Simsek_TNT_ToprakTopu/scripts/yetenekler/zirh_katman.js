import { yetenekKaydet } from "./kayit.js";
import { elindekiCekirdek } from "./zirh.js";
import {
  hataYaz, bilgiYaz, actionbarYaz, kollariIndir
} from "../yardimcilar.js";
import {
  ZIRH_KATMAN_ACIK, ZIRH_MATKAP_OZELLIK, ZIRH_MATKAP_MOD,
  ZIRH_MATKAP_SIRA, ZIRH_MODLAR
} from "../ayarlar.js";

/* ================================================================
   ACILABILIR KATMANLAR                                     v5.8

   Kullanici: "guc modunu actigin zaman direkt elimde matkap
   oluyor; normalde matkap icin yetenekler kismi var ya, agac
   seklinde, tek tek acabiliyorsun."

   HAKLIYDI. Kaynakta (strength_mode.json) matkap
   `drill_hands`, tur `palladium:tool_hands`, list_index 1,
   hidden_in_bar FALSE -- yani yetenek BARINDA bir slot,
   oyuncu acip kapatiyor. Bizde cekirdek eldeyse hep cizili
   olarak gelmisti.

   ---- KANAL NEDEN VARLIK OZELLIGI ----
   Katmani cizen sey KAYNAK PAKET (gorunus), script degil.
   Kaynak paketin script'ten haber alabildigi tek yol
   q.property. Dinamik ozellik (setDynamicProperty) molang'dan
   OKUNAMIYOR, o yuzden ise yaramaz.

   ---- OZELLIK YOKSA ----
   setProperty her surumde yok. Yoksa matkap KAPALI kaliyor ve
   bir kez bilgi yaziliyor. Bilerek boyle: eski davranisa
   ("hep acik") donmek kullanicinin sikayet ettigi seye geri
   donmek olurdu.
   ================================================================ */

/* undefined = henuz olculmedi (mahou'daki kalibin aynisi) */
let ozellikVar;

function ozellikDestekli(oyuncu) {
  if (ozellikVar !== undefined) return ozellikVar;
  ozellikVar = typeof oyuncu.setProperty === "function" &&
               typeof oyuncu.getProperty === "function";
  if (!ozellikVar) {
    bilgiYaz("Varlik ozelligi yok: matkap katmani acilamiyor. " +
             "Guc modunun diger her seyi calisiyor.");
  }
  return ozellikVar;
}

/* ---- NEDEN HER CAGRIDA typeof ----
   ozellikDestekli() tek seferlik: ilk oyuncuda olcup
   onbellege aliyor (mahou'daki kalip). Ama olcum ONBELLEKTE
   dururken cagrilan bir oyuncuda fonksiyon YOKSA yazma yolu
   korumasiz kaliyordu -- testin 5. bolumu tam bunu yakaladi
   ve TypeError dustu. Onbellek KULLANICIYA MESAJ icin;
   guvenlik her cagrida burada.                              */
function oku(oyuncu, ad) {
  try {
    if (typeof oyuncu.getProperty !== "function") return false;
    return oyuncu.getProperty(ad) === true;
  } catch (e) {
    return false;
  }
}

function yaz(oyuncu, ad, deger) {
  try {
    if (typeof oyuncu.setProperty !== "function") return false;
    oyuncu.setProperty(ad, deger);
    return true;
  } catch (e) {
    hataYaz("zirh_katman.yaz", e);
    return false;
  }
}

/* Disaridan (test ve baska yetenekler) sorulabilsin. */
export function matkapAcikMi(oyuncu) {
  if (!ZIRH_KATMAN_ACIK) return false;
  return oku(oyuncu, ZIRH_MATKAP_OZELLIK);
}

/* Cekirdek elden cikinca katman da kapansin: yoksa Guc
   cekirdegini birakip baska bir moda gecince matkap
   "acik" olarak defterde kalirdi.                            */
export function katmanTazele(oyuncu) {
  if (!ZIRH_KATMAN_ACIK) return;
  if (!ozellikDestekli(oyuncu)) return;
  if (!oku(oyuncu, ZIRH_MATKAP_OZELLIK)) return;
  let cekirdek;
  try { cekirdek = elindekiCekirdek(oyuncu); } catch (e) { return; }
  if (cekirdek !== ZIRH_MATKAP_MOD) {
    yaz(oyuncu, ZIRH_MATKAP_OZELLIK, false);
  }
}

yetenekKaydet({
  kimlik: "zirh_matkap",
  ad: "Matkap Elleri",
  esyasiz: true,
  sira: ZIRH_MATKAP_SIRA,

  olustur(oyuncu) {
    if (!ZIRH_KATMAN_ACIK) return undefined;
    let cekirdek;
    try { cekirdek = elindekiCekirdek(oyuncu); } catch (e) { cekirdek = undefined; }
    if (cekirdek !== ZIRH_MATKAP_MOD) {
      const t = ZIRH_MODLAR.get(ZIRH_MATKAP_MOD);
      actionbarYaz(oyuncu, "§7Matkap için §f" + (t ? t.ad : ZIRH_MATKAP_MOD) +
                   " §7çekirdeği gerek");
      kollariIndir(oyuncu);
      return undefined;
    }
    if (!ozellikDestekli(oyuncu)) {
      actionbarYaz(oyuncu, "§7Matkap bu sürümde açılamıyor");
      kollariIndir(oyuncu);
      return undefined;
    }
    const simdi = oku(oyuncu, ZIRH_MATKAP_OZELLIK);
    if (yaz(oyuncu, ZIRH_MATKAP_OZELLIK, !simdi)) {
      actionbarYaz(oyuncu, simdi ? "§7⛏ Matkap kapandı"
                                 : "§6⛏ Matkap açıldı");
    }
    kollariIndir(oyuncu);
    return undefined;
  }
});

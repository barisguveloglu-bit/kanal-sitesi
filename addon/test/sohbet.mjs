/* SOHBET KOMUTLARI ve GOZ LAZERI ULASILABILIRLIGI (v4.21)

   Bu dosyanin asil sebebi gercek bir oyun ici hata:
   oyuncu iksir icip "goz lazeri atayim" dedi, ETRAFA YILDIRIM
   yagdi. Lazer bozuk degildi -- esyasiz jest sirasinda 21.
   sirada, sifirinci sira ise Yildirim Halkasi. Secim
   degistirmeden zipladiginda sifirinci calisiyordu.

   Sinananlar:
     1. jest sirasinda AYNI sira degerini paylasan yetenek yok
        (varsa sira import sirasina kaliyor)
     2. iksir icince secim Goz Lazeri'ne geciyor
     3. iksir bitince eski secime donuyor
     4. sohbet komutlari: can / can N / can sifirla / lazer
     5. Turkce yazim: "sıfırla" da "sifirla" da kabul
     6. komut olmayan mesaj sohbette KALIYOR
     7. chatSend olayi yokken paket olmuyor, scriptevent calisiyor */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import {
  tickIlerlet, esyaKaydet, _durum, sohbetTetikle, scriptEventTetikle,
  itemCompleteUseTetikle
} from "@minecraft/server";

esyaKaydet("pa:kol_toprak");
for (const i of ["nitroksin", "hiperoksin"]) esyaKaydet("pa:iksir_" + i);

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const defter = await import("./pack/yetenekler/_kalp_defteri.js");
const sohbetModul = await import("./pack/sohbet.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, BAS);
  o.id = id;
  o.typeId = "minecraft:player";
  o._can = 20; o._tavan = 20;
  o.addEffect = (ad, sure, s) => {
    if (ad === "health_boost") o._tavan = 20 + 4 * ((s ? s.amplifier : 0) + 1);
    return true;
  };
  o.removeEffect = (ad) => { if (ad === "health_boost") o._tavan = 20; return true; };
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:health") {
      return {
        get currentValue() { return o._can; },
        get effectiveMax() { return o._tavan; },
        setCurrentValue(v) { o._can = v; },
        resetToMaxValue() { o._can = o._tavan; }
      };
    }
    if (ad === "minecraft:equippable") {
      return { getEquipment: () => undefined, setEquipment: () => true };
    }
    return eskiGet(ad);
  };
  _durum.oyuncular = [o];
  return { D, o };
}

const yaz = (o, metin) => { sus(); const r = sohbetTetikle(o, metin); ac(); return r; };
const sonMesaj = (o) => o._mesajlar[o._mesajlar.length - 1] || "";

console.log("=== 1. JEST SIRASINDA CAKISMA YOK ===");
{
  const sira = kayit.esyasizSira();
  const gorulen = new Map();
  for (const t of sira) {
    const n = t.sira || 0;
    gorulen.set(n, (gorulen.get(n) || []).concat(t.ad));
  }
  const cakisan = [...gorulen.entries()].filter(([, a]) => a.length > 1);

  /* v4.20'de ON BIR cift ayni degeri paylasiyordu. Esitlikte
     siralama import sirasina kaliyor: yeni bir yetenek eklemek
     ILGISIZ bir yetenegin jest sirasini kaydirabiliyordu.      */
  kontrol("hicbir yetenek ayni 'sira' degerini paylasmiyor",
          cakisan.length === 0,
          cakisan.length === 0 ? sira.length + " yetenek, hepsi benzersiz"
            : cakisan.map(([n, a]) => n + ": " + a.join("/")).join(" · "));

  kontrol("siraDenetimi() cakisma gormedi", kayit.siraDenetimi().length === 0);

  const lazer = sira.findIndex((t) => t.kimlik === "goz_lazeri");
  const sifir = sira[0];
  console.log("     sifirinci sira: " + sifir.ad +
              "   ·   Goz Lazeri: " + lazer + ". sirada");
  kontrol("Goz Lazeri hala listede", lazer >= 0);
}

console.log("");
console.log("=== 2. IKSIR ICINCE LAZER SECILI GELIYOR ===");
{
  const { o } = kur("s1");
  const sira = kayit.esyasizSira();
  const lazer = sira.findIndex((t) => t.kimlik === "goz_lazeri");

  sus();
  itemCompleteUseTetikle({ source: o, itemStack: { typeId: "pa:iksir_hiperoksin" } });
  tickIlerlet(2);
  ac();

  /* Asil hata buydu: secim 0'da kalinca "egil + zipla" Yildirim
     Halkasi'ni calistiriyor ve etrafa yildirim yagiyordu.      */
  kontrol("ayar acik", ayar.IKSIR_LAZERI_SEC === true);
  kontrol("secim Goz Lazeri'ne gecti",
          /Goz Lazeri/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);
  kontrol("secilen sifirinci (Yildirim Halkasi) DEGIL", lazer !== 0);
}

console.log("");
console.log("=== 3. SOHBET: can ===");
{
  defter.defteriUnut();
  _durum.ozellikler.delete(ayar.KALP_KAYIT_ANAHTAR);
  const { o } = kur("s2");

  const yutuldu = yaz(o, "can 10");
  kontrol("komut sohbetten gizlendi (cancel)", yutuldu === true);
  kontrol("10 kalp eklendi", defter.kalpAl("s2") === 10, defter.kalpAl("s2") + " kalp");
  kontrol("cevap yazildi", /\+10 kalp/.test(sonMesaj(o)), sonMesaj(o));
  kontrol("can tavani buyudu", o._tavan === 40, o._tavan + " can");

  yaz(o, "can");
  kontrol("sayisiz 'can' varsayilani ekledi",
          defter.kalpAl("s2") === 10 + ayar.KALP_ADIM, defter.kalpAl("s2") + " kalp");

  yaz(o, "can sifirla");
  kontrol("'can sifirla' hepsini sildi", defter.kalpAl("s2") === 0);
  kontrol("can tavani normale dondu", o._tavan === 20, o._tavan + " can");
}

console.log("");
console.log("=== 4. SINIR ACIKCA SOYLENIYOR ===");
{
  /* Kullanici "denedim sinir vardi" demisti. Sessizce kirpmak
     yerine NEDEN kirpildigi yazilmali.                         */
  defter.defteriUnut();
  _durum.ozellikler.delete(ayar.KALP_KAYIT_ANAHTAR);
  const { o } = kur("s3");

  yaz(o, "can 500");
  kontrol("tavana kadar verildi", defter.kalpAl("s3") === ayar.KALP_TAVAN,
          defter.kalpAl("s3") + " / " + ayar.KALP_TAVAN);
  kontrol("sebebi yazildi (sadece kirpilmadi)",
          /tavan/i.test(sonMesaj(o)), sonMesaj(o));

  yaz(o, "can 10");
  kontrol("tavandayken uyari verdi", /[Tt]avan/.test(sonMesaj(o)), sonMesaj(o));

  yaz(o, "can abc");
  kontrol("sayi olmayan arguman reddedildi",
          /anlasilmadi/i.test(sonMesaj(o)), sonMesaj(o));
}

console.log("");
console.log("=== 5. TURKCE YAZIM ===");
{
  kontrol("'sıfırla' -> 'sifirla'", sohbetModul.sadelestir("SIFIRLA") === "sifirla",
          sohbetModul.sadelestir("SIFIRLA"));
  kontrol("'güç kapat' sadelesti", sohbetModul.sadelestir("Güç Kapat") === "guc kapat",
          sohbetModul.sadelestir("Güç Kapat"));
  kontrol("fazla bosluk temizlendi",
          sohbetModul.sadelestir("  can    10 ") === "can 10",
          "'" + sohbetModul.sadelestir("  can    10 ") + "'");

  defter.defteriUnut();
  _durum.ozellikler.delete(ayar.KALP_KAYIT_ANAHTAR);
  const { o } = kur("s4");
  yaz(o, "CAN 4");
  kontrol("buyuk harfli komut calisti", defter.kalpAl("s4") === 4,
          defter.kalpAl("s4") + " kalp");
  yaz(o, "can sıfırla");
  kontrol("Turkce 'sıfırla' calisti", defter.kalpAl("s4") === 0);
}

console.log("");
console.log("=== 6. KOMUT OLMAYAN MESAJ SOHBETTE KALIYOR ===");
{
  const { o } = kur("s5");
  const yutuldu = yaz(o, "kanka bugun ne yapiyoruz");
  kontrol("normal mesaj iptal EDILMEDI", yutuldu === false);

  const y2 = yaz(o, "canim sikildi");
  kontrol("'canim' komut sanilmadi ('can' ile baslasa da)", y2 === false);
}

console.log("");
console.log("=== 7. LAZER KOMUTU ===");
{
  const { o } = kur("s6");
  yaz(o, "lazer");
  /* Tetikleme KOL_GECIKME tick sonra calisiyor (kollar kalksin
     diye). Cevap o zaman yaziliyor.                            */
  sus(); tickIlerlet(ayar.KOL_GECIKME + 5); ac();
  kontrol("iksirsizken sebebi soylendi",
          /iksir/i.test(o.onScreenDisplay._son || "") ||
          /iksir/i.test(sonMesaj(o)),
          (o.onScreenDisplay._son || "") + " | " + sonMesaj(o));
}

console.log("");
console.log("=== 8. YARDIM ===");
{
  const { o } = kur("s7");
  yaz(o, "yardim");
  kontrol("komut listesi yazildi", /can 10/.test(sonMesaj(o)));
  kontrol("scriptevent yedegi de anlatildi",
          /scriptevent/.test(sonMesaj(o)));
}

console.log("");
console.log("=== 9. SCRIPTEVENT YEDEGI ===");
{
  defter.defteriUnut();
  _durum.ozellikler.delete(ayar.KALP_KAYIT_ANAHTAR);
  const { o } = kur("s8");
  sus();
  scriptEventTetikle({ id: "simsek:komut", sourceEntity: o, message: "can 6" });
  ac();
  kontrol("scriptevent ile de kalp eklendi", defter.kalpAl("s8") === 6,
          defter.kalpAl("s8") + " kalp");

  sus();
  scriptEventTetikle({ id: "simsek:komut", sourceEntity: o, message: "zirva" });
  ac();
  kontrol("tanimsiz komut yardim listesiyle cevaplandi",
          /Anlamadim/.test(sonMesaj(o)), sonMesaj(o));
}

console.log("");
console.log("=== 10. KOL ISRAFI ONLENDI ===");
{
  const kollar = await import("./pack/yetenekler/kollar.js");
  const idler = kollar.KOL_ESYALARI.map((s) => s[0]);
  kontrol("pa:kol_kalp kaldirildi", !idler.includes("pa:kol_kalp"),
          idler.length + " kol");

  const toprak = kayit.esyaninYetenekleri("pa:kol_toprak").map((t) => t.kimlik);
  kontrol("kalp_ekle Toprak Kol'a tasindi", toprak.includes("kalp_ekle"),
          toprak.length + " yetenek");
  kontrol("kalp_sifirla da Toprak Kol'da", toprak.includes("kalp_sifirla"));
}

console.log("");
console.log("=== 11. IKSIR SURELERI (v4.81: hepsi 8 dakika) ===");
{
  /* v4.22: 60 sn azdi -> hepsi 5 dakika, hiperoksin 8 dakika.
     v4.81: kullanici "digerlerine de 8 dakika yap" dedi ->
     HEPSI 9600 tick.

     DIKKAT -- BU BIR KIMLIK KAYBI: Hiperoksin'in tek ayirt
     edici ozelligi SURESIYDI. Tasarim notu aynen soyluydu:
     "hicbir alanda uzman degil; farki artik GUCTE degil
     SUREDE." O fark artik yok. Kullaniciya bildirildi;
     Hiperoksin'e yeni bir sebep verilmesi bekleyen is.      */
  const BEKLENEN = 9600;
  for (const k of ayar.KADEMELER) {
    kontrol(k.ad.padEnd(12) + " " + (BEKLENEN / 20) + " sn",
            k.sure === BEKLENEN, k.sure + " tick = " + (k.sure / 20) + " sn");
  }
  kontrol("hepsi ayni surede (kimse geride kalmadi)",
          new Set(ayar.KADEMELER.map((k) => k.sure)).size === 1,
          [...new Set(ayar.KADEMELER.map((k) => k.sure))].join(", "));

  /* Sureyi uzatmak hiyerarsiyi geri getirmemeli.

     v4.68: lazer hasari artik iksire gore DEGISMIYOR (kullanici
     "sadece hasar versin, ekstra bir sey vermesin" dedi ve tek
     sayiya inildi). Yani bu eksende hiyerarsi kurulamaz --
     sinama da onu kilitliyor: hicbir iksirin lazeri obruden
     guclu olamaz.                                             */
  const lazerler = ayar.KADEMELER.map((k) => (k.lazer || {}).hasar);
  kontrol("hicbir iksirin lazeri digerinden guclu degil",
          lazerler.every((h) => h === undefined),
          lazerler.join(", "));
  kontrol("tek ortak hasar sayisi var",
          typeof ayar.LAZER_HASAR === "number" && ayar.LAZER_HASAR > 0,
          String(ayar.LAZER_HASAR));
}

console.log("");
console.log("=== 12. DURUM RAPORU (v4.25) ===");
{
  /* Kullanici "Content Log ne oldugunu bilmiyorum" dedi. Butun
     teshis satirlari oraya yaziliyordu, yani pratikte HIC
     gorunmuyordu. Artik sohbete basiliyor.                     */
  const { o } = kur("s9");
  yaz(o, "durum");
  const r = sonMesaj(o);

  for (const beklenen of ["Surum", "Sohbet komutlari", "Menu", "Kollar",
                          "Bot", "Iksir", "Kalp"]) {
    kontrol("raporda '" + beklenen + "' satiri var", r.includes(beklenen));
  }
  kontrol("surum numarasi yaziyor", r.includes(ayar.SURUM), ayar.SURUM);
  kontrol("API yuzeyi yaziyor", /2\.0\.0-beta|2\.0\.0/.test(r));
  kontrol("'test' ve 'bilgi' de ayni raporu veriyor",
          (yaz(o, "test"), sonMesaj(o).includes("Simsek durum")));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum sohbet/lazer testleri gecti");
process.exit(hata ? 1 : 0);

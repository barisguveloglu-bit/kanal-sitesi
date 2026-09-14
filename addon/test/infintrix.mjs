/* SONSUZLUK TASLARI  --  `infintrix-2.2.jar`            v7.93

   Kullanici: "yeni bir tane mod daha buldum, bunu da ekle...
   alabildigin tum her seyi al."

   Modun ne oldugu ve neyin NEDEN alinmadigi
   REFERANS_INFINTRIX.md'de olculeriyle yazili.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. ELDIVEN KAPALIYKEN BEN 10 DEGISMIYOR. En onemli guvence
      bu: yeni sistem eski davranisi zayiflatmiyor.
   2. Eldiven ve taslar DUNYAYA yaziliyor, sayaclar yazilmiyor.
   3. Tas takmak eldiven ister (kaynakta da `has_power
      infinity_gauntlet` kosulu var).
   4. Guc Tasi normal sarji aninda bitiriyor (`infinite_power`).
   5. Alti tas = Usta Denetimi: yaratik ELDE OLMASA DA gucler
      devam ediyor (kaynaktaki MasterControl).
   6. Usta Denetimi YANIYOR ve cezasi bicime gore
      (kaynaktaki 2999 / 3000 / 3000 sayilari birebir).
   7. Yanik cezasini Guc Tasi ATLAYAMIYOR (`no_instant_timein`).
   8. Sert kilit esigin altinda kalkiyor (`remove_tag`).       */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const I     = await import("./pack/yetenekler/infintrix.js");
const ben   = await import("./pack/yetenekler/ben10.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(elde) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = "p1"; o.typeId = "minecraft:player"; o.name = "p1";
  o._elde = elde;
  o._yazi = []; o._baslik = [];
  o.onScreenDisplay = {
    setActionBar(t) { o._yazi.push(String(t)); },
    setTitle(t) { o._baslik.push(String(t)); }
  };
  D.boyut._efektler = [];
  D.boyut._varliklar = [o];
  _durum.oyuncular = [];
  I.sonsuzlukUnut();
  ben.ben10Unut(o.id);
  return { D, o };
}
const bas = (kimlik, o) => {
  const t = kayit.yetenekAl(kimlik);
  sus();
  const r = t ? t.olustur(o) : undefined;
  ac();
  return r;
};
const yaz = (o) => o._yazi.join(" | ");
/* ben10Tara'yi N kez, her seferinde BEN10_TARAMA tick ileriden
   cagirir -- gercek dongunun yaptigi is.                     */
function tara(o, kez = 1) {
  sus();
  for (let i = 0; i < kez; i++) {
    tickIlerlet(ayar.BEN10_TARAMA);
    ben.ben10Tara([o]);
  }
  ac();
}
const efektSay = (D) => (D.boyut._efektler || []).length;

console.log("=== 0. KAYIT VE SIRA ===");
{
  kontrol("eldiven kayitli", !!kayit.yetenekAl("eldiven"));
  kontrol("sonsuzluk_durum kayitli", !!kayit.yetenekAl("sonsuzluk_durum"));
  let eksik = "";
  for (const k of ayar.SONSUZLUK_TASLARI.keys()) {
    if (!kayit.yetenekAl("tas_" + k)) eksik += k + " ";
  }
  kontrol("alti tasin altisi da kayitli", !eksik, eksik || "tam");
  kontrol("alti tas", ayar.SONSUZLUK_TASLARI.size === 6,
          String(ayar.SONSUZLUK_TASLARI.size));
  kontrol("sira carpismasi yok", kayit.siraDenetimi().length === 0,
          kayit.siraDenetimi().join(" | ") || "temiz");
  kontrol("eldiven sirasi SNS_SIRA_BAS",
          kayit.yetenekAl("eldiven").sira === ayar.SNS_SIRA_BAS,
          String(kayit.yetenekAl("eldiven").sira));
}

console.log("");
console.log("=== 1. ELDIVENSIZ BEN 10 AYNEN CALISIYOR ===");
{
  /* En onemli bolum: yeni sistem eskiyi zayiflatmamali.     */
  const { D, o } = kur("pa:ben_dortkol");
  kontrol("baslangicta eldiven kapali", !I.eldivenAcikMi(o.id));

  tara(o, 1);
  const ilk = efektSay(D);
  kontrol("eline alinca efekt geliyor", ilk > 0, ilk + " efekt");

  /* Omnitrix suresinin cok otesine kadar tara: eldiven
     kapaliyken sayac HIC islememeli.                        */
  const kez = Math.ceil(ayar.SNS_OMNI_SURE / ayar.BEN10_TARAMA) + 10;
  D.boyut._efektler = [];
  tara(o, kez);
  kontrol("sure sinirinin otesinde de efekt kesilmiyor",
          efektSay(D) > 0, efektSay(D) + " efekt / " + kez + " tarama");
  const s = I.sonsuzlukDurum(o.id);
  kontrol("eldivensiz sayac hic islemiyor", !s || s.sayac === 0,
          s ? String(s.sayac) : "durum yok");

  /* ---- KAYDI OLAN AMA ELDIVENI CIKARMIS OYUNCU ----
     Yukarisi `durumlar`da hic kaydi OLMAYAN oyuncuyu olcuyor;
     `!s` dali oradan gecer ve `!s.eldiven` dali olculmemis
     kalirdi. Mutasyon bunu yakaladi: eldiveni takip cikaran
     oyuncunun kaydi VAR ve kapisi ayri.                     */
  const { D: D2, o: o2 } = kur("pa:ben_dortkol");
  bas("eldiven", o2);          // ac
  bas("eldiven", o2);          // kapat
  kontrol("kaydi var ama eldiven kapali",
          !!I.sonsuzlukDurum(o2.id) && !I.eldivenAcikMi(o2.id));
  D2.boyut._efektler = [];
  tara(o2, kez);
  kontrol("kapali eldivenle sure siniri yok", efektSay(D2) > 0,
          efektSay(D2) + " efekt / " + kez + " tarama");
  kontrol("kapali eldivenle sayac islemiyor",
          I.sonsuzlukDurum(o2.id).sayac === 0,
          String(I.sonsuzlukDurum(o2.id).sayac));
}

console.log("");
console.log("=== 2. ELDIVEN ACIP KAPAMA ===");
{
  const { D, o } = kur(undefined);
  bas("eldiven", o);
  kontrol("acildi", I.eldivenAcikMi(o.id));
  kontrol("acilis sesi caldi",
          (D.sayac.ses || []).some((e) => e.ad === ayar.SNS_SES_AC),
          (D.sayac.ses || []).map((e) => e.ad).join(",") || "ses yok");
  kontrol("acilis yazisi", /Eldiveni/.test(yaz(o)), yaz(o));

  bas("eldiven", o);
  kontrol("kapandi", !I.eldivenAcikMi(o.id));
  kontrol("kapanis sesi caldi",
          (D.sayac.ses || []).some((e) => e.ad === ayar.SNS_SES_KAPA));

  /* Eldiveni cikarmak sayaclari da sifirlamali: odul ve ceza
     ayni anahtara bagli, yarisi acik kalmamali.             */
  const s = I.sonsuzlukDurum(o.id);
  s.sayac = 40; s.sarj = 60; s.sertKilit = true;
  s.usta = 30; s.ustaAcik = true;
  bas("eldiven", o);   // ac
  bas("eldiven", o);   // kapat
  kontrol("kapaninca sayac sifirlandi", s.sayac === 0, String(s.sayac));
  kontrol("kapaninca sarj sifirlandi", s.sarj === 0, String(s.sarj));
  kontrol("kapaninca sert kilit kalkti", !s.sertKilit);
  kontrol("kapaninca usta kapandi", !s.ustaAcik && s.usta === 0);
  kontrol("kollar iniyor",
          (o._komutlar || []).some((k) => /playanimation/.test(k)));
}

console.log("");
console.log("=== 3. TAS TAKMAK ELDIVEN ISTER ===");
{
  const { o } = kur(undefined);
  bas("tas_guc", o);
  const s1 = I.sonsuzlukDurum(o.id);
  kontrol("eldivensiz tas takilmiyor", !s1 || s1.taslar.length === 0,
          s1 ? s1.taslar.join(",") : "durum yok");
  kontrol("sebebi yaziliyor", /Önce Sonsuzluk Eldiveni/.test(yaz(o)), yaz(o));

  bas("eldiven", o);
  bas("tas_guc", o);
  kontrol("eldivenle takiliyor",
          I.sonsuzlukDurum(o.id).taslar.includes("guc"));
  /* Ayni yetenek CIKARMA da yapmali -- kaynakta tas yuvadan
     alinabiliyor.                                           */
  bas("tas_guc", o);
  kontrol("ikinci basista cikiyor",
          !I.sonsuzlukDurum(o.id).taslar.includes("guc"));
}

console.log("");
console.log("=== 4. OMNITRIX SAYACI (eldiven acik, tas yok) ===");
{
  const { D, o } = kur("pa:ben_dortkol");
  bas("eldiven", o);
  const kez = Math.ceil(ayar.SNS_OMNI_SURE / ayar.BEN10_TARAMA);

  tara(o, kez - 1);
  kontrol("sure dolmadan efekt var", efektSay(D) > 0, efektSay(D) + " efekt");

  D.boyut._efektler = [];
  tara(o, 2);
  kontrol("sure dolunca efekt kesiliyor", efektSay(D) === 0,
          efektSay(D) + " efekt");
  const s = I.sonsuzlukDurum(o.id);
  kontrol("sarj basladi", s.sarj > 0, s.sarj + " tick");
  kontrol("sarj SERT kilit degil", !s.sertKilit);

  /* Sarj bitince geri gelmeli -- kalici kesinti degil.      */
  tara(o, Math.ceil(ayar.SNS_SARJ / ayar.BEN10_TARAMA) + 2);
  D.boyut._efektler = [];
  tara(o, 1);
  kontrol("sarj bitince efekt geri geliyor", efektSay(D) > 0,
          efektSay(D) + " efekt");
}

console.log("");
console.log("=== 5. GUC TASI SARJI ATLIYOR ===");
{
  const { D, o } = kur("pa:ben_dortkol");
  bas("eldiven", o);
  bas("tas_guc", o);
  const kez = Math.ceil(ayar.SNS_OMNI_SURE / ayar.BEN10_TARAMA) + 1;
  tara(o, kez);
  const s = I.sonsuzlukDurum(o.id);
  kontrol("sarj SNS_GUC_SAYAC'a cekildi", s.sarj <= ayar.SNS_GUC_SAYAC,
          s.sarj + " tick");

  /* Bir tarama sonra guc geri gelmis olmali: sarj 2 tick.   */
  D.boyut._efektler = [];
  tara(o, 1);
  kontrol("neredeyse kesintisiz", efektSay(D) > 0, efektSay(D) + " efekt");

  /* ---- KESINTI TAM OLARAK KAC TARAMA ----
     Guc Tasi'nin kisaltmasi IKI yerde: sure dolarken ve sarj
     islerken. Ikincisi tek basina da sonucu 2'ye cekiyor, o
     yuzden "sarj 2 oldu mu" olcusu ilkini KACIRIYOR
     (mutasyon boyle kacti). Gercek fark kesinti UZUNLUGU:
     Guc Tasi ile 1 tarama, tassiz cok daha fazla.           */
  const say = (tas) => {
    const { D: Dx, o: ox } = kur("pa:ben_dortkol");
    bas("eldiven", ox);
    if (tas) bas("tas_guc", ox);
    const k = Math.ceil(ayar.SNS_OMNI_SURE / ayar.BEN10_TARAMA);
    tara(ox, k - 1);
    let bos = 0;
    for (let i = 0; i < 40; i++) {
      Dx.boyut._efektler = [];
      tara(ox, 1);
      if ((Dx.boyut._efektler || []).length > 0) break;
      bos++;
    }
    return bos;
  };
  const gucle = say(true);
  const tassiz = say(false);
  kontrol("Guc Tasi ile kesinti tek tarama", gucle === 1, gucle + " tarama");
  kontrol("tassiz kesinti daha uzun", tassiz > gucle,
          tassiz + " > " + gucle);
}

console.log("");
console.log("=== 6. ALTI TAS = USTA DENETIMI ===");
{
  const { D, o } = kur("pa:ben_dortkol");
  bas("eldiven", o);
  for (const k of ayar.SONSUZLUK_TASLARI.keys()) bas("tas_" + k, o);
  kontrol("alti tas takili", I.tasTam(o.id),
          I.sonsuzlukDurum(o.id).taslar.join(","));
  kontrol("tamamlaninca baslik", o._baslik.some((b) => /Usta/.test(b)),
          o._baslik.join("|"));

  tara(o, 1);
  /* Yaratigi BIRAK: Usta Denetimi'nin tek olculebilir farki. */
  o._elde = undefined;
  D.boyut._efektler = [];
  tara(o, 1);
  kontrol("yaratik elde olmadan gucler devam ediyor",
          efektSay(D) > 0, efektSay(D) + " efekt");

  /* ---- HATIRLANAN TUR UNUTULMALI ----
     Usta Denetimi "son turu" hatirliyor. Oyuncu cikip ayni
     kimlikle geri girerse o hafiza SILINMIS olmali, yoksa
     eli bos giren oyuncu onceki oturumun guclerini tasirdi.

     DIKKAT: bu olcum `o`nun eldiveni ve taslari HALA
     dururken yapilmali. Asagidaki karsilastirma blogu yeni
     bir dunya kuruyor ve `kur()` icindeki `sonsuzlukUnut()`
     butun durumlari siliyor -- oradan sonra bu satir hicbir
     sey olcmez (ilk yazimda oyle yazilmisti ve mutasyon
     yine kacmisti).                                        */
  ben.ben10Unut(o.id);
  D.boyut._efektler = [];
  tara(o, 1);
  kontrol("unutunca hatirlanan tur da gidiyor",
          efektSay(D) === 0, efektSay(D) + " efekt");
  /* Karsilastirmayi bozmamak icin geri yukle. */
  o._elde = "pa:ben_dortkol";
  tara(o, 1);
  o._elde = undefined;

  /* Karsilastirma: alti tas OLMADAN ayni durumda efekt YOK. */
  const { D: D2, o: o2 } = kur("pa:ben_dortkol");
  bas("eldiven", o2);
  tara(o2, 1);
  o2._elde = undefined;
  D2.boyut._efektler = [];
  tara(o2, 1);
  kontrol("tas eksikken elden birakinca guc yok",
          efektSay(D2) === 0, efektSay(D2) + " efekt");
}

console.log("");
console.log("=== 7. USTA DENETIMI YANIYOR ===");
{
  const { D, o } = kur("pa:ben_dortkol");
  bas("eldiven", o);
  for (const k of ayar.SONSUZLUK_TASLARI.keys()) bas("tas_" + k, o);
  const kez = Math.ceil(ayar.SNS_USTA_SURE / ayar.BEN10_TARAMA) + 1;
  D.boyut._efektler = [];
  tara(o, kez);

  const s = I.sonsuzlukDurum(o.id);
  kontrol("usta denetimi kapandi", !s.ustaAcik);
  kontrol("yanik cezasi basladi", s.sarj > 0, s.sarj + " tick");
  kontrol("ceza SERT kilitli", s.sertKilit);
  kontrol("yanma duyuruldu", o._baslik.some((b) => /yandı/.test(b)),
          o._baslik.join("|"));
  kontrol("yanma sesi caldi",
          (D.sayac.ses || []).some((e) => e.ad === ayar.SNS_SES_YAN));

  D.boyut._efektler = [];
  tara(o, 1);
  kontrol("yanikken guc yok", efektSay(D) === 0, efektSay(D) + " efekt");
}

console.log("");
console.log("=== 8. YANIK CEZASI BICIME GORE ===");
{
  /* Kaynaktaki sayilar: prototype 2999 · recal 3000 · ult 3000.
     Bizdeki bicim ekleri: _proto · (sade) · _10k.            */
  for (const [ek, beklenen] of ayar.SNS_YANIK) {
    const { o } = kur("pa:ben_dortkol" + ek);
    bas("eldiven", o);
    for (const k of ayar.SONSUZLUK_TASLARI.keys()) bas("tas_" + k, o);
    tara(o, Math.ceil(ayar.SNS_USTA_SURE / ayar.BEN10_TARAMA) + 1);
    const s = I.sonsuzlukDurum(o.id);
    /* Bir tarama sayacin bir adimini yer.                   */
    const fark = beklenen - s.sarj;
    kontrol("bicim '" + (ek || "sade") + "' cezasi " + beklenen,
            fark >= 0 && fark <= ayar.BEN10_TARAMA,
            s.sarj + " tick (beklenen " + beklenen + ")");
  }
  kontrol("bicimEki: _10k taniniyor",
          I.bicimEki("ben_ates_10k") === "_10k", I.bicimEki("ben_ates_10k"));
  kontrol("bicimEki: sade bos doner",
          I.bicimEki("ben_ates") === "", "'" + I.bicimEki("ben_ates") + "'");
  kontrol("bicimEki: string olmayana bos",
          I.bicimEki(undefined) === "" && I.bicimEki(7) === "");
}

console.log("");
console.log("=== 9. GUC TASI YANIK CEZASINI ATLAYAMIYOR ===");
{
  const { o } = kur("pa:ben_dortkol");
  bas("eldiven", o);
  for (const k of ayar.SONSUZLUK_TASLARI.keys()) bas("tas_" + k, o);
  tara(o, Math.ceil(ayar.SNS_USTA_SURE / ayar.BEN10_TARAMA) + 1);
  const s = I.sonsuzlukDurum(o.id);
  const ilk = s.sarj;
  kontrol("Guc Tasi takili (on kosul)", s.taslar.includes("guc"));
  kontrol("ceza sert kilitli (on kosul)", s.sertKilit);

  tara(o, 3);
  kontrol("ceza KISALMADI, normal akiyor",
          s.sarj < ilk && s.sarj > ayar.SNS_GUC_SAYAC,
          ilk + " -> " + s.sarj);
}

console.log("");
console.log("=== 10. SERT KILIT ESIKTE KALKIYOR ===");
{
  const { o } = kur("pa:ben_dortkol");
  bas("eldiven", o);
  for (const k of ayar.SONSUZLUK_TASLARI.keys()) bas("tas_" + k, o);
  tara(o, Math.ceil(ayar.SNS_USTA_SURE / ayar.BEN10_TARAMA) + 1);
  const s = I.sonsuzlukDurum(o.id);
  /* Cezayi elle esige yaklastir: 3000 tick'i taramayla
     tuketmek testi gereksiz yere uzatirdi.                  */
  s.sarj = ayar.SNS_KILIT_ESIK + ayar.BEN10_TARAMA;
  tara(o, 1);
  kontrol("esigin altinda sert kilit kalkti", !s.sertKilit,
          "sarj " + s.sarj);
}

console.log("");
console.log("=== 11. KALICILIK ===");
{
  const { o } = kur(undefined);
  bas("eldiven", o);
  bas("tas_zaman", o);
  const s = I.sonsuzlukDurum(o.id);
  s.sayac = 55; s.sarj = 77; s.sertKilit = true; s.usta = 9; s.ustaAcik = true;

  /* Cikisi taklit et: eldiven ve tas KALMALI, sayaclar gitmeli. */
  I.sonsuzlukCikti(o.id);
  const t = I.sonsuzlukDurum(o.id);
  kontrol("eldiven kaliyor", t.eldiven);
  kontrol("taslar kaliyor", t.taslar.includes("zaman"), t.taslar.join(","));
  kontrol("sayac sifirlandi", t.sayac === 0, String(t.sayac));
  kontrol("sarj sifirlandi", t.sarj === 0, String(t.sarj));
  kontrol("sert kilit kalkti", !t.sertKilit);
  kontrol("usta kapandi", !t.ustaAcik && t.usta === 0);

  I.sonsuzlukUnut(o.id);
  kontrol("tek oyuncu unutuldu", I.sonsuzlukDurum(o.id) === undefined);
}

console.log("");
console.log("=== 12. DURUM OKUMA ===");
{
  const { o } = kur(undefined);
  bas("sonsuzluk_durum", o);
  kontrol("eldivensiz sebep yaziliyor",
          /takılı değil/.test(yaz(o)), yaz(o));

  const { o: o2 } = kur(undefined);
  bas("eldiven", o2);
  bas("tas_ruh", o2);
  o2._yazi = [];
  bas("sonsuzluk_durum", o2);
  kontrol("alti yuva da gosteriliyor",
          (yaz(o2).match(/[●○]/g) || []).length === 6,
          yaz(o2));
  kontrol("hazir yaziyor", /hazır/.test(yaz(o2)), yaz(o2));
}

console.log("");
console.log("=== 13. omniIlerlet YAN ETKISIZ ===");
{
  /* Karar veren fonksiyon ekrana yazmamali: testte ve
     ileride baska bir yerden cagrilabilsin diye.            */
  const { D, o } = kur(undefined);
  bas("eldiven", o);
  o._yazi = []; o._baslik = [];
  const oncekiSes = (D.sayac.ses || []).length;
  I.omniIlerlet(o.id, "ben_dortkol", ayar.BEN10_TARAMA);
  kontrol("ekrana yazmiyor", o._yazi.length === 0 && o._baslik.length === 0,
          yaz(o));
  kontrol("ses calmiyor", (D.sayac.ses || []).length === oncekiSes);

  /* Bilinmeyen oyuncu: durum yoksa hicbir sey engellenmemeli. */
  const k = I.omniIlerlet("hic-yok", "ben_dortkol", 20);
  kontrol("durumsuz oyuncuda engel yok", !k.engelle && !k.usta);
}

console.log("");
console.log(hata ? "SONUC: HATA VAR" : "SONUC: TEMIZ");
process.exit(hata ? 1 : 0);

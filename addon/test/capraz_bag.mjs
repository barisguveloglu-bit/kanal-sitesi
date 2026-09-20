// CAPRAZ BAG DENETIMI (v7.95.2)
//
// Kullanici: "bir ozellige tikladigimizda baska bir ozellik
// calisiyorsa o bozuktur -- ozellikler birbirine bagli mi?"
//
// Aranan hata sinifi: bir yetenek KENDI isini degil BASKASININ
// isini yapiyor. Bedrock'ta bunun en yaygin sebebi, bir tablo
// uzerinde DONGUYLE kaydedilen yeteneklerde kapanisin (closure)
// yanlis girdiyi tutmasi. Bu depoda 308 yetenegin cogu boyle
// kaydediliyor (KONSEY_SILAH, ZIRH_ISIN, MARVEL_ISIN, BEN10_ISIN,
// BEN10_SALDIRI, MAHOU_BUYULER...), yani risk gercek.
//
// YONTEM: her yetenegi KENDI bagli esyasiyla calistir, yazdigi
// actionbar metnini yakala, sonra sor: bu metin BASKA bir
// yetenegin adini tasiyor mu, kendi adini tasimadan?
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet } from "@minecraft/server";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Renk kodlarini ve sus kelimeleri at -- ad karsilastirmasi
   "§cElmas Sarapneli hazir degil" gibi metinlerde de tutsun. */
const sade = (s) => String(s || "")
  .replace(/§./g, "")
  .replace(/[·§]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLocaleLowerCase("tr");

function oyuncuYap(id, elde, kafa) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player"; o.name = "CaprazOyuncu";
  o.isSneaking = false; o.isJumping = false;
  o._elde = elde; o._kafa = kafa;
  o._can = 20; o._maks = 20;
  o.addEffect = () => true; o.removeEffect = () => true;
  o.playAnimation = () => true; o.runCommand = () => ({ successCount: 1 });
  o.applyKnockback = () => true; o.applyImpulse = () => true;
  o.applyDamage = () => true; o.setOnFire = () => true;
  o.kill = () => true; o.teleport = () => true; o.sendMessage = () => {};
  if (typeof o.getBlockFromViewDirection !== "function")
    o.getBlockFromViewDirection = () => undefined;
  if (typeof o.getEntitiesFromViewDirection !== "function")
    o.getEntitiesFromViewDirection = () => [];

  /* ELDEKI ESYAYI BILDIREN VEKIL -- bu olmadan denetim korr.
     Ilk surumde yoktu: sahte oyuncu hicbir sey tutmuyor
     gorunuyordu, her yetenek kapida donuyordu ("... elinde
     olmali") ve bilerek kurulan capraz bag BILE yakalanmadi.
     Iki mutasyon turu bosa gitti, sebebi buydu.            */
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (y) => {
          if (y === "Mainhand" && o._elde) return { typeId: o._elde };
          if (y === "Head" && o._kafa) return { typeId: o._kafa };
          return undefined;
        },
        setEquipment: () => true
      };
    }
    if (ad === "minecraft:health") {
      return {
        get currentValue() { return o._can; },
        get effectiveMax() { return o._maks; },
        defaultValue: 20,
        setCurrentValue(v) { o._can = v; },
        resetToMaxValue() { o._can = o._maks; }
      };
    }
    if (ad === "minecraft:inventory") {
      return { container: { size: 36, emptySlotsCount: 36,
        addItem: () => true, getItem: () => undefined, setItem: () => true } };
    }
    return eskiGet(ad);
  };

  const yazilan = [];
  o.onScreenDisplay = { setActionBar: (m) => yazilan.push(m) };
  return { o, yazilan };
}

const hepsi = kayit.tumYetenekler();
/* Esya -> yetenek defteri TERSINE cevriliyor: her yetenegin
   hangi esyayla acildigini bilmemiz gerek, yoksa cogu "o esya
   elinde olmali" deyip asil koda HIC girmez.

   OLCULEN TUZAK (v7.95.2): ilk surum yalniz `tanim.esya`ya
   bakiyordu. Ama yeteneklerin cogu `esyaBagla()` ile SONRADAN
   baglaniyor ve o yolda `tanim.esya` TANIMSIZ kaliyor. Sonuc:
   denetim yanlis esyayla kosuyor, yetenek kapida donuyor ve
   bilerek kurulan bir capraz bag BILE yakalanmiyordu.
   Defter bu yuzden kayit.esyaninYetenekleri()'nden kuruluyor. */
const esyaHarita = new Map();
for (const y of hepsi) if (y.esya) esyaHarita.set(y.kimlik, y.esya);
{
  const kollar0 = await import("./pack/yetenekler/kollar.js");
  const adaylar = new Set();
  for (const satir of kollar0.KOL_ESYALARI) adaylar.add(satir[0]);
  for (const y of hepsi) if (y.esya) adaylar.add(y.esya);
  /* Esya kimliklerini yeteneklerin kendi tablolarindan da
     topla: kol olmayan tetikleyiciler (asa, silah, cekirdek). */
  for (const e of adaylar) {
    const liste = kayit.esyaninYetenekleri(e);
    if (!liste) continue;
    for (const t of liste) if (!esyaHarita.has(t.kimlik)) esyaHarita.set(t.kimlik, e);
  }
  /* Defterdeki BUTUN esyalar: kayit modulu disa acmiyor, ama
     her yetenegin kimliginden tahmin edilebilen "pa:<kimlik>"
     kaliplari denenir -- tutan olursa gercek bagdir.         */
  for (const y of hepsi) {
    if (esyaHarita.has(y.kimlik)) continue;
    for (const aday of ["pa:" + y.kimlik,
                        "pa:" + y.kimlik.replace(/^kns_sarki_/, "kns_asa_"),
                        "pa:" + y.kimlik.replace(/^kns_atis_/, "kns_silah_")]) {
      const l = kayit.esyaninYetenekleri(aday);
      if (l && l.indexOf(y) !== -1) { esyaHarita.set(y.kimlik, aday); break; }
    }
  }
}

console.log("=== 1. DEFTER SAGLAM ===");
{
  kontrol("yetenek defteri dolu", hepsi.length > 100, hepsi.length + " yetenek");
  const k = hepsi.map((y) => y.kimlik);
  kontrol("tekrar eden kimlik yok", new Set(k).size === k.length,
          k.length - new Set(k).size + " tekrar");
  const sirali = hepsi.filter((y) => y.sira !== undefined).map((y) => y.sira);
  kontrol("ayni sirayi paylasan yetenek yok",
          new Set(sirali).size === sirali.length,
          sirali.length - new Set(sirali).size + " cakisma");
  const adlar = hepsi.map((y) => sade(y.ad));
  const tekrarAd = adlar.filter((x, i) => adlar.indexOf(x) !== i);
  /* Ayni ADI tasiyan iki yetenek capraz-bag denetimini
     korlestirir: hangisinin calistigini ad'dan ayirt edemeyiz.
     Bozukluk degil ama OLCUM KORLUGU -- sayisi sabitlenmeli. */
  kontrol("ayni adi tasiyan yetenek sayisi sinirli",
          new Set(tekrarAd).size <= 30,
          new Set(tekrarAd).size + " ad tekrar ediyor");
}

console.log("");
console.log("=== 2. HER YETENEK KENDI ADINI BILDIRIYOR ===");
{
  /* Ad -> kimlik defteri. Yalniz BENZERSIZ adlar kullanilir:
     iki yetenek ayni adi tasiyorsa suclu belirlenemez.      */
  const adSayisi = new Map();
  for (const y of hepsi) {
    const a = sade(y.ad);
    adSayisi.set(a, (adSayisi.get(a) || 0) + 1);
  }
  const benzersizAd = new Map();
  for (const y of hepsi) {
    const a = sade(y.ad);
    if (adSayisi.get(a) === 1 && a.length >= 5) benzersizAd.set(a, y.kimlik);
  }

  const suclu = [];
  let olculen = 0;
  for (const tanim of hepsi) {
    const { o, yazilan } = oyuncuYap("cb_" + tanim.kimlik,
                                     esyaHarita.get(tanim.kimlik) || "pa:kol_toprak",
                                     "pa:goz_beyaz_lazer");
    try {
      sus();
      const is = tanim.olustur(o);
      if (is && typeof is.calis === "function") {
        for (let i = 0; i < 3; i++) { if (is.calis()) break; tickIlerlet(1); }
        if (typeof is.bitir === "function") is.bitir();
      }
      ac();
    } catch (e) { ac(); continue; }

    const metin = sade(yazilan.join(" | "));
    if (!metin) continue;
    olculen++;
    const kendiAd = sade(tanim.ad);
    if (kendiAd && metin.indexOf(kendiAd) !== -1) continue;   // kendini soyledi

    /* KAPI MESAJI MI? Bir yetenegin "once sunu tak", "su
       elinde olmali" demesi capraz bag DEGIL -- gereksinimi
       bildiriyor ve o gereksinim baska bir yetenegin adini
       tasiyabilir. Olculdu: alti Sonsuzluk Tasi
       "§7Once Sonsuzluk Eldiveni'ni tak" yaziyor ve dogru
       davraniyor. Bu ayrimi yapmayan ilk surum altisini da
       suclu isaretledi.                                     */
    if (/\b(once|elinde|elinde olmali|gerek|takili|tak|hazir degil|bulunmali|yok)\b/.test(metin)) continue;

    /* Kendi adini soylemedi ve kapi mesaji da degil: BASKA
       bir yetenegin adini mi soyluyor? Yalniz o zaman
       capraz bagdir.                                        */
    for (const [ad, kimlik] of benzersizAd) {
      if (kimlik === tanim.kimlik) continue;
      if (metin.indexOf(ad) !== -1) {
        suclu.push(tanim.kimlik + " -> \"" + ad + "\" (" + kimlik + ")");
        break;
      }
    }
  }
  kontrol("olcum gercekten calisti", olculen > 50, olculen + " yetenek konustu");
  kontrol("hicbir yetenek BASKASININ adini bildirmedi",
          suclu.length === 0,
          suclu.slice(0, 6).join(" | ") || "temiz");
}

console.log("");
console.log("=== 3. ESYA BAGLARI TEK YONLU VE DOGRU ===");
{
  /* Bir esyaya bagli yetenek listesi SIRALI: kol ustunde
     jestle aralarinda geciliyor. Ayni yetenek bir esyaya IKI
     KEZ baglanirsa jest sirasi kayar ve kullanici "bir onceki
     yetenek" hissini alir -- tam kullanicinin tarif ettigi
     bozukluk.                                               */
  const kollar = await import("./pack/yetenekler/kollar.js");
  let cift = 0, bilinmeyen = 0;
  const kimlikler = new Set(hepsi.map((y) => y.kimlik));
  for (const satir of kollar.KOL_ESYALARI) {
    const gor = new Set();
    for (let i = 1; i < satir.length; i++) {
      const k = satir[i];
      if (!kimlikler.has(k)) { bilinmeyen++; console.log("      bilinmeyen: " + satir[0] + " -> " + k); }
      if (gor.has(k)) { cift++; console.log("      CIFT: " + satir[0] + " -> " + k); }
      gor.add(k);
    }
  }
  kontrol("hicbir kolda ayni yetenek iki kez yok", cift === 0, cift + " cift");
  kontrol("her bagli kimlik gercek bir yetenek", bilinmeyen === 0,
          bilinmeyen + " bilinmeyen");
}

console.log("");
console.log("=== 4. eldekiEsya SONUCUNDA .typeId OKUNMUYOR ===");
{
  /* eldekiEsya() ESYAYI degil KIMLIGINI (dize) donduruyor.
     Dizede `.typeId` YOK -- okunursa hep undefined cikar ve
     ona dayanan her kosul sessizce yanlis calisir.

     v7.95.3'te olculdu: bu yuzden UC yetenek (Biyo Silah,
     Bobby Silahi, Ay Isigi sarkisi) dogru esya elde
     tutulurken bile "elinde olmali" diyordu ve menuden HIC
     calismiyordu. Ayni hata zirh.js'te v5.0'da yakalanip
     duzeltilmisti; ders bir dosyada ogrenilmis, dort yer
     supurulmemisti.

     Bu kontrol KAYNAK metinde arar, cunku hata calisma aninda
     patlamiyor -- sessizce yanlis cevap veriyor.            */
  const { readFileSync, readdirSync } = await import("node:fs");
  const kokDizin = KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler";

  /* YORUMLAR ONCE ATILIR. Iki sebep:
       1. Bu duzeltmeyi ANLATAN yorumlar "`.typeId` okunuyordu"
          diyor -- taranirsa kendi aciklamamiz suclu cikar.
       2. Yorum bloklari atama ile kosul arasina giriyor ve
          pencereyi tasiriyor. Ilk surum tam bunun kurbani
          oldu: bilerek geri konan hata YAKALANMADI, cunku
          araya giren 10 satirlik aciklama `.typeId`yi bes
          satirlik pencerenin disina itmisti.                */
  const yorumsuz = (t) => t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  const suclu = [];
  for (const f of readdirSync(kokDizin)) {
    if (!f.endsWith(".js")) continue;
    const satirlar = yorumsuz(readFileSync(kokDizin + "/" + f, "utf8"))
      .split("\n");
    for (let i = 0; i < satirlar.length; i++) {
      if (!/\beldekiEsya\s*\(/.test(satirlar[i])) continue;
      const m = satirlar[i].match(/(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*eldekiEsya/);
      if (!m) continue;
      const ad = m[1];
      /* Pencere 5'ten 15'e cikti (yukaridaki 2. sebep). */
      const pencere = satirlar.slice(i, i + 15).join("\n");
      if (new RegExp("\\b" + ad + "\\.typeId\\b").test(pencere))
        suclu.push(f + ":" + (i + 1) + " (" + ad + ".typeId)");
    }
  }
  kontrol("hicbir yerde eldekiEsya sonucunda .typeId okunmuyor",
          suclu.length === 0, suclu.join(" | ") || "temiz");
}

console.log("");
console.log("=== 5. SIMBIYOT GORSELI DOGRU YETENEKTEN ===");
{
  /* Kaynakta sonic, SCULK susunun `SonicScreech`i.
     Bizim dugmemiz ROYAL + Dominant + Apex veriyor ve
     `ApexForm.fire()` SonicScreech'i HIC cagirmiyor.
     v7.95.3'e kadar Frenzy vurusu `sonic_explosion`
     ciziyordu -- baska bir susun gorseli.                   */
  const ayar = await import("./pack/ayarlar.js");
  kontrol("simbiyot parcacigi ayarlardan geliyor",
          typeof ayar.SIMBIYOT_PARCACIK === "string" &&
          ayar.SIMBIYOT_PARCACIK.length > 0, ayar.SIMBIYOT_PARCACIK);
  kontrol("sonic parcacigi KULLANILMIYOR",
          !/sonic/i.test(ayar.SIMBIYOT_PARCACIK), ayar.SIMBIYOT_PARCACIK);
  const { readFileSync } = await import("node:fs");
  const kod = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/simbiyot.js", "utf8");
  kontrol("kodda sabit gomulu sonic yok", !/sonic/i.test(kod));
  /* Hasar tarafi kaynaga sadik kalmali -- degisen yalniz gorsel. */
  kontrol("Frenzy sayilari kaynaktaki gibi",
          ayar.SIMBIYOT_VURUS_MENZIL === 6 &&
          ayar.SIMBIYOT_VURUS_HASAR === 7 &&
          ayar.SIMBIYOT_VURUS_ADIM === 8,
          "menzil=" + ayar.SIMBIYOT_VURUS_MENZIL +
          " hasar=" + ayar.SIMBIYOT_VURUS_HASAR +
          " adim=" + ayar.SIMBIYOT_VURUS_ADIM);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Capraz bag: temiz");
process.exit(hata ? 1 : 0);

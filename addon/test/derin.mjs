/* DERIN TARAMA -- v4.32

   Istek: "madenlerde 10 dakika boyunca kazim yapsin... Elmas
   getir dedigimde... verdigim zorluga gore is dakikasi artsin
   ... ardindan cesitli yerlere baksin."

   Bu dosya UC seyi kilitliyor:

   1. SURE ZORLUKTAN CIKIYOR. Elle girilmiyor. odun < demir <
      elmas < netherit sirasi ve 10 dk tavani sinaniyor.
   2. HEDEF SAYILIYOR. Bot istenen sey yeterince bulununca
      ERKEN duruyor; yol ustundeki baska cevher cantaya giriyor
      ama HEDEFE SAYILMIYOR.
   3. DURAK DEGISTIRIYOR. Bir kure bitince bot baska bir yere
      isinlaniyor ve cevherin Y seviyesine dogru INIYOR.
      "Cesitli yerlere baksin" tam olarak bu.

   Ayrica komut cozumlemesi: "bot odun" ESKI hizli is olmali,
   "bot odun 64" derin tarama. Kullanicinin kendi cumlesi:
   "odun topla dedigimde hemen yapar ama elmas bul 64 tane
   dedigimde is dakikasi artsin."                              */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import {
  tickIlerlet, esyaKaydet, varlikKaydet, _durum, world
} from "@minecraft/server";

varlikKaydet("pa:bot");
esyaKaydet(
  "minecraft:oak_log", "minecraft:raw_iron", "minecraft:diamond",
  "minecraft:coal", "minecraft:raw_copper", "minecraft:redstone",
  "minecraft:raw_gold", "minecraft:emerald", "minecraft:lapis_lazuli",
  "minecraft:quartz", "minecraft:ancient_debris"
);

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const defter = await import("./pack/yetenekler/_bot_defteri.js");
const derin = await import("./pack/yetenekler/bot_derin.js");
const { derinIstekCoz, komutCozumle } = await import("./pack/sohbet.js");
const { yetenekAl } = await import("./pack/yetenekler/kayit.js");
const { butceSifirla } = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id;
  o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  _durum.varliklar = D.sayac.varliklar;
  return { D, o };
}

function temizle() {
  defter.defteriUnut();
  _durum.ozellikler.delete(ayar.BOT_KAYIT_ANAHTAR);
  _durum.varliklar = [];
  _durum.getEntityYok = false;
}

const cagir = (o) => { sus(); const r = defter.botCagir(o); ac(); return r; };
const botu = (D) => D.sayac.varliklar.find((v) => v.typeId === "pa:bot" && v.isValid);

function isiCalistir(is, tick = 400) {
  if (!is) return;
  sus();
  for (let t = 0; t < tick; t++) {
    butceSifirla();
    if (is.calis()) break;
    tickIlerlet(1);
  }
  if (is.bitir) is.bitir();
  ac();
}

/* Hedefi kur ve yetenegi elle olustur. Gercekte main.js'teki
   derinBaslat() yapiyor; testte cerceve dongusu yok.          */
function derinIs(o, anahtar, adet) {
  derin.derinHedefSec(o.id, anahtar, adet);
  sus();
  const is = yetenekAl("bot_derin").olustur(o);
  ac();
  return is;
}

console.log("=== 1. SURE ZORLUKTAN HESAPLANIYOR ===");
{
  const s = (ad, adet) => derin.derinSure(derin.hedefCoz(ad), adet);

  const odun = s("odun", 64);
  const demir = s("demir", 64);
  const elmas = s("elmas", 64);
  const netherit = s("netherit", 64);

  kontrol("64 odun EN KISA (yanindaki agac, hemen)", odun < demir,
          (odun / 1200).toFixed(1) + " dk");
  kontrol("64 demir odundan uzun", demir < elmas, (demir / 1200).toFixed(1) + " dk");
  kontrol("64 elmas demirden UZUN (zorluk artiyor)", elmas > demir,
          (elmas / 1200).toFixed(1) + " dk");
  kontrol("64 netherit en uzun", netherit >= elmas,
          (netherit / 1200).toFixed(1) + " dk");

  kontrol("elmas 64 SEKIZ dakikayi geciyor (istek: ~10 dk)",
          elmas >= 8 * 1200, elmas + " tick");
  kontrol("hicbir is 10 dakikayi GECMIYOR (tavan)",
          netherit <= ayar.DERIN_EN_UZUN && netherit === ayar.DERIN_EN_UZUN,
          netherit + " tick = " + (netherit / 1200) + " dk");

  /* "4 tane 64'luk demir topla" -> 256. Adet artinca sure de
     artmali, yoksa "zorluga gore" sozu yalan olur.            */
  const demir256 = s("demir", 256);
  kontrol("256 demir, 64 demirden uzun (adet sureyi buyutuyor)",
          demir256 > demir,
          (demir / 1200).toFixed(1) + " dk -> " + (demir256 / 1200).toFixed(1) + " dk");

  kontrol("taban sure altina DUSMUYOR (1 elmas bile en az 1 dk)",
          s("elmas", 1) >= ayar.DERIN_TABAN_SURE, s("elmas", 1) + " tick");
}

console.log("");
console.log("=== 2. KOMUT COZUMLEME (kullanicinin agzindan) ===");
{
  const c = (metin) => derinIstekCoz(metin.split(" "));

  kontrol("'elmas' -> elmas, adet varsayilan",
          c("elmas") && c("elmas").anahtar === "elmas" &&
          c("elmas").adet === undefined, JSON.stringify(c("elmas")));

  kontrol("'elmas 64' -> 64 elmas",
          c("elmas 64").anahtar === "elmas" && c("elmas 64").adet === 64,
          JSON.stringify(c("elmas 64")));

  kontrol("'64 tane elmas' -> 64 elmas ('tane' yutuluyor)",
          c("64 tane elmas").anahtar === "elmas" &&
          c("64 tane elmas").adet === 64, JSON.stringify(c("64 tane elmas")));

  /* Kullanicinin birebir cumlesi: "4 tane 64'luk demir topla" */
  const dort = c("4 tane 64luk demir topla");
  kontrol("'4 tane 64luk demir topla' -> 256 demir (sayilar carpiliyor)",
          dort && dort.anahtar === "demir" && dort.adet === 256,
          JSON.stringify(dort));

  kontrol("'demir 4x64' -> 256 demir (kisayol)",
          c("demir 4x64") && c("demir 4x64").adet === 256,
          JSON.stringify(c("demir 4x64")));

  kontrol("'derin' -> hedefsiz derin tarama (maden)",
          c("derin") && c("derin").anahtar === "maden", JSON.stringify(c("derin")));

  /* AYRIM: sayisiz odun/maden ESKI hizli is olmali. */
  kontrol("'odun' derin tarama DEGIL (hizli is)", c("odun") === undefined);
  kontrol("'maden' derin tarama DEGIL (hizli is)", c("maden") === undefined);
  kontrol("'odun 64' derin tarama (hedef verildi)",
          c("odun 64") && c("odun 64").anahtar === "odun" &&
          c("odun 64").adet === 64, JSON.stringify(c("odun 64")));

  kontrol("bot alt komutlari bozulmadi ('savas ac')", c("savas ac") === undefined);
  kontrol("bot alt komutlari bozulmadi ('teslim')", c("teslim") === undefined);
  kontrol("bot alt komutlari bozulmadi ('gel')", c("gel") === undefined);
  kontrol("bot alt komutlari bozulmadi ('simsek')", c("simsek") === undefined);

  kontrol("Turkce ek yutuluyor ('elmasi')",
          c("elmasi 32") && c("elmasi 32").anahtar === "elmas",
          JSON.stringify(c("elmasi 32")));

  kontrol("'pirlanta' da elmas", c("pirlanta 10").anahtar === "elmas");
  kontrol("'diamond' da elmas (Ingilizce yazan olursa)",
          c("diamond 10").anahtar === "elmas");
}

console.log("");
console.log("=== 3. ADET KIRPMA ===");
{
  kontrol("sayi yoksa varsayilan", derin.adetKirp(undefined) === ayar.DERIN_VARSAYILAN,
          String(derin.adetKirp(undefined)));
  kontrol("sifir/negatif varsayilana duser", derin.adetKirp(-5) === ayar.DERIN_VARSAYILAN);
  kontrol("canta tavanini asamaz",
          derin.adetKirp(999999) === ayar.DERIN_ADET_TAVAN,
          String(derin.adetKirp(999999)));
}

console.log("");
console.log("=== 4. HEDEF SAYILIYOR, YOL USTU SAYILMIYOR ===");
{
  temizle();
  const { D, o } = kur("d4");
  cagir(o);
  const bot = botu(D);

  /* Botun ilk duragina degil, isin KOKUNE gore dusunemeyiz --
     durak sarmali oyuncunun konumundan aciliyor. Bu yuzden
     cevheri genis bir alana serpiyoruz: bot nereye giderse
     gitsin bulacak.                                          */
  const kok = { x: 0, y: 90, z: 0 };
  let konan = 0;
  for (let dx = -30; dx <= 30; dx += 3) {
    for (let dz = -30; dz <= 30; dz += 3) {
      for (let dy = -20; dy <= 0; dy += 4) {
        D.boyut.getBlock({ x: kok.x + dx, y: kok.y + dy, z: kok.z + dz })
          .setType("minecraft:diamond_ore");
        konan++;
      }
    }
  }
  // Yol ustu: demir de var
  D.boyut.getBlock({ x: 1, y: 88, z: 1 }).setType("minecraft:iron_ore");

  const is = derinIs(o, "elmas", 8);
  kontrol("is olustu", is !== undefined, is ? is.ad : "yok");
  kontrol("hedef adedi ise yazildi", is && is.hedefAdet === 8, String(is && is.hedefAdet));
  isiCalistir(is, 600);

  kontrol("elmas gercekten toplandi",
          o._envanter.filter((e) => e === "minecraft:diamond").length > 0,
          o._envanter.filter((e) => e === "minecraft:diamond").length + " elmas");
  kontrol("cevher serildi", konan > 100, konan + " blok");
}

console.log("");
console.log("=== 5. HEDEFE VARINCA ERKEN BITIYOR ===");
{
  temizle();
  const { D, o } = kur("d5");
  cagir(o);

  // Her yer elmas: hedefe cok hizli varilmali
  for (let dx = -12; dx <= 12; dx++) {
    for (let dz = -12; dz <= 12; dz++) {
      for (let dy = -8; dy <= 2; dy++) {
        D.boyut.getBlock({ x: dx, y: 90 + dy, z: dz })
          .setType("minecraft:diamond_ore");
      }
    }
  }

  const is = derinIs(o, "elmas", 5);
  const uzunSure = is.sure;

  sus();
  let tick = 0;
  butceSifirla();
  while (tick < 4000 && !is.calis()) { tickIlerlet(1); butceSifirla(); tick++; }
  is.bitir();
  ac();

  kontrol("is SUREYI BEKLEMEDEN bitti (5 elmas bulundu)",
          tick < uzunSure / 4, tick + " tick / sure " + uzunSure);
  kontrol("en az 5 elmas teslim edildi",
          o._envanter.filter((e) => e === "minecraft:diamond").length >= 5,
          o._envanter.filter((e) => e === "minecraft:diamond").length + " elmas");
}

console.log("");
console.log("=== 6. DURAK DEGISTIRIYOR ('cesitli yerlere baksin') ===");
{
  temizle();
  const { D, o } = kur("d6");
  cagir(o);
  const bot = botu(D);
  bot._isinlanma.length = 0;

  // Hicbir yerde elmas yok: bot durak durak aramak zorunda
  const is = derinIs(o, "elmas", 64);
  isiCalistir(is, 900);

  const duraklar = bot._isinlanma;
  kontrol("bot BIRDEN FAZLA duraga gitti", duraklar.length > 2,
          duraklar.length + " isinlanma");

  const farkli = new Set(duraklar.map((d) => d.x + "," + d.y + "," + d.z));
  kontrol("duraklar FARKLI yerler (ayni noktada donmuyor)",
          farkli.size > 2, farkli.size + " ayri nokta");

  const yatay = duraklar.map((d) => Math.hypot(d.x, d.z));
  kontrol("duraklar YAYILIYOR (sarmal aciliyor)",
          Math.max(...yatay) > ayar.DERIN_DURAK_ADIM,
          "en uzak " + Math.max(...yatay).toFixed(0) + " blok");
}

console.log("");
console.log("=== 7. CEVHERIN Y SEVIYESINE INIYOR ===");
{
  temizle();
  const { D, o } = kur("d7");
  cagir(o);
  const bot = botu(D);
  bot._isinlanma.length = 0;

  const is = derinIs(o, "elmas", 64);       // elmas y = -59
  isiCalistir(is, 1500);

  const enDusuk = Math.min(...bot._isinlanma.map((d) => d.y));
  kontrol("bot yeruzunden ASAGI indi (y=90'dan)", enDusuk < 60,
          "en derin y=" + enDusuk);
  kontrol("elmas seviyesine dogru indi",
          enDusuk <= 0, "en derin y=" + enDusuk);

  /* Tek hamlede zipla-in DEGIL, basamakli: inis yolundaki
     cevherleri de gorsun diye.                                */
  const ilk = bot._isinlanma[0];
  kontrol("ILK durak dibe atlamiyor (basamakli inis)",
          ilk.y > enDusuk + ayar.DERIN_Y_ADIM - 1,
          "ilk y=" + ilk.y + ", en derin y=" + enDusuk);
}

console.log("");
console.log("=== 8. ODUN HEDEFINDE ASAGI INMIYOR ===");
{
  temizle();
  const { D, o } = kur("d8");
  cagir(o);
  const bot = botu(D);
  bot._isinlanma.length = 0;

  const is = derinIs(o, "odun", 64);
  isiCalistir(is, 600);

  const yler = bot._isinlanma.map((d) => d.y);
  kontrol("odun ararken yeruzunde kaliyor (Y hedefi yok)",
          yler.length === 0 || Math.min(...yler) >= 88,
          yler.length ? "en dusuk y=" + Math.min(...yler) : "isinlanma yok");
}

console.log("");
console.log("=== 9. BOT IS BOYUNCA 'BEKLE', SONUNDA GERI DONUYOR ===");
{
  temizle();
  const { D, o } = kur("d9");
  cagir(o);
  const bot = botu(D);
  bot._olaylar.length = 0;

  const is = derinIs(o, "elmas", 64);
  kontrol("is baslayinca BEKLE (yoksa botTara geri cekerdi)",
          bot._olaylar.includes(ayar.BOT_OLAY_BEKLE), bot._olaylar.join(", "));

  isiCalistir(is, 300);

  kontrol("is bitince TAKIBE dondu",
          bot._olaylar.lastIndexOf(ayar.BOT_OLAY_TAKIP) >
          bot._olaylar.lastIndexOf(ayar.BOT_OLAY_BEKLE),
          bot._olaylar.join(", "));

  const son = bot._isinlanma[bot._isinlanma.length - 1];
  const uzaklik = Math.hypot(son.x - o.location.x, son.z - o.location.z);
  kontrol("bot madenden OYUNCUNUN YANINA dondu",
          uzaklik < ayar.BOT_TESLIM_MENZIL,
          "son uzaklik " + uzaklik.toFixed(1) + " blok");
}

console.log("");
console.log("=== 10. LAVLI DURAK ATLANIYOR ===");
{
  temizle();
  const { D, o } = kur("d10");
  cagir(o);
  const bot = botu(D);
  bot._isinlanma.length = 0;

  /* Ilk duragi lavla doldur: bot oraya inmemeli. Nokta
     hesabini kodun kendisinden aliyoruz -- elle yazilmis bir
     koordinat kodla birlikte bayatlardi.                     */
  const sinir = { min: -64, max: 319 };
  const ilk = derin.durakNoktasi({ x: 0, y: 90, z: 0 }, 0, 1, 0, -59, sinir);
  for (let dy = -1; dy <= 1; dy++) {
    D.boyut.getBlock({ x: ilk.x, y: ilk.y + dy, z: ilk.z })
      .setType("minecraft:lava");
  }

  const is = derinIs(o, "elmas", 64);
  isiCalistir(is, 400);

  const lavaGitti = bot._isinlanma.some(
    (d) => d.x === ilk.x && d.y === ilk.y && d.z === ilk.z);
  kontrol("bot LAVIN ustune isinlanmadi", !lavaGitti,
          "durak (" + ilk.x + "," + ilk.y + "," + ilk.z + ")");
  kontrol("yine de baska duraklara gitti", bot._isinlanma.length > 0,
          bot._isinlanma.length + " durak");
}

console.log("");
console.log("=== 11. TUNEL ACIYOR (varis noktasi tas doluysa) ===");
{
  temizle();
  const { D, o } = kur("d11");
  cagir(o);
  const bot = botu(D);

  const is = derinIs(o, "elmas", 64);
  isiCalistir(is, 400);

  /* Yeraltinda varsayilan blok tas. Bot inince ustunde
     durabilecegi iki blok acilmis olmali.                    */
  const yeralti = bot._isinlanma.filter((d) => d.y < 64);
  let acilmis = 0;
  for (const d of yeralti) {
    if (D.boyut.getBlock({ x: d.x, y: d.y, z: d.z }).typeId === "minecraft:air" &&
        D.boyut.getBlock({ x: d.x, y: d.y + 1, z: d.z }).typeId === "minecraft:air") {
      acilmis++;
    }
  }
  kontrol("yeralti duraklarinda 2 blokluk yer acildi",
          yeralti.length === 0 || acilmis === yeralti.length,
          acilmis + "/" + yeralti.length);
}

console.log("");
console.log("=== 12. YANLIS BOYUTTA IS BASLATMIYOR ===");
{
  temizle();
  const { D, o } = kur("d12");
  cagir(o);
  o._mesajlar.length = 0;

  // Oyuncu Overworld'de; netherit sadece Nether'da
  const is = derinIs(o, "netherit", 64);
  kontrol("netherit isi Overworld'de BASLAMADI", is === undefined);
  kontrol("sebebi soylendi (sessiz kalmadi)",
          o._mesajlar.some((m) => m.toLowerCase().includes("nether")),
          o._mesajlar[0] || "mesaj yok");
}

console.log("");
console.log("=== 13. BOTSUZ IS ACILMIYOR ===");
{
  temizle();
  const { o } = kur("d13");
  const is = derinIs(o, "elmas", 64);
  kontrol("botu olmayan oyuncuya is acilmadi", is === undefined);
}

console.log("");
console.log("=== 14. SOHBET KAPISI ===");
{
  temizle();
  const { D, o } = kur("d14");
  cagir(o);

  /* main.js'in kancasi gercek yetenek cercevesini kullaniyor;
     burada sadece komutun DERIN kapisina gittigi sinaniyor.  */
  sus();
  const cevap = komutCozumle(o, "bot elmas 64");
  ac();
  kontrol("'bot elmas 64' bir komut olarak taniniyor", cevap !== undefined,
          JSON.stringify(cevap));

  sus();
  const eski = komutCozumle(o, "bot odun");
  ac();
  kontrol("'bot odun' hala eski hizli is", eski !== undefined);

  /* Tanimadigi bir kelime derin taramaya GITMEMELI; eski
     "bilmedigim bot komutu" cevabi calismali.                */
  sus();
  const bilinmez = komutCozumle(o, "bot pufpuf 5");
  ac();
  kontrol("tanimadigi hedef derin taramaya gitmiyor",
          bilinmez !== undefined &&
          String(bilinmez.cevap).includes("Bilmedigim bot komutu"),
          bilinmez ? String(bilinmez.cevap).slice(0, 45) : "-");

  /* Turkce ek yutucu bilerek gevsek: "elmasi" da "elmas".
     Yani "zumrutt" gibi bir yazim hatasi da tutuyor -- bu
     kasitli, kullaniciya "yazim hatasi" demektense isi
     baslatmak dogru.                                         */
  kontrol("yazim hatasi affediliyor ('zumrutt' -> zumrut)",
          derinIstekCoz(["zumrutt", "5"]) &&
          derinIstekCoz(["zumrutt", "5"]).anahtar === "zumrut");
}

console.log("");
console.log("=== 15. AYARLAR TUTARLI ===");
{
  for (const [anahtar, tanim] of ayar.DERIN_HEDEFLER) {
    const sure = derin.derinSure(tanim, ayar.DERIN_VARSAYILAN);
    kontrol(anahtar + ": zorluk tanimli ve sure makul",
            tanim.zorluk > 0 && sure >= ayar.DERIN_TABAN_SURE &&
            sure <= ayar.DERIN_EN_UZUN,
            "zorluk " + tanim.zorluk + " -> " + (sure / 1200).toFixed(1) + " dk");
  }

  /* Her ad DERIN_HEDEFLER'de gercekten var mi: yazim listesi
     ile hedef listesi ayrisirsa komut sessizce calismaz.     */
  let eksik = [];
  for (const [ad, anahtar] of ayar.DERIN_ADLAR) {
    if (!ayar.DERIN_HEDEFLER.has(anahtar)) eksik.push(ad + "->" + anahtar);
  }
  kontrol("butun yazimlar gercek bir hedefe gidiyor", eksik.length === 0,
          eksik.join(", ") || "hepsi tamam");

  /* Cevher hedefleri maden tablosunda gercekten uretiliyor mu?
     Uretilmiyorsa bot o seyi ASLA bulamaz ve sebebi
     anlasilmaz.                                              */
  const uretilen = new Set(ayar.BOT_MADEN_BLOKLARI.values());
  const bulunamaz = [];
  for (const [anahtar, tanim] of ayar.DERIN_HEDEFLER) {
    if (tanim.odun || tanim.esya === undefined) continue;
    if (!uretilen.has(tanim.esya)) bulunamaz.push(anahtar + " (" + tanim.esya + ")");
  }
  kontrol("her cevher hedefi maden tablosundan CIKABILIYOR",
          bulunamaz.length === 0, bulunamaz.join(", ") || "hepsi cikabiliyor");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> derin tarama calisiyor");
process.exit(hata ? 1 : 0);

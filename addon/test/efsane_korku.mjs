/* EFSANENİN KORKUSU  (v7.71)

   Kullanici bir Forge modu getirdi (cosmichorror) ve tek bir
   sart koydu:

     "bu yaratiklar bana saldirmasin, saldirirsa efsane kendi
      olusturdugu yaratiklar tarafindan saldirildi gibi bir sey
      olur ve hic iyi olmaz"

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   HICBIR OLAY ZARAR VERMIYOR. Bu madde bir kez duserse ozellik
   kullanicinin acikca istemedigi seye donusmus demektir. O
   yuzden hem KODA (hasar cagrisi var mi) hem DAVRANISA
   (calistirinca oyuncunun cani/envanteri degisti mi) bakiyoruz.

   Ikincisi onemli: sadece koda bakmak "yazilmis mi" sinar,
   "calisiyor mu" sinamaz -- v7.62'de tam bu hata yapildi.   */
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum, system as sistem } from "@minecraft/server";
import { readFileSync } from "node:fs";

esyaKaydet("pa:kol_toprak");
const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar  = await import("./pack/ayarlar.js");
const korku = await import("./pack/yetenekler/efsane_korku.js");
const efsane = await import("./pack/yetenekler/efsane.js");
const butce = await import("./pack/butce.js");

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
let hata = false;
const kontrol = (ad, kosul, ek) => {
  if (!kosul) hata = true;
  console.log(`  ${kosul ? "✓" : "✗"} ${ad}${ek ? "  ::  " + ek : ""}`);
};

/* Zinciri kurulmus bir dunya: korku yalnizca durak yakininda
   calisiyor, kok yoksa hic donmuyor.                        */
function kur(id, konum) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 },
                      konum || { x: 0.5, y: 64, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player";
  o._komutlar = []; o._mesaj = []; o._hasar = [];
  o.hasTag = () => false;
  o._tikler = [];
  o.runCommand = (k) => {
    o._komutlar.push(k);
    /* Tik de kaydediliyor: olaylar ARASI mesafeyi olcmek icin
       sayi yetmiyor, zamana bakmak gerekiyor.               */
    o._tikler.push({ tik: sistem.currentTick, k });
    return { successCount: 1 };
  };
  o.sendMessage = (m) => o._mesaj.push(m);
  o.applyDamage = (n) => { o._hasar.push(n); return true; };
  D.boyut._varliklar = [o];
  _durum.oyuncular = [o];
  if (butce.butceSifirla) butce.butceSifirla();
  korku.efsaneKorkuUnut();
  return { D, o };
}

console.log("=== 1. ŞART: HİÇBİR OLAY ZARAR VERMİYOR ===");
{
  /* YORUMLAR CIKARILIYOR. Ilk yazilista ham dosya taranmisti
     ve dosyanin kendi acıklamasi ("applyDamage cagirmiyoruz")
     testi dusuruyordu -- kusur kodda degil OLCUMDEYDI. Bu
     depoda daha once de yasanmis bir hata bicimi.          */
  const ham = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/efsane_korku.js", "utf8");
  const kod = ham.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const yasak of ["applyDamage", "createExplosion", "setOnFire",
                       "kill ", "clear @", "setTarget", "addEffect"]) {
    kontrol("kodda '" + yasak.trim() + "' YOK",
            kod.indexOf(yasak) < 0);
  }
  /* Envantere hic dokunulmuyor: esya kaybi olamaz.         */
  kontrol("envantere dokunulmuyor",
          !/getComponent\(["']minecraft:inventory/.test(kod) &&
          !/setItem|replaceitem/.test(kod));
  /* Baska OYUNCUYU dondurmuyor: bunu yapmak v7.65'te savunma
     yazdigimiz griefing kalibinin ta kendisi olurdu.       */
  kontrol("bakis komutu oyunculari DISLIYOR (type=!player)",
          /type=!player/.test(kod));
}

console.log("\n=== 2. DAVRANIŞ: ÇALIŞINCA DA ZARAR YOK ===");
{
  /* Kok yoksa hic donmemeli. */
  const { o } = kur("k0");
  for (let i = 0; i < 30; i++) { tickIlerlet(ayar.EFSANE_KORKU_TARAMA); korku.efsaneKorkuTara([o]); }
  kontrol("zincir yokken HIC komut uretilmiyor", o._komutlar.length === 0,
          o._komutlar.length + " komut");

  /* Simdi zinciri kur ve duragin ustune koy. */
  /* Zinciri KUR: efsane.js koku dunyanin dinamik ozelliginde
     tutuyor. kokYaz() disari acilmadigi icin ozelligi dogrudan
     yaziyoruz -- kokAl() onu okuyor.                        */
  const { o: p } = kur("k1");
  const dunya = (await import("@minecraft/server")).world;
  dunya.setDynamicProperty(ayar.EFSANE_KAYIT_ANAHTAR,
                           JSON.stringify({ x: 0, z: 0 }));
  kontrol("zincir kuruldu (kok okunuyor)", !!efsane.kokAl(),
          JSON.stringify(efsane.kokAl()));
  let calisti = 0;
  for (let i = 0; i < 400; i++) {
    tickIlerlet(ayar.EFSANE_KORKU_TARAMA);
    if (butce.butceSifirla) butce.butceSifirla();
    korku.efsaneKorkuTara([p]);
    if (p._komutlar.length > calisti) calisti = p._komutlar.length;
  }
  kontrol("400 taramada oyuncuya HIC hasar verilmedi",
          p._hasar.length === 0, p._hasar.length + " hasar cagrisi");
  /* BU MADDE OLMADAN 2. BOLUM HICBIR SEY SINAMAZ: kok
     yazilmasaydi tarama tek satirda cikardi ve "hasar yok"
     bos yere yesil yanardi. Ilk yazilista tam bu oldu.     */
  kontrol("olaylar GERCEKTEN calisti (komut uretildi)",
          p._komutlar.length > 0, p._komutlar.length + " komut");
  kontrol("uretilen komutlarin hicbiri hasar komutu DEGIL",
          p._komutlar.every((k) => !/^(damage|kill|clear|effect)\b/.test(k)),
          [...new Set(p._komutlar.map((k) => k.split(" ")[0]))].join(", "));
}

console.log("\n=== 2b. OLAY SIKLIĞI SINIRLI ===");
{
  /* EFSANE_KORKU_ARA olaylar arasi en az beklemeyi tutuyor.
     Kaldirilirsa her taramada olay cikar ve durakta durmak
     katlanilmaz olur -- korku seyrek olunca korku.

     OLCUM: playsound komutlari sayiliyor, cunku her biri TAM
     BIR olay baslangici. Bakis olayi suresince `execute`
     tekrar ediyor, o yuzden ham komut sayisi yaniltir.

     Bu maddeyi eklemeden once mutasyon bataryasi "olaylar
     arasi bosluk kaldirildi" mutasyonunu KACIRDI.          */
  const { o: q } = kur("k1b");
  const dunya2 = (await import("@minecraft/server")).world;
  dunya2.setDynamicProperty(ayar.EFSANE_KAYIT_ANAHTAR,
                            JSON.stringify({ x: 0, z: 0 }));
  const TARAMA_SAYISI = 300;
  for (let i = 0; i < TARAMA_SAYISI; i++) {
    tickIlerlet(ayar.EFSANE_KORKU_TARAMA);
    if (butce.butceSifirla) butce.butceSifirla();
    korku.efsaneKorkuTara([q]);
  }
  /* ASIL DEGISMEZ: iki olay ARASI MESAFE. Sayiya bakmak
     yaniltir -- sans (0.25) ve tarama araligi (40) zaten
     dogal bir seyreklik veriyor, o yuzden boslugu kaldiran
     mutasyon sayi sinirinin altinda kaliyordu. Mutasyon
     bataryasi bunu gosterdi ve olcu MESAFEYE cevrildi.     */
  const sesTikleri = q._tikler
    .filter((x) => x.k.startsWith("playsound")).map((x) => x.tik);
  let enKisa = Infinity;
  for (let i = 1; i < sesTikleri.length; i++) {
    enKisa = Math.min(enKisa, sesTikleri[i] - sesTikleri[i - 1]);
  }
  kontrol("iki olay arasi en az EFSANE_KORKU_ARA",
          sesTikleri.length < 2 || enKisa >= ayar.EFSANE_KORKU_ARA,
          sesTikleri.length + " ses olayi · en kisa ara " +
          (enKisa === Infinity ? "-" : enKisa) +
          " tik (sinir " + ayar.EFSANE_KORKU_ARA + ")");
  kontrol("olcum anlamli olacak kadar olay var",
          sesTikleri.length >= 2, sesTikleri.length + " ses olayi");
}

console.log("\n=== 3. AYARLAR VE SINIRLAR ===");
{
  kontrol("korku acik", ayar.EFSANE_KORKU_ACIK === true);
  /* Menzil muzikten DAR olmali: muzik "gordun", korku
     "icindesin" diyor.                                     */
  kontrol("korku menzili muzikten dar",
          ayar.EFSANE_KORKU_MENZIL < ayar.EFSANE_MUZIK_MENZIL,
          ayar.EFSANE_KORKU_MENZIL + " < " + ayar.EFSANE_MUZIK_MENZIL);
  /* Sans 1 olsaydi durakta durmak katlanilmaz olurdu.      */
  kontrol("olay sansi seyrek (0 < s <= 0.5)",
          ayar.EFSANE_KORKU_SANS > 0 && ayar.EFSANE_KORKU_SANS <= 0.5,
          String(ayar.EFSANE_KORKU_SANS));
  kontrol("olaylar arasi bosluk var", ayar.EFSANE_KORKU_ARA > 0,
          ayar.EFSANE_KORKU_ARA + " tik");
  /* Isik GECICI olmali: suresi yoksa dunya mesale tarlasina
     doner.                                                  */
  kontrol("uzak isigin suresi var (kalici degil)",
          ayar.EFSANE_ISIK_SURE > 0 && ayar.EFSANE_ISIK_SURE <= 400,
          ayar.EFSANE_ISIK_SURE + " tik");
  kontrol("hayalet sesler vanilla adlar",
          ayar.EFSANE_HAYALET_SESLER.every((s) => /^(mob|dig|hit|use)\./.test(s)),
          ayar.EFSANE_HAYALET_SESLER.join(", "));
}

console.log("\n=== 4. KAYNAK MODDAN ALINMAYANLAR YAZILI ===");
{
  /* Alinmayanlarin NEDENI yazili olmali: yoksa bir gun biri
     "TNT yagmuru neden yok" diye ekler ve sart bozulur.    */
  const ay = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/ayarlar.js", "utf8");
  for (const ad of ["TntRain", "Trap1", "TotemHeist"]) {
    kontrol(ad + " neden alinmadigi yazili", ay.indexOf(ad) >= 0);
  }
  kontrol("saldiri taramasinin sonucu yazili",
          /saldırı izi YOK/i.test(ay) || /20'sinde saldırı izi/i.test(ay));
}

console.log("\n=== 5. TEMİZLİK ===");
{
  const { o } = kur("k2");
  korku.efsaneKorkuUnut(o.id);
  kontrol("oyuncu cikinca defterden dusuyor",
          korku.efsaneKorkuDurum(o.id) === undefined);
  const m = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/main.js", "utf8");
  kontrol("playerLeave efsaneKorkuUnut cagiriyor",
          /efsaneKorkuUnut\(olay\.playerId\)/.test(m));
  kontrol("ana donguye baglanmis", /efsaneKorkuTara\(oyuncular\)/.test(m));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> efsanenin korkusu yerinde");
process.exit(hata ? 1 : 0);

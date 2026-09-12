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
/* ---- OLAYI ZORLA SEC ----
   Tarama iki yerde `Math.random` cagiriyor: once seyreklik
   kapisi (`> EFSANE_KORKU_SANS` ise cikiyor), sonra
   `sec(secenekler)`. Testler bugune kadar "yeterince tara,
   er ya da gec cikar" diye bekliyordu ve bu YANLISTI:
   30 kosuda bir, beklenen olay 500 taramada bile cikmiyor ve
   test kendi kodumuzu haksiz yere dusuruyordu (TNT olcumu
   dahil -- o madde de ayni sekilde kararsizmis).

   Burasi ilk iki cagriyi sabitliyor, gerisini normal
   `Math.random`a birakiyor: olayin ICINDEKI rastgelelik
   (konum, ornekleme) bozulmasin diye.

   Secenek sirasi taramadaki sirayla ayni olmali; `SIRA_*`
   sabitleri onu yaziyor ve degisirse test dusurur.          */
const OLAY_SIRASI_ACIK = ["bakis", "aya", "hayalet", "isik",
                          /* 404 olaylari `isik`ten HEMEN SONRA
                             ekleniyor -- gazap olaylari en sona
                             kaliyor. Ilk yazilista sira yanlisti
                             ve zorlama sessizce YANLIS olayi
                             seciyordu: "tnt bekliyorum" diyip
                             "sonme" calistiriyordu. Ayni sirayi
                             iki yerde tutmak kirilgan, o yuzden
                             asagida taramanin kendi listesiyle
                             karsilastiriliyor.               */
                          "sonme", "kapi", "kalp", "nefes",
                          "golge", "kayit",
                          "tnt", "yildirim"];

/* Sira kaynaktan DOGRULANIYOR. Iki yerde elle tutulan bir
   sirayi test kilitlemezse, kaynak degisince zorlama sessizce
   baska bir olayi calistirir ve testler "gecti" der.        */
function siraDogrula(kaynak) {
  const g = kaynak.match(/const secenekler = \[([^\]]*)\]/);
  const p = kaynak.match(/secenekler\.push\("sonme"[^)]*\)/);
  const t = kaynak.match(/secenekler\.push\("tnt"[^)]*\)/);
  if (!g || !p || !t) return null;
  /* `String.match` bir DIZI donuyor, dizge degil -- ilk
     yazilista dogrudan `g`ye `.match` cagirdim ve test kendi
     sonunda COKUYORDU. Cokmeyi de kacirdim, cunku hata
     ayiklarken yalnizca "✗" satiri ariyordum; cokmede oyle
     bir satir olmuyor. Olcum aracina da bakmak gerekiyormus. */
  const al = (metin) =>
    (String(metin).match(/"([a-z]+)"/g) || []).map((x) => x.slice(1, -1));
  return [...al(g[1]), ...al(p[0]), ...al(t[0])];
}

function zorla(olayAdi, isi) {
  const i = OLAY_SIRASI_ACIK.indexOf(olayAdi);
  if (i < 0) throw new Error("bilinmeyen olay: " + olayAdi);
  const gercek = Math.random;
  let sayac = 0;
  Math.random = () => {
    sayac++;
    if (sayac === 1) return 0;                       // kapiyi ac
    if (sayac === 2) return (i + 0.5) / OLAY_SIRASI_ACIK.length;
    return gercek();
  };
  try { sayac = 0; return isi(() => { sayac = 0; }); }
  finally { Math.random = gercek; }
}

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

console.log("=== 1. ŞART: HASAR EFSANEYE DEĞMİYOR ===");
{
  /* v7.72'de ŞART DEĞİŞTİ. v7.71'de "hiç hasar olmasın" diye
     anlaşılmıştı; kullanıcı düzeltti:

       "Ben bir efsaneyim; onun kendi yaratıkları kendisine
        zarar verirse bu gülünç bir durum... hasar olanları da
        ekle ama bana bir şey yapmasınlar."

     Yani hasar VAR, ama efsaneye DEĞMİYOR. Test de buna
     göre değişti: artık "createExplosion yok" demiyoruz,
     "createExplosion efsaneden uzakta" diyoruz.            */
  const ham = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/efsane_korku.js", "utf8");
  const kod = ham.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  /* Bunlar HALA yasak: oyuncuya DOGRUDAN uygulanan seyler.
     Patlama dolayli ve mesafeyle sinirli; applyDamage
     dogrudan ve sinirlanamaz.                              */
  for (const yasak of ["applyDamage", "setOnFire", "kill @", "clear @",
                       "setTarget", "addEffect"]) {
    kontrol("kodda '" + yasak.trim() + "' YOK", kod.indexOf(yasak) < 0);
  }
  kontrol("envantere dokunulmuyor",
          !/getComponent\(["']minecraft:inventory/.test(kod) &&
          !/setItem|replaceitem/.test(kod));
  kontrol("bakis komutu oyunculari DISLIYOR (type=!player)",
          /type=!player/.test(kod));

  /* Guvenlik EFEKTLE degil GEOMETRIYLE. Direnc verilmesi hem
     "Direnc V yasak" kuralina takilir hem yanlis cozum olurdu. */
  kontrol("bagisiklik EFEKTI verilmiyor",
          !/resistance|Direnç V|"resistance"/i.test(kod));
  kontrol("patlama ANINDA mesafe yeniden olculuyor",
          /gazapGuvenliMi/.test(kod) &&
          kod.indexOf("gazapGuvenliMi") !== kod.lastIndexOf("gazapGuvenliMi"),
          "tanim + en az bir cagri");
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

console.log("\n=== 2a. GAZAP: HER PATLAMA EFSANEDEN UZAK  (v7.72) ===");
{
  /* BU DOSYANIN EN ONEMLI MADDESI.

     Kullanicinin sarti tek cumle: hasar olsun ama bana degmesin.
     Burada HER patlamanin ve HER yildiriminin efsaneye olan
     mesafesi tek tek olculuyor. Bir tanesi bile guvenli
     yaricapin icinde olursa ozellik kullanicinin acikca
     istemedigi seye donusmus demektir.

     Kod okuyarak degil, CALISTIRARAK olculuyor: "mesafe
     kontrolu yazilmis" ile "mesafe kontrolu tutuyor" ayri
     seyler -- v7.62'de tam bu ayrim kacirilmisti.          */
  const { D, o: g } = kur("gz1");
  const dunyaG = (await import("@minecraft/server")).world;
  dunyaG.setDynamicProperty(ayar.EFSANE_KAYIT_ANAHTAR,
                            JSON.stringify({ x: 0, z: 0 }));
  /* Y'yi yer ustune al: gazap olaylari yalniz acik havada. */
  g.location = { x: 0.5, y: 80, z: 0.5 };

  /* Ornek sayisi YUKSEK: yuvarlama hatasi 45 ornekte bir kez
     goruluyordu, yani az ornekle test flaky olurdu. Mutasyon
     bataryasi "yuvarlama sirasi bozuldu" mutasyonunu az
     ornekte KACIRDI.                                        */
  for (let i = 0; i < 3000; i++) {
    tickIlerlet(ayar.EFSANE_KORKU_TARAMA);
    if (butce.butceSifirla) butce.butceSifirla();
    korku.efsaneKorkuTara([g]);
  }
  /* Fitiller dolsun: TNT 40 tik sonra patliyor. */
  for (let i = 0; i < 10; i++) {
    tickIlerlet(ayar.EFSANE_GAZAP_TNT_FITIL);
    if (butce.butceSifirla) butce.butceSifirla();
  }

  const guvenli = ayar.EFSANE_GAZAP_GUVENLI;
  const mesafe = (p) => {
    const dx = p.x - g.location.x, dy = p.y - g.location.y, dz = p.z - g.location.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  const patlamalar = D.sayac.patlama;
  const yakinPatlama = patlamalar.filter((p) => mesafe(p) < guvenli);
  kontrol("gazap GERCEKTEN calisti (patlama uretildi)",
          patlamalar.length > 0, patlamalar.length + " patlama");
  kontrol("HICBIR patlama guvenli yaricapin icinde DEGIL",
          yakinPatlama.length === 0,
          yakinPatlama.length + " yakin / " + patlamalar.length + " toplam" +
          (patlamalar.length
            ? " · en yakin " + Math.min(...patlamalar.map(mesafe)).toFixed(1) +
              " blok (sinir " + guvenli + ")"
            : ""));

  /* DOGUS anini da olc: halkanin ic yaricapi kaldirilirsa TNT
     oyuncunun tepesinde DOGAR. Patlama iptal edilse bile bu
     yanlis -- gorunum bozulur ve savunma tek katmana iner. */
  const tntDogumlari = D.sayac.dogan.filter((d) => d.tip === "minecraft:tnt");
  const yakinDogum = tntDogumlari.filter((d) => {
    const dx = d.x - g.location.x, dz = d.z - g.location.z;
    return Math.sqrt(dx * dx + dz * dz) < ayar.EFSANE_GAZAP_GUVENLI;
  });
  kontrol("TNT'ler HALKA icinde doguyor (tepede degil)",
          yakinDogum.length === 0,
          yakinDogum.length + " yakin dogum / " + tntDogumlari.length);

  const yildirimlar = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");
  const yakinYildirim = yildirimlar.filter((d) => mesafe(d) < guvenli);
  kontrol("yildirim da dustu", yildirimlar.length > 0,
          yildirimlar.length + " yildirim");
  kontrol("HICBIR yildirim guvenli yaricapin icinde DEGIL",
          yakinYildirim.length === 0,
          yakinYildirim.length + " yakin / " + yildirimlar.length + " toplam" +
          (yildirimlar.length
            ? " · en yakin " + Math.min(...yildirimlar.map(mesafe)).toFixed(1) + " blok"
            : ""));

  /* Patlama gucu de sinirli olmali: 4 vanilla TNT ile ayni.
     Buyudukce guvenli yaricap yetmemeye baslar.            */
  kontrol("patlama gucu vanilla TNT sinirinda",
          patlamalar.every((p) => p.guc <= 4),
          "en buyuk " + (patlamalar.length ? Math.max(...patlamalar.map((p) => p.guc)) : "-"));
  kontrol("guvenli yaricap patlama menzilinin en az iki kati",
          guvenli >= 2 * ayar.EFSANE_GAZAP_TNT_GUC * 2,
          guvenli + " >= " + (2 * ayar.EFSANE_GAZAP_TNT_GUC * 2));
}

console.log("\n=== 2c. GAZAP: OYUNCU HALKAYA GİRERSE İPTAL ===");
{
  /* TNT havada iki saniye kaliyor ve oyuncu o sirada halkaya
     YURUYEBILIR. Dogus anina bakmak "muhtemelen guvenli"
     olurdu; bu madde "kesin guvenli"yi tutuyor.

     DETERMINISTIK kurulum: TNT dusene kadar tarama yapiliyor,
     sonra oyuncu TNT'lerin TAM USTUNE isinlanip fitil
     dolduruluyor. Ilk yazilista tarama 600 kez donduruluyordu
     ve TNT'lerin cogu zaten patlamis oluyordu -- yani madde
     hicbir sey sinamiyordu ve mutasyon KACTI.               */
  const { D, o: g } = kur("gz2");
  const dunyaG = (await import("@minecraft/server")).world;
  dunyaG.setDynamicProperty(ayar.EFSANE_KAYIT_ANAHTAR,
                            JSON.stringify({ x: 0, z: 0 }));
  g.location = { x: 0.5, y: 80, z: 0.5 };

  /* TNT dogana kadar tara (fitil dolmadan dur). */
  let tntler = [];
  zorla("tnt", (sifirla) => {
    for (let i = 0; i < 30 && tntler.length === 0; i++) {
      tickIlerlet(ayar.EFSANE_KORKU_TARAMA);
      if (butce.butceSifirla) butce.butceSifirla();
      sifirla();
      korku.efsaneKorkuTara([g]);
      tntler = D.sayac.dogan.filter((d) => d.tip === "minecraft:tnt");
    }
  });
  kontrol("TNT dogdu (kurulum tuttu)", tntler.length > 0,
          tntler.length + " TNT");

  const oncekiPatlama = D.sayac.patlama.length;
  /* Oyuncuyu ILK TNT'nin tam ustune isinla. */
  if (tntler.length) g.location = { x: tntler[0].x, y: 80, z: tntler[0].z };
  for (let i = 0; i < 4; i++) {
    tickIlerlet(ayar.EFSANE_GAZAP_TNT_FITIL);
    if (butce.butceSifirla) butce.butceSifirla();
  }
  const yeni = D.sayac.patlama.slice(oncekiPatlama);
  const mes = (p) => {
    const dx = p.x - g.location.x, dy = p.y - g.location.y, dz = p.z - g.location.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };
  const yakin = yeni.filter((p) => mes(p) < ayar.EFSANE_GAZAP_GUVENLI);
  kontrol("oyuncunun USTUNDEKI patlama IPTAL edildi",
          yakin.length === 0,
          yakin.length + " yakin / " + yeni.length + " patlama" +
          (yeni.length ? " · en yakin " + Math.min(...yeni.map(mes)).toFixed(1) : ""));
}

console.log("\n=== 2d. GAZAP AYARLARI SINIRLI ===");
{
  /* Sahte dunyanin createExplosion'i secenekleri yoksayiyor,
     yani "blok kirmiyor" DAVRANIS olarak olculemiyor. Ayara
     ve koda bakiyoruz -- ve bunun bir SINIR oldugu burada
     yazili duruyor, "olctuk" demiyoruz.                     */
  kontrol("TNT blok KIRMIYOR (ayar)",
          ayar.EFSANE_GAZAP_TNT_KIRAR === false,
          String(ayar.EFSANE_GAZAP_TNT_KIRAR));
  const kod = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/efsane_korku.js", "utf8");
  kontrol("kod ayari createExplosion'a GECIRIYOR",
          /breaksBlocks:\s*EFSANE_GAZAP_TNT_KIRAR/.test(kod));
  /* Vanilla TNT kaldirilmazsa IKI patlama olur: biri bizim
     sinirlarimizla, biri vanilla'nin -- ve vanilla'ninki
     mesafe denetiminden gecmez. Sahte dunya vanilla TNT
     patlamasini simule etmiyor, o yuzden bu da KOD maddesi. */
  kontrol("vanilla TNT patlamadan once KALDIRILIYOR",
          /gecerliMi\(tnt\)\)\s*tnt\.remove\(\)/.test(kod));
  kontrol("digger oyuncular varsayilan olarak VURULMUYOR",
          ayar.EFSANE_GAZAP_OYUNCU_VURUR === false);
  kontrol("guvenli yaricap uzaktan kucuk (halka anlamli)",
          ayar.EFSANE_GAZAP_GUVENLI < ayar.EFSANE_GAZAP_UZAK,
          ayar.EFSANE_GAZAP_GUVENLI + " < " + ayar.EFSANE_GAZAP_UZAK);
}

console.log("\n=== 2b. OLAY SIKLIĞI SINIRLI ===");
{
  /* EFSANE_KORKU_ARA olaylar arasi en az beklemeyi tutuyor.
     Kaldirilirsa her taramada olay cikar ve durakta durmak
     katlanilmaz olur -- korku seyrek olunca korku.

     OLCUM (v7.74'te DEGISTI): eskiden playsound komutlari
     sayiliyordu, "her biri tam bir olay baslangici" diye. Bu
     v7.74'te YANLIS oldu: Kalp Atisi tek olayda 6, Kapi
     Tiklatma 3, Sonen Mesale mesale basina 1 ses caliyor.
     Yani ses sayisi artik olay sayisi degil ve test kendi
     kodumuzu haksiz yere dusuruyordu.

     Yeni olcu VEKIL DEGIL, KAPININ KENDISI: tarama bir olayi
     ancak `simdi >= d.ara` iken basliyor ve basarili her olay
     `ara`yi `simdi + EFSANE_KORKU_ARA`ya itiyor. Defterdeki
     `ara` her degistiginde TAM BIR olay baslamis demektir --
     kac ses caldigindan bagimsiz.

     Bu maddeyi eklemeden once mutasyon bataryasi "olaylar
     arasi bosluk kaldirildi" mutasyonunu KACIRDI.          */
  const { o: q } = kur("k1b");
  const dunya2 = (await import("@minecraft/server")).world;
  dunya2.setDynamicProperty(ayar.EFSANE_KAYIT_ANAHTAR,
                            JSON.stringify({ x: 0, z: 0 }));
  const TARAMA_SAYISI2 = 300;
  /* ASIL DEGISMEZ: iki olay ARASI MESAFE. Sayiya bakmak
     yaniltir -- sans (0.25) ve tarama araligi (40) zaten
     dogal bir seyreklik veriyor, o yuzden boslugu kaldiran
     mutasyon sayi sinirinin altinda kaliyordu. Mutasyon
     bataryasi bunu gosterdi ve olcu MESAFEYE cevrildi.     */
  let enKisa = Infinity, oncekiBas = null, olaySayisi = 0, sonAra = -1;
  for (let i = 0; i < TARAMA_SAYISI2; i++) {
    tickIlerlet(ayar.EFSANE_KORKU_TARAMA);
    if (butce.butceSifirla) butce.butceSifirla();
    korku.efsaneKorkuTara([q]);
    const d = korku.efsaneKorkuDurum(q.id);
    if (!d || d.ara === sonAra) continue;
    sonAra = d.ara;
    olaySayisi++;
    const bas = d.ara - ayar.EFSANE_KORKU_ARA;   // olayin basladigi tik
    if (oncekiBas !== null) enKisa = Math.min(enKisa, bas - oncekiBas);
    oncekiBas = bas;
  }
  kontrol("iki olay arasi en az EFSANE_KORKU_ARA",
          olaySayisi < 2 || enKisa >= ayar.EFSANE_KORKU_ARA,
          olaySayisi + " olay · en kisa ara " +
          (enKisa === Infinity ? "-" : enKisa) +
          " tik (sinir " + ayar.EFSANE_KORKU_ARA + ")");
  kontrol("olcum anlamli olacak kadar olay var",
          olaySayisi >= 2, olaySayisi + " olay");
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

console.log("\n=== 6. ERROR 404 · ANOMALY REPHASED (v7.74) ===");
{
  const dunya6 = (await import("@minecraft/server")).world;

  /* ---- 6a. MEŞALE GERİ GELİYOR MU ----
     Sondurulen mesale OYUNCUNUN ESYASI. Geri gelmezse
     "hicbir yetenek oyuncunun esyasini kaybettirmez" kurali
     kirilir. Bu bolumun asil sorusu bu.                     */
  const { D: D6, o: o6 } = kur("k6", { x: 0.5, y: 64, z: 0.5 });
  dunya6.setDynamicProperty(ayar.EFSANE_KAYIT_ANAHTAR,
                            JSON.stringify({ x: 0, z: 0 }));

  /* MESALE TARLASI. Ilk yazilista halkaya 24 tek mesale
     konmustu ve 400 taramada yalnizca 2 tanesi sondu -- olcum
     yapilamayacak kadar az, cunku 60 rastgele orneklemenin
     belirli bir bloga denk gelmesi zor. Simdi r=2..17 arasi
     DOLU bir disk doseniyor: her ornekleme bir mesaleye
     denk geliyor ve olcu gercekten baski yapiyor.          */
  const yakinlar = [], uzaklar = [];
  for (let dx = -17; dx <= 17; dx++) {
    for (let dz = -17; dz <= 17; dz++) {
      const d = Math.hypot(dx, dz);
      if (d < 2 || d > 17) continue;
      /* Uc katman: olay orneklemede y'yi -2..+4 kaydiriyor,
         tek katman olsaydi okumalarin cogu havaya denk
         gelirdi.                                            */
      for (let dy = -2; dy <= 4; dy++) {
        const p = { x: dx, y: 64 + dy, z: dz };
        D6.boyut.getBlock(p).setType("minecraft:torch");
        (d < ayar.EFSANE_SONME_YAKIN - 1 ? yakinlar : uzaklar).push(p);
      }
    }
  }
  const mesaleMi = (p) => D6.boyut.getBlock(p).typeId === "minecraft:torch";

  let hicSondu = false;
  zorla("sonme", (sifirla) => {
    for (let i = 0; i < 40; i++) {
      tickIlerlet(ayar.EFSANE_KORKU_TARAMA);
      if (butce.butceSifirla) butce.butceSifirla();
      sifirla();
      korku.efsaneKorkuTara([o6]);
      if (!hicSondu && uzaklar.some((p) => !mesaleMi(p))) hicSondu = true;
    }
  });
  kontrol("uzaktaki mesaleler GERCEKTEN sondu (olay calisti)", hicSondu);

  /* BOSALTIRKEN YENI OLAY CIKMAMALI. Ilk yazilista bu dongu
     taramaya devam ediyordu, yani her turda yeni mesaleler
     sonduruyordu ve son turda sondurulenler daima "geri
     gelmemis" gorunuyordu. Test sekizde bir dusuyordu ve
     sebebi kod degil TESTIN KENDISIYDI.

     Cozum: oyuncuyu duraktan UZAKLASTIR. `duraktaMi` yanlis
     donunce yeni olay cikmiyor, ama `mesaleleriTazele` kok
     denetiminden ONCE calistigi icin defter yine bosaliyor. */
  o6.location.x = 5000; o6.location.z = 5000;
  for (let i = 0; i < 20; i++) {
    tickIlerlet(ayar.EFSANE_SONME_SURE);
    if (butce.butceSifirla) butce.butceSifirla();
    korku.efsaneKorkuTara([o6]);
  }
  kontrol("sonen mesalelerin HEPSI geri geldi",
          uzaklar.every(mesaleMi),
          uzaklar.filter((p) => !mesaleMi(p)).length + " mesale eksik");
  kontrol("mesale defteri bosaldi",
          korku.mesaleDefteriBoyu() === 0,
          korku.mesaleDefteriBoyu() + " kayit");

  /* YAKINDAKILER hic sonmemeli: pencerede kirilip
     kaybedilebilirlerdi.

     OLCU BELIRLI NOKTALARA BAKMIYOR. Ilk yazilista "su 24
     mesale duruyor mu" diye bakiyordu ve mutasyon bataryasi
     bunu KACIRDI: yakin siniri kaldirildiginda bile 60
     rastgele orneklemenin o 24 blogun birine tam denk gelme
     ihtimali dusuk, yani test sans eseri yesil yaniyordu.
     Simdi SONDURULEN HER MESALENIN mesafesi olculuyor --
     sinir kalkarsa ilk yakin ornek testi dusurur.          */
  const sondurulenler = D6.sayac.yazilan.filter((w) => w.tip === "minecraft:air");
  let enYakinSonme = Infinity;
  for (const w of sondurulenler) {
    const d = Math.hypot(w.x - 0.5, w.z - 0.5);
    enYakinSonme = Math.min(enYakinSonme, d);
  }
  kontrol("sondurulen HICBIR mesale SONME_YAKIN'dan yakin degil",
          /* Pay 1.5: ornek noktasi `Math.floor` ile bloga
             oturtuluyor, bu hem x'te hem z'de bir blok
             yaklastirabilir (kosegende ~1.42).            */
          sondurulenler.length === 0 ||
          enYakinSonme >= ayar.EFSANE_SONME_YAKIN - 1.5,
          sondurulenler.length + " sonme · en yakini " +
          (enYakinSonme === Infinity ? "-" : enYakinSonme.toFixed(1)) +
          " blok (sinir " + ayar.EFSANE_SONME_YAKIN + ")");
  kontrol("olcum anlamli olacak kadar sonme var", sondurulenler.length >= 3,
          sondurulenler.length + " sonme");
  kontrol("SONME_YAKIN icindeki mesaleler duruyor",
          yakinlar.every(mesaleMi),
          yakinlar.filter((p) => !mesaleMi(p)).length + " yakin mesale gitti");

  /* ---- 6b. ZAMANLAYICI DÜŞERSE ----
     Dunya kapanip acilirsa `system.runTimeout` zinciri gider.
     Defterin ikinci sansi tam bunun icin. Zamanlayici kuyrugu
     BOSALTILIP defterin tek basina geri koyabildigi olculuyor. */
  korku.efsaneKorkuUnut();
  /* Mesale MENZILE konmali. Ilk yazilista 40 blok oteye
     konmustu -- SONME_UZAK 16, yani oraya hic bakilmiyordu ve
     olay tetiklenemiyordu. Test kendi kendini olcemiyordu;
     mutasyon bataryasi temiz kosuda bile dusurunce cikti.   */
  for (const p of uzaklar) D6.boyut.getBlock(p).setType("minecraft:torch");
  o6.location.x = 0.5; o6.location.z = 0.5;      // duraga geri
  let sondurdu = false;
  zorla("sonme", (sifirla) => {
    for (let i = 0; i < 40 && !sondurdu; i++) {
      tickIlerlet(ayar.EFSANE_KORKU_TARAMA);
      if (butce.butceSifirla) butce.butceSifirla();
      sifirla();
      korku.efsaneKorkuTara([o6]);
      if (korku.mesaleDefteriBoyu() > 0) sondurdu = true;
    }
  });
  if (sondurdu) {
    _durum.zamanlar.length = 0;                 // zamanlayicilar DUSTU
    /* Yine uzaklasiyoruz: olcmek istedigimiz sey "defter tek
       basina geri koyabiliyor mu", "yenisini sondururken
       eskisini geri koyabiliyor mu" degil.                  */
    o6.location.x = 5000; o6.location.z = 5000;
    for (let i = 0; i < 10; i++) {
      tickIlerlet(ayar.EFSANE_SONME_SURE);
      if (butce.butceSifirla) butce.butceSifirla();
      korku.efsaneKorkuTara([o6]);
    }
    kontrol("zamanlayici dusse bile defter mesaleyi geri koydu",
            korku.mesaleDefteriBoyu() === 0,
            korku.mesaleDefteriBoyu() + " kayit defterde kaldi");
  } else {
    kontrol("zamanlayici dusse bile defter mesaleyi geri koydu",
            false, "olay hic tetiklenmedi -- olcum yapilamadi");
  }

  /* ---- 6c. KAÇAN GÖLGE SALDIRAMAZ ----
     Sartin kod tarafindaki garantisi: kilik varliginda HICBIR
     AI hedefi yok. Yorum degil, dosyadan okunuyor.          */
  const kilik = JSON.parse(readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/entities/carpik_kilik.json", "utf8"));
  const bilesen = Object.keys(kilik["minecraft:entity"].components || {});
  const aiIzi = bilesen.filter((b) => /behavior|target|attack|movement|navigation/i.test(b));
  kontrol("golge kiliginda AI/hedef/saldiri bileseni YOK",
          aiIzi.length === 0, aiIzi.join(", "));
  kontrol("golge kiligi ayarda bu varliga bagli",
          ayar.EFSANE_GOLGE_KIMLIK === kilik["minecraft:entity"].description.identifier,
          ayar.EFSANE_GOLGE_KIMLIK);

  /* ---- 6d. GÖLGE ORTADA KALMIYOR ----
     donusum.js'te YASANMIS tuzak: kalici kilik dunya kapaninca
     yerinde kaliyor. Defter + acilis supurmesi bunun icin.  */
  const kk = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/efsane_korku.js", "utf8");
  /* METIN DEGIL DAVRANIS. Ilk yazilista bu madde kaynakta
     `kaliciYaz(EFSANE_GOLGE_...)` GECIYOR MU diye bakiyordu;
     mutasyon bataryasi kacirdi, cunku cagri yerini silmek
     tanimi silmiyor. Simdi golge dogduktan sonra dunya
     ozelligine GERCEKTEN yazilmis mi diye bakiliyor.       */
  korku.efsaneKorkuUnut();
  dunya6.setDynamicProperty(ayar.EFSANE_GOLGE_KAYIT_ANAHTAR, "");
  const { o: o8 } = kur("k8");
  dunya6.setDynamicProperty(ayar.EFSANE_KAYIT_ANAHTAR,
                            JSON.stringify({ x: 0, z: 0 }));
  let golgeDogdu = false;
  zorla("golge", (sifirla) => {
    for (let i = 0; i < 30 && !golgeDogdu; i++) {
      tickIlerlet(ayar.EFSANE_KORKU_TARAMA);
      if (butce.butceSifirla) butce.butceSifirla();
      sifirla();
      korku.efsaneKorkuTara([o8]);
      if (korku.golgeSayisi() > 0) golgeDogdu = true;
    }
  });
  kontrol("golge gercekten dogdu (olcum yapilabilir)", golgeDogdu);
  const defterHam = dunya6.getDynamicProperty(ayar.EFSANE_GOLGE_KAYIT_ANAHTAR);
  kontrol("golge kimlikleri kalici deftere YAZILDI",
          golgeDogdu && typeof defterHam === "string" && defterHam.length > 2,
          JSON.stringify(defterHam));
  kontrol("kaynakta da kalici yazim duruyor",
          /kaliciYaz\(EFSANE_GOLGE_KAYIT_ANAHTAR/.test(kk));
  kontrol("acilista ortada kalan golgeler supuruluyor",
          /golgeleriSupur/.test(kk) &&
          kk.indexOf("golgeleriSupur") !== kk.lastIndexOf("golgeleriSupur"),
          "tanim + cagri");
  kontrol("golge defteri donusum defterinden AYRI",
          ayar.EFSANE_GOLGE_KAYIT_ANAHTAR !== ayar.DONUSUM_KAYIT_ANAHTAR,
          ayar.EFSANE_GOLGE_KAYIT_ANAHTAR);

  /* ---- 6d-2. GÖLGE BAKINCA KAYBOLUYOR MU ----
     Turun imza mekanigi bu (ErrorStareDespawn, APeekTick) ve
     mutasyon bataryasi gosterdi ki hicbir sey onu sinamiyordu:
     "bakinca kaybolma" satirini silmek testleri dusurmuyordu.
     Burada DAVRANIS olculuyor.

     Bakis yonu YAZILABILIR bir nesne uzerinden veriliyor:
     dunya.mjs'teki getViewDirection kapanistaki `bakis`i CANLI
     okuyor, yani ayni nesneyi degistirince oyuncu gercekten
     donmus oluyor.                                           */
  /* OLCU ZAMANLAMA DEGIL KARSILASTIRMA.
     Ilk yazilista "4 turda hala duruyor mu, 40 turda gitti mi"
     diye bakiliyordu ve bu kirilgandi: tur sayilari zincirin
     ic adimina (GOLGE_DENET) bagliydi, degisince test yalan
     soylerdi. Olculen sey aslinda su: BAKINCA bakmayinca
     olduguna gore COK DAHA CABUK gidiyor mu.              */
  const golgeOmru = (bakacakMi) => {
    korku.efsaneKorkuUnut();
    const D9 = dunyaKur();
    const yon = { x: 0, y: 0, z: 1 };            // +z'ye bakiyor
    const o9 = oyuncuKur(D9.boyut, yon, { x: 0.5, y: 64, z: 0.5 });
    o9.id = "k9"; o9.typeId = "minecraft:player";
    o9.hasTag = () => false;
    o9.runCommand = () => ({ successCount: 1 });
    o9.sendMessage = () => {};
    o9.applyDamage = () => true;
    D9.boyut._varliklar = [o9];
    _durum.oyuncular = [o9];
    dunya6.setDynamicProperty(ayar.EFSANE_KAYIT_ANAHTAR,
                              JSON.stringify({ x: 0, z: 0 }));

    const dogan9 = () => D9.sayac.dogan
      .filter((d) => d.tip === ayar.EFSANE_GOLGE_KIMLIK).length;
    let var9 = false;
    zorla("golge", (sifirla) => {
      for (let i = 0; i < 30 && !var9; i++) {
        tickIlerlet(ayar.EFSANE_KORKU_TARAMA);
        if (butce.butceSifirla) butce.butceSifirla();
        sifirla();
        korku.efsaneKorkuTara([o9]);
        if (dogan9() > 0 && korku.golgeSayisi() > 0) var9 = true;
      }
    });
    if (!var9) return -1;                        // dogmadi

    /* Golge ARKAYA (-z) doguruluyor. Bakmak icin oraya donuyoruz. */
    if (bakacakMi) yon.z = -1;
    let tur = 0;
    while (korku.golgeSayisi() > 0 && tur < 400) {
      tickIlerlet(ayar.EFSANE_GOLGE_DENET);
      tur++;
    }
    return korku.golgeSayisi() > 0 ? 999 : tur;
  };

  const bakincaTur = golgeOmru(true);
  const bakmayincaTur = golgeOmru(false);
  kontrol("iki olcumde de golge dogdu",
          bakincaTur >= 0 && bakmayincaTur >= 0,
          bakincaTur + " / " + bakmayincaTur);
  kontrol("BAKINCA golge hemen kayboluyor",
          bakincaTur >= 0 && bakincaTur <= 2,
          bakincaTur + " tur");
  kontrol("BAKMAYINCA cok daha uzun duruyor",
          bakmayincaTur > bakincaTur * 3,
          "bakinca " + bakincaTur + " tur · bakmayinca " + bakmayincaTur + " tur");
  kontrol("suresi dolunca yine de kendiliginden gidiyor",
          bakmayincaTur < 400,
          bakmayincaTur + " tur");

  /* ---- 6e. 404 KAYDI KİMSEYİ TAKLİT ETMİYOR ----
     Kaynak `kick @p` ile sahte bir baglanti kopmasi uretiyor.
     O ALINMADI; geriye satirin kendisi kaldi.               */
  kontrol("kodda 'kick' YOK",
          !/\bkick\b/.test(kk.replace(/\/\*[\s\S]*?\*\//g, "")));
  kontrol("404 satirlari var", ayar.EFSANE_404_SATIRLAR.length >= 2);

  /* ---- 6f. YENİ OLAYLARIN HİÇBİRİ HASAR VERMİYOR ---- */
  korku.efsaneKorkuUnut();
  const { o: o7 } = kur("k7");
  dunya6.setDynamicProperty(ayar.EFSANE_KAYIT_ANAHTAR,
                            JSON.stringify({ x: 0, z: 0 }));
  for (let i = 0; i < 500; i++) {
    tickIlerlet(ayar.EFSANE_KORKU_TARAMA);
    if (butce.butceSifirla) butce.butceSifirla();
    korku.efsaneKorkuTara([o7]);
  }
  kontrol("500 taramada yeni olaylar da hic hasar vermedi",
          o7._hasar.length === 0, o7._hasar.length + " hasar");
  kontrol("uretilen komutlar arasinda kick/kill/clear yok",
          o7._komutlar.every((k) => !/^(kick|kill|clear|damage)\b/.test(k)),
          [...new Set(o7._komutlar.map((k) => k.split(" ")[0]))].join(", "));

  /* ---- 6f-2. ZORLAMA SIRASI KAYNAKLA AYNI MI ---- */
  const gercekSira = siraDogrula(kk);
  kontrol("zorlama sirasi taramanin kendi sirasiyla ayni",
          gercekSira !== null &&
          gercekSira.join(",") === OLAY_SIRASI_ACIK.join(","),
          "kaynak: " + (gercekSira ? gercekSira.join(",") : "okunamadi"));

  /* ---- 6g. İKİ MODUN TARAMASI YAZILI OLMALI ----
     Yoksa bir gun biri "jumpscare neden yok" diye ekler ve
     sart bozulur.                                           */
  const ay6 = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/ayarlar.js", "utf8");
  for (const ad of ["glitchmanv", "anomaly_rephased", "Jumpscare", "kick @p"]) {
    kontrol("'" + ad + "' ayarlarda geciyor (alindi/alinmadi yazili)",
            ay6.indexOf(ad) >= 0);
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> efsanenin korkusu yerinde");
process.exit(hata ? 1 : 0);

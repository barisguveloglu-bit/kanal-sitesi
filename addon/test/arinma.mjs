/* ARINMA -- v7.28, disaridan gelen kilitlere karsi savunma.

   Kullanici: "biriyle vs atacagim, toolbox gibi seyler
   kullanirsa ve benden daha guclu cikarsa ne olacak? Karsi
   savunma gecir bana."

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   SOHBETTEN CAGRILABILMESI. Hareket kilidi (inputpermission
   disabled) jest yapmayi imkansiz kilar; kilidi acacak sey
   kilidin engellemedigi bir yoldan tetiklenmeli. Bu madde
   duserse savunma tam gerektigi anda ulasilamaz olur.

   Sinananlar:
     1. Sekiz kilidin SEKIZINI de geri aliyor
        (v7.35: ekran/ses/sis olculerek eklendi)
     2. Sohbet komutu olarak calisiyor ("arin", "kurtul", ...)
     3. KENDI guclendirmelerine DOKUNMUYOR (effect clear degil)
     4. Bir komut patlarsa otekiler yine calisiyor
     5. Bekleme suresi var ama bagisiklik vermiyor
     6. Kapaliyken calismiyor
     7. Oyuncu cikinca defter temizleniyor                    */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const arinma = await import("./pack/yetenekler/arinma.js");
const sohbet = await import("./pack/sohbet.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

function kur(id, efektler = []) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player";
  o._komutlar = []; o._silinen = []; o._mesaj = [];
  o._efektler = new Set(efektler);
  o.runCommand = function (k) { this._komutlar.push(k); return { successCount: 1 }; };
  o.sendMessage = function (m) { this._mesaj.push(m); };
  o.getEffect = function (ad) { return this._efektler.has(ad) ? { amplifier: 1 } : undefined; };
  o.removeEffect = function (ad) { this._silinen.push(ad); this._efektler.delete(ad); };
  D.boyut._varliklar = [o];
  _durum.oyuncular = [o];
  return { D, o };
}

const komutVar = (o, parca) => o._komutlar.some((k) => k.indexOf(parca) !== -1);

console.log("=== 1. BES KILIDIN BESI DE GERI ALINIYOR ===");
{
  const { o } = kur("a1", ["slowness", "weakness", "blindness"]);
  arinma.arindir(o);
  kontrol("girdi kilidi aciliyor (hareket)",
          komutVar(o, "inputpermission set @s movement enabled"));
  kontrol("girdi kilidi aciliyor (kamera)",
          komutVar(o, "inputpermission set @s camera enabled"));
  kontrol("kamera birakiliyor", komutVar(o, "camera @s clear"));
  kontrol("ekran sarsintisi durduruluyor", komutVar(o, "camerashake stop"));
  kontrol("kalici poz sifirlaniyor",
          komutVar(o, "playanimation @s animation.humanoid.move a 0"));
  kontrol("olumsuz efektler silindi",
          o._silinen.indexOf("slowness") !== -1 &&
          o._silinen.indexOf("weakness") !== -1 &&
          o._silinen.indexOf("blindness") !== -1,
          o._silinen.join(","));
  /* Poz sifirlama gecisi 0 olmali; 9999 olsaydi "normal"i
     kalici yapip yeni bir kilit kurmus olurduk.             */
  kontrol("poz sifirlama KALICI degil",
          !komutVar(o, "humanoid.move a 9999"));
}

console.log("=== 1b. EKRAN · SES · SIS  (v7.35) ===");
{
  /* Bu uc madde OLCUMDEN geldi, tahminden degil. Kullanicinin
     getirdigi 53 MB'lik kod arsivinde 549.798 komut satiri
     vardi ama ozgun olan 6.808 tanesiydi. Ozgunler sayilinca
     Arinma'nin ucu de tutmadigi cikti:

       /title      287 ozgun  -> ekrani "████" duvariyla kapatma
       /playsound   41 ozgun
       /music       22 ozgun  -> ses bombasi
       /fog          9 ozgun  -> fog_hell, fog_soulsand_valley

     Ucu de kendiliginden gecmiyor. Bu madde duserse arsivdeki
     359 ozgun komut yeniden karsiliksiz kalir.               */
  const { o } = kur("a1b");
  arinma.arindir(o);

  kontrol("ekran yazisi siliniyor", komutVar(o, "title @s clear"));
  /* clear TEK BASINA yetmiyor: reset olmadan bir sonraki
     title yine 99999 tick ekranda kaliyor.                  */
  kontrol("title ayarlari sifirlaniyor", komutVar(o, "title @s reset"));

  kontrol("sesler durduruluyor", komutVar(o, "stopsound @s"));
  kontrol("muzik durduruluyor", komutVar(o, "music stop"));
  /* stopsound'a ses ADI verilmemeli: adsiz hali hepsini
     durduruyor, adliysa saldiranin hangi sesi caldigini
     bilmemiz gerekirdi.                                     */
  kontrol("stopsound'a ses adi YAZILMIYOR",
          o._komutlar.some((k) => k.trim() === "stopsound @s"),
          o._komutlar.filter((k) => k.indexOf("stopsound") !== -1).join(",") || "-");

  kontrol("olculen sis kimlikleri kaldiriliyor",
          ayar.ARIN_SIS_BILINEN.every((k) => komutVar(o, "fog @s remove " + k)),
          ayar.ARIN_SIS_BILINEN.join(","));
  kontrol("ustune varsayilan sis itiliyor",
          komutVar(o, 'fog @s push "minecraft:fog_default"'));
  /* Kendi ittigimiz sis her arinmada birikmesin diye once
     kendi kimligimiz kaldiriliyor.                          */
  kontrol("once kendi sisimiz toplaniyor",
          o._komutlar.indexOf("fog @s remove " + ayar.ARIN_SIS_KIMLIK) <
          o._komutlar.findIndex((k) => k.indexOf("fog @s push") !== -1));
}

console.log("=== 1c. SAVUNMA KIPI DE UCUNU TAZELIYOR ===");
{
  /* Arinma tek seferlik. Saldiran title'i her saniye yeniden
     basiyorsa savunma kipinin de basmasi lazim. Ikisi ayri
     fonksiyon oldugu icin biri guncellenip oteki unutulabilir
     -- bu madde tam onu tutuyor.                            */
  const { o } = kur("sv-yeni");
  const sonuc = arinma.savunmaAc(o);
  kontrol("kip acilinca ekran temizleniyor", komutVar(o, "title @s clear"));
  kontrol("kip acilinca ses susturuluyor", komutVar(o, "stopsound @s"));
  kontrol("kip acilinca sis kaldiriliyor", komutVar(o, "fog @s"));

  o._komutlar = [];
  for (let i = 0; i < ayar.SAVUNMA_ARALIK * 2; i++) {
    tickIlerlet(1);
    sonuc.is.calis();
  }
  kontrol("tazelemede de ekran temizleniyor", komutVar(o, "title @s clear"));
  kontrol("tazelemede de ses susturuluyor", komutVar(o, "stopsound @s"));
  kontrol("tazelemede de sis kaldiriliyor", komutVar(o, "fog @s"));
  sonuc.is.bitir && sonuc.is.bitir();
}

console.log("");
console.log("=== 2. SOHBETTEN CAGRILABILIYOR (asil mesele) ===");
{
  const { o } = kur("a2", ["slowness"]);
  for (const kelime of ["arin", "kurtul", "serbest"]) {
    o._komutlar = [];
    const sonuc = sohbet.komutCozumle(o, kelime);
    kontrol("'" + kelime + "' komutu taniniyor",
            !!sonuc && typeof sonuc.cevap === "string",
            sonuc ? String(sonuc.cevap).slice(0, 40) : "tanimadi");
  }
  /* Komutun GERCEKTEN arindirdigini gor: kanca bagli mi. */
  const { o: o2 } = kur("a2b", ["slowness"]);
  sohbet.komutCozumle(o2, "arin");
  kontrol("sohbet komutu gercekten arindiriyor",
          komutVar(o2, "inputpermission set @s movement enabled"),
          o2._komutlar.join(" | ") || "hic komut yok");
}

console.log("");
console.log("=== 3. KENDI GUCLENDIRMELERINE DOKUNMUYOR ===");
{
  const { o } = kur("a3",
    ["slowness", "speed", "strength", "resistance", "regeneration", "absorption"]);
  arinma.arindir(o);
  /* Depodaki ders (komut_isin.mjs): kaynak listede
     "effect @p clear" vardi ve oyuncunun kendi ictigi iksiri
     de siliyordu.                                           */
  kontrol("effect clear komutu YOK", !komutVar(o, "effect") ,
          o._komutlar.filter((k) => k.indexOf("effect") !== -1).join(",") || "-");
  for (const iyi of ["speed", "strength", "resistance", "regeneration", "absorption"]) {
    kontrol(iyi + " silinmedi", o._silinen.indexOf(iyi) === -1);
  }
  kontrol("slowness silindi", o._silinen.indexOf("slowness") !== -1);
}

console.log("");
console.log("=== 4. BIR KOMUT PATLASA OTEKILER CALISIYOR ===");
{
  const { o } = kur("a4", ["slowness"]);
  o.runCommand = function (k) {
    this._komutlar.push(k);
    if (k.indexOf("camera @s clear") !== -1) throw new Error("kamera yok");
    return { successCount: 1 };
  };
  sus(); arinma.arindir(o); ac();
  kontrol("kamera patlasa da girdi acildi",
          komutVar(o, "inputpermission set @s movement enabled"));
  kontrol("kamera patlasa da poz sifirlandi",
          komutVar(o, "animation.humanoid.move a 0"));
  kontrol("kamera patlasa da efekt silindi",
          o._silinen.indexOf("slowness") !== -1);
}

console.log("");
console.log("=== 5. BEKLEME VAR AMA BAGISIKLIK DEGIL ===");
{
  const { o } = kur("a5", ["slowness"]);
  arinma.arindir(o);
  o._komutlar = [];
  const ikinci = arinma.arindir(o);
  kontrol("hemen tekrar arinilamiyor",
          /bekliyor/i.test(String(ikinci)) && o._komutlar.length === 0,
          String(ikinci));
  tickIlerlet(ayar.ARIN_BEKLEME + 1);
  o._komutlar = [];
  arinma.arindir(o);
  kontrol("bekleme dolunca yeniden arinilabiliyor",
          komutVar(o, "inputpermission set @s movement enabled"));
  /* Bekleme, kilit dongusunden cikmaya yetecek kadar KISA
     olmali. 2 saniyeden uzun olursa savunma iş görmez.      */
  kontrol("bekleme 2 saniyeden kisa",
          ayar.ARIN_BEKLEME <= 40, ayar.ARIN_BEKLEME + " tick");
}

console.log("");
console.log("=== 6. JEST SIRASINDA DA VAR ===");
{
  const tanim = kayit.yetenekAl("arinma");
  kontrol("yetenek kayitli", !!tanim);
  kontrol("esyasiz jest sirasinda", !!tanim && tanim.esyasiz === true);
  const { o } = kur("a6", ["slowness"]);
  sus(); tanim.olustur(o); ac();
  kontrol("jestten de arindiriyor",
          komutVar(o, "inputpermission set @s movement enabled"));
  kontrol("kullaniciya sonuc yaziliyor", o._mesaj.length > 0,
          o._mesaj[0] || "mesaj yok");
}

console.log("");
console.log("=== 7. AYAR VE TEMIZLIK ===");
{
  kontrol("ARIN_ACIK ayari var", typeof ayar.ARIN_ACIK === "boolean");
  const { readFileSync } = await import("node:fs");
  const kod = readFileSync(
    new URL("./pack/yetenekler/arinma.js", import.meta.url), "utf8");
  kontrol("ARIN_ACIK denetleniyor", /if \(!ARIN_ACIK\)/.test(kod));
  const ana = readFileSync(new URL("./pack/main.js", import.meta.url), "utf8");
  kontrol("playerLeave arinmaUnut cagiriyor",
          /playerLeave[\s\S]{0,4000}?arinmaUnut\(olay\.playerId\)/.test(ana));
  kontrol("sohbet kancasi baglanmis", /arindir:\s*\(oyuncu\)/.test(ana));
  const sh = readFileSync(new URL("./pack/sohbet.js", import.meta.url), "utf8");
  kontrol("yardim metninde yaziyor", /§earin§7/.test(sh));
}

console.log("");
console.log("=== 8. SAVUNMA KIPI (kilit DONGUSUNE karsi) ===");
{
  /* Arinma tek seferlik. Kilit her yarim saniyede yeniden
     kuruluyorsa elle yetisilmez -- kullanicinin sorusu tam
     buydu: "hileleri actim, o an nasil olacagiz?"           */
  const { o } = kur("sv1", ["slowness"]);
  const sonuc = arinma.savunmaAc(o);
  kontrol("kip acilinca is uretiliyor", !!sonuc.is,
          String(sonuc.mesaj).slice(0, 50));
  kontrol("acilir acilmaz bir kez tazeleniyor",
          komutVar(o, "inputpermission set @s movement enabled"));

  /* Saldirgan her tick yeniden kilitliyormus gibi: biz de
     her tick calis() cagiriyoruz ve tazelemenin ARALIK
     tickte bir gerceklestigini olcuyoruz.                  */
  o._komutlar = [];
  let tazeleme = 0;
  for (let i = 0; i < ayar.SAVUNMA_ARALIK * 4; i++) {
    tickIlerlet(1);
    const oncekiSayi = o._komutlar.length;
    sonuc.is.calis();
    if (o._komutlar.length > oncekiSayi) tazeleme++;
  }
  kontrol("kilit surekli kiriliyor", tazeleme >= 3,
          tazeleme + " tazeleme / " + (ayar.SAVUNMA_ARALIK * 4) + " tick");
  kontrol("her tick DEGIL, araliklarla", tazeleme <= 6,
          tazeleme + " tazeleme");
  /* MUTLAK SINIR. Yukaridaki madde beklentiyi ayarin
     KENDISINDEN turetiyor: SAVUNMA_ARALIK 1 yapilinca hem
     tazeleme sayisi hem beklenen sayi birlikte degisiyor ve
     madde geciyor -- mutasyon testi bunu gosterdi. Bu depoda
     kayitli hata bicimi: "olcum, olctugu seyden besleniyor".
     Burada sayi ELLE yazili: aralik 5 tickten kisa olamaz,
     yoksa saniyede dortten fazla kez dort komut calisir ve
     butceyi yer.                                            */
  kontrol("tazeleme araligi en az 5 tick",
          ayar.SAVUNMA_ARALIK >= 5, ayar.SAVUNMA_ARALIK + " tick");

  /* Ikinci kez cagirmak KAPATIYOR. */
  const kapat = arinma.savunmaAc(o);
  kontrol("ikinci cagri kipi kapatiyor", !kapat.is,
          String(kapat.mesaj).slice(0, 40));
  kontrol("kapatilinca is kendini bitiriyor", sonuc.is.calis() === true);
  sonuc.is.bitir();
  kontrol("bitince defterden dusuyor", !arinma.savunmadaMi(o.id));
}
{
  /* Sure dolunca kendi kapanmali -- unutulup acik kalmasin. */
  const { o } = kur("sv2");
  const sonuc = arinma.savunmaAc(o);
  let bitti = -1;
  for (let i = 0; i < ayar.SAVUNMA_SURE + 50; i++) {
    tickIlerlet(1);
    if (sonuc.is.calis()) { bitti = i; break; }
  }
  sonuc.is.bitir();
  kontrol("sure dolunca kendi kapaniyor", bitti >= 0, "tick " + bitti);
  kontrol("SAVUNMA_SURE kadar surdu",
          bitti >= ayar.SAVUNMA_SURE - ayar.SAVUNMA_ARALIK - 2,
          bitti + " vs " + ayar.SAVUNMA_SURE);
}
{
  /* Sohbetten de acilabilmeli, ayni sebeple: girdi
     kilitliyken jest yapilamaz.                            */
  const { o } = kur("sv3");
  const r = sohbet.komutCozumle(o, "savunma");
  kontrol("'savunma' sohbet komutu taniniyor",
          !!r && typeof r.cevap === "string",
          r ? String(r.cevap).slice(0, 40) : "tanimadi");
  kontrol("sohbetten acilinca gercekten tazeleniyor",
          komutVar(o, "inputpermission set @s movement enabled"));
  const { readFileSync } = await import("node:fs");
  const ana = readFileSync(new URL("./pack/main.js", import.meta.url), "utf8");
  /* Kendi runInterval'ini ACMAMALI -- depo kurali. */
  const kod = readFileSync(
    new URL("./pack/yetenekler/arinma.js", import.meta.url), "utf8");
  kontrol("kendi runInterval'ini acmiyor", !/runInterval/.test(kod));
  kontrol("sohbet kancasi isi merkezi listeye ekliyor",
          /savunma:\s*\(oyuncu\)[\s\S]{0,200}?isEkle\(sonuc\.is\)/.test(ana));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> arinma yerinde");
process.exit(hata ? 1 : 0);

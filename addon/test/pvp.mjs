/* OYUNCUYA VURMA (PvP) BAYRAKLARI                        v7.9.3

   ---- NEDEN BU DOSYA VAR ----
   Genel taramada 105 boolean ayar tek tek ters cevrildi. Dokuzu
   hicbir testi dusurmedi ve BESI ayni aileden cikti:

       MIZRAK_OYUNCU · SAVUR_OYUNCU · CEKME_OYUNCU
       UCURMA_OYUNCU · COKLU_OYUNCU

   Hepsi tek bir soruyu cevapliyor: "bu yetenek DIGER OYUNCULARA
   da isliyor mu?" Besi de kapatilabiliyordu ve 83 test dosyasi
   yesil yanmaya devam ediyordu. Yani cok oyunculu davranis --
   arkadasinla oynarken yeteneklerin ona islemesi -- HIC
   SINANMAMISTI.

   Bu sessiz bir bozulma bicimi: tek basina oynarken her sey
   normal gorunur, sorun ancak yaninda biri varken ortaya cikar
   ve o zaman da "bende calismiyor" diye bildirilir.

   ---- IKI YON DE KILITLENIYOR ----
   Dordu oyuncuya ISLEMELI (varsayilan acik), Coklu Simsek ise
   ISLEMEMELI (varsayilan kapali -- yildirim yagmuru arkadasini
   oldururdu). Test ikisini de sabitliyor: sadece "isliyor mu"
   diye baksaydik, Coklu Simsek'in acilmasi fark edilmezdi.   */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };
sus(); await import("./pack/main.js"); ac();
const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Kurban BASKA BIR OYUNCU. typeId'si onemli: bayraklarin
   hepsi "minecraft:player" kontrolu yapiyor.               */
function kurbanOyuncu(x, y, z) {
  return {
    id: "kurban_oyuncu", typeId: "minecraft:player", isValid: true,
    location: { x, y, z },
    _efektler: [], _itildi: null, _hasar: 0,
    addEffect(ad, sure, o) { this._efektler.push({ ad, sure, o }); return true; },
    removeEffect() { return true; },
    applyImpulse(i) { this._itildi = i; },
    applyKnockback() { this._itildi = { k: true }; },
    applyDamage(n) { this._hasar += n; return true; },
    getComponent(a) {
      if (a !== "minecraft:health") return undefined;
      return { currentValue: 20, effectiveMax: 20, setCurrentValue: () => true };
    },
    teleport() { return true; },
    getVelocity: () => ({ x: 0, y: 0, z: 0 })
  };
}

/* Yetenegi GERCEKTEN calistirir ve kurbana ne oldugunu doner.
   Isi tick tick surmek sart: bu yeteneklerin cogu ilk tick'te
   degil, tarama araliginda is goruyor.                      */
function calistir(kimlik, kurbanlar, tick = 200) {
  const D = dunyaKur();
  /* Oyuncu +x'e bakiyor; kurbanlar da o dogrultuda.
     anna.mjs dersi: koni disina konan hedef "yetenek
     calismiyor" gibi gorunur, oysa kurulum yanlistir.      */
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "saldiran"; o.typeId = "minecraft:player";
  o.sendMessage = () => {}; o.runCommand = () => true;
  o.getVelocity = () => ({ x: 0, y: 0, z: 0 });
  D.boyut._varliklar = kurbanlar;
  _durum.oyuncular = [o];
  const tanim = kayit.yetenekAl(kimlik);
  if (!tanim) return { yok: true };
  sus();
  const is = tanim.olustur(o);
  const isler = Array.isArray(is) ? is : (is ? [is] : []);
  for (let i = 0; i < tick; i++) {
    let hepsiBitti = true;
    for (const x of isler) { try { if (!x.calis()) hepsiBitti = false; } catch (e) { /* */ } }
    tickIlerlet(1);
    if (hepsiBitti && isler.length) break;
  }
  for (const x of isler) { try { if (x.bitir) x.bitir(); } catch (e) { /* */ } }
  ac();
  return { D, o, is: isler.length };
}

const dokunuldu = (k) =>
  k._efektler.length > 0 || k._itildi !== null || k._hasar > 0;

console.log("=== 1. OYUNCUYA ISLEMESI GEREKENLER ===");
/* KURBANIN YUKSEKLIGI YETENEGE GORE DEGISIYOR.

   Buz Mizragi bir MERMI: oyuncunun KAFASINDAN (y ~90,6)
   cikiyor ve carpma yaricapi 1,6 blok. Kurbani ayak hizasina
   (88,98) koydugumda mizrak tam 1,62 blok yukaridan geciyor --
   kil payi isikaliyor ve "Buz Mizragi oyuncuya islemiyor"
   goruntusu cikiyor. Kod dogru, KURULUM yanlisti.
   (anna.mjs'te bu hata bir kez yapildi; ucuncu kez olmasin.) */
for (const [kimlik, ad, bayrak, yukseklik] of [
  ["buz_mizragi", "Buz Mizragi", "MIZRAK_OYUNCU", 90.6],
  ["savur",       "Savur",       "SAVUR_OYUNCU",  88.98],
  ["cekme",       "Cekme",       "CEKME_OYUNCU",  88.98],
  ["ucurma",      "Ucurma",      "UCURMA_OYUNCU", 88.98],
  /* BUZ_OYUNCU taramanin ikinci turunda cikti: ilk turda
     mutasyon uygulanamamisti ("0 kez gecti") ve olculmeden
     kalmisti. Olculmemis bir ayari "gecti" saymak, taramanin
     kendi korlugunu gizlemek olurdu -- dordu de yeniden
     kosuldu ve bu sagkaldi.                                  */
  ["buz_adam",    "Buz Adam",    "BUZ_OYUNCU",    88.98]
]) {
  kontrol(bayrak + " ACIK (varsayilan)", ayar[bayrak] === true, String(ayar[bayrak]));
  const k = kurbanOyuncu(4.5, yukseklik, 0.5);
  const s = calistir(kimlik, [k]);
  kontrol("  " + ad + " baska bir OYUNCUYA isliyor", !s.yok && dokunuldu(k),
          s.yok ? "yetenek kayitli degil" :
          ("efekt=" + k._efektler.length + " itme=" + (k._itildi ? "var" : "yok") +
           " hasar=" + k._hasar));
}

console.log("");
console.log("=== 2. SIMSEK OYUNCUYU DA HEDEFLIYOR (v7.39) ===");
{
  /* ---- BU MADDE v7.39'DA TERS CEVRILDI ----
     Eskiden burasi "COKLU_OYUNCU KAPALI olmali" diyordu ve
     gerekcesi suydu: "yirmi yildirimlik bir yagmur yanindaki
     arkadasini oldururdu."

     Kullanici karari degistirdi -- kendi sozleriyle: "evet
     oyuncuyu da otomatik olarak hedeflesin... diger
     kollardaki simsekle alakali olan ozelliklerde de bu
     sistem olsun." Sebebi bir duello: onceki hal PvP'de nisan
     yardimini TAMAMEN islevsiz birakiyordu.

     Madde silinmedi, YONU degisti. Bayrak hala tek tek
     tutuluyor: sessizce KAPANMASI da en az acilmasi kadar
     onemli, cunku kapandigi an duelloda kimse fark etmez.

     Eski gerekce yok olmadi, yer degistirdi: "yanindakini
     vurma" endisesinin karsiligi artik 3. bolumdeki
     DOKTURUCU denetimi.                                    */
  kontrol("SIMSEK_OYUNCU_HEDEF ACIK (tek anahtar)",
          ayar.SIMSEK_OYUNCU_HEDEF === true, String(ayar.SIMSEK_OYUNCU_HEDEF));
  kontrol("COKLU_OYUNCU tek anahtara bagli",
          ayar.COKLU_OYUNCU === ayar.SIMSEK_OYUNCU_HEDEF, String(ayar.COKLU_OYUNCU));
  kontrol("BOT_SIMSEK_OYUNCU tek anahtara bagli",
          ayar.BOT_SIMSEK_OYUNCU === ayar.SIMSEK_OYUNCU_HEDEF,
          String(ayar.BOT_SIMSEK_OYUNCU));
  kontrol("ALAN_MUAF oyuncuyu ARTIK muaf tutmuyor",
          ayar.ALAN_MUAF.indexOf("minecraft:player") === -1,
          ayar.ALAN_MUAF.length + " muaf tip");
  /* MUAF'in kendisi bozulmadi -- ALAN_MUAF ondan TURETILIYOR.
     Ikisini elle ayri tutmak, birini guncellemeyi unutmanin
     kisa yoludur.                                          */
  kontrol("MUAF listesi bozulmadi (ALAN_MUAF ondan turuyor)",
          ayar.MUAF.indexOf("minecraft:player") !== -1);

  /* Coklu Simsek kurbana DOGRUDAN dokunmuyor: hedefin
     KONUMUNA yildirim dusuruyor. Bu yuzden "efekt/itme/hasar
     var mi" diye bakmak yetmiyor -- dogru olcum: oyuncunun
     DIBINE yildirim dustu mu?                              */
  const k = kurbanOyuncu(12.5, 88.98, 0.5);   // COKLU_EN_YAKIN'in otesi
  const s = calistir("coklu_simsek", [k]);
  const yakinYildirim = (s.D ? s.D.sayac.dogan : []).filter(
    (d) => d.tip === "minecraft:lightning_bolt" &&
           Math.hypot(d.x - k.location.x, d.z - k.location.z) < 1.0).length;
  kontrol("  Coklu Simsek OYUNCUNUN dibine yildirim dusuruyor",
          !s.yok && yakinYildirim > 0,
          "oyuncunun dibine dusen yildirim=" + yakinYildirim);
  /* MOBA da isliyor olmali -- yoksa "oyuncuya isliyor" sonucu
     yetenegin ayrim yapmayi tamamen birakmasindan gelebilirdi. */
  const mob = kurbanOyuncu(12.5, 88.98, 0.5);
  mob.typeId = "minecraft:zombie"; mob.id = "kurban_mob";
  const s2 = calistir("coklu_simsek", [mob]);
  const mobYildirim = (s2.D ? s2.D.sayac.dogan : []).filter(
    (d) => d.tip === "minecraft:lightning_bolt" &&
           Math.hypot(d.x - mob.location.x, d.z - mob.location.z) < 1.0).length;
  kontrol("  MOBUN dibine de dusuyor", mobYildirim > 0,
          "mobun dibine dusen yildirim=" + mobYildirim);
  /* COKLU_EN_YAKIN payi hala duruyor: cok yakindakini vurmuyor.
     Bu, dokturucunun kendi yildiriminin alan hasarindan
     yanmamasini saglayan tek sey.                          */
  const yakinKurban = kurbanOyuncu(1.5, 88.98, 0.5);   // EN_YAKIN'in icinde
  const s3 = calistir("coklu_simsek", [yakinKurban]);
  const cokYakin = (s3.D ? s3.D.sayac.dogan : []).filter(
    (d) => d.tip === "minecraft:lightning_bolt" &&
           Math.hypot(d.x - yakinKurban.location.x,
                      d.z - yakinKurban.location.z) < 1.0).length;
  kontrol("  ama COKLU_EN_YAKIN icindekini hala vurmuyor",
          cokYakin === 0, "cok yakina dusen yildirim=" + cokYakin);
}

console.log("");
console.log("=== 2b. YON SIMSEGI RAKIBE KILITLENIYOR MU ===");
{
  /* ---- ASIL BULUNAN HATA BUYDU ----
     yildirim.js kilitliHedef'i cagiriyordu ama oyuncuDahil'i
     HIC GECMIYORDU. koniHedefleri oyunculari varsayilan olarak
     atladigi icin kilit duelloda rakibe takilmiyordu: yildirim
     sadece "baktigin noktaya" dusuyordu.

     Olcum kilidin KENDISINE bakiyor, yildirimin dustugu yere
     degil -- kilit tutmasa da yildirim yine dusecegi icin
     "yildirim dustu mu" sorusu bu hatayi GORMEZDI. Zaten bu
     yuzden yillarca fark edilmemis.                        */
  const D = dunyaKur();
  const yardim = await import("./pack/yardimcilar.js");
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "nisanci"; o.typeId = "minecraft:player";

  const rakip = kurbanOyuncu(10.5, 89, 0.5);
  rakip.id = "rakip";
  D.boyut._varliklar = [rakip];

  const kilitsiz = yardim.kilitliHedef(o, {
    menzil: ayar.KILIT_MENZIL, aci: ayar.KILIT_ACI });
  kontrol("oyuncuDahil GECILMEZSE rakip bulunmuyor (eski hal)",
          kilitsiz === undefined, kilitsiz ? kilitsiz.id : "yok");

  const kilitli = yardim.kilitliHedef(o, {
    menzil: ayar.KILIT_MENZIL, aci: ayar.KILIT_ACI, oyuncuDahil: true });
  kontrol("oyuncuDahil ile rakibe kilitleniyor",
          kilitli !== undefined && kilitli.id === "rakip",
          kilitli ? kilitli.id : "yok");

  /* Yetenegin KENDISI o secenegi geciyor mu? Yukaridaki iki
     madde yardimcinin dogru calistigini gosteriyor ama
     yildirim.js onu cagirmasaydi ikisi de gecerdi.         */
  const { readFileSync } = await import("node:fs");
  const kod = readFileSync(new URL("./pack/yetenekler/yildirim.js",
                                   import.meta.url), "utf8");
  kontrol("yildirim.js kilide oyuncuDahil GECIYOR",
          /kilitliHedef\([\s\S]{0,200}?oyuncuDahil:\s*SIMSEK_OYUNCU_HEDEF/.test(kod));
  const botKod = readFileSync(new URL("./pack/yetenekler/bot_guc.js",
                                      import.meta.url), "utf8");
  kontrol("bot_guc.js kilide oyuncuDahil GECIYOR",
          /kilitliHedef\([\s\S]{0,200}?oyuncuDahil:\s*SIMSEK_OYUNCU_HEDEF/.test(botKod));
}

console.log("");
console.log("=== 2c. NISAN ACIYA GORE SECILIYOR ===");
{
  /* Duelloda yasanan durum: rakibe nisan almissin, araya bir
     tavuk giriyor. Tavuk daha YAKIN oldugu icin eski kod
     kilidi ona veriyordu -- oysa nisangahin uzerinde rakip var.

     Dogru olcu mesafe degil ACI.                            */
  const D = dunyaKur();
  const yardim = await import("./pack/yardimcilar.js");
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "nisanci2"; o.typeId = "minecraft:player";

  /* Tavuk YAKIN ama koninin kenarinda; rakip UZAK ama tam
     nisangahin uzerinde (bakis +x, z sapmasi yok).

     ---- YUKSEKLIK: ILK KURULUM YANLISTI ----
     Ikisi de once y=90,6'ya (goz hizasi) konmustu. Ama
     koniHedefleri merkezi oyuncunun AYAK konumundan (88,98)
     aliyor, yani 1,62 birimlik bir dy giriyor: tavugun
     kosinusu 0,937'den 0,873'e dusuyor ve koninin DISINA
     cikiyor. O zaman "mesafeye gore tavuk secilir" maddesi
     duser -- kod yuzunden degil, kurulum yuzunden.
     Bu dosyanin kendi uyardigi hata (anna.mjs dersi) burada
     bir kez daha yasandi. Ikisi de ayak hizasina alindi.   */
  const tavuk = kurbanOyuncu(4.5, 88.98, 2.0);
  tavuk.id = "tavuk"; tavuk.typeId = "minecraft:chicken";
  const rakip = kurbanOyuncu(12.5, 88.98, 0.5);
  rakip.id = "rakip2";
  D.boyut._varliklar = [tavuk, rakip];

  const aciya = yardim.kilitliHedef(o, {
    menzil: ayar.KILIT_MENZIL, aci: ayar.KILIT_ACI,
    oyuncuDahil: true, aciyaGore: true });
  kontrol("aciya gore: nisangahtaki RAKIP seciliyor",
          aciya && aciya.id === "rakip2", aciya ? aciya.id : "yok");

  const mesafeye = yardim.kilitliHedef(o, {
    menzil: ayar.KILIT_MENZIL, aci: ayar.KILIT_ACI,
    oyuncuDahil: true, aciyaGore: false });
  kontrol("mesafeye gore: yakindaki TAVUK seciliyor (eski hal)",
          mesafeye && mesafeye.id === "tavuk", mesafeye ? mesafeye.id : "yok");

  kontrol("varsayilan ACIYA GORE", ayar.KILIT_ACIYA_GORE === true,
          String(ayar.KILIT_ACIYA_GORE));
}

console.log("");
console.log("=== 2d. ALAN SIMSEGI: RAKIBI VURUR, SENI VURMAZ ===");
{
  /* ---- BU MADDE BIR TEHLIKENIN KAYDI ----
     Oyuncu hedef sayilir sayilmaz Alan Simsegi KENDI
     dokturucusunu de vurmaya baslardi: getEntities yaricaptaki
     her seyi verir ve dokturucu tam merkezdedir. Kimlik
     denetimi olmadan bu yetenek bir intihar tusuydu.        */
  const rakip = kurbanOyuncu(8.5, 88.98, 0.5);
  rakip.id = "alan_rakip";
  const s = calistir("alan_simsegi", [rakip]);
  const dusenler = (s.D ? s.D.sayac.dogan : []).filter(
    (d) => d.tip === "minecraft:lightning_bolt");
  const rakibeDusen = dusenler.filter(
    (d) => Math.hypot(d.x - rakip.location.x, d.z - rakip.location.z) < 1.0).length;
  kontrol("Alan Simsegi RAKIBI vuruyor", !s.yok && rakibeDusen > 0,
          "rakibe dusen=" + rakibeDusen);

  /* Dokturucu listeye KONULUYOR: gercek getEntities onu zaten
     dondururdu. Sahte dunyada elle koymazsak "vurmuyor"
     sonucu kodun dogrulugundan degil, kurulumun eksikliginden
     gelirdi -- anna.mjs dersi.                              */
  const D2 = dunyaKur();
  const ben = oyuncuKur(D2.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  ben.id = "saldiran"; ben.typeId = "minecraft:player";
  ben.sendMessage = () => {}; ben.runCommand = () => true;
  const rakip2 = kurbanOyuncu(8.5, 88.98, 0.5);
  rakip2.id = "alan_rakip2";
  /* Dokturucunun KENDISI de yaricapta -- gercek oyundaki hal. */
  D2.boyut._varliklar = [rakip2, { id: "saldiran", typeId: "minecraft:player",
                                   isValid: true, location: { x: 0.5, y: 88.98, z: 0.5 } }];
  _durum.oyuncular = [ben];
  const tanim = kayit.yetenekAl("alan_simsegi");
  sus();
  const is = tanim.olustur(ben);
  for (let i = 0; i < 200 && is; i++) { try { if (is.calis()) break; } catch (e) { /* */ } tickIlerlet(1); }
  if (is && is.bitir) { try { is.bitir(); } catch (e) { /* */ } }
  ac();
  const kendine = D2.sayac.dogan.filter(
    (d) => d.tip === "minecraft:lightning_bolt" &&
           Math.hypot(d.x - 0.5, d.z - 0.5) < 1.0).length;
  kontrol("Alan Simsegi DOKTURUCUYU vurmuyor", kendine === 0,
          "kendine dusen=" + kendine);
  const otekine = D2.sayac.dogan.filter(
    (d) => d.tip === "minecraft:lightning_bolt" &&
           Math.hypot(d.x - 8.5, d.z - 0.5) < 1.0).length;
  kontrol("  ama rakibe yine dusuyor (yetenek gercekten calisti)",
          otekine > 0, "rakibe dusen=" + otekine);
}

console.log("");
console.log("=== 3. KONSEY: SISTEM GERCEKTEN CALISIYOR MU ===");
{
  /* Genel taramada KONSEY_ACIK'i false yaptim ve HICBIR test
     dusmedi. Sebebi konsey.mjs'in yalnizca DOSYALARA bakmasi:
     tablo, ikon, doku, ad alani... Ama konseyTara() -- yani
     "Konsey parcasi takinca gorunmez olma" davranisi -- hic
     calistirilmiyordu. Yani butun alt sistem tek satirla
     kapatilabiliyor ve takim yesil yanmaya devam ediyordu.  */
  const konsey = await import("./pack/yetenekler/konsey.js");
  kontrol("KONSEY_ACIK (varsayilan)", ayar.KONSEY_ACIK === true,
          String(ayar.KONSEY_ACIK));

  const [parca, yuva] = [...ayar.KONSEY_GORUNMEZ.entries()][0];
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "konseyci"; o.typeId = "minecraft:player";
  o._efektler = [];
  o.addEffect = (ad, sure, se) => { o._efektler.push({ ad, sure, se }); return true; };
  o.getComponent = (a) => a === "minecraft:equippable"
    ? { getEquipment: (s) => (s === yuva ? { typeId: "pa:" + parca } : undefined) }
    : undefined;
  konsey.konseyUnut();
  sus(); konsey.konseyTara([o]); ac();
  const gorunmez = o._efektler.filter((e) => e.ad === "invisibility");
  kontrol("Konsey parcasi takili -> GORUNMEZ oluyor", gorunmez.length === 1,
          parca + " (" + yuva + ") -> " + o._efektler.map((e) => e.ad).join(", "));
  /* Parcacik KAPALI olmali: acikken oyuncu parcacik bulutuna
     donuyor ve kostumun kendisi gorunmez oluyor (zirh ve
     Ben 10 tablolarinda ogrenilen ders).                    */
  kontrol("  parcacik KAPALI (kostum kaybolmasin)",
          gorunmez.length === 1 && gorunmez[0].se &&
          gorunmez[0].se.showParticles === false);

  /* Parca TAKILI DEGILKEN gorunmez OLMAMALI -- yoksa
     yukaridaki sonuc "her zaman gorunmez yapiyor"dan da
     gelebilirdi.                                            */
  const o2 = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o2.id = "sivil"; o2.typeId = "minecraft:player"; o2._efektler = [];
  o2.addEffect = (ad, sure, se) => { o2._efektler.push({ ad, sure, se }); return true; };
  o2.getComponent = (a) => a === "minecraft:equippable"
    ? { getEquipment: () => undefined } : undefined;
  konsey.konseyUnut();
  sus(); konsey.konseyTara([o2]); ac();
  kontrol("  parca YOKKEN gorunmez OLMUYOR",
          o2._efektler.filter((e) => e.ad === "invisibility").length === 0,
          o2._efektler.length + " efekt");
}

console.log("");
console.log(hata ? "BAZI SINAMALAR KALDI" : "hepsi gecti");
process.exit(hata ? 1 : 0);

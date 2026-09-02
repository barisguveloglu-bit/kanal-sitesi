const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
/* BOT -- ASAMA 1 (v4.22): var olsun, takip etsin, beklesin

   Bedrock'ta YOL BULMA API'SI YOK: script'ten "su koordinata
   yuru" denemiyor. O yuzden is bolundu:
     yurumeyi  vanilla AI yapiyor (behavior.follow_owner)
     kurtarmayi script yapiyor (cok uzaklasinca isinlanma)

   follow_owner bir SAHIP ister, sahip tameable.tame() ile
   atanir. O cagri her surumde ayni degil, o yuzden iki yol var
   ve ikisi de burada sinaniyor:
     tame() tuttu   -> 24 blokta kurtarma
     tutmadi        -> 8 blokta script takibi                  */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import {
  tickIlerlet, esyaKaydet, varlikKaydet, _durum, sohbetTetikle, world
} from "@minecraft/server";

varlikKaydet("pa:bot");

/* Bot isleri vanilla esyalar uretiyor; sahte dunyada esya
   kayit defterine girmeyen bir kimlik ItemStack kurucusunda
   patliyor (gercek oyunda da oyle). Isin sinanmasi icin
   kullanilan vanilla esyalar kaydediliyor.                    */
esyaKaydet(
  "minecraft:oak_log", "minecraft:raw_iron", "minecraft:diamond",
  "minecraft:coal", "minecraft:raw_copper", "minecraft:redstone"
);

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const defter = await import("./pack/yetenekler/_bot_defteri.js");
const { yetenekAl } = await import("./pack/yetenekler/kayit.js");

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
const uzaklastir = (o, n) => { o.location = { x: BAS.x + n, y: BAS.y - 1.62, z: BAS.z }; };

/* Isi elle surer. Gercek oyunda merkezi tick yoneticisi yapiyor
   (butceSifirla + calis + bitir); testte o dongu yok, o yuzden
   burada taklit ediliyor. lazer.mjs'teki kalibin aynisi.       */
const { butceSifirla } = await import("./pack/butce.js");
function isiCalistir(is, tick = 100) {
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

console.log("=== 1. BOT DOGUYOR ===");
{
  temizle();
  const { D, o } = kur("b1");
  const sonuc = cagir(o);

  kontrol("hata yok", !sonuc.hata, sonuc.hata || "-");
  kontrol("bot dogdu", sonuc.dogdu === true);

  const bot = botu(D);
  kontrol("varlik dunyada", bot !== undefined, bot ? bot.typeId : "yok");
  kontrol("defterde kayitli", defter.botAl("b1") !== undefined);
  kontrol("bot oyuncunun DIBINE degil YANINA dogdu",
          bot && Math.hypot(bot.location.x - BAS.x, bot.location.z - BAS.z) > 1,
          bot ? "uzaklik " +
            Math.hypot(bot.location.x - BAS.x, bot.location.z - BAS.z).toFixed(1) : "-");
}

console.log("");
console.log("=== 2. SAHIPLIK IKI YERE BIRDEN YAZILIYOR ===");
{
  temizle();
  const { D, o } = kur("b2");
  cagir(o);
  const bot = botu(D);

  /* Dunya kaydi silinse bile bot sahibini TASIYOR: dokununca
     kendini yeniden baglayabilsin diye.                        */
  kontrol("varligin kendi ozelliginde sahip var",
          defter.botunSahibi(bot) === "b2", String(defter.botunSahibi(bot)));
  kontrol("dunya ozelligine de yazildi",
          typeof _durum.ozellikler.get(ayar.BOT_KAYIT_ANAHTAR) === "string");

  kontrol("evcillestirildi (follow_owner icin SART)",
          bot._evcilSahip === "b2", String(bot._evcilSahip));
  kontrol("takip olayi tetiklendi",
          bot._olaylar.includes(ayar.BOT_OLAY_TAKIP), bot._olaylar.join(", "));
}

console.log("");
console.log("=== 3. SCRIPT YENIDEN YUKLENINCE KAYITTAN OKUNUYOR ===");
{
  temizle();
  const { D, o } = kur("b3");
  cagir(o);
  const botId = defter.botAl("b3").botId;

  defter.defteriUnut();          // bellek sifir, kayit duruyor
  sus();
  const geri = defter.botAl("b3");
  ac();
  kontrol("bot kayittan geri geldi", geri !== undefined && geri.botId === botId,
          geri ? geri.botId : "yok");
  kontrol("durumu da korundu", geri && geri.durum === "takip", geri && geri.durum);
}

console.log("");
console.log("=== 4. KURTARMA ISINLANMASI ===");
{
  temizle();
  const { D, o } = kur("b4");
  cagir(o);
  const bot = botu(D);
  const oncekiIsinlanma = bot._isinlanma.length;

  // Yakinken karisilmamali: vanilla AI yurusun
  uzaklastir(o, 5);
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); ac();
  kontrol("yakinken isinlanmadi (vanilla AI'ya birakildi)",
          bot._isinlanma.length === oncekiIsinlanma,
          bot._isinlanma.length - oncekiIsinlanma + " isinlanma");

  // Cok uzaklasinca kurtarilmali
  uzaklastir(o, ayar.BOT_KURTARMA_MENZIL + 10);
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); ac();
  kontrol("cok uzaklasinca kurtarildi",
          bot._isinlanma.length > oncekiIsinlanma,
          bot._isinlanma.length + " isinlanma");

  const son = bot._isinlanma[bot._isinlanma.length - 1];
  kontrol("oyuncunun yanina isinlandi",
          son && Math.abs(son.x - o.location.x) < ayar.BOT_CAGIR_YAKIN + 1,
          son ? "x=" + son.x.toFixed(1) + " (oyuncu " + o.location.x.toFixed(1) + ")" : "-");
}

console.log("");
console.log("=== 5. BEKLE: DUR DEDIYSEK DURUYOR ===");
{
  temizle();
  const { D, o } = kur("b5");
  cagir(o);
  const bot = botu(D);

  sus(); defter.botDurum(o, "bekle"); ac();
  kontrol("bekle olayi tetiklendi",
          bot._olaylar.includes(ayar.BOT_OLAY_BEKLE), bot._olaylar.join(", "));
  kontrol("defterde durum bekle", defter.botAl("b5").durum === "bekle");

  /* KRITIK: bekle durumundayken kurtarma da OLMAMALI. Yoksa
     "burada bekle" dedigin bot pesinden isinlanir -- komutun
     tam tersi.                                                 */
  const once = bot._isinlanma.length;
  uzaklastir(o, ayar.BOT_KURTARMA_MENZIL + 50);
  sus(); tickIlerlet(ayar.BOT_TARAMA * 3); ac();
  kontrol("beklerken kurtarma da YOK (dur dedik, duracak)",
          bot._isinlanma.length === once,
          bot._isinlanma.length - once + " isinlanma");

  sus(); defter.botDurum(o, "takip"); ac();
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); ac();
  kontrol("takibe donunce kurtarildi", bot._isinlanma.length > once);
}

console.log("");
console.log("=== 6. TAME() YOKKEN SCRIPT TAKIBI ===");
{
  /* Bu yolun calismasi SART: tameable.tame() bu API surumunde
     yoksa vanilla follow_owner hic baglanmaz ve botun yaninda
     kalmasinin tek yolu script olur. Esik de daha kucuk.      */
  temizle();
  const { D, o } = kur("b6");
  D.boyut._tameYok = true;          // getComponent("tameable") undefined donsun
  cagir(o);
  const bot = botu(D);

  kontrol("evcillestirilemedi", bot._evcilSahip === undefined);
  kontrol("bot yine de dogdu", bot !== undefined);

  const once = bot._isinlanma.length;
  // Vanilla esigin (24) ALTINDA ama script esiginin (8) ustunde
  uzaklastir(o, ayar.BOT_SCRIPT_MENZIL + 4);
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); ac();
  kontrol("script esiginde (" + ayar.BOT_SCRIPT_MENZIL + " blok) takip etti",
          bot._isinlanma.length > once,
          (bot._isinlanma.length - once) + " isinlanma");
}

console.log("");
console.log("=== 7. COKLU BOT: TAVANA KADAR EKLER, SONRA GETIRIR (v4.27) ===");
{
  temizle();
  const { D, o } = kur("b7");

  cagir(o); cagir(o); cagir(o);
  kontrol("her cagirmada bir bot EKLENDI", defter.botSayisi("b7") === 3,
          defter.botSayisi("b7") + " bot");
  kontrol("dunyada da uc bot var",
          D.sayac.varliklar.filter((v) => v.typeId === "pa:bot" && v.isValid).length === 3);

  /* Yirmi bot ayni noktaya dogarsa ust uste binip birbirini
     iter; tabletin fizigi bosuna calisir.                     */
  const yerler = D.sayac.varliklar
    .filter((v) => v.typeId === "pa:bot" && v.isValid)
    .map((v) => v.location.x.toFixed(2) + "," + v.location.z.toFixed(2));
  kontrol("botlar ayni noktaya UST USTE dogmadi",
          new Set(yerler).size === 3, yerler.join(" | "));

  // Tavana kadar doldur
  temizle();
  const { D: D2, o: o2 } = kur("b7b");
  for (let i = 0; i < ayar.BOT_TAVAN + 3; i++) cagir(o2);
  kontrol("tavan asilmadi", defter.botSayisi("b7b") === ayar.BOT_TAVAN,
          defter.botSayisi("b7b") + " / " + ayar.BOT_TAVAN);

  const bot = botu(D2);
  const once = bot._isinlanma.length;
  uzaklastir(o2, 40);
  const sonuc = cagir(o2);
  kontrol("tavandayken yenisi DOGMADI, olanlar getirildi",
          sonuc.tavan === true, JSON.stringify(sonuc));
  kontrol("gercekten isinlandi", bot._isinlanma.length > once);
}

console.log("");
console.log("=== 8. HEPSINI GERI GONDERME ===");
{
  temizle();
  const { D, o } = kur("b8");
  cagir(o); cagir(o); cagir(o);
  const botlar = D.sayac.varliklar.filter((v) => v.typeId === "pa:bot");

  sus(); const silinen = defter.botGeri(o); ac();
  kontrol("kac tane silindigi bildirildi", silinen === 3, String(silinen));
  kontrol("varliklarin HEPSI kaldirildi",
          botlar.every((v) => v._kaldirildi === true));
  kontrol("defterden dustu", defter.botSayisi("b8") === 0);
  kontrol("dunya kaydindan da dustu",
          _durum.ozellikler.get(ayar.BOT_KAYIT_ANAHTAR) === undefined,
          String(_durum.ozellikler.get(ayar.BOT_KAYIT_ANAHTAR)));

  sus(); const tekrar = defter.botGeri(o); ac();
  kontrol("botu yokken geri gondermek sorun cikarmadi", tekrar === 0);
}

console.log("");
console.log("=== 9. TICK MALIYETI ===");
{
  temizle();
  kontrol("bot yokken defter bos", defter.botVarMi() === false);
  const { o } = kur("b9");
  cagir(o);
  kontrol("bot alininca tarama aciliyor", defter.botVarMi() === true);
}

console.log("");
console.log("=== 10. SOHBET KOMUTLARI ===");
{
  temizle();
  const { D, o } = kur("b10");

  sus(); sohbetTetikle(o, "bot"); tickIlerlet(ayar.KOL_GECIKME + 5); ac();
  kontrol("'bot' botu cagirdi", defter.botAl("b10") !== undefined);

  sus(); sohbetTetikle(o, "bot bekle"); ac();
  kontrol("'bot bekle' calisti", defter.botAl("b10").durum === "bekle");

  sus(); sohbetTetikle(o, "bot takip"); ac();
  kontrol("'bot takip' calisti", defter.botAl("b10").durum === "takip");

  sus(); sohbetTetikle(o, "bot zirva"); ac();
  const son = o._mesajlar[o._mesajlar.length - 1] || "";
  kontrol("tanimsiz alt komut uyardi", /bot komutu/.test(son), son);

  sus(); sohbetTetikle(o, "bot geri"); tickIlerlet(ayar.KOL_GECIKME + 5); ac();
  kontrol("'bot geri' botlari gonderdi", defter.botSayisi("b10") === 0);
}

console.log("");
console.log("=== 11. KAYIT VE AYAR ===");
{
  kontrol("BOT_ACIK", ayar.BOT_ACIK === true);
  for (const y of ["bot_cagir", "bot_geri"]) {
    kontrol(y + " kayitli", yetenekAl(y) !== undefined);
  }

  /* Kol YAPILMADI: "her seyi kol yapma" kurali. Bot sohbetten
     ve bota dokunarak yonetiliyor.                             */
  const kollar = await import("./pack/yetenekler/kollar.js");
  kontrol("bot icin AYRI KOL yapilmadi",
          !kollar.KOL_ESYALARI.some((s) => s[0] === "pa:kol_bot"),
          kollar.KOL_ESYALARI.length + " kol");

  /* Varlik JSON'undaki olay adlari script'tekiyle ayni olmali;
     farkli olsa triggerEvent sessizce hicbir sey yapmaz.       */
  const { readFileSync } = await import("node:fs");
  const varlik = JSON.parse(readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/entities/bot.json", "utf8"));
  const olaylar = Object.keys(varlik["minecraft:entity"].events);
  kontrol("JSON'da " + ayar.BOT_OLAY_TAKIP + " olayi var",
          olaylar.includes(ayar.BOT_OLAY_TAKIP), olaylar.join(", "));
  kontrol("JSON'da " + ayar.BOT_OLAY_BEKLE + " olayi var",
          olaylar.includes(ayar.BOT_OLAY_BEKLE));
  kontrol("JSON kimligi ayarla ayni",
          varlik["minecraft:entity"].description.identifier === ayar.BOT_KIMLIK);

  /* Yol bulmayi ACAN bilesen. Bu olmadan follow_owner yurumez. */
  const bilesenler = Object.keys(varlik["minecraft:entity"].components);
  kontrol("navigation.walk var (yol bulmayi acan bilesen)",
          bilesenler.includes("minecraft:navigation.walk"));
  kontrol("follow_owner var", bilesenler.includes("minecraft:behavior.follow_owner"));
  kontrol("persistent var (chunk bosalinca silinmesin)",
          bilesenler.includes("minecraft:persistent"));
}

console.log("");
console.log("=== 12. SOHBET YOKKEN DE ULASILABILIYOR (v4.23) ===");
{
  /* Oyunda sohbet komutlari CALISMADI: world.beforeEvents.chatSend
     kararli API'de yok, "Beta APIs" deneysel ayarini istiyor.
     Kullanici dort kez "bot" yazdi, mesaj sohbete duz metin
     olarak dustu.

     Bu yuzden botun sohbete BAGLI OLMAYAN bir yolu olmali.     */
  const sohbetModul = await import("./pack/sohbet.js");
  kontrol("sohbetin calisip calismadigi disari aciliyor",
          typeof sohbetModul.sohbetCalisiyorMu === "function");
  kontrol("acikken yardim'a yonlendiriyor",
          /yardim/i.test(sohbetModul.sohbetDurumMesaji() || ""),
          sohbetModul.sohbetDurumMesaji());

  /* chatSend olmayan surumu taklit et: stub olayi gizliyor,
     sohbetKur yeniden calisiyor ve kendini kapali buluyor.    */
  _durum.chatSendYok = true;
  sus(); sohbetModul.sohbetKur(); ac();
  kontrol("kapaliyken kendini kapali sayiyor",
          sohbetModul.sohbetCalisiyorMu() === false);
  kontrol("kapaliyken oyuncuya BASKA YOL soyleniyor",
          /menu|scriptevent/i.test(sohbetModul.sohbetDurumMesaji() || ""),
          sohbetModul.sohbetDurumMesaji());
  _durum.chatSendYok = false;
  sus(); sohbetModul.sohbetKur(); ac();

  /* Menu ekleri main.js'te; disari acilmadigi icin dogrudan
     cagrilamiyor. Onun yerine menunun kullandigi ISLEVLERIN
     sohbetten bagimsiz oldugu sinaniyor -- menuEkleri bunlari
     cagiriyor.                                                 */
  temizle();
  const { D, o } = kur("b12");
  sus(); yetenekAl("bot_cagir").olustur(o); ac();
  kontrol("bot_cagir sohbetsiz calisti", defter.botAl("b12") !== undefined);

  sus(); defter.botDurum(o, "bekle"); ac();
  kontrol("botDurum sohbetsiz calisti", defter.botAl("b12").durum === "bekle");

  sus(); const s2 = defter.botGeri(o); ac();
  kontrol("botGeri sohbetsiz calisti", s2 === 1, String(s2));
}

console.log("");
console.log("=== 13. BETA API BILDIRIMI (v4.24) ===");
{
  /* Kullanici dunya ayarlarindan "Beta API'ler"i acti. Ayardaki
     aciklama: "Eklenti paketlerinde API modullerinin '-beta'
     surumlerini kullanin" -- yani anahtari acmak TEK BASINA
     yetmiyor, manifest'in de beta istemesi lazim.

     Bu iki taraf sessizce ayrisabilir: biri beta olur digeri
     olmaz ve sebebi anlasilmaz. Burada baglaniyorlar.          */
  const { readFileSync } = await import("node:fs");
  const man = JSON.parse(readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/manifest.json", "utf8"));
  const sunucu = man.dependencies.find((d) => d.module_name === "@minecraft/server");
  const arayuz = man.dependencies.find((d) => d.module_name === "@minecraft/server-ui");

  /* v4.24'te beta denendi ve OYUNDA HICBIR SEY CALISMADI --
     istenen beta surumu o yapida bulunmayinca script modulu hic
     yuklenmiyor ve paketin TAMAMI oluyor. v4.26'da kararliya
     donuldu.

     Test "beta olsun" demiyor; MANIFEST ile KODUN ayni seyi
     soylemesini istiyor. Ikisi ayrisirsa paket ya oler ya da
     olmayan bir ozelligi vaat eder.                            */
  const betaIstiyor = /-beta$/.test(sunucu.version);
  kontrol("manifest ile BETA_GEREKLI ayni seyi soyluyor",
          betaIstiyor === ayar.BETA_GEREKLI,
          "manifest " + sunucu.version + " / BETA_GEREKLI " + ayar.BETA_GEREKLI);
  kontrol("su an KARARLI surum isteniyor (v4.24 dersi)",
          !betaIstiyor, sunucu.version);

  /* server-ui BILEREK kararli: menu artik ana arayuz, onu da
     beta yuzeyine tasimanin faydasi yok, riski var.            */
  kontrol("server-ui KARARLI birakildi (menu ana arayuz)",
          !/-beta$/.test(arayuz.version), arayuz.version);

  /* v7.10: karsilastirma TAM olmali. Onceden sondaki ".0"
     kirpiliyordu (surum elle yazilirken "7.9.0" manifest'e,
     "v7.9" ayarlar'a yaziliyordu). v7.9.8'de tek kaynaga
     gecildi: SURUM_ETIKET her zaman UC sayiyi tasiyor. Kirpma
     kaldi ve ilk x.y.0 surumunde (7.10.0) manifest "v7.10"a
     donusup ayardaki "v7.10.0" ile tutmadi. Kirpmak zaten
     yanlisti: 7.10.0 ile 7.1 ayni metne inebiliyordu.        */
  kontrol("manifest surumu ayarlardaki SURUM ile ayni",
          "v" + man.header.version.join(".") === ayar.SURUM,
          "manifest " + man.header.version.join(".") + " / ayar " + ayar.SURUM);
}

console.log("");
console.log("=== 14. ASAMA 2: ODUN TOPLAMA (v4.27) ===");
{
  temizle();
  const { D, o } = kur("bo1");
  cagir(o);
  const bot = botu(D);

  /* Botun yanina bir agac dik: 5 kutukluk govde.
     Bot kendi etrafini isliyor (yol bulma API'si yok), o yuzden
     agac BOTUN yanina konuyor.                                */
  const bk = bot.location;
  const gx = Math.floor(bk.x) + 2, gz = Math.floor(bk.z);
  const gy = Math.floor(bk.y);
  for (let i = 0; i < 5; i++) {
    D.boyut.getBlock({ x: gx, y: gy + i, z: gz }).setType("minecraft:oak_log");
  }
  // Yaprak: DOKUNULMAMALI
  D.boyut.getBlock({ x: gx + 1, y: gy + 5, z: gz }).setType("minecraft:oak_leaves");

  const oncekiEnvanter = o._envanter.length;
  sus(); const is = yetenekAl("bot_odun").olustur(o); ac();
  isiCalistir(is, 200);

  let kalanKutuk = 0;
  for (let i = 0; i < 5; i++) {
    if (D.boyut.getBlock({ x: gx, y: gy + i, z: gz }).typeId === "minecraft:oak_log") {
      kalanKutuk++;
    }
  }
  kontrol("govdenin TAMAMI kesildi (tirmanma calisti)", kalanKutuk === 0,
          kalanKutuk + " kutuk kaldi");

  /* v4.28: esya once EKIP CANTASINA giriyor, is bitince
     otomatik teslim ediliyor. bitir() isiCalistir icinde
     cagrildi, yani teslim de olmus olmali.                    */
  kontrol("odun sahibin envanterine TESLIM edildi",
          o._envanter.length > oncekiEnvanter,
          (o._envanter.length - oncekiEnvanter) + " esya");
  kontrol("dogru esya verildi (kutuk = kendi esyasi)",
          o._envanter.includes("minecraft:oak_log"),
          o._envanter.slice(-3).join(", "));
  kontrol("teslimden sonra canta bosaldi",
          defter.cantaDolulugu("bo1") === 0,
          defter.cantaDolulugu("bo1") + " parca");

  /* Yaprak hedefte degil: agaci kel birakmiyoruz.            */
  kontrol("yapraga DOKUNULMADI",
          D.boyut.getBlock({ x: gx + 1, y: gy + 5, z: gz }).typeId
            === "minecraft:oak_leaves");
}

console.log("");
console.log("=== 15. ASAMA 2: MADEN KAZMA ===");
{
  temizle();
  const { D, o } = kur("bm1");
  cagir(o);
  const bot = botu(D);
  const bk = bot.location;
  const mx = Math.floor(bk.x), mz = Math.floor(bk.z), my = Math.floor(bk.y) - 2;

  D.boyut.getBlock({ x: mx + 1, y: my, z: mz }).setType("minecraft:iron_ore");
  D.boyut.getBlock({ x: mx + 2, y: my, z: mz }).setType("minecraft:deepslate_diamond_ore");
  D.boyut.getBlock({ x: mx + 3, y: my, z: mz }).setType("minecraft:coal_ore");
  // Cevher olmayan blok: DOKUNULMAMALI
  D.boyut.getBlock({ x: mx + 4, y: my, z: mz }).setType("minecraft:stone");

  sus(); const is = yetenekAl("bot_maden").olustur(o); ac();
  isiCalistir(is, 300);

  kontrol("demir cevheri kazildi",
          D.boyut.getBlock({ x: mx + 1, y: my, z: mz }).typeId === "minecraft:air");
  kontrol("tas OLDUGU GIBI kaldi (sadece cevher)",
          D.boyut.getBlock({ x: mx + 4, y: my, z: mz }).typeId === "minecraft:stone");

  /* Cevherin DUSEN esyasi veriliyor, blogun kendisi degil.
     iron_ore -> raw_iron, deepslate_diamond_ore -> diamond.   */
  kontrol("demir HAM DEMIR olarak verildi (iron_ore degil)",
          o._envanter.includes("minecraft:raw_iron") &&
          !o._envanter.includes("minecraft:iron_ore"),
          o._envanter.join(", "));
  kontrol("deepslate elmas ELMAS verdi",
          o._envanter.includes("minecraft:diamond"));
  kontrol("komur kendini verdi", o._envanter.includes("minecraft:coal"));
}

console.log("");
console.log("=== 16. IS OYUNCUNUN YUVASINI YEMIYOR ===");
{
  /* Kalp ve kafeslerde ogrenilen ders: bot isi oyuncunun
     AYNI_ANDA (2) yuvasini tutarsa bot calisirken oyuncu
     yetenek kullanamaz.                                       */
  temizle();
  const { D, o } = kur("bi1");
  cagir(o);
  sus();
  const is = yetenekAl("bot_odun").olustur(o);
  ac();
  kontrol("is nesnesi olustu", is !== undefined);
  kontrol("isin oyuncuId'si 'bot:' onekli",
          is && is.oyuncuId === "bot:bi1", is && is.oyuncuId);
  kontrol("yani oyuncunun kendi kimligi DEGIL",
          is && is.oyuncuId !== o.id);
}

console.log("");
console.log("=== 17. BOTSUZ IS ISTENINCE ===");
{
  temizle();
  const { o } = kur("bi2");
  sus();
  const is = yetenekAl("bot_odun").olustur(o);
  ac();
  kontrol("botun yokken is baslamadi", is === undefined);
  kontrol("sebebi soylendi", /[Bb]otun yok/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);
}

console.log("");
console.log("=== 18. CANTA ve TESLIM (v4.28) ===");
{
  temizle();
  const { D, o } = kur("bt1");
  cagir(o);

  /* Botlar topladigini once cantaya koyuyor. Istek buydu:
     "topladiktan sonra odunu bana vermeleri lazim".          */
  defter.cantayaKoy("bt1", "minecraft:oak_log", 12);
  defter.cantayaKoy("bt1", "minecraft:raw_iron", 3);
  kontrol("canta doldu", defter.cantaDolulugu("bt1") === 15,
          defter.cantaDolulugu("bt1") + " parca");

  const teslim = await import("./pack/yetenekler/bot_teslim.js");
  sus(); const s1 = teslim.teslimEt(o); ac();

  kontrol("teslim edildi", s1.verilen === 15, JSON.stringify(s1));
  kontrol("canta bosaldi", defter.cantaDolulugu("bt1") === 0);
  kontrol("esyalar envantere gecti",
          o._envanter.filter((e) => e === "minecraft:oak_log").length === 12,
          o._envanter.length + " esya");
  kontrol("ozet satirinda ikisi de var",
          /oak log/.test(s1.satir) && /raw iron/.test(s1.satir), s1.satir);

  sus(); const s2 = teslim.teslimEt(o); ac();
  kontrol("bos cantayi teslim etmek sorun cikarmadi", s2.bos === true);
}
{
  /* Bot cok uzaktaysa teslim edemez: botu ormanda birakip evde
     esya toplamak calisma hissini bozardi.                    */
  temizle();
  const { D, o } = kur("bt2");
  cagir(o);
  defter.cantayaKoy("bt2", "minecraft:oak_log", 5);

  uzaklastir(o, ayar.BOT_TESLIM_MENZIL + 20);
  const teslim = await import("./pack/yetenekler/bot_teslim.js");
  sus(); const s3 = teslim.teslimEt(o); ac();
  kontrol("uzaktaki bot teslim edemedi", s3.hata !== undefined, s3.hata);
  kontrol("canta KAYBOLMADI", defter.cantaDolulugu("bt2") === 5,
          defter.cantaDolulugu("bt2") + " parca");
}
{
  /* Canta tavani: dolunca blok KIRILMAMALI. Kirilip yere
     dokulseydi oyuncu farkinda olmadan birakip giderdi.      */
  temizle();
  const { o } = kur("bt3");
  const tavan = ayar.BOT_CANTA_TAVAN;
  kontrol("tavana kadar kabul etti",
          defter.cantayaKoy("bt3", "minecraft:oak_log", tavan) === true);
  kontrol("tavandan sonra reddetti",
          defter.cantayaKoy("bt3", "minecraft:oak_log", 1) === false);
}

console.log("");
console.log("=== 19. CANTA ve SAVAS KAYITTA KALIYOR ===");
{
  temizle();
  const { o } = kur("bt4");
  cagir(o);
  defter.cantayaKoy("bt4", "minecraft:diamond", 7);
  sus(); defter.botSavas(o, false); ac();

  const ham = _durum.ozellikler.get(ayar.BOT_KAYIT_ANAHTAR);
  kontrol("kayit yazildi", typeof ham === "string");
  kontrol("kayitta 'minecraft:' oneki YOK (yer tasarrufu)",
          ham.includes("diamond") && !ham.includes("minecraft:diamond"),
          ham.slice(0, 120));

  defter.defteriUnut();          // script yeniden yuklendi
  sus(); defter.botAl("bt4"); ac();
  kontrol("canta kayittan geri geldi", defter.cantaDolulugu("bt4") === 7,
          defter.cantaDolulugu("bt4") + " parca");
  kontrol("savas durumu da korundu", defter.savasAcikMi("bt4") === false);
}
{
  /* v4.27 ve oncesi DUZ DIZI yaziyordu. Eski kaydi olan bir
     dunya acilinca botlar kaybolmamali.                       */
  temizle();
  _durum.ozellikler.set(ayar.BOT_KAYIT_ANAHTAR,
    JSON.stringify([["eski1", "e99", "minecraft:overworld", "bekle"]]));
  sus(); const k = defter.botAl("eski1"); ac();
  kontrol("ESKI bicimdeki kayit da okundu", k !== undefined && k.botId === "e99",
          k ? k.botId : "okunamadi");
  kontrol("eski kaydin durumu korundu", k && k.durum === "bekle");
}

console.log("");
console.log("=== 20. SAVAS: KOPEK MODELI ===");
{
  temizle();
  const { D, o } = kur("bs1");
  cagir(o);
  const bot = botu(D);

  kontrol("varsayilan ACIK (kurt gibi)", defter.savasAcikMi("bs1") === true);

  sus(); const kapali = defter.botSavas(o, false); ac();
  kontrol("kapatildi", kapali === false);
  kontrol("varliga kapatma olayi gitti",
          bot._olaylar.includes(ayar.BOT_OLAY_SAVAS_KAPAT),
          bot._olaylar.join(", "));

  sus(); const acik = defter.botSavas(o); ac();     // argumansiz = tersine cevir
  kontrol("argumansiz cagri tersine cevirdi", acik === true);
  kontrol("varliga acma olayi gitti",
          bot._olaylar.includes(ayar.BOT_OLAY_SAVAS_AC));

  /* Savas kapaliyken SONRADAN dogan bot da barisci olmali,
     yoksa "kapattim ama yeni bot saldiriyor" olurdu.         */
  sus(); defter.botSavas(o, false); ac();
  const oncekiSayi = D.sayac.varliklar.length;
  cagir(o);
  const yeniBot = D.sayac.varliklar[oncekiSayi];
  kontrol("sonradan dogan bot da barisci geldi",
          yeniBot && yeniBot._olaylar.includes(ayar.BOT_OLAY_SAVAS_KAPAT),
          yeniBot ? yeniBot._olaylar.join(", ") : "-");
}

console.log("");
console.log("=== 21. VARLIK JSON: SAVAS ve CESITLER ===");
{
  const { readFileSync } = await import("node:fs");
  const varlik = JSON.parse(readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/entities/bot.json", "utf8"));
  const e = varlik["minecraft:entity"];

  /* Kullanicinin tarifi: "kopek gibi, birine vurdugun zaman ona
     saldiriyor". Vanilla kurdun uc davranisi.                 */
  const savas = e.component_groups["pa:savas"];
  kontrol("pa:savas grubu var", savas !== undefined);
  for (const b of ["minecraft:behavior.owner_hurt_target",
                   "minecraft:behavior.owner_hurt_by_target",
                   "minecraft:behavior.hurt_by_target",
                   "minecraft:behavior.melee_attack",
                   "minecraft:attack"]) {
    kontrol("  " + b, savas && savas[b] !== undefined);
  }
  kontrol("pa:barisci grubu var (kapatma icin)",
          e.component_groups["pa:barisci"] !== undefined);

  for (const olay of [ayar.BOT_OLAY_SAVAS_AC, ayar.BOT_OLAY_SAVAS_KAPAT]) {
    kontrol("JSON'da " + olay + " olayi var",
            Object.keys(e.events).includes(olay));
  }

  /* Botlar birbirini dovmesin: hedef suzgecinde pa_bot disarida. */
  const suzgec = JSON.stringify(savas["minecraft:behavior.owner_hurt_target"]);
  kontrol("botlar birbirini dovmuyor (pa_bot suzgeci)",
          suzgec.includes("pa_bot"), suzgec);

  // Cesitler
  const tipler = Object.keys(e.component_groups).filter((k) => /^pa:tip\d+$/.test(k));
  kontrol("gorsel cesit gruplari var", tipler.length >= 4,
          tipler.length + " cesit");
  kontrol("dogumda rastgele cesit seciliyor",
          JSON.stringify(e.events["minecraft:entity_spawned"]).includes("randomize"));
}

console.log("");
console.log("=== 22. ISTEMCI VARLIGI: CIZIM YOLU (v4.30) ===");
{
  /* v4.28'de cesit basina doku denendi (ozel render controller +
     Array.cesitler[query.variant]). Yapi belgelere uygundu ama
     OYUNDA BOT HIC CIZILMEDI: gorunmez oldu, davranisi calismaya
     devam etti. Yani sunucu tarafi saglamdi, kirilan CIZIMDI.

     v4.30'da v4.27'nin calisan kurulumuna donuldu. Bu bolum o
     karari kilitliyor -- bir dahakine ayni hataya dusmeyelim.

     DURUSTLUK NOTU: bu test gorunurlugu SINAYAMAZ. Cizim oyunun
     isi; buradan yapilabilecek tek sey "calistigi bilinen
     yapiyi koru" demek.                                        */
  const { readFileSync, existsSync } = await import("node:fs");
  const RP = KOK + "/Simsek_Kol_Kaynak";
  const d = JSON.parse(readFileSync(RP + "/entity/bot.entity.json", "utf8"))
    ["minecraft:client_entity"].description;

  kontrol("vanilla render controller kullaniliyor",
          d.render_controllers.length === 1 &&
          d.render_controllers[0] === "controller.render.default",
          d.render_controllers.join(", "));
  kontrol("doku dizisi (arrays) YOK", d.arrays === undefined);
  kontrol("tek doku tanimli", Object.keys(d.textures).length === 1,
          JSON.stringify(d.textures));
  kontrol("dokunun PNG'si diskte var",
          existsSync(RP + "/" + d.textures.default + ".png"),
          d.textures.default);
  kontrol("geometri hala kendi modelimiz",
          d.geometry.default === "geometry.simsek_bot", d.geometry.default);
  kontrol("yuruyus animasyonu duruyor",
          d.animations && d.animations.yuru !== undefined);

  /* v4.75'e kadar burada "hic render controller dosyasi
     olmasin" yaziyordu. Artik BIR tane var: goz lazerinin
     isin kemigine entity_emissive veren denetleyici.

     Yasak KALKMADI, DARALDI: bot hala vanilla denetleyici
     kullaniyor (ustteki kontrol) ve klasorde lazer
     denetleyicisi DISINDA bir sey olmamali. v4.28'in dersi
     "ozel denetleyici yazma" degil, "botun cizimine
     dokunma"ydi.                                             */
  const { readdirSync } = await import("node:fs");
  const rcVar = existsSync(RP + "/render_controllers");
  const rcDosya = rcVar ? readdirSync(RP + "/render_controllers").sort() : [];
  kontrol("render controller klasorunde SADECE lazer isini var",
          rcDosya.length === 0 ||
          (rcDosya.length === 1 &&
           rcDosya[0] === "goz_lazer.render_controllers.json"),
          rcDosya.join(", ") || "klasor yok");

  if (rcVar && rcDosya.length === 1) {
    const rc = JSON.parse(
      readFileSync(RP + "/render_controllers/" + rcDosya[0], "utf8")
    ).render_controllers["controller.render.simsek_goz_lazer"];
    kontrol("lazer denetleyicisi tanimli", rc !== undefined);
    /* Vanilla controller.render.armor ile birebir ayni olmali;
       tek fark isin kemigine yazilan ikinci materials satiri.  */
    kontrol("geometri/doku vanilla ile ayni",
            rc.geometry === "Geometry.default" &&
            rc.textures.length === 1 && rc.textures[0] === "Texture.default");
    kontrol("once TUM kemiklere default, sonra isin",
            rc.materials.length === 2 &&
            rc.materials[0]["*"] === "Material.default" &&
            rc.materials[1].isin === "Material.isin",
            JSON.stringify(rc.materials));
    kontrol("bot bu denetleyiciyi KULLANMIYOR",
            !d.render_controllers.includes("controller.render.simsek_goz_lazer"));
  }
}

console.log("=== 23. OZEL GUCLER: SIMSEK ve KIL TOPU (v4.29) ===");
{
  temizle();
  const { D, o } = kur("bg1");
  cagir(o); cagir(o); cagir(o);

  /* Oyuncu +x yonune bakiyor; hedefBul o dogrultuda bir nokta
     bulmali. Botlar SENIN nisanini kullaniyor -- kendi bakislari
     kullanilsaydi top sana gelirdi (look_at_player).           */
  o.getViewDirection = () => ({ x: 1, y: 0, z: 0 });

  const oncekiDogan = D.sayac.dogan.length;
  sus(); const isler = yetenekAl("bot_simsek").olustur(o); ac();

  kontrol("simsek isleri DIZI olarak dondu", Array.isArray(isler),
          Array.isArray(isler) ? isler.length + " is" : typeof isler);
  kontrol("bot basina bir is acildi", isler && isler.length === 3,
          isler ? isler.length + " is / 3 bot" : "-");
  kontrol("isler 'bot:' kovasinda (oyuncunun yuvasini yemiyor)",
          isler && isler.every((i) => i.oyuncuId === "bot:bg1"),
          isler ? isler[0].oyuncuId : "-");

  for (const is of isler) isiCalistir(is, 120);
  const yildirim = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");
  kontrol("gercekten yildirim dustu", yildirim.length > 0,
          yildirim.length + " yildirim");

  /* Yildirim BOTUN dibine degil, oyuncunun baktigi yone
     dusmeli.                                                   */
  const ileri = yildirim.filter((y) => y.x > o.location.x + 3).length;
  kontrol("yildirim ileriye dustu, botun dibine degil", ileri > 0,
          ileri + "/" + yildirim.length + " ileride");
}
{
  temizle();
  const { D, o } = kur("bg2");
  for (let i = 0; i < 10; i++) cagir(o);
  o.getViewDirection = () => ({ x: 1, y: 0, z: 0 });

  sus(); const isler = yetenekAl("bot_simsek").olustur(o); ac();
  kontrol("simsek tavani uygulandi",
          isler && isler.length === ayar.BOT_SIMSEK_TAVAN,
          (isler ? isler.length : 0) + " / tavan " + ayar.BOT_SIMSEK_TAVAN +
          " (10 bot var)");

  sus(); const topIsleri = yetenekAl("bot_top").olustur(o); ac();
  kontrol("top tavani daha DUSUK (blok yazan is pahali)",
          topIsleri && topIsleri.length === ayar.BOT_TOP_TAVAN,
          (topIsleri ? topIsleri.length : 0) + " / tavan " + ayar.BOT_TOP_TAVAN);
  kontrol("top tavani simsek tavanindan kucuk",
          ayar.BOT_TOP_TAVAN < ayar.BOT_SIMSEK_TAVAN);
}
{
  /* Kil topu gercekten blok yaziyor mu ve ILERI gidiyor mu.   */
  temizle();
  const { D, o } = kur("bg3");
  cagir(o);
  o.getViewDirection = () => ({ x: 1, y: 0, z: 0 });

  sus(); const isler = yetenekAl("bot_top").olustur(o); ac();
  kontrol("top isi acildi", isler && isler.length === 1);
  for (const is of isler || []) isiCalistir(is, 200);

  const yazilan = D.sayac.yazilan.filter((y) => y.tip === ayar.TOP_BLOK);
  kontrol("kil topu blok yazdi", yazilan.length > 0, yazilan.length + " blok");
  const enUzak = Math.max(...D.sayac.yazilan.map((y) => y.x));
  kontrol("top ILERI gitti (oyuncuya degil)", enUzak > o.location.x + 8,
          "en uzak x=" + enUzak + " (oyuncu " + o.location.x + ")");
  kontrol("sonunda patladi", D.sayac.patlama.length > 0,
          D.sayac.patlama.length + " patlama");
}
{
  temizle();
  const { o } = kur("bg4");
  sus(); const is = yetenekAl("bot_simsek").olustur(o); ac();
  kontrol("botsuzken guc calismadi", is === undefined);
  kontrol("sebebi soylendi", /[Bb]otun yok/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);
}

console.log("");
console.log("=== 24. BOT GUCLENDIRILDI (v4.29) ===");
{
  const { readFileSync } = await import("node:fs");
  const e = JSON.parse(readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/entities/bot.json",
    "utf8"))["minecraft:entity"];

  /* Rakamlar ELLE yazilmiyor: uretecin kaynagindan okunuyor.
     v4.43'te ikisi de ikiye katlandi (7->14 hasar, 25->50 can)
     ve elle yazili hali bu testi bozmustu. Tek kaynak
     kol_uret.py.                                              */
  const uret = readFileSync(
    KOK + "/kol_uret.py", "utf8");
  const sayi = (ad) => Number(
    new RegExp("^" + ad + " = (\\d+)", "m").exec(uret)[1]);
  const beklenenHasar = sayi("BOT_HASAR");
  const beklenenCan = sayi("BOT_CAN");

  kontrol("hasar ureticiyle ayni (" + beklenenHasar + " HP = " +
          beklenenHasar / 2 + " kalp)",
          e.component_groups["pa:savas"]["minecraft:attack"].damage === beklenenHasar,
          String(e.component_groups["pa:savas"]["minecraft:attack"].damage));
  kontrol("can ureticiyle ayni (" + beklenenCan + " HP = " +
          beklenenCan / 2 + " kalp)",
          e.components["minecraft:health"].value === beklenenCan,
          String(e.components["minecraft:health"].value));
  kontrol("max can da ayni", e.components["minecraft:health"].max === beklenenCan);

  /* Normal botun skini de artik kullanicinin dosyasi (v4.43).
     Ilkel Besli'nin hicbiriyle ayni OLMAMALI -- yanlis dosya
     kopyalansa kimse fark etmezdi.                            */
  const RPY = KOK + "/Simsek_Kol_Kaynak/textures/entity/";
  const imza = (f) => readFileSync(RPY + f).toString("base64").slice(0, 200);
  const botImza = imza("bot.png");
  const ilkelImzalar = ["okazor", "miskel", "kajaros", "raxxan", "harkos"]
    .map((a) => imza("ilkel_" + a + ".png"));
  kontrol("normal botun skini Ilkel Besli'ninkilerden FARKLI",
          !ilkelImzalar.includes(botImza));
  kontrol("normal botun skini gercek bir dosya (yer tutucu degil)",
          readFileSync(RPY + "bot.png").length > 800,
          readFileSync(RPY + "bot.png").length + " bayt");
}

console.log("");
console.log("=== 25. HAREKET EDEN BOT (v4.31 -- gercek oyun hatasi) ===");
{
  /* GERCEK OYUNDA GORULEN HATA:
     "bot yanimda takiliyor ama odun kendi bosuna kiriliyor" +
     "cantasina baktim sifir, odun olmasi gerekirken yok".

     Sebep: tarama imleci, bot BIR BLOK bile kimildayinca
     sifirlaniyordu. Bot seni takip ettigi icin surekli hareket
     halinde -- imlec hep 0'a doeuyor ve bot yalnizca en yakin
     ~8 offseti tekrar tekrar tariyordu. Uzaktaki agaclara hic
     sira gelmiyordu.

     ONCEKI TESTLER BUNU KACIRDI cunku testteki bot hic
     kimildamiyordu. Bu bolum botu HAREKET ETTIRIYOR.          */
  temizle();
  const { D, o } = kur("bh1");
  cagir(o);
  const bot = botu(D);

  const bk = bot.location;
  const gy = Math.floor(bk.y);
  /* Agaci taramanin UZAK ucuna dik: imlec sifirlanirsa oraya
     hic sira gelmez.                                          */
  const gx = Math.floor(bk.x) + 5, gz = Math.floor(bk.z) + 2;
  for (let i = 0; i < 4; i++) {
    D.boyut.getBlock({ x: gx, y: gy + i, z: gz }).setType("minecraft:oak_log");
  }

  sus(); const is = yetenekAl("bot_odun").olustur(o); ac();
  kontrol("is acildi", is !== undefined);

  /* Isi surerken botu her tick oynat -- takip ediyormus gibi. */
  sus();
  for (let t = 0; t < 300; t++) {
    butceSifirla();
    bot.teleport({ x: bk.x + Math.sin(t / 7) * 0.6, y: bk.y,
                   z: bk.z + Math.cos(t / 7) * 0.6 });
    if (is.calis()) break;
    tickIlerlet(1);
  }
  if (is.bitir) is.bitir();
  ac();

  let kalan = 0;
  for (let i = 0; i < 4; i++) {
    if (D.boyut.getBlock({ x: gx, y: gy + i, z: gz }).typeId === "minecraft:oak_log") kalan++;
  }
  kontrol("bot HAREKET EDERKEN de uzaktaki agaci kesti", kalan === 0,
          kalan + " kutuk kaldi");
  kontrol("odun gercekten teslim edildi",
          o._envanter.filter((e) => e === "minecraft:oak_log").length === 4,
          o._envanter.length + " esya");
}

console.log("");
console.log("=== 26. CALISIRKEN DURUYOR ve GORUNUYOR ===");
{
  temizle();
  const { D, o } = kur("bh2");
  cagir(o);
  const bot = botu(D);
  const bk = bot.location;
  D.boyut.getBlock({ x: Math.floor(bk.x) + 2, y: Math.floor(bk.y),
                    z: Math.floor(bk.z) }).setType("minecraft:oak_log");

  const oncekiOlay = bot._olaylar.length;
  sus(); const is = yetenekAl("bot_odun").olustur(o); ac();

  /* "Botun onu yaptigini gormem gerek": bot ise baslayinca
     DURUYOR. Hem gorunur oluyor hem imlec sifirlanmiyor.     */
  kontrol("is baslayinca bot DURDURULDU",
          bot._olaylar.slice(oncekiOlay).includes(ayar.BOT_OLAY_BEKLE),
          bot._olaylar.slice(oncekiOlay).join(", ") || "olay yok");
  kontrol("ayar acik", ayar.BOT_IS_DURARAK === true);

  const parcacikOnce = (D.sayac.parcacik || []).length;
  isiCalistir(is, 200);

  kontrol("kirarken parcacik cikti (gorunurluk)",
          (D.sayac.parcacik || []).length > parcacikOnce,
          ((D.sayac.parcacik || []).length - parcacikOnce) + " parcacik");
  kontrol("is bitince bot TAKIBE dondu",
          bot._olaylar[bot._olaylar.length - 1] === ayar.BOT_OLAY_TAKIP,
          bot._olaylar.slice(-2).join(", "));
}

console.log("");
console.log("=== 27. CANTA HER BLOKTA DISKE YAZILMIYOR ===");
{
  /* v4.30'a kadar her blokta yaz() cagriliyordu: blok basina bir
     JSON.stringify + setDynamicProperty. Bot saniyede onlarca
     blok kirdigi icin isin en pahali kismi olmustu.           */
  temizle();
  const { o } = kur("bh3");
  cagir(o);
  const oncekiYazim = _durum.ozellikYazim || 0;

  for (let i = 0; i < 50; i++) defter.cantayaKoy("bh3", "minecraft:oak_log", 1);
  kontrol("50 blok cantaya girdi", defter.cantaDolulugu("bh3") === 50,
          defter.cantaDolulugu("bh3") + " parca");

  const ham = _durum.ozellikler.get(ayar.BOT_KAYIT_ANAHTAR) || "";
  kontrol("henuz diske yazilmadi (toplu kayit)",
          !ham.includes("oak_log:50"), ham.slice(0, 80));

  defter.cantaKaydet();
  const ham2 = _durum.ozellikler.get(ayar.BOT_KAYIT_ANAHTAR) || "";
  kontrol("cantaKaydet() cagrilinca yazildi", ham2.includes("oak_log:50"),
          ham2.slice(0, 80));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum bot testleri gecti");
process.exit(hata ? 1 : 0);

/* DIS INCELEMEDE BULUNAN KIRIKLAR                        v7.40

   Kullanici paketi baska bir modele statik olarak taratti ve
   raporu getirdi. Bulgularin hepsi tek tek DOGRULANDI; ucu
   gercek kirikti ve bu dosya o ucunu tutuyor.

   ---- RAPOR HER SEYDE HAKLI DEGILDI ----
   Bir iddia yanlisti ("BETA_GEREKLI false oldugu icin chatSend
   bulunamaz"): sohbet.js BETA_GEREKLI'ye HIC BAKMIYOR, olayin
   varligini calisma aninda sinliyor. Sonuc dogru olabilir ama
   sebep degil. Raporlar da olculur.

   TUTULANLAR

   1. KALICI IZLEYICI ACIGI (kilic.js)
      Kilic oyuncuyu 200 tick spectator yapiyor. Geri donduren
      tek yer bir tarama dongusuydu; oyuncu izleyiciyken cikarsa
      ya da dunya yeniden yuklenirse KALICI izleyici kaliyordu.
      Ucabilen, bloktan gecebilen, gorunmez bir oyuncu.

   2. SAHIPSIZ HEYKELLER (tas.js)
      `oku()` yaziliydi ama hicbir yerden cagrilmiyordu; yani
      defter yaziliyor, hic okunmuyordu. Yeniden yuklemeden
      sonra tas bloklari dunyada sahipsiz kaliyordu.

   3. `vuran` TANIMSIZ (goz_lazeri.js)
      bitir() icinde isinVur()'un YERELINI okuyordu. En az bir
      blok delinen her lazerde ozet actionbar'i hic gorunmuyor,
      yerine Content Log'a ReferenceError dusuyordu.          */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum, world } from "@minecraft/server";
import { readFileSync } from "node:fs";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
const ayar = await import("./pack/ayarlar.js");
const kilic = await import("./pack/yetenekler/kilic.js");
const tas = await import("./pack/yetenekler/tas.js");
ac();

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Kipi GERCEKTEN tutan sahte oyuncu: setGameMode yazsin,
   getGameMode okusun. Sahte dunyanin oyuncusunda bu yok --
   olmasaydi "geri alindi" olcumu sessizce hep gecerdi.     */
function oyuncuKip(id, kip) {
  return {
    id, typeId: "minecraft:player", name: id, isValid: true,
    _kip: kip, _yazilan: [],
    getGameMode() { return this._kip; },
    setGameMode(y) { this._kip = y; this._yazilan.push(y); },
    onScreenDisplay: { setActionBar() {} },
    runCommand() { return { successCount: 1 }; }
  };
}

console.log("=== 1. KALICI IZLEYICI ACIGI (kilic.js) ===");
{
  world.setDynamicProperty(ayar.KILIC_KAYIT_ANAHTAR, undefined);
  kilic.kilicUnut("izl1");

  /* Kilici kullanmak yerine dogrudan is akisini taklit etmek
     yerine GERCEK yolu kullaniyoruz: kilicKullan izleyiciYap'i
     cagiriyor. Boylece "kayit gercekten yaziliyor mu" olculuyor,
     "yazsaydi ne olurdu" degil.                              */
  const D = dunyaKur();
  const o = oyuncuKip("izl1", "creative");
  o.dimension = D.boyut;
  o.location = { x: 0.5, y: 64, z: 0.5 };
  o.getHeadLocation = () => ({ x: 0.5, y: 65.6, z: 0.5 });
  o.getViewDirection = () => ({ x: 0, y: 0, z: 1 });
  _durum.oyuncular = [o];

  sus();
  const is = kilic.kilicKullan(o);
  ac();
  kontrol("kilic izleyici kipine aldi", o._kip === "spectator", String(o._kip));

  const defter = kilic.kilicKaydiOku();
  kontrol("DUNYA KAYDI yazildi (onceki kip dahil)",
          defter.izl1 === "creative", JSON.stringify(defter));

  /* ---- ASIL ACIK: izleyiciyken CIKMAK ----
     playerLeave yalniz kimlik verir; oyuncu nesnesi gecersizdir,
     yani kip CIKARKEN yazilamaz. O yuzden dunya kaydi KALMALI. */
  kilic.kilicUnut("izl1");
  kontrol("cikinca dunya kaydi SILINMIYOR",
          kilic.kilicKaydiOku().izl1 === "creative",
          JSON.stringify(kilic.kilicKaydiOku()));

  /* ---- GERI GIRINCE DUZELIYOR ---- */
  const geri = oyuncuKip("izl1", "spectator");
  const duzeldi = kilic.kilicGirisDuzelt(geri);
  kontrol("geri girince izleyicilikten cikariliyor",
          duzeldi === true && geri._kip === "creative", String(geri._kip));
  kontrol("  ONCEKI kipe donuyor (survival'a degil)",
          geri._kip === "creative", geri._kip);
  kontrol("  kayit temizlendi",
          kilic.kilicKaydiOku().izl1 === undefined,
          JSON.stringify(kilic.kilicKaydiOku()));

  /* ---- KENDI ISTEGIYLE IZLEYICI OLANI GERI CEKMIYOR ----
     Kosulsuz "survival yap" yazsaydik, acigi kapatirken baska
     bir sey kirardik.                                        */
  const masum = oyuncuKip("masum", "spectator");
  kontrol("defterde OLMAYAN izleyiciye dokunmuyor",
          kilic.kilicGirisDuzelt(masum) === false && masum._kip === "spectator",
          masum._kip);

  /* ---- main.js gercekten cagiriyor mu ----
     Ustteki maddeler fonksiyonun dogru oldugunu gosteriyor;
     playerSpawn'a baglanmasaydi hepsi yine gecerdi.         */
  const ana = readFileSync(new URL("./pack/main.js", import.meta.url), "utf8");
  kontrol("main.js playerSpawn'da kilicGirisDuzelt cagiriyor",
          /playerSpawn[\s\S]{0,3000}?kilicGirisDuzelt\(olay\.player\)/.test(ana));
  /* kilicUnut kaydi SILMEMELI -- acigin ta kendisi oydu. */
  const kod = readFileSync(new URL("./pack/yetenekler/kilic.js", import.meta.url), "utf8");
  kontrol("kilicUnut dunya kaydini silmiyor",
          !/export function kilicUnut[\s\S]{0,400}?kayitSil/.test(kod));
}

console.log("");
console.log("=== 2. SAHIPSIZ HEYKELLER (tas.js) ===");
{
  const kod = readFileSync(new URL("./pack/yetenekler/tas.js", import.meta.url), "utf8");
  /* Once OLU KOD maddesi: oku() cagriliyor mu. Rapor tam olarak
     bunu buldu -- fonksiyon vardi, cagiran yoktu.           */
  kontrol("oku() artik cagriliyor",
          /temizlikSirasi[\s\S]{0,200}?=\s*oku\(\)/.test(kod));
  kontrol("temizlik tasTara icinde",
          /export function tasTara[\s\S]{0,600}?sahipsiziDene/.test(kod));

  const D = dunyaKur();
  /* Defterde bir sahipsiz kayit: [id, boyutId, x, y, z] */
  world.setDynamicProperty(ayar.TAS_KAYIT_ANAHTAR,
    JSON.stringify([["olu1", "minecraft:overworld", 5, 70, 5]]));
  _durum.boyut = D.boyut;
  D.boyut.getBlock({ x: 5, y: 70, z: 5 }).setType(ayar.TAS_BLOK);
  kontrol("kurulum: blok gercekten tas heykel",
          D.boyut.getBlock({ x: 5, y: 70, z: 5 }).typeId === ayar.TAS_BLOK);

  sus();
  tas.tasTara();
  ac();
  kontrol("sahipsiz heykel blogu kaldirildi",
          D.boyut.getBlock({ x: 5, y: 70, z: 5 }).typeId === "minecraft:air",
          D.boyut.getBlock({ x: 5, y: 70, z: 5 }).typeId);
  kontrol("  defterden de dustu",
          !world.getDynamicProperty(ayar.TAS_KAYIT_ANAHTAR) ||
          world.getDynamicProperty(ayar.TAS_KAYIT_ANAHTAR) === "[]",
          String(world.getDynamicProperty(ayar.TAS_KAYIT_ANAHTAR)));

  /* ---- BASKASININ BLOGUNA DOKUNMUYOR ----
     heykeliKaldir'daki ayni kural: araya biri bir sey koyduysa
     o kalir.                                                */
  /* SIFIRLAMA SART: temizlik listesi oturum basina bir kez
     okunuyor, yani sifirlamadan bu senaryo HIC calismaz ve
     madde bosuna gecerdi. Ilk yazilista tam bu oldu; mutasyon
     denemesi ("baskasinin blogunu da sil") hicbir sey
     dusurmeyince ortaya cikti.                              */
  tas.defteriUnut();
  world.setDynamicProperty(ayar.TAS_KAYIT_ANAHTAR,
    JSON.stringify([["olu2", "minecraft:overworld", 6, 70, 6]]));
  D.boyut.getBlock({ x: 6, y: 70, z: 6 }).setType("minecraft:chest");
  sus(); tas.tasTara(); ac();
  kontrol("kendi blogu olmayana DOKUNMUYOR",
          D.boyut.getBlock({ x: 6, y: 70, z: 6 }).typeId === "minecraft:chest",
          D.boyut.getBlock({ x: 6, y: 70, z: 6 }).typeId);

  /* ---- BOSKEN HIC BLOK OKUMUYOR ----
     Depo kurali: bosta duran mod blok okumaz. Temizlik listesi
     tukendikten sonra bu dal hic calismamali.               */
  world.setDynamicProperty(ayar.TAS_KAYIT_ANAHTAR, undefined);
  tas.defteriUnut();
  const D2 = dunyaKur();
  _durum.boyut = D2.boyut;
  const once = D2.sayac.getBlock;
  sus(); for (let i = 0; i < 20; i++) { tas.tasTara(); tickIlerlet(1); } ac();
  kontrol("defter bosken hic blok okunmuyor",
          D2.sayac.getBlock === once, (D2.sayac.getBlock - once) + " okuma");
}

console.log("");
console.log("=== 3. `vuran` TANIMSIZ (goz_lazeri.js) ===");
{
  const kod = readFileSync(new URL("./pack/yetenekler/goz_lazeri.js",
                                   import.meta.url), "utf8");
  /* bitir() icindeki ozet, isinVur()'un yerelini DEGIL isin
     omru boyunca biriken sayaci okumali.                    */
  /* ---- YORUMLAR AYIKLANIYOR ----
     Ilk yazilista ham metinde aranmisti ve mutasyon KACTI:
     duzeltmenin yanina yazdigim aciklamada "toplamVuran"
     kelimesi geciyor, yani madde YORUMU kod saniyordu. Bu
     depoda ayni tuzaga will.mjs ve anna.mjs'te de dusulmus.
     tarama.mjs'in kalibi kullaniliyor.                     */
  const KOD = kod.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const bitir = KOD.slice(KOD.indexOf("bitir() {"));
  kontrol("bitir() ozeti toplamVuran kullaniyor",
          /delinen > 0[\s\S]{0,400}?toplamVuran/.test(bitir));
  kontrol("bitir() artik `vuran` OKUMUYOR",
          !/delinen > 0[\s\S]{0,400}?\bvuran\b/.test(bitir));
  /* Canli gosterge ile ozet AYNI sayiyi soylemeli -- eskiden
     biri toplamVuran, oteki (tanimsiz) vuran diyordu.       */
  kontrol("canli actionbar da toplamVuran kullaniyor",
          /toplamVuran \+ " vurus/.test(KOD));
  /* `vuran` isinVur icinde hala yasiyor olmali: yerel sayac
     silinseydi vurus hic sayilmazdi.                        */
  kontrol("isinVur kendi `vuran` sayacini koruyor",
          /function isinVur[\s\S]{0,4000}?let vuran = 0;/.test(KOD));
}

console.log("");
console.log("=== 4. display_name ILE DIL DOSYASI KAYMASI ===");
{
  /* ---- RAPORUN EN INCE BULGUSU ----
     516 esyanin hepsinde `minecraft:display_name` DUZ METIN.
     Bedrock'ta display_name dil dosyasini EZIYOR, yani 1059
     satirlik lang esyalar icin olu agirlikti VE sessizce
     kaymisti: alti esyada JSON ile lang farkliydi ve oyunda
     JSON kazaniyordu. Oyuncu "Ucus Kolu" goruyordu, lang'daki
     "Uçuş Kolu" hicbir zaman ekrana gelmiyordu.

     Kaynagi bir KURALDI: uretecin TR_AD tablosunun basliginda
     "dil dosyasi icin; JSON'da ASCII tutuluyor" yaziyordu.
     Kural kendi amacini yok ediyordu.

     Duzeltme: ikisi de AYNI kaynaktan turiyor. Dil dosyasi
     silinmedi -- kaynak paketi kurulmadan da esya adi okunabilir
     kalsin diye (BP tek basina kurulabiliyor).             */
  const BP = new URL("./pack/", import.meta.url).pathname
    .replace(/\/scripts\/pack\/$/, "/") + "";
  const kok = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const { readdirSync } = await import("node:fs");
  const esyaDizin = kok + "/Simsek_TNT_ToprakTopu/items";
  const langMetin = readFileSync(
    kok + "/Simsek_Kol_Kaynak/texts/tr_TR.lang", "utf8");
  const lang = {};
  for (const satir of langMetin.split("\n")) {
    if (!satir || satir.startsWith("#") || !satir.includes("=")) continue;
    const i = satir.indexOf("=");
    lang[satir.slice(0, i)] = satir.slice(i + 1);
  }

  let kayan = [], kayitsiz = 0, toplam = 0;
  for (const dosya of readdirSync(esyaDizin)) {
    if (!dosya.endsWith(".json")) continue;
    const d = JSON.parse(readFileSync(esyaDizin + "/" + dosya, "utf8"));
    const it = d["minecraft:item"];
    if (!it) continue;
    const kimlik = it.description && it.description.identifier;
    const dn = it.components && it.components["minecraft:display_name"];
    if (!dn || !kimlik) continue;
    const deger = (typeof dn === "string") ? dn : dn.value;
    if (typeof deger !== "string") continue;
    toplam++;
    const la = lang["item." + kimlik];
    if (la === undefined) kayitsiz++;
    else if (la !== deger) kayan.push(kimlik + ": JSON=" + deger + " LANG=" + la);
  }

  kontrol("esyalar taranabildi", toplam > 400, toplam + " esya");
  kontrol("JSON display_name ile lang AYNI", kayan.length === 0,
          kayan.slice(0, 4).join(" | ") || "kayma yok");
  kontrol("her esyanin dil kaydi var", kayitsiz === 0, kayitsiz + " kayitsiz");

  /* Ureteci de tutuyoruz: iki degeri AYRI tablolardan besleyen
     bir satir geri gelirse kayma yeniden baslar.            */
  const uretec = readFileSync(kok + "/kol_uret.py", "utf8");
  kontrol("uretec kol adini TR_AD'den veriyor",
          /esya\(kimlik, TR_AD\.get\(kimlik, ad\)\)/.test(uretec));
  kontrol("uretec iksir adini IKSIR_TR'den veriyor",
          /iksir_esyasi\(kimlik, IKSIR_TR\.get\(kimlik, ad\)\)/.test(uretec));
  /* Eski kural metni geri gelmemeli -- yanlis oldugu olculdu. */
  kontrol("\"JSON'da ASCII tutuluyor\" kurali geri gelmedi",
          uretec.indexOf("JSON'da ASCII tutuluyor)") === -1);
}

console.log("");
console.log("=== 5. SOHBET: SALT-OKUNUR KIP VE YANILTICI MESAJ ===");
{
  const kod = readFileSync(new URL("./pack/sohbet.js", import.meta.url), "utf8");
  const KOD = kod.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  /* cevapYaz beforeEvents.chatSend ICINDEN cagriliyor ve orada
     sendMessage istisna atar (salt-okunur kip). Yedek yol
     olmali.                                                  */
  const govde = KOD.slice(KOD.indexOf("function cevapYaz"));
  kontrol("cevapYaz'in system.run yedegi var",
          /function cevapYaz[\s\S]{0,600}?system\.run\(/.test(govde));
  /* Ama KOSULSUZ ertelememeli: calisan durumu geciktirmek uc
     testte cevabi "son mesaj" olmaktan cikardi.              */
  kontrol("once DOGRUDAN deniyor (kosulsuz ertelemiyor)",
          /function cevapYaz[\s\S]{0,300}?oyuncu\.sendMessage\(cevap\);[\s\S]{0,40}?return;/
            .test(govde));
  kontrol("system erisilebilir (import edilmis)",
          /import \{[^}]*\bsystem\b[^}]*\} from "@minecraft\/server"/.test(KOD));

  /* Yaniltici mesaj: manifest v4.25'te kararli 2.0.0'a gecti,
     mesaj hala "Beta modulu yuklu ama" diyordu.             */
  /* KOD'da (yorumsuz) araniyor: eski metin duzeltmenin
     yanindaki ACIKLAMADA hala geciyor ve ham metinde aramak
     maddeyi bosuna dusuruyordu. Bu dosyada ayni tuzaga bir
     kez daha dusuldu (3. bolum, `toplamVuran`).            */
  kontrol("'Beta modulu yuklu' metni kaldirildi",
          KOD.indexOf("Beta modulu yuklu ama") === -1);
  /* Metin iki dizinin toplami; "bulunmuyor" oteki parcada
     kaliyor, o yuzden aranan parca birlesik olani.         */
  kontrol("yerine dogru sebep yaziyor",
          /kararli API'de bu olay/.test(KOD));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> denetim bulgulari kapali");
process.exit(hata ? 1 : 0);

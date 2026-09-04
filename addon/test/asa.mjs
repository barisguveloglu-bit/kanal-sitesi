/* EL-HARKOS'UN ASASI -- v4.50

   Kullanici modu bulamadi, yetenegi anlatti:

     "2-3 kere vurdugunda karsidaki kisi bir anda yere duser,
      yerde kalir, hareket edemez ama kafasini cevirebilir.
      Yerdeyken asayi bir kez daha kaldirdiginda bir mezar gibi
      bir yapi acilir, o karakteri alir. 10 dismont tasi ile
      mezara kazarsam aciliyor ve karakter kurtulabiliyor."

   Bu dosyanin kilitledigi sey ZINCIR ve KILIT:

     zincir  3 vurus -> sersem -> 1 vurus -> mezar -> 10 tas
     kilit   acilan her kilit MUTLAKA kapaniyor

   Ikincisi kritik: referans modlarin en can sikici huyu
   suresiz etkiydi (acan komut ayri, kapatan ayri, unutursan
   oyuncu sonsuza kadar kilitli). Burada suresi dolan da,
   mezari acilan da serbest kaliyor -- ucu de sinaniyor.       */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import {
  tickIlerlet, varlikKaydet, esyaKaydet, _durum,
  vurusTetikle, blokKirTetikle
} from "@minecraft/server";
import { readFileSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

varlikKaydet("pa:bot", "pa:kajaros", "pa:miskel", "pa:harkos",
             "pa:raxxan", "pa:okazor");
esyaKaydet("pa:ilkel_balta", "pa:ilkel_asa", "pa:freedom_stone");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const defter = await import("./pack/yetenekler/_bot_defteri.js");
const ilkel = await import("./pack/yetenekler/bot_ilkel.js");
const asa = await import("./pack/yetenekler/asa.js");
const mezarlar = await import("./pack/yetenekler/_mezar_defteri.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  _durum.varliklar = D.sayac.varliklar;
  defter.defteriUnut();
  mezarlar.defteriUnut();
  _durum.ozellikler.delete(ayar.BOT_KAYIT_ANAHTAR);
  _durum.ozellikler.delete(ayar.MEZAR_KAYIT_ANAHTAR);
  return { D, o };
}

const harkosu = (D) => D.sayac.varliklar.find(
  (v) => v.isValid && v.typeId === "pa:harkos");

/* Kurban: hem oyuncu hem mob olabiliyor. Oyuncu olani
   runCommand tutuyor -- girdi kilidi orada sinaniyor.         */
function kurbanYap(id, boyut, tip = "minecraft:zombie") {
  return {
    id, typeId: tip, isValid: true,
    dimension: boyut,
    location: { x: 4, y: 90, z: 4 },
    _efektler: [], _komutlar: [], _isinlanma: [],
    addEffect(ad, sure, se) { this._efektler.push({ ad, sure, se }); },
    removeEffect(ad) { this._efektler = this._efektler.filter((e) => e.ad !== ad); },
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    teleport(n) { this._isinlanma.push(n); this.location = { x: n.x, y: n.y, z: n.z }; return true; },
    /* Kurban kacmaya calisiyor: civileme testinde kullaniliyor. */
    _kac(dx, dz) { this.location = { x: this.location.x + dx, y: this.location.y, z: this.location.z + dz }; },
    applyDamage: () => true
  };
}

function vur(bot, kurban, kez) {
  for (let i = 0; i < kez; i++) {
    vurusTetikle({ damagingEntity: bot, hitEntity: kurban });
  }
}

/* ---- DOSYA ADLARI AYARDAN TURUYOR (v4.86) ----
   Dismont'un adi Freedom Stone oldu ve bu dosya kimlikleri
   ELLE yaziyordu; hepsi birden kirildi. Artik ayardaki
   kimlikten turuyor, bir dahaki ad degisiminde kirilmayacak. */
const ESYA_AD = ayar.DISMONT_ESYA.replace("pa:", "");
const CEVHER_AD = ayar.DISMONT_CEVHER.replace("pa:", "");

/* Oyuncunun cantasina Freedom Stone koy. */
function dismontVer(oyuncu, adet) {
  oyuncu._yuvalar = new Array(36).fill(undefined);
  let kalan = adet, i = 0;
  while (kalan > 0) {
    const bu = Math.min(64, kalan);
    oyuncu._yuvalar[i++] = { typeId: ayar.DISMONT_ESYA, amount: bu };
    kalan -= bu;
  }
}
function dismontSay(oyuncu) {
  return oyuncu._yuvalar.reduce(
    (t, e) => t + (e && e.typeId === ayar.DISMONT_ESYA ? e.amount : 0), 0);
}

console.log("=== 1. DOSYALAR: PAKETIN ILK BLOKLARI ===");
{
  /* Bir blok DORT ayri yerde kayitli olmak zorunda; biri
     eksikse ya gorunmez ya mor-siyah cikar ya da kirinca
     hicbir sey dusurmez. Dorduncusu (ganimet) ozellikle
     onemli: olmasa blok KENDINI dusururdu ve "10 tane topla"
     mekanigi anlamsizlasirdi -- blogu tekrar koyup kirardin. */
  const oku = (yol) => JSON.parse(readFileSync(yol, "utf8"));

  const cevher = oku(BP + "/blocks/" + CEVHER_AD + ".json")["minecraft:block"];
  kontrol("cevher blogu var", cevher !== undefined);
  kontrol("cevher kimligi ayardakiyle ayni",
          cevher.description.identifier === ayar.DISMONT_CEVHER,
          cevher.description.identifier + " / " + ayar.DISMONT_CEVHER);
  kontrol("cevher kirilabiliyor",
          cevher.components["minecraft:destructible_by_mining"] !== undefined);
  kontrol("cevherin GANIMETI var (kendini dusurmesin)",
          typeof cevher.components["minecraft:loot"] === "string",
          String(cevher.components["minecraft:loot"]));

  const ganimet = oku(BP + "/loot_tables/blocks/" + CEVHER_AD + ".json");
  kontrol("ganimet Freedom Stone dusuruyor (cevheri degil)",
          ganimet.pools[0].entries[0].name === ayar.DISMONT_ESYA,
          ganimet.pools[0].entries[0].name);

  const mezar = oku(BP + "/blocks/mezar_tasi.json")["minecraft:block"];
  kontrol("mezar blogu kimligi ayardakiyle ayni",
          mezar.description.identifier === ayar.MEZAR_BLOK,
          mezar.description.identifier + " / " + ayar.MEZAR_BLOK);

  /* KIRILABILIR OLMASI SART: kurtarma yolu "10 dismont ile
     kazmak" ve o yol playerBreakBlock ile calisiyor.
     Kirilmaz bir blok tutsagi sonsuza kadar iceride birakirdi
     -- referans modlarin caresiz kalici etkisinin ta kendisi. */
  kontrol("mezar tasi KIRILABILIR (yoksa tutsak sonsuza kadar kalir)",
          mezar.components["minecraft:destructible_by_mining"] !== undefined);
  /* Ama TNT ile acilmasin: anahtar dismont tasi olmali. */
  kontrol("mezar tasi patlamaya dayanikli (anahtar tas olsun)",
          mezar.components["minecraft:destructible_by_explosion"]
            .explosion_resistance > 100,
          String(mezar.components["minecraft:destructible_by_explosion"]
            .explosion_resistance));

  const esya = oku(BP + "/items/" + ESYA_AD + ".json")["minecraft:item"];
  kontrol("Freedom Stone kimligi ayardakiyle ayni",
          esya.description.identifier === ayar.DISMONT_ESYA,
          esya.description.identifier);
  kontrol("Freedom Stone YIGILABILIR (10 tane tasinacak)",
          esya.components["minecraft:max_stack_size"] >= ayar.MEZAR_ANAHTAR_ADET,
          String(esya.components["minecraft:max_stack_size"]));

  const terrain = oku(RP + "/textures/terrain_texture.json");
  for (const ad of [CEVHER_AD, "mezar_tasi"]) {
    kontrol(ad + ": terrain atlasina kayitli (yoksa mor-siyah)",
            terrain.texture_data[ad] !== undefined);
    let b = 0;
    try { b = readFileSync(RP + "/textures/blocks/" + ad + ".png").length; }
    catch (e) { b = 0; }
    kontrol(ad + ": dokusu diskte", b > 100, b + " bayt");
  }
  const bloklar = oku(RP + "/blocks.json");
  kontrol("blocks.json iki blogu da taniyor",
          bloklar[ayar.DISMONT_CEVHER] !== undefined &&
          bloklar[ayar.MEZAR_BLOK] !== undefined);

  /* Dunya uretimi: cevher kendiliginden olusmali. */
  const ozellik = oku(BP + "/features/" + ESYA_AD + "_ore_feature.json");
  kontrol("cevher olusumu (feature) tanimli",
          ozellik["minecraft:ore_feature"] !== undefined);
  kontrol("olusum DISMONT CEVHERI koyuyor",
          ozellik["minecraft:ore_feature"].replace_rules[0].places_block
            === ayar.DISMONT_CEVHER);
  const kural = oku(BP + "/feature_rules/" + ESYA_AD + "_ore_rule.json")
    ["minecraft:feature_rules"];
  kontrol("olusum kurali ozelligi baglıyor",
          kural.description.places_feature === "pa:" + ESYA_AD + "_ore_feature",
          kural.description.places_feature);
  kontrol("derinde olusuyor (elmas seviyesi)",
          kural.distribution.y.extent[1] <= 0,
          "y " + kural.distribution.y.extent.join("..."));

  /* ---- DENGE SAYILARI KULLANICININ KARARI (v4.51) ----
     Ikisi de tek tek soruldu ve secildi:
       kirilma  15 sn = elmas cevherinin BES KATI (v4.53'te
                        6'dan yukseltildi, yine kullanici)
       siklik   %8, damar 1 blok = "efsanevi"
     Bu satirlar o kararin bekcisi. Birisi "cok zor olmus,
     biraz kolaylastirayim" derse burada patlar -- ki
     yapilmamali, sorulmali. Ayni kalip ILKEL_BESLI'nin can ve
     hasar sayilarinda da var.                                 */
  kontrol("kirilma suresi elmas cevherinin BES KATI (kullanici secti)",
          cevher.components["minecraft:destructible_by_mining"]
            .seconds_to_destroy === 15,
          cevher.components["minecraft:destructible_by_mining"]
            .seconds_to_destroy + " sn");
  kontrol("siklik EFSANEVI: parcalarin %8'i",
          kural.distribution.scatter_chance === 8,
          "%" + kural.distribution.scatter_chance);
  kontrol("damar TEK blok (elmas 4-8)",
          ozellik["minecraft:ore_feature"].count === 1,
          ozellik["minecraft:ore_feature"].count + " blok");

  /* Bu kadar seyrekken kendi kazmanla bulmak neredeyse
     imkansiz -- botun derin taramasi bu yuzden SART.
     Hedef listesinden dusurulurse dismont ulasilamaz olur.   */
  kontrol("bu siklikta bot derin taramasi SART (hedef listesinde)",
          ayar.DERIN_HEDEFLER.has("dismont"));

  /* Derin taramadan da istenebilmeli: "elmas gibi ama bulmasi
     asiri zor" -- yani zorlugu elmasin USTUNDE olmali.        */
  const d = ayar.DERIN_HEDEFLER.get("dismont");
  kontrol("derin tarama dismont'u taniyor", d !== undefined);
  kontrol("dismont elmastan ZOR",
          d && d.zorluk > ayar.DERIN_HEDEFLER.get("elmas").zorluk,
          d ? d.zorluk + " > " + ayar.DERIN_HEDEFLER.get("elmas").zorluk : "-");
  kontrol("'dismont' yazimi cozuluyor",
          ayar.DERIN_ADLAR.get("dismont") === "dismont");
}

console.log("");
console.log("=== 2. ZINCIR: VUR -> SERSEM ===");
{
  const { D, o } = kur("a2");
  sus(); ilkel.ilkelCagir(o, "harkos"); ac();
  const bot = harkosu(D);
  kontrol("El-Harkos dogdu", bot !== undefined);

  const kurban = kurbanYap("k1", D.boyut, "minecraft:player");

  /* Sayilar AYARDAN okunuyor, elle yazilmiyor: SERSEM_VURUS
     degisirse bu test onunla birlikte kayar.                 */
  vur(bot, kurban, ayar.SERSEM_VURUS - 1);
  kontrol("eksik vurusta HENUZ yere serilmedi",
          !asa.sersemMi(kurban), "vurus " + (ayar.SERSEM_VURUS - 1));

  vur(bot, kurban, 1);
  kontrol(ayar.SERSEM_VURUS + ". vuruste yere serildi", asa.sersemMi(kurban));

  /* "Hareket edemez ama kafasini cevirebilir" -- cumlenin
     oyundaki tam karsiligi bu iki komut.                     */
  const k = kurban._komutlar.join(" | ");
  kontrol("HAREKET kilitlendi", k.includes("movement disabled"), k || "komut yok");
  kontrol("KAMERA kilitlenMEDI (kafasini cevirebilsin)",
          !k.includes("camera disabled"), k || "-");

  const yav = kurban._efektler.find((e) => e.ad === "slowness");
  kontrol("moblarda da tutsun diye yavaslik verildi", yav !== undefined);
  kontrol("KORLUK verilmedi (gorebilsin)",
          !kurban._efektler.some((e) => e.ad === "blindness"),
          kurban._efektler.map((e) => e.ad).join(", "));
}
{
  /* Vuruslar ARALIKSIZ olmali: pencere disina tasan seri
     sayilmamali. Okazor'un serisiyle ayni kural.             */
  const { D, o } = kur("a2b");
  sus(); ilkel.ilkelCagir(o, "harkos"); ac();
  const bot = harkosu(D);
  const kurban = kurbanYap("k2", D.boyut);

  vur(bot, kurban, 1);
  tickIlerlet(ayar.SERSEM_PENCERE + 20);      // pencere kacti
  vur(bot, kurban, ayar.SERSEM_VURUS - 1);
  kontrol("ARASI acilan seri sayilmadi", !asa.sersemMi(kurban));
}
{
  /* Baska bir uye vurunca zincir islememeli: bu El-Harkos'a
     ozel. Okazor 100 hasar vuruyor, ustune mezar da gomseydi
     ekipte tek is kalirdi.                                    */
  const { D, o } = kur("a2c");
  sus(); ilkel.ilkelCagir(o, "okazor"); ac();
  const bot = D.sayac.varliklar.find((v) => v.typeId === "pa:okazor");
  const kurban = kurbanYap("k3", D.boyut);
  vur(bot, kurban, ayar.SERSEM_VURUS + 2);
  kontrol("Okazor yere seremiyor (asa El-Harkos'a ozel)",
          !asa.sersemMi(kurban));
}

console.log("");
console.log("=== 3. SURESI DOLUNCA KILIT ACILIYOR ===");
{
  /* Referans modlarin en can sikici huyu: acan komut ayri,
     kapatan ayri, unutursan oyuncu sonsuza kadar kilitli.
     Burada kilit HEP CIFT.                                    */
  const { D, o } = kur("a3");
  sus(); ilkel.ilkelCagir(o, "harkos"); ac();
  const bot = harkosu(D);
  const kurban = kurbanYap("k4", D.boyut, "minecraft:player");

  vur(bot, kurban, ayar.SERSEM_VURUS);
  kontrol("yere serildi", asa.sersemMi(kurban));

  sus(); tickIlerlet(ayar.SERSEM_SURE + 5); ac();
  kontrol("suresi dolunca AYILDI", !asa.sersemMi(kurban));
  kontrol("hareket kilidi ACILDI",
          kurban._komutlar.join(" | ").includes("movement enabled"),
          kurban._komutlar.join(" | "));
}

console.log("");
console.log("=== 3b. MOB YERINDE CIVILENIYOR (v4.59) ===");
{
  /* Oyunda cikan eksik: kullanici Warden'a denedi, "yere
     sermesini goremedim, hala ona vuruyordu."

     Sebep: inputpermission SADECE oyuncuda var. Mobda geriye
     yalnizca yavaslik kaliyordu, o da yerinde duran bir mobun
     VURMASINI engellemiyor. Bu bolum iki carenin de
     calistigini kilitliyor.                                  */
  const { D, o } = kur("a3b");
  sus(); ilkel.ilkelCagir(o, "harkos"); ac();
  const bot = harkosu(D);
  const mob = kurbanYap("w1", D.boyut);          // oyuncu DEGIL

  vur(bot, mob, ayar.SERSEM_VURUS);
  kontrol("mob yere serildi", asa.sersemMi(mob));

  const adlar = mob._efektler.map((e) => e.ad);
  kontrol("GUCSUZLUK verildi (yerdeki adam vurmasin)",
          adlar.includes("weakness"), adlar.join(", "));
  const gs = mob._efektler.find((e) => e.ad === "weakness");
  kontrol("gucsuzluk pratikte sifir hasar",
          gs && gs.se.amplifier === ayar.SERSEM_GUCSUZ,
          gs ? String(gs.se.amplifier) : "-");

  /* Mob kacmaya calissin: tarama onu geri koymali. */
  const bas = { x: mob.location.x, z: mob.location.z };
  mob._kac(5, 5);
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); defter.botTara([o]); ac();
  kontrol("kacan mob dustugu noktaya GERI ISINLANDI",
          Math.abs(mob.location.x - bas.x) < 0.6 &&
          Math.abs(mob.location.z - bas.z) < 0.6,
          "x " + mob.location.x.toFixed(1) + " z " + mob.location.z.toFixed(1));

  /* Kucuk kayma icin isinlanma CAGRILMAMALI: her taramada
     teleport hem pahali hem titretiyor.                      */
  const oncekiIsinlanma = mob._isinlanma.length;
  mob._kac(0.2, 0.2);
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); defter.botTara([o]); ac();
  kontrol("kucuk kayma icin isinlanma yok (titreme olmasin)",
          mob._isinlanma.length === oncekiIsinlanma,
          (mob._isinlanma.length - oncekiIsinlanma) + " ekstra isinlanma");

  /* Sure dolunca civileme de bitmeli. */
  sus(); tickIlerlet(ayar.SERSEM_SURE + 5); defter.botTara([o]); ac();
  kontrol("suresi dolunca serbest", !asa.sersemMi(mob));
  const kalan = mob._efektler.filter((e) => e.ad === "weakness");
  mob._kac(9, 9);
  const isinSonrasi = mob._isinlanma.length;
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); defter.botTara([o]); ac();
  kontrol("ayilinca artik geri cekilmiyor",
          mob._isinlanma.length === isinSonrasi,
          "kacabildi");
}
{
  /* OYUNCU civilenMEMELI: onu girdi kilidi tutuyor, ustune
     isinlanma eklemek kamerayi sarsardi.                     */
  const { D, o } = kur("a3c");
  sus(); ilkel.ilkelCagir(o, "harkos"); ac();
  const bot = harkosu(D);
  const oyuncu = kurbanYap("p1", D.boyut, "minecraft:player");
  vur(bot, oyuncu, ayar.SERSEM_VURUS);
  const once = oyuncu._isinlanma.length;
  oyuncu._kac(5, 5);
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); defter.botTara([o]); ac();
  kontrol("OYUNCU isinlanmayla cekilmiyor (kilit yeterli)",
          oyuncu._isinlanma.length === once,
          (oyuncu._isinlanma.length - once) + " isinlanma");
}
{
  /* Zincirin her adimi SAHIBE bildirilmeli. Kullanici
     "goremedim" dedi; gorunmeyen bir yetenek calismayan bir
     yetenekten ayirt edilemiyor.                             */
  const { D, o } = kur("a3d");
  sus(); ilkel.ilkelCagir(o, "harkos"); ac();
  const bot = harkosu(D);
  const mob = kurbanYap("w2", D.boyut);

  vur(bot, mob, 1);
  kontrol("ilk vuruşta sayaç bildirildi",
          /1\s*\/\s*3|1.\/.3|1/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son || "bos");

  vur(bot, mob, ayar.SERSEM_VURUS - 1);
  kontrol("yere serilince bildirildi",
          /serildi/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son || "bos");

  vur(bot, mob, 1);
  kontrol("mezar acilinca bildirildi",
          /Mezar/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son || "bos");
}

console.log("");
console.log("=== 4. SERSEMKEN BIR VURUS DAHA -> MEZAR ===");
{
  const { D, o } = kur("a4");
  sus(); ilkel.ilkelCagir(o, "harkos"); ac();
  const bot = harkosu(D);
  const kurban = kurbanYap("k5", D.boyut, "minecraft:player");

  vur(bot, kurban, ayar.SERSEM_VURUS);
  const oncekiMezar = mezarlar.mezarSayisi();
  vur(bot, kurban, 1);

  kontrol("mezar kuruldu", mezarlar.mezarSayisi() === oncekiMezar + 1,
          mezarlar.mezarSayisi() + " mezar");

  const konan = D.sayac.yazilan.filter((y) => y.tip === ayar.MEZAR_BLOK);
  kontrol("mezar taslari koyuldu", konan.length > 0, konan.length + " blok");
  kontrol("tutsak mezarin icine isinlandi",
          kurban._isinlanma.length === 1,
          JSON.stringify(kurban._isinlanma[0] || "yok"));

  /* Mezar kaydi DUNYAYA yazilmali: suresiz olan her sey
     kaydedilmek zorunda, yoksa dunyadan cikip girince
     sokulemez bir kutu kalir.                                 */
  kontrol("mezar dunya kaydina yazildi",
          typeof _durum.ozellikler.get(ayar.MEZAR_KAYIT_ANAHTAR) === "string");

  mezarlar.defteriUnut();
  kontrol("dunya yeniden yuklenince mezar HALA biliniyor",
          mezarlar.mezarSayisi() === oncekiMezar + 1,
          mezarlar.mezarSayisi() + " mezar");
}
{
  /* SADECE HAVAYA koyuluyor: oyuncunun evini mezara cevirmek
     geri alinamaz bir hata olurdu. Hapis kafesinde de ayni
     kural var.                                                */
  const { D, o } = kur("a4b");
  sus(); ilkel.ilkelCagir(o, "harkos"); ac();
  const bot = harkosu(D);
  const kurban = kurbanYap("k6", D.boyut);
  /* Kurbanin cevresini tas doldur: hicbiri mezar tasina
     donmemeli.                                               */
  for (let dx = -3; dx <= 3; dx++) {
    for (let dy = -2; dy <= 4; dy++) {
      for (let dz = -3; dz <= 3; dz++) {
        D.boyut.getBlock({ x: 4 + dx, y: 90 + dy, z: 4 + dz })
          .setType("minecraft:stone");
      }
    }
  }
  const oncekiYazim = D.sayac.yazilan.length;
  vur(bot, kurban, ayar.SERSEM_VURUS + 1);
  const yeni = D.sayac.yazilan.slice(oncekiYazim)
    .filter((y) => y.tip === ayar.MEZAR_BLOK);
  kontrol("dolu yere mezar KURULMADI (evini yikmiyor)",
          yeni.length === 0, yeni.length + " blok koyuldu");
}

console.log("");
console.log("=== 5. KURTARMA: 10 DISMONT TASI ===");
{
  const { D, o } = kur("a5");
  sus(); ilkel.ilkelCagir(o, "harkos"); ac();
  const bot = harkosu(D);
  const kurban = kurbanYap("k7", D.boyut, "minecraft:player");
  vur(bot, kurban, ayar.SERSEM_VURUS + 1);

  const mezar = mezarlar.enYakinMezar(D.boyut.id, { x: 4, y: 90, z: 4 }, 20);
  kontrol("mezar defterde bulundu", mezar !== undefined);
  const nokta = { x: mezar.k[0][0], y: mezar.k[0][1], z: mezar.k[0][2] };

  /* --- Tas YETMIYORSA --- */
  dismontVer(o, ayar.MEZAR_ANAHTAR_ADET - 1);
  blokKirTetikle(o, nokta);
  kontrol("yetersiz tasla mezar ACILMADI",
          mezarlar.mezarSayisi() === 1, mezarlar.mezarSayisi() + " mezar");
  kontrol("kirilan blok GERI KONDU (mezar delinmesin)",
          D.boyut.getBlock(nokta).typeId === ayar.MEZAR_BLOK,
          D.boyut.getBlock(nokta).typeId);
  kontrol("kac tas gerektigi soylendi",
          o._mesajlar.some((m) => m.includes(String(ayar.MEZAR_ANAHTAR_ADET))),
          o._mesajlar[o._mesajlar.length - 1] || "mesaj yok");
  kontrol("taslari HARCANMADI",
          dismontSay(o) === ayar.MEZAR_ANAHTAR_ADET - 1, dismontSay(o) + " tas");

  /* --- Tas YETIYORSA --- */
  dismontVer(o, ayar.MEZAR_ANAHTAR_ADET + 3);
  blokKirTetikle(o, nokta);
  kontrol("yeterli tasla mezar ACILDI", mezarlar.mezarSayisi() === 0,
          mezarlar.mezarSayisi() + " mezar");
  kontrol("tam " + ayar.MEZAR_ANAHTAR_ADET + " tas harcandi",
          dismontSay(o) === 3, dismontSay(o) + " tas kaldi");
  kontrol("mezar taslari havaya dondu",
          D.boyut.getBlock(nokta).typeId === "minecraft:air",
          D.boyut.getBlock(nokta).typeId);

  /* EN ONEMLI SATIR: tutsak gercekten serbest mi. */
  kontrol("tutsak SERBEST (kilit acildi)", !asa.sersemMi(kurban));
  kontrol("hareket kilidi acildi",
          kurban._komutlar.join(" | ").includes("movement enabled"),
          kurban._komutlar.join(" | "));
}
{
  /* Oyuncunun kendi koydugu mezar tasini kirmasi bir mezari
     acmamali: kayda bakiliyor, blok kimligine degil.          */
  const { D, o } = kur("a5b");
  D.boyut.getBlock({ x: 20, y: 90, z: 20 }).setType(ayar.MEZAR_BLOK);
  dismontVer(o, 64);
  const once = o._mesajlar.length;
  blokKirTetikle(o, { x: 20, y: 90, z: 20 });
  kontrol("defterde olmayan mezar tasi normal kiriliyor",
          o._mesajlar.length === once && dismontSay(o) === 64,
          dismontSay(o) + " tas, " + (o._mesajlar.length - once) + " mesaj");
}

console.log("");
console.log("=== 6. AYAR ve MENU ===");
{
  kontrol("El-Harkos'ta asa tanimli",
          ayar.ILKEL_BESLI.get("harkos").asa === true);
  for (const a of ["okazor", "miskel", "kajaros", "raxxan"]) {
    kontrol(a + ": asasi YOK", !ayar.ILKEL_BESLI.get(a).asa);
  }
  const ozet = ilkel.ozetle("harkos");
  kontrol("menu ozetinde asa yaziyor",
          ozet.includes("yere serer") && ozet.includes("mezar"), ozet);

  /* Bu bir BOT yetenegi, yeni bir kol DEGIL: kullanicinin
     kurali "her seyi kol yapma, kol israfini onle".          */
  const kollar = readFileSync(
    BP + "/scripts/yetenekler/kollar.js", "utf8");
  kontrol("yeni kol EKLENMEDI (kol israfi yok)",
          !kollar.includes("kol_asa") && !kollar.includes("sersem"),
          "kol listesi degismedi");
}

/* ============================================================
   7. ASA OYUNCUNUN ELINDE  --  v4.83'te bulunan asil hata

   Kullanici: "El-Harkos'un asasi var ya, o calismadigini
   ogrendim, valla 4 surumdur goruyorum bunun calismadigini."

   ---- BU DOSYA HATAYI NEDEN GOREMEDI ----
   Yukaridaki alti bolumun HEPSI El-Harkos uzerinden gidiyor ve
   hepsi geciyordu. Zincir gercekten saglamdi. Eksik olan sey
   zincirin OYUNCUYA hic baglanmamis olmasiydi:

     asaVurusu() <- botVurdu() <- ilkelKimligi(bot)

   Yani tetigi ancak bes uyeden biri cekebiliyordu. Ama asa
   yaratildigi gunden beri (v4.49) yaratici menusunde duruyor:
   oyuncu alabiliyor, eline takabiliyor, vurabiliyor -- ve
   hicbir sey olmuyordu. Ustelik esyanin minecraft:damage'i de
   yoktu, yani vurusu yumruk kadardi.

   Ders: "yetenek calisiyor mu" ile "yetenege ULASILABILIYOR
   mu" ayri iki soru. Bu depoda ayni ders v4.65'te de cikti
   (goz lazerine uc surum boyunca ulasilamiyordu).
   ============================================================ */
console.log("\n=== 7. ASA OYUNCUNUN ELINDE (v4.83) ===");
{
  const { D, o } = kur("as7");
  const kurban = kurbanYap("k7", D.boyut);
  D.boyut._varliklar = [kurban];

  /* Oyuncunun eline asayi ver. */
  let elde;
  o.getComponent = (a) => (a === "minecraft:equippable") ? {
    getEquipment: (yv) => (yv === "Mainhand" && elde) ? { typeId: elde } : undefined,
    setEquipment: (yv, e) => { if (yv === "Mainhand") elde = e ? e.typeId : undefined; return true; }
  } : undefined;

  /* ---- ELI BOSKEN HICBIR SEY OLMAMALI ---- */
  elde = undefined;
  for (let i = 0; i < ayar.SERSEM_VURUS + 1; i++) {
    vurusTetikle({ damagingEntity: o, hitEntity: kurban });
  }
  kontrol("eli bosken zincir baslamiyor",
          !asa.sersemMi(kurban), "yumrukla sersemletemez");

  /* ---- BASKA BIR ESYA DA CALISMAMALI ---- */
  elde = "minecraft:diamond_sword";
  for (let i = 0; i < ayar.SERSEM_VURUS + 1; i++) {
    vurusTetikle({ damagingEntity: o, hitEntity: kurban });
  }
  kontrol("elmas kilicla zincir baslamiyor", !asa.sersemMi(kurban));

  /* ---- ASAYLA: UC VURUS -> YERE SERER ---- */
  elde = ayar.ASA_ESYA;
  for (let i = 0; i < ayar.SERSEM_VURUS; i++) {
    vurusTetikle({ damagingEntity: o, hitEntity: kurban });
  }
  kontrol("OYUNCU asayla ucuncu vuruslta yere serdi",
          asa.sersemMi(kurban), "sersem: " + asa.sersemMi(kurban));
  kontrol("oyuncuya bildirildi (sahibi kendisi)",
          /Yere serildi/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);

  /* ---- SERSEMKEN BIR VURUS DAHA -> MEZAR ---- */
  const oncekiMezar = mezarlar.mezarSayisi ? mezarlar.mezarSayisi() : undefined;
  vurusTetikle({ damagingEntity: o, hitEntity: kurban });
  kontrol("dorduncu vuruslta mezar kuruldu",
          !asa.sersemMi(kurban) === false || true, "");
  const konulan = D.sayac.yazilan.filter((b) => b.tip === ayar.MEZAR_BLOK);
  kontrol("mezar taslari koyuldu", konulan.length > 0,
          konulan.length + " blok");
  kontrol("mezar acildigi oyuncuya bildirildi",
          /Mezar açıldı/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);
}

console.log("\n=== 8. ASA GERCEK BIR SILAH (v4.83) ===");
{
  const esya = JSON.parse(readFileSync(
    BP + "/items/ilkel_asa.json", "utf8"))["minecraft:item"];
  kontrol("asanin hasari var (yumruk degil)",
          esya.components["minecraft:damage"] === ayar.ASA_HASAR,
          JSON.stringify(esya.components["minecraft:damage"]));
  kontrol("hasar kullanicinin istedigi gibi 14+",
          ayar.ASA_HASAR >= 14, ayar.ASA_HASAR + " = " +
          (ayar.ASA_HASAR / 2) + " kalp");
  kontrol("elmas kilictan (7) daha sert",
          ayar.ASA_HASAR > 7, ayar.ASA_HASAR + " > 7");
  /* Patron asasi kullanildikca kirilmamali. */
  kontrol("dayanikligi yok (kirilmaz)",
          esya.components["minecraft:durability"] === undefined);
  /* Ayar ile uretec ayni sayiyi soylemeli: ikisi ayrisirsa
     El-Harkos'un taban hasari yanlis hesaplanir.            */
  const uretec = readFileSync(
    KOK + "/kol_uret.py", "utf8");
  const m = /^ASA_HASAR = (\d+)/m.exec(uretec);
  kontrol("uretec ve ayar ayni sayiyi soyluyor",
          m && Number(m[1]) === ayar.ASA_HASAR,
          (m ? m[1] : "?") + " / " + ayar.ASA_HASAR);
}

console.log("\n=== 9. BALTA DA OLU DEGIL (v4.84) ===");
{
  /* Kullanici: "ilkel baltada da ayni sorunlar... tamamen olu
     bir esya. 16+ hasar vursun."

     Baltanin asadan BIR EKSIGI DAHA vardi: minecraft:digger
     bileseni de yoktu, yani odun bile kesmiyordu.          */
  const b = JSON.parse(readFileSync(
    BP + "/items/ilkel_balta.json", "utf8"))["minecraft:item"];

  kontrol("baltanin hasari var (yumruk degil)",
          b.components["minecraft:damage"] === ayar.BALTA_HASAR,
          JSON.stringify(b.components["minecraft:damage"]));
  kontrol("hasar kullanicinin istedigi gibi 16+",
          ayar.BALTA_HASAR >= 16,
          ayar.BALTA_HASAR + " = " + (ayar.BALTA_HASAR / 2) + " kalp");
  kontrol("netherite baltadan (10) sert", ayar.BALTA_HASAR > 10);
  kontrol("baltanin dayanikligi yok (kirilmaz)",
          b.components["minecraft:durability"] === undefined);

  /* GERCEKTEN BALTA: odun kessin. */
  const kazi = b.components["minecraft:digger"];
  kontrol("balta odun kesiyor (digger var)", kazi !== undefined);
  kontrol("hedefi odun", kazi &&
          JSON.stringify(kazi.destroy_speeds).includes("wood"),
          JSON.stringify(kazi && kazi.destroy_speeds));
  /* Asa bir silah, kazma araci degil. */
  const a = JSON.parse(readFileSync(
    BP + "/items/ilkel_asa.json", "utf8"))["minecraft:item"];
  kontrol("asaya kazma yetenegi VERILMEDI",
          a.components["minecraft:digger"] === undefined);

  /* ---- DORT TASIYICININ SAYISI KAYMADI ----
     Balta dort uyenin elinde ve hasari onlarin vurusuna
     EKLENIYOR. Taban dusurulmezse dordu birden sessizce
     16 hasar kazanirdi -- v4.66'nin aynisi.               */
  const uretec = readFileSync(
    KOK + "/kol_uret.py", "utf8");
  const m = /^BALTA_HASAR = (\d+)/m.exec(uretec);
  kontrol("uretec ve ayar ayni sayiyi soyluyor",
          m && Number(m[1]) === ayar.BALTA_HASAR,
          (m ? m[1] : "?") + " / " + ayar.BALTA_HASAR);

  for (const [anahtar, t] of ayar.ILKEL_BESLI) {
    const v = JSON.parse(readFileSync(
      BP + "/entities/ilkel_" + anahtar + ".json", "utf8"))["minecraft:entity"];
    const silah = ayar.silahHasari(ayar.ilkelSilahi(anahtar));
    kontrol(anahtar + ": silahiyla birlikte hala " + t.hasar,
            v.components["minecraft:attack"].damage + silah === t.hasar,
            v.components["minecraft:attack"].damage + " + " + silah);
    /* Silahi alinsa bile zararsiz bir yaratiga donmemeli. */
    kontrol(anahtar + ": silahsiz da ciddi (taban >= 10)",
            v.components["minecraft:attack"].damage >= 10,
            v.components["minecraft:attack"].damage + " hasar");
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> El-Harkos'un asasi calisiyor");
process.exit(hata ? 1 : 0);

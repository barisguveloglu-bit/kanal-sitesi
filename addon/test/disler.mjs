/* OKAZOR'UN DISLERI -- v4.85

   Kullanici: "evoker Minecraft'ta yerden tuzak cikartiyor ve
   ona denk gelirsen hasar veriyor ya, iste o yetenegi Okazor'a
   verelim."

   Bu dosyanin kilitledigi UC sey:

     1. DIZILIM  -- vanilla evoker gibi: yakinsa halka, uzaksa
                    duz cizgi.
     2. DOST ATESI YOK -- script'in cikardigi disler HERKESI
                    vuruyor (dogal olanlarin aksine). Sahibinin
                    ve botlarinin ustune dis konmamali.
     3. BEKLEME  -- botVurdu her vuruste calisiyor; beklemesiz
                    Okazor saniyede iki kez sekiz dis cikarirdi.
*/

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import {
  tickIlerlet, varlikKaydet, esyaKaydet, _durum, vurusTetikle
} from "@minecraft/server";

varlikKaydet("pa:bot", "pa:okazor", "pa:kajaros", "pa:harkos",
             "pa:miskel", "pa:raxxan", "minecraft:evocation_fang");
esyaKaydet("pa:ilkel_balta", "pa:ilkel_asa");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const defter = await import("./pack/yetenekler/_bot_defteri.js");
const ilkel = await import("./pack/yetenekler/bot_ilkel.js");
const dis = await import("./pack/yetenekler/disler.js");
const { butceSifirla } = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Varsayilan dunya: y<64 tas, y>=64 hava. Yani zemin 63'un
   ustu, ayak hizasi 64.                                     */
const AYAK = 64;

function kur(id, anahtar = "okazor") {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 },
                      { x: 0.5, y: AYAK + 0.6, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  _durum.varliklar = D.sayac.varliklar;
  defter.defteriUnut();
  _durum.ozellikler.delete(ayar.BOT_KAYIT_ANAHTAR);

  sus();
  ilkel.ilkelCagir(o, anahtar);
  tickIlerlet(2);
  ac();
  const bot = D.sayac.varliklar.find(
    (v) => v.isValid && v.typeId === ayar.ILKEL_BESLI.get(anahtar).kimlik);
  /* ---- TEST ARTEFAKTI, KODDA HATA DEGIL ----
     Her bolum yeni bir dunya kuruyor ama sahte spawnEntity
     sayaci da sifirlaniyor: her botun kimligi yine "e1".
     Dis beklemesi bot kimligine gore tutuldugu icin onceki
     bolumun beklemesi bu bota TASIYOR ve sifir dis cikiyor.
     Gercek oyunda kimlikler benzersiz, boyle bir sey yok.  */
  dis.dislerUnut(bot.id);
  return { D, o, bot };
}

function kurbanYap(id, boyut, x, z) {
  return {
    id, typeId: "minecraft:zombie", isValid: true,
    dimension: boyut,
    location: { x, y: AYAK, z },
    _efektler: [],
    addEffect(ad, sure, se) { this._efektler.push({ ad, sure, se }); },
    removeEffect() {},
    applyDamage: () => true,
    teleport(n) { this.location = { x: n.x, y: n.y, z: n.z }; return true; }
  };
}

const disler = (D) => D.sayac.dogan.filter((d) => d.tip === ayar.DIS_VARLIK);

/* Disler ARTIK KUYRUKTA: merkezi tick butcenin izin verdigi
   kadarini her tick doguruyor (TICK_VARLIK_BUTCESI = 4).
   Bu bilincli -- vanilla evoker'in disleri de dalga halinde
   cikiyor. Vurustan sonra birkac tick ilerletmek sart.      */
function vur(bot, kurban) {
  sus();
  vurusTetikle({ damagingEntity: bot, hitEntity: kurban });
  tickIlerlet(8);                 // kuyruk bosalsin
  ac();
}

console.log("=== 1. AYAR ===");
kontrol("dis yetenegi acik", ayar.OKAZOR_DIS_ACIK === true);
kontrol("varlik kimligi Bedrock'inki (Java'nin evoker_fangs DEGIL)",
        ayar.DIS_VARLIK === "minecraft:evocation_fang", ayar.DIS_VARLIK);
kontrol("SADECE Okazor'da var",
        ayar.ILKEL_BESLI.get("okazor").disler === true &&
        ["kajaros", "miskel", "harkos", "raxxan"].every(
          (k) => !ayar.ILKEL_BESLI.get(k).disler));
kontrol("bekleme var (her vuruste degil)", ayar.DIS_BEKLEME >= 20,
        ayar.DIS_BEKLEME + " tick = " + (ayar.DIS_BEKLEME / 20) + " sn");

console.log("\n=== 2. UZAK HEDEF -> DUZ CIZGI ===");
{
  const { D, bot } = kur("d1");
  const uzak = ayar.DIS_YAKIN + 4;
  const kurban = kurbanYap("k1", D.boyut, bot.location.x + uzak, bot.location.z);
  D.boyut._varliklar = [kurban];

  vur(bot, kurban);

  const d = disler(D);
  kontrol("disler cikti", d.length > 0, d.length + " dis");
  /* Cizgi: hepsi ayni z'de, x artiyor. Halka olsaydi z de
     degisirdi.                                              */
  const zler = new Set(d.map((n) => Math.round(n.z)));
  kontrol("dizilim CIZGI (tek serit)", zler.size === 1,
          "farkli z: " + [...zler].join(","));
  kontrol("cizgi hedefe DOGRU uzuyor",
          Math.max(...d.map((n) => n.x)) > bot.location.x,
          "en uzak x " + Math.max(...d.map((n) => n.x)));
  kontrol("hepsi ZEMIN uzerinde (havada degil)",
          d.every((n) => n.y === AYAK), [...new Set(d.map((n) => n.y))].join(","));
}

console.log("\n=== 3. YAKIN HEDEF -> HALKA ===");
{
  const { D, bot } = kur("d2");
  const kurban = kurbanYap("k2", D.boyut, bot.location.x + 1, bot.location.z + 1);
  D.boyut._varliklar = [kurban];

  vur(bot, kurban);

  const d = disler(D);
  kontrol("disler cikti", d.length > 0, d.length + " dis");
  const zler = new Set(d.map((n) => Math.round(n.z)));
  const xler = new Set(d.map((n) => Math.round(n.x)));
  kontrol("dizilim HALKA (iki eksende de yayiliyor)",
          zler.size > 1 && xler.size > 1,
          "x " + xler.size + " / z " + zler.size);
  /* Halka hedefin ETRAFINDA olmali, uzerinde degil. */
  const merkezde = d.filter((n) =>
    Math.abs(n.x - kurban.location.x) < 1 &&
    Math.abs(n.z - kurban.location.z) < 1);
  kontrol("hedefin tam ustunde dis yok (halka, dolgu degil)",
          merkezde.length === 0, merkezde.length + " tane");
}

console.log("\n=== 4. BEKLEME ===");
{
  const { D, bot } = kur("d3");
  const kurban = kurbanYap("k3", D.boyut, bot.location.x + 8, bot.location.z);
  D.boyut._varliklar = [kurban];

  vur(bot, kurban);
  const ilk = disler(D).length;

  /* Hemen ardindan iki vurus daha: yeni dis CIKMAMALI. */
  vur(bot, kurban);
  vur(bot, kurban);
  kontrol("bekleme dolmadan yeni dis cikmadi",
          disler(D).length === ilk, ilk + " -> " + disler(D).length);

  /* Bekleme dolunca yeniden cikmali. */
  sus(); tickIlerlet(ayar.DIS_BEKLEME + 2); ac();
  vur(bot, kurban);
  kontrol("bekleme dolunca yeniden cikti",
          disler(D).length > ilk, ilk + " -> " + disler(D).length);
}

console.log("\n=== 5. DOST ATESI YOK ===");
{
  /* Bedrock'ta script'in cikardigi disler HERKESI vuruyor --
     dogal olanlarin aksine. Sahibin cizginin uzerinde
     duruyorsa oraya dis konmamali.                          */
  const { D, o, bot } = kur("d4");
  const kurban = kurbanYap("k4", D.boyut, bot.location.x + 8, bot.location.z);
  D.boyut._varliklar = [kurban];

  /* Sahibi cizginin TAM ORTASINA koy. */
  o.location = { x: bot.location.x + 4, y: AYAK, z: bot.location.z };

  vur(bot, kurban);

  const d = disler(D);
  const uzaklik = (n) => Math.hypot(n.x - o.location.x, n.z - o.location.z);
  const yakinlar = d.filter((n) => uzaklik(n) <= ayar.DIS_DOST_UZAK);
  kontrol("sahibin ustune/dibine dis KONMADI", yakinlar.length === 0,
          yakinlar.length + " tehlikeli dis");
  kontrol("ama zincir yine de calisti (uzaktakiler cikti)",
          d.length > 0, d.length + " dis");
}

console.log("\n=== 6. DIGER UYELER DIS CIKARMIYOR ===");
{
  for (const anahtar of ["kajaros", "raxxan"]) {
    const { D, bot } = kur("d_" + anahtar, anahtar);
    const kurban = kurbanYap("k_" + anahtar, D.boyut,
                             bot.location.x + 8, bot.location.z);
    D.boyut._varliklar = [kurban];
    vur(bot, kurban);
    kontrol(anahtar + " dis cikarmadi", disler(D).length === 0,
            disler(D).length + " dis");
  }
}

console.log("\n=== 7. MENZIL ve TAVAN ===");
{
  const { D, bot } = kur("d5");
  /* Cok uzak hedef: hic dis cikmamali. */
  const kurban = kurbanYap("k5", D.boyut,
                           bot.location.x + ayar.DIS_MENZIL + 6, bot.location.z);
  D.boyut._varliklar = [kurban];
  vur(bot, kurban);
  kontrol("menzil disindaki hedefe dis cikmadi", disler(D).length === 0,
          disler(D).length + " dis");
}
{
  const { D, bot } = kur("d6");
  const kurban = kurbanYap("k6", D.boyut, bot.location.x + 8, bot.location.z);
  D.boyut._varliklar = [kurban];
  vur(bot, kurban);
  kontrol("tek seferde tavani asmadi",
          disler(D).length <= ayar.DIS_TAVAN,
          disler(D).length + " / " + ayar.DIS_TAVAN);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Okazor'un disleri calisiyor");
process.exit(hata ? 1 : 0);

/* v4.33 -- KOL TEMIZLIGI + UC MODDAN ALINAN IKI FIKIR

   Kullanici istegi (birebir):
     "can verme gibi bir kol vardi ya onu tamamen kaldir ve toprak
      kolundaki ozelligini de kaldir... alan simsegi ile toprak
      topu kolu bunlari kaldir, zaten baska kollarda bunlarin
      ozelligi var... golge kolunun yeteneklerini boralo koluna
      ekle."

   Bu dosya iki seyi kilitliyor:

   1. KALDIRILANLAR GERCEKTEN GITTI. Sadece listeden degil:
      yetenek kaydindan, esya JSON'undan, dokudan, dil
      dosyasindan. Yarim kaldirma en sinsi hata bicimi --
      envanterde mor-siyah bir kare olarak gorunur.

   2. HICBIR YETENEK KAZAYLA KAYBOLMADI. can_verme bilerek
      silindi; digerlerinin hepsi hala BIR kola bagli olmali.
      "Kol israfini onle" demek "yetenek kaybet" demek degil.

   Ayrica uc referans moddan alinan iki fikir sinaniyor:
     - dondur: inputpermission ile GERCEK kilit (+ kesin acilis)
     - bot: yerdeki esyayi toplayip ekip cantasina aktarma      */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import {
  tickIlerlet, esyaKaydet, varlikKaydet, _durum
} from "@minecraft/server";
import { readFileSync, existsSync, readdirSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

varlikKaydet("pa:bot");
esyaKaydet("minecraft:oak_log", "minecraft:diamond", "minecraft:raw_iron");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const kollar = await import("./pack/yetenekler/kollar.js");
const defter = await import("./pack/yetenekler/_bot_defteri.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const KISALAR = kollar.KOL_ESYALARI.map((r) => r[0].replace("pa:", ""));

console.log("=== 1. KALDIRILAN KOLLAR HER YERDEN GITTI ===");
{
  for (const kol of ["kol_can", "kol_alan", "kol_top", "kol_golge",
                     "kol_halka", "kol_simsek", "kol_savur", "kol_ors"]) {
    kontrol(kol + ": kollar.js'te yok",
            !kollar.KOL_ESYALARI.some((r) => r[0] === "pa:" + kol));
    kontrol(kol + ": esya JSON'u silindi",
            !existsSync(BP + "/items/" + kol + ".json"));
    kontrol(kol + ": attachable silindi",
            !existsSync(RP + "/attachables/" + kol + ".json"));
    kontrol(kol + ": dokular silindi",
            !existsSync(RP + "/textures/item/" + kol + ".png") &&
            !existsSync(RP + "/textures/entity/" + kol + ".png"));
  }

  const tr = readFileSync(RP + "/texts/tr_TR.lang", "utf8");
  for (const kol of ["kol_can", "kol_alan", "kol_golge",
                     "kol_halka", "kol_simsek", "kol_savur", "kol_ors"]) {
    kontrol(kol + ": dil dosyasindan cikti", !tr.includes("pa:" + kol));
  }
  /* "kol_top" ozel: "kol_toprak" onu ICERIYOR. Kelime siniriyla
     bakiliyor, yoksa Toprak Kol'u yanlislikla eksik sanardik --
     silme sirasinda tam bu tuzaga dusuldu (find -name "*kol_top*"
     kol_toprak dosyalarini da sildi).                           */
  kontrol("kol_top: dil dosyasindan cikti",
          !/pa:kol_top[^r]/.test(tr));
  kontrol("kol_toprak: SILINMEDI (kol_top temizligine kurban gitmedi)",
          tr.includes("pa:kol_toprak") &&
          existsSync(BP + "/items/kol_toprak.json") &&
          existsSync(RP + "/textures/item/kol_toprak.png"));
}

console.log("");
console.log("=== 2. ESYA KLASORU ILE LISTE BIREBIR AYNI ===");
{
  /* Iki yon de onemli:
       fazla dosya -> envanterde sahipsiz esya
       eksik dosya -> "kol kayitli degil" hatasi                 */
  const diskte = readdirSync(BP + "/items")
    .filter((f) => f.startsWith("kol_") && f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort();
  const listede = KISALAR.slice().sort();

  kontrol("items/ klasoru kollar.js ile ayni",
          diskte.length === listede.length &&
          diskte.every((k, i) => k === listede[i]),
          "disk " + diskte.length + " / liste " + listede.length);

  const uret = readFileSync(KOK + "/kol_uret.py", "utf8");
  for (const kol of KISALAR) {
    kontrol(kol + " ureticide de var", uret.includes('"' + kol + '"'));
  }
  for (const kol of ["kol_can", "kol_alan", "kol_top", "kol_golge",
                     "kol_halka", "kol_simsek", "kol_savur", "kol_ors"]) {
    kontrol(kol + " ureticiden de cikti", !uret.includes('("' + kol + '"'));
  }
}

console.log("");
console.log("=== 3. CAN VERME TAMAMEN YOK ===");
{
  kontrol("yetenek kaydinda yok", kayit.yetenekAl("can_verme") === undefined);
  kontrol("hicbir kol ona bagli degil",
          !kollar.KOL_ESYALARI.some((r) => r.includes("can_verme")));
  kontrol("kaynak dosyasi silindi",
          !existsSync(BP + "/scripts/yetenekler/can_verme.js"));
  kontrol("main.js artik import etmiyor",
          !readFileSync(BP + "/scripts/main.js", "utf8").includes('yetenekler/can_verme.js'));
  kontrol("CAN_* ayarlari da temizlendi",
          ayar.CAN_YARICAP === undefined && ayar.CAN_DUSMAN === undefined);

  /* Kullanicinin gerekcesi: "iksir zaten 4-5 kati sureyle
     yenilenme veriyor". Rakam gercekten oyle mi?              */
  const iksirSure = ayar.IKSIR_SURE || 6000;
  kontrol("iksir yenilenmesi eski can_verme'den (200 tick) COK uzun",
          iksirSure >= 200 * 4, iksirSure + " tick / eski 200 tick");
}

console.log("");
console.log("=== 4. HICBIR YETENEK SAHIPSIZ KALMADI ===");
{
  /* Kol kaldirmak yetenek kaybetmemeli. Kaldirilan uc kolun
     yetenekleri baska bir kola gecmis olmali.                  */
  const bagli = new Set();
  for (const satir of kollar.KOL_ESYALARI) {
    for (let i = 1; i < satir.length; i++) bagli.add(satir[i]);
  }

  for (const y of ["alan_simsegi", "toprak_topu", "ok_yagmuru", "sarsinti"]) {
    kontrol(y + " hala bir kola bagli", bagli.has(y),
            kollar.KOL_ESYALARI.filter((r) => r.includes(y))
                  .map((r) => r[0]).join(", ") || "hicbiri");
  }

  /* v4.54: Boralo Kolu da kaldirildi, dort yetenegi Toprak
     Kol'a gecti. Golge -> Boralo -> Toprak zinciri.           */
  kontrol("pa:kol_boralo artik YOK",
          !kollar.KOL_ESYALARI.some((r) => r[0] === "pa:kol_boralo"));
  /* v4.46: Yildirim Halkasi Kolu da kaldirildi, iki yetenegi
     Toprak Kol'a gecti.                                       */
  const toprak = kollar.KOL_ESYALARI.find((r) => r[0] === "pa:kol_toprak");
  for (const y of ["yildirim_halkasi", "alan_simsegi", "savur",
                   "yon_simsegi", "ors",
                   "yakala", "coklu_simsek", "ok_yagmuru", "sarsinti"]) {
    kontrol(y + " Toprak Kol'da", toprak.includes(y), toprak.slice(1).join(", "));
  }

  /* Baglanan her kimlik GERCEK bir yetenek mi (yazim hatasi
     sessizce "bagli degil" olurdu).                            */
  const hayalet = [...bagli].filter((k) => kayit.yetenekAl(k) === undefined);
  kontrol("kollar.js'te hayalet yetenek yok", hayalet.length === 0,
          hayalet.join(", ") || "hepsi gercek");

  /* Kol sayisi tarihi: 15 (v4.32) -> 11 (v4.33) -> 7 (v4.46)
     -> 6 (v4.54) -> 7 (v6.7, Kanli Kol). Her azalmada YETENEK
     degil ESYA azaldi; asagidaki "her yetenek hala bir kola
     bagli" testi bunun bekcisi.

     v6.7'deki artis kullanicinin ACIK istegi: "ozellikle kanli
     kolu istiyorum". Kanli Kol'un alti yetenegin IKISI yeni,
     dordu zaten vardi -- yani yeni kol yeni YETENEK getirdi,
     var olani kopyalamadi.                                   */
    /* ---- 7 -> 8  (v7.7) ----
     ANNA KOLU. Kullanicinin acik istegi ("Anna1545 Kolu'nu
     ekleyelim once"). Sayi YINE ELLE guncellendi -- otomatik
     saymak bekciyi olduruyor, cunku bekcinin isi tam olarak
     "yeni kol sessizce eklenmesin".
     Anna kol israfi degil: tek yetenegi (can_ver) BASKASINI
     iyilestiriyor ve depoda bunu yapan baska hicbir sey yok.  */
kontrol("kol sayisi 8 (Anna Kolu eklendi)",
          kollar.KOL_ESYALARI.length === 8,
          kollar.KOL_ESYALARI.length + " kol");
}

console.log("");
console.log("=== 5. DONDUR: GERCEK KILIT (zaman_durdur fikri) ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "dk1"; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];

  const rakip = {
    id: "r1", typeId: "minecraft:player", isValid: true,
    location: { x: 6.5, y: 90, z: 0.5 },
    _komutlar: [],
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    addEffect: () => {}, applyDamage: () => true
  };
  D.boyut._varliklar = [rakip];

  sus();
  const is = kayit.yetenekAl("dondur").olustur(o);
  ac();
  kontrol("is olustu (hedef kilitlendi)", is !== undefined);

  const kilit = rakip._komutlar.filter((k) => k.includes("inputpermission"));
  kontrol("oyuncunun HAREKETI kilitlendi",
          kilit.some((k) => k.includes("movement disabled")),
          kilit.join(" | ") || "komut yok");

  /* Referansta kamera da kapaniyordu: kilitli oyuncu etrafina
     bile bakamiyordu. Varsayilan olarak KAPALI.               */
  kontrol("kamera varsayilan olarak kilitlenmedi (referanstan fark)",
          ayar.DONDUR_KAMERA_KILIT === false &&
          !kilit.some((k) => k.includes("camera disabled")),
          kilit.join(" | "));

  sus();
  for (let t = 0; t < ayar.DONDUR_SURE + 5; t++) {
    if (is.calis()) break;
    tickIlerlet(1);
  }
  is.bitir();
  ac();

  const acilis = rakip._komutlar.filter((k) => k.includes("movement enabled"));
  kontrol("SURE DOLUNCA kilit acildi (referansta acan yoktu)",
          acilis.length > 0, rakip._komutlar.join(" | "));
}
{
  /* Is YARIDA kesilse de acilmali: oyuncu cikti, hata oldu,
     ne olursa olsun. Referans modun sonsuz kilidi tam buydu. */
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "dk2"; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  const rakip = {
    id: "r2", typeId: "minecraft:player", isValid: true,
    location: { x: 6.5, y: 90, z: 0.5 }, _komutlar: [],
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    addEffect: () => {}
  };
  D.boyut._varliklar = [rakip];

  sus();
  const is = kayit.yetenekAl("dondur").olustur(o);
  is.calis();
  is.bitir();                       // sure dolmadan, zorla
  ac();

  kontrol("is YARIDA kesilse de kilit acildi",
          rakip._komutlar.some((k) => k.includes("movement enabled")),
          rakip._komutlar.join(" | "));
}
{
  // Mob: girdi kilidi YOK, slowness yeter
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "dk3"; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  const zombi = {
    id: "z1", typeId: "minecraft:zombie", isValid: true,
    location: { x: 6.5, y: 90, z: 0.5 }, _komutlar: [], _efekt: [],
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    addEffect(ad) { this._efekt.push(ad); }
  };
  D.boyut._varliklar = [zombi];

  sus();
  const is = kayit.yetenekAl("dondur").olustur(o);
  is.calis();
  is.bitir();
  ac();

  kontrol("moba inputpermission GONDERILMEDI",
          !zombi._komutlar.some((k) => k.includes("inputpermission")),
          zombi._komutlar.join(" | ") || "komut yok");
  kontrol("moba slowness verildi (eski yol duruyor)",
          zombi._efekt.includes("slowness"), zombi._efekt.join(", "));
}
{
  const ana = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("dunyaya girerken kilit ACILIYOR (son emniyet)",
          ana.includes("inputpermission set @s movement enabled"));
}

console.log("");
console.log("=== 6. BOT YERDEN ESYA TOPLUYOR (koylu fikri) ===");
{
  const bot = JSON.parse(readFileSync(BP + "/entities/bot.json", "utf8"));
  const c = bot["minecraft:entity"].components;
  kontrol("varlikta pickup_items var",
          c["minecraft:behavior.pickup_items"] !== undefined);
  kontrol("kutu (inventory) var -- pickup_items bunsuz calismaz",
          c["minecraft:inventory"] !== undefined,
          JSON.stringify(c["minecraft:inventory"] || {}));
  kontrol("kutu OZEL: oyuncu botun kutusunu acamaz",
          c["minecraft:inventory"] && c["minecraft:inventory"].private === true);
}
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "yt1"; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  _durum.varliklar = D.sayac.varliklar;
  defter.defteriUnut();
  _durum.ozellikler.delete(ayar.BOT_KAYIT_ANAHTAR);

  sus(); defter.botCagir(o); ac();
  const bot = D.sayac.varliklar.find((v) => v.typeId === "pa:bot" && v.isValid);

  // Bot yerden bir seyler almis gibi kutusunu doldur
  bot._kutu = [
    { typeId: "minecraft:oak_log", amount: 12 },
    undefined,
    { typeId: "minecraft:diamond", amount: 3 }
  ];

  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); defter.botTara([o]); ac();

  kontrol("kutudakiler ekip cantasina gecti",
          defter.cantaDolulugu("yt1") === 15,
          defter.cantaDolulugu("yt1") + " parca");
  kontrol("botun kutusu bosaltildi (esya KOPYALANMADI)",
          bot._kutu.every((e) => e === undefined),
          bot._kutu.map((e) => e ? e.typeId : "-").join(", "));

  const liste = Object.fromEntries(defter.cantaListesi("yt1"));
  kontrol("adetler dogru tasindi",
          liste["minecraft:oak_log"] === 12 && liste["minecraft:diamond"] === 3,
          JSON.stringify(liste));
}
{
  /* Kutu SILINEMEZSE esya cantaya girmis olmamali -- yoksa
     kopyalanir. Bu, cantaya-koy/kutudan-sil sirasinin tek
     tehlikeli yani.                                           */
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "yt2"; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  _durum.varliklar = D.sayac.varliklar;
  defter.defteriUnut();
  _durum.ozellikler.delete(ayar.BOT_KAYIT_ANAHTAR);

  sus(); defter.botCagir(o); ac();
  const bot = D.sayac.varliklar.find((v) => v.typeId === "pa:bot" && v.isValid);
  bot._kutu = [{ typeId: "minecraft:raw_iron", amount: 8 }];
  bot._kutuYaz = false;                    // setItem patlayacak

  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); defter.botTara([o]); ac();

  kontrol("kutu silinemeyince canta BUYUMEDI (kopya yok)",
          defter.cantaDolulugu("yt2") === 0,
          defter.cantaDolulugu("yt2") + " parca");
  kontrol("esya botun kutusunda kaldi (kaybolmadi)",
          bot._kutu[0] !== undefined);
}
{
  // Envanter bileseni HIC yoksa paket olmemeli
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "yt3"; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  _durum.varliklar = D.sayac.varliklar;
  defter.defteriUnut();
  _durum.ozellikler.delete(ayar.BOT_KAYIT_ANAHTAR);

  sus(); defter.botCagir(o); ac();
  let patladi = false;
  try {
    sus(); tickIlerlet(ayar.BOT_TARAMA + 2); defter.botTara([o]); ac();
  } catch (e) {
    ac();
    patladi = true;
  }
  kontrol("envanter bileseni yokken hata firlatmadi", !patladi);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> v4.33 temizligi ve iki yeni fikir calisiyor");
process.exit(hata ? 1 : 0);

/* WILL1545 KILICI                                          v7.8

   Kullanicinin komut listesi (komut bloguyla calisiyor):
     tp @p ^^^+8                        -> isinlanma
     effect @p levitation 1 2           -> sicrayis
     particle ... ^^^3..^^^8 + damage 2 -> kan isini
     playanimation player.sleeping      -> yatirma
     particle ... ~ ~1.2 ~  (uc kez)    -> gogus kani

   Ve tek olcu: "gorunum altin kilic ile ayni fakat
   dayaniklilik netherite kilicin 5,5 kati olsun."

   Bu dosya sayilari degil ISI olcuyor: yetenekler gercekten
   calistiriliyor.                                          */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };
sus(); await import("./pack/main.js"); ac();
const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

console.log("=== 1. ESYA: GORUNUM VE DAYANIKLILIK ===");
{
  const j = oku(KOK + "/Simsek_TNT_ToprakTopu/items/will_kilic.json")["minecraft:item"];
  kontrol("kimlik pa:will_kilic", j.description.identifier === "pa:will_kilic");
  const c = j.components;

  /* GORUNUM ALTIN KILIC. Kendi ikonumuzu cizseydik "benzer"
     olurdu, "ayni" degil. Vanilla anahtarina bakiyor.      */
  kontrol("ikonu VANILLA golden_sword",
          c["minecraft:icon"].texture === "golden_sword",
          c["minecraft:icon"].texture);
  /* ...ve o anahtari BIZ tanimlamamaliyiz, yoksa vanilla
     dokusunu EZERIZ ve kilic bizim cizdigimiz sey olur.    */
  const it = oku(KOK + "/Simsek_Kol_Kaynak/textures/item_texture.json").texture_data;
  kontrol("  golden_sword anahtarini BIZ tanimlamiyoruz (ezmesin)",
          !("golden_sword" in it));
  kontrol("  kendi will_kilic dokusu da yok", !("will_kilic" in it));

  /* DAYANIKLILIK: netherite 2031, kullanici 5,5 kati istedi. */
  const bek = Math.ceil(2031 * 5.5);
  kontrol("dayaniklilik netherite'in 5,5 kati",
          c["minecraft:durability"].max_durability === bek,
          c["minecraft:durability"].max_durability + " (beklenen " + bek + ")");
  kontrol("  ayarlar da ayni sayiyi veriyor",
          ayar.WILL_DAYANIKLILIK === bek, String(ayar.WILL_DAYANIKLILIK));
  /* Sabit yazilmasin: kat degisince sayi da degismeli. */
  kontrol("  sabit degil, HESAPLANIYOR",
          ayar.WILL_DAYANIKLILIK === Math.ceil(ayar.WILL_NETHERITE * ayar.WILL_KAT),
          ayar.WILL_NETHERITE + " x " + ayar.WILL_KAT);
  kontrol("hasar altin kilicin kendisi (4)",
          c["minecraft:damage"] === 4, String(c["minecraft:damage"]));
  kontrol("onarilabilir (11171 vurustan sonra tamir yolu var)",
          !!c["minecraft:repairable"]);
}

console.log("");
console.log("=== 2. YETENEKLER KILICA BAGLI ===");
{
  const liste = kayit.esyaninYetenekleri("pa:will_kilic") || [];
  const adlar = liste.map((t) => t.kimlik);
  kontrol("kilicta yetenek var", liste.length >= 3, adlar.join(", "));
  for (const k of ["will_isinlan", "will_sicra", "will_yatir"]) {
    kontrol("  " + k + " bagli", adlar.includes(k));
  }
  /* Kan Isini AYRI yazilmadi: var olan isin motoruna bir satir
     olarak eklendi ve esyasiz sirada duruyor.               */
  kontrol("kan isini KOL_ISIN'de", ayar.KOL_ISIN.has("will_isini"));
  const t = ayar.KOL_ISIN.get("will_isini");
  kontrol("  kapisi Will kilici", t && t.elde === "pa:will_kilic", t && t.elde);
  /* Kaynak: damage @e[r=10,c=1] 2  ve  ^^^8 */
  kontrol("  hasar kaynaktaki gibi 2", t && t.hasar === 2, t && String(t.hasar));
  kontrol("  menzil kaynaktaki gibi 8", t && t.menzil === 8, t && String(t.menzil));
}

console.log("");
console.log("=== 3. ISINLANMA GERCEKTEN CALISIYOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "will1"; o.typeId = "minecraft:player";
  o.sendMessage = () => {}; o.runCommand = () => true;
  o.onScreenDisplay = { setActionBar: () => {} };
  let nereye = null;
  o.teleport = (k) => { nereye = k; o.location = k; return true; };
  _durum.oyuncular = [o];

  const bas = { x: o.location.x, y: o.location.y, z: o.location.z };
  sus(); kayit.yetenekAl("will_isinlan").olustur(o); ac();
  kontrol("isinlandi", !!nereye, nereye ? JSON.stringify(nereye) : "hayir");
  const mesafe = nereye ? Math.hypot(nereye.x - bas.x, nereye.y - bas.y, nereye.z - bas.z) : 0;
  kontrol("  sekiz blok ileri (kaynak ^^^+8)",
          Math.abs(mesafe - ayar.WILL_ISIN_MESAFE) < 0.01, mesafe.toFixed(2) + " blok");
  kontrol("  bakis dogrultusunda (x arttı)", nereye && nereye.x > bas.x);

  /* BEKLEME: kaynagin "Onay Gecikme suresi : 20". Ilk yazimda
     ayara koyup KULLANMAMISTIM; tarama.mjs yakaladi.        */
  nereye = null;
  sus(); kayit.yetenekAl("will_isinlan").olustur(o); ac();
  kontrol("  ust uste basinca BEKLETIYOR", nereye === null);
  tickIlerlet(ayar.WILL_ISIN_BEKLEME + 1);
  sus(); kayit.yetenekAl("will_isinlan").olustur(o); ac();
  kontrol("  bekleme dolunca yine calisiyor", !!nereye);
}

console.log("");
console.log("=== 4. DUVARA ISINLANMIYOR (kaynakta bu koruma YOK) ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "will2"; o.typeId = "minecraft:player";
  o.sendMessage = () => {}; o.runCommand = () => true;
  o.onScreenDisplay = { setActionBar: () => {} };
  let nereye = null;
  o.teleport = (k) => { nereye = k; return true; };
  /* 4 blok ilerisi ve otesi DOLU. Kaynak duvarin icine
     isinlardi; bizde geriye dogru bos yer araniyor.         */
  o.dimension = Object.assign(Object.create(Object.getPrototypeOf(D.boyut)), D.boyut, {
    getBlock: (k) => ({ isAir: !(k.x >= 4) })
  });
  _durum.oyuncular = [o];

  sus(); kayit.yetenekAl("will_isinlan").olustur(o); ac();
  kontrol("duvarin ICINE isinlanmadi",
          !nereye || nereye.x < 4, nereye ? JSON.stringify(nereye) : "hic isinlanmadi");
}

console.log("");
console.log("=== 5. KAYNAKTAN ALINMAYANLAR ===");
{
  const ham = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/will_kilic.js", "utf8");
  /* ---- YORUMLAR SOYULUYOR ----
     Ilk yazimda ham metinde ariyordum ve test DUSTU: kendi
     yorumumda kaynagin komutunu ("hasitem={item=golden_sword")
     alintiliyorum. Ayni tuzaga anna.mjs'te de dusmustum
     (health_boost). Metin aramasi yorumla kodu ayirt etmiyor;
     once yorumlar cikariliyor.                             */
  const kod = ham.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  /* Kaynak kapisi vanilla altin kilic: o kilici tutan HERKES
     isinlanirdi. Bizde kapi kendi esyamiz.                  */
  kontrol("kapi vanilla golden_sword DEGIL, kendi kilicimiz",
          !/hasitem|golden_sword/.test(kod));
  kontrol("  kapi WILL_KILIC ayarindan geliyor", kod.includes("WILL_KILIC"));
  /* Yatirma: kaynak @p yani KOMUTU CALISTIRANI yatiriyor;
     bir silahin kendini yatirmasi anlamsiz. */
  kontrol("yatirma HEDEFE uygulaniyor (kaynak kendine yapiyordu)",
          kod.includes("koniHedefleri") && kod.includes("WILL_YATIR_ANIM"));
  /* Kaynakta geri donus ELLE; hedef sonsuza kadar yerde
     kalabiliyor. Zaman Saati'nde ogrenilen ders.            */
  kontrol("yatan KENDILIGINDEN kalkiyor (kaynakta yok)",
          kod.includes("WILL_YATIR_DUZEL") && kod.includes("runTimeout"));
  kontrol("  kalkma suresi tanimli", ayar.WILL_YATIR_SURE > 0,
          ayar.WILL_YATIR_SURE + " tick");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Will1545 Kilici calisiyor");
process.exit(hata ? 1 : 0);

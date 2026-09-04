/* ANNA KOLU -- can verme                                    v7.7

   Kullanici: "Anna1545 Kolu'nu ekleyelim once, bu sonra bu
   animasyon."

   Kaynak (fear1545, "En Iyi BoraLo Kol Modu V2") Anna'nin can
   vermesini soyle yapiyor:
       effect @s health_boost 100000 255 true
       effect @s instant_health 1 255
   Yani KENDINE sinirsiz can. ALINMADI ve bu dosya bunu
   kilitliyor -- cunku:

     1. can_verme bu depoda v4.33'te SILINMISTI, gerekcesi
        kullanicinin kendi sozu ("kalp ekleme var, iksirler
        var, gereksizlesti"). Ayni seyi geri koymak o karari
        cignerdi.
     2. health_boost 255 sinirsiz can demek.

   Yon degistirildi: BASKASINI iyilestirmek. Depoda bunu yapan
   baska hicbir sey yok -- kalp_ekle kendine, iksirler kendine,
   bot_ilkel botun kendi pasifi.

   Bu dosya "kod yazildi mi" degil "IS GORUYOR MU" olcuyor:
   yetenek gercekten calistiriliyor ve canlarin ne olduguna
   bakiliyor.                                                */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, itemUseTetikle, _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };
sus(); await import("./pack/main.js"); ac();
const ayar = await import("./pack/ayarlar.js");
const kollar = await import("./pack/yetenekler/kollar.js");
const kayit = await import("./pack/yetenekler/kayit.js");

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Can bileseni olan sahte varlik. */
/* Hedef BAKIS KONISINE konmali. Ilk yazimda hepsini
   (0,0,0)'a koymustum ve hicbiri iyilesmedi -- test "kod
   calismiyor" diyordu ama gercekte KURULUM yanlisti. Oyuncu
   (0.5, 88.98, 0.5)'te ve +x'e bakiyor. */
function canli(id, tip, can = 20, tavan = 20, uzak = 5) {
  let simdi = can;
  return {
    id, typeId: tip, isValid: true,
    location: { x: 0.5 + uzak, y: 88.98, z: 0.5 },
    _efekt: [],
    get _can() { return simdi; },
    addEffect(ad, sure, o) { this._efekt.push({ ad, sure, o }); return true; },
    getComponent(a) {
      if (a !== "minecraft:health") return undefined;
      return {
        get currentValue() { return simdi; },
        get effectiveMax() { return tavan; },
        setCurrentValue(v) { simdi = v; return true; }
      };
    }
  };
}

console.log("=== 1. ESYA VE BAGLANTI ===");
{
  const esya = KOK + "/Simsek_TNT_ToprakTopu/items/kol_anna.json";
  kontrol("pa:kol_anna esyasi uretildi",
          JSON.parse(readFileSync(esya, "utf8"))["minecraft:item"]
            .description.identifier === "pa:kol_anna");
  const satir = kollars();
  kontrol("kol yetenek tablosunda", !!satir, satir ? satir.join(", ") : "yok");
  kontrol("  can_ver birinci yetenek", satir && satir[1] === "can_ver");
  kontrol("  ucurma da bagli", satir && satir.includes("ucurma"));
  /* Kaynagin listesindeki simsek ve ucma ALINMADI -- ikisi de
     Toprak Kol'da zaten var, "kol israfi" kurali. */
  kontrol("  simsek/ucma ALINMADI (kol israfi kurali)",
          satir && !satir.includes("yon_simsegi") &&
          !satir.includes("toprak_ucus"));
  kontrol("can_ver yetenek defterinde kayitli",
          !!kayit.yetenekAl("can_ver"));
}
function kollars() {
  return kollar.KOL_ESYALARI.find((s) => s[0] === "pa:kol_anna");
}

console.log("");
console.log("=== 2. DOSTU IYILESTIRIYOR (gercekten calistiriliyor) ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "anna_oyuncu"; o.typeId = "minecraft:player";
  o.sendMessage = () => {};
  o.addEffect = () => true;
  /* yetenekTetikle once kollariKaldir() cagiriyor, o da
     playanimation komutu calistiriyor; sahte oyuncuda
     runCommand yoksa dallanma orada patlar ve yetenek HIC
     calismaz. Ilk yazimda tam bu oldu: test "iyilesmedi"
     diyordu ama yetenek hic cagrilmamisti.               */
  o.runCommand = () => true;
  o.getComponent = ((e) => (a) => a === "minecraft:health"
    ? { currentValue: 20, effectiveMax: 20, setCurrentValue: () => true } : e(a))(o.getComponent.bind(o));

  const kurt  = canli("kurt",  "minecraft:wolf",   4, 20, 4);
  const koylu = canli("koylu", "minecraft:villager_v2", 6, 20, 7);
  D.boyut._varliklar = [kurt, koylu];
  _durum.oyuncular = [o];

  sus(); itemUseTetikle({ source: o, itemStack: { typeId: "pa:kol_anna" } });
  tickIlerlet(400); ac();

  kontrol("kurdun cani dolduruldu", kurt._can > 4, "4 -> " + kurt._can);
  kontrol("koylunun cani dolduruldu", koylu._can > 6, "6 -> " + koylu._can);
  kontrol("  tavani asmadi", kurt._can <= 20 && koylu._can <= 20);
  kontrol("  yenilenme de verildi",
          kurt._efekt.some((e) => e.ad === "regeneration"));
  kontrol("  emme (kalkan) de verildi",
          kurt._efekt.some((e) => e.ad === "absorption"));
  const reg = kurt._efekt.find((e) => e.ad === "regeneration");
  /* Iksirler 6000 tick veriyor; bu onun yerine gecmemeli. */
  kontrol("  yenilenme suresi iksirlerden KISA",
          reg && reg.sure < 6000 && reg.sure === ayar.CAN_VER_SURE,
          reg ? reg.sure + " tick" : "yok");
}

console.log("");
console.log("=== 3. DUSMANI IYILESTIRMIYOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "anna_oyuncu2"; o.typeId = "minecraft:player";
  o.sendMessage = () => {};
  o.addEffect = () => true;
  /* yetenekTetikle once kollariKaldir() cagiriyor, o da
     playanimation komutu calistiriyor; sahte oyuncuda
     runCommand yoksa dallanma orada patlar ve yetenek HIC
     calismaz. Ilk yazimda tam bu oldu: test "iyilesmedi"
     diyordu ama yetenek hic cagrilmamisti.               */
  o.runCommand = () => true;
  o.getComponent = ((e) => (a) => a === "minecraft:health"
    ? { currentValue: 20, effectiveMax: 20, setCurrentValue: () => true } : e(a))(o.getComponent.bind(o));

  const zombi = canli("zombi", "minecraft:zombie", 3, 20, 4);
  const warden = canli("warden", "minecraft:warden", 100, 500, 7);
  D.boyut._varliklar = [zombi, warden];
  _durum.oyuncular = [o];

  sus(); itemUseTetikle({ source: o, itemStack: { typeId: "pa:kol_anna" } });
  tickIlerlet(400); ac();

  kontrol("ZOMBI iyilesmedi", zombi._can === 3, "can " + zombi._can);
  kontrol("WARDEN iyilesmedi", warden._can === 100, "can " + warden._can);
  kontrol("  dusmana efekt de verilmedi",
          zombi._efekt.length === 0 && warden._efekt.length === 0);
}

console.log("");
console.log("=== 4. KAYNAGIN SINIRSIZ CANI ALINMADI ===");
{
  const kod = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/can_ver.js", "utf8");
  /* Kaynak: effect @s health_boost 100000 255 true
     DIKKAT -- ilk yazimda `kod.includes("health_boost")`
     diyordum ve test DUSTU: kendi YORUMUMDA gecen kelimeye
     takilmisti. Metin araması yorumla kodu ayirt etmiyor.
     Artik cagrinin kendisi araniyor.                       */
  kontrol("health_boost efekti VERILMIYOR",
          !/addEffect\(\s*["']health_boost/.test(kod));
  kontrol("  instant_health yalnizca yedek yolda",
          (kod.match(/addEffect\(\s*["']instant_health/g) || []).length <= 1);
  kontrol("miktar makul (<= 20 can)", ayar.CAN_VER_MIKTAR <= 20,
          ayar.CAN_VER_MIKTAR + " can");
  kontrol("izin listesi DUSMAN listesi degil (yeni mob eskitmez)",
          ayar.CAN_VER_DOSTLAR.includes("minecraft:player") &&
          !ayar.CAN_VER_DOSTLAR.includes("minecraft:zombie"),
          ayar.CAN_VER_DOSTLAR.length + " dost turu");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Anna Kolu calisiyor");
process.exit(hata ? 1 : 0);

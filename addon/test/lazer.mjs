/* GOZ LAZERI -- referansin uc hatasini yapmadigimiz sinaniyor:
     1. NOKTA degil CIZGI tarariz (2/4/6/8. blok arasi kurtulmaz)
     2. kendimize vurmayiz (onlar bu yuzden instant_health veriyordu)
     3. kademeye gore hasar/menzil degisir (onlarda hepsi ayniydi)  */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";

const IKSIRLER = [
  "pa:iksir_nitroksin", "pa:iksir_grinoksin", "pa:iksir_firenoksin",
  "pa:iksir_kan_iksiri", "pa:iksir_hiperoksin"
];
const GOZLER = [];
for (const g of ["goz_beyaz", "goz_yesil", "goz_ates", "goz_kan", "goz_mavi"]) {
  GOZLER.push("pa:" + g, "pa:" + g + "_lazer");
}
esyaKaydet(...IKSIRLER, ...GOZLER);

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
const mc = await import("@minecraft/server");
await import("./pack/main.js");

const ayar = await import("./pack/ayarlar.js");
ac();

const { yetenekAl } = await import("./pack/yetenekler/kayit.js");
const { butceSifirla } = await import("./pack/butce.js");
const { kademeAl } = await import("./pack/yetenekler/iksirler.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };
const BAKIS = { x: 1, y: 0, z: 0 };      // tam +x yonu

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, BAKIS, BAS);
  o.id = id;
  o.typeId = "minecraft:player";
  o._kafa = undefined;
  o._hasar = [];
  o.applyDamage = (m, s) => { o._hasar.push({ m, s }); return true; };
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (slot) => (slot === "Head" && o._kafa) ? { typeId: o._kafa } : undefined,
        setEquipment: (slot, esya) => {
          if (slot === "Head") o._kafa = esya ? esya.typeId : undefined;
          return true;
        }
      };
    }
    return eskiGet(ad);
  };
  _durum.oyuncular = [o];
  return { D, o };
}

// Bakis dogrultusunda n blok ilerideki kurban
function kurban(id, n, sapma = 0) {
  return {
    id, typeId: "minecraft:zombie", isValid: true,
    location: { x: BAS.x + n, y: BAS.y, z: BAS.z + sapma },
    _hasar: [], _ates: 0,
    applyDamage(m, s) { this._hasar.push({ m, s }); return true; },
    setOnFire(sn) { this._ates = sn; return true; },
    addEffect() {}
  };
}

/* v4.69: isin artik SURELI (LAZER_SURE = 510 tick = 25,5 sn).
   Varsayilan tur sayisi 30 iken "lazer bitti mi" sinamalari
   isin daha bitmeden bakiyordu. Varsayilan sureye baglandi --
   elle yazilan sayi ayardan ayrisirdi.                       */
function lazerAt(o, D, tick = ayar.LAZER_SURE + 20) {
  const tanim = yetenekAl("goz_lazeri");
  sus();
  const is = tanim.olustur(o);
  if (is) {
    for (let t = 0; t < tick; t++) {
      butceSifirla();
      if (is.calis()) { if (is.bitir) is.bitir(); break; }
      tickIlerlet(1);
    }
  }
  ac();
  return is;
}

const ic = (o, esya) => mc.itemCompleteUseTetikle({ source: o, itemStack: { typeId: esya } });

console.log("=== 1. IKSIRSIZ LAZER YOK ===");
{
  const { D, o } = kur("lz0");
  const hedef = kurban("h", 5);
  D.boyut._varliklar = [hedef];
  lazerAt(o, D);
  kontrol("iksir icmeden lazer atilamiyor", hedef._hasar.length === 0);
  kontrol("sebebi soylendi", /iksir icmelisin/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);
}

console.log("");
console.log("=== 2. CIZGI TARIYOR (referans NOKTA tariyordu) ===");
{
  const { D, o } = kur("lz1");
  /* Referans sadece 2, 4, 6, 8. bloklari tariyordu. 3, 5 ve 7.
     blokta duranlar kurtuluyordu -- bizde kurtulmamali.        */
  const hedefler = [3, 5, 7].map((n, i) => kurban("h" + n, n));
  D.boyut._varliklar = hedefler;

  sus(); ic(o, "pa:iksir_nitroksin"); tickIlerlet(2); ac();
  lazerAt(o, D);

  const vurulan = hedefler.filter((h) => h._hasar.length > 0).length;
  kontrol("3., 5. ve 7. bloktakilerin HEPSI vuruldu", vurulan === 3,
          vurulan + "/3 vuruldu");
}
{
  const { D, o } = kur("lz2");
  const yanda = kurban("yan", 5, 6);     // isindan 6 blok yanda
  const arkada = kurban("arka", -5);     // arkamizda
  D.boyut._varliklar = [yanda, arkada];

  sus(); ic(o, "pa:iksir_nitroksin"); tickIlerlet(2); ac();
  lazerAt(o, D);

  kontrol("isinin yanindaki vurulmadi", yanda._hasar.length === 0);
  kontrol("arkamizdaki vurulmadi", arkada._hasar.length === 0);
}

console.log("");
console.log("=== 3. KENDIMIZE VURMUYORUZ (referansin yamasi gereksiz) ===");
{
  const { D, o } = kur("lz3");
  D.boyut._varliklar = [];
  sus(); ic(o, "pa:iksir_nitroksin"); tickIlerlet(2); ac();
  const oncekiHasar = o._hasar.length;
  lazerAt(o, D);
  kontrol("oyuncu kendi lazerinden hasar almadi", o._hasar.length === oncekiHasar,
          o._hasar.length + " hasar");
}

console.log("");
console.log("=== 4. HIYERARSI YOK, HER IKSIR KENDI ALANINDA ===");
{
  /* v4.12'ye kadar bes iksir bir GUC MERDIVENIYDI ve bu test
     "kademe yukseldikce hasar artiyor" diye bakiyordu. Merdiven
     kaldirildi; artik bakilacak sey her iksirin KENDI hasarini
     tablodan almasi ve hicbirinin sifir olmamasi.              */
  const olculen = [];
  for (const k of ayar.KADEMELER) {
    const { D, o } = kur("lz-" + k.kimlik);
    const hedef = kurban("h", 5);
    D.boyut._varliklar = [hedef];
    sus(); ic(o, "pa:iksir_" + k.kimlik); tickIlerlet(2); ac();
    lazerAt(o, D);
    olculen.push([k, hedef._hasar.length ? hedef._hasar[0].m : 0]);
  }
  for (const [k, h] of olculen) {
    console.log("     " + k.ad.padEnd(12) + " -> " + String(h).padStart(2) +
                " hasar   (" + k.ozet + ")");
  }

  kontrol("butun iksirler hasar verdi",
          olculen.every(([, h]) => h > 0),
          olculen.map(([k, h]) => k.ad + ":" + h).join(", "));
  /* ---- v4.68: TEK HASAR ----
     Kullanici: "bunlar sey vermesin kanka, sadece hasar
     versin, ekstra bir sey vermesin."

     Iksire ozgu yan etkiler (savur/zehir/sersem/ates/canCal/
     hiz/kalkan) kaldirildi; hasar da tek sayiya indi. Tek
     ayrim Element'in iki modu.                              */
  kontrol("hepsi AYNI hasari verdi (tek sayi)",
          olculen.every(([, h]) => h === ayar.LAZER_HASAR),
          olculen.map(([k, h]) => k.ad + ":" + h).join(", "));
  kontrol("hasar eskisinden COK daha yuksek",
          ayar.LAZER_HASAR >= 40, String(ayar.LAZER_HASAR));
}

console.log("");
console.log("=== 5b. LAZER SADECE VURUYOR (v4.68) ===");
{
  /* Kullanici: "bunlari kaldir ama lazeri sadece vurmak icin
     ekle... element iksiri 2 secenegi olacak, onda sadece."

     Yan etkiler geri sizarsa bu bolum duser.               */
  const YASAK = ["savur", "zehir", "sersem", "canCal", "hiz", "kalkan"];
  for (const k of ayar.KADEMELER) {
    const l = k.lazer || {};
    const sizan = YASAK.filter((b) => l[b] !== undefined);
    kontrol(k.kimlik.padEnd(11) + " lazerinde yan etki YOK",
            sizan.length === 0, sizan.join(", "));
    /* ates/dondur/buzKafes SADECE Element'in modlarindan
       gelebilir, kademe tablosunda yazili olamaz.          */
    kontrol(k.kimlik.padEnd(11) + " tablosunda ates/dondur yazmiyor",
            l.ates === undefined && l.dondur === undefined &&
            l.buzKafes === undefined,
            JSON.stringify(l));
  }
  const el = ayar.KADEMELER.find((k) => k.kimlik === "element");
  kontrol("tek ayrim Element'in iki modu", el.lazer.modlu === "element",
          JSON.stringify(el.lazer));
}

console.log("=== 6. GOZ LAZER VARYANTINA GECIP GERI DONUYOR ===");
{
  const { D, o } = kur("lz-goz");
  D.boyut._varliklar = [];
  sus(); ic(o, "pa:iksir_firenoksin"); tickIlerlet(2); ac();
  kontrol("normal goz takili", o._kafa === "pa:goz_ates", String(o._kafa));

  const tanim = yetenekAl("goz_lazeri");
  sus();
  const is = tanim.olustur(o);
  ac();
  kontrol("lazer atarken goz PARLAK varyanta gecti",
          o._kafa === "pa:goz_ates_lazer", String(o._kafa));

  /* v4.69: isin 25,5 saniye suruyor; elle yazilan 30 tick
     isin daha BITMEDEN bakiyordu. Sure ayardan okunuyor. */
  sus();
  for (let t = 0; t < ayar.LAZER_SURE + 20; t++) {
    butceSifirla();
    if (is.calis()) { is.bitir(); break; }
    tickIlerlet(1);
  }
  ac();
  kontrol("lazer bitince normal goze dondu", o._kafa === "pa:goz_ates", String(o._kafa));
}

console.log("");
console.log("=== 7. GUCU KAPAT (referansta efektler kaliyordu) ===");
{
  const { D, o } = kur("kp1");
  o._silinen = [];
  o.removeEffect = (ad) => { o._silinen.push(ad); };
  D.boyut._varliklar = [];

  sus(); ic(o, "pa:iksir_kan_iksiri"); tickIlerlet(2); ac();
  kontrol("kademe acik", !!kademeAl(o.id), (kademeAl(o.id) || {}).ad);

  const tanim = yetenekAl("guc_kapat");
  sus(); tanim.olustur(o); ac();

  kontrol("kademe kapandi", !kademeAl(o.id));
  kontrol("EFEKTLER de silindi (referansta kaliyordu)",
          o._silinen.length > 0, o._silinen.join(", "));
  kontrol("goz cikarildi", o._kafa === undefined, String(o._kafa));
  kontrol("bildirildi", /kapatildi/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);
}
{
  const { o } = kur("kp2");
  const tanim = yetenekAl("guc_kapat");
  sus(); tanim.olustur(o); ac();
  kontrol("acik iksir yokken uyari verdi", /Acik bir iksir yok/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum lazer testleri gecti");
process.exit(hata ? 1 : 0);

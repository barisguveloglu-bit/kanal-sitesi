/* KALP EKLEME (v4.20)

   Referans iksir modlarinin hepsinde tek satir vardi:
     effect @s health_boost 100000 255
   Uc kusuru var ve ucu de burada sinaniyor:
     1. 255 seviye = 256 kalp, can bari ekrana sigmiyor
     2. geri alinamiyor  -> bizde sifirlama var
     3. olunce/cikinca gidiyor, yani KALICI DEGIL -> bizde defter var

   Ayrica health_boost'un kendi tuzagi: eklenen kalpler BOS gelir.
   Ekledikten sonra can dolduruluyor mu, ona da bakiliyor.        */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum, system } from "@minecraft/server";

esyaKaydet("pa:kol_kalp");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const defter = await import("./pack/yetenekler/_kalp_defteri.js");
const { yetenekAl, esyaninYetenekleri } = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, BAS);
  o.id = id;
  o.typeId = "minecraft:player";
  o._efekt = [];          // {ad, sure, seviye}
  o._silinen = [];
  o._can = 20;
  o._tavan = 20;
  o.addEffect = (ad, sure, s) => {
    o._efekt.push({ ad, sure, seviye: s ? s.amplifier : 0 });
    if (ad === "health_boost") o._tavan = 20 + 4 * ((s ? s.amplifier : 0) + 1);
    return true;
  };
  o.removeEffect = (ad) => {
    o._silinen.push(ad);
    if (ad === "health_boost") o._tavan = 20;
    return true;
  };
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:health") {
      return {
        get currentValue() { return o._can; },
        get effectiveMax() { return o._tavan; },
        setCurrentValue(v) { o._can = v; },
        resetToMaxValue() { o._can = o._tavan; }
      };
    }
    return eskiGet(ad);
  };
  _durum.oyuncular = [o];
  return { D, o };
}

const sonEfekt = (o, ad) => {
  for (let i = o._efekt.length - 1; i >= 0; i--) if (o._efekt[i].ad === ad) return o._efekt[i];
  return undefined;
};

const ekle = (o) => { sus(); yetenekAl("kalp_ekle").olustur(o); ac(); };
const sifirla = (o) => { sus(); yetenekAl("kalp_sifirla").olustur(o); ac(); };

console.log("=== 1. KALP EKLENIYOR ===");
{
  defter.defteriUnut();
  const { o } = kur("k1");
  ekle(o);

  kontrol("defterde kalp var", defter.kalpAl("k1") === ayar.KALP_ADIM,
          defter.kalpAl("k1") + " kalp");

  const e = sonEfekt(o, "health_boost");
  kontrol("health_boost verildi", e !== undefined);

  /* 1 kalp = 2 can, health_boost seviye N = +4 can x (N+1).
     Yani 10 kalp -> +20 can -> seviye 4.                    */
  const beklenen = ayar.KALP_ADIM / 2 - 1;
  kontrol("seviye kalp sayisindan hesaplandi", e && e.seviye === beklenen,
          e ? "seviye " + e.seviye + " (beklenen " + beklenen + ")" : "-");
  kontrol("maksimum can gercekten buyudu", o._tavan === 20 + 2 * ayar.KALP_ADIM,
          o._tavan + " can = " + (o._tavan / 2) + " kalp");

  /* health_boost'un tuzagi: eklenen kalpler BOS gelir. */
  kontrol("eklenen kalpler DOLU geldi (health_boost bos birakir)",
          o._can === o._tavan, o._can + "/" + o._tavan + " can");

  kontrol("oyuncuya bildirildi", /\+/.test(o._mesajlar.join(" ")),
          o._mesajlar[0] || "mesaj yok");
}

console.log("");
console.log("=== 2. BIRIKIYOR ===");
{
  defter.defteriUnut();
  const { o } = kur("k2");
  ekle(o); ekle(o); ekle(o);
  kontrol("uc kullanim birikti", defter.kalpAl("k2") === ayar.KALP_ADIM * 3,
          defter.kalpAl("k2") + " kalp");
  kontrol("can tavani da birikti", o._tavan === 20 + 2 * ayar.KALP_ADIM * 3,
          o._tavan + " can");
}

console.log("");
console.log("=== 3. TAVAN ===");
{
  defter.defteriUnut();
  const { o } = kur("k3");
  const gerekli = Math.ceil(ayar.KALP_TAVAN / ayar.KALP_ADIM) + 3;
  for (let i = 0; i < gerekli; i++) ekle(o);

  kontrol("tavani asmadi", defter.kalpAl("k3") === ayar.KALP_TAVAN,
          defter.kalpAl("k3") + " / tavan " + ayar.KALP_TAVAN);
  kontrol("tavanda uyari verildi", /[Tt]avan/.test(o._mesajlar.join(" ")),
          o._mesajlar[o._mesajlar.length - 1]);

  /* Motorun kendi siniri: health_boost seviyesi en fazla 255,
     yani 512 kalp. Ayar elle yukseltilirse sessizce bozulmasin. */
  kontrol("motor sinirinin altinda kalindi",
          ayar.KALP_TAVAN / 2 - 1 <= 255,
          "seviye " + (ayar.KALP_TAVAN / 2 - 1));
}

console.log("");
console.log("=== 4. GERI ALINIYOR (referansta alinamiyordu) ===");
{
  defter.defteriUnut();
  const { o } = kur("k4");
  ekle(o); ekle(o);
  const vardi = defter.kalpAl("k4");

  sifirla(o);
  kontrol("defterden silindi", defter.kalpAl("k4") === 0, defter.kalpAl("k4") + " kalp");
  kontrol("health_boost efekti silindi", o._silinen.includes("health_boost"),
          o._silinen.join(", ") || "silinmedi");
  kontrol("can tavani normale dondu", o._tavan === 20, o._tavan + " can");
  kontrol("normal canla birakildi (2 canla kalmadi)", o._can === 20,
          o._can + "/20 can");
  kontrol("kac kalp silindigi bildirildi", vardi === ayar.KALP_ADIM * 2,
          vardi + " kalp silinmisti");
}
{
  defter.defteriUnut();
  const { o } = kur("k4b");
  sifirla(o);
  kontrol("kalbi yokken sifirlamak sorun cikarmadi",
          /yok/i.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);
}

console.log("");
console.log("=== 5. KALICI: EFEKT SILINSE DE GERI GELIYOR ===");
{
  /* En kritik davranis. Minecraft'ta efektler UC yerde silinir:
     olunce, sure dolunca, sut icince. Referansta bunlarin
     herhangi biri kalpleri TEMELLI goturuyordu.               */
  defter.defteriUnut();
  const { o } = kur("k5");
  ekle(o);
  const tavanOnce = o._tavan;

  // "Oldu" / "sut icti": butun efektler gitti
  o._efekt.length = 0;
  o._tavan = 20;
  o._can = 20;

  sus(); tickIlerlet(ayar.KALP_TAZELEME + 2); ac();

  kontrol("efekt kendiliginden geri verildi", sonEfekt(o, "health_boost") !== undefined);
  kontrol("kalpler geri geldi", o._tavan === tavanOnce,
          o._tavan + " can (once " + tavanOnce + ")");
  kontrol("defter zaten bozulmamisti", defter.kalpAl("k5") === ayar.KALP_ADIM);
}

console.log("");
console.log("=== 6. DUNYA OZELLIGINE YAZILIYOR ===");
{
  defter.defteriUnut();
  const { o } = kur("k6");
  ekle(o); ekle(o);

  const ham = _durum.ozellikler.get(ayar.KALP_KAYIT_ANAHTAR);
  kontrol("dunya ozelligine yazildi", typeof ham === "string", String(ham));

  // Script yeniden yuklendi: bellek sifir, kayit duruyor
  defter.defteriUnut();
  kontrol("yeniden yuklenince kayittan okundu",
          defter.kalpAl("k6") === ayar.KALP_ADIM * 2,
          defter.kalpAl("k6") + " kalp");

  // Sifirlama kayittan da dusurmeli
  sifirla(o);
  defter.defteriUnut();
  kontrol("sifirlama kayittan da dustu", defter.kalpAl("k6") === 0,
          defter.kalpAl("k6") + " kalp");
}

console.log("");
console.log("=== 7. TICK MALIYETI ===");
{
  /* Kimse kalp almamissa dongu hic donmemeli -- iksirlerdeki
     kural. Aksi halde 20 tick/sn boyunca bos tarama olur.

     DIKKAT: defteriUnut() sadece BELLEGI temizler; kayit yerinde
     durur ve ilk sorguda geri okunur (kaliciligin ta kendisi,
     6. bolum buna bakiyor). "Hic kimse yok" durumunu sinamak
     icin kaydin da silinmesi gerekiyor.                        */
  defter.defteriUnut();
  _durum.ozellikler.delete(ayar.KALP_KAYIT_ANAHTAR);
  kontrol("kimse kalp almamisken defter bos", defter.kalpliVarMi() === false);

  const { o } = kur("k7");
  ekle(o);
  kontrol("kalp alininca tarama aciliyor", defter.kalpliVarMi() === true);

  // Tazeleme araligindan sik yazmamali
  const once = o._efekt.filter((e) => e.ad === "health_boost").length;
  sus(); tickIlerlet(ayar.KALP_TAZELEME - 5); ac();
  kontrol("tazeleme araligi beklendi, her tick yazilmadi",
          o._efekt.filter((e) => e.ad === "health_boost").length === once,
          once + " -> " + o._efekt.filter((e) => e.ad === "health_boost").length);

  sus(); tickIlerlet(10); ac();
  kontrol("aralik dolunca tazelendi",
          o._efekt.filter((e) => e.ad === "health_boost").length > once);
}

console.log("");
console.log("=== 8. CIFT SAYI KURALI ===");
{
  /* 1 kalp = 2 can ve health_boost 4'er can ekliyor, yani
     verilebilen en kucuk adim 2 kalp. Tek sayi istenirse asagi
     yuvarlanmali -- sessizce yanlis seviye vermemeli.         */
  kontrol("tek sayi asagi yuvarlandi", defter.kalbiDuzelt(7) === 6, "7 -> " + defter.kalbiDuzelt(7));
  kontrol("negatif sifirlandi", defter.kalbiDuzelt(-4) === 0);
  kontrol("motor tavaninda kirpildi", defter.kalbiDuzelt(9999) === 512,
          "9999 -> " + defter.kalbiDuzelt(9999));
  kontrol("sifir kalp icin efekt seviyesi yok", defter.kalpSeviyesi(0) === -1);
  kontrol("2 kalp -> seviye 0", defter.kalpSeviyesi(2) === 0);
  kontrol("ayardaki KALP_ADIM cift", ayar.KALP_ADIM % 2 === 0, String(ayar.KALP_ADIM));
  kontrol("ayardaki KALP_TAVAN cift", ayar.KALP_TAVAN % 2 === 0, String(ayar.KALP_TAVAN));
}

console.log("");
console.log("=== 9. KAYIT VE KOL ===");
{
  for (const y of ["kalp_ekle", "kalp_sifirla"]) {
    kontrol(y + " kayitli", yetenekAl(y) !== undefined);
  }
  /* v4.21: ayri "Kalp Kolu" KALDIRILDI -- kullanicinin kurali
     "her seyi kol yapma, kol israfini onle". Kalp yetenekleri
     Toprak Kol'a tasindi, asil yol ise sohbet: "can 10".      */
  const liste = esyaninYetenekleri("pa:kol_toprak").map((t) => t.kimlik);
  kontrol("kalp yetenekleri Toprak Kol'da",
          liste.includes("kalp_ekle") && liste.includes("kalp_sifirla"),
          liste.length + " yetenek");
  const kollar = await import("./pack/yetenekler/kollar.js");
  kontrol("ayri Kalp Kolu yok",
          !kollar.KOL_ESYALARI.some((s) => s[0] === "pa:kol_kalp"));
  /* v4.33: can_verme tamamen kaldirildi. Eskiden "ikisi
     karismiyor mu" diye bakiliyordu; artik kontrol edilecek sey
     GERCEKTEN GITTIGI. Iyilestirmenin tek yolu iksirler.      */
  kontrol("can_verme yetenegi kaldirildi (kalp ekleme tek kalici yol)",
          yetenekAl("can_verme") === undefined);
  kontrol("hicbir kol can_verme'ye bagli degil",
          !kollar.KOL_ESYALARI.some((s) => s.includes("can_verme")));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum kalp testleri gecti");
process.exit(hata ? 1 : 0);

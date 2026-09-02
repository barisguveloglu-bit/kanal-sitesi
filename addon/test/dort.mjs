/* v3.5 -- referanstan alinan dort yetenek:
     can_verme, ors, buz_adam ve dusen meteor.
   Her birinde "referansin yaptigi hatayi biz yapmiyoruz" iddiasi
   ayri ayri sinaniyor.                                            */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, scriptEventTetikle, esyaKaydet, _durum } from "@minecraft/server";

esyaKaydet(
  "pa:kol_toprak", "pa:kol_buz",
  "pa:kol_halka", "pa:kol_simsek",
  "pa:kol_savur", "pa:kol_ucus", "pa:kol_ors"
);

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");

/* Butce tavani sabitten okunuyor. Sahte dunya HER blok API
   cagrisini sayiyor (getBlock de setType de), butce birimi de
   ayni sey; yani dogrudan karsilastirilabilir.              */
const TAVAN = (await import("./pack/ayarlar.js")).TICK_BLOK_BUTCESI;
ac();

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Bakis neredeyse yatay: hedef nokta y~83'te kaliyor, yani sahte
   dunyanin HAVA katmaninda (y>=64). Dik bakilirsa hedef tas
   katmanina duser ve "sadece havaya koyar" kurali yuzunden hicbir
   ors/buz konmaz -- kodun degil kurulumun hatasi olur.            */
const BAKIS = { x: 1, y: -0.05, z: 0 };
const BAS = { x: 0.5, y: 90.6, z: 0.5 };

// Bakis dogrultusunda n blok ilerideki nokta (koni testleri icin)
function bakisUstunde(n) {
  const u = Math.hypot(BAKIS.x, BAKIS.y, BAKIS.z);
  return {
    x: BAS.x + (BAKIS.x / u) * n,
    y: (BAS.y - 1.62) + (BAKIS.y / u) * n,
    z: BAS.z + (BAKIS.z / u) * n
  };
}

/* Yetenegi KOL uzerinden degil, DOGRUDAN kimligiyle calistirir.

   Eskiden "scriptevent simsek:kol kol_ors" gonderiliyordu, yani
   test bir KOLA ve o kolun secili yetenegine bagliydi. v4.46'da
   Ors Kolu kaldirilip ors Toprak Kol'un 6. yetenegi olunca bu
   dosya patladi -- yetenek calisiyordu, test yanlis yere
   bakiyordu.

   Artik yetenek kimligi veriliyor ve isi merkezi donguyu taklit
   ederek elle suruyoruz (bot testlerindeki kalibin aynisi).
   Boylece kol dizilimi degistikce bu dosya bir daha bozulmaz. */
const { yetenekAl } = await import("./pack/yetenekler/kayit.js");
const { butceSifirla } = await import("./pack/butce.js");

function calistir(kimlik, kur) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, BAKIS, BAS);
  o.id = "t-" + kimlik + "-" + Math.random();
  o.typeId = "minecraft:player";
  _durum.oyuncular = [];
  if (kur) kur(D, o);

  sus();
  const tanim = yetenekAl(kimlik);
  if (!tanim) { ac(); throw new Error("yetenek yok: " + kimlik); }
  const isler = [].concat(tanim.olustur(o) || []);
  for (let t = 0; t < 600 && isler.length; t++) {
    butceSifirla();
    for (let i = isler.length - 1; i >= 0; i--) {
      if (isler[i].calis()) {
        if (isler[i].bitir) isler[i].bitir();
        isler.splice(i, 1);
      }
    }
    tickIlerlet(1);
  }
  for (const is of isler) if (is.bitir) is.bitir();
  ac();
  return { D, o };
}

const efektleri = (D) => D.boyut._efektler || [];
const efektAdlari = (D) => new Set(efektleri(D).map((e) => e.ad));

/* "=== 1. CAN VERME ===" bolumu v4.33'te SILINDI.

   can_verme yetenegi kaldirildi (kullanici istegi): 10 saniyelik
   yenilenme veriyordu, iksirler 300 saniye veriyor ve kalp ekleme
   kalici. Yetenek yoksa testi de yok.                            */

console.log("=== 2. ORS YAGDIR ===");
{
  // Referans: tek "setblock ~~10~ anvil", orada ne varsa yok ederdi.
  const { D } = calistir("ors");
  const orsler = D.sayac.yazilan.filter((y) => y.tip === "minecraft:anvil");
  kontrol("birden fazla ors kondu (referansta tek taneydi)",
          orsler.length > 1, orsler.length + " ors");
  kontrol("hepsi farkli yere kondu",
          new Set(orsler.map((y) => y.x + "," + y.y + "," + y.z)).size === orsler.length);

  const yukseklikler = new Set(orsler.map((y) => y.y));
  kontrol("hepsi hedefin ustunde ayni yukseklikte", yukseklikler.size === 1,
          [...yukseklikler].join(", "));
}
{
  // Dolu yere ors konmamali -- referansin yok ettigi durum
  const { D, o } = calistir("ors", (D) => { D.bloklar.hepsiDolu = true; });
  const orsler = D.sayac.yazilan.filter((y) => y.tip === "minecraft:anvil");
  kontrol("dolu yere ors KONMADI (hicbir sey yok edilmedi)", orsler.length === 0,
          orsler.length + " ors");
  kontrol("kac yerin dolu oldugu raporlandi",
          /yer doluydu/.test((o._mesajlar || []).join(" ")),
          (o._mesajlar || []).join(" | "));
}

console.log("");
console.log("=== 3. BUZ ADAM ===");
{
  const kurban = {
    id: "kurban", typeId: "minecraft:zombie", isValid: true,
    location: bakisUstunde(6),
    _efekt: [],
    addEffect(ad, sure, o) { this._efekt.push({ ad, sure, o }); }
  };
  const { D, o } = calistir("buz_adam", (D) => { D.boyut._varliklar = [kurban]; });

  const buz = D.sayac.yazilan.filter((y) => y.tip === "minecraft:ice");
  const hava = D.sayac.yazilan.filter((y) => y.tip === "minecraft:air");

  kontrol("hedefin etrafina buz oruldu", buz.length > 0, buz.length + " blok");
  kontrol("hedefe yavaslik verildi",
          kurban._efekt.some((e) => e.ad === "slowness"),
          kurban._efekt.map((e) => e.ad).join(", "));

  const sure = (kurban._efekt.find((e) => e.ad === "slowness") || {}).sure;
  kontrol("yavaslik SURELI (referansta kalicidi)", sure > 0 && sure <= 1200,
          sure + " tick");

  kontrol("sure dolunca buzun HEPSI eridi", hava.length === buz.length,
          buz.length + " kondu, " + hava.length + " kaldirildi");

  const buzYer = new Set(buz.map((y) => y.x + "," + y.y + "," + y.z));
  const havaYer = new Set(hava.map((y) => y.x + "," + y.y + "," + y.z));
  kontrol("kaldirilanlar tam olarak koyduklarimiz",
          buzYer.size === havaYer.size && [...buzYer].every((k) => havaYer.has(k)));
}
{
  // Dolu bir dunyada hicbir sey yok edilmemeli
  const kurban = {
    id: "k2", typeId: "minecraft:zombie", isValid: true,
    location: bakisUstunde(6),
    addEffect: () => {}
  };
  const { D } = calistir("buz_adam", (D) => {
    D.bloklar.hepsiDolu = true;
    D.boyut._varliklar = [kurban];
  });
  const buz = D.sayac.yazilan.filter((y) => y.tip === "minecraft:ice");
  kontrol("dolu yere buz konmadi (var olan yapiya dokunmaz)", buz.length === 0,
          buz.length + " blok");
}
{
  const { o } = calistir("buz_adam");   // onunde kimse yok
  kontrol("hedef yokken uyari verildi",
          /donduracak bir sey yok/.test((o._mesajlar || []).join(" ")),
          (o._mesajlar || []).join(" | "));
}

console.log("");
console.log("=== 4. DUSEN METEOR ===");
{
  /* kol_meteor kolu kaldirildi; meteor artik Toprak Kol'un
     yeteneklerinden biri. Yetenegi dogrudan cagiriyoruz.        */
  const { yetenekAl } = await import("./pack/yetenekler/kayit.js");
  const { butceSifirla } = await import("./pack/butce.js");
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, BAKIS, BAS);
  o.id = "meteor-t"; o.typeId = "minecraft:player";
  _durum.oyuncular = [];
  sus();
  const is = yetenekAl("meteor").olustur(o);
  for (let t = 0; t < 900 && is; t++) {
    butceSifirla();
    if (is.calis()) { if (is.bitir) is.bitir(); break; }
    tickIlerlet(1);
  }
  ac();
  const tnt = D.sayac.dogan.filter((d) => d.tip === "minecraft:tnt");
  const sim = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");

  kontrol("govde YUKARIDA dogdu (referansin tek iyi tarafi)",
          tnt.length > 0, tnt.length + " govde");
  kontrol("patlama sayisi meteor sayisi kadar",
          D.sayac.patlama.length === 6, D.sayac.patlama.length + " patlama");
  kontrol("her patlamada yildirim da dustu", sim.length === D.sayac.patlama.length,
          sim.length + " yildirim");

  const gucler = new Set(D.sayac.patlama.map((p) => p.guc));
  kontrol("patlama gucu BIZIM (vanilla TNT'nin sabit 4'u degil)",
          gucler.size === 1 && !gucler.has(4), "guc " + [...gucler].join(", "));

  const dogumY = tnt.map((t) => t.y);
  const patlamaY = D.sayac.patlama.map((p) => p.y);
  kontrol("govde patladigi yerden yukarida dogdu",
          Math.min(...dogumY) > Math.max(...patlamaY),
          "dogum y=" + Math.min(...dogumY).toFixed(1) +
          " patlama y=" + Math.max(...patlamaY).toFixed(1));

  kontrol("havada TNT birakilmadi (vanilla guc-4 patlamasi olmaz)",
          (D.boyut._kalanVarlik || []).length === 0);
}

console.log("");
console.log("=== 5. BUTCE: hicbir tick tavani asmadi ===");
{
  for (const [ad, kisa] of [["ors", "ors"], ["buz adam", "buz_adam"],
                            ["savurma", "savur"]]) {
    const { D } = calistir(kisa, (D) => {
      if (kisa === "buz_adam") {
        D.boyut._varliklar = [{
          id: "b", typeId: "minecraft:zombie", isValid: true,
          location: bakisUstunde(6), addEffect: () => {}
        }];
      }
    });
    const enFazla = Math.max(0, ...Object.values(D.sayac.tickBlok || {}));
    kontrol(ad.padEnd(10) + " tick basina en fazla " + enFazla + " blok islemi",
            enFazla <= TAVAN, "tavan " + TAVAN);
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum yeni yetenek testleri gecti");
process.exit(hata ? 1 : 0);

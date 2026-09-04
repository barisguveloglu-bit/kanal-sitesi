/* TOPRAK KOL -- tek esya, bes yetenek.
     egil + yukari bak, tut -> KOL ICINDE sonraki yetenege gec
     egil + zipla           -> secili yetenegi calistir

   Kritik nokta: kol icindeki gecis GENEL siraya dokunmamali, ve
   kolu birakip geri alinca secim yerinde kalmali.                */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";

const KOL_IDLER = [
  "pa:kol_toprak", "pa:kol_buz", "pa:kol_halka", "pa:kol_simsek",
  "pa:kol_savur", "pa:kol_ucus", "pa:kol_ors"
];
esyaKaydet(...KOL_IDLER);

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

/* DIKKAT: bu import main.js'ten SONRA olmali.

   kollar.js yeteneklere esya bagliyor ve bunu modul yuklenirken
   BIR KEZ yapiyor. Once import edilirse yetenek dosyalari henuz
   calismamis olur, hicbir bag kurulmaz ve modul onbellege
   girdigi icin bir daha denenmez -- sessizce butun kollar oler.
   (v3.3'te oyunda basimiza gelen hatanin aynisi; bu testin ilk
   halinde de tekrarlanmisti.)                                   */
const { KOL_ESYALARI } = await import("./pack/yetenekler/kollar.js");
const N = KOL_ESYALARI.find((r) => r[0] === "pa:kol_toprak").length - 1;

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

// Neredeyse yatay bakis: hedef sahte dunyanin hava katmaninda kalsin
const BAKIS = { x: 1, y: -0.05, z: 0 };
const YUKARI = { x: 0, y: 1, z: 0 };
const BAS = { x: 0.5, y: 90.6, z: 0.5 };

/* Jest taramasi ESYASIZ_TARAMA=4 tick'te bir donuyor ve
   degistirme jesti ESYASIZ_TUTMA=8 tick tutulmali. Bakis yonu
   oyuncu nesnesinde sabit oldugu icin "yukari bak" ve "ileri bak"
   ayri oyuncu nesneleri gerektiriyor -- gercek oyunda ayni oyuncu
   basini kaldirip indiriyor, burada nesneyi degistiriyoruz.      */
function kur(bakis, elde, id = "tk") {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, bakis, BAS);
  o.id = id;                        // ayni id: secim oyuncuya bagli
  o.typeId = "minecraft:player";
  o.isSneaking = true;
  o._elde = elde;
  _durum.oyuncular = [o];
  return { D, o };
}

// Yukari bakip jesti tamamla, sonra durusu boz (tekrar icin sart)
function birGecis(elde) {
  const { o } = kur(YUKARI, elde);
  sus(); tickIlerlet(16); ac();
  const yazi = o.onScreenDisplay._son;
  // durusu boz
  const { o: o2 } = kur(BAKIS, elde);
  sus(); tickIlerlet(8); ac();
  return yazi;
}

console.log("=== 1. KOL ICINDE GECIS ===");
{
  const gorulen = [];
  for (let i = 0; i < N; i++) gorulen.push(birGecis("pa:kol_toprak"));

  for (const y of gorulen) console.log("     " + y);

  kontrol("her gecis bir yetenek adi gosterdi",
          gorulen.every((y) => y && y.indexOf("»") !== -1));
  kontrol("sayac " + N + "'lik (koldaki yetenek sayisi)",
          gorulen.every((y) => new RegExp("/" + N).test(y || "")));

  const adlar = gorulen.map((y) => (y || "").replace(/§./g, "").replace(/[»\s]*/, "").split(" §8")[0].trim());
  kontrol(N + " gecis sonunda basa donuldu (dongusel)",
          new Set(adlar).size === N, adlar.join(" -> "));
}

console.log("");
console.log("=== 2. GECIS GENEL SIRAYA DOKUNMUYOR ===");
{
  // Once kol elde birkac gecis yap
  birGecis("pa:kol_toprak");
  birGecis("pa:kol_toprak");

  // Sonra kolu birak, elsiz gecis yap: genel sira bastan olmali
  const yazi = birGecis(undefined);
  console.log("     elsiz gecis: " + yazi);
  kontrol("elsiz gecis sayac GOSTERMIYOR (genel sira, kol degil)",
          !/\/\d/.test(yazi || ""), yazi);
}

console.log("");
console.log("=== 3. SECILI YETENEK CALISIYOR ===");
{
  /* TEMIZ oyuncu kimligi sart: secim oyuncuya bagli ve modul
     boyunca yasiyor. Yukaridaki testler "tk" ile yedi gecis
     yapti, o kimlikle baslasak varsayilani degil o secimi
     olcerdik.                                                  */
  const { D, o } = kur(BAKIS, "pa:kol_toprak", "tk-temiz");
  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(300); ac();

  /* v4.33'te can_verme kaldirilinca varsayilan secim (0. sira)
     toprak_topu oldu. Hangi yetenek oldugu ELLE yazilmiyor:
     kollar.js'teki satirin ilk yetenegi ne ise o.             */
  const kollar = await import("./pack/yetenekler/kollar.js");
  const ilkYetenek = kollar.KOL_ESYALARI
    .find((r) => r[0] === "pa:kol_toprak")[1];
  kontrol("varsayilan secim listenin ILK yetenegi",
          ilkYetenek === "toprak_topu", ilkYetenek);
  kontrol("varsayilan secim gercekten calisti (toprak topu uctu)",
          D.sayac.dogan.length > 0 || D.sayac.setType > 0,
          D.sayac.dogan.length + " varlik, " + D.sayac.setType + " blok");
}

console.log("");
console.log("=== 4. KOL BIRAKILIP GERI ALININCA SECIM DURUYOR ===");
{
  const D0 = dunyaKur();
  const o = oyuncuKur(D0.boyut, YUKARI, BAS);
  o.id = "tk2";
  o.typeId = "minecraft:player";
  o.isSneaking = true;
  o._elde = "pa:kol_toprak";
  _durum.oyuncular = [o];

  sus(); tickIlerlet(16); ac();              // 1. gecis -> 2/5
  const ilk = o.onScreenDisplay._son;

  o._elde = undefined;                        // kolu birak
  sus(); tickIlerlet(40); ac();
  o._elde = "pa:kol_toprak";                  // geri al

  // durusu bozup tekrar gecis yap
  o.getViewDirection = () => ({ x: 1, y: -0.05, z: 0 });
  sus(); tickIlerlet(8); ac();
  o.getViewDirection = () => ({ x: 0, y: 1, z: 0 });
  sus(); tickIlerlet(16); ac();
  const ikinci = o.onScreenDisplay._son;

  console.log("     once : " + ilk);
  console.log("     sonra: " + ikinci);
  kontrol("secim sifirlanmadi, 2/" + N + "'ten 3/" + N + "'e gecti",
          new RegExp("2/" + N).test(ilk || "") && new RegExp("3/" + N).test(ikinci || ""));
}

console.log("");
console.log("=== 5. TOPRAK YUKSELISI ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, BAKIS, BAS);
  o.id = "tu";
  o.typeId = "minecraft:player";
  _durum.oyuncular = [];

  // Yukselirken oyuncu gercekten yukari ciksin
  let t0 = null;
  Object.defineProperty(o, "location", {
    get() {
      if (t0 === null) t0 = 0;
      return { x: BAS.x, y: (BAS.y - 1.62) + (t0 += 0.1), z: BAS.z };
    }
  });

  const { scriptEventTetikle } = await import("@minecraft/server");
  sus();
  scriptEventTetikle({ id: "simsek:kol", message: "kol_ucus", sourceEntity: o });
  tickIlerlet(400);
  ac();

  // kol_ucus tek yetenekli (duz ucus) -- blok yazmamali
  kontrol("duz Ucus kolu blok yazmiyor", D.sayac.setType === 0,
          D.sayac.setType + " blok");
}
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, BAKIS, BAS);
  o.id = "tu2";
  o.typeId = "minecraft:player";
  o.isSneaking = true;
  o._elde = "pa:kol_toprak";
  _durum.oyuncular = [o];

  let t0 = 0;
  Object.defineProperty(o, "location", {
    get() { return { x: BAS.x, y: (BAS.y - 1.62) + t0, z: BAS.z }; }
  });

  /* Toprak Yukselisi'ne gelene kadar gec. Sirasini sabit
     varsaymiyoruz -- yeni yetenek eklenince kaymasin.          */
  let secili = "";
  for (let i = 0; i < N; i++) {
    o.getViewDirection = () => ({ x: 0, y: 1, z: 0 });
    sus(); tickIlerlet(16); ac();
    o.getViewDirection = () => ({ x: 1, y: -0.05, z: 0 });
    sus(); tickIlerlet(8); ac();
    secili = o.onScreenDisplay._son || "";
    if (/Toprak Yukselisi/.test(secili)) break;
  }
  console.log("     secili: " + secili);

  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;

  // yukselirken sutun orulsun
  for (let i = 0; i < 200; i++) { t0 += 0.1; sus(); tickIlerlet(1); ac(); }
  sus(); tickIlerlet(200); ac();

  const toprak = D.sayac.yazilan.filter((y) => y.tip === "minecraft:dirt");
  kontrol("Toprak Yukselisi secildi", /Toprak Yukselisi/.test(secili || ""), secili);
  kontrol("altinda toprak sutunu oruldu", toprak.length > 1, toprak.length + " blok");

  const yler = toprak.map((y) => y.y).sort((a, b) => a - b);
  kontrol("sutun yukari dogru buyudu",
          yler.length > 1 && yler[yler.length - 1] > yler[0],
          "y " + yler[0] + " -> " + yler[yler.length - 1]);
  kontrol("hepsi farkli yukseklikte (ayni yere iki kez yazilmadi)",
          new Set(yler).size === yler.length);

  const enFazla = Math.max(0, ...Object.values(D.sayac.tickBlok || {}));
  kontrol("tick basina blok butcesi asilmadi", enFazla <= TAVAN, enFazla + " / " + TAVAN);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum Toprak Kol testleri gecti");
process.exit(hata ? 1 : 0);

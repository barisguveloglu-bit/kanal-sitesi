/* TEK SIMSEK -- nisan aldigin yere BIR simsek.        v7.52

   Kullanici iki eklenti gonderdi (Boby1545 Mini Pack ·
   Kevin1545 modu) ve sordu: "bir tanesinde tek tek Simsek
   atabiliyorsun ... onun nasil yaptigina bir bak bize gecir."

   ---- KAYNAKTA IKI YOL VAR ----
     Kevin1545 · yildirim.mcfunction (TEK SATIR):
       summon lightning_bolt ^^^12
     Boby1545 · menu.js "1535_0":
       getEntitiesFromRay -> getBlockFromRay -> yon*12

   Bizde dort simsek yetenegi vardi ve DORDU DE YAGMUR. Tek
   atis diye bir sey yoktu; kullanicinin gordugu eksik buydu.

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   YAGMURA DONMEMESI. Tek atisin butun degeri "bir bas, bir
   simsek". Biri gelip SIMSEK_SAYISI kadar dogurmaya kalkarsa
   ya da bir is acarsa 1. ve 6. bolum kirmizi yanar.

   Sinananlar:
     1. Tek basista TEK varlik doguyor, is ACILMIYOR
     2. Varliga nisan: simsek hedefin USTUNE dusuyor
     3. Varlik yoksa baktigin BLOGA dusuyor
     4. Ikisi de yoksa TEK_SIMSEK_UZAK blok ileri (kaynagin hali)
     5. Duvara bakarken duvarin ARKASINA gecmiyor
        (kaynagin ^^^12'si geciyor -- bilincli fark)
     6. Bekleme suresi tutuyor, ikinci basis bos gecmiyor
     7. Butce doluyken hicbir sey dogmuyor
     8. Oyuncu cikinca defter temizleniyor                    */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { _durum } from "@minecraft/server";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const tek = await import("./pack/yetenekler/tek_simsek.js");
const butce = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const tanim = kayit.yetenekBul
  ? kayit.yetenekBul("tek_simsek")
  : [...(kayit.tumYetenekler ? kayit.tumYetenekler() : [])]
      .find((y) => y.kimlik === "tek_simsek");

function kurbanOyuncu(x, y, z) {
  return {
    id: "kurban", typeId: "minecraft:player", isValid: true,
    location: { x, y, z },
    addEffect: () => true, removeEffect: () => true,
    applyDamage: () => true, teleport: () => true,
    getComponent: () => undefined
  };
}

let n = 0;
function kur(bakis, bas) {
  butce.butceSifirla();
  tek.tekSimsekUnut();
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, bakis, bas);
  o.id = "n" + (++n); o.typeId = "minecraft:player";
  o.runCommand = () => ({ successCount: 1 });
  o.sendMessage = () => {};
  D.boyut._varliklar = [];
  _durum.oyuncular = [o];
  return { D, o };
}

const dogan = (D) => D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");

console.log("=== 0. YETENEK KAYITLI ===");
kontrol("tek_simsek kayitli", !!tanim, tanim ? tanim.ad : "yok");
kontrol("ayar acik", ayar.TEK_SIMSEK_ACIK === true);

console.log("=== 0b. KOLA BAGLI MI  (v7.52.2) ===");
{
  /* ---- KULLANICININ BULDUGU EKSIK ----
     "tekli Simsek hangi kola ekledin, nasil yapabiliyorum,
     onu goremedim."

     v7.52'de yetenek YALNIZCA esyasiz jest sirasindaydi.
     main.js'in esyasizOyuncu'su elde KOL varsa genel siraya
     HIC girmiyor (secimler.length === 0 dali atlaniyor), yani
     Toprak Kol tutan biri icin yetenek hic yoktu. Bulunamamasi
     kullanicinin dikkatsizligi degil, bagin eksikligiydi.

     Bu bolum onun kaydi: yeni bir yetenek "kayitli" olmakla
     ULASILABILIR olmak ayni sey degil.                      */
  const bagli = ["pa:kol_toprak", "pa:kol_kanli"];
  for (const kol of bagli) {
    const l = kayit.esyaninYetenekleri(kol) || [];
    kontrol(kol + " tek_simsek tasiyor",
            l.some((y) => y.kimlik === "tek_simsek"),
            l.length + " yetenek");
  }
  kontrol("esyasiz sirada da duruyor (bos elle de calisir)",
          kayit.esyasizSira().some((y) => y.kimlik === "tek_simsek"));
  /* Yon Simsegi'nin YANINDA olmali: ikisi de nisan alip
     simsek atiyor, arka arkaya durmalari bir tercih.       */
  const t = (kayit.esyaninYetenekleri("pa:kol_toprak") || [])
    .map((y) => y.kimlik);
  kontrol("Yon Simsegi'nin hemen ardinda",
          t.indexOf("tek_simsek") === t.indexOf("yon_simsegi") + 1,
          "yon=" + t.indexOf("yon_simsegi") + " tek=" + t.indexOf("tek_simsek"));
}

console.log("=== 1. TEK BASIS -> TEK VARLIK, IS YOK ===");
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  const is = tanim.olustur(o);
  const l = dogan(D);
  kontrol("bir simsek dogdu", l.length === 1, l.length + " tane");
  /* Yagmur olsaydi is doner ve her tick daha cok dogardi.
     Tek atisin butun degeri burada.                        */
  kontrol("IS ACILMADI (yagmur degil)", is === undefined,
          is ? "is dondu: " + is.ad : "yok");
  kontrol("SIMSEK_SAYISI kadar dogmadi",
          l.length < ayar.SIMSEK_SAYISI,
          l.length + " < " + ayar.SIMSEK_SAYISI);
}

console.log("=== 2. VARLIGA NISAN -- hedefin USTUNE ===");
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  const rakip = kurbanOyuncu(10.5, 89, 0.5);
  D.boyut._varliklar = [rakip];
  tanim.olustur(o);
  const l = dogan(D);
  kontrol("simsek dogdu", l.length === 1);
  kontrol("hedefin konumunda", l.length === 1 &&
          Math.abs(l[0].x - 10.5) < 0.01 && Math.abs(l[0].z - 0.5) < 0.01,
          l.length ? l[0].x + "," + l[0].y + "," + l[0].z : "-");
}

console.log("=== 3. VARLIK YOK -> BAKTIGIN BLOK ===");
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  /* dunya.mjs'in raycast'i GERCEK blok okuyor -- duvari
     gercekten ormek lazim. Ilk yazimda sahte bir alan
     ("_blokVurus") set edilmisti ve raycast onu hic okumadi:
     test duvari degil, uzak-nokta yolunu olcuyordu. Yesil
     yanan ama yanlis yeri olcen bir test, test degildir.  */
  for (let dy = -1; dy <= 2; dy++) {
    D.boyut.getBlock({ x: 6, y: 89 + dy, z: 0 }).setType("minecraft:stone");
  }
  tanim.olustur(o);
  const l = dogan(D);
  kontrol("simsek dogdu", l.length === 1, l.length + " tane");
  if (l.length === 1) {
    /* Duvar x=6'da; hedefBul blogun ustune +1 y koyuyor.  */
    kontrol("duvarin yuzeyine dustu (uzak noktaya DEGIL)",
            Math.abs(l[0].x - 6.5) < 1.01,
            "x=" + l[0].x.toFixed(1) + " (duvar 6)");
  }
}

console.log("=== 4. HICBIRI YOK -> TEK_SIMSEK_UZAK BLOK ILERI ===");
{
  /* Kaynagin davranisi. Gokyuzune bakarken de bir sey olmali;
     yoksa yetenek "bazen calismiyor" olurdu.                */
  const { D, o } = kur({ x: 0, y: 1, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  tanim.olustur(o);
  const l = dogan(D);
  kontrol("gokyuzune bakarken de dogdu", l.length === 1, l.length + " tane");
  kontrol("UZAK ayari kaynagin sayisi (12)", ayar.TEK_SIMSEK_UZAK === 12,
          String(ayar.TEK_SIMSEK_UZAK));
}

console.log("=== 5. DUVARIN ARKASINA GECMIYOR  (kaynaktan FARK) ===");
{
  /* Kevin'in `summon lightning_bolt ^^^12`si arada duvar olsa
     da 12 blok ileri vuruyor -- yani duvarin ARKASINA. Bizde
     nisan uc kademeli ve blok kademesi ikinci sirada.       */
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  for (let dy = -1; dy <= 2; dy++) {
    D.boyut.getBlock({ x: 3, y: 89 + dy, z: 0 }).setType("minecraft:stone");
  }
  tanim.olustur(o);
  const l = dogan(D);
  kontrol("simsek dogdu", l.length === 1);
  if (l.length === 1) {
    const uzaklik = l[0].x - 0.5;
    kontrol("duvarda kaldi, 12 bloga GITMEDI",
            uzaklik < ayar.TEK_SIMSEK_UZAK,
            uzaklik.toFixed(1) + " < " + ayar.TEK_SIMSEK_UZAK);
  }
}

console.log("=== 6. BEKLEME TUTUYOR ===");
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  tanim.olustur(o);
  tanim.olustur(o);      // hemen ikinci basis
  tanim.olustur(o);
  const l = dogan(D);
  kontrol("ust uste basmak tek simsek biraktı", l.length === 1,
          l.length + " tane");
  kontrol("bekleme sifir DEGIL", ayar.TEK_SIMSEK_BEKLEME > 0,
          ayar.TEK_SIMSEK_BEKLEME + " tick");
}

console.log("=== 7. BUTCE DOLUYKEN DOGMUYOR ===");
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  /* Tavani tuketen bir dongu; tek varlik da olsa kural kural. */
  let guvenlik = 0;
  while (butce.varlikIste(1) && ++guvenlik < 100000) { /* tuket */ }
  tanim.olustur(o);
  kontrol("butce doluyken hicbir sey dogmadi", dogan(D).length === 0,
          dogan(D).length + " tane");
}

console.log("=== 8. OYUNCU CIKINCA DEFTER TEMIZLENIYOR ===");
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  tanim.olustur(o);
  tek.tekSimsekUnut(o.id);
  const l1 = dogan(D).length;
  tanim.olustur(o);      // defter silindi -> bekleme de silindi
  kontrol("unutunca yeniden atabiliyor", dogan(D).length === l1 + 1,
          dogan(D).length + " tane");
  const ana = await import("./pack/main.js");
  kontrol("main.js tekSimsekUnut'u cagiriyor",
          /tekSimsekUnut\(olay\.playerId\)/.test(
            (await import("node:fs")).readFileSync("./pack/main.js", "utf8")));
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);

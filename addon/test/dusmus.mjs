/* DUSMUS VIRUSU  (Fallen)                                    v6.4

   Kullanici duzeltti: "sen fallen'i bir ZIRH olarak eklemissin,
   zirh olmayacak bir BLOK olacak. Ustune ciktigimiz zaman dort
   asamadan olusuyor; dorde geldikten sonra bedenden CIKMAYAN
   bir zirha donusuyor. Temel olarak VIRUS gibi bir sey, tek
   zaafi ATES."

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY: 4. BOLUM ----
   Kaynak kurbanin dort zirh yuvasini da SILIYOR. Bu depoda esya
   kaybettiren hicbir sey yok. Zirhin bulasmadan once deftere
   yazilip iyilesince AYNEN geri verildigi olculuyor -- yoksa
   "geri veriyoruz" bir yorum satiri olarak kalirdi.           */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum, sohbetTetikle } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const dus = await import("./pack/yetenekler/dusmus.js");

/* Dort asama parcasi ile gercek zirhlar oyuna KAYITLI olmali:
   sahte dunya kaydolmayan esyayi reddediyor -- oyundaki
   davranisin aynisi. Kaydolmasaydi gorunum sessizce atlanirdi
   (kod onu zaten yakaliyor, ama o zaman virus gorunmezdi). */
esyaKaydet("pa:kns_dusmus_1", "pa:kns_dusmus_2", "pa:kns_dusmus_3",
           "pa:kns_dusmus_4",
           "minecraft:diamond_helmet", "minecraft:netherite_chestplate",
           "minecraft:iron_leggings", "minecraft:golden_boots");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* Zirh yuvalari olan sahte oyuncu. */
function kur(zirh = {}) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 },
                      { x: 0.5, y: 64.6, z: 0.5 });
  o.id = "d1"; o.typeId = "minecraft:player";
  o.location = { x: 0.5, y: 64, z: 0.5 };
  o._yuva = Object.assign({ Head: undefined, Chest: undefined,
                            Legs: undefined, Feet: undefined }, zirh);
  o._efekt = new Map();
  o._ates = 0;
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (y) => (o._yuva[y] ? { typeId: o._yuva[y] } : undefined),
        setEquipment: (y, e) => { o._yuva[y] = e ? e.typeId : undefined; return true; }
      };
    }
    if (ad === "minecraft:onfire") {
      return { onFireTicksRemaining: o._ates };
    }
    return eskiGet(ad);
  };
  o.addEffect = (a, s2, sec) => { o._efekt.set(a, sec ? sec.amplifier : 0); return true; };
  o.getEffect = (a) => (o._efekt.has(a) ? { amplifier: o._efekt.get(a) } : undefined);
  o.removeEffect = (a) => { o._efekt.delete(a); return true; };
  o._mesaj = [];
  o._baslik = [];
  o.sendMessage = (m) => { o._mesaj.push(String(m)); };
  o.onScreenDisplay = {
    setActionBar: () => {},
    setTitle: (b, s2) => {
      o._baslik.push(String(b) + " | " +
                     ((s2 && s2.subtitle) ? String(s2.subtitle) : ""));
    }
  };
  o.getViewDirection = () => ({ x: 0, y: 0, z: 1 });
  o.getEntitiesFromViewDirection = () => [];
  o.applyKnockback = () => true;
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  dus.dusmusUnut();
  return { D, o };
}

/* Oyuncunun ayaginin ALTINA Dusmus blogu koy. */
function blokKoy(o) {
  dus.dusmusBlokEkle(o.dimension.id, Math.floor(o.location.x),
                     Math.floor(o.location.y - 0.1),
                     Math.floor(o.location.z));
}

/* Taramayi n kez ilerlet. */
function ilerlet(o, n) {
  for (let i = 0; i < n; i++) {
    tickIlerlet(ayar.DUSMUS_TARAMA);
    dus.dusmusTara([o]);
  }
}

/* Durum degisene kadar ilerlet (tavanli).

   Sabit sayida tur ilerletmek YANLISTI: arinma ~120 tick
   suruyor, bagisiklik 100 tick, testim 225 tick kosuyordu --
   yani arinmadan SONRA bagisikligin da bitmesini bekleyip
   kurbani bloga yeniden bastiriyordum. Kod dogruydu, olcum
   yanlisti.                                                 */
function bekle(o, kosul, tavan = 200) {
  for (let i = 0; i < tavan; i++) {
    if (kosul()) return i;
    tickIlerlet(ayar.DUSMUS_TARAMA);
    dus.dusmusTara([o]);
  }
  return -1;
}

console.log("=== 1. ZIRH DEGIL, BLOK ===");
{
  /* Kullanicinin duzeltmesi: dort asama YARATICI MENUSUNDE
     olmamali, yoksa "1000 koruma" bedava bir zirh olur.
     Menude gorunen tek sey BLOK.                            */
  for (let i = 1; i <= 4; i++) {
    const y = BP + "/items/kns_dusmus_" + i + ".json";
    kontrol("kns_dusmus_" + i + " esyasi var", existsSync(y));
    if (!existsSync(y)) continue;
    const d = oku(y)["minecraft:item"].description;
    kontrol("  menude YOK (zirh degil, durum)",
            d.menu_category === undefined, JSON.stringify(d.menu_category));
  }
  const bl = BP + "/blocks/kns_dusmus_blok.json";
  kontrol("Dusmus Blogu tanimli", existsSync(bl));
  if (existsSync(bl)) {
    const b = oku(bl)["minecraft:block"];
    kontrol("  blok MENUDE var", !!b.description.menu_category);
    kontrol("  kimlik ayarlarla ayni",
            b.description.identifier === ayar.DUSMUS_BLOK,
            b.description.identifier);
    /* Yanabilir olmasi virusun ates zaafiyla tutarli. */
    kontrol("  yanabilir (ates zaafiyla tutarli)",
            !!b.components["minecraft:flammable"]);
  }
  kontrol("blok dokusu pakette",
          existsSync(RP + "/textures/blocks/kns_dusmus_blok.png"));
  /* Blok dokusu ESYA atlasindan degil TERRAIN atlasindan
     geliyor; ikisi de yazilmazsa blok mor-siyah cikar.      */
  const tt = RP + "/textures/terrain_texture.json";
  kontrol("terrain_texture kaydi var",
          existsSync(tt) && !!oku(tt).texture_data.kns_dusmus_blok);
  const bj = RP + "/blocks.json";
  kontrol("blocks.json kaydi var",
          existsSync(bj) && !!oku(bj)[ayar.DUSMUS_BLOK]);
}

console.log("");
console.log("=== 2. BLOGA BASINCA DORT ASAMA ===");
{
  const { o } = kur();
  kontrol("baslangicta temiz", dus.dusmusDurum(o.id) === undefined);

  /* Blok YOKKEN hicbir sey olmamali. */
  ilerlet(o, 3);
  kontrol("blok yokken bulasmiyor", dus.dusmusDurum(o.id) === undefined);

  blokKoy(o);
  ilerlet(o, 1);
  kontrol("bloga basinca bulasti", dus.dusmusDurum(o.id) === "yozlasiyor");
  kontrol("  1. asama giyildi", o._yuva.Chest === "pa:kns_dusmus_1",
          String(o._yuva.Chest));

  /* Her asama DUSMUS_ASAMA_ARA tick sonra. */
  const adim = Math.ceil(ayar.DUSMUS_ASAMA_ARA / ayar.DUSMUS_TARAMA) + 1;
  ilerlet(o, adim);
  kontrol("2. asamaya gecti", o._yuva.Chest === "pa:kns_dusmus_2",
          String(o._yuva.Chest));
  ilerlet(o, adim);
  kontrol("3. asamaya gecti", o._yuva.Chest === "pa:kns_dusmus_3",
          String(o._yuva.Chest));
  ilerlet(o, adim);
  kontrol("4. asamaya gecti", o._yuva.Chest === "pa:kns_dusmus_4",
          String(o._yuva.Chest));
  kontrol("  durum artik KALICI", dus.dusmusDurum(o.id) === "dusmus");
  kontrol("  dort yuva da Dusmus",
          ["Head", "Chest", "Legs", "Feet"]
            .every((y) => o._yuva[y] === "pa:kns_dusmus_4"));
  kontrol("  korluk verildi", o.getEffect("blindness") !== undefined);
}

console.log("");
console.log("=== 3. DORDUNCU ASAMA BEDENDEN CIKMIYOR ===");
{
  /* Kullanici: "dorde geldikten sonra otomatik olarak bedenden
     CIKMAYAN bir zirha donusuyor." Kaynakta boyle DEGIL --
     orada blogun ustunden inince her sey siliniyor.         */
  const { o } = kur();
  blokKoy(o);
  const adim = Math.ceil(ayar.DUSMUS_ASAMA_ARA / ayar.DUSMUS_TARAMA) + 1;
  ilerlet(o, 1 + adim * 3);
  kontrol("tam yozlasma", dus.dusmusDurum(o.id) === "dusmus");

  /* Blogun ustunden in: KURTARMAMALI. */
  o.location = { x: 40.5, y: 64, z: 40.5 };
  ilerlet(o, 3);
  kontrol("blogun ustunden inmek KURTARMIYOR",
          dus.dusmusDurum(o.id) === "dusmus");

  /* Elle cikarmaya calis: geri giyilmeli. */
  o._yuva.Chest = undefined;
  o._yuva.Head = undefined;
  ilerlet(o, adim);
  kontrol("elle cikarilan parca GERI giyiliyor",
          o._yuva.Chest === "pa:kns_dusmus_4" &&
          o._yuva.Head === "pa:kns_dusmus_4");
}

console.log("");
console.log("=== 4. ZIRHIN KAYBOLMUYOR (en onemli bolum) ===");
{
  /* Kaynak dort yuvayi da SILIYOR. Bu depoda esya kaybettiren
     hicbir sey yok.                                          */
  const { o } = kur({ Head: "minecraft:diamond_helmet",
                      Chest: "minecraft:netherite_chestplate",
                      Legs: "minecraft:iron_leggings",
                      Feet: "minecraft:golden_boots" });
  blokKoy(o);
  const adim = Math.ceil(ayar.DUSMUS_ASAMA_ARA / ayar.DUSMUS_TARAMA) + 1;
  ilerlet(o, 1 + adim * 3);
  kontrol("tam yozlasti", dus.dusmusDurum(o.id) === "dusmus");
  kontrol("  gercek zirh SU AN uzerinde degil",
          o._yuva.Chest === "pa:kns_dusmus_4");

  /* Ates: dort asama tersine. */
  dus.dusmusAtesle(o);
  kontrol("ates arinmayi baslatti", dus.dusmusDurum(o.id) === "ariniyor");
  const tur = bekle(o, () => dus.dusmusDurum(o.id) === undefined);
  kontrol("arinma bitti", tur >= 0, tur + " tarama");

  kontrol("ELMAS MIGFER geri geldi",
          o._yuva.Head === "minecraft:diamond_helmet", String(o._yuva.Head));
  kontrol("NETHERITE GOGUSLUK geri geldi",
          o._yuva.Chest === "minecraft:netherite_chestplate", String(o._yuva.Chest));
  kontrol("DEMIR PANTOLON geri geldi",
          o._yuva.Legs === "minecraft:iron_leggings", String(o._yuva.Legs));
  kontrol("ALTIN BOT geri geldi",
          o._yuva.Feet === "minecraft:golden_boots", String(o._yuva.Feet));
  kontrol("korluk kalkti", o.getEffect("blindness") === undefined);

  /* Bos yuvayla bulasip iyilesen BOS kalmali -- uydurma zirh
     verilmemeli.                                            */
  const b = kur();
  blokKoy(b.o);
  ilerlet(b.o, 1 + adim * 3);
  dus.dusmusAtesle(b.o);
  bekle(b.o, () => dus.dusmusDurum(b.o.id) === undefined);
  kontrol("bos yuva bos kaldi (uydurma zirh yok)",
          ["Head", "Chest", "Legs", "Feet"]
            .every((y) => b.o._yuva[y] === undefined));
}

console.log("");
console.log("=== 4b. IYILESINCE KISA BAGISIKLIK ===");
{
  /* Ates caresini yazdiktan sonra testte goruldu: kurban
     iyilesiyor ama HALA BLOGUN USTUNDE oldugu icin ayni tarama
     turunda yeniden bulasiyordu -- yani ates hicbir ise
     yaramiyordu. Kisa bir bagisiklik penceresi eklendi.     */
  const { o } = kur();
  blokKoy(o);
  const adim = Math.ceil(ayar.DUSMUS_ASAMA_ARA / ayar.DUSMUS_TARAMA) + 1;
  ilerlet(o, 1 + adim * 3);
  dus.dusmusAtesle(o);
  bekle(o, () => dus.dusmusDurum(o.id) === undefined);
  kontrol("iyilesti", dus.dusmusDurum(o.id) === undefined);

  /* Blogun USTUNDE dururken hemen yeniden bulasmamali. */
  ilerlet(o, 2);
  kontrol("blogun ustunde ama HEMEN yeniden bulasmiyor",
          dus.dusmusDurum(o.id) === undefined);

  /* Bagisiklik BITINCE yeniden bulasmali -- kalici bir kalkan
     degil, kacacak kadar zaman.                             */
  ilerlet(o, Math.ceil(ayar.DUSMUS_BAGISIKLIK / ayar.DUSMUS_TARAMA) + 2);
  kontrol("bagisiklik bitince yeniden bulasiyor",
          dus.dusmusDurum(o.id) !== undefined,
          String(dus.dusmusDurum(o.id)));
}

console.log("");
console.log("=== 5. ATES: TEK ZAAF ===");
{
  /* Yanmak da tetiklemeli (cakmak main.js'ten cagiriyor). */
  const { o } = kur();
  blokKoy(o);
  const adim = Math.ceil(ayar.DUSMUS_ASAMA_ARA / ayar.DUSMUS_TARAMA) + 1;
  ilerlet(o, 1 + adim * 3);
  kontrol("tam yozlasti", dus.dusmusDurum(o.id) === "dusmus");
  o._ates = ayar.DUSMUS_ATES_TICK + 5;
  ilerlet(o, 1);
  kontrol("YANMAK da arinmayi baslatiyor",
          dus.dusmusDurum(o.id) === "ariniyor");

  /* Cakmak main.js'te BAGLI mi? Yazilip baglanmamak eski bir
     tuzak (efsane.js, konseySilahKir).                      */
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js dusmus.js'i import ediyor",
          kaynak.includes('import { dusmusTara, dusmusUnut, dusmusAtesle }'));
  kontrol("cakmak itemUse'a BAGLI",
          /DUSMUS_CAKMAK && dusmusAtesle\(oyuncu\)/.test(kaynak));
  kontrol("tarama merkezi tick'ten cagriliyor",
          /dusmusTara\(oyuncular\)/.test(kaynak));
  kontrol("oyuncu cikinca defter temizleniyor",
          /dusmusUnut\(olay\.playerId\)/.test(kaynak));
  kontrol("cakmak ayari vanilla cakmak",
          ayar.DUSMUS_CAKMAK === "minecraft:flint_and_steel",
          ayar.DUSMUS_CAKMAK);
}

console.log("");
console.log("=== 6. BOS DUNYADA HIC BLOK OKUMUYOR ===");
{
  /* Ilk yazdigimda tarama her oyuncu icin bes tick'te bir
     getBlock cagiriyordu ve UC TEST birden dustu (ciftel,
     duvardel "57/56"; iksir "40 okuma"). Deponun kurali:
     defter bosken HIC DONME.                                */
  const { D, o } = kur();
  const once = D.sayac.getBlock;
  ilerlet(o, 20);
  kontrol("blok yokken hic getBlock yok",
          D.sayac.getBlock === once,
          (D.sayac.getBlock - once) + " okuma");

  /* Blok VARKEN de okumamali: konum karsilastirmasi yeterli. */
  blokKoy(o);
  const once2 = D.sayac.getBlock;
  ilerlet(o, 10);
  kontrol("blok varken de hic getBlock yok",
          D.sayac.getBlock === once2,
          (D.sayac.getBlock - once2) + " okuma");
  kontrol("  ama bulasma yine calisti",
          dus.dusmusDurum(o.id) !== undefined, String(dus.dusmusDurum(o.id)));
}

console.log("");
console.log("=== 7. SECILME VE YEMIN ===");
{
  /* Kullanici: "4 asamadayken uzun sure kalirsak korluk gitsin,
     ekrana 'Yucelerin Yucesi tarafindan secildin' yazsin;
     sohbete de bir yemin yazdiralim, onu yazarsa 'artik tam
     anlamiyla bir asker oldun' desin."                       */
  const { o } = kur();
  blokKoy(o);
  const adim = Math.ceil(ayar.DUSMUS_ASAMA_ARA / ayar.DUSMUS_TARAMA) + 1;
  ilerlet(o, 1 + adim * 3);
  kontrol("dorduncu asamada", dus.dusmusDurum(o.id) === "dusmus");
  kontrol("  su an KOR", o.getEffect("blindness") !== undefined);

  /* Sure DOLMADAN secilmemeli: "uzun sure kalirsak" sarti
     yoksa secilme dorde varir varmaz olurdu.                */
  const yari = Math.floor(ayar.DUSMUS_SECILME_SURE /
                          ayar.DUSMUS_TARAMA / 2);
  ilerlet(o, yari);
  kontrol("sure dolmadan SECILMIYOR", dus.dusmusDurum(o.id) === "dusmus");
  kontrol("  hala kor", o.getEffect("blindness") !== undefined);

  const tur = bekle(o, () => dus.dusmusDurum(o.id) === "secilmis",
                    Math.ceil(ayar.DUSMUS_SECILME_SURE /
                              ayar.DUSMUS_TARAMA) + 5);
  kontrol("sure dolunca SECILDI", tur >= 0, tur + " tarama");
  kontrol("  KORLUK KALKTI", o.getEffect("blindness") === undefined);
  kontrol("  ekrana baslik dustu", o._baslik.length > 0,
          o._baslik.join(" / "));
  kontrol("  alt yazi 'Yucelerin Yucesi' diyor",
          o._baslik.some((b) => b.includes("Yücelerin Yücesi")),
          o._baslik.join(" / "));
  kontrol("  yemin sohbete yazildi",
          o._mesaj.some((m) => m.includes(ayar.DUSMUS_YEMIN)),
          String(o._mesaj.length) + " mesaj");
  /* Parcalar hala bedende: secilmek zirhi cozmuyor. */
  kontrol("  dort yuva hala Dusmus",
          ["Head", "Chest", "Legs", "Feet"]
            .every((yv) => o._yuva[yv] === "pa:kns_dusmus_4"));

  /* Yanlis satir HICBIR SEY yapmamali ve sohbete DUSMELI. */
  kontrol("yanlis satir yemin sayilmiyor",
          dus.dusmusYemin(o, "yücelerin yücesi") === false);
  kontrol("  durum degismedi", dus.dusmusDurum(o.id) === "secilmis");

  /* Yemin GERCEK sohbet borusundan gecirilliyor: dusmusYemin
     yalnizca YAZILMIS degil, sohbet.js'e BAGLI olmali. Bu
     depoda yazilip baglanmamis kod iki kez cikti (efsane.js
     import edilmemisti, konseySilahKir hic cagrilmiyordu).   */
  const oncekiBaslik = o._baslik.length;
  const yutuldu = sohbetTetikle(o, ayar.DUSMUS_YEMIN.toUpperCase());
  kontrol("YEMIN sohbetten gecti (dinleyici BAGLI)",
          dus.dusmusDurum(o.id) === "asker", String(dus.dusmusDurum(o.id)));
  kontrol("  buyuk harfle yazmak da sayildi", dus.dusmusDurum(o.id) === "asker");
  kontrol("  yemin herkesin sohbetine DUSMEDI", yutuldu === true);
  kontrol("  'asker oldun' ekrana yazildi",
          o._baslik.length > oncekiBaslik &&
          o._baslik.slice(oncekiBaslik).join(" ").includes("asker"),
          o._baslik.slice(oncekiBaslik).join(" / "));

  /* Asker olduktan sonra yemin tekrar islememeli. */
  kontrol("ikinci yemin bos gecti",
          dus.dusmusYemin(o, ayar.DUSMUS_YEMIN) === false);

  /* Asker de hala kurban: parcalar cikmiyor. */
  o._yuva.Chest = undefined;
  ilerlet(o, adim);
  kontrol("askerin zirhi hala cikmiyor",
          o._yuva.Chest === "pa:kns_dusmus_4", String(o._yuva.Chest));
}

console.log("");
console.log("=== 7b. BULASMAMIS OYUNCU YEMIN EDEMEZ ===");
{
  /* Yemin metnini duyan herkes asker olamaz: kurban degilsen
     satir SIRADAN SOHBET, yutulmamali.                      */
  const { o } = kur();
  const yutuldu = sohbetTetikle(o, ayar.DUSMUS_YEMIN);
  kontrol("temiz oyuncunun yemini islemiyor",
          dus.dusmusDurum(o.id) === undefined);
  kontrol("  satiri sohbetten YUTMUYOR", yutuldu === false);

  /* Daha 4. asamaya varmamis kurban da edemez. */
  const b = kur();
  blokKoy(b.o);
  ilerlet(b.o, 1);
  kontrol("2. asamadaki kurban", dus.dusmusDurum(b.o.id) === "yozlasiyor");
  kontrol("  yemini islemiyor",
          dus.dusmusYemin(b.o, ayar.DUSMUS_YEMIN) === false);
}

console.log("");
console.log("=== 7c. ASKERIN DE TEK ZAAFI ATES ===");
{
  /* Secilmek bir odul degil hastaligin ilerlemesi: ates hala
     kurtariyor ve GERCEK ZIRH geri geliyor.                 */
  const { o } = kur({ Head: "minecraft:diamond_helmet",
                      Chest: "minecraft:netherite_chestplate" });
  blokKoy(o);
  const adim = Math.ceil(ayar.DUSMUS_ASAMA_ARA / ayar.DUSMUS_TARAMA) + 1;
  ilerlet(o, 1 + adim * 3);
  bekle(o, () => dus.dusmusDurum(o.id) === "secilmis",
        Math.ceil(ayar.DUSMUS_SECILME_SURE / ayar.DUSMUS_TARAMA) + 5);
  sohbetTetikle(o, ayar.DUSMUS_YEMIN);
  kontrol("asker oldu", dus.dusmusDurum(o.id) === "asker");

  o.location = { x: 40.5, y: 64, z: 40.5 };   // bloktan uzakta
  dus.dusmusAtesle(o);
  kontrol("ates askeri de arindirmaya basladi",
          dus.dusmusDurum(o.id) === "ariniyor");
  bekle(o, () => dus.dusmusDurum(o.id) === undefined);
  kontrol("arindi", dus.dusmusDurum(o.id) === undefined);
  kontrol("  ELMAS MIGFER geri geldi",
          o._yuva.Head === "minecraft:diamond_helmet", String(o._yuva.Head));
  kontrol("  NETHERITE GOGUSLUK geri geldi",
          o._yuva.Chest === "minecraft:netherite_chestplate",
          String(o._yuva.Chest));
}

console.log("");
console.log("=== 7d. CIKIP GIREN KURBAN SECILEBILIYOR ===");
{
  /* Dunya kaydi secilmeTick'i TASIMIYOR (yalniz durum, asama,
     zirh). Bu satir olmadan cikip giren bir kurban sonsuza
     kadar 4. asamada kalirdi -- sessiz bir olu ucu.         */
  const { o } = kur();
  blokKoy(o);
  const adim = Math.ceil(ayar.DUSMUS_ASAMA_ARA / ayar.DUSMUS_TARAMA) + 1;
  ilerlet(o, 1 + adim * 3);
  kontrol("dorduncu asamada", dus.dusmusDurum(o.id) === "dusmus");

  /* Cikis-giris: defteri dusur, dunya kaydindan geri oku. */
  const kayitli = _durum.ozellikler.get(ayar.DUSMUS_KAYIT_ANAHTAR);
  kontrol("dunya kaydi yazilmis", typeof kayitli === "string");
  dus.dusmusUnut();                  // dunyadan cikis gibi
  kontrol("  bellek bosaldi", dus.dusmusDurum(o.id) === undefined);
  _durum.ozellikler.set(ayar.DUSMUS_KAYIT_ANAHTAR, kayitli);   // giris
  ilerlet(o, 1);
  kontrol("kayittan geri okundu", dus.dusmusDurum(o.id) === "dusmus");

  const tur = bekle(o, () => dus.dusmusDurum(o.id) === "secilmis",
                    Math.ceil(ayar.DUSMUS_SECILME_SURE /
                              ayar.DUSMUS_TARAMA) + 5);
  kontrol("sayac bastan basladi ve SECILDI", tur >= 0, tur + " tarama");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Dusmus virusu calisiyor");
process.exit(hata ? 1 : 0);

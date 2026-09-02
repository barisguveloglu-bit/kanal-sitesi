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

console.log("\n=== 8. YEDEK YOL: DIS VARLIGI YOKKEN ===");
{
  /* KULLANICI OYUNDA BUNU ALDI:
       disler.spawn: Invalid value passed to argument [0].
       'minecraft:evocation_fang' is not a valid entity type.
     Yani spawnEntity o varligi kabul etmiyor ve Okazor'un
     disleri HIC cikmiyordu; ustelik her vuruste yeniden
     deneniyor ve gunluge yeniden hata yaziliyordu.

     Dogru kimlik TAHMIN EDILMEDI. Bunun yerine oyuna
     soruluyor; kabul etmiyorsa ayni is parcacik + hasar ile
     yapiliyor. Bu bolum O YOLU sinliyor -- oyunda calisacak
     olan bu.                                                */
  const { D, bot } = kur("d8");
  dis.disVarligiUnut();
  /* Oyun varligi TANIMIYOR: EntityTypes bos donuyor ve
     spawnEntity atiyor. Ikisi birden, cunku gercekte de
     ikisi birden oluyor.                                    */
  _durum.kayitliVarliklar.delete(ayar.DIS_VARLIK);
  const eskiDogur = D.boyut.spawnEntity;
  D.boyut.spawnEntity = (tip, poz) => {
    if (tip === ayar.DIS_VARLIK) {
      throw new Error("'" + tip + "' is not a valid entity type");
    }
    return eskiDogur.call(D.boyut, tip, poz);
  };

  const uzak = ayar.DIS_YAKIN + 4;
  let hasar = 0;
  const kurban = kurbanYap("k8", D.boyut, bot.location.x + uzak, bot.location.z);
  kurban.applyDamage = (n) => { hasar += n; return true; };
  D.boyut._varliklar = [bot, kurban];

  const parcacikOnce = (D.sayac.parcacik || []).length;
  vur(bot, kurban);

  kontrol("varlik dogurulamiyor ama dis YINE DE isliyor", hasar > 0,
          "kurbana " + hasar + " hasar");
  kontrol("  hasar vanilla disle AYNI kuvvette",
          hasar >= ayar.DIS_YEDEK_HASAR,
          "dis basina " + ayar.DIS_YEDEK_HASAR);
  kontrol("  parcacik cikti (gorunuyor)",
          (D.sayac.parcacik || []).length > parcacikOnce,
          ((D.sayac.parcacik || []).length - parcacikOnce) + " zerre");
  /* Parcacik EMITTER olmamali -- v7.9.1'deki sonmeyen ates. */
  kontrol("  parcacik tek seferlik (_emitter degil)",
          !/_emitter$/.test(ayar.DIS_YEDEK_PARCACIK),
          ayar.DIS_YEDEK_PARCACIK);

  /* Ikinci vurus: bir daha DENEMEMELI, dogrudan yedekten
     gitmeli. Eskiden her vuruste yeniden deneyip yeniden hata
     yaziyordu -- kullanicinin ekraninda gordugu spam buydu.

     SPAM AYRICA OLCULUYOR: hasarin gitmesi yetmiyor, "hata
     bir daha yazilmasin" ayri bir guvence. Ilk yazimda yalniz
     hasara bakiyordum ve kalici gecisi kaldirmak testi
     dusurmedi -- cunku hata yine yaziliyor ama hasar da
     veriliyordu. Bozma denemesi bunu gosterdi.              */
  const hasarOnce = hasar;
  /* SPAM SAYACI SOHBET GUNLUGUNDEN okunuyor, console.warn'dan
     DEGIL: vur() kendi icinde sus() cagirip console.warn'i
     eziyor, yani oraya kurulan bir yakalayici sessizce
     devre disi kaliyor. Ilk yazimda tam bu oldu ve bozma
     denemesi "yakalanmadi" dedi -- kod degil olcum
     bozuktu.                                                */
  _durum.sohbet.length = 0;
  tickIlerlet(ayar.DIS_BEKLEME + 5);
  vur(bot, kurban);
  kontrol("  ikinci vurusta da isliyor (kalici olarak yedekte)",
          hasar > hasarOnce, hasarOnce + " -> " + hasar);
  const tekrar = _durum.sohbet.filter((u) => String(u).includes("disler.spawn"));
  kontrol("  ve hatayi TEKRAR yazmiyor (gunluk spam'i yok)",
          tekrar.length === 0, tekrar.length + " tekrar uyari");

  D.boyut.spawnEntity = eskiDogur;
  _durum.kayitliVarliklar.add(ayar.DIS_VARLIK);
  dis.disVarligiUnut();
}

console.log("\n=== 9. IKINCI IHTIMAL: TUR KAYITLI AMA DOGURULAMIYOR ===");
{
  /* Yukaridaki bolumde EntityTypes "yok" diyordu ve spawnEntity
     hic denenmiyordu. Oyunda IKINCI bir ihtimal daha var: tur
     KAYITLI gorunur ama spawnEntity yine de reddeder (ornegin
     summonable degilse). O zaman catch dali calisir ve KALICI
     yedege gecis orada devreye girer.

     Bu ayri bir yol ve ayri sinaniyor: ilk yazimda yoktu,
     bozma denemesinde "kalici gecisi kaldir" hicbir seyi
     dusurmedi -- cunku o satira hic ugranmiyordu. Yani
     eksik olan kod degil, SENARYOYDU.                       */
  const { D, bot } = kur("d9");
  dis.disVarligiUnut();
  /* Tur KAYITLI kalsin (EntityTypes evet desin) ama dogurma
     ATSIN.                                                  */
  const eskiDogur = D.boyut.spawnEntity;
  let deneme = 0;
  D.boyut.spawnEntity = (tip, poz) => {
    if (tip === ayar.DIS_VARLIK) {
      deneme++;
      throw new Error("'" + tip + "' is not a valid entity type");
    }
    return eskiDogur.call(D.boyut, tip, poz);
  };

  const uzak = ayar.DIS_YAKIN + 4;
  let hasar = 0;
  const kurban = kurbanYap("k9", D.boyut, bot.location.x + uzak, bot.location.z);
  kurban.applyDamage = (n) => { hasar += n; return true; };
  D.boyut._varliklar = [bot, kurban];

  vur(bot, kurban);
  kontrol("dogurma atinca yedege GECIYOR (hasar yine gidiyor)", hasar > 0,
          "hasar " + hasar + ", " + deneme + " dogurma denemesi");
  /* AYNI SALVODA da bir daha denememeli. Bir salvo sekiz dis;
     sinal dongu basinda bir kez okunsaydi ilk hatadan sonra
     kalan yedi dis de tek tek denenir ve tek tek atardi --
     olculdu, dort denemeydi. Dogrusu BIR.                    */
  kontrol("  ayni salvoda bir daha DENEMIYOR", deneme === 1,
          deneme + " deneme");

  const denemeOnce = deneme;
  const hasarOnce = hasar;
  /* KAC DIS ISLENDI: her yedek dis DIS_YEDEK_ADET zerre
     atiyor, yani zerre sayisi / adet = islenen dis sayisi.
     Bu olcum, hasardan daha keskin: kurban yalnizca birkac
     disin yaninda duruyor, o yuzden "bir dis dustu" hasara
     yansimayabiliyor -- zerreye yansiyor.                  */
  /* YALNIZ DIS ZERRELERI sayiliyor. Okazor'un isini de ayni
     kirmizi tozu atiyor ("Kirmizi Guc") ve ham sayim ikisini
     karistiriyordu -- ilk olcumde 10,67 gibi tam olmayan bir
     sayi cikti ve sebebi buydu. Disler YERDE (y = zemin),
     isin govde yuksekliginde; ayrim bu.                     */
  const disZerresi = (D) => (D.sayac.parcacik || [])
    .filter((z) => z.tip === ayar.DIS_YEDEK_PARCACIK && Math.abs(z.y - AYAK) < 0.01)
    .length / ayar.DIS_YEDEK_ADET;
  const ilkSalvoDis = disZerresi(D);
  (D.sayac.parcacik || []).length = 0;
  tickIlerlet(ayar.DIS_BEKLEME + 5);
  vur(bot, kurban);
  const ikinciSalvoDis = disZerresi(D);
  /* Ikinci salvo tamamen yedekten gidiyor, yani "tam" salvo.
     Birincisi gecisi de iceriyor; gecisde bir dis DUSMEMELI. */
  kontrol("  gecis sirasinda hicbir dis DUSMUYOR",
          ilkSalvoDis === ikinciSalvoDis,
          ilkSalvoDis + " dis (gecis) / " + ikinciSalvoDis + " dis (yedek)");
  /* ASIL GUVENCE: ikinci vuruste BIR DAHA DENEMEMELI.
     Denerse her vuruste yeniden atar ve gunluge yeniden hata
     yazar -- kullanicinin ekraninda gordugu spam buydu.     */
  kontrol("  ikinci vuruste BIR DAHA denemiyor (kalici yedek)",
          deneme === denemeOnce, denemeOnce + " -> " + deneme + " deneme");
  kontrol("  ama dis yine isliyor", hasar > hasarOnce,
          hasarOnce + " -> " + hasar);

  D.boyut.spawnEntity = eskiDogur;
  dis.disVarligiUnut();
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Okazor'un disleri calisiyor");
process.exit(hata ? 1 : 0);

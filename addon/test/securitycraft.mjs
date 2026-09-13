/* SECURITYCRAFT'TAN ALINAN BES DUZENEK              v7.86

   Kullanici jar'i gonderdi: "alabildigimiz tum her seyi
   alalim, hicbir seyi atlamadan." Olcum
   REFERANS_SECURITYCRAFT.md'de.

   ---- BU DOSYANIN TUTTUGU SEY ----
   Bes duzenegin de KAYNAKTAN AYRILDIGIMIZ yerleri:

     1. Kalkan kendi okumuzu dusurmuyor (yaklasan olcumu)
     2. Kalkan ender incisine dokunmuyor (o yarigin isi)
     3. Yarik menzildeki inciyi dusuruyor
     4. Nobetci SAHIBINI vurmuyor, botlarimizi vurmuyor
     5. Radar kendini listeye almiyor
     6. Mayin SAHIBI tarafindan tetiklenmiyor
     7. Mayin kurma gecikmesi bitmeden patlamiyor
     8. Hepsi SURELI -- kaynakta hepsi sonsuz duran blok

   6 ve 7 olmasa yetenek kullanicisini olduruyor; 4 ve 5
   olmasa savunma kendi oyuncusuna donuyor. Bu depoda ikisi
   de tekrar eden hata sinifi.                             */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum, system } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const sc    = await import("./pack/yetenekler/securitycraft.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id; o.typeId = "minecraft:player"; o.name = id;
  o._hasar = [];
  o.applyDamage = (m) => { o._hasar.push(m); return true; };
  /* Sahte dunya yalniz SON aksiyon cubugu yazisini tutuyor
     (`onScreenDisplay._son`). Radar her RADAR_ARA tickte
     yaziyor ve sonuncusu "Radar kapandi" oluyor -- yani son
     yaziya bakan bir olcum radarin ne yazdigini hic gormez.
     Burada HEPSI toplaniyor.                               */
  o._yazilar = [];
  o.onScreenDisplay = {
    _son: null,
    setActionBar(t) { this._son = t; o._yazilar.push(String(t)); },
    setTitle() {}
  };
  _durum.oyuncular = [o];
  return { D, o };
}

/* Mermi: konum + HIZ. Hiz sart -- "yaklasiyor mu" olcumu
   onun uzerinden calisiyor.                               */
function mermi(id, tip, x, y, z, hiz) {
  return {
    id, typeId: tip, isValid: true, location: { x, y, z },
    _kaldirildi: false,
    getVelocity: () => hiz,
    remove() { this._kaldirildi = true; this.isValid = false; }
  };
}
function varlik(id, tip, x, y, z) {
  return {
    id, typeId: tip, isValid: true, name: id, location: { x, y, z },
    _hasar: [],
    applyDamage(m) { this._hasar.push(m); return true; },
    addEffect() {}, removeEffect() { return true; },
    runCommand() { return { successCount: 1 }; }
  };
}

/* Yetenegi gercekten calistirir: is nesnesi olusur, calis()
   dongusu doner, bitir() cagrilir.                         */
function calistir(kimlik, o, tick = 40) {
  const t = kayit.yetenekAl(kimlik);
  if (!t) return { is: undefined, bitti: -1 };
  sus();
  const is = t.olustur(o);
  let bitti = -1;
  if (is) {
    for (let i = 0; i < tick; i++) {
      tickIlerlet(1);
      if (is.calis()) { bitti = i; break; }
    }
    is.bitir();
  }
  ac();
  return { is, bitti };
}

console.log("=== 0. BESI DE KAYITLI MI ===");
{
  const k = ["kalkan_sistemi", "yarik_dengeleyici", "nobetci", "radar", "mayin"];
  for (const x of k) kontrol(x + " kayitli", !!kayit.yetenekAl(x));
  const s = k.map((x) => kayit.yetenekAl(x)).filter(Boolean).map((x) => x.sira);
  kontrol("siralari birbirinden farkli", new Set(s).size === s.length,
          s.join(" "));
  kontrol("hepsi esyasiz jest sirasinda",
          k.every((x) => kayit.yetenekAl(x).esyasiz === true));
}

console.log("");
console.log("=== 1. KALKAN: YAKLASANI DUSURUR, UZAKLASANI DUSURMEZ ===");
{
  const { D, o } = kur("k1");
  /* Oyuncu (0.5, 90.6, 0.5). Gelen ok +z'den -z'ye gidiyor
     (bize dogru); giden ok +z'ye gidiyor (bizden uzaga).  */
  const gelen = mermi("g", "minecraft:arrow", 0.5, 90, 4.5, { x: 0, y: 0, z: -1 });
  const giden = mermi("u", "minecraft:arrow", 0.5, 90, 3.5, { x: 0, y: 0, z: 1 });
  D.boyut._varliklar = [o, gelen, giden];
  calistir("kalkan_sistemi", o, 10);
  kontrol("bize GELEN ok dusuruldu", gelen._kaldirildi === true);
  /* ASIL MADDE: kendi attigimiz ok havada patlarsa yetenek
     kullanilamaz olur.                                    */
  kontrol("bizden UZAKLASAN ok dusurulmedi", giden._kaldirildi === false);
}

console.log("");
console.log("=== 2. KALKAN: HIZ OKUNAMAZSA DOKUNMUYOR ===");
{
  const { D, o } = kur("k2");
  const okunamaz = mermi("x", "minecraft:arrow", 0.5, 90, 3.5, undefined);
  okunamaz.getVelocity = undefined;       // eski API surumu
  D.boyut._varliklar = [o, okunamaz];
  calistir("kalkan_sistemi", o, 10);
  kontrol("hiz okunamayan mermi BIRAKILIYOR",
          okunamaz._kaldirildi === false);
  kontrol("  yaklasanMi() de false donuyor",
          sc.yaklasanMi(okunamaz, { x: 0, y: 0, z: 0 }) === false);
}

console.log("");
console.log("=== 3. KALKAN ile YARIK AYRI ISLER ===");
{
  /* Kalkan inciye DOKUNMAMALI: inci dusurmek yarigin isi.
     Ayni dugme olsaydi, ok yagmurundan korunmak isteyen
     kisi farkinda olmadan rakibinin kacisini da engellerdi. */
  kontrol("kalkan listesinde ender incisi YOK",
          ayar.KALKAN_MERMILER.indexOf("minecraft:ender_pearl") === -1);
  kontrol("yarik listesinde ender incisi VAR",
          ayar.YARIK_MERMILER.indexOf("minecraft:ender_pearl") !== -1);

  const { D, o } = kur("k3");
  const inci = mermi("i", "minecraft:ender_pearl", 0.5, 90, 3.5, { x: 0, y: 0, z: -1 });
  D.boyut._varliklar = [o, inci];
  calistir("kalkan_sistemi", o, 10);
  kontrol("kalkan inciye dokunmadi", inci._kaldirildi === false);
}

console.log("");
console.log("=== 4. YARIK: MENZILDEKI INCIYI DUSURUR ===");
{
  const { D, o } = kur("y1");
  /* Kacan rakibin incisi BIZDEN UZAGA gidiyor -- yine de
     dusmeli, cunku yarigin isi kacisi engellemek.         */
  const kacan = mermi("kc", "minecraft:ender_pearl", 0.5, 90, 5.5, { x: 0, y: 0, z: 1 });
  const uzak  = mermi("uz", "minecraft:ender_pearl", 0.5, 90,
                      0.5 + ayar.YARIK_YARICAP + 8, { x: 0, y: 0, z: 1 });
  D.boyut._varliklar = [o, kacan, uzak];
  calistir("yarik_dengeleyici", o, 10);
  kontrol("menzildeki inci dusuruldu (uzaklasiyor olsa da)",
          kacan._kaldirildi === true);
  kontrol("menzil DISINDAKI inci dusurulmedi", uzak._kaldirildi === false);
}

console.log("");
console.log("=== 5. NOBETCI: SAHIBINI ve BOTU VURMAZ ===");
{
  const bottipi = [...ayar.KILIT_ATLA_TIPLER][0];
  const { D, o } = kur("n1");
  const bot = varlik("bot", bottipi, 0.5, 90, 3.5);
  const mob = varlik("z", "minecraft:zombie", 0.5, 90, 4.5);
  D.boyut._varliklar = [o, bot, mob];
  calistir("nobetci", o, ayar.NOBETCI_ARA * 3 + 5);
  kontrol("mob vuruldu", mob._hasar.length > 0, mob._hasar.join(","));
  kontrol("hasar ayardan geliyor", mob._hasar[0] === ayar.NOBETCI_HASAR,
          String(mob._hasar[0]));
  /* Bu iki madde olmadan savunma kendi oyuncusuna doner. */
  kontrol("SAHIBI vurulmadi", o._hasar.length === 0, o._hasar.join(",") || "0");
  kontrol("BOTUMUZ vurulmadi", bot._hasar.length === 0,
          bottipi + " :: " + (bot._hasar.join(",") || "0"));
}

console.log("");
console.log("=== 6. NOBETCI KURULDUGU YERDE KALIR ===");
{
  /* Kaynakta taret sabittir. Oyuncuyla gezseydi bu bir
     taret degil bir aura olurdu.                          */
  const { D, o } = kur("n2");
  const mob = varlik("z2", "minecraft:zombie", 0.5, 90, 4.5);
  D.boyut._varliklar = [o, mob];
  const t = kayit.yetenekAl("nobetci");
  sus();
  const is = t.olustur(o);
  /* Oyuncu 500 blok oteye gidiyor; nobetci kuruldugu yerde
     kalmali, yani mob hala vuruluyor olmali.              */
  o.location = { x: 500.5, y: 90, z: 500.5 };
  for (let i = 0; i < ayar.NOBETCI_ARA * 3 + 5; i++) {
    tickIlerlet(1);
    if (is.calis()) break;
  }
  is.bitir();
  ac();
  kontrol("oyuncu uzaklassa da nobetci vurmaya devam etti",
          mob._hasar.length > 0, mob._hasar.length + " atis");
}

console.log("");
console.log("=== 7. RADAR: KENDINI LISTELEMEZ ===");
{
  const { D, o } = kur("r1");
  const arkadas = varlik("Baris", "minecraft:player", 0.5, 90, 10.5);
  D.boyut._varliklar = [o, arkadas];
  _durum.sohbet.length = 0;
  calistir("radar", o, ayar.RADAR_ARA + 5);
  const yazi = o._yazilar.join(" | ");
  kontrol("menzildeki oyuncu yazildi", yazi.indexOf("Baris") !== -1, yazi);
  /* ASIL MADDE: "@e" her zaman kullanicinin kendisini de
     kapsiyor; bu seride dorduncu kez gorulen hata.        */
  kontrol("KENDI adimiz yazilmadi", yazi.indexOf("r1") === -1, yazi);
}

console.log("");
console.log("=== 8. MAYIN: SAHIBI TETIKLEMEZ ===");
{
  /* Oyuncu mayinin dibinde duruyor ve orada kaliyor.
     Bu madde duserse yetenek kullanicisini olduruyor. */
  const { D, o } = kur("m1");
  D.boyut._varliklar = [o];
  calistir("mayin", o, ayar.MAYIN_KURULUM + ayar.MAYIN_ARA * 4);
  const p = (D.sayac.patlama || []).length;
  kontrol("sahibi mayini patlatmadi", p === 0, p + " patlama");
}

console.log("");
console.log("=== 9. MAYIN: KURMA GECIKMESI ve TETIKLEME ===");
{
  const { D, o } = kur("m2");
  const mob = varlik("z3", "minecraft:zombie", 1.0, 90, 1.0);
  D.boyut._varliklar = [o, mob];
  const t = kayit.yetenekAl("mayin");
  sus();
  const is = t.olustur(o);
  /* Kurma gecikmesi BITMEDEN: mob dibinde ama patlamamali. */
  for (let i = 0; i < ayar.MAYIN_KURULUM - ayar.MAYIN_ARA; i++) {
    tickIlerlet(1); if (is.calis()) break;
  }
  const erken = (D.sayac.patlama || []).length;
  /* Gecikme dolduktan sonra patlamali. */
  for (let i = 0; i < ayar.MAYIN_KURULUM + ayar.MAYIN_ARA * 4; i++) {
    tickIlerlet(1); if (is.calis()) break;
  }
  is.bitir();
  ac();
  const sonra = (D.sayac.patlama || []).length;
  kontrol("kurma gecikmesi bitmeden patlamadi", erken === 0,
          erken + " patlama");
  kontrol("gecikme dolunca yabanci tetikledi", sonra > 0,
          sonra + " patlama");
  kontrol("bir kez patladi (surekli degil)", sonra === 1, sonra + " patlama");
}

console.log("");
console.log("=== 10. MAYIN BLOK KIRMIYOR ===");
{
  /* Duello alanini delik desik eden bir mayin, alani
     kullanilamaz yapar. Kaynakta kirar; burada kirmiyor. */
  kontrol("MAYIN_KIRAR kapali", ayar.MAYIN_KIRAR === false);
  kontrol("gucu vanilla TNT'den dusuk", ayar.MAYIN_GUC < 4,
          String(ayar.MAYIN_GUC));
}

console.log("");
console.log("=== 11. HEPSI SURELI (kaynakta hepsi sonsuz blok) ===");
{
  const sureler = {
    kalkan_sistemi: ayar.KALKAN_SURE, yarik_dengeleyici: ayar.YARIK_SURE,
    nobetci: ayar.NOBETCI_SURE, radar: ayar.RADAR_SURE, mayin: ayar.MAYIN_SURE
  };
  for (const [k, s] of Object.entries(sureler)) {
    kontrol(k + " sureli", typeof s === "number" && s > 0 && s <= 2400,
            s + " tick");
  }
  /* Sure GERCEKTEN doluyor mu -- sayi karsilastirmasi
     yetmez, is bitmeli.                                  */
  const { D, o } = kur("s1");
  D.boyut._varliklar = [o];
  const { bitti } = calistir("kalkan_sistemi", o, ayar.KALKAN_SURE + 20);
  kontrol("kalkan suresi dolunca is BITIYOR", bitti > 0,
          bitti + ". tickte bitti");
}

console.log(hata ? ">>> SORUN VAR" : ">>> securitycraft yerinde");
process.exit(hata ? 1 : 0);

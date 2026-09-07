/* UC KARAKTERIN YETENEKLERI  --  IKINCI KATEGORI      v7.57

   Kaynak: BleachAwaken 1.6.1 sinif sabit havuzlari OKUNARAK
   (jar calistirilmadi):

     OnibiProcedure               -> Onibi
     FlameAoeEffectTickProcedure  -> Alev Halesi
     GeyserOfFireEffectTick       -> Ates Gayzeri
     StrongSlashProcedure         -> Guclu Kesik
     TripleSlashProcedure         -> Uclu Kesik
     Berserk2OnEffectActiveTick   -> Berserk
     ShinsoTriggerProcedure       -> Tetik (100 blok)
     KamishiniNoYariProcedure     -> Kamishini
     ButoRenjin(Shot)Procedure    -> Buto Renjin

   ---- BU DOSYANIN TUTTUGU UC SEY ----
   1. IKI KATEGORI BAGIMSIZ. Karakter degisince yol
      degismemeli, yol degisince karakter degismemeli. Bu
      duserse alti secenek tek listeye coker.
   2. KARAKTER AYRIMI. Her yetenek yalniz kendi karakterinde.
   3. BERSERK OYUNCUYU DUVARA SOKMUYOR. Isinma yalniz varis
      yeri VE ustu hava ise. Bu depoda oyuncuyu bloklarin
      icine sokan bir yetenek olmaz.                        */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const ruh = await import("./pack/yetenekler/ruh.js");
const ky = await import("./pack/yetenekler/karakter_yetenekler.js");
const ry = await import("./pack/yetenekler/ruh_yetenekler.js");
const butce = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const bul = (k) => [...kayit.tumYetenekler()].find((y) => y.kimlik === k);

let n = 0;
function kur(karakter = "ryujin", kademe = 0, yol = "getsuga") {
  ruh.ruhUnut(); ry.quincyUnut(); ry.reishiUnut(); ky.berserkUnut();
  butce.butceSifirla();
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "k" + (++n); o.typeId = "minecraft:player";
  o._can = 20; o._maks = 20; o._mesaj = []; o._efekt = []; o._isinma = [];
  o._ozellik = new Map();
  o.isSneaking = false;
  o.getComponent = (a) => a === "minecraft:health"
    ? { currentValue: o._can, effectiveMax: o._maks, defaultValue: 20 } : undefined;
  o.addEffect = (ad, s, x) => { o._efekt.push({ ad, s, a: x && x.amplifier }); return true; };
  o.sendMessage = (m) => o._mesaj.push(m);
  o.runCommand = () => ({ successCount: 1 });
  o.teleport = (k) => { o._isinma.push({ x: k.x, y: k.y, z: k.z }); o.location = k; };
  o.getDynamicProperty = (k) => o._ozellik.get(k);
  o.setDynamicProperty = (k, v) => { o._ozellik.set(k, v); };
  _durum.oyuncular = [o];
  ruh.yolYaz(o, yol);
  ruh.karakterYaz(o, karakter);
  ruh.ruhYaz(o, ayar.RUH_TAVAN);
  if (kademe > 0) ruh.kademeAyarla(o, kademe);
  return { D, o };
}
/* Hedef taklidi: koniHedefleri gercek getEntities'i cagiriyor,
   o yuzden boyut.getEntities'i biz veriyoruz.               */
function kurban(id, konum) {
  return {
    id, typeId: "minecraft:zombie", isValid: true, location: konum,
    _hasar: 0, _kez: 0, _yanma: 0, _efekt: [], _itme: 0,
    applyDamage(h) { this._hasar += h; this._kez++; return true; },
    setOnFire(s) { this._yanma = s; return true; },
    addEffect(a, s, x) { this._efekt.push({ a, s, lv: x && x.amplifier }); return true; },
    applyKnockback(x, z, g) { this._itme = g; return true; }
  };
}
const yurut = (is, kere = 400) => {
  for (let i = 0; i < kere; i++) { if (is.calis()) return i; tickIlerlet(1); }
  return -1;
};

const HEPSI = ["onibi", "alev_halesi", "ates_gayzeri", "guclu_kesik",
               "uclu_kesik", "berserk", "tetik", "kamishini",
               "buto_renjin", "karakter_sec"];

console.log("=== 0. DOKUZ YETENEK + SECIM KAYITLI ===");
for (const k of HEPSI) kontrol(k + " kayitli", !!bul(k), bul(k) ? bul(k).ad : "yok");
kontrol("hepsi 510+ sirada (yol ailesi 500-505 bozulmadi)",
        HEPSI.every((k) => bul(k).sira >= 510),
        HEPSI.map((k) => bul(k).sira).join(","));

console.log("=== 1. KARAKTER AYRIMI ===");
{
  const esles = { onibi: "ryujin", alev_halesi: "ryujin", ates_gayzeri: "ryujin",
                  guclu_kesik: "nozarashi", uclu_kesik: "nozarashi",
                  berserk: "nozarashi",
                  tetik: "shinso", kamishini: "shinso", buto_renjin: "shinso" };
  for (const [kimlik, dogru] of Object.entries(esles)) {
    let iyi = true, not = "";
    for (const kar of ["ryujin", "nozarashi", "shinso"]) {
      const { D, o } = kur(kar, 0);
      D.boyut.getEntities = () => [];
      const once = ruh.ruhOku(o);
      bul(kimlik).olustur(o);
      const harcandi = once - ruh.ruhOku(o);
      /* Olcut HASAR degil BEDEL: anlik yetenekler undefined
         donuyor, yani "is acildi mi" ile ayirt edilemez.
         Yanlis karakterde ruh HIC harcanmamali.             */
      if (kar === dogru ? harcandi <= 0 : harcandi !== 0) {
        iyi = false; not += kar + ":" + harcandi + " ";
      }
    }
    kontrol(kimlik + " yalniz " + dogru + " karakterinde", iyi, not);
  }
}

console.log("=== 2. IKI KATEGORI BAGIMSIZ ===");
{
  const { o } = kur("ryujin", 0, "cero");
  kontrol("baslangic: yol=cero karakter=ryujin",
          ruh.yolOku(o) === "cero" && ruh.karakterOku(o) === "ryujin");
  bul("karakter_sec").olustur(o);
  kontrol("karakter degisti, YOL DEGISMEDI",
          ruh.karakterOku(o) !== "ryujin" && ruh.yolOku(o) === "cero",
          ruh.yolOku(o) + " / " + ruh.karakterOku(o));
  const kar = ruh.karakterOku(o);
  bul("ruh_yol").olustur(o);
  kontrol("yol degisti, KARAKTER DEGISMEDI",
          ruh.yolOku(o) !== "cero" && ruh.karakterOku(o) === kar,
          ruh.yolOku(o) + " / " + ruh.karakterOku(o));
}
{
  const { o } = kur("ryujin", 0);
  const gorulen = [];
  for (let i = 0; i < 4; i++) { bul("karakter_sec").olustur(o); gorulen.push(ruh.karakterOku(o)); }
  kontrol("uc karakteri de dolasti", new Set(gorulen).size === 3, gorulen.join(" -> "));
  kontrol("basa donuyor", gorulen[3] === gorulen[0]);
}

console.log("=== 3. ONIBI: KONI + YAKMA + CARPAN ===");
{
  const { D, o } = kur("ryujin", 2);
  const on = kurban("on", { x: 6, y: 90.6, z: 0.5 });    // onde
  const arka = kurban("arka", { x: -6, y: 90.6, z: 0.5 }); // arkada
  D.boyut.getEntities = () => [on, arka];
  bul("onibi").olustur(o);
  kontrol("ondeki vuruldu", on._hasar > 0, "hasar " + on._hasar.toFixed(1));
  kontrol("ARKADAKI vurulmadi (koni)", arka._hasar === 0, "hasar " + arka._hasar);
  kontrol("hedef atese verildi", on._yanma === ayar.ONIBI_YAKMA, "sn " + on._yanma);
  kontrol("hasar CARPANLA olcekli",
          on._hasar >= ayar.ONIBI_HASAR * ayar.RUH_KADEMELER[2].carpan - 0.01,
          on._hasar.toFixed(1));
}

console.log("=== 4. RUH BEDELI HER YETENEKTE ALINIYOR ===");
{
  const bedeller = { onibi: ayar.ONIBI_BEDEL, alev_halesi: ayar.HALE_BEDEL,
    ates_gayzeri: ayar.GAYZER_BEDEL, guclu_kesik: ayar.KESIK_BEDEL,
    uclu_kesik: ayar.UCLU_BEDEL, berserk: ayar.BERSERK_BEDEL,
    tetik: ayar.TETIK_BEDEL, kamishini: ayar.KAMI_BEDEL,
    buto_renjin: ayar.BUTO_BEDEL };
  const kar = { onibi: "ryujin", alev_halesi: "ryujin", ates_gayzeri: "ryujin",
    guclu_kesik: "nozarashi", uclu_kesik: "nozarashi", berserk: "nozarashi",
    tetik: "shinso", kamishini: "shinso", buto_renjin: "shinso" };
  for (const k of Object.keys(bedeller)) {
    const { D, o } = kur(kar[k], 0);
    D.boyut.getEntities = () => [];
    const once = ruh.ruhOku(o);
    bul(k).olustur(o);
    kontrol(k + " bedeli alindi", once - ruh.ruhOku(o) === bedeller[k],
            once + " -> " + ruh.ruhOku(o));
  }
  /* Ruh yetmiyorsa yetenek ACILMAMALI. */
  const { D, o } = kur("shinso", 0);
  D.boyut.getEntities = () => [];
  ruh.ruhYaz(o, ayar.TETIK_BEDEL - 1);
  kontrol("ruh yetmezse tetik acilmiyor", bul("tetik").olustur(o) === undefined);
  kontrol("ruh yetmezse ruh da harcanmadi", ruh.ruhOku(o) === ayar.TETIK_BEDEL - 1,
          "" + ruh.ruhOku(o));
}

console.log("=== 5. UCLU KESIK: UC MERMI, TEK IS ===");
{
  const { D, o } = kur("nozarashi", 0);
  const k1 = kurban("u1", { x: 8, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [k1];
  const is = bul("uclu_kesik").olustur(o);
  kontrol("tek is acildi", !!is);
  const bitti = yurut(is);
  kontrol("is kendi kendine kapandi", bitti >= 0, bitti + " tick");
  kontrol("UC kesik de vurdu (her biri bir kez)",
          k1._kez === ayar.UCLU_KAYDIR.length, k1._kez + " vurus");
}

console.log("=== 6. BERSERK: ISINMA VE DUVAR ===");
{
  /* Varis yeri HAVA: isinma olmali. */
  const { D, o } = kur("nozarashi", 0);
  const h = kurban("b1", { x: 10, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h];
  const is = bul("berserk").olustur(o);
  kontrol("is acildi", !!is);
  for (let i = 0; i < ayar.BERSERK_ADIM + 2; i++) { is.calis(); tickIlerlet(1); }
  kontrol("hedefe isinildi", o._isinma.length > 0, o._isinma.length + " isinma");
  kontrol("hedef vuruldu", h._hasar > 0, "hasar " + h._hasar);
}
{
  /* Varis yeri DOLU: isinma OLMAMALI, ama vurus surmeli.
     Mutasyon burada kacmisti: hava denetimi silinince
     hicbir test kirilmiyordu.                              */
  const { D, o } = kur("nozarashi", 0);
  const h = kurban("b2", { x: 10, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h];
  for (let x = 6; x <= 12; x++)
    for (let y = 90; y <= 93; y++)
      D.boyut.getBlock({ x, y, z: 0 }).setType("minecraft:stone");
  const is = bul("berserk").olustur(o);
  for (let i = 0; i < ayar.BERSERK_ADIM + 2; i++) { is.calis(); tickIlerlet(1); }
  kontrol("DUVARA isinma yapilmadi", o._isinma.length === 0,
          o._isinma.length + " isinma");
  kontrol("yine de yerinden vurdu", h._hasar > 0, "hasar " + h._hasar);
}
{
  /* Acikken tekrar tetikleme KAPATIYOR. */
  const { D, o } = kur("nozarashi", 0);
  D.boyut.getEntities = () => [];
  const is = bul("berserk").olustur(o);
  const once = ruh.ruhOku(o);
  kontrol("ikinci tetikleme yeni is ACMIYOR",
          bul("berserk").olustur(o) === undefined);
  kontrol("ikinci tetikleme ruh HARCAMIYOR", ruh.ruhOku(o) === once);
  kontrol("is kapanma isareti aldi", is.calis() === true);
  is.bitir();
  kontrol("defter temizlendi (yeniden acilabiliyor)",
          !!bul("berserk").olustur(o));
}

console.log("=== 7. TETIK: UZUN MENZIL, DELICI, ZEHIR ===");
{
  const { D, o } = kur("shinso", 0);
  /* Y hedefin MERMI HIZASINDA olmasi lazim: mermi 1.6 blok
     yaricapla tariyor, ayak/bas farki kadar sapan bir hedef
     hic gorunmez. Taklit oyuncunun basKonumu'su location ile
     ayni (getHeadLocation taklidi yok), yani 90.6.
     Ilk yazimda hedefleri 89'a koymustum ve UCU DE sessizce
     kaciyordu -- test yesil de olabilirdi, sifir da.       */
  const yakin = kurban("t1", { x: 20, y: 90.6, z: 0.5 });
  const uzak = kurban("t2", { x: 80, y: 90.6, z: 0.5 });
  D.boyut.getEntities = (s) => {
    const c = [];
    for (const v of [yakin, uzak]) {
      const dx = v.location.x - s.location.x, dy = v.location.y - s.location.y,
            dz = v.location.z - s.location.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= s.maxDistance) c.push(v);
    }
    return c;
  };
  const is = bul("tetik").olustur(o);
  kontrol("is acildi", !!is);
  yurut(is);
  kontrol("ilk hedefte DURMADI (delici)", yakin._hasar > 0 && uzak._hasar > 0,
          yakin._hasar + " / " + uzak._hasar);
  kontrol("80 blok oteye ulasti", uzak._kez === 1, uzak._kez + " vurus");
  kontrol("zehir uygulandi", uzak._efekt.some((e) => e.a === "poison"));
  kontrol("menzil kaynaktaki gibi 100", ayar.TETIK_MENZIL === 100);
}

console.log("=== 8. GAYZER VE HALE KENDILIGINDEN KAPANIYOR ===");
for (const [k, sure] of [["alev_halesi", ayar.HALE_SURE],
                         ["ates_gayzeri", ayar.GAYZER_SURE]]) {
  const { D, o } = kur("ryujin", 0);
  D.boyut.getEntities = () => [];
  const is = bul(k).olustur(o);
  const bitti = yurut(is, sure + 60);
  kontrol(k + " kapandi", bitti >= 0, bitti + " tick");
  kontrol(k + " sureye gore kapandi (~" + sure + ")",
          bitti >= 0 && bitti <= sure + 30, bitti + " tick");
}
{
  /* Hale ETRAFI vuruyor, onunu degil: arkadaki de yanmali. */
  const { D, o } = kur("ryujin", 0);
  const arka = kurban("h1", { x: -2, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [arka];
  const is = bul("alev_halesi").olustur(o);
  for (let i = 0; i < ayar.HALE_ADIM + 2; i++) { is.calis(); tickIlerlet(1); }
  kontrol("hale ARKADAKINI de vurdu", arka._hasar > 0, "hasar " + arka._hasar);
}

console.log("=== 9. OYUNCU CIKINCA DEFTER TEMIZ ===");
{
  const fs = await import("node:fs");
  const m = fs.readFileSync("./pack/main.js", "utf8");
  kontrol("main.js berserkUnut cagiriyor",
          /berserkUnut\(olay\.playerId\)/.test(m));
  kontrol("main.js karakter_yetenekler.js'i yukluyor",
          /yetenekler\/karakter_yetenekler\.js/.test(m));
}

console.log("=== 10. DINAMIK OZELLIK YOKKEN DE AYRI ===");
{
  /* EN SONA konuldu, cunku ozellikVar bir kez false olunca
     modul boyunca oyle kaliyor.

     Bu bolum bir MUTASYONUN kacmasindan dogdu: karakterYaz
     bellekYol'a yaziyor olsa hicbir test kirilmiyordu --
     butun testlerin taklit oyuncusunda dinamik ozellik VARDI,
     yani bellek yolu hic yurumuyordu. Dinamik ozelligin
     patladigi bir dunyada (eski surum, kisitli sunucu)
     karakter secmek YOLU degistirirdi.                     */
  const { o } = kur("ryujin", 0, "cero");
  o.setDynamicProperty = () => { throw new Error("ozellik yok"); };
  o.getDynamicProperty = () => { throw new Error("ozellik yok"); };
  ruh.yolYaz(o, "cero");
  ruh.karakterYaz(o, "shinso");
  kontrol("bellek yolunda karakter yazildi", ruh.karakterOku(o) === "shinso",
          ruh.karakterOku(o));
  kontrol("bellek yolunda YOL bozulmadi", ruh.yolOku(o) === "cero",
          ruh.yolOku(o));
  ruh.karakterYaz(o, "nozarashi");
  kontrol("ikinci yazim da yolu bozmadi",
          ruh.karakterOku(o) === "nozarashi" && ruh.yolOku(o) === "cero",
          ruh.yolOku(o) + " / " + ruh.karakterOku(o));

  /* Defter borcu: oyuncu cikinca bellekteki karakter de
     silinmeli. Bu da kacan bir mutasyondu -- ruhUnut(id)
     bellekKarakter'e hic dokunmasa kimse fark etmiyordu.  */
  ruh.ruhUnut(o.id);
  kontrol("cikinca bellekteki karakter unutuldu",
          ruh.karakterOku(o) === ayar.RUH_VARSAYILAN_KARAKTER,
          ruh.karakterOku(o));
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);

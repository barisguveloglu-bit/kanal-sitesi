/* ERROR 404 -- IKINCI GECIS                            v7.94

   Kullanici: "ben sana her zaman ne yiyorum hepsini al
   demiyor muyum... guzel mekanik diye gecme."

   Bu mod v7.74'te KISMEN alinmisti; o zaman alinmayanlarin
   listesi ayarlar.js'te yazilidir. Bu surum o listeye geri
   donuyor. Tam hesap REFERANS_ERROR404_EK.md'de.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. SART BOZULMUYOR: hicbir yeni olay hasar vermiyor,
      esya kaybettirmiyor.
   2. Bozulan blok DEFTERE yaziliyor ve GERI KONUYOR; araya
      oyuncu girdiyse dokunulmuyor.
   3. Yukselen zemin HICBIR BLOGU SILMIYOR -- yalniz havaya
      koyuyor. En kotu ihtimal havada blok kalmasi.
   4. Bozulan blok yalniz DOGAL zemin listesinden seciliyor;
      sandik/firin/yatak listede yok.
   5. Faz tek yonlu yukseliyor ve DURAKTA sayiyor.
   6. Yapilandirma dugmelerinin hepsi calisiyor ve KALICI.
   7. Bitis (CodemanDie) her seyi durduruyor VE defterleri
      bosaltiyor -- "artik hicbir sey yok" derken ortada
      bozulmus blok kalmiyor.
   8. Yanlis sifre reddediliyor, dogru sifre bitiriyor.       */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum, world } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const E     = await import("./pack/yetenekler/error404.js");
const korku = await import("./pack/yetenekler/efsane_korku.js");
const butce = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

function kur(id, konum) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 },
                      konum || { x: 0.5, y: 80, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player"; o.name = id;
  o.location = konum ? { ...konum } : { x: 0.5, y: 80, z: 0.5 };
  o._komutlar = []; o._mesaj = []; o._hasar = []; o._yazi = []; o._baslik = [];
  o.hasTag = () => false;
  o.runCommand = (k) => { o._komutlar.push(k); return { successCount: 1 }; };
  o.sendMessage = (m) => o._mesaj.push(String(m));
  o.applyDamage = (n) => { o._hasar.push(n); return true; };
  o.onScreenDisplay = {
    setActionBar(t) { o._yazi.push(String(t)); },
    setTitle(t) { o._baslik.push(String(t)); }
  };
  D.boyut._varliklar = [o];
  _durum.oyuncular = [];
  if (butce.butceSifirla) butce.butceSifirla();
  korku.efsaneKorkuUnut();
  E.e404Unut();
  return { D, o };
}
const bas = (kimlik, o) => {
  const t = kayit.yetenekAl(kimlik);
  sus();
  const r = t ? t.olustur(o) : undefined;
  ac();
  return r;
};
const yaz = (o) => o._yazi.join(" | ");
const msj = (o) => o._mesaj.join(" | ");

console.log("=== 0. KAYIT VE SIRA ===");
{
  const hepsi = ["korku_dogum", "korku_blok", "korku_zemin", "korku_siklik",
                 "korku_temizle", "korku_durum", "korku_not",
                 "korku_sifre", "korku_sifre_" + ayar.E404_SIFRE];
  let eksik = "";
  for (const k of hepsi) if (!kayit.yetenekAl(k)) eksik += k + " ";
  kontrol("dokuz yetenek de kayitli", !eksik, eksik || "tam");
  kontrol("sira carpismasi yok", kayit.siraDenetimi().length === 0,
          kayit.siraDenetimi().join(" | ") || "temiz");
  kontrol("ilk sira E404_SIRA_BAS",
          kayit.yetenekAl("korku_dogum").sira === ayar.E404_SIRA_BAS,
          String(kayit.yetenekAl("korku_dogum").sira));
  /* Kaynaktaki sifre BIREBIR. */
  kontrol("sifre kaynaktaki gibi", ayar.E404_SIFRE === "334303", ayar.E404_SIFRE);
  kontrol("telefon kaynaktaki gibi", ayar.E404_TELEFON === "334-303-9542",
          ayar.E404_TELEFON);
}

console.log("");
console.log("=== 1. SART: HICBIR YENI OLAY ZARAR VERMIYOR ===");
{
  /* Kaynak dosyada hasar/oldurme cagrisi HIC olmamali.       */
  const { readFileSync } = await import("node:fs");
  const ham = readFileSync(
    new URL("./pack/yetenekler/error404.js", import.meta.url), "utf8");
  /* YORUMLAR ATILIYOR. Dosyanin kendi basligi "applyDamage /
     createExplosion / kill YOK" diye yaziyor; ham metinde
     arayinca kendi sozunu yasak sayiyordu. Aranan sey CAGRI,
     cumle degil.                                            */
  const kod = ham.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  for (const yasak of ["applyDamage(", "createExplosion(", ".kill(",
                       "setOnFire(", "clearAll(", "minecraft:inventory"]) {
    kontrol("kaynakta '" + yasak + "' cagrisi yok", kod.indexOf(yasak) < 0);
  }

  const { D, o } = kur("z1");
  const konum = o.location;
  E.bozulanBlok(o, D.boyut, konum, 0);
  E.yukselenZemin(o, D.boyut, konum, 0);
  E.bozulmusSuru(o, D.boyut, konum);
  E.fazIlerlet(o, true);
  kontrol("oyuncuya hic hasar gitmedi", o._hasar.length === 0,
          o._hasar.join(","));
}

console.log("");
console.log("=== 2. FAZ TEK YONLU VE DURAKTA ===");
{
  const { o } = kur("f1");
  kontrol("baslangic faz 0", E.e404Faz(o.id) === 0, String(E.e404Faz(o.id)));

  /* Durak DISINDA sayac islememeli. */
  for (let i = 0; i < ayar.E404_FAZ_ESIK[0] + 5; i++) E.fazIlerlet(o, false);
  kontrol("durak disinda faz yukselmiyor", E.e404Faz(o.id) === 0,
          String(E.e404Faz(o.id)));

  for (let i = 0; i < ayar.E404_FAZ_ESIK[0]; i++) E.fazIlerlet(o, true);
  kontrol("esik dolunca faz 1", E.e404Faz(o.id) === 1, String(E.e404Faz(o.id)));
  kontrol("faz yukselince baslik yazildi",
          o._baslik.some((b) => /404/.test(b)), o._baslik.join("|"));

  for (let i = E.e404Faz(o.id); ; ) {
    E.fazIlerlet(o, true);
    if (E.e404Faz(o.id) >= ayar.E404_FAZ_TAVAN) break;
    if (++i > 1000) break;
  }
  kontrol("tavana cikiyor", E.e404Faz(o.id) === ayar.E404_FAZ_TAVAN,
          String(E.e404Faz(o.id)));
  /* Tavanin uzerine cikmamali. */
  for (let i = 0; i < 500; i++) E.fazIlerlet(o, true);
  kontrol("tavani asmiyor", E.e404Faz(o.id) === ayar.E404_FAZ_TAVAN,
          String(E.e404Faz(o.id)));

  /* Durak disina cikmak fazi DUSURMEMELI. */
  for (let i = 0; i < 100; i++) E.fazIlerlet(o, false);
  kontrol("durak disinda faz dusmuyor", E.e404Faz(o.id) === ayar.E404_FAZ_TAVAN,
          String(E.e404Faz(o.id)));

  /* Her fazin kendi satirlari olmali. */
  for (const [f, liste] of ayar.E404_FAZ_SATIRLAR) {
    kontrol("faz " + f + " satiri var", Array.isArray(liste) && liste.length > 0,
            String(liste && liste.length));
  }
  o._mesaj = [];
  kontrol("faz satiri sohbete dusuyor", E.fazSatiri(o) && msj(o).length > 0,
          msj(o));
}

console.log("");
console.log("=== 3. BOZULAN BLOK: DEFTER VE GERI KOYMA ===");
{
  const { D, o } = kur("b1");
  const konum = o.location;
  /* Cevreyi dogal zeminle doldur. */
  for (let dx = -16; dx <= 16; dx++) {
    for (let dz = -16; dz <= 16; dz++) {
      for (let dy = -3; dy <= 3; dy++) {
        D.boyut.getBlock({ x: dx, y: 80 + dy, z: dz }).setType("minecraft:stone");
      }
    }
  }
  const say = () => {
    let n = 0;
    for (let dx = -16; dx <= 16; dx++)
      for (let dz = -16; dz <= 16; dz++)
        for (let dy = -3; dy <= 3; dy++)
          if (D.boyut.getBlock({ x: dx, y: 80 + dy, z: dz }).typeId
              === ayar.E404_BOZULMA_BLOK) n++;
    return n;
  };

  /* TEK CAGRI: tavan ancak boyle olculur. Ilk yazilista 30
     cagri yapilip "tavan x 30" diye gevsek bir sinira
     bakiliyordu ve tavani kaldiran mutasyon KACTI.          */
  if (butce.butceSifirla) butce.butceSifirla();
  const oldu = E.bozulanBlok(o, D.boyut, konum, 0);
  kontrol("blok gercekten bozuldu", oldu && say() > 0, say() + " blok");
  kontrol("tek cagrida tavan asilmadi", say() <= ayar.E404_BOZULMA_TAVAN,
          say() + " blok (tavan " + ayar.E404_BOZULMA_TAVAN + ")");
  kontrol("defter tutuluyor", E.bozukDefterBoyu() > 0,
          E.bozukDefterBoyu() + " kayit");

  /* YAKININDAKI bozulmamali: oyuncunun ayaginin dibi. */
  let yakinBozuk = 0;
  for (let dx = -16; dx <= 16; dx++)
    for (let dz = -16; dz <= 16; dz++)
      for (let dy = -3; dy <= 3; dy++) {
        if (D.boyut.getBlock({ x: dx, y: 80 + dy, z: dz }).typeId
            !== ayar.E404_BOZULMA_BLOK) continue;
        if (Math.hypot(dx - konum.x, dz - konum.z) < ayar.E404_BOZULMA_YAKIN - 1) {
          yakinBozuk++;
        }
      }
  kontrol("yakindaki bloklar bozulmadi", yakinBozuk === 0,
          yakinBozuk + " yakin");

  /* Geri koyma. */
  E.bozuklariTazele(ayar.E404_BOZULMA_SURE + 1);
  kontrol("hepsi geri kondu", say() === 0, say() + " blok kaldi");
  kontrol("defter bosaldi", E.bozukDefterBoyu() === 0,
          E.bozukDefterBoyu() + " kayit");
}

console.log("");
console.log("=== 3b. ARAYA GIREN OYUNCUYA DOKUNULMUYOR ===");
{
  const { D, o } = kur("b2");
  const konum = o.location;
  for (let dx = -16; dx <= 16; dx++)
    for (let dz = -16; dz <= 16; dz++)
      for (let dy = -3; dy <= 3; dy++)
        D.boyut.getBlock({ x: dx, y: 80 + dy, z: dz }).setType("minecraft:stone");

  for (let i = 0; i < 30 && E.bozukDefterBoyu() === 0; i++) {
    if (butce.butceSifirla) butce.butceSifirla();
    E.bozulanBlok(o, D.boyut, konum, 0);
  }
  kontrol("bozulma oldu (on kosul)", E.bozukDefterBoyu() > 0);

  /* Oyuncu bozulan yere KENDI blogunu koydu. */
  let konan = 0;
  for (let dx = -16; dx <= 16 && konan === 0; dx++)
    for (let dz = -16; dz <= 16 && konan === 0; dz++)
      for (let dy = -3; dy <= 3 && konan === 0; dy++) {
        const p = { x: dx, y: 80 + dy, z: dz };
        if (D.boyut.getBlock(p).typeId !== ayar.E404_BOZULMA_BLOK) continue;
        D.boyut.getBlock(p).setType("minecraft:chest");
        konan++;
        E.bozuklariTazele(ayar.E404_BOZULMA_SURE + 1);
        kontrol("oyuncunun koydugu blok KALDI",
                D.boyut.getBlock(p).typeId === "minecraft:chest",
                D.boyut.getBlock(p).typeId);
      }
  kontrol("olcum yapilabildi", konan === 1);
}

console.log("");
console.log("=== 3c. YALNIZ DOGAL ZEMIN BOZULUYOR ===");
{
  /* Hedef listesinde oyuncunun esyasi olmamali. */
  for (const kotu of ["minecraft:chest", "minecraft:furnace", "minecraft:bed",
                      "minecraft:crafting_table", "minecraft:glass",
                      "minecraft:torch", "minecraft:oak_door"]) {
    kontrol("hedef listesinde '" + kotu.slice(10) + "' yok",
            ayar.E404_BOZULMA_HEDEF.indexOf(kotu) < 0);
  }
  const { D, o } = kur("b3");
  const konum = o.location;
  /* Her yer SANDIK: hicbir sey bozulmamali. */
  for (let dx = -16; dx <= 16; dx++)
    for (let dz = -16; dz <= 16; dz++)
      for (let dy = -3; dy <= 3; dy++)
        D.boyut.getBlock({ x: dx, y: 80 + dy, z: dz }).setType("minecraft:chest");
  let oldu = false;
  for (let i = 0; i < 30; i++) {
    if (butce.butceSifirla) butce.butceSifirla();
    if (E.bozulanBlok(o, D.boyut, konum, 0)) oldu = true;
  }
  kontrol("sandik dunyasinda hicbir sey bozulmadi", !oldu);
  kontrol("defter bos", E.bozukDefterBoyu() === 0);
}

console.log("");
console.log("=== 4. YUKSELEN ZEMIN HICBIR BLOGU SILMIYOR ===");
{
  const { D, o } = kur("y1");
  const konum = o.location;
  /* Zemin: y=79 tas, ustu hava. */
  for (let dx = -20; dx <= 20; dx++)
    for (let dz = -20; dz <= 20; dz++)
      D.boyut.getBlock({ x: dx, y: 79, z: dz }).setType("minecraft:stone");

  const zeminSay = () => {
    let n = 0;
    for (let dx = -20; dx <= 20; dx++)
      for (let dz = -20; dz <= 20; dz++)
        if (D.boyut.getBlock({ x: dx, y: 79, z: dz }).typeId === "minecraft:stone") n++;
    return n;
  };
  const once = zeminSay();

  let oldu = false;
  for (let i = 0; i < 30 && !oldu; i++) {
    if (butce.butceSifirla) butce.butceSifirla();
    oldu = E.yukselenZemin(o, D.boyut, konum, 0);
  }
  kontrol("zemin havada yankilandi", oldu, E.havaDefterBoyu() + " blok");
  /* ASIL OLCUM: zeminden tek bir blok bile eksilmedi.        */
  kontrol("zeminden HIC blok eksilmedi", zeminSay() === once,
          once + " -> " + zeminSay());
  kontrol("defter tutuluyor", E.havaDefterBoyu() > 0);

  E.havaTazele(ayar.E404_KALDIRMA_SURE + 1);
  kontrol("havadakiler silindi", E.havaDefterBoyu() === 0,
          E.havaDefterBoyu() + " kayit");
  kontrol("silindikten sonra da zemin tam", zeminSay() === once,
          once + " -> " + zeminSay());
}

console.log("");
console.log("=== 4b. DOLU YERE KOYMUYOR ===");
{
  const { D, o } = kur("y2");
  const konum = o.location;
  /* Her yer dolu: hicbir sey konmamali. */
  D.boyut._hepsiDolu = true;
  for (let dx = -20; dx <= 20; dx++)
    for (let dz = -20; dz <= 20; dz++)
      for (let dy = 0; dy <= 8; dy++)
        D.boyut.getBlock({ x: dx, y: 79 + dy, z: dz }).setType("minecraft:stone");
  let oldu = false;
  for (let i = 0; i < 20; i++) {
    if (butce.butceSifirla) butce.butceSifirla();
    if (E.yukselenZemin(o, D.boyut, konum, 0)) oldu = true;
  }
  kontrol("dolu dunyada hicbir sey konmadi", !oldu && E.havaDefterBoyu() === 0,
          E.havaDefterBoyu() + " kayit");
}

console.log("");
console.log("=== 5. BOZULMUS SURU ===");
{
  const { D, o } = kur("s1");
  const konum = o.location;
  const hayvan = (id, tip, x) => ({
    id, typeId: tip, isValid: true, name: id,
    location: { x, y: 80, z: 0.5 }, _efekt: [], _hasar: [], _donus: [],
    applyDamage(n) { this._hasar.push(n); return true; },
    addEffect(ad, sure, se) { this._efekt.push({ ad, sure, se }); },
    setRotation(r) { this._donus.push(r); }
  });
  const inek = hayvan("inek", "minecraft:cow", 4);
  const zombi = hayvan("zombi", "minecraft:zombie", 5);
  const uzak = hayvan("uzak", "minecraft:pig", ayar.E404_SURU_MENZIL + 6);
  D.boyut._varliklar = [o, inek, zombi, uzak];

  const oldu = E.bozulmusSuru(o, D.boyut, konum);
  kontrol("suru etkilendi", oldu);
  kontrol("inek yavasladi", inek._efekt.some((e) => e.ad === "slowness"),
          inek._efekt.map((e) => e.ad).join(","));
  kontrol("inege HIC hasar yok", inek._hasar.length === 0, inek._hasar.join(","));
  kontrol("inek oyuncuya dondu", inek._donus.length > 0);
  kontrol("zombi listede degil, dokunulmadi", zombi._efekt.length === 0);
  kontrol("menzil disindakine dokunulmadi", uzak._efekt.length === 0);

  /* TAVAN: menzilde tavandan COK hayvan olmali, yoksa tavani
     kaldiran mutasyon kacar.                                */
  const kalabalik = [];
  for (let i = 0; i < ayar.E404_SURU_TAVAN + 4; i++) {
    kalabalik.push(hayvan("k" + i, "minecraft:sheep", 3 + i * 0.2));
  }
  D.boyut._varliklar = [o, ...kalabalik];
  E.bozulmusSuru(o, D.boyut, konum);
  const etkilenen = kalabalik.filter((h) => h._efekt.length > 0).length;
  kontrol("suru tavani tutuyor", etkilenen === ayar.E404_SURU_TAVAN,
          etkilenen + " / " + ayar.E404_SURU_TAVAN +
          " (ortamda " + kalabalik.length + ")");
  for (const e of inek._efekt) {
    kontrol("suru/" + e.ad + ": sureli", e.sure > 0, String(e.sure));
  }
  kontrol("oyuncuya efekt verilmedi",
          !(D.boyut._efektler || []).length, String((D.boyut._efektler || []).length));
}

console.log("");
console.log("=== 6. YAPILANDIRMA ===");
{
  const { o } = kur("c1");
  const a = E.e404Ayar();
  kontrol("varsayilan: belirir", a.dogum);
  kontrol("varsayilan: blok acik", a.blok);
  kontrol("varsayilan: zemin acik", a.zemin);
  kontrol("varsayilan siklik", a.siklik === ayar.E404_SIKLIK_VARSAYILAN,
          String(a.siklik));

  /* GERCEK DUNYA ile olculuyor. Ilk yazilista boyut olarak
     `undefined` geciliyordu; o zaten istisna atip false
     donuyordu, yani ayar kapisini kaldiran mutasyon KACTI.  */
  const D2 = (() => {
    const x = dunyaKur();
    for (let dx = -16; dx <= 16; dx++)
      for (let dz = -16; dz <= 16; dz++)
        for (let dy = -3; dy <= 3; dy++)
          x.boyut.getBlock({ x: dx, y: 80 + dy, z: dz }).setType("minecraft:stone");
    return x;
  })();
  bas("korku_blok", o);
  kontrol("blok kapandi", !E.e404Ayar().blok);
  let kapaliyken = false;
  for (let i = 0; i < 20; i++) {
    if (butce.butceSifirla) butce.butceSifirla();
    if (E.bozulanBlok(o, D2.boyut, o.location, 0)) kapaliyken = true;
  }
  kontrol("kapali blokla bozulma olmuyor", !kapaliyken);
  bas("korku_blok", o);
  kontrol("blok geri acildi", E.e404Ayar().blok);
  /* Karsilastirma: acikken AYNI dunyada bozulma OLUYOR --
     yoksa yukaridaki madde bos bir dunyayi olcuyor olurdu. */
  let acikken = false;
  for (let i = 0; i < 20 && !acikken; i++) {
    if (butce.butceSifirla) butce.butceSifirla();
    acikken = E.bozulanBlok(o, D2.boyut, o.location, 0);
  }
  kontrol("acikken ayni dunyada bozulma oluyor", acikken);
  E.bozuklariTazele(ayar.E404_BOZULMA_SURE + 1);

  const D3 = (() => {
    const x = dunyaKur();
    for (let dx = -20; dx <= 20; dx++)
      for (let dz = -20; dz <= 20; dz++)
        x.boyut.getBlock({ x: dx, y: 79, z: dz }).setType("minecraft:stone");
    return x;
  })();
  bas("korku_zemin", o);
  kontrol("zemin kapandi", !E.e404Ayar().zemin);
  let zKapali = false;
  for (let i = 0; i < 20; i++) {
    if (butce.butceSifirla) butce.butceSifirla();
    if (E.yukselenZemin(o, D3.boyut, o.location, 0)) zKapali = true;
  }
  kontrol("kapali zeminle kaldirma olmuyor", !zKapali);
  bas("korku_zemin", o);
  let zAcik = false;
  for (let i = 0; i < 20 && !zAcik; i++) {
    if (butce.butceSifirla) butce.butceSifirla();
    zAcik = E.yukselenZemin(o, D3.boyut, o.location, 0);
  }
  kontrol("acikken ayni dunyada kaldirma oluyor", zAcik);
  E.havaTazele(ayar.E404_KALDIRMA_SURE + 1);

  const ilk = E.e404SiklikCarpani();
  bas("korku_siklik", o);
  kontrol("siklik degisti", E.e404SiklikCarpani() !== ilk,
          ilk + " -> " + E.e404SiklikCarpani());
  /* Uc kere basinca basa donmeli -- cikisi olmayan ayar olmaz. */
  bas("korku_siklik", o);
  bas("korku_siklik", o);
  kontrol("siklik dongusu basa donuyor", E.e404SiklikCarpani() === ilk,
          String(E.e404SiklikCarpani()));

  o._yazi = [];
  bas("korku_durum", o);
  kontrol("durum okunuyor", /faz/.test(yaz(o)), yaz(o));
}

console.log("");
console.log("=== 7. SIFRE VE BITIS ===");
{
  const { o } = kur("p1");
  bas("korku_not", o);
  kontrol("not telefonu veriyor", msj(o).includes(ayar.E404_TELEFON), msj(o));

  o._mesaj = [];
  bas("korku_sifre", o);
  kontrol("yanlis sifre reddediliyor",
          msj(o).includes(ayar.E404_SIFRE_RET), msj(o));
  kontrol("reddedilince bitmiyor", !E.e404Duruyor());

  /* BITISTEN ONCE gercek is yaptir: faz yukselt, defterlere
     kayit dustur. Ilk yazilista ikisi de zaten bostu ve
     "bitis bunlari temizliyor" maddeleri hicbir sey
     olcmuyordu -- iki mutasyon boyle kacti.                 */
  for (let i = 0; i < ayar.E404_FAZ_ESIK[0]; i++) E.fazIlerlet(o, true);
  kontrol("bitisten once faz 1 (on kosul)", E.e404Faz(o.id) === 1,
          String(E.e404Faz(o.id)));
  const Dp = dunyaKur();
  for (let dx = -16; dx <= 16; dx++)
    for (let dz = -16; dz <= 16; dz++) {
      for (let dy = -3; dy <= 3; dy++)
        Dp.boyut.getBlock({ x: dx, y: 80 + dy, z: dz }).setType("minecraft:stone");
      Dp.boyut.getBlock({ x: dx, y: 79, z: dz }).setType("minecraft:stone");
    }
  for (let i = 0; i < 20 && E.bozukDefterBoyu() === 0; i++) {
    if (butce.butceSifirla) butce.butceSifirla();
    E.bozulanBlok(o, Dp.boyut, o.location, 0);
  }
  for (let i = 0; i < 20 && E.havaDefterBoyu() === 0; i++) {
    if (butce.butceSifirla) butce.butceSifirla();
    E.yukselenZemin(o, Dp.boyut, o.location, 0);
  }
  kontrol("bitisten once bozuk defter dolu (on kosul)",
          E.bozukDefterBoyu() > 0, E.bozukDefterBoyu() + " kayit");
  kontrol("bitisten once hava defteri dolu (on kosul)",
          E.havaDefterBoyu() > 0, E.havaDefterBoyu() + " kayit");

  o._mesaj = [];
  bas("korku_sifre_" + ayar.E404_SIFRE, o);
  kontrol("dogru sifre kabul ediliyor",
          msj(o).includes(ayar.E404_SIFRE_KABUL), msj(o));
  let eksik = "";
  for (const s of ayar.E404_BITIS_SATIRLAR) if (!msj(o).includes(s)) eksik += "|";
  kontrol("bitis satirlarinin hepsi yazildi", !eksik,
          eksik ? "eksik var" : ayar.E404_BITIS_SATIRLAR.length + " satir");
  kontrol("olaylar durdu", E.e404Duruyor());
  kontrol("faz sifirlandi", E.e404Faz(o.id) === 0, String(E.e404Faz(o.id)));

  /* Bitis DEFTERLERI de bosaltmali. */
  kontrol("bozuk defter bos", E.bozukDefterBoyu() === 0);
  kontrol("hava defteri bos", E.havaDefterBoyu() === 0);

  /* Kaynagin kendi sozu: yapilandirmadan yeniden acilabilir. */
  bas("korku_dogum", o);   // kapat
  bas("korku_dogum", o);   // ac
  kontrol("yapilandirmadan geri aciliyor", !E.e404Duruyor());
}

console.log("");
console.log("=== 8. BITISTEN SONRA HICBIR OLAY OLMUYOR ===");
{
  const { D, o } = kur("q1");
  bas("korku_sifre_" + ayar.E404_SIFRE, o);
  kontrol("bitti (on kosul)", E.e404Duruyor());
  kontrol("bozulma olmuyor", E.bozulanBlok(o, D.boyut, o.location, 0) === false);
  kontrol("kaldirma olmuyor", E.yukselenZemin(o, D.boyut, o.location, 0) === false);
  kontrol("suru olmuyor", E.bozulmusSuru(o, D.boyut, o.location) === false);
  kontrol("faz ilerlemiyor", E.fazIlerlet(o, true) === 0);
  kontrol("faz satiri yok", E.fazSatiri(o) === false);
}

console.log("");
console.log("=== 9. KALICILIK ===");
{
  const { o } = kur("k1");
  for (let i = 0; i < ayar.E404_FAZ_ESIK[0]; i++) E.fazIlerlet(o, true);
  bas("korku_blok", o);            // kapat -> yaziyor
  kontrol("faz 1 (on kosul)", E.e404Faz(o.id) === 1);

  const ham = world.getDynamicProperty(ayar.E404_FAZ_KAYIT_ANAHTAR);
  kontrol("dunyaya yazildi", typeof ham === "string" && ham.length > 0,
          String(ham).slice(0, 60));
  const k = JSON.parse(ham || "{}");
  kontrol("faz kayitta", k.f && k.f[o.id] === 1, JSON.stringify(k.f));
  kontrol("ayar kayitta", k.a && k.a.b === false, JSON.stringify(k.a));

  /* ---- KAYITTAN YUKLENEN FAZ DUSMUYOR ----
     Asil koruma bu. Kodda bir de `Math.max` vardi ama OLUYDU:
     kaldirildiginda hicbir test dusmuyordu. Korumayi gercekten
     yapan sey "yeni > d.faz" kapisi; olculen de o.           */
  world.setDynamicProperty(ayar.E404_FAZ_KAYIT_ANAHTAR,
    JSON.stringify({ f: { yuk1: ayar.E404_FAZ_TAVAN },
                     a: { d: true, b: true, z: true, s: 1, t: false } }));
  E.e404Unut();
  E.e404Yukle();
  kontrol("kayittan tavan faz okundu",
          E.e404Faz("yuk1") === ayar.E404_FAZ_TAVAN, String(E.e404Faz("yuk1")));
  const { o: yo } = (() => {
    const r = kur("yuk1");
    return r;
  })();
  /* kur() unutuyor; kaydi yeniden yukle. */
  E.e404Yukle();
  for (let i = 0; i < ayar.E404_FAZ_ESIK[0] + 2; i++) E.fazIlerlet(yo, true);
  kontrol("sayac sifirdan baslasa da faz DUSMUYOR",
          E.e404Faz("yuk1") === ayar.E404_FAZ_TAVAN, String(E.e404Faz("yuk1")));
}

console.log("");
console.log(hata ? "SONUC: HATA VAR" : "SONUC: TEMIZ");
process.exit(hata ? 1 : 0);

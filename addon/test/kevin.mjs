/* KEVIN1545 -- hapis (demir kafes) + dondur.

   Referanstaki kusurlarin her biri icin bir sinama:
     - hapis DOLU kutu doldurmuyor, ICI BOS kafes oruyor
     - var olan bloklarin ustune yazmiyor ("keep" eksikligi)
     - koydugunu GERI ALIYOR (referans kalici iz birakiyordu)
     - @e[r,c=1] yerine kilitliHedef: kendini ve arkadakini secmiyor
     - dondur hedefi GERCEKTEN tutuyor (referans sadece poz oynatiyordu)
     - dondur SURELI, kalici degil                                   */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";

esyaKaydet("pa:kol_kevin");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, BAS);
  o.id = id;
  o.typeId = "minecraft:player";
  o.isSneaking = true;
  o.getComponent = (ad) => (ad === "minecraft:equippable")
    ? { getEquipment: (s) => (s === "Mainhand") ? { typeId: "pa:kol_kevin" } : undefined,
        setEquipment: () => true }
    : undefined;
  _durum.oyuncular = [o];
  return { D, o };
}

function mob(id, x, y, z) {
  return {
    id, typeId: "minecraft:zombie", isValid: true,
    location: { x, y, z },
    _efektler: [], _komutlar: [],
    addEffect(ad, sure, se) { this._efektler.push({ ad, sure, se }); },
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    applyImpulse: () => true, applyKnockback: () => true, applyDamage: () => true,
    remove() { this.isValid = false; }
  };
}

/* DIKKAT: iki tetikleme arasinda BEKLEME (60 tick) gecmeli,
   yoksa ikincisi beklemeye takilir ve test yanlis sonuc verir.
   zipla() ziplama icin 8 tick harciyor, yani beklemek istedigin
   sure en az 52 olmali. Varsayilan 70 -- bilerek genis.        */
function zipla(o, tick = 70) {
  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(tick); ac();
}

// Kevin Kolu'nda 2. yetenek (dondur) icin bir kez degistir
function yetenekDegistir(o) {
  const eski = o.getViewDirection;
  o.getViewDirection = () => ({ x: 0, y: 1, z: 0 });
  sus(); tickIlerlet(40); ac();
  o.getViewDirection = eski;
}

console.log("=== 1. HAPIS: KAFES ORULUYOR ===");
{
  const { D, o } = kur("kv1");
  const z = mob("z1", 10.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  zipla(o);

  const parmaklik = D.sayac.yazilan.filter((y) => y.tip === "minecraft:iron_bars");
  kontrol("kafes oruldu", parmaklik.length > 0, parmaklik.length + " parmaklik");

  kontrol("actionbar hedefi bildirdi",
          /hapsedildi/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);

  // Kafes hedefin etrafinda mi
  const uzak = parmaklik.filter((b) =>
    Math.abs(b.x - 10) > ayar.HAPIS_YARICAP + 0.5 ||
    Math.abs(b.z - 0)  > ayar.HAPIS_YARICAP + 0.5);
  kontrol("kafes hedefin etrafinda", uzak.length === 0, uzak.length + " tanesi uzakta");
}

console.log("");
console.log("=== 2. HAPIS: ICI BOS (referans DOLU dolduruyordu) ===");
{
  const { D, o } = kur("kv2");
  D.boyut._varliklar = [o, mob("z2", 10.5, 90, 0.5)];
  zipla(o);

  const parmaklik = D.sayac.yazilan.filter((y) => y.tip === "minecraft:iron_bars");

  /* Kafesin merkezi hedefin ayaginin BIR ALT kati: zombi y=90,
     merkez y=89. Kabuk y=89..92 arasi; 89 TABAN, 92 TAVAN, ikisi
     de dolu olmali. Bos kalmasi gereken hedefin durdugu iki kat:
     y=90 ve y=91.  (Onceki hali tabani da "ic bosluk" sayip
     yanlis yerden olcuyordu.)                                   */
  const merkezY = 89;
  const icerde = parmaklik.filter((b) =>
    b.x === 10 && b.z === 0 &&
    b.y > merkezY && b.y < merkezY + ayar.HAPIS_YUKSEK);
  kontrol("hedefin durdugu hucreler bos kaldi", icerde.length === 0,
          icerde.length + " tanesi hedefin ustunde");

  const taban = parmaklik.filter((b) => b.y === merkezY).length;
  const tavan = parmaklik.filter((b) => b.y === merkezY + ayar.HAPIS_YUKSEK).length;
  kontrol("taban ve tavan kapali (kacamasin)", taban === 9 && tavan === 9,
          "taban " + taban + ", tavan " + tavan);

  // Dolu 3x3x(YUKSEK+1) kac olurdu, kabuk ondan az olmali
  const dolu = 3 * 3 * (ayar.HAPIS_YUKSEK + 1);
  kontrol("dolu kutudan az blok kullanildi", parmaklik.length < dolu,
          parmaklik.length + " < " + dolu);
}

console.log("");
console.log("=== 3. HAPIS: VAR OLANI YOK ETMIYOR ===");
{
  const { D, o } = kur("kv3");
  D.bloklar.hepsiDolu = true;          // her yer tas
  D.boyut._varliklar = [o, mob("z3", 10.5, 90, 0.5)];
  zipla(o);

  const parmaklik = D.sayac.yazilan.filter((y) => y.tip === "minecraft:iron_bars");
  kontrol("dolu dunyada hic blok yok edilmedi", parmaklik.length === 0,
          parmaklik.length + " parmaklik konuldu");
}

console.log("");
console.log("=== 4. HAPIS: SURESIZ, ELLE ACILIYOR ===");
{
  const { D, o } = kur("kv4");
  D.boyut._varliklar = [o, mob("z4", 10.5, 90, 0.5)];
  zipla(o);

  const parmaklik = D.sayac.yazilan.filter((y) => y.tip === "minecraft:iron_bars").length;
  kontrol("kafes kuruldu", parmaklik > 0, parmaklik + " parmaklik");

  /* Referansin aksine SURESIZ: uzun sure beklemek kafesi acmamali */
  sus(); tickIlerlet(2000); ac();
  let duran = 0;
  for (const v of D.bloklar.values()) if (v === "minecraft:iron_bars") duran++;
  kontrol("2000 tick sonra kafes HALA duruyor", duran === parmaklik,
          duran + " / " + parmaklik);

  // Hedefi kaldir, bosluga bak, tetikle -> acilmali
  D.boyut._varliklar = [o];
  zipla(o);

  let kalan = 0;
  for (const v of D.bloklar.values()) if (v === "minecraft:iron_bars") kalan++;
  kontrol("bosluga bakip tetikleyince kafes acildi", kalan === 0,
          kalan + " parmaklik kaldi");
  kontrol("acildigi bildirildi",
          /acildi/i.test((o._mesajlar || []).join(" ")),
          (o._mesajlar || []).slice(-1)[0] || "mesaj yok");
}

console.log("");
console.log("=== 4b. KAFES DUNYADAN CIKINCA UNUTULMUYOR ===");
{
  const { D, o } = kur("kv4b");
  D.boyut._varliklar = [o, mob("z4b", 10.5, 90, 0.5)];
  zipla(o);
  const parmaklik = D.sayac.yazilan.filter((y) => y.tip === "minecraft:iron_bars").length;

  // Dunyadan cikip girmeyi taklit et: defteri bellekten sil
  const defter = await import("./pack/yetenekler/_kafes_defteri.js");
  defter.defteriUnut();

  kontrol("kayit dunya ozelliginde duruyor",
          defter.kafesSayisi("kv4b") === 1,
          defter.kafesSayisi("kv4b") + " kafes");

  // Yeniden yuklendikten sonra da acilabilmeli
  D.boyut._varliklar = [o];
  zipla(o);
  let kalan = 0;
  for (const v of D.bloklar.values()) if (v === "minecraft:iron_bars") kalan++;
  kontrol("yeniden yukledikten sonra da acilabildi", kalan === 0,
          kalan + " / " + parmaklik + " parmaklik kaldi");
}

console.log("");
console.log("=== 4c. TAVAN ===");
{
  const defter = await import("./pack/yetenekler/_kafes_defteri.js");
  defter.defteriUnut();
  const { D, o } = kur("kv4c");

  /* Kurbanlarin yerlesimi uc kisiti birden saglamali:
       1. ust uste OLMAMALI -- ikinci kafes birincinin bloklarina
          denk gelirse hicbir blok konmaz ve kafes kaydedilmez
       2. HAPIS_MENZIL (24) icinde kalmali -- disaridakini
          zaten yakalamiyoruz
       3. bakis konisinde (HAPIS_ACI 0.9, ~25 derece) olmali

     Cozum: x=8'den baslayip ikiser blok ilerlerken z'yi
     donusumlu -1.4/+1.4 yapiyoruz. floor(z) -2 ve 1 oluyor,
     yani 3x3 kafesler cakismiyor; ayni z'dekiler de 4 blok
     arayla.

     x=8'den basliyoruz cunku daha yakinda aci genisliyor ve
     hedef koninin (HAPIS_ACI 0.9) disina cikabiliyor. Koni
     disina cikan tetikleme "hedef yok" sayilip VAR OLAN BIR
     KAFESI ACIYOR -- o yuzden sayim geri gidiyordu.

     (Onceki hali 5'er blok araliklidi ve son kurbanlar 50 blok
     oteye dusuyordu. Sahte dunya o zaman maxDistance'i yok
     saydigi icin test yine de geciyordu -- yani yanlis sebeple
     yesildi.)                                                  */
  /* TAM tavan+1 kez deniyoruz: ilk TAVAN tanesi kafes kurar,
     sonuncusu tavana carpar. Daha fazla denemek ZARARLI --
     menzil disina cikan hedefsiz tetikleme "hedef yok" sayilip
     VAR OLAN BIR KAFESI ACAR ve sayim geri gider.             */
  for (let i = 0; i < ayar.HAPIS_TAVAN + 1; i++) {
    const z = (i % 2 === 0) ? -1.4 : 1.4;
    D.boyut._varliklar = [o, mob("t" + i, 8 + i * 2, 90, z)];
    zipla(o);
  }
  kontrol("kafes sayisi tavani asmadi",
          defter.kafesSayisi("kv4c") <= ayar.HAPIS_TAVAN,
          defter.kafesSayisi("kv4c") + " / " + ayar.HAPIS_TAVAN);
  kontrol("tavan dolunca sebebi soylendi",
          /kafes acik/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);
}

console.log("=== 5. HAPIS: HEDEF SECIMI (referansin @e hatasi) ===");
{
  const defter = await import("./pack/yetenekler/_kafes_defteri.js");
  defter.defteriUnut();
  const { D, o } = kur("kv5");
  D.boyut._varliklar = [o];            // sadece oyuncu, acik kafes de yok
  zipla(o);
  const parmaklik = D.sayac.yazilan.filter((y) => y.tip === "minecraft:iron_bars");
  kontrol("hedef yokken oyuncu kendini hapsetmedi", parmaklik.length === 0,
          parmaklik.length + " parmaklik");
  kontrol("sebebini soyledi (hedef de kafes de yok)",
          /yok/i.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);
}
{
  const defter2 = await import("./pack/yetenekler/_kafes_defteri.js");
  defter2.defteriUnut();
  const { D, o } = kur("kv6");
  D.boyut._varliklar = [o, mob("arka", -8.5, 90, 0.5)];   // TAM ARKADA
  zipla(o);
  const parmaklik = D.sayac.yazilan.filter((y) => y.tip === "minecraft:iron_bars");
  kontrol("arkadaki hedef secilmedi", parmaklik.length === 0,
          parmaklik.length + " parmaklik");
}

console.log("");
console.log("=== 6. DONDUR ===");
{
  const { D, o } = kur("kv7");
  const z = mob("z7", 10.5, 90, 0.5);
  D.boyut._varliklar = [o, z];

  yetenekDegistir(o);
  kontrol("yetenek Dondur'a gecti",
          /Dondur/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);

  zipla(o);

  kontrol("hedefe yavaslik verildi", z._efektler.length > 0,
          z._efektler.length + " efekt");
  const yav = z._efektler.filter((e) => e.ad === "slowness");
  kontrol("etki slowness", yav.length > 0);
  kontrol("yavaslik seviyesi ayardan geldi",
          yav.length > 0 && yav[0].se.amplifier === ayar.DONDUR_YAVASLIK,
          yav.length ? String(yav[0].se.amplifier) : "-");

  kontrol("poz animasyonu oynatildi",
          z._komutlar.some((k) => /playanimation/.test(k)),
          z._komutlar[0] || "komut yok");

  // Referansin aksine SURELI: her etki kisa, tazeleniyor
  const uzun = yav.filter((e) => e.sure > ayar.DONDUR_SURE);
  kontrol("tek tek etkiler kisa (kalici degil)", uzun.length === 0,
          "en uzun " + Math.max(...yav.map((e) => e.sure)) + " tick");
}
{
  /* Sure dolunca gercekten biriyor mu ve poz geri aliniyor mu */
  const { D, o } = kur("kv8");
  const z = mob("z8", 10.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  yetenekDegistir(o);
  zipla(o, ayar.DONDUR_SURE + 60);

  const son = z._efektler.length;
  sus(); tickIlerlet(100); ac();
  kontrol("sure dolunca yavaslik durdu", z._efektler.length === son,
          son + " -> " + z._efektler.length);
  kontrol("poz geri alindi",
          z._komutlar.some((k) => /a 0/.test(k)),
          z._komutlar.join(" | ") || "komut yok");
}
{
  /* Hedef ortada olurse cokmemeli */
  const { D, o } = kur("kv9");
  const z = mob("z9", 10.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  yetenekDegistir(o);
  o.isJumping = true; sus(); tickIlerlet(8); ac(); o.isJumping = false;
  sus(); tickIlerlet(30); ac();
  z.isValid = false;
  sus(); tickIlerlet(200); ac();
  kontrol("hedef olunce is temiz kapandi", true, "cokmeden bitti");
}

console.log("");
console.log("=== 7. KUBBE HALA CALISIYOR (ortak altyapi) ===");
{
  /* kubbe.js _gecici_yapi.js'e tasindi; davranisi bozulmamali. */
  const kayit = await import("./pack/yetenekler/kayit.js");
  for (const y of ["hapis", "dondur", "kubbe"]) {
    kontrol(y + " kayitli", kayit.yetenekAl(y) !== undefined);
  }
  const liste = kayit.esyaninYetenekleri("pa:kol_kevin");
  kontrol("Kevin Kolu 2 yetenege bagli", liste && liste.length === 2,
          liste ? liste.map((t) => t.kimlik).join(", ") : "bagli degil");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum Kevin1545 testleri gecti");
process.exit(hata ? 1 : 0);

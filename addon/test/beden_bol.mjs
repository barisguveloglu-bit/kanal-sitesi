/* BEDENI BOL -- v7.26'da toolbox komut listesinden alinan
   "beden bolme" numarasi.

   Kaynak iki satir:
     execute positioned ^^^10 run playanimation @e[r=10,c=1]
             animation.villager.get_in_bed animation 10000000
     execute positioned ^^^15 run kill @e[r=10,c=1]

   ---- BU DOSYA NEYI TUTUYOR ----
   Yetenek GERCEKTEN CALISTIRILIYOR, tick tick. Bu depoda uc
   surum ust uste "takim yesil" diye gecmis, sonra yeni kodun
   hic yurutulmedigi anlasilmisti. Burada is nesnesi
   olusturuluyor, calis() dongusu donuyor, bitir() cagriliyor.

   Sinanan alti sey, hepsi kaynaktan AYRILDIGIMIZ yerler:
     1. Poz veriliyor mu (numaranin kendisi)
     2. Poz GERI ALINIYOR mu -- kaynakta geri alan hicbir sey
        yok; vurdugun kisi bolunmus kaliyor
     3. bitir() erken cagrilirsa da geri aliniyor mu
     4. `kill` yerine HASAR mi -- ve zirh/direnc calissin diye
        applyDamage'den geciyor mu
     5. KORUNANLAR vurulmuyor mu (armor stand, evcil hayvan) --
        kaynaktaki @e hepsini siliyordu
     6. DUVAR ARKASI vurulmuyor mu -- kaynaktaki positioned
        ^^^15 bloklari hic tanimiyor                          */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, BAS);
  o.id = id; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  return { D, o };
}

function mob(id, x, y, z, tip = "minecraft:zombie") {
  return {
    id, typeId: tip, isValid: true,
    location: { x, y, z },
    _hasar: [], _komutlar: [],
    addEffect() {}, removeEffect() {},
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    applyDamage(m) { this._hasar.push(m); return true; },
    applyImpulse: () => true, applyKnockback: () => true
  };
}

/* Yetenegi GERCEKTEN calistirir. tickSayisi kadar calis()
   donduruluyor; bitirsinMi false ise bitir() cagrilmiyor
   (yarida kesme sinamasi icin).                              */
function calistir(o, tickSayisi = 1000, bitirsin = true) {
  const tanim = kayit.yetenekAl("beden_bol");
  sus();
  const is = tanim.olustur(o);
  let bittiTick = -1;
  if (is) {
    /* SAAT GERCEKTEN ILERLETILIYOR. calis() system.currentTick
       okuyor; tickIlerlet cagrilmazsa saat donmuyor ve is
       sonsuza kadar surer gibi gorunur -- ilk yazilista tam
       bu oldu, "olcum kusurluydu" hatasinin bir ornegi daha. */
    for (let i = 0; i < tickSayisi; i++) {
      tickIlerlet(1);
      if (is.calis()) { bittiTick = i; break; }
    }
    if (bitirsin) is.bitir();
  }
  ac();
  return { is, bittiTick };
}

const pozAldiMi = (v) =>
  v._komutlar.some((k) => k.indexOf(ayar.BEDEN_ANIM) !== -1);
const pozDuzeldiMi = (v) =>
  v._komutlar.some((k) => k.indexOf(ayar.BEDEN_ANIM_BITIS) !== -1);

console.log("=== 0. YETENEK KAYITLI MI ===");
{
  const tanim = kayit.yetenekAl("beden_bol");
  kontrol("yetenek kayitli", !!tanim);
  kontrol("esyasiz jest sirasinda", !!tanim && tanim.esyasiz === true);
  kontrol("yamultma ile ayni sirada degil",
          !!tanim && tanim.sira !== kayit.yetenekAl("yamult").sira,
          "beden_bol=" + (tanim && tanim.sira) +
          " yamult=" + kayit.yetenekAl("yamult").sira);
}

console.log("");
console.log("=== 1. POZ VERILIYOR + HASAR (kill DEGIL) ===");
{
  const { D, o } = kur("b1");
  const z = mob("z1", 6.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  calistir(o);

  kontrol("hedefe poz verildi", pozAldiMi(z), z._komutlar.join(" | ") || "komut yok");
  kontrol("koylu animasyonu kullanildi",
          ayar.BEDEN_ANIM.indexOf("animation.villager.get_in_bed") === 0,
          ayar.BEDEN_ANIM);
  kontrol("HASAR uygulandi", z._hasar.length === 1, "hasar: " + z._hasar.join(","));
  kontrol("hasar applyDamage'den geciyor (zirh/direnc calissin)",
          z._hasar[0] === ayar.BEDEN_HASAR, String(z._hasar[0]));
  /* kill YOK: hicbir yerde kill komutu ya da remove() cagrisi
     olmamali -- hedef olmediyse yasamaya devam etmeli.      */
  kontrol("kill komutu yok",
          !z._komutlar.some((k) => k.indexOf("kill") !== -1));
}

console.log("");
console.log("=== 2. POZ GERI ALINIYOR (kaynakta geri alan YOK) ===");
{
  const { D, o } = kur("b2");
  const z = mob("z2", 6.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  const { bittiTick } = calistir(o);

  kontrol("is kendiliginden bitti", bittiTick >= 0, "tick " + bittiTick);
  kontrol("is BEDEN_SURE kadar surdu",
          bittiTick >= ayar.BEDEN_SURE - 2 && bittiTick <= ayar.BEDEN_SURE + 2,
          bittiTick + " vs " + ayar.BEDEN_SURE);
  kontrol("poz geri alindi", pozDuzeldiMi(z),
          z._komutlar.join(" | ") || "komut yok");
}

console.log("");
console.log("=== 3. YARIDA KESILSE DE GERI ALINIYOR ===");
{
  const { D, o } = kur("b3");
  const z = mob("z3", 6.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  const tanim = kayit.yetenekAl("beden_bol");
  sus();
  const is = tanim.olustur(o);
  tickIlerlet(1);
  is.calis();          // tek tick, sure dolmadi
  is.bitir();          // is yarida kesildi
  ac();
  kontrol("poz yine de geri alindi", pozDuzeldiMi(z),
          z._komutlar.join(" | ") || "komut yok");
}

console.log("");
console.log("=== 4. KORUNANLAR VURULMUYOR (kaynakta @e hepsini siliyordu) ===");
{
  const { D, o } = kur("b4");
  const stand = mob("s1", 5.5, 90, 0.5, "minecraft:armor_stand");
  const kurt  = mob("k1", 6.0, 90, 0.5, "minecraft:wolf");
  const koylu = mob("v1", 6.2, 90, 0.5, "minecraft:villager_v2");
  const zombi = mob("z4", 6.5, 90, 0.5);
  D.boyut._varliklar = [o, stand, kurt, koylu, zombi];
  calistir(o);

  kontrol("armor stand vurulmadi", stand._hasar.length === 0);
  kontrol("evcil kurt vurulmadi", kurt._hasar.length === 0);
  kontrol("koylu vurulmadi", koylu._hasar.length === 0);
  kontrol("zombi vuruldu", zombi._hasar.length === 1);
  /* Korunanlara POZ da verilmemeli -- hasarsiz ama bolunmus
     bir armor stand da istemedigimiz sey.                   */
  kontrol("korunanlara poz da verilmedi",
          !pozAldiMi(stand) && !pozAldiMi(kurt) && !pozAldiMi(koylu));
}

console.log("");
console.log("=== 5. DUVAR ARKASI VURULMUYOR ===");
{
  const { D, o } = kur("b5");
  const yakin = mob("y1", 3.5, 90, 0.5);    // duvarin onunde
  const uzak  = mob("u1", 12.5, 90, 0.5);   // duvarin arkasinda
  D.boyut._varliklar = [o, yakin, uzak];
  /* Bakis isini 4 blok ilerde bir bloga carpiyor. */
  o.getBlockFromViewDirection = () => ({
    block: { location: { x: 4, y: 90, z: 0 } }
  });
  calistir(o);

  kontrol("duvarin onundeki vuruldu", yakin._hasar.length === 1);
  kontrol("duvarin arkasindaki vurulmadi", uzak._hasar.length === 0,
          "hasar: " + uzak._hasar.join(","));
  kontrol("duvar denetimi ayardan acilabiliyor",
          ayar.BEDEN_DUVAR === true);
}

console.log("");
console.log("=== 6. HEDEF YOKSA IS ACILMIYOR ===");
{
  const { D, o } = kur("b6");
  D.boyut._varliklar = [o];
  const { is } = calistir(o);
  kontrol("bos alanda is nesnesi uretilmedi", is === undefined);
}

console.log("");
console.log("=== 7. KAPALIYKEN HIC CALISMIYOR ===");
{
  kontrol("BEDEN_ACIK ayari var", typeof ayar.BEDEN_ACIK === "boolean");
  /* Ayar okunuyor mu: kodda gercekten denetleniyor olmali. */
  const { readFileSync } = await import("node:fs");
  const kod = readFileSync(
    new URL("./pack/yetenekler/beden_bol.js", import.meta.url), "utf8");
  kontrol("BEDEN_ACIK kodda denetleniyor", /if \(!BEDEN_ACIK\) return/.test(kod));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> bedeni bol yerinde");
process.exit(hata ? 1 : 0);

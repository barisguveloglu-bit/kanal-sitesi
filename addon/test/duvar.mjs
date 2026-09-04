/* Toprak duvar + parcacik + ekran sarsintisi.

   Referans "fill ^1^5^6 ^-2^^6 dirt" ile tek tick'te kutuyu
   dolduruyor ve orada ne varsa yok ediyordu. Bizimki butceye
   uyuyor ve sadece havaya koyuyor -- ikisi de sinaniyor.        */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, scriptEventTetikle, esyaKaydet, _durum } from "@minecraft/server";

esyaKaydet("pa:kol_toprak", "pa:kol_meteor", "pa:kol_buz", "pa:kol_tnt");

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

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(bakis, id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, bakis, BAS);
  o.id = id;
  o.typeId = "minecraft:player";
  _durum.oyuncular = [];
  return { D, o };
}

/* Duvar yetenegini dogrudan cagirmak icin: jest yerine kayit
   defterinden tetiklemek daha kisa. scriptevent kol uzerinden
   gittigi icin Toprak Kol'daki secimi degistirmek gerekirdi;
   onun yerine itemUse benzeri bir yol kullaniliyor.            */
import { yetenekAl } from "./pack/yetenekler/kayit.js";
import { butceSifirla } from "./pack/butce.js";

function calistir(kimlik, o, D, tick = 300) {
  const tanim = yetenekAl(kimlik);
  if (!tanim) { kontrol("yetenek kayitli: " + kimlik, false); return; }
  sus();
  const is = tanim.olustur(o);
  if (is) {
    // Merkezi dongu yerine elle surelim: butce her tick sifirlaniyor
    for (let t = 0; t < tick; t++) {
      butceSifirla();
      if (is.calis()) { if (is.bitir) is.bitir(); break; }
      tickIlerlet(1);
    }
  }
  ac();
}

console.log("=== 1. TOPRAK DUVAR ===");
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, "dv1");
  calistir("toprak_duvar", o, D);

  const duvar = D.sayac.yazilan.filter((y) => y.tip === "minecraft:dirt");
  kontrol("duvar oruldu", duvar.length > 0, duvar.length + " blok");

  const xler = new Set(duvar.map((b) => b.x));
  const zler = new Set(duvar.map((b) => b.z));
  const yler = new Set(duvar.map((b) => b.y));
  kontrol("duvar bakis yonune DIK (x sabit, z yayiliyor)",
          xler.size <= 2 && zler.size >= 5,
          "x cesidi " + xler.size + ", z cesidi " + zler.size);
  kontrol("yukari dogru " + yler.size + " kat", yler.size >= 3, [...yler].join(","));
  kontrol("oyuncunun onunde (x > oyuncu)", Math.min(...xler) > BAS.x,
          "en yakin x=" + Math.min(...xler));
}
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, "dv2");
  D.bloklar.hepsiDolu = true;
  calistir("toprak_duvar", o, D);
  const duvar = D.sayac.yazilan.filter((y) => y.tip === "minecraft:dirt");
  kontrol("dolu yere duvar KONMADI (fill gibi yok etmiyor)",
          duvar.length === 0, duvar.length + " blok");
  kontrol("kac yerin dolu oldugu raporlandi",
          /doluydu/.test((o._mesajlar || []).join(" ")), (o._mesajlar || []).join(" | "));
}
{
  const { D, o } = kur({ x: 0, y: 1, z: 0 }, "dv3");   // tam yukari
  calistir("toprak_duvar", o, D);
  kontrol("tam yukari bakarken duvar orulmuyor (yon belirsiz)",
          D.sayac.setType === 0 && /ileri bakman/.test((o._mesajlar || []).join(" ")),
          (o._mesajlar || []).join(" | "));
}
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, "dv4");
  calistir("toprak_duvar", o, D);
  const enFazla = Math.max(0, ...Object.values(D.sayac.tickBlok || {}));
  kontrol("blok butcesi asilmadi", enFazla <= TAVAN, enFazla + " / " + TAVAN);
}

console.log("");
console.log("=== 2. PARCACIK ===");
{
  const { D, o } = kur({ x: 1, y: -0.05, z: 0 }, "pc1");
  /* v4.33: can_verme kaldirildi. Ayni kalp parcacigini artik
     kalp_ekle cikariyor; sinanan sey (parcacik yolu calisiyor mu)
     degismedi.                                                 */
  calistir("kalp_ekle", o, D);
  const p = D.sayac.parcacik || [];
  kontrol("kalp eklemede kalp parcacigi cikti",
          p.some((x) => x.tip.indexOf("heart") !== -1),
          p.map((x) => x.tip).join(", ") || "yok");
}
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, "pc2");
  calistir("toprak_duvar", o, D);
  const p = D.sayac.parcacik || [];
  kontrol("duvarda parcacik cikti", p.length > 0, p.map((x) => x.tip).join(", ") || "yok");
}

console.log("");
console.log("=== 3. EKRAN SARSINTISI ===");
{
  const { D, o } = kur({ x: 1, y: -0.3, z: 0 }, "ss1");
  calistir("meteor", o, D, 900);
  const k = (o._komutlar || []).filter((x) => x.indexOf("camerashake") !== -1);
  kontrol("meteor patlamasinda ekran sarsildi", k.length > 0, k.length + " sarsinti");
  kontrol("siddet makul (referanstaki 4 degil)",
          k.every((x) => parseFloat(x.split(" ")[3]) <= 1), k[0] || "");
}

console.log("");
console.log("=== 4. GORSELLER KAPATILABILIYOR ===");
{
  const ayar = await import("./pack/ayarlar.js");
  kontrol("PARCACIK_ACIK ayari var", typeof ayar.PARCACIK_ACIK === "boolean");
  kontrol("SARSINTI_ACIK ayari var", typeof ayar.SARSINTI_ACIK === "boolean");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum duvar/gorsel testleri gecti");
process.exit(hata ? 1 : 0);

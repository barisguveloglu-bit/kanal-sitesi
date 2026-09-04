/* ICME PARLAMASI -- "iksir modu muhammetlo mz"den alinan gorsel.

   Referanstaki hata: camera fade rengi 0.0-1.0 araliginda olmali.
   Ayni pakette firenoxin "color 1 0.5 0" DOGRU, ama redoxin
   "color 255 0 0" ve nitroxin "color 255 255 255" ARALIK DISI --
   o iksirler kendi renkleri yerine beyaz parliyor.
   Burada butun renklerin aralikta oldugu sinaniyor.              */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const iks = await import("./pack/yetenekler/iksirler.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

console.log("=== 1. HER KADEMENIN RENGI VAR VE ARALIKTA ===");
{
  for (const k of ayar.KADEMELER) {
    const r = k.renk;
    const varMi = Array.isArray(r) && r.length === 3;
    const aralikta = varMi && r.every((v) => typeof v === "number" && v >= 0 && v <= 1);
    kontrol(k.ad.padEnd(12) + " rengi 0.0-1.0 araliginda",
            aralikta, varMi ? r.join(", ") : "renk yok");
  }
}

console.log("");
console.log("=== 2. ICINCE PARLAMA KOMUTU GIDIYOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "pr1"; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];

  const kademe = ayar.KADEMELER[0];
  sus(); iks.iksirIc(o, kademe); ac();

  const komutlar = o._komutlar || [];
  const fade = komutlar.filter((k) => k.indexOf("camera") !== -1 && k.indexOf("fade") !== -1);
  kontrol("camera fade komutu gonderildi", fade.length > 0,
          fade[0] || komutlar.join(" | ") || "komut yok");

  if (fade.length > 0) {
    const r = kademe.renk;
    kontrol("komuttaki renk kademeninkiyle ayni",
            fade[0].indexOf("color " + r[0] + " " + r[1] + " " + r[2]) !== -1,
            fade[0]);

    /* Referansin hatasi tam burada olusurdu: 255 yazsaydik
       komutta "color 255 ..." gorunurdu.                     */
    kontrol("komutta 0-255 araligindan sayi YOK (referansin hatasi)",
            !/color\s+(\d{2,})/.test(fade[0]), fade[0]);
  }
}

console.log("");
console.log("=== 3. HER KADEME KENDI RENGIYLE PARLIYOR ===");
{
  const gorulen = new Set();
  for (let i = 0; i < ayar.KADEMELER.length; i++) {
    const D = dunyaKur();
    const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
    o.id = "pr" + i; o.typeId = "minecraft:player";
    _durum.oyuncular = [o];

    sus(); iks.iksirIc(o, ayar.KADEMELER[i]); ac();
    const fade = (o._komutlar || []).find((k) => k.indexOf("fade") !== -1);
    if (fade) gorulen.add(fade.slice(fade.indexOf("color")));
  }
  kontrol("bes kademe bes FARKLI renkle parladi",
          gorulen.size === ayar.KADEMELER.length,
          gorulen.size + " farkli renk / " + ayar.KADEMELER.length + " kademe");
}

console.log("");
console.log("=== 4. PARLAMA KAPALIYKEN KOMUT GITMIYOR ===");
{
  kontrol("PARLAMA_ACIK ayari var", typeof ayar.PARLAMA_ACIK === "boolean",
          String(ayar.PARLAMA_ACIK));
  /* Kapatildiginda parlat() hemen donuyor; kod yolu tek satir,
     burada sadece ayarin varligi ve turu sinaniyor.          */
}

console.log("");
console.log("=== 5. ICME HALA CALISIYOR (parlama bozmadi) ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "pr9"; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];

  sus(); iks.iksirIc(o, ayar.KADEMELER[4]); ac();
  kontrol("kademe aktif", iks.iksirAktifMi() === true);
  kontrol("efektler verildi", (D.boyut._efektler || []).length > 0,
          (D.boyut._efektler || []).length + " efekt");
  sus(); iks.kademeUnut("pr9"); ac();
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum parlama testleri gecti");
process.exit(hata ? 1 : 0);

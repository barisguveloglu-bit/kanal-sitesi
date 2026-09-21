import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, itemUseTetikle, _durum } from "@minecraft/server";

const w = console.warn; console.warn = () => {};
await import("./pack/main.js");
console.warn = w;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };

const ayar   = await import("./pack/ayarlar.js");
const enerji = await import("./pack/enerji.js");
const fuzyon = await import("./pack/yetenekler/fuzyon.js");
const kayit  = await import("./pack/yetenekler/kayit.js");

/* ================================================================
   ENERJI ve FUZYON -- OLCUM                               v7.97.0

   Iki dis moddan alinan iki sistem:
     ENERJI  Avatar Addon 2.0.0  (REFERANS_AVATAR.md)
     FUZYON  Dragon Block C 1.1  (REFERANS_DBC.md)

   Ikisinin de sayisi kaynaktan OLCULDU. Bu dosya kodun o
   olcumden ayrismadigini olcuyor -- iddia etmiyor.
   ================================================================ */
let hata = 0;
function kontrol(ad, kosul, ek) {
  if (kosul) console.log("  ✓ " + ad + (ek ? "  ::  " + ek : ""));
  else { console.log("  ✗ " + ad + (ek ? "  ::  " + ek : "")); hata++; }
}

console.log("=== 1. KAYNAGIN SAYILARI ===");
kontrol("enerji tavani 100 (chi tavani)", ayar.ENERJI_TAVAN === 100);
kontrol("dogunca dolu", ayar.ENERJI_BASLIK === 100);
kontrol("sigmoid katsayilari kaynaktan",
        ayar.ENERJI_TABAN === 0.3 && ayar.ENERJI_ARALIK === 1.7 &&
        ayar.ENERJI_EGIM === 0.05 && ayar.ENERJI_ORTA === 39.8);

console.log("");
console.log("=== 2. EGRI TERS: BOSKEN YAVAS, DOLUYKEN HIZLI ===");
{
  /* Kaynagin en ozgun karari bu. Sezgiye ters oldugu icin
     "duzeltilmesin" diye kilitleniyor: biri egriyi duzduse
     cevirirse test duser.                                  */
  const bos  = enerji.yenilenmeHizi(0);
  const orta = enerji.yenilenmeHizi(ayar.ENERJI_ORTA);
  const dolu = enerji.yenilenmeHizi(100);
  kontrol("bosken ~0.5/tick", Math.abs(bos - 0.504) < 0.01, bos.toFixed(3));
  kontrol("donum noktasinda tam orta (0.3 + 1.7/2 = 1.15)",
          Math.abs(orta - 1.15) < 0.001, orta.toFixed(3));
  kontrol("doluyken ~1.92/tick", Math.abs(dolu - 1.92) < 0.01, dolu.toFixed(3));
  kontrol("EGRI ARTAN: dolu > orta > bos", dolu > orta && orta > bos);
  kontrol("tavan asilmiyor: hiz hic 2.0'i gecmiyor",
          enerji.yenilenmeHizi(1e9) <= ayar.ENERJI_TABAN + ayar.ENERJI_ARALIK + 1e-9);
}

console.log("");
console.log("=== 3. HARCAMA ve KAPI ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "harca"; _durum.oyuncular = [];
  enerji.enerjiUnut(o.id);

  kontrol("baslangic dolu", enerji.enerjiOku(o.id) === 100);
  sus();
  const ilk = enerji.enerjiIste(o, 40, "sinama");
  ac();
  kontrol("yetecek kadar varsa geciyor", ilk === true);
  kontrol("harcanan dusuluyor", enerji.enerjiOku(o.id) === 60,
          enerji.enerjiOku(o.id));

  sus();
  const ikinci = enerji.enerjiIste(o, 40, "sinama");
  const ucuncu = enerji.enerjiIste(o, 40, "sinama");
  ac();
  kontrol("ikinci de geciyor (60 -> 20)", ikinci === true);
  kontrol("yetmeyince REDDEDILIYOR", ucuncu === false);
  kontrol("reddedilince enerji DUSMUYOR", enerji.enerjiOku(o.id) === 20,
          enerji.enerjiOku(o.id));

  /* Bedelsiz yetenek her zaman geciyor -- 150+ eski yetenek
     boyle ve hicbiri etkilenmemeli.                        */
  sus();
  const bedelsiz = enerji.enerjiIste(o, undefined, "eski");
  ac();
  kontrol("bedeli olmayan yetenek etkilenmiyor", bedelsiz === true);
  kontrol("bedelsiz cagri enerjiyi dusurmuyor", enerji.enerjiOku(o.id) === 20);
}

console.log("");
console.log("=== 4. YENILENME: MESGULKEN DOLMUYOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "yenile"; _durum.oyuncular = [];
  enerji.enerjiUnut(o.id);
  sus(); enerji.enerjiIste(o, 90, "bosalt"); ac();
  const dip = enerji.enerjiOku(o.id);
  kontrol("bosaltildi", dip === 10, dip);

  /* Mesgul: hic dolmamali. */
  for (let i = 0; i < 40; i++) { tickIlerlet(1); enerji.enerjiTara([o], () => true); }
  kontrol("mesgulken HIC dolmuyor", enerji.enerjiOku(o.id) === dip,
          enerji.enerjiOku(o.id).toFixed(1));

  /* Bosta: dolmali. */
  for (let i = 0; i < 40; i++) { tickIlerlet(1); enerji.enerjiTara([o], () => false); }
  kontrol("bostayken doluyor", enerji.enerjiOku(o.id) > dip,
          dip + " -> " + enerji.enerjiOku(o.id).toFixed(1));
  kontrol("tavani asmiyor", enerji.enerjiOku(o.id) <= 100);
}

console.log("");
console.log("=== 5. MERKEZI KAPI main.js'te BAGLI ===");
{
  /* Kapi tek yerde: yeteneklerin ortak cikis noktasi.
     Her yetenege tek tek yazmak, unutulan bir yetenek
     demekti.                                              */
  const { readFileSync } = await import("node:fs");
  const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const m = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/main.js", "utf8");
  kontrol("olustur() oncesi enerji kapisi var",
          /enerjiIste\(oyuncu, tanim\.enerji[^)]*\)\) continue;[\s\S]{0,80}tanim\.olustur\(oyuncu\)/
            .test(m));
  kontrol("tick dongusunde yenilenme var",
          /enerjiTara\(oyuncular,[\s\S]{0,60}oyuncuIsSayisi/.test(m));
}

console.log("");
console.log("=== 6. FUZYON: KAYNAGIN UC ADIMI ===");
{
  kontrol("fuzyon yetenegi kayitli", !!kayit.yetenekAl("fuzyon"));
  const l = (await import("./pack/yetenekler/kollar.js")).KOL_ESYALARI
    .find((r) => r[0] === "pa:kol_toprak");
  kontrol("Toprak Kol'a bagli", l.includes("fuzyon"));

  const D = dunyaKur();
  const a = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  const b = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 2.5, y: 90.6, z: 0.5 });
  a.id = "fa"; b.id = "fb";
  a.typeId = "minecraft:player"; b.typeId = "minecraft:player";
  D.boyut._varliklar = [a, b];
  D.boyut._oyuncular = [a, b];
  _durum.oyuncular = [a, b];
  fuzyon.fuzyonUnut(); enerji.enerjiUnut();

  const t = kayit.yetenekAl("fuzyon");

  /* 1. DAVET -- tek basina fuzyon baslatmiyor */
  sus(); t.olustur(a); ac();
  kontrol("davet tek basina fuzyon BASLATMIYOR", !fuzyon.fuzyondaMi(a.id));
  kontrol("davet BEDAVA (enerji dusmedi)", enerji.enerjiOku(a.id) === 100,
          enerji.enerjiOku(a.id));

  /* 2. KABUL */
  sus(); const is = t.olustur(b); ac();
  kontrol("ikinci oyuncu basinca fuzyon BASLIYOR",
          fuzyon.fuzyondaMi(a.id) && fuzyon.fuzyondaMi(b.id));
  kontrol("bedel IKISINDEN de alindi",
          enerji.enerjiOku(a.id) === 100 - ayar.FUZYON_BEDEL &&
          enerji.enerjiOku(b.id) === 100 - ayar.FUZYON_BEDEL,
          enerji.enerjiOku(a.id) + " / " + enerji.enerjiOku(b.id));
  kontrol("tutma isi acildi", !!is);

  /* 3. TUTMA: ayrilinca KOPUYOR */
  if (is) {
    b.location = { x: 0.5 + ayar.FUZYON_KOPMA + 5, y: 90.6, z: 0.5 };
    sus(); const bitti = is.calis(); ac();
    kontrol("KOPMA mesafesi asilinca fuzyon bozuluyor", bitti === true);
    kontrol("ikisi de fuzyondan cikti",
            !fuzyon.fuzyondaMi(a.id) && !fuzyon.fuzyondaMi(b.id));
  } else { hata += 2; }
}

console.log("");
console.log("=== 7. FUZYON ULTIMATE'TEN ZAYIF ===");
{
  /* BILINCLI KARAR. Ultimate tek kisinin EN YUKSEK hali;
     iki kisinin birlesmesi ondan guclu olsaydi Ultimate
     anlamsizlasirdi. Bu satir karari kilitliyor.          */
  const ult = await import("./pack/yetenekler/ultimate_form.js");
  const u = new Map(ult.birlesikEfektler());
  const f = new Map(ayar.FUZYON_EFEKTLER);
  const ustun = [];
  for (const [ad, sev] of f) {
    const us = u.get(ad);
    if (us !== undefined && sev > us) ustun.push(ad + " " + sev + ">" + us);
  }
  kontrol("fuzyonun hicbir efekti Ultimate'i GECMIYOR",
          ustun.length === 0, ustun.join(", "));
  kontrol("fuzyon yine de guclu: en az alti efekt",
          ayar.FUZYON_EFEKTLER.length >= 6, ayar.FUZYON_EFEKTLER.length + " efekt");
}

console.log("");
console.log(hata ? "HATA : " + hata : "temiz");
process.exit(hata ? 1 : 0);

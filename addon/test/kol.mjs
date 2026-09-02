import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, itemUseTetikle, _durum } from "@minecraft/server";
const w = console.warn; console.warn = () => {};
await import("./pack/main.js");
console.warn = w;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };

/* ---- KOL LISTESI BAYATLAMISTI  (v7.9.3 genel taramasi) ----
   Burada uc kol vardi: pa:kol_halka, pa:kol_simsek, pa:kol_top.
   UCU DE SURUMLER ONCE SILINDI -- "kol israfini onle" kurali
   geregi yetenekleri Toprak Kol'un altinda toplandi. Test
   onlari sinamaya devam ediyordu, "hicbir sey ✗" yaziyordu ve
   dosya SORUN VAR diye bitiyordu.

   KIMSE GORMEDI, cunku dosyanin cikis kodu yoktu: kos.sh
   cikis koduna bakiyor, ekrana ne yazildigina degil. Yani bu
   test bilinmeyen bir suredir DUSUYOR ama takim yesil
   yaniyordu. Genel tarama tam bunu aramak icin yapildi.

   Liste artik kollar.js'ten OKUNUYOR, elle yazilmiyor: bir kol
   eklenip cikarilinca burasi kendiliginden dogru kaliyor ve
   ayni bayatlama bir daha yasanmiyor.                        */
const kollarModulu = await import("./pack/yetenekler/kollar.js");
/* Hedef isteyen ya da ozel kurulum isteyen kollar burada
   elenmiyor -- asagida her birine uygun kurban/kurulum
   veriliyor. Kanli Kol ve Anna Kolu hedef istiyor.          */
const KOLLAR = kollarModulu.KOL_ESYALARI.map((satir) => [satir[0], satir[0].slice(3), satir[1]]);

console.log("=== KOL ESYASINI KULLANMA (itemUse) ===");
let hata = false;
for (const [esya, ad, beklenen] of KOLLAR) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0.8, y: -0.3, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "kol-" + esya;
  _durum.oyuncular = [];

  /* Buz Kol'un ilk yetenegi Buz Adam ve HEDEF ISTIYOR -- onunde
     kimse yoksa hicbir sey yapmamasi dogru davranis. Bakis
     dogrultusuna bir kurban koyuyoruz.                          */
  /* Hedef isteyen kollar: onlerinde kimse yoksa hicbir sey
     yapmamalari DOGRU davranis. Kurban koymadan sinamak
     "kol calismiyor" demek olurdu -- anna.mjs'te tam bu hata
     yapilmisti.                                              */
  if (["pa:kol_buz", "pa:kol_kanli", "pa:kol_anna", "pa:kol_kevin",
       "pa:kol_dave", "pa:kol_gunes"].includes(esya)) {
    const u = Math.hypot(0.8, -0.3, 0);
    /* Kurbanin applyImpulse'u YOKTU ve bu bir OLCUM BOSLUGUYDU:
       Kasirga'nin (Dave Kol'un ilk yetenegi) tek gorunur etkisi
       itme. Cagri yoksa yetenegin kendi try/catch'i yutuyor,
       hicbir sey sayilmiyor ve test "Dave Kol calismiyor"
       diyordu. Kod dogruydu, olcum eksikti.                  */
    D.boyut._varliklar = [{
      id: "kurban", typeId: "minecraft:zombie", isValid: true,
      location: { x: 0.5 + (0.8 / u) * 5, y: 90.6 - 1.62 + (-0.3 / u) * 5, z: 0.5 },
      _itildi: null,
      addEffect: () => {}, applyDamage: () => true,
      applyImpulse(i) { this._itildi = i; },
      applyKnockback: () => true
    }];
  }
  sus(); itemUseTetikle({ source: o, itemStack: { typeId: esya } }); tickIlerlet(400); ac();
  const sim = D.sayac.dogan.filter(d => d.tip === "minecraft:lightning_bolt").length;
  const tnt = D.sayac.dogan.filter(d => d.tip === "minecraft:tnt").length;
  const ef  = (D.boyut._efektler || []).length;
  let oldu = "hicbir sey";
  if (D.sayac.setType > 0) oldu = D.sayac.setType + " blok";
  else if (tnt > 0)          oldu = tnt + " TNT + " + D.sayac.patlama.length + " patlama";
  else if (D.sayac.patlama.length > 0) oldu = D.sayac.patlama.length + " patlama";
  else if (sim > 0)          oldu = sim + " yildirim";
  else if (ef > 0)           oldu = ef + " efekt";
  /* ITME de bir sonuctur. Kasirga sadece bunu yapiyor; listeye
     eklenmeseydi "hicbir sey" saymaya devam ederdik.        */
  else if ((D.boyut._varliklar || []).some((v) => v._itildi)) oldu = "itme";
  const gecti = oldu !== "hicbir sey";
  if (!gecti) hata = true;
  console.log(`  ${esya.padEnd(15)} (${ad.padEnd(16)}) -> ${oldu.padEnd(22)} ${gecti ? "✓" : "✗"}`);
}

console.log("");
console.log("=== KOL ELDEYKEN JEST (egil+zipla) ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0.8, y: -0.3, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  /* kol_top SILINDI; yerine hâlâ var olan Toprak Kol. */
  o.id = "kol-jest"; o.isSneaking = true; o._elde = "pa:kol_toprak";
  _durum.oyuncular = [o];
  // secim varsayilan (Yildirim Halkasi) ama ELDE toprak topu kolu var
  o.isJumping = true; sus(); tickIlerlet(8); ac(); o.isJumping = false;
  sus(); tickIlerlet(400); ac();
  const blok = D.sayac.setType;
  console.log("  secili yetenek: Yildirim Halkasi | eldeki kol: kol_toprak");
  console.log("  sonuc: " + (blok > 500 ? blok + " blok -> KOL kazandi ✓" : "yildirim -> kol yoksayildi ✗"));
  if (blok <= 500) hata = true;
}

console.log("");
console.log("=== KOL YOKKEN secili yetenek calismali ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0.8, y: -0.3, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "kol-yok"; o.isSneaking = true; o._elde = undefined;
  _durum.oyuncular = [o];
  o.isJumping = true; sus(); tickIlerlet(8); ac(); o.isJumping = false;
  sus(); tickIlerlet(400); ac();
  const sim = D.sayac.dogan.filter(d => d.tip === "minecraft:lightning_bolt").length;
  console.log("  sonuc: " + (sim === 20 ? sim + " yildirim (varsayilan secim) ✓" : "beklenmedik: " + sim + " ✗"));
  if (sim !== 20) hata = true;
}
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum kol testleri gecti");

/* GENEL TARAMA (v7.9.3) -- CIKIS KODU EKLENDI.
   Bu dosya hukmunu METIN olarak yaziyordu ve HER ZAMAN 0 ile
   cikiyordu. kos.sh cikis koduna bakiyor; yani bu test
   ">>> SORUN VAR" yazsa bile takim YESIL yanardi.
   Sessizce gecen bir test, olmayan bir testten daha kotudur --
   var oldugu icin kimse yerine yenisini yazmaz.               */
process.exit(hata ? 1 : 0);

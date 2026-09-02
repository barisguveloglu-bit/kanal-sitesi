/* SILAH SISTEMI -- v4.87

   Kullanici: "silahla alakali olan tum seyleri al, bedrock'a
   uyumlu yap."

   Referansta (Zabri Studios BoraLo Mod) 11 atesli silah var ve
   hepsinin iskeleti ayni: esya + mermi + bekleme + ses + carpma
   etkisi. Burada da tek motor, silahlar birer SATIR.

   Bu dosyanin kilitledigi seyler:
     1. MERMI gercekten tuketiliyor, mermisiz atis yok
     2. BEKLEME calisiyor (yoksa silahlar lazerden guclu olurdu)
     3. DUVARIN ARKASINDAKI hedef vurulmuyor
     4. Kendi BOTLARINI vurmuyor
     5. Delici olmayan silah ILK hedefte duruyor
     6. Bazuka patlama butcesine giriyor
     7. Sersemletici kilidi ACIYOR (suresiz etki yok)
*/

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import {
  tickIlerlet, varlikKaydet, esyaKaydet, _durum, itemUseTetikle
} from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

varlikKaydet("pa:bot", "pa:okazor");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
const mc = await import("@minecraft/server");
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const silah = await import("./pack/yetenekler/silahlar.js");

esyaKaydet(...[...ayar.SILAHLAR.values()].map((t) => t.esya),
           ...[...ayar.SILAHLAR.values()].filter((t) => t.mermi).map((t) => t.mermi));

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* Nisanci: +z yonune bakiyor, kafasi (0.5, 90.6, 0.5). */
const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id; o.typeId = "minecraft:player";
  o.getHeadLocation = () => ({ ...BAS });
  o._yuvalar = new Array(36).fill(undefined);
  const envanter = {
    container: {
      size: 36,
      getItem: (i) => o._yuvalar[i],
      setItem: (i, e) => { o._yuvalar[i] = e; }
    }
  };
  o.getComponent = (a) => (a === "minecraft:inventory") ? envanter : undefined;
  _durum.oyuncular = [o];
  silah.defteriUnut();
  return { D, o };
}

function mermiVer(o, kimlik, adet) {
  o._yuvalar[0] = { typeId: kimlik, amount: adet };
}

function hedefYap(id, boyut, z, tip = "minecraft:zombie") {
  return {
    id, typeId: tip, isValid: true, dimension: boyut,
    location: { x: 0.5, y: 90, z },
    _hasar: [], _efektler: [], _komutlar: [], _itildi: null,
    applyDamage(m, se) { this._hasar.push({ m, se }); return true; },
    addEffect(ad, s2, se) { this._efektler.push({ ad, sure: s2, se }); },
    removeEffect(ad) { this._efektler = this._efektler.filter((e) => e.ad !== ad); },
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    applyKnockback(x, z2, g, y2) { this._itildi = { x, z: z2, g, y: y2 }; return true; },
    applyImpulse(i) { this._itildi = i; return true; },
    teleport() { return true; }
  };
}

const S = (k) => ({ kimlik: k, ...ayar.SILAHLAR.get(k) });

console.log("=== 1. TABLO ve ESYALAR ===");
{
  kontrol("silah sistemi acik", ayar.SILAH_ACIK === true);
  kontrol("tabloda silah var", ayar.SILAHLAR.size >= 4,
          ayar.SILAHLAR.size + " silah");

  /* ---- URETEC ve AYAR AYNI SILAHLARI SOYLEMELI ----
     Ayrisirsa esya uretilir ama tablo tanimaz (ya da tersi):
     elinde duran silah tetige basinca hicbir sey yapmaz. */
  const uretec = readFileSync(
    KOK + "/kol_uret.py", "utf8");
  const blok = uretec.slice(uretec.indexOf("SILAHLAR = ["),
                            uretec.indexOf("]", uretec.indexOf("SILAHLAR = [")));
  for (const [kimlik, t] of ayar.SILAHLAR) {
    kontrol(kimlik + ": uretecte de var", blok.includes('"' + kimlik + '"'));
    const ad = t.esya.replace("pa:", "");
    kontrol(kimlik + ": esyasi diskte", existsSync(BP + "/items/" + ad + ".json"));
    kontrol(kimlik + ": dokusu diskte",
            existsSync(RP + "/textures/item/" + ad + ".png"));
    const atlas = oku(RP + "/textures/item_texture.json").texture_data;
    kontrol(kimlik + ": doku atlasa kayitli", atlas[ad] !== undefined);
    if (t.mermi) {
      const mad = t.mermi.replace("pa:", "");
      kontrol(kimlik + ": mermisi diskte",
              existsSync(BP + "/items/" + mad + ".json"));
      const m = oku(BP + "/items/" + mad + ".json")["minecraft:item"].components;
      /* Mermi YIGILMALI: tek tek tasinmaz. */
      kontrol(kimlik + ": mermisi yigilabilir",
              m["minecraft:max_stack_size"] > 1,
              String(m["minecraft:max_stack_size"]));
      /* Mermi SILAH DEGIL: eline alip vurulmaz. */
      kontrol(kimlik + ": mermisinde hasar YOK",
              m["minecraft:damage"] === undefined);
    }
  }
}

console.log("\n=== 2. MERMI TUKETILIYOR ===");
{
  const { D, o } = kur("s1");
  const t = S("revolver");
  mermiVer(o, t.mermi, 5);
  const hedef = hedefYap("h1", D.boyut, 6);
  D.boyut._varliklar = [hedef];

  sus(); const r = silah.silahAtes(o, t); ac();
  kontrol("atis yapildi", r.hata === undefined, r.hata || "ok");
  kontrol("hedef vuruldu", hedef._hasar.length === 1,
          hedef._hasar.length + " vurus");
  kontrol("hasar tablodaki sayi", hedef._hasar[0] &&
          hedef._hasar[0].m === t.hasar, String(hedef._hasar[0] && hedef._hasar[0].m));
  kontrol("BIR mermi harcandi", o._yuvalar[0].amount === 4,
          o._yuvalar[0].amount + " mermi kaldi");
}

console.log("\n=== 3. MERMISIZ ATIS YOK ===");
{
  const { D, o } = kur("s2");
  const t = S("revolver");
  o._yuvalar[0] = undefined;                    // cantada mermi yok
  const hedef = hedefYap("h2", D.boyut, 6);
  D.boyut._varliklar = [hedef];

  sus(); const r = silah.silahAtes(o, t); ac();
  kontrol("mermisiz atis REDDEDILDI", r.hata !== undefined, r.hata || "-");
  kontrol("hedefe hasar gitmedi", hedef._hasar.length === 0);
}

console.log("\n=== 4. BEKLEME ===");
{
  const { D, o } = kur("s3");
  const t = S("revolver");
  mermiVer(o, t.mermi, 10);
  const hedef = hedefYap("h3", D.boyut, 6);
  D.boyut._varliklar = [hedef];

  sus();
  silah.silahAtes(o, t);
  const ikinci = silah.silahAtes(o, t);          // hemen ardindan
  ac();
  kontrol("bekleme dolmadan ikinci atis YOK", ikinci.hata !== undefined,
          ikinci.hata || "-");
  kontrol("ikinci mermi harcanmadi", o._yuvalar[0].amount === 9,
          o._yuvalar[0].amount + " mermi");

  sus(); tickIlerlet(t.bekleme + 2);
  const ucuncu = silah.silahAtes(o, t); ac();
  kontrol("bekleme dolunca atis yapildi", ucuncu.hata === undefined,
          ucuncu.hata || "ok");
}

console.log("\n=== 5. DUVARIN ARKASINI VURMUYOR ===");
{
  const { D, o } = kur("s4");
  const t = S("revolver");
  mermiVer(o, t.mermi, 5);
  /* Nisanci ile hedef arasina duvar. */
  for (let y = 89; y <= 92; y++) D.boyut.getBlock({ x: 0, y, z: 3 }).setType("minecraft:stone");
  const hedef = hedefYap("h4", D.boyut, 8);
  D.boyut._varliklar = [hedef];

  sus(); silah.silahAtes(o, t); ac();
  kontrol("duvarin ARKASINDAKI hedef vurulmadi", hedef._hasar.length === 0,
          hedef._hasar.length + " vurus");
}

console.log("\n=== 6. KENDI BOTUNU VURMUYOR ===");
{
  const { D, o } = kur("s5");
  const t = S("revolver");
  mermiVer(o, t.mermi, 5);
  const bot = hedefYap("b1", D.boyut, 5, ayar.BOT_KIMLIK);
  const dusman = hedefYap("h5", D.boyut, 7);
  D.boyut._varliklar = [bot, dusman];

  sus(); silah.silahAtes(o, t); ac();
  kontrol("bot vurulmadi", bot._hasar.length === 0, bot._hasar.length + " vurus");
  kontrol("arkasindaki dusman vuruldu", dusman._hasar.length === 1,
          dusman._hasar.length + " vurus");
}

console.log("\n=== 7. DELICI vs TEK HEDEF ===");
{
  /* Delici olmayan silah ILK hedefte duruyor: gercek bir
     kursun gibi. Delici olanlar sirayi delip geciyor.     */
  const { D, o } = kur("s6");
  const t = S("revolver");
  mermiVer(o, t.mermi, 5);
  const a = hedefYap("ha", D.boyut, 5);
  const b = hedefYap("hb", D.boyut, 7);
  D.boyut._varliklar = [a, b];
  sus(); silah.silahAtes(o, t); ac();
  kontrol("delici OLMAYAN sadece ilki vurdu",
          a._hasar.length === 1 && b._hasar.length === 0,
          a._hasar.length + " / " + b._hasar.length);
}
{
  const { D, o } = kur("s7");
  const t = S("altin_revolver");
  mermiVer(o, t.mermi, 5);
  kontrol("altin revolver DELICI", t.delici === true);
  const a = hedefYap("hc", D.boyut, 5);
  const b = hedefYap("hd", D.boyut, 7);
  D.boyut._varliklar = [a, b];
  sus(); silah.silahAtes(o, t); ac();
  kontrol("delici IKISINI de vurdu",
          a._hasar.length === 1 && b._hasar.length === 1,
          a._hasar.length + " / " + b._hasar.length);
}

console.log("\n=== 8. BAZUKA PATLIYOR ===");
{
  const { D, o } = kur("s8");
  const t = S("bazuka");
  kontrol("bazukanin patlamasi var", t.patlama > 0, String(t.patlama));
  mermiVer(o, t.mermi, 3);
  const hedef = hedefYap("h8", D.boyut, 8);
  D.boyut._varliklar = [hedef];

  sus(); const r = silah.silahAtes(o, t); ac();
  kontrol("atis yapildi", r.hata === undefined, r.hata || "ok");
  kontrol("patlama olustu", D.sayac.patlama.length > 0,
          D.sayac.patlama.length + " patlama");
  kontrol("patlama gucu tablodaki sayi",
          D.sayac.patlama[0] && D.sayac.patlama[0].guc === t.patlama,
          JSON.stringify(D.sayac.patlama[0]));
  kontrol("hedef ayrica hasar aldi", hedef._hasar.length === 1);
}

console.log("\n=== 9. SERSEMLETICI: KILIT HEP CIFT ===");
{
  const { D, o } = kur("s9");
  const t = S("sersem_silahi");
  kontrol("sersemletici mermisiz", t.mermi === undefined);
  kontrol("sersemletici kilit suresi var", t.sersem > 0, t.sersem + " tick");

  const hedef = hedefYap("h9", D.boyut, 6, "minecraft:player");
  D.boyut._varliklar = [hedef];

  sus(); silah.silahAtes(o, t); ac();
  const adlar = hedef._efektler.map((e) => e.ad);
  kontrol("yavaslik ve gucsuzluk verildi",
          adlar.includes("slowness") && adlar.includes("weakness"),
          adlar.join(","));
  kontrol("girdi kilidi KAPANDI",
          hedef._komutlar.some((k) => k.includes("disabled")),
          hedef._komutlar.join(" | ").slice(0, 60));

  /* ---- ASIL KURAL: kilit MUTLAKA aciliyor ----
     Referans modlarin en can sikici huyu suresiz etkiydi. */
  sus(); tickIlerlet(t.sersem + 5); ac();
  kontrol("suresi dolunca kilit ACILDI",
          hedef._komutlar.some((k) => k.includes("enabled")),
          hedef._komutlar.join(" | ").slice(0, 80));
}

console.log("\n=== 10. YERCEKIMI SILAHI CEKIYOR ===");
{
  const { D, o } = kur("s10");
  const t = S("cekim_silahi");
  kontrol("hasari yok (tasima araci)", t.hasar === 0, String(t.hasar));
  const hedef = hedefYap("h10", D.boyut, 8);
  D.boyut._varliklar = [hedef];

  sus(); silah.silahAtes(o, t); ac();
  kontrol("hedefe hasar VERMEDI", hedef._hasar.length === 0);
  kontrol("hedef itildi/cekildi", hedef._itildi !== null,
          JSON.stringify(hedef._itildi));
}

console.log("\n=== 11. DENGE: LAZERDEN GUCLU DEGIL ===");
{
  /* Silahlar goz lazerinin yerini almamali. Lazer 500 hasar
     veriyor ve 30 saniye surekli; silahlar mermi ve bekleme
     ile sinirli. En sert silah bile lazerin onda birinden az
     vurmali, yoksa iksir sistemi anlamsizlasir.            */
  let enSert = 0;
  for (const [, t] of ayar.SILAHLAR) enSert = Math.max(enSert, t.hasar);
  kontrol("en sert silah lazerin cok altinda",
          enSert < ayar.LAZER_HASAR / 5,
          enSert + " < " + (ayar.LAZER_HASAR / 5));
  /* Her silahin beklemesi olmali: beklemesiz bir silah
     tabletteki en pahali sey olurdu.                      */
  const beklemesiz = [...ayar.SILAHLAR].filter(([, t]) => !(t.bekleme > 0));
  kontrol("her silahin beklemesi var", beklemesiz.length === 0,
          beklemesiz.map(([k]) => k).join(", ") || "hepsi tamam");
  /* Mermisiz silahlarin beklemesi UZUN olmali: bedava atis
     hizli da olursa denge kalmaz.                          */
  for (const [k, t] of ayar.SILAHLAR) {
    if (t.mermi) continue;
    kontrol(k + ": mermisiz ama beklemesi uzun", t.bekleme >= 30,
            t.bekleme + " tick");
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> silah sistemi calisiyor");
process.exit(hata ? 1 : 0);

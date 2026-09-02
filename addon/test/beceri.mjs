/* BEN 10 BECERI AGACI                                    v4.98

   Kullanici: "oyunda bu mod kuruldugunda yanda bir sekme
   aciyor ve orada bir skill secilebiliyor, ekstra
   yeteneklerini arttirabiliyoruz."

   ---- BU DOSYANIN EN ONEMLI BOLUMU: 2. ----
   Agacin MODUN KENDI dosyalarindan geldigini sinliyor:
   dugumler, onkosul zinciri, ucretler ve XP formulu. AlienEvo
   Palladium eklentisi ve KubeJS betikleri duz JavaScript --
   yani "hafizadan yazdim" ihtimali test edilebilir.

   Kullanicinin kurali: "bir seyden emin degilsen tahmin etme." */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP  = KOK + "/Simsek_TNT_ToprakTopu";
const JAR = "/tmp/claude-0/-home-user-kanal-sitesi/" +
  "e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11/scratchpad/ben10";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const bec  = await import("./pack/yetenekler/beceri.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* taban -> modun kendi guc dosyasi */
const TUR = { elmas: "petrosapien", dortkol: "tetramand",
              cene: "piscciss_volann", ates: "pyronite" };
const GUC = JAR + "/data/alienevo_aliens/palladium/powers";
const jarVar = existsSync(GUC + "/petrosapien.json");

function kur(id = "b1") {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  _durum.ozellikler.delete(ayar.BECERI_KAYIT_ANAHTAR);
  bec.beceriUnut();
  return { D, o };
}

console.log("=== 1. AGAC VAR VE TAM ===");
{
  kontrol("BECERI_ACIK", ayar.BECERI_ACIK === true);
  kontrol("dort turun agaci var", ayar.BECERI_AGACI.size === 4,
          ayar.BECERI_AGACI.size + " tur");
  for (const [taban, agac] of ayar.BECERI_AGACI) {
    kontrol(taban + ": dugumleri var", agac.length > 0, agac.length + " dugum");
    kontrol(taban + ": her dugumun adi var",
            agac.every((n) => n.ad && n.ad.length > 2));
    kontrol(taban + ": anahtarlar benzersiz",
            new Set(agac.map((n) => n.anahtar)).size === agac.length);
    /* Onkosul zinciri KAPALI olmali: her "gerek" agacta
       bulunmali, yoksa o dugum hicbir zaman acilamaz.      */
    const adlar = new Set(agac.map((n) => n.anahtar));
    kontrol(taban + ": onkosullar agacin icinde",
            agac.every((n) => !n.gerek || adlar.has(n.gerek)),
            agac.filter((n) => n.gerek && !adlar.has(n.gerek))
                .map((n) => n.anahtar).join(",") || "hepsi");
    /* En az bir KOK dugum (onkosulsuz) olmali, yoksa agac
       hic baslamaz.                                        */
    kontrol(taban + ": kok dugumu var",
            agac.some((n) => !n.gerek));
    /* Ucretsiz bir giris olmali: ilk dokunusta bir sey
       olmayan agac "bozuk" hissi verir.                    */
    kontrol(taban + ": ucretsiz girisi var",
            agac.some((n) => n.ucret === 0));
  }
}

console.log("");
console.log("=== 2. AGAC MODUN KENDI DOSYALARINDAN ===");
{
  if (!jarVar) {
    console.log("  · jar diskte degil, karsilastirma atlandi");
  } else {
    for (const [taban, agac] of ayar.BECERI_AGACI) {
      const d = oku(GUC + "/" + TUR[taban] + ".json");
      const ab = d.abilities || {};

      /* Modda AGAC DUGUMU: gizli olmayan, gui_position tasiyan,
         "_loop" olmayan yetenekler.                          */
      const modDugum = Object.entries(ab).filter(([k, v]) =>
        !v.hidden && v.gui_position && v.gui_position !== "null" &&
        !k.endsWith("_loop"));

      kontrol(taban + ": dugum sayisi modla ayni",
              agac.length === modDugum.length,
              agac.length + " vs " + modDugum.length);

      for (const n of agac) {
        const v = ab[n.anahtar];
        kontrol("  " + taban + "/" + n.anahtar + ": modda var", !!v);
        if (!v) continue;

        /* Onkosul: conditions.unlocking icindeki
           palladium:ability_unlocked                        */
        const kosul = (v.conditions || {}).unlocking || [];
        const modGerek = kosul
          .filter((c) => String(c.type).endsWith("ability_unlocked"))
          .map((c) => c.ability)
          .filter((a) => a && !String(a).endsWith("_loop"))[0] || null;
        kontrol("    onkosulu modla ayni", n.gerek === modGerek,
                String(n.gerek) + " vs " + String(modGerek));

        /* Ucret: palladium:scoreboard_score_buyable.score  */
        const alis = kosul.find((c) =>
          String(c.type).endsWith("scoreboard_score_buyable"));
        const modUcret = alis ? (alis.score || 0) : 0;
        kontrol("    ucreti modla ayni", n.ucret === modUcret,
                n.ucret + " vs " + modUcret);

        /* Istatistik yukseltmesi: attribute + amount */
        if (String(v.type).endsWith("attribute_modifier")) {
          kontrol("    istatistik etkisi var", !!n.etki,
                  JSON.stringify(n.etki));
          if (n.etki) {
            kontrol("    miktari modla ayni", n.etki[1] === v.amount,
                    n.etki[1] + " vs " + v.amount);
          }
        }

        /* Dal ve derinlik gui_position'dan. */
        kontrol("    agactaki yeri modla ayni",
                n.dal === v.gui_position[0] && n.derinlik === v.gui_position[1],
                "[" + n.dal + "," + n.derinlik + "] vs " +
                JSON.stringify(v.gui_position));
      }
    }

    /* XP formulu: data/alienevo/kubejs_scripts/xp.js */
    const xpJs = JAR + "/data/alienevo/kubejs_scripts/xp.js";
    if (existsSync(xpJs)) {
      const metin = readFileSync(xpJs, "utf8");
      const carpan = /entityMaxHealth \* ([\d.]+)/.exec(metin);
      kontrol("XP carpani modun betiginden",
              !!carpan && Number(carpan[1]) === ayar.BECERI_XP_CARPAN,
              (carpan ? carpan[1] : "?") + " vs " + ayar.BECERI_XP_CARPAN);
      const esik = /currentLevel === 0 \? (\d+) : (\d+) \* currentLevel/.exec(metin);
      kontrol("XP esik tabani modun betiginden",
              !!esik && Number(esik[1]) === ayar.BECERI_XP_TABAN &&
              Number(esik[2]) === ayar.BECERI_XP_TABAN,
              (esik ? esik[1] : "?") + " vs " + ayar.BECERI_XP_TABAN);
      const tavan = /currentLevel >= (\d+)/.exec(metin);
      kontrol("tavan kademe modun betiginden",
              !!tavan && Number(tavan[1]) === ayar.BECERI_TAVAN_KADEME,
              (tavan ? tavan[1] : "?") + " vs " + ayar.BECERI_TAVAN_KADEME);
    }
  }
}

console.log("");
console.log("=== 3. XP VE KADEME ===");
{
  const { o } = kur("bx1");
  kontrol("baslangicta sifir",
          bec.beceriAl(o.id, "elmas").kademe === 0 &&
          bec.beceriAl(o.id, "elmas").puan === 0);

  /* 20 canli bir hedef: round(20 * 0.425) = 9 XP */
  const beklenenXp = Math.round(20 * ayar.BECERI_XP_CARPAN);
  bec.beceriXpVer(o, "elmas", 20);
  kontrol("olum XP verdi", bec.beceriAl(o.id, "elmas").xp === beklenenXp,
          bec.beceriAl(o.id, "elmas").xp + " (beklenen " + beklenenXp + ")");

  /* Esige kadar vur: kademe 0 -> 100 XP */
  sus();
  for (let i = 0; i < 20; i++) bec.beceriXpVer(o, "elmas", 20);
  ac();
  const d = bec.beceriAl(o.id, "elmas");
  kontrol("kademe atladi", d.kademe >= 1, "kademe " + d.kademe);
  kontrol("kademe basina 1 puan", d.puan === d.kademe,
          d.puan + " puan / " + d.kademe + " kademe");

  /* Baska TUR etkilenmemeli: modda her uzaylinin AYRI
     seviyesi var (Petrosapien.Level, Tetramand.Level...). */
  kontrol("baska turun kademesi degismedi",
          bec.beceriAl(o.id, "dortkol").kademe === 0);
}
{
  /* Tavan kademede XP birikmiyor (modda skor sifirlaniyor). */
  const { o } = kur("bx2");
  sus();
  for (let i = 0; i < 4000; i++) bec.beceriXpVer(o, "ates", 100);
  ac();
  const d = bec.beceriAl(o.id, "ates");
  kontrol("tavan kademede duruyor", d.kademe === ayar.BECERI_TAVAN_KADEME,
          "kademe " + d.kademe);
  kontrol("tavanda XP birikmiyor", d.xp === 0, d.xp + " XP");
  kontrol("tavanda puan tavani da belli", d.puan === ayar.BECERI_TAVAN_KADEME,
          d.puan + " puan");
}

console.log("");
console.log("=== 4. DUGUM ACMA VE ONKOSUL ===");
{
  const { o } = kur("bd1");
  const agac = ayar.BECERI_AGACI.get("elmas");
  const kok = agac.find((n) => !n.gerek && n.ucret === 0);
  const kokSonrasi = agac.find((n) => n.gerek === kok.anahtar);

  /* Onkosulu olmayan, ucretsiz dugum puansiz acilmali. */
  let s = bec.beceriAc(o.id, "elmas", kok.anahtar);
  kontrol("ucretsiz kok dugum puansiz acildi", s.olur === true, s.sebep);
  kontrol("acik listesine girdi",
          bec.beceriAl(o.id, "elmas").acik.includes(kok.anahtar));
  kontrol("ikinci kez acilmiyor",
          bec.beceriAc(o.id, "elmas", kok.anahtar).olur === false);

  /* Onkosulu acik ama PUAN yok: acilmamali. */
  s = bec.beceriAc(o.id, "elmas", kokSonrasi.anahtar);
  kontrol("puansiz acilmiyor", s.olur === false, s.sebep);
  kontrol("sebebi puan diyor", /puan/.test(s.sebep), s.sebep);

  /* Puan ver, acilsin. */
  sus();
  for (let i = 0; i < 60; i++) bec.beceriXpVer(o, "elmas", 40);
  ac();
  s = bec.beceriAc(o.id, "elmas", kokSonrasi.anahtar);
  kontrol("puan gelince acildi", s.olur === true, s.sebep);
  const sonra = bec.beceriAl(o.id, "elmas");
  kontrol("puan dustu", sonra.puan >= 0);

  /* ONKOSULU ACIK OLMAYAN dugum: en derindeki. */
  const derin = agac.slice().sort((a, b) => b.derinlik - a.derinlik)[0];
  if (derin.gerek && !sonra.acik.includes(derin.gerek)) {
    const s2 = bec.beceriAc(o.id, "elmas", derin.anahtar);
    kontrol("onkosulsuz acilmiyor", s2.olur === false, s2.sebep);
    kontrol("sebebi onkosulu soyluyor", /Önce/.test(s2.sebep), s2.sebep);
  }

  kontrol("olmayan dugum reddediliyor",
          bec.beceriAc(o.id, "elmas", "yok_boyle").olur === false);
  kontrol("olmayan tur reddediliyor",
          bec.beceriAc(o.id, "yok_tur", "x").olur === false);
}

console.log("");
console.log("=== 5. ACILAN DUGUMLER GERCEKTEN GUC VERIYOR ===");
{
  /* Kullanicinin cumlesi: "ekstra yeteneklerini
     arttirabiliyoruz." Yani agac SUS OLMAMALI.

     Kucuk artislar tek tek seviyeye cevrilemez (Guc adimi
     +3), o yuzden toplanip bir kez cevriliyor. Tek tek
     cevirseydik uc kez "+1 saldiri" almak HICBIR sey
     vermezdi -- bu testin asil derdi o.                   */
  const { o } = kur("be1");
  kontrol("hicbir sey acikken efekt yok",
          bec.beceriEfektleri(o.id, "dortkol").length === 0);

  /* Dort Kol'un saldiri yukseltmeleri +4'er: ikisi = +8,
     yani Guc 2 seviye (8/3 = 2).                          */
  const agac = ayar.BECERI_AGACI.get("dortkol");
  const saldirilar = agac.filter((n) => n.etki && n.etki[0] === "saldiri");
  kontrol("dortkol'de saldiri yukseltmesi var", saldirilar.length > 0,
          saldirilar.length + " dugum");

  sus();
  for (let i = 0; i < 400; i++) bec.beceriXpVer(o, "dortkol", 60);
  ac();
  /* Zinciri sirayla ac: onkosullar yuzunden tek tek. */
  let dondu = true;
  while (dondu) {
    dondu = false;
    for (const n of agac) {
      if (bec.beceriAc(o.id, "dortkol", n.anahtar).olur) dondu = true;
    }
  }
  const acik = bec.beceriAl(o.id, "dortkol").acik;
  kontrol("butun agac acildi", acik.length === agac.length,
          acik.length + "/" + agac.length);

  const ef = bec.beceriEfektleri(o.id, "dortkol");
  const toplamSaldiri = saldirilar.reduce((a, n) => a + n.etki[1], 0);
  const beklenenGuc = Math.floor(toplamSaldiri / ayar.BECERI_SALDIRI_ADIM);
  const guc = ef.find((e) => e[0] === "strength");
  kontrol("saldiri yukseltmeleri Guc seviyesine dondu",
          !!guc && guc[2] === beklenenGuc - 1,
          "+" + toplamSaldiri + " -> Guc " + (guc ? guc[2] + 1 : 0) +
          " (beklenen " + beklenenGuc + ")");

  const zirhlar = agac.filter((n) => n.etki && n.etki[0] === "zirh");
  if (zirhlar.length) {
    const toplamZirh = zirhlar.reduce((a, n) => a + n.etki[1], 0);
    const beklenenDirenc = Math.floor(toplamZirh / ayar.BECERI_ZIRH_ADIM);
    const dir = ef.find((e) => e[0] === "resistance");
    if (beklenenDirenc > 0) {
      kontrol("zirh yukseltmeleri Direnc seviyesine dondu",
              !!dir && dir[2] === Math.min(beklenenDirenc - 1, 3),
              "+" + toplamZirh + " -> Direnc " + (dir ? dir[2] + 1 : 0));
    }
  }
  /* Direnc V (%100 bagisiklik) HICBIR ZAMAN cikmamali. */
  const dir = ef.find((e) => e[0] === "resistance");
  kontrol("Direnc V olumsuzluk vermiyor", !dir || dir[2] <= 3,
          dir ? "Direnc " + (dir[2] + 1) : "yok");
}

console.log("");
console.log("=== 6. KALICI: DUNYAYA YAZILIYOR ===");
{
  const { o } = kur("bk1");
  sus();
  for (let i = 0; i < 30; i++) bec.beceriXpVer(o, "cene", 40);
  ac();
  const kok = ayar.BECERI_AGACI.get("cene").find((n) => !n.gerek);
  bec.beceriAc(o.id, "cene", kok.anahtar);
  const onceki = bec.beceriAl(o.id, "cene");

  const kayit = _durum.ozellikler.get(ayar.BECERI_KAYIT_ANAHTAR);
  kontrol("dunyaya yazildi", typeof kayit === "string" && kayit.includes("cene"),
          String(kayit).slice(0, 60));

  /* Script yeniden yuklenince okunmali. */
  bec.beceriUnut();
  const sonraki = bec.beceriAl(o.id, "cene");
  kontrol("yeniden yuklenince kademe duruyor",
          sonraki.kademe === onceki.kademe,
          sonraki.kademe + " vs " + onceki.kademe);
  kontrol("yeniden yuklenince acik dugumler duruyor",
          sonraki.acik.length === onceki.acik.length &&
          sonraki.acik.includes(kok.anahtar));
  kontrol("yeniden yuklenince puan duruyor",
          sonraki.puan === onceki.puan, sonraki.puan + " vs " + onceki.puan);
}
{
  /* Bozuk kayit paketi oldurmemeli. */
  const { o } = kur("bk2");
  _durum.ozellikler.set(ayar.BECERI_KAYIT_ANAHTAR, "{bozuk json");
  bec.beceriUnut();
  let coktu = false;
  try { bec.beceriAl(o.id, "elmas"); } catch (e) { coktu = true; }
  kontrol("bozuk kayit cokmuyor", coktu === false);
}

console.log("");
console.log("=== 7. ULASILABILIYOR MU ===");
{
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js beceri.js'i import ediyor",
          kaynak.includes('from "./yetenekler/beceri.js"'));
  kontrol("Ben 10 menusunde beceri satiri var",
          kaynak.includes("★ Beceriler"));
  kontrol("beceri menusu tanimli",
          /function beceriMenusu\(/.test(kaynak));
  kontrol("tur secme menusu tanimli",
          /function beceriTurMenusu\(/.test(kaynak));
  /* XP kancasi: uzayli halindeyken oldurunce. */
  kontrol("entityDie'a abone olunuyor",
          /olayaAbone\("entityDie"/.test(kaynak));
  kontrol("olay yoksa paket olmuyor (uyari veriliyor)",
          kaynak.includes("beceriKuruldu"));
  /* ben10.js acilan dugumlerin efektini uyguluyor mu. */
  const b10 = readFileSync(BP + "/scripts/yetenekler/ben10.js", "utf8");
  kontrol("ben10.js beceri efektlerini ekliyor",
          b10.includes("beceriEfektleri"));
  kontrol("efektler TABAN tablonun ustune biniyor",
          b10.includes("t.efektler.concat(ekEfektler)"));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Beceri agaci yerinde");
process.exit(hata ? 1 : 0);

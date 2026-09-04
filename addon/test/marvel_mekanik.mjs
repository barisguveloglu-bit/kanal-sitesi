/* MARVEL MEKANIKLERI                                     v5.3

   Kullanici: "duvar tirmanma, ag sallanma, boy degistirme, faz
   gecisi, kuvvet alani, portallar... bunlari almayacaksan zaten
   kahraman diye bir sey kalmiyor, kostum oluyor. Kahramanda
   ozellik denilen bir sey kalmiyorsa o kahraman degil."

   v5.2'de bunlara "aktarilamiyor" demistim ve yaniltmisim:
   mod bunlari EFEKTLE degil SCRIPT'le yapiyor.

   ---- EN ONEMLI BOLUM: 5. ----
   Sayilarin MODUN KENDI SCRIPT'inden geldigini siniyor: mod
   diskteyse carpanlar (tirmanma 0.5, sallanma 3.5, sicrayis 8,
   cengel menzili 72, kuvvet alani 12/16/4/3/2/10) satir satir
   geri okunup ayarlar.js ile karsilastiriliyor.               */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const MOD = "/tmp/claude-0/-home-user-kanal-sitesi/" +
  "e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11/scratchpad/marvel";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const mrv = await import("./pack/yetenekler/marvel.js");
const mek = await import("./pack/yetenekler/marvel_mekanik.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const kollar = await import("./pack/yetenekler/kollar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* ---------------- sahte oyuncu ---------------- */
function kur(kahraman, ek = {}) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 },
                      { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "mk1"; o.typeId = "minecraft:player";
  o.isSneaking = false; o.isOnGround = true;
  const yuvalar = {};
  if (kahraman) {
    yuvalar.Legs = ayar.MARVEL_ONEK + kahraman + ayar.MARVEL_AYIRAC +
                   kahraman + "_powers";
  }
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (y) => (yuvalar[y] ? { typeId: yuvalar[y] } : undefined),
        setEquipment: () => true
      };
    }
    return eskiGet(ad);
  };
  o._itmeler = []; o._olaylar = []; o._isinlamalar = [];
  o.applyKnockback = (dx, dz, yatay, dikey) => {
    o._itmeler.push({ dx, dz, yatay, dikey }); return true;
  };
  o.applyImpulse = () => true;
  o.triggerEvent = (e) => { o._olaylar.push(e); return true; };
  o.teleport = (k) => { o._isinlamalar.push(k); return true; };
  o.addEffect = () => true;
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  o.getViewDirection = () => ek.yon || { x: 0, y: 0, z: 1 };
  o.getBlockFromViewDirection = ek.blok || (() => undefined);
  o._yuvalar = yuvalar;
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  mek.tirmanmaUnut(); mek.boyUnut(); mrv.marvelUnut();
  return { D, o };
}
const yetenek = (kimlik) =>
  kayit.tumYetenekler().find((y) => y.kimlik === kimlik);

console.log("=== 1. SEKIZ MEKANIK KAYITLI ===");
{
  const beklenen = ["marvel_sallanma", "marvel_suzulme", "marvel_atilma",
                    "marvel_sicrayis", "marvel_faz", "marvel_kuvvet_alani",
                    "marvel_gecit", "marvel_boy"];
  const eksik = beklenen.filter((k) => !yetenek(k));
  kontrol("sekiz mekanik yetenek defterinde", eksik.length === 0,
          eksik.join(", "));
  kontrol("tirmanma YETENEK degil (surekli durum)",
          !yetenek("marvel_tirmanma") &&
          typeof mek.tirmanmaTara === "function");

  /* Jest sirasi benzersiz olmali -- siraDenetimi zaten
     bakiyor ama burada da sabitleniyor.                     */
  const siralar = beklenen.map((k) => yetenek(k).sira);
  kontrol("jest siralari benzersiz",
          new Set(siralar).size === siralar.length, siralar.join(","));
}

console.log("=== 2. KAPI: GUCU OLMAYAN KULLANAMIYOR ===");
{
  /* Thor'da tirmanma/ag YOK. Menuden secse bile calismamali. */
  const { o } = kur("thor");
  yetenek("marvel_sallanma").olustur(o);
  kontrol("Thor ag atamiyor", o._itmeler.length === 0);
  yetenek("marvel_atilma").olustur(o);
  kontrol("Thor atilamiyor", o._itmeler.length === 0);
  yetenek("marvel_boy").olustur(o);
  kontrol("Thor boy degistiremiyor", o._olaylar.length === 0);

  /* Gucsuz oyuncu da hicbir sey yapamamali.                 */
  const { o: o2 } = kur(null);
  yetenek("marvel_atilma").olustur(o2);
  kontrol("gucsuz oyuncu atilamiyor", o2._itmeler.length === 0);
}

console.log("=== 3. MEKANIKLER GERCEKTEN CALISIYOR ===");
{
  /* ATILMA: Cyclops'ta var, carpan 4.                       */
  const { o } = kur("cyclops", { yon: { x: 0, y: 0, z: 1 } });
  yetenek("marvel_atilma").olustur(o);
  kontrol("Cyclops atiliyor", o._itmeler.length === 1,
          JSON.stringify(o._itmeler));
  kontrol("atilma carpani 4 (swing.js:218)",
          o._itmeler[0] && Math.abs(o._itmeler[0].dz - 4) < 1e-9,
          o._itmeler[0] && String(o._itmeler[0].dz));

  /* SICRAYIS: Hulk'ta var, carpan 8.                        */
  const { o: o2 } = kur("hulk", { yon: { x: 0, y: 0, z: 1 } });
  yetenek("marvel_sicrayis").olustur(o2);
  kontrol("Hulk sicriyor, carpan 8 (swing.js:189)",
          o2._itmeler[0] && Math.abs(o2._itmeler[0].dz - 8) < 1e-9,
          o2._itmeler[0] && String(o2._itmeler[0].dz));

  /* SUZULME: dikey -0.1 (swing.js:165).                     */
  const { o: o3 } = kur("spiderman", { yon: { x: 0, y: 0, z: 1 } });
  yetenek("marvel_suzulme").olustur(o3);
  kontrol("suzulmenin dikeyi -0.1",
          o3._itmeler[0] && Math.abs(o3._itmeler[0].dikey + 0.1) < 1e-9,
          o3._itmeler[0] && String(o3._itmeler[0].dikey));

  /* SALLANMA: cengel bulunca surekli is donmeli ve cekmeli. */
  const blok = { x: 0, y: 90, z: 30 };
  const { o: o4 } = kur("spiderman", {
    yon: { x: 0, y: 0, z: 1 },
    blok: () => ({ block: blok })
  });
  const is = yetenek("marvel_sallanma").olustur(o4);
  kontrol("cengel tutunca surekli is donuyor",
          is && typeof is.calis === "function");
  if (is) {
    is.calis(); is.calis();
    kontrol("cengele dogru cekiliyor", o4._itmeler.length === 2,
            o4._itmeler.length + " itme");
    kontrol("cekis carpani 3.5 (swing.js:42)",
            o4._itmeler[0] && Math.abs(Math.hypot(
              o4._itmeler[0].dx, o4._itmeler[0].dz) - 3.5) < 0.001,
            o4._itmeler[0] && String(o4._itmeler[0].dz));
  }
  /* Cengel yoksa is DONMEMELI.                              */
  const { o: o5 } = kur("spiderman", { blok: () => undefined });
  kontrol("tutunacak yer yoksa sallanma yok",
          yetenek("marvel_sallanma").olustur(o5) === undefined);

  /* BOY: uc durum arasinda donmeli ve varlik olayi tetiklenmeli. */
  const { o: o6 } = kur("antman");
  yetenek("marvel_boy").olustur(o6);
  yetenek("marvel_boy").olustur(o6);
  yetenek("marvel_boy").olustur(o6);
  kontrol("boy uc durumu da tetikliyor",
          o6._olaylar.length === 3 &&
          new Set(o6._olaylar).size === 3, o6._olaylar.join(","));
  kontrol("olay adlari varlik dosyasindakiyle ayni",
          o6._olaylar.every((e) => Object.values(ayar.MARVEL_BOY_OLAY)
                                         .includes(e)));
}

console.log("=== 4. TIRMANMA ===");
{
  const duvar = () => ({ block: { x: 0, y: 90, z: 2 } });
  /* Comelmeden tirmanma OLMAMALI.                           */
  const { o } = kur("spiderman", { blok: duvar });
  o.isSneaking = false;
  mek.tirmanmaTara([o]);
  kontrol("cömelmeden tirmanmiyor", o._itmeler.length === 0);

  const { o: o2 } = kur("spiderman", { blok: duvar });
  o2.isSneaking = true;
  mek.tirmanmaTara([o2]);
  kontrol("cömelip duvara bakinca tirmaniyor", o2._itmeler.length === 1,
          JSON.stringify(o2._itmeler[0]));
  kontrol("tirmanma carpani 0.5 (black_panther.js:72)",
          o2._itmeler[0] &&
          Math.abs(Math.hypot(o2._itmeler[0].dx, o2._itmeler[0].dz) -
                   ayar.MARVEL_TIRMANMA_GUC) < 1e-9);

  /* Duvar yoksa tirmanma yok.                               */
  const { o: o3 } = kur("spiderman", { blok: () => undefined });
  o3.isSneaking = true;
  mek.tirmanmaTara([o3]);
  kontrol("duvar yoksa tirmanmiyor", o3._itmeler.length === 0);

  /* Tirmanmasi olmayan kahraman tirmanmamali.               */
  const { o: o4 } = kur("thor", { blok: duvar });
  o4.isSneaking = true;
  mek.tirmanmaTara([o4]);
  kontrol("Thor tirmanmiyor", o4._itmeler.length === 0);

  /* Tarama araligina uyuyor mu (her tick itmemeli).         */
  const { o: o5 } = kur("spiderman", { blok: duvar });
  o5.isSneaking = true;
  for (let i = 0; i < 10; i++) { mek.tirmanmaTara([o5]); tickIlerlet(1); }
  /* TAM sayi degil ARALIK sinaniyor: ilk taramanin hangi
     tick'e denk geldigi sahte dunyanin sayacina bagli ve
     bir birim oynayabiliyor. Onemli olan "her tick itmiyor" --
     tam sayi yazinca test kirilgan oluyordu.                */
  const beklenen = 10 / ayar.MARVEL_TIRMANMA_TARAMA;
  kontrol("tarama araligi tutuyor (her tick itmiyor)",
          o5._itmeler.length >= beklenen &&
          o5._itmeler.length <= beklenen + 1,
          o5._itmeler.length + " itme / 10 tick");
}

console.log("=== 5. SAYILAR MODUN SCRIPT'INDEN ===");
{
  if (!existsSync(MOD + "/bp/scripts")) {
    console.log("  · mod diskte degil, karsilastirma atlandi");
  } else {
    const o = (y) => readFileSync(MOD + "/bp/scripts/" + y, "utf8");
    const carpan = (metin, satirNo) => {
      const s = metin.split("\n")[satirNo - 1] || "";
      const m = s.match(/Math\.max\([^)]*\)\s*\*\s*(-?[\d.]+)/);
      return m ? parseFloat(m[1]) : undefined;
    };
    const swing = o("spiderman/swing.js");
    const bp = o("black_panther.js");

    kontrol("tirmanma 0.5 (black_panther.js:72)",
            carpan(bp, 72) === ayar.MARVEL_TIRMANMA_GUC,
            "jar=" + carpan(bp, 72) + " ayar=" + ayar.MARVEL_TIRMANMA_GUC);
    kontrol("sallanma 3.5 (swing.js:42)",
            carpan(swing, 42) === ayar.MARVEL_SALLANMA_GUC,
            "jar=" + carpan(swing, 42));
    kontrol("sicrayis 8 (swing.js:189)",
            carpan(swing, 189) === ayar.MARVEL_SICRAYIS_GUC,
            "jar=" + carpan(swing, 189));
    kontrol("atilma 4 (swing.js:218)",
            carpan(swing, 218) === ayar.MARVEL_ATILMA_GUC,
            "jar=" + carpan(swing, 218));
    kontrol("cengel menzili 72 (swing.js:19)",
            /maxDistance:\s*72/.test(swing.split("\n")[18] || ""),
            String(ayar.MARVEL_CENGEL_MENZIL === 72));

    const sue = o("sue_force_physics.js");
    const sabit = (ad) => {
      const m = sue.match(new RegExp("const " + ad + "\\s*=\\s*(-?[\\d.]+)"));
      return m ? parseFloat(m[1]) : undefined;
    };
    const eslesme = [
      ["ATTRACT_RADIUS", ayar.MARVEL_ALAN_YARICAP],
      ["MAX_DAMAGE_DISTANCE", ayar.MARVEL_ALAN_HASAR_MENZIL],
      ["MIN_PULL_DISTANCE", ayar.MARVEL_ALAN_EN_YAKIN],
      ["MAGNET_SPEED_I", ayar.MARVEL_ALAN_HIZ],
      ["DAMAGE_AMOUNT", ayar.MARVEL_ALAN_HASAR],
      ["DAMAGE_INTERVAL_TICKS", ayar.MARVEL_ALAN_HASAR_ARA],
      ["SLOWNESS_AMPLIFIER", ayar.MARVEL_ALAN_YAVASLIK],
      ["SLOWNESS_DURATION_TICKS", ayar.MARVEL_ALAN_YAVASLIK_SURE]
    ];
    const kotu = eslesme.filter(([ad, bizim]) => sabit(ad) !== bizim)
                        .map(([ad, bizim]) => ad + " jar=" + sabit(ad) +
                                              " ayar=" + bizim);
    kontrol("kuvvet alaninin sekiz sabiti birebir",
            kotu.length === 0, kotu.join(" | "));

    /* Boy olcekleri modun player.json'undan.                */
    let ent = readFileSync(MOD + "/bp/entities/player.json", "utf8");
    ent = ent.replace(/\/\/[^\n"]*$/gm, "").replace(/,(\s*[}\]])/g, "$1");
    const gruplar = JSON.parse(ent)["minecraft:entity"].component_groups;
    kontrol("boy olcekleri modun player.json'undan",
            gruplar["antman:small"]["minecraft:scale"].value ===
              ayar.MARVEL_BOY_OLCEK.kucuk &&
            gruplar["antman:big"]["minecraft:scale"].value ===
              ayar.MARVEL_BOY_OLCEK.buyuk,
            JSON.stringify(ayar.MARVEL_BOY_OLCEK));
  }
}

console.log("=== 6. OYUNCU VARLIGI ===");
{
  const y = BP + "/entities/player.json";
  kontrol("BP oyuncu varligi uretildi", existsSync(y));
  if (existsSync(y)) {
    const e = oku(y)["minecraft:entity"];
    kontrol("kimlik minecraft:player",
            e.description.identifier === "minecraft:player");
    kontrol("uc bilesen grubu, uc olay",
            Object.keys(e.component_groups).length === 3 &&
            Object.keys(e.events).length === 3);
    const olcek = Object.values(e.component_groups)
      .map((g) => g["minecraft:scale"].value).sort((a, b) => a - b);
    kontrol("olcekler 0.05 / 1 / 5",
            JSON.stringify(olcek) === "[0.05,1,5]", JSON.stringify(olcek));
    /* Olay adlari ayarlar.js ile AYNI olmali: yoksa script
       var olmayan bir olayi tetikler ve boy hic degismez.   */
    const ayarOlay = Object.values(ayar.MARVEL_BOY_OLAY).sort();
    kontrol("olay adlari ayarlar.js ile ayni",
            JSON.stringify(Object.keys(e.events).sort()) ===
            JSON.stringify(ayarOlay), Object.keys(e.events).join(","));
    /* Cizim bileseni OLMAMALI: oyuncuyu yeniden cizmiyoruz.  */
    kontrol("BP tanimi oyuncuyu yeniden CIZMIYOR",
            !e.components["minecraft:geometry"] &&
            !e.components["minecraft:material_instances"]);
  }
}

console.log("=== 7. GUC ESYASINA BAGLANMA ===");
{
  const bagli = kollar.MARVEL_YETENEKLERI;
  const spider = bagli.filter(([e]) => e.includes("spiderman"))
                      .map(([, y]) => y);
  kontrol("Orumcek Adam'in agi ve atilmasi bagli",
          spider.includes("marvel_sallanma") &&
          spider.includes("marvel_atilma"), spider.join(", "));
  const antman = bagli.filter(([e]) => e.includes("antman")).map(([, y]) => y);
  kontrol("Ant-Man'in boy degistirmesi bagli",
          antman.includes("marvel_boy"), antman.join(", "));
  /* Tirmanma BAGLANMAMALI: yetenek degil.                   */
  kontrol("tirmanma yetenek olarak baglanmamis",
          !bagli.some(([, y]) => y === "marvel_tirmanma"));
  /* Her baglanan yetenek defterde olmali.                   */
  const hepsi = new Set(kayit.tumYetenekler().map((y) => y.kimlik));
  const hayalet = bagli.map(([, y]) => y).filter((y) => !hepsi.has(y));
  kontrol("baglanan her yetenek defterde", hayalet.length === 0,
          [...new Set(hayalet)].join(", "));
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);

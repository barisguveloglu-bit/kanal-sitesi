/* ACILABILIR ZIRH KATMANLARI                              v5.8

   Kullanici: "Max steel modunda guc modunu actigin zaman direkt
   elimde matkap oluyor; normalde matkap icin yetenekler kismi
   var ya, agac seklinde veya ona benzer, tek tek acabiliyorsun.
   Ben oyle biliyorum."

   ---- EN ONEMLI BOLUM: 2. ----
   Sikayetin ta kendisi: cekirdegi eline alinca matkap
   GELMEMELI. Sinama listeye degil DAVRANISA bakiyor. */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const OMP = KOK + "/Simsek_Oyuncu_Modeli";
const ION = "/tmp/claude-0/-home-user-kanal-sitesi/" +
  "e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11/scratchpad/yenimod";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const katman = await import("./pack/yetenekler/zirh_katman.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const kollar = await import("./pack/yetenekler/kollar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

function kur(elde, ozellikVar = true) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 },
                      { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "k1"; o.typeId = "minecraft:player";
  o._elde = elde;
  o._ozellikler = new Map();
  if (ozellikVar) {
    o.getProperty = (k) => o._ozellikler.get(k);
    o.setProperty = (k, v) => { o._ozellikler.set(k, v); };
  }
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (y) => (y === "Mainhand" && o._elde
          ? { typeId: o._elde } : undefined),
        setEquipment: () => true
      };
    }
    return eskiGet(ad);
  };
  o.addEffect = () => true;
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  return { D, o };
}
const yetenek = (k) => kayit.tumYetenekler().find((y) => y.kimlik === k);
const GUC = ayar.ZIRH_CEKIRDEK_ONEK + ayar.ZIRH_MATKAP_MOD;

console.log("=== 1. KAYNAK GERCEKTEN AGAC VE MATKAP BAR SLOTU ===");
{
  /* Kullanicinin "ben oyle biliyorum"u OLCULDU. */
  const p = ION + "/data/ionstrike/palladium/powers/strength_mode.json";
  if (!existsSync(p)) {
    console.log("  · ionstrike jar'i diskte degil, kaynak karsilastirmasi atlandi");
  } else {
    const d = oku(p);
    kontrol("strength_mode gui_display_type = tree",
            d.gui_display_type === "tree", String(d.gui_display_type));
    const dh = d.abilities.drill_hands;
    kontrol("drill_hands var ve turu tool_hands",
            !!dh && dh.type === "palladium:tool_hands",
            dh ? dh.type : "yok");
    /* Bar slotu olmasi = oyuncunun acip kapattigi sey.       */
    kontrol("drill_hands yetenek BARINDA (hidden_in_bar false)",
            dh && dh.hidden_in_bar === false, String(dh && dh.hidden_in_bar));
    kontrol("drill_hands'in bar slotu var (list_index >= 0)",
            dh && dh.list_index >= 0, String(dh && dh.list_index));
    /* Kilitli yetenegi olan bir agac: "tek tek aciliyor". */
    const kilitli = Object.entries(d.abilities)
      .filter(([, v]) => ((v.conditions || {}).unlocking || []).length > 0);
    kontrol("agacta kilit sarti olan yetenekler var",
            kilitli.length > 0, kilitli.length + " kilitli yetenek");
  }
}

console.log("");
console.log("=== 2. MATKAP ARTIK OTOMATIK DEGIL (sikayetin kendisi) ===");
{
  const pd = oku(OMP + "/entity/player.entity.json")["minecraft:client_entity"].description;
  const oynat = pd.scripts.animate.find(
    (x) => typeof x === "object" && x.zirh_mod_guc_matkap);
  kontrol("matkap animasyonu kayitli", !!oynat);
  kontrol("kosul SADECE 'cekirdek elde' DEGIL",
          !!oynat && oynat.zirh_mod_guc_matkap !== "variable.zirh_mod_guc",
          oynat ? oynat.zirh_mod_guc_matkap : "-");
  kontrol("kosul varlik ozelligini ariyor",
          !!oynat &&
          oynat.zirh_mod_guc_matkap.indexOf(
            "q.property('" + ayar.ZIRH_MATKAP_OZELLIK + "')") !== -1,
          oynat ? oynat.zirh_mod_guc_matkap : "-");

  /* Cizim denetleyicisi de ayni sarti tasimali -- animasyon
     durur ama katman cizilirse matkap yine elde gorunur.   */
  const rc = pd.render_controllers.find(
    (x) => typeof x === "object" &&
           Object.keys(x)[0].indexOf("zirh_mod_guc_matkap") !== -1);
  kontrol("cizim denetleyicisi de ozelligi ariyor",
          !!rc && Object.values(rc)[0].indexOf(
            "q.property('" + ayar.ZIRH_MATKAP_OZELLIK + "')") !== -1,
          rc ? Object.values(rc)[0] : "denetleyici yok");

  /* Varsayilan KAPALI olmali. */
  const bp = oku(BP + "/entities/player.json")["minecraft:entity"].description;
  const oz = (bp.properties || {})[ayar.ZIRH_MATKAP_OZELLIK];
  kontrol("ozellik BP oyuncu varliginda tanimli", !!oz,
          JSON.stringify(bp.properties || {}));
  kontrol("varsayilani KAPALI", !!oz && oz.default === false,
          oz ? String(oz.default) : "-");
  kontrol("istemciye senkron (gorunus okuyabilsin)",
          !!oz && oz.client_sync === true);
}

console.log("");
console.log("=== 3. ACMA/KAPAMA DAVRANISI ===");
{
  const { o } = kur(GUC);
  kontrol("baslangicta KAPALI", katman.matkapAcikMi(o) === false);

  yetenek("zirh_matkap").olustur(o);
  kontrol("bir kez basinca ACILIYOR", katman.matkapAcikMi(o) === true);

  yetenek("zirh_matkap").olustur(o);
  kontrol("tekrar basinca KAPANIYOR", katman.matkapAcikMi(o) === false);

  /* Baska cekirdekle acilmamali. */
  const t = kur(ayar.ZIRH_CEKIRDEK_ONEK + "titan");
  yetenek("zirh_matkap").olustur(t.o);
  kontrol("Titan cekirdegiyle acilmiyor", katman.matkapAcikMi(t.o) === false);

  /* Eli bosken de. */
  const b = kur(undefined);
  yetenek("zirh_matkap").olustur(b.o);
  kontrol("eli bosken acilmiyor", katman.matkapAcikMi(b.o) === false);

  /* Cekirdek elden cikinca katman KAPANMALI: yoksa Guc'u
     birakip baska moda gecince matkap acik kalirdi.        */
  const c = kur(GUC);
  yetenek("zirh_matkap").olustur(c.o);
  kontrol("acik", katman.matkapAcikMi(c.o) === true);
  c.o._elde = ayar.ZIRH_CEKIRDEK_ONEK + "hiz";
  katman.katmanTazele(c.o);
  kontrol("cekirdek degisince katman kapaniyor",
          katman.matkapAcikMi(c.o) === false);

  /* Cekirdek DURUYORSA tazeleme kapatmamali. */
  const d2 = kur(GUC);
  yetenek("zirh_matkap").olustur(d2.o);
  katman.katmanTazele(d2.o);
  kontrol("cekirdek dururken tazeleme kapatmiyor",
          katman.matkapAcikMi(d2.o) === true);
}

console.log("");
console.log("=== 4. ULASILABILIYOR MU ===");
{
  /* Yetenek Guc cekirdegine BAGLI olmali, yoksa esyayla
     tetiklenemez (v4.83 dersi).                            */
  const bagli = kollar.CEKIRDEK_YETENEKLERI
    .filter(([e]) => e === GUC).map(([, y]) => y);
  kontrol("zirh_matkap Guc cekirdegine bagli",
          bagli.indexOf("zirh_matkap") !== -1, bagli.join(", ") || "hicbiri");

  const main = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js zirh_katman.js'i import ediyor",
          main.indexOf('"./yetenekler/zirh_katman.js"') !== -1);
  kontrol("tazeleme merkezi tick'ten cagriliyor",
          main.indexOf("katmanTazele(_o)") !== -1);

  /* Ozet vaat ettigini vermeli: menude "matkap" yaziyorsa
     acilabilir olmali.                                      */
  const t = ayar.ZIRH_MODLAR.get(ayar.ZIRH_MATKAP_MOD);
  kontrol("Guc ozeti matkabin ACILDIGINI soyluyor",
          /matkap/i.test(t.ozet) && /aç/i.test(t.ozet), t.ozet);
}

console.log("");
console.log("=== 5. OZELLIK YOKSA PAKET OLMUYOR ===");
{
  /* setProperty her surumde yok. Yoksa matkap KAPALI kalmali
     ve hicbir sey patlamamali -- eski "hep acik" davranisina
     donmek kullanicinin sikayetine geri donmek olurdu.     */
  const { o } = kur(GUC, false);
  let patladi = false;
  try { yetenek("zirh_matkap").olustur(o); } catch (e) { patladi = true; }
  kontrol("ozellik yokken patlamiyor", !patladi);
  kontrol("ozellik yokken matkap KAPALI kaliyor",
          katman.matkapAcikMi(o) === false);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> matkap artik menuden aciliyor");
process.exit(hata ? 1 : 0);

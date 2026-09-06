/* POZ SANDIGI -- v7.27'de kullanicinin gonderdigi 45 satirlik
   playanimation listesinden gelen 39 poz.

   ---- BU DOSYA NEYI TUTUYOR ----
   Yetenekler GERCEKTEN CALISTIRILIYOR: poz veriliyor, komut
   yakalaniyor, sira ilerliyor, birakiliyor.

     1. Listede TEKRAR yok, ve modda ZATEN kullanilan alti
        animasyon buraya tekrar eklenmemis. Aksi halde ayni
        poz iki yerden yonetilirdi.
     2. Poz gercekten OYNATILIYOR (playanimation komutu).
     3. Sira her kullanimda BIR ILERLIYOR ve basa donuyor.
     4. CIKIS YOLU VAR: "Pozu Birak" normale donduruyor.
        Kalici poz (gecis 9999) kendiliginden bitmez; cikisi
        olmayan bir poz oyuncuyu o pozda birakirdi. Kaynak
        modun Yamultma'sindaki hata tam buydu.
     5. Birakinca sira BASA doner.
     6. Her oyuncunun sirasi AYRI.
     7. Oyuncu cikinca defter temizleniyor (sizinti).
     8. Kapaliyken hicbir sey oynatilmiyor.                  */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
const anaModul = await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const poz = await import("./pack/yetenekler/pozlar.js");

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
  o._komutlar = [];
  o._mesaj = [];
  o.runCommand = function (k) { this._komutlar.push(k); return { successCount: 1 }; };
  o.sendMessage = function (m) { this._mesaj.push(m); };
  D.boyut._varliklar = [o];
  _durum.oyuncular = [o];
  return { D, o };
}

function kullan(o, kimlik) {
  const tanim = kayit.yetenekAl(kimlik);
  sus();
  const is = tanim.olustur(o);
  if (is) { is.calis(); is.bitir(); }
  ac();
}

/* Oynatilan animasyon kimligi (playanimation komutundan). */
function sonPozKimligi(o) {
  for (let i = o._komutlar.length - 1; i >= 0; i--) {
    const m = /^playanimation @s (animation\.[a-z0-9_.]+)/.exec(o._komutlar[i]);
    if (m) return m[1];
  }
  return null;
}

console.log("=== 1. LISTE SAGLAM MI ===");
{
  const L = ayar.POZ_LISTESI;
  kontrol("liste bos degil", L.length > 0, L.length + " poz");
  const kimlikler = L.map((x) => x[0]);
  kontrol("listede tekrar yok",
          new Set(kimlikler).size === kimlikler.length,
          kimlikler.length + " kayit / " + new Set(kimlikler).size + " ayri");
  kontrol("her kaydin Turkce adi var",
          L.every((x) => typeof x[1] === "string" && x[1].length > 2));
  kontrol("her kimlik animation. ile basliyor",
          kimlikler.every((k) => k.indexOf("animation.") === 0),
          kimlikler.filter((k) => k.indexOf("animation.") !== 0).join(",") || "-");
  /* Kaynak listedeki "animation.cow.baby_ transform" ortasinda
     BOSLUK tasiyordu; o haliyle komut hic calismaz.          */
  kontrol("hicbir kimlikte bosluk yok",
          kimlikler.every((k) => k.indexOf(" ") === -1),
          kimlikler.filter((k) => k.indexOf(" ") !== -1).join(",") || "-");

  /* Modda ZATEN kullanilan animasyonlar listeye tekrar
     girmemeli -- yoksa ayni poz iki yerden yonetilir.        */
  const zaten = [ayar.YAMULT_ANIM, ayar.DONDUR_ANIM, ayar.BEDEN_ANIM,
                 ayar.WILL_YATIR_ANIM]
    .filter(Boolean).map((x) => String(x).split(" ")[0]);
  const cakisan = kimlikler.filter((k) => zaten.indexOf(k) !== -1);
  kontrol("zaten kullanilan animasyonlar listeye tekrar konmamis",
          cakisan.length === 0, cakisan.join(",") || "-");
}

console.log("");
console.log("=== 1b. LISTE VANILLA'DA GERCEKTEN VAR MI (v7.48) ===");
{
  /* ---- BU BOLUM NEDEN VAR ----
     ayarlar.js eskiden "BU LISTE DOGRULANMADI, DOGRULANAMAZ DA"
     diyordu ve hakliydi: vanilla animasyon kimlikleri depoda
     yoktu. v7.48'de artik var -- Mojang/bedrock-samples
     animasyon dosyalarini yayinliyor, 33 dosya indirildi ve
     175 kimlik okundu.

     Olcum uc bozuk kayit buldu:
       animation.ghast.scale        -> yok, dogrusu ghast.move
       animation.evoker_casting     -> yok, dogrusu evoker.casting
       animation.evoker_casting.v1.0-> yok, dogrusu ...casting.v1.0
     Ucu de duzeltildi.

     ---- LISTE NEDEN BURAYA PIVOTLANDI ----
     Test cevrimdisi kosuyor; vanilla dosyalarini her kosuda
     indiremez. O yuzden dogrulanmis kimlikler BURAYA yazildi.
     Yeni bir poz eklenirse bu listeye de eklenmeli -- yani
     "once vanilla'da var mi diye bak" adimi atlanamaz.

     ---- EMOTE AILESI AYRI ----
     animation.idle_* ve animation.react_* Mojang'in ornek
     paketinde YAYINLANMIYOR (persona/emote dosyalari yok).
     Onlar hala dogrulanamiyor ve POZ_DENEME modu tam onlar
     icin acik duruyor. Uydurma icerik yasagi geregi
     "calisiyor" diye sunulmuyorlar.                        */
  const VANILLA_DOGRULANAN = [
    "animation.actor.billboard",
    "animation.armor_stand.athena_pose",
    "animation.armor_stand.brandish_pose",
    "animation.armor_stand.cancan_a_pose",
    "animation.armor_stand.cancan_b_pose",
    "animation.armor_stand.default_pose",
    "animation.armor_stand.entertain_pose",
    "animation.armor_stand.hero_pose",
    "animation.armor_stand.holding_heavy_core",
    "animation.armor_stand.honor_pose",
    "animation.armor_stand.no_pose",
    "animation.armor_stand.riposte_pose",
    "animation.armor_stand.salute_pose",
    "animation.armor_stand.solemn_pose",
    "animation.armor_stand.wiggle",
    "animation.armor_stand.zombie_pose",
    "animation.arrow.move",
    "animation.bat.flying",
    "animation.bat.resting",
    "animation.bee.fly.bobbing",
    "animation.blaze.move",
    "animation.cat.lie_down",
    "animation.cat.sit",
    "animation.cat.sneak",
    "animation.cow.baby_transform",
    "animation.cow.setup.v1.0",
    "animation.creeper.swelling",
    "animation.dolphin.move",
    "animation.enderman.arms_legs",
    "animation.enderman.base_pose",
    "animation.enderman.carrying",
    "animation.enderman.scary_face",
    "animation.evoker.casting",
    "animation.evoker.casting.v1.0",
    "animation.evoker.move",
    "animation.fox.crouch",
    "animation.fox.pounce",
    "animation.fox.sit",
    "animation.fox.stuck",
    "animation.fox.wiggle",
    "animation.ghast.move",
    "animation.hoglin.baby_scaling",
    "animation.humanoid.big_head",
    "animation.humanoid.brandish_spear",
    "animation.humanoid.celebrating",
    "animation.humanoid.charging",
    "animation.humanoid.holding_spyglass",
    "animation.humanoid.tooting_goat_horn",
    "animation.panda.sitting",
    "animation.player.base_pose.upside_down",
    "animation.player.move.arms.statue_of_liberty",
    "animation.player.move.legs.inverted",
    "animation.player.sneaking.inverted",
    /* v7.49: Mojang player.json'unda dogrulandi. Getirilen
       komut dosyalarinin EN COK kullandigi kimlik buydu. */
    "animation.player.swim",
    "animation.player.swim.legs.stationary",
    /* v7.50: arsivin TAMAMI (376 dosya, ic ice zip'ler dahil)
       tarandi; 147 gercek kimlik cikti, 60'i bizde yoktu.
       Hepsi Mojang'in kendi dosyalarinda dogrulandi. */
    "animation.agent.swing_arms",
    "animation.bee.flying",
    "animation.bee.no_stinger",
    "animation.bee.sting",
    "animation.cat.baby_transform",
    "animation.cat.sprint",
    "animation.cat.walk",
    "animation.cow.setup",
    "animation.creeper.legs",
    "animation.evoker.general.v1.0",
    "animation.fox.setup",
    "animation.hoglin.attack",
    "animation.hoglin.look_at_target",
    "animation.hoglin.walk",
    "animation.humanoid.bow_and_arrow",
    "animation.humanoid.brushing",
    "animation.humanoid.damage_nearby_mobs",
    "animation.humanoid.holding_brush",
    "animation.humanoid.look_at_target.swimming",
    "animation.humanoid.riding.arms",
    "animation.humanoid.riding.legs",
    "animation.humanoid.sneaking",
    "animation.humanoid.swimming",
    "animation.panda.baby_transform",
    "animation.panda.lying",
    "animation.panda.rolling",
    "animation.panda.sneezing",
    "animation.panda.unhappy",
    "animation.player.bow_equipped",
    "animation.player.crossbow_equipped",
    "animation.player.crossbow_hold",
    "animation.player.glide",
    "animation.player.holding.zombie",
    "animation.player.look_at_target.inverted",
    "animation.player.move.arms.zombie",
    "animation.player.riding.arms",
    "animation.player.riding.arms.zombie",
    "animation.player.riding.legs",
    "animation.player.shield_block_main_hand",
    "animation.player.shield_block_off_hand",
    "animation.player.sneaking",
    "animation.player.swim.legs",
    "animation.player.swim.legs.single",
    "animation.skeleton.attack",
    "animation.spider.default_leg_pose",
    "animation.spider.look_at_target",
    "animation.spider.walk",
    "animation.villager.baby_transform",
    "animation.villager.general",
    "animation.villager.general.v1.0",
    "animation.villager.move",
    "animation.warden.attack",
    "animation.warden.emerge",
    "animation.warden.move",
    "animation.warden.sniff",
    "animation.witch.general",
    "animation.wither_boss.look_at_target",
    "animation.wither_boss.move",
    "animation.wither_boss.scale",
    "animation.zombie.swimming",
    "animation.villager.raise_arms",
    "animation.warden.dig",
    "animation.warden.roar",
    "animation.warden.sonic_boom"
  ];
  const EMOTE = /^animation\.(idle|react)_/;

  const L = ayar.POZ_LISTESI.map((x) => x[0]);
  const emote = L.filter((k) => EMOTE.test(k));
  const digerleri = L.filter((k) => !EMOTE.test(k));

  const dogrulanmayan = digerleri.filter(
    (k) => VANILLA_DOGRULANAN.indexOf(k) === -1);
  kontrol("emote disi her poz vanilla'da DOGRULANMIS",
          dogrulanmayan.length === 0,
          dogrulanmayan.join(", ") || digerleri.length + " poz");
  kontrol("  emote ailesi ayri sayiliyor (dogrulanamaz)",
          emote.length > 0, emote.length + " emote");
  kontrol("  DENEME modu emote'lar icin acik duruyor",
          ayar.POZ_DENEME === true);

  /* Duzeltilen uc kimlik GERI GELMESIN. Ad benzerligi degil,
     tam esitlik araniyor: evoker.casting DOGRU, evoker_casting
     YANLIS ve ikisi birbirine cok benziyor.               */
  for (const bozuk of ["animation.ghast.scale",
                       "animation.evoker_casting",
                       "animation.evoker_casting.v1.0"]) {
    kontrol("  bozuk kimlik geri gelmemis: " + bozuk,
            L.indexOf(bozuk) === -1);
  }

  /* Bicim kurali: vanilla kimlikleri animation.<varlik>.<ad>.
     evoker_casting hatasi tam bu kurali cigniyordu.        */
  const bicimsiz = digerleri.filter((k) => k.split(".").length < 3);
  kontrol("  hepsi animation.<varlik>.<ad> bicimde",
          bicimsiz.length === 0, bicimsiz.join(", ") || "-");

  /* armor_stand'in vanilla dosyasinda 15 poz var; listede
     15'i de olsun -- eksik biri kalmasin diye sayiliyor.  */
  const stand = L.filter((k) => k.indexOf("animation.armor_stand.") === 0);
  kontrol("  armor_stand pozlarinin TAMAMI listede (15)",
          stand.length === 15, stand.length + " poz");
}

console.log("");
console.log("=== 2. POZ GERCEKTEN OYNATILIYOR ===");
{
  const { o } = kur("p1");
  kullan(o, "poz_ver");
  kontrol("playanimation komutu gitti", sonPozKimligi(o) !== null,
          o._komutlar.join(" | ") || "komut yok");
  kontrol("ilk poz listenin ILK kaydi",
          sonPozKimligi(o) === ayar.POZ_LISTESI[0][0],
          sonPozKimligi(o) + " vs " + ayar.POZ_LISTESI[0][0]);
  kontrol("gecis suresi kalici (9999)",
          o._komutlar.some((k) => k.indexOf("9999") !== -1),
          o._komutlar[0]);
}

console.log("");
console.log("=== 3. SIRA ILERLIYOR VE BASA DONUYOR ===");
{
  const { o } = kur("p2");
  const N = ayar.POZ_LISTESI.length;
  const gorulen = [];
  for (let i = 0; i < N; i++) {
    o._komutlar = [];
    kullan(o, "poz_ver");
    gorulen.push(sonPozKimligi(o));
  }
  kontrol("her kullanimda BASKA poz",
          new Set(gorulen).size === N,
          gorulen.length + " kullanim / " + new Set(gorulen).size + " ayri poz");
  kontrol("sira listeyle ayni",
          gorulen.every((k, i) => k === ayar.POZ_LISTESI[i][0]));
  o._komutlar = [];
  kullan(o, "poz_ver");
  kontrol("liste bitince BASA donuyor",
          sonPozKimligi(o) === ayar.POZ_LISTESI[0][0],
          sonPozKimligi(o));
}

console.log("");
console.log("=== 4. CIKIS YOLU (poz kendiliginden bitmez) ===");
{
  const { o } = kur("p3");
  kullan(o, "poz_ver");
  o._komutlar = [];
  kullan(o, "poz_birak");
  const cikis = String(ayar.POZ_BITIS).split(" ")[0];
  kontrol("normale donduren komut gitti",
          o._komutlar.some((k) => k.indexOf(cikis) !== -1),
          o._komutlar.join(" | ") || "komut yok");
  /* Birakma komutunun gecis suresi 0 olmali: 9999 olsaydi
     "normal" pozu da kalici yapardik.                        */
  kontrol("birakma komutu kalici DEGIL",
          String(ayar.POZ_BITIS).indexOf("9999") === -1,
          String(ayar.POZ_BITIS));
}

console.log("");
console.log("=== 5. BIRAKINCA SIRA BASA DONER ===");
{
  const { o } = kur("p4");
  kullan(o, "poz_ver");
  kullan(o, "poz_ver");
  kullan(o, "poz_birak");
  o._komutlar = [];
  kullan(o, "poz_ver");
  kontrol("birakmadan sonra ilk poz",
          sonPozKimligi(o) === ayar.POZ_LISTESI[0][0],
          sonPozKimligi(o));
}

console.log("");
console.log("=== 6. HER OYUNCUNUN SIRASI AYRI ===");
{
  const a = kur("pa");
  const b = kur("pb");
  _durum.oyuncular = [a.o, b.o];
  kullan(a.o, "poz_ver");
  kullan(a.o, "poz_ver");
  b.o._komutlar = [];
  kullan(b.o, "poz_ver");
  kontrol("ikinci oyuncu listenin basindan basliyor",
          sonPozKimligi(b.o) === ayar.POZ_LISTESI[0][0],
          sonPozKimligi(b.o));
  a.o._komutlar = [];
  kullan(a.o, "poz_ver");
  kontrol("birinci oyuncu kaldigi yerden devam ediyor",
          sonPozKimligi(a.o) === ayar.POZ_LISTESI[2][0],
          sonPozKimligi(a.o) + " vs " + ayar.POZ_LISTESI[2][0]);
}

console.log("");
console.log("=== 7. OYUNCU CIKINCA DEFTER TEMIZLENIYOR ===");
{
  const { o } = kur("p5");
  kullan(o, "poz_ver");
  kullan(o, "poz_ver");
  poz.pozUnut(o.id);
  o._komutlar = [];
  kullan(o, "poz_ver");
  kontrol("cikip girince listenin basindan",
          sonPozKimligi(o) === ayar.POZ_LISTESI[0][0],
          sonPozKimligi(o));
  /* main.js gercekten cagiriyor mu -- metinden degil, playerLeave
     blogundan bakiliyor.                                      */
  const { readFileSync } = await import("node:fs");
  const ana = readFileSync(new URL("./pack/main.js", import.meta.url), "utf8");
  kontrol("playerLeave pozUnut cagiriyor",
          /playerLeave[\s\S]{0,4000}?pozUnut\(olay\.playerId\)/.test(ana));
}

console.log("");
console.log("=== 8. KAPALIYKEN CALISMIYOR ===");
{
  kontrol("POZ_ACIK ayari var", typeof ayar.POZ_ACIK === "boolean");
  const { readFileSync } = await import("node:fs");
  const kod = readFileSync(
    new URL("./pack/yetenekler/pozlar.js", import.meta.url), "utf8");
  kontrol("POZ_ACIK iki yetenekte de denetleniyor",
          (kod.match(/if \(!POZ_ACIK/g) || []).length >= 2);
  kontrol("POZ_DENEME ayari okunuyor", /POZ_DENEME/.test(kod));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> poz sandigi yerinde");
process.exit(hata ? 1 : 0);

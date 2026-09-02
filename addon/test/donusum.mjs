/* DONUSUM -- OYUNCU O SEY OLUYOR                          v4.89

   Kullanici: "buna donusebiliyor olmam lazim... aynı geometriyi
   kullan fakat SKIN olmalidir."

   ---- SKIN OLARAK YAPILAMIYOR ----
   Mojang skin paketlerinde OZEL GEOMETRIYI KALDIRDI. Resmi
   istemcide skins.json yalnizca geometry.humanoid.custom ve
   customSlim'i kabul ediyor, yani alti kollu bir govde SKIN
   olarak yuklenemiyor. Script'ten de oyuncu modeli
   degistirilemiyor.

   Calisan yol KILIK: oyuncu gorunmez olur, yerine
   pa:o_sey_kilik ciziliyor, her tick oyuncunun konumuna ve
   donusune isinlaniyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   Kiligin bir GORUNTU olarak kalmasi. Uc sinsi hata var ve
   ucu de oyunda ancak "bir tuhaflik" olarak fark edilirdi:

     1. gorunmezlik tazelenmezse oyuncu IKI bedenli gorunur
     2. kilik silinmezse ortada duran bir O Sey kalir
     3. kilik dovulebilir/itilebilirse oyuncuyla titresir      */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, varlikKaydet, _durum, world } from "@minecraft/server";
import { readFileSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

varlikKaydet("pa:bot", "pa:o_sey", "pa:o_sey_kilik");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const don = await import("./pack/yetenekler/donusum.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

const BAS = { x: 0.5, y: 90.6, z: 0.5 };
function kur(id = "d1") {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  _durum.varliklar = D.sayac.varliklar;
  don.donusumUnut();
  _durum.ozellikler.delete(ayar.DONUSUM_KAYIT_ANAHTAR);
  D.boyut._efektler = [];
  return { D, o };
}
const kiligi = (D) => D.sayac.varliklar.find(
  (v) => v.isValid && v.typeId === ayar.SEY_KILIK_KIMLIK);

console.log("=== 1. DONUSUM: GORUNMEZ OL, YERINE KILIK ===");
{
  const { D, o } = kur();
  const sonuc = don.donus(o);
  kontrol("donusum basarili", sonuc.donustu === true, JSON.stringify(sonuc));

  const k = kiligi(D);
  kontrol("kilik dogdu", !!k, k && k.typeId);
  kontrol("kilik O SEY'in kiligi, botun kendisi DEGIL",
          k && k.typeId === ayar.SEY_KILIK_KIMLIK && k.typeId !== ayar.SEY_KIMLIK);

  const efektler = (D.boyut._efektler || []).map((e) => e.ad);
  kontrol("oyuncu gorunmez oldu", efektler.includes("invisibility"),
          efektler.join(", ") || "efekt yok");
  /* Gorunmezligin parcaciklari kiligin icinden tasip "burada
     biri var" diye bagiriyordu.                              */
  const inv = (D.boyut._efektler || []).find((e) => e.ad === "invisibility");
  kontrol("gorunmezlik parcaciklari KAPALI",
          inv && inv.o && inv.o.showParticles === false);

  kontrol("defter donusuk diyor", don.donusukMu(o.id) === true);
  kontrol("donusuk sayisi 1", don.donusukSayisi() === 1);
}

console.log("");
console.log("=== 2. KILIK OYUNCUYU TAKIP EDIYOR ===");
{
  const { D, o } = kur("d2");
  don.donus(o);
  const k = kiligi(D);

  /* Oyuncu yurusun ve donsun. */
  o.location = { x: 12.25, y: 64, z: -7.5 };
  o._donus = { x: -30, y: 137 };
  tickIlerlet(1);

  const son = k._isinlanma[k._isinlanma.length - 1];
  kontrol("kilik oyuncunun konumuna geldi",
          son && Math.abs(son.x - 12.25) < 0.001 &&
          Math.abs(son.z - (-7.5)) < 0.001,
          son && (son.x + "," + son.y + "," + son.z));
  /* Y kaymasi 0: modelin ayaklari y=0'da. Kayma girseydi
     karakter yere gomulur ya da havada durur.                */
  kontrol("y kaymasi yok (ayaklar yerde)",
          son && Math.abs(son.y - (64 + ayar.DONUSUM_Y_KAYMA)) < 0.001);

  kontrol("kilik oyuncunun yonune donduruldu",
          k._donus && Math.abs(k._donus.y - 137) < 0.001,
          k._donus && JSON.stringify(k._donus));
  /* Bakis egimi (pitch) VERILMIYOR: modelin kafasi ayri bir
     animasyona bagli degil, x'i vermek butun govdeyi one
     egerdi.                                                   */
  kontrol("govde one egilmiyor (pitch verilmiyor)",
          k._donus && k._donus.x === 0);

  /* HER tick: daha seyrek olsaydi beden oyuncunun arkasindan
     surunurdu.                                                */
  const oncekiAdet = k._isinlanma.length;
  tickIlerlet(3);
  kontrol("her tick hizalaniyor",
          k._isinlanma.length - oncekiAdet === 3,
          (k._isinlanma.length - oncekiAdet) + " isinlanma / 3 tick");
}

console.log("");
console.log("=== 2b. ONDELEME: KILIK ARKADAN GELMIYOR ===");
{
  /* Kullanici tablette gordu: "sağa veya sola döndüğüm zaman ya
     da ani hareketlerde çok yavaş kalıyor... bildiğin arkamdan
     geliyor... benimle aynı derecede koşamıyor."

     TESHIS: hata scriptte DEGILDI -- 2. bolum kiligin her tick
     hizalandigini zaten olcuyor ve geciyordu. Gecikme (a) bir
     tick'lik kacinilmaz okuma gecikmesi ve (b) istemcinin
     varliklari guncellemeler arasinda yumusatarak cizmesinden
     geliyor. Cozum kiligi oyuncunun GIDECEGI yere koymak.

     BU BOLUM OLMASAYDI HICBIR SEY OLCULMEZDI: sahte oyuncuda
     getVelocity YOK, yani onceleme kodu 2. bolumde hic
     calismiyor -- testler yesil yanip yeni kodu hic
     yurutmuyordu (v7.6/7.7/7.8'in aynisi).                  */
  const { D, o } = kur("d2b");
  o.getVelocity = () => ({ x: 0.3, y: 0, z: 0 });   // saga kosuyor
  don.donus(o);
  const k = kiligi(D);
  tickIlerlet(1);
  const son = k._isinlanma[k._isinlanma.length - 1];

  const beklenen = 0.3 * ayar.KILIK_ONDELEME;
  kontrol("kilik oyuncunun ONUNE konuyor",
          son && son.x - o.location.x > 0.01,
          son ? (son.x - o.location.x).toFixed(3) + " blok ileri" : "yok");
  kontrol("  onceleme = hiz x KILIK_ONDELEME",
          son && Math.abs((son.x - o.location.x) - beklenen) < 0.001,
          son ? (son.x - o.location.x).toFixed(3) + " / beklenen " +
                beklenen.toFixed(3) : "yok");
  /* Y ONCELENMIYOR: ziplamada hiz tepe noktasinda isaret
     degistiriyor, dikey onceleme kiligi once havaya firlatir
     sonra yere gomerdi.                                      */
  kontrol("  dikeyde onceleme YOK (ziplama bozulmasin)",
          son && Math.abs(son.y - (o.location.y + ayar.DONUSUM_Y_KAYMA)) < 0.001);
}
{
  /* FIRLATILMA: ucurma/telekinez/TNT hizi bir anda buyutuyor.
     Tavan olmasaydi kilik metrelerce ileri firlardi.        */
  const { D, o } = kur("d2c");
  o.getVelocity = () => ({ x: 40, y: 0, z: 0 });    // firlatildi
  don.donus(o);
  const k = kiligi(D);
  tickIlerlet(1);
  const son = k._isinlanma[k._isinlanma.length - 1];
  const kayma = Math.hypot(son.x - o.location.x, son.z - o.location.z);
  kontrol("firlatilinca kilik ucup gitmiyor",
          kayma <= ayar.KILIK_ONDELEME_TAVAN + 0.001,
          kayma.toFixed(2) + " blok (tavan " + ayar.KILIK_ONDELEME_TAVAN + ")");
}
{
  /* DONUS: kullanicinin ilk sikayeti "saga veya sola dondugum
     zaman". Yaw da oncelenmeli.                              */
  const { D, o } = kur("d2d");
  o.getVelocity = () => ({ x: 0, y: 0, z: 0 });
  o._donus = { x: 0, y: 0 };
  don.donus(o);
  const k = kiligi(D);
  tickIlerlet(1);                        // ilk tick: onceki yaw kaydediliyor
  o._donus = { x: 0, y: 20 };            // bir tick'te 20 derece dondu
  tickIlerlet(1);
  kontrol("donuste de onceleme var",
          k._donus.y > 20.001,
          k._donus.y.toFixed(1) + " derece (oyuncu 20'de)");
  kontrol("  onceleme = fark x KILIK_DONUS_ONDELEME",
          Math.abs(k._donus.y - (20 + 20 * ayar.KILIK_DONUS_ONDELEME)) < 0.001,
          k._donus.y.toFixed(1) + " / beklenen " +
          (20 + 20 * ayar.KILIK_DONUS_ONDELEME).toFixed(1));

  /* 359 -> 5 derece: gercek donus +6, duz cikarma -354 der.
     Duz cikarma yapsaydik kilik ters yone firlardi.         */
  o._donus = { x: 0, y: 359 };
  tickIlerlet(1);
  o._donus = { x: 0, y: 5 };
  tickIlerlet(1);
  const ileri = k._donus.y - 5;
  kontrol("359 -> 5 derece dogru yone doniyor (kisa yol)",
          ileri > 0 && ileri <= ayar.KILIK_DONUS_TAVAN + 0.001,
          "+" + ileri.toFixed(1) + " derece ileri");

  /* Ani cevirme (bir tick'te 170 derece): tavan kessin. */
  o._donus = { x: 0, y: 0 };
  tickIlerlet(1);
  o._donus = { x: 0, y: 170 };
  tickIlerlet(1);
  kontrol("ani cevirmede tavan kesiyor",
          Math.abs(k._donus.y - (170 + ayar.KILIK_DONUS_TAVAN)) < 0.001,
          k._donus.y.toFixed(1) + " (tavan " + ayar.KILIK_DONUS_TAVAN + ")");
}
{
  /* getVelocity OLMAYAN surum: onceleme kapanir, ESKI davranis
     kalir -- yani paket olmez, sadece eski haline doner.     */
  const { D, o } = kur("d2e");
  o.getVelocity = undefined;
  don.donus(o);
  const k = kiligi(D);
  o.location = { x: 3, y: 64, z: 4 };
  tickIlerlet(1);
  const son = k._isinlanma[k._isinlanma.length - 1];
  kontrol("getVelocity yoksa kilik yine de hizalaniyor",
          son && Math.abs(son.x - 3) < 0.001 && Math.abs(son.z - 4) < 0.001,
          son ? son.x + "," + son.z : "yok");
}

console.log("");
console.log("=== 2c. PARCACIK: EMITTER YOK ===");
{
  /* Kullanici: "that thing halimde de ateş bitmiyor."
     Ayni sebep: `mobflame_EMITTER` tek seferlik bir puf degil,
     surekli puskuren bir KAYNAK.

     YORUMLAR AYIKLANIYOR -- "mobflame_emitter" artik
     donusum.js'in aciklama satirlarinda gecmiyor ama
     ayarlar.js'te geciyor ve bu arama kodu olcmeli.        */
  const ham = readFileSync(
    KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/donusum.js",
    "utf8");
  const kod = ham.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  kontrol("kodda emitter parcacigi YOK", !/_emitter/.test(kod),
          (kod.match(/[a-z_:]*_emitter/) || ["yok"])[0]);
  kontrol("  ayardaki parcacik da emitter DEGIL",
          !/_emitter$/.test(ayar.DONUSUM_PARCACIK), ayar.DONUSUM_PARCACIK);

  const { D, o } = kur("d2f");
  don.donus(o);
  const p = (D.sayac.parcacik || []).filter(
    (x) => x.tip === ayar.DONUSUM_PARCACIK);
  kontrol("halka atildi", p.length === ayar.DONUSUM_PARCACIK_ADET,
          p.length + " zerre (beklenen " + ayar.DONUSUM_PARCACIK_ADET + ")");
  kontrol("  sayisi SINIRLI (emitter gibi buyumuyor)",
          (D.sayac.parcacik || []).length <= ayar.DONUSUM_PARCACIK_ADET);
}

console.log("");
console.log("=== 3. GORUNMEZLIK TAZELENIYOR ===");
{
  /* Efekt olunce, sure dolunca ve SUT ICINCE siliniyor.
     Tazelenmeseydi oyuncu bir anda IKI bedenli gorunurdu --
     kalp sistemindeki dersin aynisi.                          */
  const { D, o } = kur("d3");
  don.donus(o);
  const ilk = (D.boyut._efektler || []).length;
  tickIlerlet(ayar.DONUSUM_TAZELEME + 2);
  const sonra = (D.boyut._efektler || []).length;
  kontrol("gorunmezlik tazelendi", sonra > ilk,
          ilk + " -> " + sonra + " efekt");

  kontrol("efekt suresi tazelemeden UZUN (bosluk kalmasin)",
          ayar.DONUSUM_SURE > ayar.DONUSUM_TAZELEME,
          ayar.DONUSUM_SURE + " > " + ayar.DONUSUM_TAZELEME);
}

console.log("");
console.log("=== 4. GERI DONUS ===");
{
  const { D, o } = kur("d4");
  don.donus(o);
  const k = kiligi(D);

  const sonuc = don.donus(o);      // ayni satir geri de donduruyor
  kontrol("ayni cagri geri donduruyor", sonuc.cikti === true,
          JSON.stringify(sonuc));
  kontrol("kilik silindi", k._kaldirildi === true);
  kontrol("gorunmezlik kaldirildi",
          (o._silinenEfektler || []).includes("invisibility"),
          (o._silinenEfektler || []).join(", "));
  kontrol("defter bosaldi", don.donusukSayisi() === 0);

  /* Tarama defter bosken hicbir sey yapmamali. */
  const oncekiIsinlanma = k._isinlanma.length;
  tickIlerlet(5);
  kontrol("bosken tarama bedava", k._isinlanma.length === oncekiIsinlanma);
}

console.log("");
console.log("=== 5. KILIK ORTADA KALMIYOR ===");
{
  /* Kilik kaybolursa (chunk bosaldi, biri /kill atti) oyuncu
     GORUNMEZ ve BEDENSIZ kalirdi -- en kotu sonuc.           */
  const { D, o } = kur("d5");
  don.donus(o);
  const k = kiligi(D);
  k.isValid = false;                       // varlik yok oldu
  tickIlerlet(2);
  kontrol("kilik kaybolunca donusum bitiyor", don.donusukMu(o.id) === false);
  kontrol("oyuncu gorunmez kalmiyor",
          (o._silinenEfektler || []).includes("invisibility"));
}
{
  /* Oyuncu cikinca kiligi da gitmeli. */
  const { D, o } = kur("d6");
  don.donus(o);
  const k = kiligi(D);
  don.donusumUnutOyuncu(o.id);
  kontrol("oyuncu cikinca kilik siliniyor", k._kaldirildi === true);
  kontrol("defterden de dusuyor", don.donusukSayisi() === 0);

  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("playerLeave bunu cagiriyor",
          /donusumUnutOyuncu\(olay\.playerId\)/.test(kaynak));
}
{
  /* Dunya yeniden yuklenince defter bosalir ama varlik yerinde
     kalir. Acilista taranip silinmeli.                        */
  const { D, o } = kur("d7");
  don.donus(o);
  const k = kiligi(D);
  don.donusumUnut();                       // script yeniden yuklendi
  don.donus(o);                            // ilk cagri oku()'yu tetikler
  kontrol("eski oturumun kiligi acilista silindi", k._kaldirildi === true);
}

console.log("");
console.log("=== 6. KILIK BIR GORUNTU, BIR DUSMAN DEGIL ===");
{
  const v = oku(BP + "/entities/o_sey_kilik.json")["minecraft:entity"];
  const b = v.components;

  /* Yercekimi ve carpisma acik kalsaydi oyuncuyla birbirlerini
     iteler ve titrerlerdi.                                    */
  kontrol("yercekimi kapali", b["minecraft:physics"].has_gravity === false);
  kontrol("carpisma kapali", b["minecraft:physics"].has_collision === false);
  kontrol("itilemez", b["minecraft:pushable"].is_pushable === false);
  kontrol("geri tepmez", b["minecraft:knockback_resistance"].value === 1.0);

  const ds = b["minecraft:damage_sensor"].triggers[0];
  kontrol("hicbir hasar almiyor",
          ds.cause === "all" && ds.deals_damage === false);
  kontrol("atesten etkilenmiyor", b["minecraft:fire_immune"] === true);

  /* Yapay zeka YOK: hedef secmiyor, saldirmiyor, gezmiyor.
     pa:o_sey'in savas davranislarini oyuncunun uzerine
     yapistirmak olurdu.                                       */
  const davranis = Object.keys(b).filter((x) => x.startsWith("minecraft:behavior"));
  kontrol("hicbir yapay zeka hedefi yok", davranis.length === 0,
          davranis.join(", ") || "yok");
  kontrol("saldiri bileseni yok", !("minecraft:attack" in b));
  kontrol("bilesen grubu yok",
          !v.component_groups || Object.keys(v.component_groups).length === 0);

  /* Yumurtasi olmamali: envanteri kirletmesin.                */
  kontrol("yumurtasi yok", v.description.is_spawnable === false);
  kontrol("summon ile cagrilabiliyor", v.description.is_summonable === true);

  /* pa_bot ailesinde: kendi botlarin ve Ilkel Besli sana
     saldirmasin.                                              */
  kontrol("pa_bot ailesinde",
          v.components["minecraft:type_family"].family.includes("pa_bot"));
  /* Lazer ve silahlar kendi kiligini vurmasin.                */
  kontrol("botTuruMu(kilik) dogru",
          ayar.botTuruMu(ayar.SEY_KILIK_KIMLIK) === true);
}

console.log("");
console.log("=== 7. AYNI GEOMETRI, AYNI DOKU ===");
{
  /* Kullanici: "aynı geometriyi kullan". Kilik ile O Sey ayni
     modeli ve ayni dokuyu kullanmali; ayrisirlarsa donusup
     cikinca baska bir karakter olurdun.                       */
  const kilik = oku(RP + "/entity/o_sey_kilik.entity.json")["minecraft:client_entity"].description;
  const sey = oku(RP + "/entity/o_sey.entity.json")["minecraft:client_entity"].description;

  kontrol("kimlik ayarlar.js ile ayni",
          kilik.identifier === ayar.SEY_KILIK_KIMLIK);
  kontrol("O SEY ile AYNI geometri",
          kilik.geometry.default === sey.geometry.default,
          kilik.geometry.default);
  kontrol("O SEY ile AYNI doku",
          kilik.textures.default === sey.textures.default,
          kilik.textures.default);
  kontrol("vanilla render controller",
          kilik.render_controllers.length === 1 &&
          kilik.render_controllers[0] === "controller.render.default");
  kontrol("yuruyus animasyonu da ayni",
          kilik.animations.yuru === sey.animations.yuru);
  /* Yumurtasi olmadigi icin yumurta rengi de olmamali. */
  kontrol("yumurta rengi yok", !("spawn_egg" in kilik));

  /* Geometri gercekten alti kollu mu -- o_sey.mjs bunu ayrica
     olcuyor, burada sadece bagin kopmadigi tutuluyor.        */
  const geo = oku(RP + "/models/entity/o_sey.geo.json")["minecraft:geometry"][0];
  kontrol("geometri hala alti kollu",
          geo.bones.filter((x) => /Arm/.test(x.name) && (x.cubes || []).length).length === 6,
          geo.bones.filter((x) => /Arm/.test(x.name) && (x.cubes || []).length).length + " kol");
}

console.log("");
console.log("=== 8. ULASILABILIYOR MU ===");
{
  /* v4.83 dersi: "calisiyor mu" ile "ulasilabiliyor mu" ayri
     iki soru.                                                 */
  const kayit = await import("./pack/yetenekler/kayit.js");
  if (kayit.tumYetenekler) {
    kontrol("yetenek kayitli",
            kayit.tumYetenekler().some((y) => y.kimlik === "donusum"));
  }
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js donusum.js'i import ediyor",
          kaynak.includes('import "./yetenekler/donusum.js";'));
  kontrol("menude satiri var",
          /yetenekTetikle\(oyuncu, "donusum"\)/.test(kaynak));
  /* Menu satiri DURUMA gore degismeli: yoksa "geri nasil
     donecegim" sorusu ortada kalir.                           */
  kontrol("menu satiri donusukken 'geri don' diyor",
          /donusukMu\(oyuncu\.id\)/.test(kaynak));
  kontrol("tarama merkezi tick'ten cagriliyor",
          /donusumTara\(oyuncular\)/.test(kaynak));

  /* Yeni kol acilmadi: "her seyi kol yapma".                  */
  const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
  /* ---- 6 -> 7  (v6.7) ----
     Bu satir "kol israfi" bekcisi: v4.33 ve v4.46'da dort+dort
     kol kaldirilmisti, sayi elle tutuluyor ki yeni kol SESSIZCE
     eklenemesin. Kanli Kol kullanicinin ACIK istegi
     ("ozellikle kanli kolu istiyorum"), o yuzden sayi bilerek
     yediye cikti. Bekci calismaya devam ediyor.            */
    /* ---- 7 -> 8  (v7.7) ----
     ANNA KOLU. Kullanicinin acik istegi ("Anna1545 Kolu'nu
     ekleyelim once"). Sayi YINE ELLE guncellendi -- otomatik
     saymak bekciyi olduruyor, cunku bekcinin isi tam olarak
     "yeni kol sessizce eklenmesin".
     Anna kol israfi degil: tek yetenegi (can_ver) BASKASINI
     iyilestiriyor ve depoda bunu yapan baska hicbir sey yok.  */
kontrol("izinsiz kol acilmadi (8 kol)",
          (uretec.match(/^\s*\("kol_\w+",/gm) || []).length === 8);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> donusum calisiyor: O Sey oluyorsun");
process.exit(hata ? 1 : 0);

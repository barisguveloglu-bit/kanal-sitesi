/* v7.43 DIS INCELEMESININ KAPATTIGI ACIKLAR          v7.44

   Kullanici raporu baska bir modele hazirlatip getirdi. Yedi
   madde vardi; hepsi TEK TEK dogrulandi, biri yanlis cikti.
   Bu dosya dogru cikanlarin bir daha acilmamasini tutuyor.

   Testin bicimi bilerek boyle: her bolum once RAPORUN CUMLESINI
   yaziyor, sonra olcuyor. Boylece bir satir dustugunde neyi
   koruduğu okunabiliyor -- "eskiden burada bir hata vardi"
   demek yetmiyor, HANGI hata oldugu yazili olmali.            */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";
const OMP = KOK + "/Simsek_Oyuncu_Modeli";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const gozcu = await import("./pack/yetenekler/gozcu.js");
const yard = await import("./pack/yardimcilar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* Gozcu'nun hareket taramasini besleyen sahte oyuncu. */
function oyuncuYap(D, id, x, y, z, boyutAdi) {
  const boyut = boyutAdi ? { id: boyutAdi } : D.boyut;
  return {
    id, typeId: "minecraft:player", isValid: true, name: id,
    dimension: boyut, location: { x, y, z },
    _etiket: new Set(), _mesaj: [], _efekt: new Map(),
    addEffect(a2, s2, sec) { this._efekt.set(a2, sec ? sec.amplifier : 0); return true; },
    removeEffect(a2) { this._efekt.delete(a2); return true; },
    getEffect(a2) { return this._efekt.has(a2)
      ? { amplifier: this._efekt.get(a2) } : undefined; },
    hasTag(t) { return this._etiket.has(t); },
    addTag(t) { this._etiket.add(t); return true; },
    sendMessage(m) { this._mesaj.push(String(m)); },
    getComponent: () => undefined,
    runCommand: () => ({ successCount: 1 }),
    onScreenDisplay: { setActionBar: () => {} }
  };
}

/* Bir olcum turu: tarama HAREKET_ORNEK tickte bir cagriliyor. */
function tara(oyuncular) {
  tickIlerlet(ayar.HAREKET_ORNEK);
  gozcu.hareketTara(oyuncular, () => false);
}

/* Gozcu suclamayi kac kez yazdi. */
function suclama() {
  return _durum.sohbet.filter((m) => String(m).includes("Gözcü")).length;
}
function sohbetiTemizle() { _durum.sohbet.length = 0; }

/* ================================================================
   1. ISINLANMA YANLIS POZITIFI
   Rapor: "Nether portalindan gecince koordinat 1/8'e dusuyor;
   x=800'de girip x=100'e cikan oyuncu tek ornekte 700 bloklu bir
   sicrama uretiyor ve HAREKET_SICRAMA=12 esigini kesin asiyor.
   Her portal kullaniminda sohbete uyari dusuyor."
   ================================================================ */
console.log("=== 1. PORTAL, OLUM VE INCI ===");
/* ---- OLCUM NEREDEN OKUNUYOR ----
   ILK YAZILISTA SOHBET SAYILIYORDU VE YANLISTI. Gozcu suclamayi
   ancak GOZCU_ESIK (4) isaretten sonra yaziyor; tek bir portal
   ornegi hicbir zaman sohbete dusmez. Yani "portal isaretlenmiyor"
   satiri, duzeltme KALDIRILDIGINDA BILE geciyordu -- mutasyon
   denemesi bunu gosterdi (uc mutasyon kacti).

   Artik ISARET SAYACI okunuyor: gozcuDurum(id).isaret. Isaret
   suclamanin ta kendisi degil, ama suclamayi ureten sey o ve
   tek ornekte gorunuyor.                                     */
const isaretSayisi = (id) => (gozcu.gozcuDurum(id) || { isaret: 0 }).isaret;

{
  const D = dunyaKur();
  _durum.boyut = D.boyut;
  gozcu.hareketUnut(); gozcu.afUnut(); gozcu.gozcuUnut(); sohbetiTemizle();

  /* KONTROL: ayni boyutta 700 blokluk sicrama isaretlenmeli.
     Bu satir dusuyorsa asagidakiler hicbir sey olcmuyor
     demektir -- Gozcu komple kor olmus olur.               */
  const h = oyuncuYap(D, "hileci", 800, 64, 0, "minecraft:overworld");
  tara([h]);
  h.location = { x: 100, y: 64, z: 0 };
  tara([h]);
  kontrol("ayni boyutta 700 blok ISARETLENIYOR (kontrol)",
          isaretSayisi("hileci") === 1, isaretSayisi("hileci") + " isaret");
  kontrol("  iz boyutu kaydediliyor",
          (gozcu.hareketDurum("hileci") || {}).boyut === "minecraft:overworld");

  /* PORTAL: AYNI sicrama, boyut degisik -> isaret YOK. */
  gozcu.hareketUnut(); gozcu.gozcuUnut();
  const p = oyuncuYap(D, "portalci", 800, 64, 0, "minecraft:overworld");
  tara([p]);
  p.dimension = { id: "minecraft:nether" };
  p.location = { x: 100, y: 64, z: 0 };
  tara([p]);
  kontrol("portal (boyut degisimi) ISARETLENMIYOR",
          isaretSayisi("portalci") === 0, isaretSayisi("portalci") + " isaret");
  kontrol("  yeni boyut ize yazildi",
          (gozcu.hareketDurum("portalci") || {}).boyut === "minecraft:nether");

  /* Boyut affi TEK ORNEKLIK: portaldan sonraki gercek sicrama
     yine yakalanmali.                                        */
  p.location = { x: 900, y: 64, z: 0 };
  tara([p]);
  kontrol("  portaldan SONRAKI sicrama yine isaretleniyor",
          isaretSayisi("portalci") === 1, isaretSayisi("portalci") + " isaret");
}
{
  /* ENDER INCISI: boyut ayni, sifirlanacak bir sey yok. Af
     mekanizmasi tam bunun icin.                             */
  const D = dunyaKur();
  _durum.boyut = D.boyut;
  gozcu.hareketUnut(); gozcu.afUnut(); gozcu.gozcuUnut(); sohbetiTemizle();
  const o = oyuncuYap(D, "incici", 0, 64, 0, "minecraft:overworld");
  tara([o]);
  gozcu.hareketAffet("incici");
  o.location = { x: 35, y: 64, z: 0 };      // inci menzili
  tara([o]);
  kontrol("ender incisi (af) ISARETLENMIYOR", isaretSayisi("incici") === 0,
          isaretSayisi("incici") + " isaret");

  /* AF TEK SEFERLIK: harcandi, ikincisi isaretlenmeli. Yoksa
     "inci at, sonra ucdan uca" isi yarardi.                */
  o.location = { x: 75, y: 64, z: 0 };
  tara([o]);
  kontrol("  af HARCANDI: ikinci sicrama isaretleniyor",
          isaretSayisi("incici") === 1, isaretSayisi("incici") + " isaret");
}
{
  /* Af SURELI: eski bir af bugunku sicramayi kurtarmamali. */
  const D = dunyaKur();
  _durum.boyut = D.boyut;
  gozcu.hareketUnut(); gozcu.afUnut(); gozcu.gozcuUnut(); sohbetiTemizle();
  const o = oyuncuYap(D, "eskici", 0, 64, 0, "minecraft:overworld");
  tara([o]);
  gozcu.hareketAffet("eskici");
  tickIlerlet(ayar.HAREKET_AF_TICK + 40);   // af suresi doldu
  o.location = { x: 40, y: 64, z: 0 };
  tara([o]);
  kontrol("suresi dolan af KURTARMIYOR", isaretSayisi("eskici") === 1,
          isaretSayisi("eskici") + " isaret");
}
{
  /* AF SICRAMAYA OZEL. Hiz ve yukselme olcumleri
     affedilMIYOR: inci ikisini de uretmez, yani af onlarin
     arkasina saklanmaya yaramamali.                        */
  const D = dunyaKur();
  _durum.boyut = D.boyut;
  gozcu.hareketUnut(); gozcu.afUnut(); gozcu.gozcuUnut(); sohbetiTemizle();
  const o = oyuncuYap(D, "ucucu", 0, 64, 0, "minecraft:overworld");
  tara([o]);
  gozcu.hareketAffet("ucucu");
  /* Sicrama esiginin ALTINDA kalan, ama surekli yukselen
     hareket: HAREKET_YUKSELME ornek ust uste.              */
  for (let i = 0; i <= ayar.HAREKET_YUKSELME; i++) {
    o.location = { x: 0, y: o.location.y + 1.0, z: 0 };
    tara([o]);
  }
  kontrol("af YUKSELMEYI kurtarmiyor", isaretSayisi("ucucu") >= 1,
          isaretSayisi("ucucu") + " isaret");
}

/* ================================================================
   2. BILDIRIM KIME GIDIYOR
   Rapor: "isaretle ve kipDenetle sohbeteYaz kullaniyor, yani
   world.sendMessage. Yanlis pozitif ciktiginda suclama tum
   sunucuya acik sekilde yaziliyor."
   ================================================================ */
console.log("");
console.log("=== 2. SUCLAMA HERKESE GITMIYOR ===");
{
  const D = dunyaKur();
  _durum.boyut = D.boyut;
  gozcu.hareketUnut(); gozcu.afUnut(); sohbetiTemizle();

  const yetkili = oyuncuYap(D, "yetkili", 0, 64, 0, "minecraft:overworld");
  const hileci = oyuncuYap(D, "hileci2", 0, 64, 0, "minecraft:overworld");
  yetkili.addTag(ayar.GOZCU_ETIKET);
  _durum.oyuncular = [yetkili, hileci];

  tara([hileci]);
  for (let i = 0; i < ayar.GOZCU_ESIK + 1; i++) {
    hileci.location = { x: hileci.location.x + 300, y: 64, z: 0 };
    tara([hileci]);
  }
  kontrol("etiketli varken HERKESE yazilmiyor", suclama() === 0,
          suclama() + " dunya mesaji");
  kontrol("  etiketli oyuncuya yazildi",
          yetkili._mesaj.some((m) => m.includes("Gözcü")),
          yetkili._mesaj.length + " mesaj");
  kontrol("  suclanan kisi kendi suclamasini GORMUYOR",
          !hileci._mesaj.some((m) => m.includes("Gözcü")));
}
{
  /* ETIKETLI KIMSE YOKSA KAPI ACIK. Boyle secildi: ayardan
     habersiz biri anticheat'i SESSIZCE kaybetmesin.        */
  const D = dunyaKur();
  _durum.boyut = D.boyut;
  gozcu.hareketUnut(); gozcu.afUnut(); sohbetiTemizle();
  const o = oyuncuYap(D, "hileci3", 0, 64, 0, "minecraft:overworld");
  _durum.oyuncular = [o];
  tara([o]);
  for (let i = 0; i < ayar.GOZCU_ESIK + 1; i++) {
    o.location = { x: o.location.x + 300, y: 64, z: 0 };
    tara([o]);
  }
  kontrol("etiketli kimse yoksa eskisi gibi herkese", suclama() > 0,
          suclama() + " dunya mesaji");
}

/* ================================================================
   3. KOMUT YETKISI
   Rapor: "SOHBET_ONEK varsayilan bos, yani sohbete duz 'can 10'
   yazan herkes kendine 10 kalp ekliyor; KALP_TAVAN=200."
   ================================================================ */
console.log("");
console.log("=== 3. KOMUT YETKISI ===");
{
  const sohbet = await import("./pack/sohbet.js");
  const D = dunyaKur();
  _durum.boyut = D.boyut;
  const sahip = oyuncuYap(D, "sahip", 0, 64, 0, "minecraft:overworld");
  const misafir = oyuncuYap(D, "misafir", 0, 64, 0, "minecraft:overworld");

  /* Once: kimse etiketli degil -> kapi acik. */
  _durum.oyuncular = [sahip, misafir];
  const acikCevap = sohbet.komutCozumle(misafir, "can 10");
  kontrol("etiketli kimse yokken 'can 10' CALISIYOR",
          !!acikCevap && !String(acikCevap.cevap).includes("⛔"),
          String(acikCevap && acikCevap.cevap).slice(0, 60));

  /* Sonra: sahip kendini etiketliyor -> misafir disari. */
  sahip.addTag(ayar.KOMUT_ETIKET);
  const kapali = sohbet.komutCozumle(misafir, "can 10");
  kontrol("etiketten sonra misafir 'can 10' YAZAMIYOR",
          !!kapali && String(kapali.cevap).includes("⛔"),
          String(kapali && kapali.cevap).slice(0, 60));
  const sahibin = sohbet.komutCozumle(sahip, "can 10");
  kontrol("  sahip HALA yazabiliyor",
          !!sahibin && !String(sahibin.cevap).includes("⛔"));

  /* KILIT ACMA KOMUTLARI ASLA KAPANMIYOR. Hapsedilen
     oyuncunun tek cikis yolu bunlar; yetkiye baglamak
     savunmayi silahtan etmek olurdu.                      */
  for (const k of ["arin", "savunma", "kafes"]) {
    const c = sohbet.komutCozumle(misafir, k);
    kontrol("  '" + k + "' yetkisiz oyuncuya HALA acik",
            !!c && !String(c.cevap).includes("⛔"),
            String(c && c.cevap).slice(0, 40));
  }
  kontrol("korumali liste kilit acma komutlarini ICERMIYOR",
          !ayar.KOMUT_KORUMALI.some((k) =>
            ["arin", "savunma", "kafes", "cik", "kir"].indexOf(k) >= 0),
          ayar.KOMUT_KORUMALI.join(", "));
}

/* ================================================================
   4. KALICI DEFTER TAVANI
   Rapor: "Bedrock'ta string dinamik ozellik siniri 32767 bayt;
   kayit basina ~300 bayttan yaklasik 100 benzersiz oyuncuda tavan
   doluyor. O noktada setDynamicProperty firlatiyor, hataYaz
   yutuyor ve ilerleme sessizce kaydedilmez oluyor."
   ================================================================ */
console.log("");
console.log("=== 4. DEFTER TAVANI ===");
{
  kontrol("tavan 32767'nin altinda (pay birakilmis)",
          ayar.DEFTER_TAVAN > 0 && ayar.DEFTER_TAVAN < 32767,
          String(ayar.DEFTER_TAVAN));

  /* Tavani asan bir defter: kirpilarak yazilmali, DUSMEMELI. */
  const kocaman = [];
  for (let i = 0; i < 900; i++) {
    kocaman.push(["oyuncu-kimligi-" + i, [["ates", 12], ["buz", 7]]]);
  }
  const ham = JSON.stringify(kocaman).length;
  const yazilan = yard.kaliciYaz(
    "simsek:test_defter", kocaman,
    (d, oran) => {
      const at = Math.max(1, Math.ceil(d.length * oran));
      return d.length > at ? d.slice(at) : undefined;
    }, ayar.DEFTER_TAVAN);
  kontrol("  ham defter tavani asiyordu (kontrol)", ham > ayar.DEFTER_TAVAN,
          ham + " bayt");
  kontrol("  yazilan tavanin altinda", !!yazilan && yazilan.length <= ayar.DEFTER_TAVAN,
          (yazilan ? yazilan.length : "yazilamadi") + " bayt");
  /* EN ESKI dusuyor: en yeni kayit KALMALI. Ters olsaydi
     aktif oyuncu her seferinde kaybederdi.                */
  kontrol("  en YENI kayit korundu",
          !!yazilan && yazilan.includes("oyuncu-kimligi-899"));
  kontrol("  en ESKI kayit dusuruldu",
          !!yazilan && !yazilan.includes("\"oyuncu-kimligi-0\""));

  /* Tavanin altindaki defter HIC kirpilmamali. */
  const kucuk = [["a", 1], ["b", 2]];
  const y2 = yard.kaliciYaz("simsek:test_defter2", kucuk,
                            (d, oran) => d.slice(
                              Math.max(1, Math.ceil(d.length * oran))),
                            ayar.DEFTER_TAVAN);
  kontrol("  tavan altindaki defter kirpilmiyor",
          y2 === JSON.stringify(kucuk), String(y2));
}

/* ================================================================
   5. BELLEK SIZINTILARI
   Rapor: "ilkelUnut seriler, asaUnut, dislerUnut cagiriyor ama
   isinBekleme.delete(botId) yok. Cagrilan her konsey uyesi olunce
   bir satir birakiyor. Ayni desen isinlar.js'teki bekleme
   haritasinda da var."
   ================================================================ */
console.log("");
console.log("=== 5. SIZINTILAR ===");
{
  /* Kaynak metinden okunuyor: bu bir BAGLANTI hatasiydi,
     davranis degil -- v7.24'te dort deftere temizlik
     yazilmis, besincisi atlanmisti. Ayni bicimde bir daha
     atlanmasin diye metin sinaniyor.                       */
  const soyut = (yol) => readFileSync(yol, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  const ilkel = soyut(BP + "/scripts/yetenekler/bot_ilkel.js");
  const m = ilkel.match(/export function ilkelUnut\(botId\) \{[\s\S]*?\n\}/);
  kontrol("ilkelUnut bulundu", !!m);
  kontrol("  isinBekleme temizleniyor",
          !!m && m[0].includes("isinBekleme.delete(botId)"));

  const isinlar = soyut(BP + "/scripts/yetenekler/isinlar.js");
  kontrol("isinlar.js bekleme temizligi export ediyor",
          isinlar.includes("export function isinBeklemeUnut"));
  const ana = soyut(BP + "/scripts/main.js");
  kontrol("  playerLeave onu cagiriyor",
          ana.includes("isinBeklemeUnut(olay.playerId)"));

  const vil = soyut(BP + "/scripts/yetenekler/viltrumite.js");
  const mv = vil.match(/export function viltrumiteUnutOyuncu\(oyuncuId\) \{[\s\S]*?\n\}/);
  kontrol("viltrumiteUnutOyuncu kanamayi da dusuruyor",
          !!mv && mv[0].includes("kanamaUnut(oyuncuId)"));

  /* playerSpawn hareket izini dusuruyor: olup yeniden dogmak
     da bir isinlanmadir. initialSpawn ERKEN CIKISININ USTUNDE
     olmali -- altinda kalsaydi asil vaka (olup dogma,
     initialSpawn=false) hic islenmezdi.                     */
  const spawn = ana.indexOf('olayaAbone("playerSpawn"');
  const unut = ana.indexOf("hareketUnut(olay.player.id)", spawn);
  const erken = ana.indexOf("if (!olay.initialSpawn) return;", spawn);
  kontrol("playerSpawn hareket izini dusuruyor", unut > spawn);
  kontrol("  initialSpawn erken cikisindan ONCE", unut > 0 && unut < erken,
          "unut@" + unut + " erken@" + erken);
}

/* ================================================================
   6. ALETLER GERCEKTEN ALET
   Rapor: "kns_void_kazma, kns_earl_kazma ... yalnizca damage +
   durability tasiyor. digger bileseni olmadan bunlar elle kazma
   hizinda kaziyor ve dogru alet sayilmiyor."
   ================================================================ */
console.log("");
console.log("=== 6. ALET BILESENLERI ===");
{
  const beklenen = {
    kns_earl_kazma: "minecraft:is_pickaxe",
    kns_void_kazma: "minecraft:is_pickaxe",
    kns_earl_balta: "minecraft:is_axe",
    kns_void_balta: "minecraft:is_axe",
    kns_earl_kurek: "minecraft:is_shovel",
    kns_void_kurek: "minecraft:is_shovel",
    kns_earl_capa:  "minecraft:is_hoe",
    kns_earl_kilic: "minecraft:is_sword",
  };
  for (const [kimlik, etiket] of Object.entries(beklenen)) {
    const y = BP + "/items/" + kimlik + ".json";
    if (!existsSync(y)) { kontrol(kimlik + " var", false); continue; }
    const c = oku(y)["minecraft:item"].components;
    const etiketler = (c["minecraft:tags"] || {}).tags || [];
    kontrol(kimlik + ": " + etiket, etiketler.indexOf(etiket) >= 0,
            etiketler.join(", "));
    /* Kilic kazmaz: ona digger VERILMEDI ve verilmemeli. */
    if (etiket === "minecraft:is_sword") {
      kontrol("  kilice digger verilmedi", !c["minecraft:digger"]);
    } else {
      kontrol("  digger var", !!c["minecraft:digger"]);
    }
  }
  /* Coklu alet UC etiketi birden tasiyor -- adi bu. */
  const coklu = oku(BP + "/items/kns_void_alet.json")["minecraft:item"]
                  .components["minecraft:tags"].tags;
  kontrol("void_alet uc alet etiketi birden",
          ["minecraft:is_pickaxe", "minecraft:is_axe", "minecraft:is_shovel"]
            .every((t) => coklu.indexOf(t) >= 0), coklu.join(", "));
}

/* ================================================================
   7. KUCUK TUTARSIZLIKLAR
   ================================================================ */
console.log("");
console.log("=== 7. KUCUK TUTARSIZLIKLAR ===");
{
  /* kureAnahtar: aralik artik OLCULUYOR, yalnizca yorumda
     yazmiyor. Rapor: "TOPRAK_HIZ 13'un ustune cikarilirsa
     sessiz anahtar cakismasi olur."                        */
  const a = yard.kureAnahtar(0, 0, 0);
  const b = yard.kureAnahtar(15, 15, 15);
  kontrol("kureAnahtar aralik ICINDE calisiyor",
          typeof a === "number" && typeof b === "number", a + " / " + b);
  kontrol("  aralik DISINDA undefined donuyor",
          yard.kureAnahtar(16, 0, 0) === undefined &&
          yard.kureAnahtar(0, 0, -17) === undefined);
  /* Cakisma gercekten olurdu: eski formul iki farkli noktaya
     ayni sayiyi verirdi. Kontrol satiri.                   */
  const eski = (x, y, z) => (x + 16) * 1024 + (y + 16) * 32 + (z + 16);
  kontrol("  korumasiz formulde cakisma VARDI (kontrol)",
          eski(0, 1, 0) === eski(0, 0, 32), "iki nokta tek anahtar");

  /* geometry.o_sey iki pakette de var. Rapor "biri
     guncellenirse sessizce ayrisir" dedi; ayrismaz cunku
     IKISI DE URETILIYOR -- ama bunu bir test soylemeli,
     yorum degil.                                          */
  const g1 = RP + "/models/entity/o_sey.geo.json";
  const g2 = OMP + "/models/entity/o_sey.geo.json";
  kontrol("o_sey geometrisi iki pakette de var",
          existsSync(g1) && existsSync(g2));
  kontrol("  ikisi BIREBIR ayni (ayrisamaz)",
          readFileSync(g1, "utf8") === readFileSync(g2, "utf8"));

  /* Gorunum paketi bagimliligi: uyari bir dize, oyun onu
     okumuyor. Bagimlilik yazilirsa paketi oyun kendisi acar. */
  const bpMan = oku(BP + "/manifest.json");
  const rpMan = oku(RP + "/manifest.json");
  const bag = (bpMan.dependencies || []).find((d) => d.uuid);
  kontrol("ana paket kaynak paketine bagimli", !!bag,
          JSON.stringify(bag || null));
  kontrol("  uuid kaynak paketin uuid'si",
          !!bag && bag.uuid === rpMan.header.uuid);
  /* Surum de eslesmeli: sabit yazilsaydi bir sonraki surumde
     bagimlilik cozulmez ve paket HIC acilmazdi.            */
  kontrol("  surum kaynak paketle ayni",
          !!bag && JSON.stringify(bag.version) ===
                   JSON.stringify(rpMan.header.version),
          JSON.stringify(bag && bag.version));

  /* Gizli esyalarin hepsi AYNI yontemle gizleniyor. */
  let ayriYontem = 0;
  for (let i = 1; i <= 4; i++) {
    const d = oku(BP + "/items/kns_dusmus_" + i + ".json")["minecraft:item"]
                .description;
    if (!d.menu_category || d.menu_category.category !== "none") ayriYontem++;
  }
  kontrol("gizli esyalar tek yontemle gizleniyor", ayriYontem === 0,
          ayriYontem + " esya farkli");

  /* Varlik dil anahtarlari: isim etiketi takilirsa ham kimlik
     gorunmesin. YUMURTA anahtari yazilMIYOR -- yumurtalari yok,
     olmayan bir seye ad vermek yanlis bilgi olurdu.         */
  const lang = readFileSync(RP + "/texts/en_US.lang", "utf8");
  for (const k of ["pa:kol_dusen_sag", "pa:kol_dusen_sol",
                   "pa:kol_gelen", "pa:o_sey_kilik"]) {
    kontrol(k + " adlandirilmis", lang.includes("entity." + k + ".name="));
    kontrol("  yumurta anahtari YOK (yumurtasi da yok)",
            !lang.includes("item.spawn_egg.entity." + k + ".name="));
  }
}

/* ================================================================
   8. SUZULME KOR NOKTASI  (v7.46)
   Toolbox For Turkey (io.mrarm.mctoolbox) menusunde "Elytra Fly"
   var ve bizde karsiligi yoktu. Ama asil bulgu o degil:

   `hareketMuaf` suzulmeyi TOPTAN muaf tutuyordu. Elytra takip
   suzulme durumunda kalan biri hiz, sicrama, yukselme ve kati
   blok denetimlerinin HEPSINI birden kapatiyordu -- Elytra Fly
   kullanmasa bile.
   ================================================================ */
console.log("");
console.log("=== 8. SUZULME KOR NOKTASI (v7.46) ===");
{
  const D = dunyaKur();
  _durum.boyut = D.boyut;
  gozcu.hareketUnut(); gozcu.afUnut(); gozcu.gozcuUnut();
  gozcu.roketUnut(); sohbetiTemizle();

  /* KONTROL: suzulmeyen bir oyuncu ayni yukselisi yaparsa
     ZATEN isaretleniyordu. Bu satir dusuyorsa asagidakiler
     hicbir sey olcmuyor demektir.                          */
  const y = oyuncuYap(D, "yerdeki", 0, 64, 0, "minecraft:overworld");
  tara([y]);
  for (let i = 0; i <= ayar.HAREKET_YUKSELME; i++) {
    y.location = { x: 0, y: y.location.y + 1.0, z: 0 };
    tara([y]);
  }
  kontrol("suzulmeyen yukselis isaretleniyor (kontrol)",
          isaretSayisi("yerdeki") >= 1, isaretSayisi("yerdeki") + " isaret");

  /* ELYTRA FLY: suzulurken roketsiz surekli tirmanis. */
  gozcu.hareketUnut(); gozcu.gozcuUnut(); gozcu.roketUnut();
  const e = oyuncuYap(D, "elytraci", 0, 64, 0, "minecraft:overworld");
  e.isGliding = true;
  tara([e]);
  for (let i = 0; i < ayar.SUZULME_ORNEK; i++) {
    e.location = { x: 0, y: e.location.y + 1.0, z: 0 };
    tara([e]);
  }
  kontrol("roketsiz suzulerek tirmanma ISARETLENIYOR",
          isaretSayisi("elytraci") >= 1, isaretSayisi("elytraci") + " isaret");

  /* MESRU SUZULME: roket atarak tirmanmak SUCLANMAMALI. */
  gozcu.hareketUnut(); gozcu.gozcuUnut(); gozcu.roketUnut();
  const r = oyuncuYap(D, "roketci", 0, 64, 0, "minecraft:overworld");
  r.isGliding = true;
  tara([r]);
  for (let i = 0; i < ayar.SUZULME_ORNEK + 3; i++) {
    gozcu.roketAtildi("roketci");             // her ornekte fisek
    r.location = { x: 0, y: r.location.y + 1.0, z: 0 };
    tara([r]);
  }
  kontrol("  roketle tirmanma SUCLANMIYOR", isaretSayisi("roketci") === 0,
          isaretSayisi("roketci") + " isaret");

  /* MESRU SUZULME: alcalarak suzulmek suclanmamali. */
  gozcu.hareketUnut(); gozcu.gozcuUnut(); gozcu.roketUnut();
  const a2 = oyuncuYap(D, "alcalan", 0, 200, 0, "minecraft:overworld");
  a2.isGliding = true;
  tara([a2]);
  for (let i = 0; i < ayar.SUZULME_ORNEK + 3; i++) {
    a2.location = { x: i * 15, y: 200 - i * 2, z: 0 };   // hizli ama ALCALIYOR
    tara([a2]);
  }
  kontrol("  alcalarak suzulme SUCLANMIYOR", isaretSayisi("alcalan") === 0,
          isaretSayisi("alcalan") + " isaret");

  /* KISA TIRMANIS (daliştan cikis) SUCLANMAMALI: esik ust uste
     SUZULME_ORNEK ornek istiyor.                            */
  gozcu.hareketUnut(); gozcu.gozcuUnut(); gozcu.roketUnut();
  const d2 = oyuncuYap(D, "dalisci", 0, 100, 0, "minecraft:overworld");
  d2.isGliding = true;
  tara([d2]);
  for (let i = 0; i < ayar.SUZULME_ORNEK - 1; i++) {
    d2.location = { x: 0, y: d2.location.y + 1.0, z: 0 };
    tara([d2]);
  }
  kontrol("  esigin ALTINDA tirmanis suclanmiyor",
          isaretSayisi("dalisci") === 0, isaretSayisi("dalisci") + " isaret");

  /* Suzulmenin OTEKI denetimleri hala muaf: roketli suzulme
     30+ blok/sn yapiyor, hiz denetimi acilirsa her suzulen
     oyuncu hileci sayilirdi.                                */
  gozcu.hareketUnut(); gozcu.gozcuUnut(); gozcu.roketUnut();
  const h = oyuncuYap(D, "hizli", 0, 100, 0, "minecraft:overworld");
  h.isGliding = true;
  tara([h]);
  h.location = { x: 400, y: 99, z: 0 };        // cok hizli ama alcaliyor
  tara([h]);
  kontrol("  suzulurken HIZ hala muaf", isaretSayisi("hizli") === 0,
          isaretSayisi("hizli") + " isaret");
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);

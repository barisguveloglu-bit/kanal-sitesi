import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, itemUseTetikle, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const w = console.warn; console.warn = () => {};
await import("./pack/main.js");
console.warn = w;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };

const ayar = await import("./pack/ayarlar.js");
const defter = await import("./pack/yetenekler/_ftech_defteri.js");
const ftech = await import("./pack/yetenekler/ftech.js");
const kayit = await import("./pack/yetenekler/kayit.js");

/* ================================================================
   F-TECH SIRT CANTASI -- OLCUM

   Kaynak: F-Tech: Equipment 1.0.1 (MIT, BillBodkin).
   Buradaki her sayi addon/REFERANS_FTECH.md'de hangi sinifin
   hangi alanindan geldigiyle birlikte yazili. Bu dosya o
   belgeyle KODUN ayrismadigini olcuyor.

   Iddia etmiyor, OLCUYOR: her bolumde ya sahte dunyada bir
   sey oluyor ya bir sayi karsilastiriliyor.
   ================================================================ */
let hata = 0;
function kontrol(ad, kosul, ek) {
  if (kosul) console.log("  ✓ " + ad + (ek ? "  ::  " + ek : ""));
  else { console.log("  ✗ " + ad + (ek ? "  ::  " + ek : "")); hata++; }
}

console.log("=== 1. KAYNAGIN SAYILARI AYARLARDA ===");
kontrol("kol sayisi 8 (BackpackArm enum)", ayar.FTECH_KOL === 8, ayar.FTECH_KOL);
kontrol("taban depo 1000 (BASE_CAPACITY)",
        ayar.FTECH_DEPO_TABAN === 1000, ayar.FTECH_DEPO_TABAN);
kontrol("taban menzil 1 (BASE_MAX_RANGE)",
        ayar.FTECH_MENZIL_TABAN === 1, ayar.FTECH_MENZIL_TABAN);
kontrol("yuva 9 (SLOT_COUNT)", ayar.FTECH_YUVA === 9, ayar.FTECH_YUVA);
kontrol("dovus menzili 10 (ATTACK_RANGE)",
        ayar.FTECH_DOVUS_MENZIL === 10, ayar.FTECH_DOVUS_MENZIL);
kontrol("hedefe en cok 2 kol (MAX_ARMS_PER_TARGET)",
        ayar.FTECH_DOVUS_KOL_HEDEF === 2, ayar.FTECH_DOVUS_KOL_HEDEF);
kontrol("kavrama menzili 10 (GRAB_RANGE)",
        ayar.FTECH_KAVRA_MENZIL === 10, ayar.FTECH_KAVRA_MENZIL);
kontrol("sarj 6..40 tick (THROW_MIN/MAX_CHARGE_TICKS)",
        ayar.FTECH_FIRLAT_ENAZ_SARJ === 6 && ayar.FTECH_FIRLAT_ENCOK_SARJ === 40);
kontrol("hiz 0.8..2.8 (MIN/MAX_THROW_SPEED)",
        ayar.FTECH_FIRLAT_ENAZ_HIZ === 0.8 && ayar.FTECH_FIRLAT_ENCOK_HIZ === 2.8);
kontrol("tutma adimi 0.35, sinir -1.75..6.0",
        ayar.FTECH_KAVRA_ADIM === 0.35 && ayar.FTECH_KAVRA_ENAZ === -1.75
        && ayar.FTECH_KAVRA_ENCOK === 6.0);
kontrol("yaprak koni 18 blok / 30 derece",
        ayar.FTECH_YAPRAK_MENZIL === 18 && ayar.FTECH_YAPRAK_ACI === 30);
kontrol("yaprak dusme 0.125, bekleme 20 tick",
        ayar.FTECH_YAPRAK_DUSME === 0.125 && ayar.FTECH_YAPRAK_BEKLEME === 20);

console.log("");
console.log("=== 2. YUKSELTME KURALLARI (allowsMultiple) ===");
{
  const tek = [...ayar.FTECH_YUKSELTMELER].filter(([, t]) => !t.coklu).map(([k]) => k);
  const cok = [...ayar.FTECH_YUKSELTMELER].filter(([, t]) => t.coklu).map(([k]) => k);
  kontrol("alti yukseltme yalniz bir kez", tek.length === 6, tek.join(", "));
  kontrol("dordu istiflenir (menzil + uc depo)", cok.length === 4, cok.join(", "));

  defter.ftechUnut("t2");
  const ilk = defter.yukseltmeTak("t2", "ftech_y_kazi");
  const ikinci = defter.yukseltmeTak("t2", "ftech_y_kazi");
  kontrol("tek kullanimlik ikinci kez REDDEDILIYOR",
          ilk.oldu === true && ikinci.oldu === false && ikinci.sebep === "tekrar",
          ikinci.sebep);

  defter.ftechUnut("t3");
  let kabul = 0;
  for (let i = 0; i < 12; i++) {
    if (defter.yukseltmeTak("t3", "ftech_y_menzil").oldu) kabul++;
  }
  kontrol("dokuz yuvadan fazlasi REDDEDILIYOR", kabul === 9, kabul + " kabul");
  kontrol("dolu yuva sayaci dogru", defter.doluYuva("t3") === 9, defter.doluYuva("t3"));
}

console.log("");
console.log("=== 3. KAPASITE VE MENZIL HESABI ===");
{
  defter.ftechUnut("t4");
  kontrol("bos cantada taban kapasite",
          defter.depoKapasitesi("t4") === 1000, defter.depoKapasitesi("t4"));
  defter.yukseltmeTak("t4", "ftech_y_depo1");   // +500
  defter.yukseltmeTak("t4", "ftech_y_depo2");   // +1000
  defter.yukseltmeTak("t4", "ftech_y_depo3");   // +2000
  kontrol("1000 + 500 + 1000 + 2000 = 4500",
          defter.depoKapasitesi("t4") === 4500, defter.depoKapasitesi("t4"));
  defter.yukseltmeTak("t4", "ftech_y_depo3");   // istiflenir
  kontrol("Mk.III istiflenince 6500",
          defter.depoKapasitesi("t4") === 6500, defter.depoKapasitesi("t4"));

  defter.ftechUnut("t5");
  kontrol("taban menzil 1", defter.kolMenzili("t5") === 1);
  defter.yukseltmeTak("t5", "ftech_y_menzil");
  defter.yukseltmeTak("t5", "ftech_y_menzil");
  kontrol("iki menzil yukseltmesi -> 3", defter.kolMenzili("t5") === 3,
          defter.kolMenzili("t5"));
}

console.log("");
console.log("=== 4. MODUL KAPISI: YUKSELTMESIZ CALISMIYOR ===");
{
  const D = dunyaKur();
  D.bloklar.hepsiDolu = true;
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 40.6, z: 0.5 });
  o.id = "kapi"; _durum.oyuncular = [];
  defter.ftechUnut(o.id);

  sus(); itemUseTetikle({ source: o, itemStack: { typeId: "pa:kol_ftech" } });
  tickIlerlet(200); ac();
  kontrol("Kazi modulu YOKKEN hicbir blok kirilmiyor",
          D.sayac.setType === 0, D.sayac.setType + " blok");

  defter.yukseltmeTak(o.id, "ftech_y_kazi");
  sus(); itemUseTetikle({ source: o, itemStack: { typeId: "pa:kol_ftech" } });
  tickIlerlet(200); ac();
  kontrol("Kazi modulu TAKILINCA kiriyor",
          D.sayac.setType > 0, D.sayac.setType + " blok");
}

console.log("");
console.log("=== 5. DOVUS: HEDEFE EN COK IKI KOL ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "dov"; _durum.oyuncular = [];
  defter.ftechUnut(o.id);
  defter.yukseltmeTak(o.id, "ftech_y_dovus");

  const hasarlar = [];
  D.boyut._varliklar = [{
    id: "z1", typeId: "minecraft:zombie", isValid: true,
    location: { x: 3.5, y: 90.6, z: 0.5 },
    addEffect: () => {}, applyImpulse: () => {}, applyKnockback: () => true,
    applyDamage(h) { hasarlar.push(h); return true; }
  }];

  const kayitliYetenek = kayit.yetenekAl("ftech_dovus");
  const is = kayitliYetenek.olustur(o);
  kontrol("dovus isi olusuyor", !!is);
  if (is) { for (let i = 0; i < 80 && !is.calis(); i++) tickIlerlet(1); }
  kontrol("tek hedefe verilen hasar 2 kol kadar (ENAZ_HASAR x 2)",
          hasarlar.length > 0 && hasarlar.every((h) => h === 2),
          hasarlar.join(","));
}

console.log("");
console.log("=== 6. FIRLATMA HIZI SARJLA OLCEKLENIYOR ===");
{
  /* Kaynak: sarj 6 tick -> 0.8, 40 tick -> 2.8, arasi dogrusal.
     Burada yetenegin kendi hesabi degil, AYNI formul iki uc
     nokta icin karsilastiriliyor -- formul kodda da burada da
     ayni yazilsaydi olcum hicbir sey sinamazdi, o yuzden
     GERCEK firlatma cagriliyor.                              */
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "fir"; _durum.oyuncular = [];
  defter.ftechUnut(o.id);
  defter.yukseltmeTak(o.id, "ftech_y_kavra");

  const kurban = () => ({
    id: "k1", typeId: "minecraft:pig", isValid: true,
    location: { x: 3.5, y: 90.6, z: 0.5 },
    _itildi: null, addEffect: () => {},
    applyDamage: () => true, applyKnockback: () => true,
    teleport(k) { this.location = k; },
    applyImpulse(i) { this._itildi = i; }
  });

  const y = kayit.yetenekAl("ftech_kavra");

  /* KISA SARJ: kavra, hemen birak. */
  D.boyut._varliklar = [kurban()];
  sus(); y.olustur(o); ac();
  sus(); y.olustur(o); ac();
  const kisa = D.boyut._varliklar[0]._itildi;
  kontrol("kisa sarjda firlatildi", !!kisa);

  /* UZUN SARJ: kavra, 40 tick bekle, birak. */
  D.boyut._varliklar = [kurban()];
  ftech.ftechUnutOyuncu(o.id);
  sus(); const tas = y.olustur(o); ac();
  for (let i = 0; i < 45; i++) { tickIlerlet(1); if (tas) tas.calis(); }
  sus(); y.olustur(o); ac();
  const uzun = D.boyut._varliklar[0]._itildi;
  kontrol("uzun sarjda firlatildi", !!uzun);

  if (kisa && uzun) {
    const h = (v) => Math.hypot(v.x, v.y, v.z);
    kontrol("uzun sarj daha hizli firlatiyor",
            h(uzun) > h(kisa), h(kisa).toFixed(2) + " -> " + h(uzun).toFixed(2));
  } else { hata++; }
}

console.log("");
console.log("=== 7. YAPRAK TEMIZLEYICI YALNIZ BITKIYE DOKUNUYOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "yap"; _durum.oyuncular = [];

  /* Onune bir yaprak, bir de tas koyuluyor. */
  D.boyut.getBlock({ x: 5, y: 90, z: 0 }).setType("minecraft:oak_leaves");
  D.boyut.getBlock({ x: 6, y: 90, z: 0 }).setType("minecraft:stone");
  D.sayac.yazilan.length = 0;

  sus(); itemUseTetikle({ source: o, itemStack: { typeId: "pa:ftech_yaprak" } });
  tickIlerlet(300); ac();

  const havaYapilan = D.sayac.yazilan.filter((b) => b.tip === "minecraft:air");
  const yaprakGitti = havaYapilan.some((b) => b.x === 5 && b.y === 90 && b.z === 0);
  const tasDuruyor = D.boyut.getBlock({ x: 6, y: 90, z: 0 }).typeId === "minecraft:stone";
  kontrol("yaprak temizlendi", yaprakGitti);
  kontrol("tasa DOKUNULMADI", tasDuruyor);
  kontrol("listede olmayan blok silinmedi",
          havaYapilan.every((b) => !(b.x === 6 && b.y === 90 && b.z === 0)));
}

console.log("");
console.log("=== 8. ESYALAR URETIMDE VAR VE TEMIZLIKTEN KURTULUYOR ===");
{
  const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
  const adlar = (uretec.match(/^\s*\("(ftech_[a-z0-9_]+)",/gm) || [])
    .map((x) => x.match(/"(ftech_[a-z0-9_]+)"/)[1]);
  kontrol("13 F-Tech esyasi tabloda", adlar.length === 13, adlar.length + " esya");

  /* ---- ILK YAZISTA BU KAYBOLDU ----
     `beklenen` listesine eklenmediginde temizlik adimi 13
     dosyayi AYNI kosuda siliyordu: esya JSON'u yaziliyor,
     atlas kaydi ve dil satiri kaliyor, dosya gidiyordu.
     CLAUDE.md'deki "URETENI de ara" kuralinin bir daha
     yasanmasi.                                             */
  kontrol("uretec temizlik listesine ekliyor",
          /for _ft3 in FTECH_ESYALAR:\s*\n\s*beklenen\.add\(_ft3\[0\]\)/.test(uretec));

  let eksikEsya = [], eksikIkon = [], eksikDil = [];
  const tr = readFileSync(KOK + "/Simsek_Kol_Kaynak/texts/tr_TR.lang", "utf8");
  const en = readFileSync(KOK + "/Simsek_Kol_Kaynak/texts/en_US.lang", "utf8");
  for (const ad of adlar) {
    if (!existsSync(KOK + "/Simsek_TNT_ToprakTopu/items/" + ad + ".json")) eksikEsya.push(ad);
    if (!existsSync(KOK + "/Simsek_Kol_Kaynak/textures/item/" + ad + ".png")) eksikIkon.push(ad);
    if (!tr.includes("item.pa:" + ad + ".name=") ||
        !en.includes("item.pa:" + ad + ".name=")) eksikDil.push(ad);
  }
  kontrol("hepsinin esya JSON'u var", eksikEsya.length === 0, eksikEsya.join(","));
  kontrol("hepsinin ikonu var", eksikIkon.length === 0, eksikIkon.join(","));
  kontrol("hepsinin iki dilde adi var", eksikDil.length === 0, eksikDil.join(","));

  kontrol("kol esyasi da uretimde",
          existsSync(KOK + "/Simsek_TNT_ToprakTopu/items/kol_ftech.json"));
  kontrol("kol sesi paketin icinde",
          existsSync(KOK + "/Simsek_Kol_Kaynak/sounds/ftech/ftech_kol.ogg"));
  const sd = JSON.parse(readFileSync(
    KOK + "/Simsek_Kol_Kaynak/sounds/sound_definitions.json", "utf8"));
  kontrol("ses tanimi kayitli",
          !!sd.sound_definitions[ayar.FTECH_SES], ayar.FTECH_SES);

  /* Iki 3B model kaynagin Java `elements` modelinden cevrildi;
     texture_size [32,32] okunmazsa UV'ler yariya iner.      */
  for (const ad of ["ftech_matkap", "ftech_yaprak"]) {
    const yol = KOK + "/Simsek_Kol_Kaynak/models/entity/" + ad + ".geo.json";
    kontrol(ad + " geometrisi var", existsSync(yol));
    if (existsSync(yol)) {
      const g = JSON.parse(readFileSync(yol, "utf8"));
      const d = g["minecraft:geometry"][0].description;
      kontrol(ad + " doku olcegi 32 (texture_size okundu)",
              d.texture_width === 32 && d.texture_height === 32,
              d.texture_width + "x" + d.texture_height);
    }
  }
}

console.log("");
console.log("=== 9. YETENEK KIMLIKLERI AYARLA UYUYOR ===");
{
  let eksik = [];
  for (const [, t] of ayar.FTECH_YUKSELTMELER) {
    if (t.acar && !kayit.yetenekAl(t.acar)) eksik.push(t.acar);
  }
  kontrol("acar alanindaki her yetenek kayitli", eksik.length === 0, eksik.join(","));

  const siralar = kayit.tumYetenekler()
    .filter((t) => t.kimlik.startsWith("ftech_") || t.kimlik.startsWith("tak_ftech"))
    .map((t) => t.sira);
  kontrol("F-Tech yeteneklerinin jest sirasi benzersiz",
          new Set(siralar).size === siralar.length,
          siralar.length + " yetenek");

  defter.ftechUnut("t9");
  defter.yukseltmeTak("t9", "ftech_y_depo2");
  const liste = ftech.yukseltmeListesi("t9");
  kontrol("menu listesi takiliyi gosteriyor",
          liste.length === 1 && liste[0].kimlik === "ftech_y_depo2" && liste[0].adet === 1,
          JSON.stringify(liste));
}

console.log("");
console.log("=== 10. GOREV KUYRUGU IS TAVANINI YUKSELTIYOR ===");
{
  /* v7.97.1: "Gorev Kuyrugu" yukseltmesi takilabiliyordu ama
     HICBIR SEY yapmiyordu -- kuyrukAcikMi() yazilmis, kimse
     cagirmamisti. Deponun taramasinda "hic tuketilmeyen tek
     export" olarak cikti.

     Oyuncunun alabildigi ama ise yaramayan bir esya, "sahte
     icerik yasak" kuralinin tam ortasi. Kuyruk artik main.js'te
     es zamanli is tavanini (AYNI_ANDA) yukseltiyor.

     Burada OLCULEN sey davranis degil BAG: defterin kapisi ile
     ayardaki sayi. main.js'in isTavani'si disari acilmiyor,
     onu metinden soruyoruz -- bag kopmasin diye.          */
  kontrol("FTECH_KUYRUK_EK ayarda var ve pozitif",
          typeof ayar.FTECH_KUYRUK_EK === "number" && ayar.FTECH_KUYRUK_EK > 0,
          String(ayar.FTECH_KUYRUK_EK));

  const kuyruklu = [...ayar.FTECH_YUKSELTMELER]
    .filter(([, t]) => t.kuyruk).map(([k]) => k);
  kontrol("kuyruk alanli tam bir yukseltme var",
          kuyruklu.length === 1, kuyruklu.join(","));

  defter.ftechUnut("t10");
  kontrol("yukseltmesiz: kuyruk KAPALI",
          defter.kuyrukAcikMi("t10") === false);
  defter.yukseltmeTak("t10", "ftech_y_depo1");
  kontrol("baska yukseltme kuyrugu ACMIYOR",
          defter.kuyrukAcikMi("t10") === false);
  defter.yukseltmeTak("t10", kuyruklu[0]);
  kontrol("kuyruk modulu takilinca ACIK",
          defter.kuyrukAcikMi("t10") === true);

  /* main.js gercekten BAGLADI mi: kaynak metninden soruluyor.
     Bu kontrol olmasaydi kuyrukAcikMi yine oksuz kalir ve
     tarama ayni bulguyu bir daha cikarirdi.               */
  const m = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/main.js", "utf8");
  kontrol("main.js kuyrukAcikMi'yi ICERI ALIYOR",
          /import\s*\{[^}]*kuyrukAcikMi[^}]*\}\s*from/.test(m));
  kontrol("main.js FTECH_KUYRUK_EK ile tavani BUYUTUYOR",
          /AYNI_ANDA\s*\+\s*FTECH_KUYRUK_EK/.test(m));
  kontrol("is kapilarinin hicbiri ciplak AYNI_ANDA'ya bakmiyor",
          !/oyuncuIsSayisi\([^)]*\)\s*>=\s*AYNI_ANDA\b/.test(m));
}

console.log("");
console.log(hata ? "HATA : " + hata : "temiz");
process.exit(hata ? 1 : 0);

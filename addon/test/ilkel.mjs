/* ILKEL BESLI -- v4.34

   Kullanicinin getirdigi liste bes PATRONU tarif ediyordu; istek
   "bunlar benim kisisel botlarim olacak" oldu.

   Bu dosyanin kilitledigi sey CEVIRI KURALI:

     sayilar   AYNEN korunur (can, hasar, iyilesme, efekt
               seviyesi, sure) -- listeden birebir
     hedefler  TERS CEVRILIR ("oyuncuya Yavaslik III" ->
               botun VURDUGU seye Yavaslik III)

   Ikisi de kolayca bozulur: biri sayiyi "dengelemek" icin
   degistirir, digeri sahibi kendi botuna korlestirir. Testler
   ikisini de tutuyor.

   Ayrica: varlik JSON'u ile ayarlar.js AYNI seyi soylemeli.
   Iki ayri yerde yazili sayilar sessizce ayrisir -- bu depoda
   dorduncu kez ayni ders.                                     */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import {
  tickIlerlet, varlikKaydet, esyaKaydet, esyaSil, _durum,
  vurusTetikle, hasarTetikle, mermiTetikle
} from "@minecraft/server";
import { readFileSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const BP = KOK + "/Simsek_TNT_ToprakTopu";

/* Bes uye ayri varlik (v4.35): sahte dunyanin varlik kayit
   defterine hepsi girmeli, yoksa spawnEntity reddediyor --
   gercek oyunda da oyle.                                     */
varlikKaydet("pa:bot", "pa:kajaros", "pa:miskel", "pa:harkos",
             "pa:raxxan", "pa:okazor");

/* Silahlar birer ESYA (v4.48): oyunun esya defterine kayitli
   olmadan ItemStack uretilemiyor -- gercek oyunda da oyle,
   kaynak paket etkin degilse ayni hatayi veriyor.            */
esyaKaydet("pa:ilkel_balta", "pa:ilkel_asa");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const defter = await import("./pack/yetenekler/_bot_defteri.js");
const ilkel = await import("./pack/yetenekler/bot_ilkel.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  _durum.varliklar = D.sayac.varliklar;
  defter.defteriUnut();
  _durum.ozellikler.delete(ayar.BOT_KAYIT_ANAHTAR);
  return { D, o };
}

/* Herhangi bir bot turu: artik alti tur var. */
const botu = (D) => D.sayac.varliklar.find(
  (v) => v.isValid && ayar.BOT_KIMLIKLER.has(v.typeId));

/* Sahte dunyanin varliginda can bileseni yok; ekliyoruz.
   Gercek API'de minecraft:health tam boyle davraniyor.        */
function canVer(varlik, tavan) {
  let simdiki = tavan;
  const eski = varlik.getComponent.bind(varlik);
  varlik.getComponent = (ad) => {
    if (ad === "minecraft:health") {
      return {
        get currentValue() { return simdiki; },
        effectiveMax: tavan,
        defaultValue: tavan,
        setCurrentValue(v) { simdiki = Math.min(tavan, v); }
      };
    }
    return eski(ad);
  };
  varlik._canOku = () => simdiki;
  varlik._canYaz = (v) => { simdiki = v; };
}

function hedef(id, tip = "minecraft:zombie", x = 2, z = 0) {
  return {
    id, typeId: tip, isValid: true,
    location: { x, y: 90, z },
    _efektler: [],
    _hasarlar: [],
    addEffect(ad, sure, se) { this._efektler.push({ ad, sure, se }); },
    applyDamage(miktar, se) { this._hasarlar.push({ miktar, se }); return true; }
  };
}

console.log("=== 1. HER UYE KENDI VARLIGI, KENDI SKINI ===");
{
  /* v4.35: bes uye pa:bot'un bilesen grubu DEGIL, ayri
     varliklar. Sebep tek: bir varligin tek dokusu olur.
     Cesitli doku icin gereken ozel render controller v4.28'de
     botu GORUNMEZ yapmisti; o yola bir daha girilmiyor.       */
  const RP = KOK + "/Simsek_Kol_Kaynak";

  for (const [anahtar, t] of ayar.ILKEL_BESLI) {
    kontrol(anahtar + ": kendi kimligi var", t.kimlik === "pa:" + anahtar,
            String(t.kimlik));

    const yol = BP + "/entities/ilkel_" + anahtar + ".json";
    let v;
    try {
      v = JSON.parse(readFileSync(yol, "utf8"))["minecraft:entity"];
    } catch (e) {
      kontrol(anahtar + ": sunucu varligi dosyasi var", false, e.message);
      continue;
    }
    kontrol(anahtar + ": sunucu varligi kimligi dogru",
            v.description.identifier === t.kimlik, v.description.identifier);

    const c = v.components;
    kontrol(anahtar + ": can ayarla ayni",
            c["minecraft:health"].value === t.can,
            "JSON " + c["minecraft:health"].value + " / ayar " + t.can);
    /* ---- TABAN + SILAH = AYARDAKI SAYI (v4.83) ----
       Elde tutulan silahin minecraft:damage'i mobun taban
       vurusuna EKLENIYOR. ILKEL_BESLI'deki sayi OYUNDA GORULEN
       TOPLAM, varlik JSON'undaki ise TABAN. Ikisi ayrisirsa
       kullanicinin gordugu hasar soyledigimizle tutmaz -- bu
       depoda tam olarak bu hata v4.66'da yasandi.            */
    const silahHasari = ayar.silahHasari(ayar.ilkelSilahi(anahtar));
    kontrol(anahtar + ": taban + silah = ayardaki hasar",
            c["minecraft:attack"].damage + silahHasari === t.hasar,
            "JSON " + c["minecraft:attack"].damage + " + silah " +
            silahHasari + " = " + (c["minecraft:attack"].damage + silahHasari) +
            " / ayar " + t.hasar);

    /* ---- v4.66: HICBIR GRUP ISTATISTIGI GOLGELEYEMEZ ----

       Kullanici: "Okazor 50 kalp vurdugunu soyledin ama
       iskeleti IKI vuruslta oldurdu... verdigin bilgi ile
       oyundaki hasar uyusmuyor."

       Hakliydi ve yukaridaki iki sinama bunu GORMUYORDU,
       cunku ikisi de sadece components'a bakiyor. Hata
       component_groups'taydi:

         components      attack 100   <- uyenin, dogru
         pa:savas grubu  attack 14    <- normal bottan miras

       Bedrock'ta grup EKLENINCE icindekiler temel bilesenlerin
       USTUNE yaziliyor. Uye savasa girer girmez hasari 14'e
       (7 kalp) dusuyordu. Iskelet 20 can: 14 oldurmuyor,
       ikinci vurus olduruyor -- gozlemin birebir aciklamasi.

       Ustelik saldirganlik hedefi de (v4.60) pa:savas icinde,
       yani "saldirgan olmak" ile "zayif olmak" ayni anda
       geliyordu.

       Ayni sey hizda: pa:takip herkesi 0.32'ye esitliyordu.

       KURAL: uyenin istatistigi neyse o gecerlidir. Tek
       istisna pa:bekle'nin movement 0'i -- o istatistik degil,
       DURUM ("bekle" = "kimildama").                         */
    for (const [grup, ic] of Object.entries(v.component_groups || {})) {
      if (grup === "pa:bekle") continue;
      for (const bilesen of ["minecraft:attack", "minecraft:health",
                             "minecraft:movement"]) {
        if (ic[bilesen] === undefined || c[bilesen] === undefined) continue;
        kontrol(anahtar + ": " + grup + " grubu " + bilesen + " golgelemiyor",
                false,
                "grup " + JSON.stringify(ic[bilesen]) +
                " temeli (" + JSON.stringify(c[bilesen]) + ") eziyor");
      }
    }

    /* Botun ailesi SART: "pa_bot" olmadan botlar birbirini
       dover (savas suzgeci bu aileye bakiyor).                */
    kontrol(anahtar + ": pa_bot ailesinde",
            c["minecraft:type_family"].family.includes("pa_bot"),
            c["minecraft:type_family"].family.join(", "));
    kontrol(anahtar + ": sahiplenilebiliyor (takip bunun sarti)",
            c["minecraft:tameable"] !== undefined);
    kontrol(anahtar + ": yerden esya topluyor (normal bot gibi)",
            c["minecraft:behavior.pickup_items"] !== undefined);

    /* ISTEMCI tarafi: cizim yolu botunkiyle BIREBIR ayni
       olmali. Ozel render controller = gorunmez bot.          */
    const i = JSON.parse(readFileSync(
      RP + "/entity/ilkel_" + anahtar + ".entity.json", "utf8"))["minecraft:client_entity"].description;
    kontrol(anahtar + ": vanilla render controller (ozel DEGIL)",
            i.render_controllers.length === 1 &&
            i.render_controllers[0] === "controller.render.default",
            i.render_controllers.join(", "));
    kontrol(anahtar + ": tek doku (dizi/variant YOK)",
            Object.keys(i.textures).length === 1 &&
            i.textures.default === "textures/entity/ilkel_" + anahtar,
            JSON.stringify(i.textures));
    kontrol(anahtar + ": bot geometrisini kullaniyor",
            i.geometry.default === "geometry.simsek_bot");

    const doku = RP + "/textures/entity/ilkel_" + anahtar + ".png";
    let boyut = 0;
    try { boyut = readFileSync(doku).length; } catch (e) { boyut = 0; }
    kontrol(anahtar + ": skin dosyasi diskte", boyut > 500, boyut + " bayt");
  }

  /* Bes skin BIRBIRINDEN FARKLI olmali: ayni dosya iki kez
     kopyalanmis olsa kimse fark etmezdi.                     */
  const imzalar = new Set();
  for (const anahtar of ayar.ILKEL_BESLI.keys()) {
    imzalar.add(readFileSync(RP + "/textures/entity/ilkel_" + anahtar + ".png")
                  .toString("base64").slice(0, 200));
  }
  kontrol("bes skin de birbirinden FARKLI", imzalar.size === 5,
          imzalar.size + " ayri dosya");

  /* Normal botun cizimi bozulmadi mi: bu degisiklik ona
     dokunmamaliydi.                                          */
  const bot = JSON.parse(readFileSync(RP + "/entity/bot.entity.json", "utf8"))
    ["minecraft:client_entity"].description;
  kontrol("normal botun cizimi DEGISMEDI",
          bot.render_controllers[0] === "controller.render.default" &&
          bot.textures.default === "textures/entity/bot",
          bot.textures.default);

  /* pa:bot'ta artik ilkel grubu kalmamali (olu yapilandirma). */
  const anaBot = JSON.parse(readFileSync(BP + "/entities/bot.json", "utf8"))
    ["minecraft:entity"];
  const kalan = Object.keys(anaBot.component_groups)
    .filter((k) => k.startsWith("pa:ilkel"));
  kontrol("pa:bot'ta artik ilkel bilesen grubu YOK", kalan.length === 0,
          kalan.join(", ") || "temiz");

  /* Geri itilme bagisikligi: listede UC uyede yaziyordu. */
  const oku = (a) => JSON.parse(readFileSync(
    BP + "/entities/ilkel_" + a + ".json", "utf8"))["minecraft:entity"].components;
  for (const a of ["kajaros", "raxxan", "okazor"]) {
    kontrol(a + ": geri itilmeye bagisikli",
            oku(a)["minecraft:knockback_resistance"] !== undefined);
  }
  for (const a of ["miskel", "harkos"]) {
    kontrol(a + ": bagisiklik YOK (listede yazmiyordu)",
            oku(a)["minecraft:knockback_resistance"] === undefined);
  }
  /* ---- SALDIRGANLIK (v4.60) ----
     Kullanici: "bana zombi vurdugunda ilk algilamadi,
     ikincide algiladilar." Sebep: hedef ARAMA davranisi
     yoktu, sadece tepki vardi -- ilk darbeyi yiyene kadar
     dusmandan haberleri olmuyordu.                          */
  for (const anahtar of ayar.ILKEL_BESLI.keys()) {
    const g = JSON.parse(readFileSync(
      BP + "/entities/ilkel_" + anahtar + ".json", "utf8"))
      ["minecraft:entity"];
    const av = g.component_groups["pa:savas"]
                ["minecraft:behavior.nearest_attackable_target"];
    kontrol(anahtar + ": kendi hedefini ARIYOR (beklemiyor)",
            av !== undefined);
    /* SADECE monster: koyun, inek, koylu guvende. Bir koruma
       ekibinin ciftligi dagitmasi ozellik degil zarar.       */
    kontrol(anahtar + ": sadece DUSMAN (monster) hedefliyor",
            av && av.entity_types[0].filters.value === "monster",
            av ? String(av.entity_types[0].filters.value) : "-");
    /* within_radius ile follow_range AYRISIRSA bot 20 blokta
       hedefi secip 16'da unutuyor -- "bazen kovaliyor" gibi
       sinsi bir hata. Ikisi ayni olmali.                     */
    kontrol(anahtar + ": takip menzili av yaricapiyla AYNI",
            g.components["minecraft:follow_range"].value === av.within_radius,
            g.components["minecraft:follow_range"].value + " / " + av.within_radius);
  }

  /* NORMAL BOT tepkisel KALMALI: v4.22'de "ormanda odun
     toplarken her koyune saldirmasin" diye bilincli
     birakilmisti. Ayrim korunuyor.                          */
  const anaBotSavas = JSON.parse(readFileSync(BP + "/entities/bot.json", "utf8"))
    ["minecraft:entity"].component_groups["pa:savas"];
  kontrol("NORMAL bot hala tepkisel (kendi dusman aramiyor)",
          anaBotSavas["minecraft:behavior.nearest_attackable_target"] === undefined);

  kontrol("miskel MENZILLI (mermi atar)",
          oku("miskel")["minecraft:behavior.ranged_attack"] !== undefined &&
          oku("miskel")["minecraft:shooter"] !== undefined);
  kontrol("harkos SICRAR (havada kisa mesafe ziplama)",
          oku("harkos")["minecraft:behavior.leap_at_target"] !== undefined);
}

console.log("");
console.log("=== 1b. RUTBE SIRASI ===");
{
  const sira = ilkel.rutbeSirasi();

  /* SIRANIN TAMAMI kullanicinin karari (v4.36):
       Okazor > Miskel > Kajaros > Raxxan > Harkos
     Bu satir onun bekcisi. Ileride "canina gore dizelim" diye
     bir duzeltme yapilirsa burada patlar -- ki yapilmamali:
     bu ekipte buyu askeri rutbenin ustunde, Miskel 1750 canli
     Kajaros'un amiri.                                        */
  const BEKLENEN = ["okazor", "miskel", "kajaros", "raxxan", "harkos"];
  kontrol("hiyerarsi kullanicinin belirledigi gibi",
          sira.join(",") === BEKLENEN.join(","), sira.join(" > "));
  kontrol("Okazor LIDER (basindan beri sabit)", sira[0] === "okazor", sira[0]);
  kontrol("Harkos EN ALT (basindan beri sabit)",
          sira[sira.length - 1] === "harkos", sira[sira.length - 1]);

  /* Rutbe CAN sirasi DEGIL: bilincli. Kajaros ekibin en
     canlisi ama ucuncu sirada.                               */
  const canSirasi = [...ayar.ILKEL_BESLI.keys()]
    .sort((a, b) => ayar.ILKEL_BESLI.get(b).can - ayar.ILKEL_BESLI.get(a).can);
  kontrol("rutbe, can siralamasindan BAGIMSIZ (kasitli)",
          canSirasi.join(",") !== sira.join(","),
          "can sirasi: " + canSirasi.join(" > "));

  const r = [...ayar.ILKEL_BESLI.values()].map((t) => t.rutbe).sort();
  kontrol("rutbeler 1..5, tekrar YOK", r.join(",") === "1,2,3,4,5", r.join(","));

  /* ---- GOLGE IKILISI: AJAN, CIRAGINDAN GUCLU ----  (v4.55)
     Kullanicinin tespiti: "El-Harkos en alt rutbe ama
     Raxxan'dan daha guclu." Dogruydu -- Harkos 2600 can
     tasirken Golge Ajani 2000'de kalmisti.

     Rutbe genel olarak guc sirasi DEGIL (ustteki test bunu
     kilitliyor: bu ekipte buyu askeri rutbenin ustunde). Ama
     AYNI KOLDAKI ikili kendi arasinda tutarli olmali: usta
     ciraktan gucludur. Golge Ajani ile Golge Ciragi ayni
     zincirin iki halkasi, o yuzden bu iki satir var.

     Ayni gerekce pasiflerde de uygulanmisti (Raxxan Hiz II,
     Harkos Hiz I) -- v4.48. Sayilar oraya v4.55'te yetisti. */
  const R = ayar.ILKEL_BESLI.get("raxxan");
  const H = ayar.ILKEL_BESLI.get("harkos");
  kontrol("Golge Ajani, Ciragindan CANLI", R.can > H.can,
          "raxxan " + R.can + " > harkos " + H.can);
  kontrol("Golge Ajani, Ciragindan VURUCU", R.hasar > H.hasar,
          "raxxan " + R.hasar + " > harkos " + H.hasar);

  for (const [anahtar, t] of ayar.ILKEL_BESLI) {
    kontrol(anahtar + ": unvani var",
            typeof t.unvan === "string" && t.unvan.length > 2, t.unvan);
  }
}

console.log("=== 2. CAGIRMA ===");
{
  const { D, o } = kur("i2");
  sus(); const s = ilkel.ilkelCagir(o, "kajaros"); ac();

  kontrol("Kajaros cagrildi", s.dogdu === true, s.hata || s.ad);
  const bot = botu(D);
  kontrol("KENDI varligi olarak dogdu (kendi skini icin)",
          bot.typeId === "pa:kajaros", bot.typeId);
  kontrol("kimlik varliga yazildi",
          ilkel.ilkelKimligi(bot) === "kajaros",
          String(ilkel.ilkelKimligi(bot)));
  kontrol("isim etiketinde RUTBE ve UNVAN var",
          typeof bot.nameTag === "string" && bot.nameTag.includes("Kajaros") &&
          bot.nameTag.includes("[3]") && bot.nameTag.includes("Muhafız"),
          bot.nameTag || "yok");
  kontrol("normal bot defterine de girdi (canta/teslim/is calissin)",
          defter.botSayisi("i2") === 1);

  /* "Bunlar beni ozel koruyanlar": ekip savasi kapali olsa bile
     savasa hazir dogmalilar.                                  */
  kontrol("koruma gorevi acik dogdu",
          bot._olaylar.includes(ayar.BOT_OLAY_SAVAS_AC),
          bot._olaylar.join(", "));

  sus(); const s2 = ilkel.ilkelCagir(o, "kajaros"); ac();
  kontrol("AYNI uyeden ikincisi cagrilamaz", s2.hata !== undefined, s2.hata);

  sus(); const s3 = ilkel.ilkelCagir(o, "okazor"); ac();
  kontrol("BASKA uye cagrilabilir", s3.dogdu === true, s3.hata || s3.ad);
  kontrol("ikisi de listede", ilkel.ilkelListesi("i2").length === 2,
          ilkel.ilkelListesi("i2").join(", "));
}

console.log("");
console.log("=== 3. VURUS EFEKTLERI DUSMANA GIDIYOR (ceviri kurali) ===");
{
  const { D, o } = kur("i3");
  sus(); ilkel.ilkelCagir(o, "kajaros"); ac();
  const bot = botu(D);
  const zombi = hedef("z1");

  vurusTetikle({ damagingEntity: bot, hitEntity: zombi });

  const adlar = zombi._efektler.map((e) => e.ad);
  kontrol("zombiye Yavaslik verildi", adlar.includes("slowness"), adlar.join(", "));
  kontrol("zombiye Bulanti verildi", adlar.includes("nausea"), adlar.join(", "));
  kontrol("zombiye Korluk verildi", adlar.includes("blindness"), adlar.join(", "));

  /* Listede "7,5 saniyeligine Yavaslik III" yaziyordu:
     150 tick, amplifier 2 (III = 2).                          */
  const yav = zombi._efektler.find((e) => e.ad === "slowness");
  kontrol("sure listedeki gibi (7,5 sn = 150 tick)", yav.sure === 150,
          yav.sure + " tick");
  kontrol("seviye listedeki gibi (III -> amplifier 2)",
          yav.se.amplifier === 2, String(yav.se.amplifier));

  /* EN ONEMLI SATIR: sahibine gitmedi. */
  kontrol("SAHIBINE hicbir efekt gitmedi (ceviri kurali)",
          (D.boyut._efektler || []).length === 0,
          (D.boyut._efektler || []).map((e) => e.ad).join(", ") || "temiz");
}

console.log("");
console.log("=== 4. VURULUNCA IYILESME ===");
{
  /* Rakamlar AYARLARDAN geliyor, elle yazilmiyor. v4.41'de
     canlar ve iyilesmeler kalp cinsine cevrilip ikiye
     katlandi; elle yazilsaydi bu test sessizce eski rakami
     sinamaya devam ederdi.                                   */
  const t = ayar.ILKEL_BESLI.get("kajaros");
  const { D, o } = kur("i4");
  sus(); ilkel.ilkelCagir(o, "kajaros"); ac();
  const bot = botu(D);
  canVer(bot, t.can);
  bot._canYaz(1000);

  hasarTetikle({ hurtEntity: bot, damage: 5 });
  kontrol("Kajaros vurulunca +" + t.vurulunca + " can (" +
          (t.vurulunca / 2) + " kalp)",
          bot._canOku() === 1000 + t.vurulunca, bot._canOku() + " can");

  bot._canYaz(t.can - 5);
  hasarTetikle({ hurtEntity: bot, damage: 5 });
  kontrol("TAVAN asilmiyor", bot._canOku() === t.can, bot._canOku() + " can");
}
{
  const t = ayar.ILKEL_BESLI.get("miskel");
  const { D, o } = kur("i4b");
  sus(); ilkel.ilkelCagir(o, "miskel"); ac();
  const bot = botu(D);
  canVer(bot, t.can);
  bot._canYaz(500);
  hasarTetikle({ hurtEntity: bot, damage: 5 });
  kontrol("Miskel vurulunca +" + t.vurulunca + " can (Kajaros'tan farkli)",
          bot._canOku() === 500 + t.vurulunca, bot._canOku() + " can");

  /* Miskel'in iyilesmesi Kajaros'unkinin IKI KATI olmali --
     kaynak listede 40'a 20 yaziyordu. Ters cevrilirse bu
     satir yakalar (bir kez ters cevrildi).                   */
  kontrol("Miskel, Kajaros'un iki kati iyilesiyor",
          t.vurulunca === 2 * ayar.ILKEL_BESLI.get("kajaros").vurulunca,
          t.vurulunca + " / " + ayar.ILKEL_BESLI.get("kajaros").vurulunca);
}

console.log("");
console.log("=== 5. MISKEL: IKI SECENEKTEN BIRI (OYUNCUYA KARSI) ===");
{
  const { D, o } = kur("i5");
  sus(); ilkel.ilkelCagir(o, "miskel"); ac();
  const bot = botu(D);

  /* Listede "Korluk XVI (6 sn) VEYA Solgunluk VII (4 sn)"
     yaziyordu. Yazi tura OYUNCUYA karsi aynen duruyor -- orada
     Korluk gercekten yikici. (Moba karsi ne oldugu 5b'de.)   */
  const gorulen = new Set();
  for (let i = 0; i < 40; i++) {
    const p = hedef("m" + i, "minecraft:player");
    vurusTetikle({ damagingEntity: bot, hitEntity: p });
    for (const e of p._efektler) gorulen.add(e.ad);
  }
  kontrol("oyuncuya karsi Korluk de Solgunluk da cikti (VEYA)",
          gorulen.has("blindness") && gorulen.has("wither"),
          [...gorulen].join(", "));

  const z = hedef("mk", "minecraft:player");
  let kor;
  for (let i = 0; i < 40 && !kor; i++) {
    z._efektler.length = 0;
    vurusTetikle({ damagingEntity: bot, hitEntity: z });
    kor = z._efektler.find((e) => e.ad === "blindness");
  }
  kontrol("Korluk XVI -> amplifier 15", kor && kor.se.amplifier === 15,
          kor ? String(kor.se.amplifier) : "cikmadi");
  kontrol("Korluk suresi 6 sn = 120 tick", kor && kor.sure === 120,
          kor ? String(kor.sure) : "-");
}

console.log("");
console.log("=== 5b. MISKEL MOBA KARSI ETKISIZ DEGIL (v4.47) ===");
{
  /* Kullanici bildirdi: "Miskel digerlerine gore etkisiz
     kaliyor, mob'a saldirttim." Uc ayri sebep vardi ve ucu de
     burada kilitleniyor.                                     */
  const t = ayar.ILKEL_BESLI.get("miskel");
  const { D, o } = kur("i5b");
  sus(); ilkel.ilkelCagir(o, "miskel"); ac();
  const bot = botu(D);

  /* ---- 1) OK ARTIK HASARINI TASIYOR ----
     Bedrock'ta okun hasari aticinin attack.damage'inden
     bagimsiz. Miskel'in 28 hasari oynanista hic
     kullanilmiyordu: vurus basina ~2 kalp.                   */
  const z = hedef("okz");
  mermiTetikle({ source: bot, kurban: z });
  const ek = z._hasarlar[0];
  kontrol("okun degmesi hasar veriyor", ek !== undefined,
          z._hasarlar.length + " hasar");
  kontrol("hasar ayardaki degere ESITLENIYOR (uydurulmuyor)",
          ek && ek.miktar === t.hasar - ayar.ILKEL_OK_TABAN,
          ek ? ek.miktar + " + ok " + ayar.ILKEL_OK_TABAN + " = " +
               (ek.miktar + ayar.ILKEL_OK_TABAN) + " / ayar " + t.hasar : "-");
  kontrol("zirhi delen cins (buyucu icin dogru olan)",
          ek && ek.se && ek.se.cause === "magic",
          ek && ek.se ? String(ek.se.cause) : "-");
  kontrol("hasarin sahibi bot (mob ona donsun)",
          ek && ek.se && ek.se.damagingEntity === bot);

  /* ---- 2) IMZA YETENEGI OKLA DA TETIKLENIYOR ----
     v4.46'ya kadar Korluk/Solgunluk sadece entityHitEntity'ye
     bagliydi; menzilli bir varlik neredeyse hic yakin dovuse
     girmiyor, yani yetenek pratikte olu koddu.               */
  kontrol("okla imza yetenegi de tetikleniyor",
          z._efektler.length > 0,
          z._efektler.map((e) => e.ad).join(", ") || "hicbiri");

  /* ---- 3) MOBA KORLUK ATILMIYOR ----
     Korluk moblarda hicbir sey yapmiyor. Yazi turanin yarisi
     bosa gidiyordu.                                          */
  const mobEfektleri = new Set();
  for (let i = 0; i < 60; i++) {
    const m = hedef("mob" + i);
    mermiTetikle({ source: bot, kurban: m });
    for (const e of m._efektler) mobEfektleri.add(e.ad);
  }
  kontrol("moba HER ZAMAN Solgunluk (ise yarayan taraf)",
          mobEfektleri.has("wither"), [...mobEfektleri].join(", "));
  kontrol("moba Korluk ATILMIYOR (bosa giden yari kalkti)",
          !mobEfektleri.has("blindness"), [...mobEfektleri].join(", "));

  /* Yakin dovuste de ayni suzgec gecerli olmali -- iki ayri
     yol, tek kural.                                          */
  const yakinMob = new Set();
  for (let i = 0; i < 60; i++) {
    const m = hedef("ym" + i);
    vurusTetikle({ damagingEntity: bot, hitEntity: m });
    for (const e of m._efektler) yakinMob.add(e.ad);
  }
  kontrol("yakin dovuste de moba Korluk yok",
          !yakinMob.has("blindness") && yakinMob.has("wither"),
          [...yakinMob].join(", "));
}
{
  /* Ok sahibine ya da ekip arkadasina degerse ekstra hasar
     BINMEMELI. Yoksa kendi buyucun seni oldururdu.           */
  const { D, o } = kur("i5c");
  sus(); ilkel.ilkelCagir(o, "miskel"); ac();
  const bot = botu(D);
  sus(); ilkel.ilkelCagir(o, "okazor"); ac();
  const arkadas = D.sayac.varliklar.find((v) => v.typeId === "pa:okazor");

  o._hasarlar = [];
  o.applyDamage = function (m, se) { this._hasarlar.push({ m, se }); return true; };
  mermiTetikle({ source: bot, kurban: o });
  kontrol("ok SAHIBINE hasar vermiyor", o._hasarlar.length === 0,
          o._hasarlar.length + " hasar");

  arkadas._hasarlar = [];
  arkadas.applyDamage = function (m, se) { this._hasarlar.push({ m, se }); return true; };
  mermiTetikle({ source: bot, kurban: arkadas });
  kontrol("ok EKIP ARKADASINA hasar vermiyor",
          arkadas._hasarlar.length === 0, arkadas._hasarlar.length + " hasar");

  /* Ok bloga carparsa hedef yok: patlamamali. */
  let patladi = false;
  try { mermiTetikle({ source: bot, kurban: undefined }); }
  catch (e) { patladi = true; }
  kontrol("ok bloga carpinca hata vermiyor", !patladi);

  /* Gercek bir OYUNCU dusman: Miskel'in asil parladigi yer.
     dusmanMi() oyunculari eliyor (aura icin); ok yolu onu
     KULLANMAMALI, yoksa PvP'de yine etkisiz kalirdi.         */
  const rakip = hedef("pvp", "minecraft:player", 6, 0);
  mermiTetikle({ source: bot, kurban: rakip });
  kontrol("ok DUSMAN OYUNCUYA tam hasar veriyor",
          rakip._hasarlar.length === 1 &&
          rakip._hasarlar[0].miktar === t2().hasar - ayar.ILKEL_OK_TABAN,
          rakip._hasarlar.map((h) => h.miktar).join(", ") || "hic");
}
function t2() { return ayar.ILKEL_BESLI.get("miskel"); }
{
  /* Yakin dovusteki uyeler bundan etkilenmemeli: Okazor'un
     serisi okla degil, yumrukla isliyor.                     */
  const { D, o } = kur("i5d");
  sus(); ilkel.ilkelCagir(o, "kajaros"); ac();
  const bot = botu(D);
  const z = hedef("kz");
  mermiTetikle({ source: bot, kurban: z });
  kontrol("Kajaros'un da oku olsa hasari kendi degerinden",
          z._hasarlar.length === 1 &&
          z._hasarlar[0].miktar ===
            ayar.ILKEL_BESLI.get("kajaros").hasar - ayar.ILKEL_OK_TABAN,
          z._hasarlar.map((h) => h.miktar).join(", ") || "hic");
}

console.log("");
console.log("=== 5e. SILAHLAR: UYEYE OZEL (v4.48, v4.49) ===");
{
  /* v4.48: tek balta, besinin de elinde.
     v4.49: "bu normalde de zaten el-harkos'un elinde bulunan
     bir esyaydi" -> El-Harkos asa tasiyor, digerleri balta.   */
  const RP = KOK + "/Simsek_Kol_Kaynak";
  const atlas = JSON.parse(readFileSync(RP + "/textures/item_texture.json", "utf8"));

  /* Kullanilan butun silahlar: ESLEMEDEN turetiliyor, elle
     yazilmiyor. Yeni bir silah eklenince kendi kendine giriyor. */
  const silahlar = new Set([ayar.ILKEL_SILAH_VARSAYILAN,
                            ...ayar.ILKEL_SILAH.values()]);
  kontrol("iki ayri silah var (balta + asa)", silahlar.size === 2,
          [...silahlar].join(", "));

  for (const tam of silahlar) {
    const kisa = tam.replace("pa:", "");
    let esya;
    try {
      esya = JSON.parse(readFileSync(BP + "/items/" + kisa + ".json", "utf8"))["minecraft:item"];
    } catch (e) { esya = undefined; }
    kontrol(kisa + ": esyasi var", esya !== undefined);
    kontrol(kisa + ": kimlik ayardakiyle ayni",
            esya && esya.description.identifier === tam,
            esya ? esya.description.identifier : "-");

    /* ---- BEKCI DARALDI, KALKMADI (v4.83) ----
       Eskiden: "silahta HIC hasar olmasin." Sebebi dogruydu --
       elde tutulan esyanin damage'i mobun vurusuna EKLENIYOR,
       yani sessizce uyenin sayisini sisirir.

       Ama asa oyuncunun elinde de kullanilan bir silah oldu ve
       hasarsiz bir silah yumruk kadar vuruyordu. Artik kural:
         - BALTA hala hasarsiz (onu tasiyan dort uyenin sayisi
           varlik JSON'unda ve orada kalmali)
         - ASA hasar tasiyor, ama El-Harkos'un taban vurusu o
           kadar DUSURULMUS olmali; toplam ayardaki sayiyi
           vermeli. Asagidaki bolum bunu ayrica sinliyor.     */
    /* ---- BEKCI DEGISTI (v4.84) ----
       Eski kural "silahta HIC hasar olmasin"di ve sebebi
       dogruydu: elde tutulan esyanin damage'i mobun vurusuna
       EKLENIYOR. Ama iki silah da oyuncunun kullandigi gercek
       silah oldu; hasarsiz olanlari yumruk kadar vuruyordu.

       Yeni kural DAHA SIKI: silahin hasari ayardaki tabloda
       YAZIYOR olmali. Boylece hem esya olu kalmiyor, hem de
       taban hesabi (asagidaki bolum) o sayiyi dusurebiliyor.
       Tabloya yazilmayan bir silaha hasar verilirse uyenin
       vurusu sessizce siser -- asil korunan sey bu.         */
    kontrol(kisa + ": hasari ayardaki tabloda",
            esya && esya.components["minecraft:damage"] ===
              ayar.silahHasari(tam),
            JSON.stringify(esya && esya.components["minecraft:damage"]) +
            " / tablo " + ayar.silahHasari(tam));
    kontrol(kisa + ": elde tutulur (hand_equipped)",
            esya && esya.components["minecraft:hand_equipped"] === true);

    let boyut = 0;
    try { boyut = readFileSync(RP + "/textures/item/" + kisa + ".png").length; }
    catch (e) { boyut = 0; }
    kontrol(kisa + ": dokusu diskte", boyut > 200, boyut + " bayt");
    kontrol(kisa + ": doku atlasa kayitli (yoksa mor-siyah cikar)",
            atlas.texture_data[kisa] !== undefined);
  }

  /* Iki doku BIRBIRINDEN FARKLI olmali: ayni dosya iki kez
     kopyalanmis olsa kimse fark etmezdi (skinlerde ayni test). */
  const imzalar = new Set([...silahlar].map((t) =>
    readFileSync(RP + "/textures/item/" + t.replace("pa:", "") + ".png")
      .toString("base64").slice(0, 200)));
  kontrol("balta ile asa AYNI dosya degil", imzalar.size === silahlar.size,
          imzalar.size + " ayri dosya");

  /* Geometride tutamak kemigi -- oyun eldeki esyayi buraya
     ciziyor, kemik yoksa esya HIC gorunmuyor.                 */
  const geo = JSON.parse(readFileSync(
    RP + "/models/entity/simsek_bot.geo.json", "utf8"))["minecraft:geometry"][0];
  const el = geo.bones.find((b) => b.name === "rightItem");
  kontrol("geometride rightItem kemigi var", el !== undefined,
          geo.bones.map((b) => b.name).join(", "));
  kontrol("tutamak kemiginin KUPU yok (cizime hicbir sey eklemiyor)",
          el && (el.cubes === undefined || el.cubes.length === 0));
  kontrol("tutamak sag kola bagli", el && el.parent === "rightArm",
          el ? String(el.parent) : "-");

  const istemci = JSON.parse(readFileSync(
    RP + "/entity/ilkel_okazor.entity.json", "utf8"))["minecraft:client_entity"].description;
  kontrol("cizim yolu DEGISMEDI (hala vanilla controller)",
          istemci.render_controllers.length === 1 &&
          istemci.render_controllers[0] === "controller.render.default",
          istemci.render_controllers.join(", "));

  /* ---- IKI TARAFIN ESLEMESI AYNI MI ----
     Varlik JSON'unda accepted_items, script tarafinda ele
     konulan esya var. Ayrisirlarsa silah ele KONULMAZ ve
     hicbir hata gorunmez -- bu depoda dordunculuk ayni ders. */
  for (const anahtar of ayar.ILKEL_BESLI.keys()) {
    const c = JSON.parse(readFileSync(
      BP + "/entities/ilkel_" + anahtar + ".json", "utf8"))["minecraft:entity"].components;
    const eq = c["minecraft:equippable"];
    kontrol(anahtar + ": equippable var (silah ele konabilsin)", eq !== undefined);
    const kabul = eq && eq.slots[0].accepted_items;
    kontrol(anahtar + ": varlik JSON'u ile ayar AYNI silahi soyluyor",
            kabul && kabul[0] === ayar.ilkelSilahi(anahtar),
            (kabul ? kabul[0] : "-") + " / " + ayar.ilkelSilahi(anahtar));
  }

  kontrol("El-Harkos ASA tasiyor (kullanici bildirdi)",
          ayar.ilkelSilahi("harkos") === "pa:ilkel_asa",
          ayar.ilkelSilahi("harkos"));
  for (const a of ["okazor", "miskel", "kajaros", "raxxan"]) {
    kontrol(a + ": balta tasiyor (varsayilan)",
            ayar.ilkelSilahi(a) === "pa:ilkel_balta", ayar.ilkelSilahi(a));
  }

  const bc = JSON.parse(readFileSync(
    BP + "/entities/ilkel_kajaros.json", "utf8"))["minecraft:entity"].components;
  kontrol("topladigini eline almiyor (silah kalsin)",
          bc["minecraft:behavior.pickup_items"]
            .can_pickup_to_hand_or_equipment === false);
}
{
  /* Cagirinca gercekten ele koniyor mu -- ve DOGRU silah mi. */
  const { D, o } = kur("i5e");
  for (const anahtar of ilkel.rutbeSirasi()) {
    sus(); ilkel.ilkelCagir(o, anahtar); ac();
  }
  const uyeler = D.sayac.varliklar.filter(
    (v) => v.isValid && ilkel.ilkelKimligi(v));
  kontrol("bes uye de dogdu", uyeler.length === 5, uyeler.length + " uye");

  const silahli = uyeler.filter(
    (v) => v._el && v._el.typeId === ayar.ilkelSilahi(ilkel.ilkelKimligi(v)));
  kontrol("BESININ DE elinde KENDI silahi var", silahli.length === 5,
          uyeler.map((v) => ilkel.ilkelKimligi(v) + "=" +
                     (v._el ? v._el.typeId.replace("pa:ilkel_", "") : "bos")).join(" "));

  const h = uyeler.find((v) => ilkel.ilkelKimligi(v) === "harkos");
  kontrol("El-Harkos'un elinde ASA (baltanin degil)",
          h && h._el && h._el.typeId === "pa:ilkel_asa",
          h && h._el ? h._el.typeId : "bos");

  /* Silah duserse tarama geri koymali (dunya yeniden
     yuklendiginde de bu yol calisiyor) -- ve DOGRUSUNU.       */
  h._el = undefined;
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); defter.botTara([o]); ac();
  kontrol("dusen silah taramada geri geliyor (dogrusu)",
          h._el && h._el.typeId === "pa:ilkel_asa",
          h._el ? h._el.typeId : "bos");

  /* Yanlis silah eline gecerse duzeltmeli: pickup_items
     kapatildi ama baska bir yol acilirsa bu satir tutar.      */
  h._el = { typeId: "pa:ilkel_balta" };
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); defter.botTara([o]); ac();
  kontrol("YANLIS silah duzeltiliyor", h._el.typeId === "pa:ilkel_asa",
          h._el.typeId);
}
{
  /* equippable olmayan bir surumde paket OLMEMELI: uye yine
     dogmali, sadece silahsiz dovusmeli.                       */
  const { D, o } = kur("i5f");
  D.boyut._equipYok = true;
  sus(); const s = ilkel.ilkelCagir(o, "okazor"); ac();
  kontrol("equippable yoksa uye YINE cagriliyor (paket olmuyor)",
          s.dogdu === true, s.hata || "-");
  D.boyut._equipYok = false;
}
{
  /* En olasi gercek dunya durumu: KAYNAK PAKET etkin degil ya
     da eski surumu etkin -- yani silah esyasi oyunun
     defterinde yok. ItemStack orada patliyor. Uye yine
     dogmali; "isimler dogru ama skinler yanlis" derdinin
     kardesi bu ve sessiz kalmamali.                          */
  esyaSil("pa:ilkel_balta", "pa:ilkel_asa");
  const { D, o } = kur("i5h");
  sus(); const s = ilkel.ilkelCagir(o, "raxxan"); ac();
  kontrol("silah esyasi kayitli degilken de uye cagriliyor",
          s.dogdu === true, s.hata || "-");
  const bot = botu(D);
  kontrol("eli bos ama uye saglam", bot !== undefined && !bot._el);
  esyaKaydet("pa:ilkel_balta", "pa:ilkel_asa");
}

console.log("");
console.log("=== 5f. SINIF OZELLIKLERI (v4.48) ===");
{
  /* "Bunların sınıfı var ya -- biri gölge muhafızı, biri
     çırağı -- yeteneklerine göre özellikler versin."          */
  kontrol("bes uyenin de pasifi tanimli",
          [...ayar.ILKEL_BESLI.values()].every((t) => Array.isArray(t.pasif)),
          [...ayar.ILKEL_BESLI].map(([a, t]) =>
            a + ":" + (t.pasif ? t.pasif.length : 0)).join(" "));

  /* Kullanicinin verdigi ornek: "yenilenme 2".
     Amplifier kurali (depoda her yerde ayni): gorunen seviye
     eksi bir -> Yenilenme II = amplifier 1.                   */
  const my = ayar.ILKEL_BESLI.get("miskel").pasif
    .find(([ad]) => ad === "regeneration");
  kontrol("Bas Buyucu'da Yenilenme II var", my && my[2] === 1,
          my ? "amplifier " + my[2] : "yok");

  /* RUTBE SAYILARDA GORUNSUN: ajan cirağından hizli, tank
     liderden direncli. Bu iki cift bilincli kademelendi.      */
  const sv = (a, ad) => {
    const e = ayar.ILKEL_BESLI.get(a).pasif.find(([x]) => x === ad);
    return e ? e[2] : -1;
  };
  kontrol("Gölge Ajanı, Gölge Çırağı'ndan HIZLI",
          sv("raxxan", "speed") > sv("harkos", "speed"),
          "raxxan " + sv("raxxan", "speed") + " > harkos " + sv("harkos", "speed"));
  kontrol("Muhafız Komutanı, Ekip Lideri'nden DIRENCLI",
          sv("kajaros", "resistance") > sv("okazor", "resistance"),
          "kajaros " + sv("kajaros", "resistance") + " > okazor " +
          sv("okazor", "resistance"));
  kontrol("Muhafız Komutanı ateşe bağışık (lav başında o dursun)",
          sv("kajaros", "fire_resistance") >= 0);

  /* Oyunda gercekten veriliyor mu ve KESINTISIZ mi.           */
  const { D, o } = kur("i5g");
  sus(); ilkel.ilkelCagir(o, "kajaros"); ac();
  const bot = botu(D);
  canVer(bot, ayar.ILKEL_BESLI.get("kajaros").can);

  const adlar = new Set(bot._efektler.map((e) => e.ad));
  kontrol("doğar doğmaz pasifi var (bir tarama beklemiyor)",
          adlar.has("resistance") && adlar.has("fire_resistance"),
          [...adlar].join(", ") || "hicbiri");

  const ilk = bot._efektler.find((e) => e.ad === "resistance");
  kontrol("süre taramadan UZUN (arada düşüp savunmasız kalmasın)",
          ilk && ilk.sure > ayar.BOT_TARAMA,
          ilk ? ilk.sure + " tick / tarama " + ayar.BOT_TARAMA : "-");
  kontrol("pasif parçacık çıkarmıyor (beş üye yanında göz yormasın)",
          ilk && ilk.se.showParticles === false,
          ilk ? String(ilk.se.showParticles) : "-");

  const once = bot._efektler.length;
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); defter.botTara([o]); ac();
  kontrol("taramada tazeleniyor", bot._efektler.length > once,
          once + " -> " + bot._efektler.length);

  /* Sahibine sizmamali: bunlar botun KENDI ozellikleri.       */
  kontrol("SAHIBINE pasif gitmedi",
          (D.boyut._efektler || []).length === 0,
          (D.boyut._efektler || []).map((e) => e.ad).join(", ") || "temiz");
}

console.log("");
console.log("=== 6. OKAZOR: UC VURUS SERISI ===");
{
  const { D, o } = kur("i6");
  const to = ayar.ILKEL_BESLI.get("okazor");
  sus(); ilkel.ilkelCagir(o, "okazor"); ac();
  const bot = botu(D);
  canVer(bot, to.can);
  bot._canYaz(300);

  const z = hedef("ok1");
  vurusTetikle({ damagingEntity: bot, hitEntity: z });
  vurusTetikle({ damagingEntity: bot, hitEntity: z });
  kontrol("iki vurusta HENUZ dolmadi", bot._canOku() === 300,
          bot._canOku() + " can");

  vurusTetikle({ damagingEntity: bot, hitEntity: z });
  kontrol("UCUNCU vurusta can TAMAMEN doldu", bot._canOku() === to.can,
          bot._canOku() + " can");
}
{
  /* "4 saniyelik araliklarla" -- pencere disina tasan vurus
     seriyi tamamlamamali.                                    */
  const { D, o } = kur("i6b");
  sus(); ilkel.ilkelCagir(o, "okazor"); ac();
  const bot = botu(D);
  canVer(bot, ayar.ILKEL_BESLI.get("okazor").can);
  bot._canYaz(300);

  const z = hedef("ok2");
  vurusTetikle({ damagingEntity: bot, hitEntity: z });
  tickIlerlet(200);                     // 10 saniye: pencere kacti
  vurusTetikle({ damagingEntity: bot, hitEntity: z });
  vurusTetikle({ damagingEntity: bot, hitEntity: z });
  kontrol("ARASI acilan seri sayilmadi", bot._canOku() === 300,
          bot._canOku() + " can");
}

console.log("");
console.log("=== 7. HARKOS: PASIF IYILESME ===");
{
  const th = ayar.ILKEL_BESLI.get("harkos");
  const { D, o } = kur("i7");
  sus(); ilkel.ilkelCagir(o, "harkos"); ac();
  const bot = botu(D);
  canVer(bot, th.can);
  bot._canYaz(500);

  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); ac();

  /* Listede "tik basina 0,5 HP". Tarama BOT_TARAMA tick'te bir
     donuyor, yani her taramada 0.5 x 20 = 10 can.

     KAC KEZ tarandigi elle sayilmiyor: merkezi dongu de
     botTara'yi cagiriyor ve zamanlama tick sayisina gore
     kayabiliyor. Sinanan sey ORAN -- kazanc her zaman bir
     taramalik iyilesmenin tam kati olmali.                   */
  const birTarama = th.tikIyilesme * ayar.BOT_TARAMA;
  const kazanc = bot._canOku() - 500;
  kontrol("zamanla iyilesiyor (tik basina 0,5 HP)",
          kazanc > 0 && kazanc % birTarama === 0,
          kazanc + " can kazandi, tarama basina " + birTarama);
}
{
  // Kajaros pasif iyilesmiyor: bu Harkos'a ozel
  const { D, o } = kur("i7b");
  sus(); ilkel.ilkelCagir(o, "kajaros"); ac();
  const bot = botu(D);
  canVer(bot, ayar.ILKEL_BESLI.get("kajaros").can);
  bot._canYaz(500);
  sus(); tickIlerlet(ayar.BOT_TARAMA + 2); ac();
  kontrol("Kajaros pasif iyilesmiyor (uyeler ayri)",
          bot._canOku() === 500, bot._canOku() + " can");
}

console.log("");
console.log("=== 8. RAXXAN: AURA SAHIBINE VURMUYOR ===");
{
  const { D, o } = kur("i8");
  sus(); ilkel.ilkelCagir(o, "raxxan"); ac();
  const bot = botu(D);
  canVer(bot, ayar.ILKEL_BESLI.get("raxxan").can);

  const zombi = hedef("rz", "minecraft:zombie", 3, 0);
  const arkadas = hedef("ra", "minecraft:player", 4, 0);
  D.boyut._varliklar = [o, bot, zombi, arkadas];

  sus();
  for (let i = 0; i < 6; i++) {
    tickIlerlet(ayar.BOT_TARAMA + 2);
    defter.botTara([o]);
  }
  ac();

  kontrol("civardaki DUSMANA Bulanti verildi",
          zombi._efektler.some((e) => e.ad === "nausea"),
          zombi._efektler.map((e) => e.ad).join(", ") || "hicbiri");

  const bul = zombi._efektler.find((e) => e.ad === "nausea");
  kontrol("Bulanti V -> amplifier 4", bul && bul.se.amplifier === 4,
          bul ? String(bul.se.amplifier) : "-");

  kontrol("SAHIBINE aura gitmedi",
          (D.boyut._efektler || []).length === 0,
          (D.boyut._efektler || []).map((e) => e.ad).join(", ") || "temiz");
  kontrol("EKIP ARKADASI oyuncuya da gitmedi (varsayilan)",
          ayar.ILKEL_AURA_OYUNCU === false &&
          arkadas._efektler.length === 0,
          arkadas._efektler.map((e) => e.ad).join(", ") || "temiz");
}

console.log("");
console.log("=== 9. ILKEL BOT NORMAL ISLERI DE YAPIYOR ===");
{
  /* Ayri varlik yapmamanin butun sebebi bu: Kajaros da odun
     toplar, teslim eder, derin tarama yapar.                 */
  const { D, o } = kur("i9");
  sus(); ilkel.ilkelCagir(o, "harkos"); ac();

  const kayit = await import("./pack/yetenekler/kayit.js");
  sus();
  const is = kayit.yetenekAl("bot_odun").olustur(o);
  ac();
  kontrol("ilkel bot odun isine katildi", is !== undefined,
          is ? is.ad : "is acilmadi");
  kontrol("defterde normal bot gibi duruyor", defter.botSayisi("i9") === 1);
}

console.log("");
console.log("=== 10. SOHBET VE AD COZUMLEME ===");
{
  kontrol("'kajaros' -> kajaros", ilkel.ilkelAdCoz("kajaros") === "kajaros");

  /* El-Harkos TAM adi, Harkos kisaltmasi (kullanici bildirdi).
     Ikisi de ayni uyeye gitmeli; kimlik ise "harkos" olarak
     KALDI -- varlik kimligi, doku ve kayitlar ona bagli.     */
  kontrol("'el-harkos' -> harkos", ilkel.ilkelAdCoz("el-harkos") === "harkos");
  kontrol("'elharkos' -> harkos", ilkel.ilkelAdCoz("elharkos") === "harkos");
  kontrol("kisaltma 'harkos' hala calisiyor",
          ilkel.ilkelAdCoz("harkos") === "harkos");
  kontrol("gorunen ad El-Harkos oldu",
          ayar.ILKEL_BESLI.get("harkos").ad.includes("El-Harkos"),
          ayar.ILKEL_BESLI.get("harkos").ad);
  kontrol("varlik kimligi DEGISMEDI (eski dunyalar bozulmasin)",
          ayar.ILKEL_BESLI.get("harkos").kimlik === "pa:harkos",
          ayar.ILKEL_BESLI.get("harkos").kimlik);
  kontrol("'suikastci' -> harkos", ilkel.ilkelAdCoz("suikastci") === "harkos");
  kontrol("'savasci' -> okazor", ilkel.ilkelAdCoz("savasci") === "okazor");
  kontrol("'zihin' -> raxxan", ilkel.ilkelAdCoz("zihin") === "raxxan");
  kontrol("bilinmeyen ad undefined", ilkel.ilkelAdCoz("pufpuf") === undefined);

  /* Butun yazimlar gercek bir uyeye gitmeli. */
  const eksik = [];
  for (const [yazim, anahtar] of ayar.ILKEL_ADLAR) {
    if (!ayar.ILKEL_BESLI.has(anahtar)) eksik.push(yazim);
  }
  kontrol("butun yazimlar gercek bir uyeye gidiyor", eksik.length === 0,
          eksik.join(", ") || "hepsi tamam");

  const { o } = kur("i10");
  const sohbet = await import("./pack/sohbet.js");
  sus(); const c = sohbet.komutCozumle(o, "bot kajaros"); ac();
  kontrol("'bot kajaros' komut olarak taniniyor", c !== undefined);
  sus(); const c2 = sohbet.komutCozumle(o, "bot ilkel"); ac();
  kontrol("'bot ilkel' komut olarak taniniyor", c2 !== undefined);
}

console.log("");
console.log("=== 11. OZETLER BOS DEGIL ===");
{
  /* Menude her uyenin ne yaptigi yaziyor; bos kalirsa
     kullanici ezberlemek zorunda.                            */
  for (const anahtar of ayar.ILKEL_BESLI.keys()) {
    const o = ilkel.ozetle(anahtar);
    kontrol(anahtar + ": ozeti var", typeof o === "string" && o.length > 5, o);
  }
}

console.log("");
console.log("=== 12. VURUS OLAYI YOKSA PAKET OLMUYOR ===");
{
  /* entityHitEntity her surumde yok. Yoksa Ilkel Besli yine
     dogmali, sadece vurusa bagli ekstralar kapanmali.        */
  kontrol("olayaAbone ozellik tespiti yapiyor (kaynakta)",
          readFileSync(BP + "/scripts/yetenekler/bot_ilkel.js", "utf8")
            .includes('olayaAbone("entityHitEntity"'));

  const { D, o } = kur("i12");
  sus(); const s = ilkel.ilkelCagir(o, "okazor"); ac();
  kontrol("olay olmasa da uye cagrilabiliyor", s.dogdu === true, s.hata || "-");
}

console.log("");
console.log("=== 13. HEPSI BIR ANDA GELMIYOR ===");
{
  /* "Bir anda 5 tanesi de gelmesin, tek tek aralarindan
     secerim." Menude toplu cagirma dugmesi OLMAMALI.        */
  const ana = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("menude 'Hepsini cagir' dugmesi YOK",
          !ana.includes("Hepsini çağır"));

  /* Cagirma tek tek: her cagri BIR uye ekliyor.             */
  const { D, o } = kur("i13");
  sus();
  ilkel.ilkelCagir(o, "okazor");
  ac();
  kontrol("tek cagri tek uye getirdi", ilkel.ilkelListesi("i13").length === 1,
          ilkel.ilkelListesi("i13").join(", "));

  sus(); ilkel.ilkelCagir(o, "miskel"); ac();
  kontrol("ikinci cagri ikinciyi getirdi",
          ilkel.ilkelListesi("i13").length === 2,
          ilkel.ilkelListesi("i13").join(", "));
}

/* ============================================================
   9. "IKI VURUSTA OLDURDU" -- sayilar oynanista ne demek

   Kullanicinin sikayeti bir SAYI sikayeti degil, bir OYNANIS
   sikayetiydi: "iskeleti tek vuruslta oldurmesi gerekiyordu."
   Asagisi sayiyi oynanisa cevirip kilitliyor, yani bir daha
   "JSON dogru ama oyunda yanlis" olmasin.

   Vanilla canlar (Bedrock, kalp = 2 can):
     iskelet 20 · zombi 20 · creeper 20 · orumcek 16
     ender ejderi 200 · warden 500
   ============================================================ */
{
  console.log("\n=== 14. SAYILAR OYNANISTA NE EDIYOR ===");

  const VANILLA = [["iskelet", 20], ["zombi", 20], ["creeper", 20],
                   ["warden", 500]];

  const okazor = ayar.ILKEL_BESLI.get("okazor");
  kontrol("Okazor hasari 100 (= 50 kalp)", okazor.hasar === 100,
          String(okazor.hasar));

  for (const [ad, can] of VANILLA) {
    const vurus = Math.ceil(can / okazor.hasar);
    if (ad === "warden") {
      kontrol("Okazor warden'i " + vurus + " vuruslta oldurur", vurus === 5,
              vurus + " vurus");
    } else {
      kontrol("Okazor " + ad + "i TEK vuruslta oldurur", vurus === 1,
              can + " can / " + okazor.hasar + " hasar = " + vurus + " vurus");
    }
  }

  /* Hatanin kendisi: 14 hasarla iskelet IKI vurus ederdi.
     Bu satir "duzeltme gercekten bir sey degistirdi mi"
     sorusunun cevabi.                                       */
  kontrol("eski hatali deger (14) iskeleti tek vuruslta OLDURMEZDI",
          Math.ceil(20 / 14) === 2, "kullanicinin gordugu buydu");

  /* Digerleri de ayarda ne yaziyorsa OYUNDA o olmali.

     v4.83: "oyunda" artik taban + silah demek. El-Harkos'un
     varlik JSON'unda 14 yaziyor ama elindeki asa 14 daha
     ekliyor -- oyuncunun gordugu 28. Bu satiri sadece JSON'a
     baktirmak, tam da onlemeye calistigi hatayi (soylenen
     sayi ile oynanistaki sayinin ayrismasi) TERS yonden
     yapardi.                                                */
  for (const [anahtar, t] of ayar.ILKEL_BESLI) {
    const v = JSON.parse(readFileSync(
      BP + "/entities/ilkel_" + anahtar + ".json", "utf8"))["minecraft:entity"];
    const silah = ayar.silahHasari(ayar.ilkelSilahi(anahtar));
    const oyunda = v.components["minecraft:attack"].damage + silah;
    kontrol(anahtar + ": oyundaki hasar = " + t.hasar +
            " (" + (t.hasar / 2) + " kalp)",
            oyunda === t.hasar,
            "taban " + v.components["minecraft:attack"].damage +
            " + silah " + silah + " = " + oyunda);
  }

  /* SILAHSIZ KALIRSA: asa alinirsa vurusu tabana duser. Bu
     dogru davranis ama sessiz olmamali -- taban en az bir
     normal mob kadar olsun, yoksa asasiz El-Harkos zararsiz
     bir yaratiga donerdi.                                   */
  {
    const h = JSON.parse(readFileSync(
      BP + "/entities/ilkel_harkos.json", "utf8"))["minecraft:entity"];
    const taban = h.components["minecraft:attack"].damage;
    kontrol("asasiz El-Harkos hala ciddi (taban >= 10)", taban >= 10,
            taban + " hasar = " + (taban / 2) + " kalp");
  }
}

console.log("");
console.log("=== ISIN GUCU: Okazor ve Kajaros gercekten atiyor mu ===");
{
  /* v7.9.3 genel taramasinda ILKEL_ISIN_ACIK'i false yaptim ve
     hicbir test dusmedi: Okazor'un "Kirmizi Guc"u ile
     Kajaros'un "Ates Gucu"nun ATTIGI hic olculmemisti. Ikisi de
     bu iki uyenin imza yetenegi -- sessizce kapanabiliyordu. */
  kontrol("ILKEL_ISIN_ACIK (varsayilan)", ayar.ILKEL_ISIN_ACIK === true,
          String(ayar.ILKEL_ISIN_ACIK));

  for (const [anahtar, ad] of [["okazor", "Kırmızı Güç"], ["kajaros", "Ateş Gücü"]]) {
    const { D, o } = kur("isin_" + anahtar);
    sus(); ilkel.ilkelCagir(o, anahtar); ac();
    const bot = botu(D);
    /* DUSMAN lazim: isin en yakin dusmani nisan aliyor, kimse
       yoksa hic atmamasi DOGRU davranis. Kurulumu eksik
       birakmak "isin calismiyor" goruntusu verirdi.          */
    let vurulan = 0;
    const dusman = {
      id: "dusman", typeId: "minecraft:zombie", isValid: true,
      location: { x: bot.location.x + 4, y: bot.location.y, z: bot.location.z },
      applyDamage() { vurulan++; return true; },
      addEffect: () => true, getComponent: () => undefined
    };
    D.boyut._varliklar = [bot, dusman];
    /* ISIN BEKLEMESI VARLIK KIMLIGINE GORE tutuluyor ve sahte
       dunya her kur()'da varlik adlarini "e1"den yeniden
       basliyor. Aradaki tick'i ilerletmezsek IKINCI uye
       BIRINCININ beklemesini miras aliyor ve "isin atmiyor"
       gorunuyor -- ilk yazimda Kajaros tam boyle "bozuk"
       ciktı. Kod dogruydu, kurulum carpisiyordu.            */
    sus();
    tickIlerlet(200);
    defter.botTara([o]); tickIlerlet(ayar.BOT_TARAMA + 1); defter.botTara([o]);
    ac();
    const zerre = (D.sayac.parcacik || []).length;
    kontrol("  " + anahtar + " isin atiyor (" + ad + ")",
            vurulan > 0 || zerre > 0,
            "hasar=" + vurulan + " parcacik=" + zerre);
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Ilkel Besli calisiyor");
process.exit(hata ? 1 : 0);

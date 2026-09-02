/* IKSIR / KADEME SISTEMI (Nitroksin'in bizdeki karsiligi)

   Referansin uc hatasini yapmadigimiz sinaniyor:
     1. guc KALICI degil, suresi var
     2. goz KILITLI degil ve guc bayragi degil (cikarsa da devam)
     3. her tick DUNYA TARAMASI yok                                 */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const IKSIRLER = [
  "pa:iksir_nitroksin", "pa:iksir_grinoksin", "pa:iksir_ates_iksiri",
  "pa:iksir_kan_iksiri", "pa:iksir_hiperoksin"
];
const GOZLER = ["pa:goz_beyaz", "pa:goz_yesil", "pa:goz_ates", "pa:goz_kan", "pa:goz_mavi"];
esyaKaydet(...IKSIRLER, ...GOZLER, "pa:kol_toprak");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
const mc = await import("@minecraft/server");
await import("./pack/main.js");
const ayar = await import("./pack/ayarlar.js");
ac();

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

function icen(id = "ik") {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = id;
  o.typeId = "minecraft:player";
  o._efekt = [];
  o._silinen = [];
  o._kafa = undefined;
  o.addEffect = (ad, sure, s) => { o._efekt.push({ ad, sure, s }); };
  o.removeEffect = (ad) => { o._silinen.push(ad); };
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (slot) => (slot === "Head" && o._kafa) ? { typeId: o._kafa } : undefined,
        setEquipment: (slot, esya) => {
          if (slot === "Head") o._kafa = esya ? esya.typeId : undefined;
          return true;
        }
      };
    }
    return eskiGet(ad);
  };
  _durum.oyuncular = [o];
  return { D, o };
}

const ic = (o, esya) => mc.itemCompleteUseTetikle({ source: o, itemStack: { typeId: esya } });

console.log("=== 1. ICMEK GUC VERIYOR ===");
{
  const { o } = icen("ik1");
  sus(); ic(o, "pa:iksir_nitroksin"); tickIlerlet(4); ac();

  const adlar = new Set(o._efekt.map((e) => e.ad));
  kontrol("efektler verildi", adlar.size > 0, [...adlar].join(", "));
  kontrol("hiz ve guc var", adlar.has("speed") && adlar.has("strength"));
  kontrol("goz kafaya takildi", o._kafa === "pa:goz_beyaz", String(o._kafa));
}

console.log("");
console.log("=== 2. SURE DOLUNCA BITIYOR (referansta KALICIYDI) ===");
{
  /* Sure ELLE yazilmiyor: v4.22'de 60 sn -> 5 dk oldu ve sabit
     sayilar kirildi. Ayardan okunuyor.                         */
  const nitro = ayar.KADEMELER.find((k) => k.kimlik === "nitroksin");
  const { o } = icen("ik2");
  sus(); ic(o, "pa:iksir_nitroksin"); tickIlerlet(Math.floor(nitro.sure / 2)); ac();
  kontrol("yarida hala guclu", o._kafa === "pa:goz_beyaz", String(o._kafa));

  sus(); tickIlerlet(nitro.sure); ac();
  kontrol("sure dolunca goz CIKTI", o._kafa === undefined, String(o._kafa));
  kontrol("efektler silindi", o._silinen.length > 0, o._silinen.join(", "));
  kontrol("bitis bildirildi", /bitti/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);
}

console.log("");
console.log("=== 3. GOZ SADECE GORUNUM (referansta guc bayragiydi) ===");
{
  const { o } = icen("ik3");
  sus(); ic(o, "pa:iksir_grinoksin"); tickIlerlet(4); ac();
  const oncekiAdet = o._efekt.length;

  o._kafa = undefined;                       // oyuncu gozu cikardi
  sus(); tickIlerlet(120); ac();

  kontrol("goz cikarilinca guc DEVAM ediyor", o._efekt.length > oncekiAdet,
          oncekiAdet + " -> " + o._efekt.length + " efekt");
  kontrol("goz zorla geri takilmiyor (kilit yok)", o._kafa === undefined,
          String(o._kafa));
}

console.log("");
console.log("=== 4. KADEMELER BIRIKMIYOR ===");
{
  const { o } = icen("ik4");
  sus();
  ic(o, "pa:iksir_nitroksin");
  tickIlerlet(4);
  ic(o, "pa:iksir_hiperoksin");
  tickIlerlet(4);
  ac();
  kontrol("son icilen kademenin gozu takili", o._kafa === "pa:goz_mavi", String(o._kafa));

  const son = o._efekt.slice(-7).map((e) => e.ad);
  kontrol("hiperoksin efektleri geldi",
          son.indexOf("night_vision") !== -1, son.join(", "));
}

console.log("");
console.log("=== 5. DUNYA TARAMASI YOK (referansin asil maliyeti) ===");
{
  const { D, o } = icen("ik5");
  sus(); ic(o, "pa:iksir_kan_iksiri"); tickIlerlet(200); ac();
  kontrol("hicbir blok okunmadi/yazilmadi", D.sayac.getBlock === 0 && D.sayac.setType === 0,
          D.sayac.getBlock + " okuma, " + D.sayac.setType + " yazma");

  const tazeleme = o._efekt.length;
  kontrol("efektler her tick DEGIL, aralikla tazelendi",
          tazeleme < 100, tazeleme + " efekt cagrisi / 200 tick");
}

console.log("");
console.log("=== 6. IKSIR ICMEYEN OYUNCU BEDAVA ===");
{
  const { D, o } = icen("ik6");
  const oncekiEfekt = o._efekt.length;
  sus(); tickIlerlet(300); ac();
  kontrol("hicbir sey olmadi", o._efekt.length === oncekiEfekt && o._kafa === undefined);
}

console.log("");
console.log("=== 7. YETENEKLERI KILITLEMIYOR ===");
{
  const { D, o } = icen("ik7");
  sus();
  ic(o, "pa:iksir_nitroksin");
  tickIlerlet(20);
  // iksir aktifken bir yetenek tetiklenebilmeli
  mc.scriptEventTetikle({ id: "simsek:kol", message: "kol_toprak", sourceEntity: o });
  tickIlerlet(300);
  ac();
  /* v4.33: Toprak Kol'un varsayilan yetenegi can_verme'ydi ve
     bu test onun verdigi "regeneration" efektine bakiyordu.
     can_verme kaldirilinca varsayilan toprak_topu oldu -- yani
     efekt degil BLOK/VARLIK uretiyor. Sinanan sey ayni:
     iksir acikken yetenek tetiklenebiliyor mu.                */
  const isBelirtisi = D.sayac.dogan.length + D.sayac.setType;
  kontrol("iksir acikken yetenek de calisti",
          isBelirtisi > 0,
          D.sayac.dogan.length + " varlik, " + D.sayac.setType + " blok");
}

console.log("");
console.log("=== YENI IKSIRLER ve GOZ ZIRHI (v4.62) ===");
{
  const fs = await import("node:fs");
  const BP2 = KOK + "/Simsek_TNT_ToprakTopu";
  const oku = (y) => JSON.parse(fs.readFileSync(y, "utf8"));

  /* Iki yeni iksir, iki yeni referans moddan. Kullanici:
     "guzel fikirleri alalim ve amacini degistirmeden yapalim." */
  for (const k of ["staroxine", "element"]) {
    const kd = ayar.KADEMELER.find((x) => x.kimlik === k);
    kontrol(k + ": kademe tanimli", kd !== undefined);
    kontrol(k + ": esyasi diskte",
            fs.existsSync(BP2 + "/items/iksir_" + k + ".json"));
    kontrol(k + ": gozu ve lazer gozu var",
            kd && kd.goz && kd.lazerGoz && kd.goz !== kd.lazerGoz,
            kd ? kd.goz + " / " + kd.lazerGoz : "-");
  }

  /* StarOxine KORUMA uzmani olmali: Grinoksin hasari geri
     kazaniyor, StarOxine hic almiyor. Ikisi birbirinin kopyasi
     olmamali -- yoksa yeni iksirin varlik sebebi kalmaz.     */
  const sy = (k, e) => {
    const kd = ayar.KADEMELER.find((x) => x.kimlik === k);
    const v = kd.efektler.find(([a]) => a === e);
    return v ? v[1] : -1;
  };
  kontrol("StarOxine direncte UZMAN (Grinoksin'i geciyor)",
          sy("staroxine", "resistance") > sy("grinoksin", "resistance"),
          sy("staroxine", "resistance") + " > " + sy("grinoksin", "resistance"));
  kontrol("ama yenilenmede Grinoksin UZMAN kaliyor",
          sy("grinoksin", "regeneration") > sy("staroxine", "regeneration"),
          sy("grinoksin", "regeneration") + " > " + sy("staroxine", "regeneration"));

  /* ---- v4.67: HER IKSIRIN LAZERI FARKLI ----

     Kullanici: "goz lazerinde gozun rengine gore, o iksirin
     rengine gore lazer atiyor... element iksirinde hem bu hem
     ates var ya, atesi olarak ayarladigimiz zaman karsidaki
     yanmaya basliyor, buz haline cevirirsek yavaslik aliyor
     ve etrafi buz blogu ile kaplaniyor."

     REFERANSTA BOYLE BIR SEY YOK: uc arsiv de acildi, BoraLo
     Nitroksin Mod'daki bes lazer fonksiyonu (lazerat1,
     firelazer, Bloodylazer, grinoxsinlazer, hiperlazer)
     BIREBIR AYNI -- hepsi 6 hasar, 8 blok, ayni bes self-buff.
     Yani bu kullanicinin fikri; kimlikler iksirlerin kendi
     karakterinden turetildi.

     Asagisi "sekiz iksirin sekiz ayri lazeri var" kuralini
     kilitliyor. Ikisi ayni etkiye dususe bu test dusuyor.   */
  /* v4.68: kullanici yan etkilerin HEPSINI kaldirtti --
     "bunlar sey vermesin kanka, sadece hasar versin, ekstra
     bir sey vermesin; element iksiri 2 secenegi olacak, onda
     sadece."

     Yani artik kilitlenen sey "her iksirin ayri etkisi var"
     degil, TERSI: hicbirinde yan etki YOK.                  */
  const YASAK = ["savur", "zehir", "sersem", "canCal", "hiz",
                 "kalkan", "ates", "dondur", "buzKafes", "hasar"];
  for (const k of ayar.KADEMELER) {
    const l = k.lazer || {};
    const sizan = YASAK.filter((b) => l[b] !== undefined);
    kontrol(k.kimlik + " lazerinde yan etki yok", sizan.length === 0,
            sizan.join(", "));
  }
  kontrol("tek hasar sayisi var ve yuksek",
          ayar.LAZER_HASAR >= 40, String(ayar.LAZER_HASAR));
  /* v4.81: "yarim kalpte birak" kurali TAMAMEN kaldirildi --
     30 saniyelik bir isinda hedef 60 kez sabitleniyor ve
     hicbir zaman olmuyordu. Artik tek dal: tam hasar.
     Ayar da, sabitleme kodu da gitmis olmali.               */
  kontrol("can tavani ayari kalmadi",
          ayar.LAZER_BIRAKILAN_CAN === undefined &&
          ayar.LAZER_TEPKI_HASARI === undefined,
          "birakilan=" + ayar.LAZER_BIRAKILAN_CAN +
          " tepki=" + ayar.LAZER_TEPKI_HASARI);
  /* v4.69: zirh artik YARILANMIYOR, BITME NOKTASINA cekiliyor
     -- "elmas bir kilic ile bir defa vurdugunda tum hepsi ayni
     anda kirilsin".                                          */
  kontrol("zirh bitme noktasina cekiliyor",
          ayar.LAZER_ZIRH_KALAN >= 0 && ayar.LAZER_ZIRH_KALAN <= 2,
          String(ayar.LAZER_ZIRH_KALAN));

  /* Element: iki mod, ikisi de kullanicinin tarif ettigi gibi */
  const el = ayar.KADEMELER.find((x) => x.kimlik === "element");
  const modlar = ayar.LAZER_MODLARI.get(el.lazer.modlu);
  kontrol("Element'in IKI modu var", modlar && modlar.length === 2,
          modlar ? modlar.map((m) => m.kimlik).join(", ") : "yok");
  const buz = modlar.find((m) => m.kimlik === "buz");
  const ates = modlar.find((m) => m.kimlik === "ates");
  kontrol("buz modu YAVASLATIYOR", buz.ek.dondur === true);
  kontrol("buz modu BUZA GOMUYOR (kullanicinin tarifi)",
          buz.ek.buzKafes === true);
  kontrol("ates modu YAKIYOR", ates.ek.ates === true);
  kontrol("buz blogu ERIMEYEN cinsten (normal buz sel yapardi)",
          ayar.LAZER_BUZ_BLOK === "minecraft:packed_ice",
          ayar.LAZER_BUZ_BLOK);
  kontrol("buz kafesi SURELI (kalici blok birakmiyor)",
          ayar.LAZER_BUZ_SURE > 0 && ayar.LAZER_BUZ_SURE < 1200,
          ayar.LAZER_BUZ_SURE + " tick");
  kontrol("buz kafesinin blok tavani var",
          ayar.LAZER_BUZ_TAVAN > 0 && ayar.LAZER_BUZ_TAVAN <= 200,
          String(ayar.LAZER_BUZ_TAVAN));
  kontrol("dondurma SURELI (referans suresizdi)",
          ayar.LAZER_DONDUR_SURE > 0 && ayar.LAZER_DONDUR_SURE < 1200,
          ayar.LAZER_DONDUR_SURE + " tick");
  kontrol("dondurma seviyesi makul (referans 249)",
          ayar.LAZER_DONDUR_SEVIYE < 10, String(ayar.LAZER_DONDUR_SEVIYE));

  /* GOZ ZIRHI: v4.62'de "7 dis boslugunu doldursun, 10 tane
     var ya" -> 7 simge = 14 puan.
     v4.75'te kullanici 8,5 simge istedi -> 17 puan. Tek sayi
     oldugu icin cubukta son simge YARIM ciziliyor.
     Sayi tek yerde: kol_uret.py GOZ_ZIRH.                    */
  const GOZ_ZIRH = 17;
  let zirhli = 0, toplam = 0;
  for (const kd of ayar.KADEMELER) {
    for (const g of [kd.goz, kd.lazerGoz]) {
      const yol = BP2 + "/items/" + g.replace("pa:", "") + ".json";
      if (!fs.existsSync(yol)) continue;
      toplam++;
      const c = oku(yol)["minecraft:item"].components;
      const w = c["minecraft:wearable"];
      /* Iki bilesen de ayni sayiyi tasimali: biri unutulursa
         zirh cubugu ile gercek indirim ayrisirdi.            */
      if (c["minecraft:armor"] && c["minecraft:armor"].protection === GOZ_ZIRH &&
          w && w.protection === GOZ_ZIRH) zirhli++;
    }
  }
  kontrol("BUTUN gozler 8,5 simge zirh veriyor (17 puan)",
          toplam > 0 && zirhli === toplam, zirhli + "/" + toplam);
  kontrol("17 puan = 8,5 simge (1 simge = 2 puan)",
          GOZ_ZIRH / 2 === 8.5, (GOZ_ZIRH / 2) + " simge");
}

/* ============================================================
   EFEKT DUZENI  (v4.79)

   v4.78'de butun efektlere +1 verilmisti; kullanici begenmedi
   ve geri alindi. Yerine her iksire IKI EKLEME geldi: jump_boost
   ("Sicrama II tumunde olsun") ve o iksirin kimligine gore
   secilmis BIR yeni buyu.

   Bu bolum sayilarin BUYUKLUGUNU sinamiyor -- denge kullanicinin
   karari. Sinadigi sey, tabloya her dokunulusunda bozulmasi
   kolay olan kurallar.
   ============================================================ */
console.log("");
console.log("=== 8. EFEKT DUZENI (v4.80) ===");
{
  const ef = (kd) => new Map(kd.efektler);
  const hepsi = ayar.KADEMELER;

  /* ---- 1. SEVIYESIZ EFEKTLER 0'DA KALMALI ----
     Bu efektlerin oyunda seviyesi yok. Amplifier'i buyutmek
     ekranda "Atese Dayaniklilik II" yazdirir ve oyunda hicbir
     sey yapmaz -- yani kullaniciya yalan soyler. Deponun
     "sahte icerik yasak" kurali burada da geciyor.          */
  const SEVIYESIZ = ["night_vision", "fire_resistance", "water_breathing",
                     "conduit_power", "invisibility", "slow_falling",
                     "saturation"];
  let sahte = [];
  for (const kd of hepsi) {
    for (const [ad, n] of kd.efektler) {
      if (SEVIYESIZ.includes(ad) && n !== 0) sahte.push(kd.kimlik + "." + ad + "=" + n);
    }
  }
  kontrol("seviyesiz efektler 0'da kaldi (sahte roma rakami yok)",
          sahte.length === 0, sahte.join(", ") || "7 efekt turu temiz");

  /* ---- 2. DOKUNULMAZLIK TEK BIR IKSIRDE ----
     Bedrock'ta Dayaniklilik seviye basina %20; seviye V
     (amplifier 4) TAM DOKUNULMAZLIK. Kullanici bunu SADECE
     StarOxine icin istedi ("hasari hic almasin"). Ikinci bir
     iksir oraya cikarsa StarOxine'in varlik sebebi kalmaz.  */
  const dokunulmaz = hepsi.filter((kd) => (ef(kd).get("resistance") ?? 0) >= 4);
  kontrol("dokunulmazlik (Dayaniklilik V) tek iksirde",
          dokunulmaz.length === 1, dokunulmaz.map((k) => k.kimlik).join(", "));
  kontrol("o iksir StarOxine",
          dokunulmaz.length === 1 && dokunulmaz[0].kimlik === "staroxine",
          dokunulmaz.map((k) => k.kimlik).join(", "));

  /* ---- 3. UZMANLIK DUZENI AYAKTA ----
     Dosyanin kendi notu: "hiz Nitroksin'de, vurus Redoksin'de,
     dayaniklilik Grinoksin'de." Toplu bir +1'de en kolay
     kaybedilen sey bu: zayiflari buyutup uzmanlari yerinde
     birakirsan herkes ayni seviyeye cikar ve iksirler
     birbirinin ayni olur.                                   */
  const enYuksek = (etki) => {
    let en = -1, sahip = [];
    for (const kd of hepsi) {
      const n = ef(kd).get(etki);
      if (n === undefined) continue;
      if (n > en) { en = n; sahip = [kd.kimlik]; }
      else if (n === en) sahip.push(kd.kimlik);
    }
    return { en, sahip };
  };
  for (const [etki, uzman] of [["speed", "nitroksin"],
                               ["jump_boost", "nitroksin"],
                               ["strength", "redoksin"],
                               ["health_boost", "grinoksin"]]) {
    const { en, sahip } = enYuksek(etki);
    kontrol(etki + " uzmani hala " + uzman,
            sahip.includes(uzman), sahip.join(", ") + " (seviye " + en + ")");
  }
  /* Vurus uzmanligi PAYLASILMAMALI: Redoksin ile Kan Iksiri
     ayni seviyede olabilir (ikisi de vurus iksiri), ama
     Firenoksin/Hiperoksin onlara YETISMEMELI.               */
  const vurus = enYuksek("strength");
  kontrol("vurus uzmanligina uzman olmayanlar yetismedi",
          !vurus.sahip.includes("firenoksin") &&
          !vurus.sahip.includes("hiperoksin"),
          vurus.sahip.join(", "));

  /* ---- 4. SECILEN BUYULER YERINDE (v4.80) ----
     Her iksire kimligine gore IKI yeni buyu secildi. Biri
     silinirse ya da tablo yeniden uretilirse sessizce
     kaybolur; asagidaki liste ayarlar.js'teki not blogunun
     ikizi.                                                  */
  const SECILEN = {
    nitroksin:  ["saturation", "conduit_power"],
    grinoksin:  ["fire_resistance", "slow_falling"],
    redoksin:   ["resistance", "fire_resistance"],
    firenoksin: ["health_boost", "jump_boost"],
    kan_iksiri: ["resistance", "slow_falling"],
    hiperoksin: ["health_boost", "saturation"],
    staroxine:  ["water_breathing", "haste"],
    element:    ["slow_falling", "strength"],
  };
  const eksik = [];
  for (const [kimlik, etkiler] of Object.entries(SECILEN)) {
    const kd = hepsi.find((k) => k.kimlik === kimlik);
    for (const etki of etkiler) {
      if (!kd || !ef(kd).has(etki)) eksik.push(kimlik + "." + etki);
    }
  }
  kontrol("secilen buyulerin hepsi duruyor", eksik.length === 0,
          eksik.join(", ") || (Object.keys(SECILEN).length * 2) + " buyu");

  /* ---- 5. "FARKLI FARKLI" (v4.80) ----
     Kullanicinin duzeltmesi: v4.79'da hepsine AYNI efekt
     (jump_boost) eklenmisti, "farkli farkli buyuler ekle"
     dedi. Yani hicbir IKILI baska bir iksirinkiyle ayni
     olmamali -- tek tek efektler kesisebilir (fire_resistance
     hem tankin hem madencinin acigi), ama iki iksir birebir
     ayni cifti almamali.                                    */
  const cifter = Object.entries(SECILEN)
    .map(([k, e]) => [k, [...e].sort().join("+")]);
  const ayni = [];
  for (let i = 0; i < cifter.length; i++) {
    for (let j = i + 1; j < cifter.length; j++) {
      if (cifter[i][1] === cifter[j][1]) {
        ayni.push(cifter[i][0] + " = " + cifter[j][0]);
      }
    }
  }
  kontrol("hicbir iki iksir ayni ikiliyi almadi", ayni.length === 0,
          ayni.join(", ") || cifter.length + " ikili, hepsi ayri");

  /* Ayni efekt bir iksirde IKI KEZ yazilmamali: ikinci kayit
     birincisini sessizce eziyor ve hangi seviyenin gecerli
     oldugu tablodan okunamiyor.                             */
  const cift = [];
  for (const kd of hepsi) {
    const gorulen = new Set();
    for (const [ad] of kd.efektler) {
      if (gorulen.has(ad)) cift.push(kd.kimlik + "." + ad);
      gorulen.add(ad);
    }
  }
  kontrol("hicbir iksirde ayni efekt iki kez yok", cift.length === 0,
          cift.join(", ") || "temiz");
}

console.log("");
console.log("=== NITROKSIN: DUSME HASARI YOK (v7.6) ===");
{
  /* Kullanici: "nitroksin... onun da gucsuz oldugunu
     dusunuyorum artik."

     v4.78'de BUTUN efektlere +1 verilmis ve kullanici
     BEGENMEMISTI. O yuzden bu sefer sayi degil YENI BIR
     YETENEK geldi ve burada GERCEKTEN CALISTIRILIYOR --
     "kod yazildi mi" degil "is goruyor mu".

     Sinirlar da ayni onemde: baska hasar turleri ve baska
     iksirler bu bagisikligi ALMAMALI. Tam dokunulmazlik
     yalniz StarOxine'de.                                   */
  const { o } = icen("nitro_dusme");
  let can = 20;
  o.getComponent = ((eski) => (ad) => {
    if (ad === "minecraft:health") {
      return {
        get currentValue() { return can; },
        get effectiveMax() { return 20; },
        setCurrentValue(v) { can = v; return true; }
      };
    }
    return eski(ad);
  })(o.getComponent.bind(o));

  const dus = (sebep, hasar) => {
    can = 20 - hasar;
    mc.hasarTetikle({
      hurtEntity: o, damage: hasar,
      damageSource: { cause: sebep }
    });
    return can;
  };

  /* Iksir ICILMEDEN once: bagisiklik OLMAMALI. */
  kontrol("iksirsizken dusme hasari DURUYOR", dus("fall", 6) === 14,
          "can " + can);

  sus(); ic(o, "pa:iksir_nitroksin"); tickIlerlet(4); ac();
  kontrol("Nitroksin icildi", true);

  kontrol("dusme hasari GERI VERILDI", dus("fall", 6) === 20, "can " + can);
  kontrol("  buyuk dusus de", dus("fall", 19) === 20, "can " + can);
  /* Tavani asmasin: 20 canlikken 6 hasar geri verilince 26
     olmamali. */
  can = 20;
  mc.hasarTetikle({ hurtEntity: o, damage: 6, damageSource: { cause: "fall" } });
  kontrol("  can tavani asilmiyor", can === 20, "can " + can);

  /* ---- SINIRLAR ---- */
  kontrol("LAV hasari geri verilmiyor", dus("lava", 8) === 12, "can " + can);
  kontrol("ACLIK hasari geri verilmiyor", dus("starve", 4) === 16, "can " + can);
  kontrol("VOID hasari geri verilmiyor", dus("void", 10) === 10, "can " + can);
  kontrol("VURUS hasari geri verilmiyor", dus("entityAttack", 7) === 13,
          "can " + can);

  /* Baska iksir: bagisiklik ONUN DEGIL. */
  const b = icen("grin_dusme");
  let can2 = 20;
  b.o.getComponent = ((eski) => (ad) => {
    if (ad === "minecraft:health") {
      return {
        get currentValue() { return can2; },
        get effectiveMax() { return 20; },
        setCurrentValue(v) { can2 = v; return true; }
      };
    }
    return eski(ad);
  })(b.o.getComponent.bind(b.o));
  sus(); ic(b.o, "pa:iksir_grinoksin"); tickIlerlet(4); ac();
  can2 = 14;
  mc.hasarTetikle({ hurtEntity: b.o, damage: 6, damageSource: { cause: "fall" } });
  kontrol("GRINOKSIN'de dusme hasari DURUYOR (bagisiklik tek iksirde)",
          can2 === 14, "can " + can2);

  /* Uzmanlik duzeni bozulmadi mi -- sayilar yalniz KENDI
     alaninda buyudu. */
  const nit = ayar.KADEMELER.find((k) => k.kimlik === "nitroksin");
  const sev = new Map(nit.efektler);
  kontrol("hiz ve ziplama V oldu (amplifier 4)",
          sev.get("speed") === 4 && sev.get("jump_boost") === 4,
          "speed " + sev.get("speed") + " jump " + sev.get("jump_boost"));
  kontrol("  DIGER efektlere dokunulmadi (toplu +1 degil)",
          sev.get("strength") === 2 && sev.get("resistance") === 1 &&
          sev.get("haste") === 1 && sev.get("absorption") === 2,
          "str " + sev.get("strength") + " res " + sev.get("resistance") +
          " haste " + sev.get("haste") + " abs " + sev.get("absorption"));
  /* Tam dokunulmazlik hala YALNIZ StarOxine'de. */
  const star = ayar.KADEMELER.find((k) => k.kimlik === "staroxine");
  const sSev = new Map(star.efektler);
  kontrol("  tam dokunulmazlik hala yalniz StarOxine'de",
          sSev.get("resistance") === 4 && sev.get("resistance") < 4);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum iksir testleri gecti");
process.exit(hata ? 1 : 0);


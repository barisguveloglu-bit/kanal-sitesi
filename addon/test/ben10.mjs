/* BEN 10 (AlienEvo)                                       v4.92

   Kullanici: "ben 10 modu bu iste. Elmas kafayi, dort kolu,
   yuzen ceneyi ve Ates topunu ekle SADECE."

   ---- YONTEM ----
   Mod GeckoLib kullaniyor, yani modelleri ZATEN `.geo.json` --
   Bedrock bicimi. Tek degisiklik KEMIK ADLARI: modun butun
   modelleri altı kok kemikten sarkiyor (armorHead, armorBody,
   armorLeftArm...). Bunlari oyuncunun kemik adlarina cevirince
   butun agac vanilla oyuncu animasyonlariyla suruluyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   Cevirinin KAYIPSIZ oldugu. Iki sinsi hata var ve ikisi de
   oyunda "bir yeri eksik" olarak gorunurdu:

     1. KEMIK ADI CAKISMASI. Ates Topu ve Yuzen Cene'de zaten
        `head` adinda bir kemik VAR. armorHead'i dogrudan
        `head` yapmak ikisini carpistirip DOLU olani
        dusuruyordu -- yaratigin kafasi kayboluyordu.
     2. KOK KEMIK YINELENMESI. Dort Kol'un fazladan iki kolu
        AYRI dosyada ve o dosyada kok kemikler BOS. Naif
        birlestirme "yinelenen kemik" uretirdi.

   6. bolum sayilari MODUN KENDI JSON'uyla karsilastiriyor.    */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";
const OMP = KOK + "/Simsek_Oyuncu_Modeli";
const JAR = "/tmp/claude-0/-home-user-kanal-sitesi/" +
  "e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11/scratchpad/ben10";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const ben = await import("./pack/yetenekler/ben10.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

const VANILLA = ["head", "body", "leftArm", "rightArm", "leftLeg", "rightLeg"];
/* v4.93: her turun UC bicimi var (Prototip / Recal / 10K).
   Tablo elle yazilmiyor -- ayarlar.js'ten turetiliyor ki yeni
   bir bicim eklenince test kendiliginden onu da sinasin.     */
const SONEK = ["", "_proto", "_10k"];
/* v6.0: tablo ARTIK ELLE YAZILMIYOR. Uzayli sayisi 4'ten 19'a
   cikti ve hepsinin uc bicimi YOK -- modun alien_34/60/100/101
   ve afomni uzaylilarinda tek model var. Liste ayarlar.js'ten
   turetiliyor; ek dosyalar (Dort Kol'un kollari, Sinek
   Suratli'nin bacak ve kanatlari) diskten okunuyor.          */
const KAYNAK = {};
for (const anahtar of ayar.BEN10.keys()) {
  const d = [anahtar];
  for (const ek of [anahtar + "_kollar", anahtar + "_ek0", anahtar + "_ek1"]) {
    if (existsSync(KOK + "/kaynak_geo/" + ek + ".geo.json")) d.push(ek);
  }
  KAYNAK[anahtar] = d;
}

console.log("=== 1. UZAYLI LISTESI KAYNAKLA AYNI MI ===");
{
  /* v4.92'de kullanici "SADECE dordu" demisti; v6.0'da
     "almadigimiz uzaylilari da ekle" dedi. Test o yuzden
     "dort tane" degil, KAYNAKLA AYNI olup olmadigini tutuyor.

     Modelli 19 tur alindi. Alinmayan ikisinin gerekcesi de
     burada sinaniyor -- "unuttuk" ile "alinamadi" ayri
     seyler:
       kryptonian    jar'da modeli yok
       crystalsapien guc dosyasi bitmemis (Under Construction) */
  const turler = new Set([...ayar.BEN10.values()].map((t) => t.tur));
  /* v6.1: 19 -> 20 tur (Yukseltme'nin cubugu modda AYRI bir guc
     dosyasi, o yuzden ayri tur sayiliyor) ve 41 -> 56 kayit
     (bes ek form x 3 bicim).                                  */
  kontrol("20 tur alindi", turler.size === 20, turler.size + " tur");
  kontrol("56 kayit (16 tur x 3 bicim + 8 tek bicim)",
          ayar.BEN10.size === 56, ayar.BEN10.size + " kayit");

  const yol = JAR + "/data/alienevo_aliens/palladium/powers/";
  if (existsSync(yol + "kryptonian.json")) {
    /* Kryptonian ALINMADI cunku modeli yok. Test bunu
       DOGRULUYOR: gercekten yoksa dogru karar, varsa
       gozden kacmis demektir.                              */
    const km = oku(yol + "kryptonian.json");
    let katman = false;
    const gez = (o) => {
      if (Array.isArray(o)) { o.forEach(gez); return; }
      if (o && typeof o === "object") {
        if (typeof o.render_layer === "string") katman = true;
        Object.values(o).forEach(gez);
      }
    };
    gez(km);
    kontrol("kryptonian gercekten modelsiz (o yuzden alinmadi)", !katman);
    kontrol("kryptonian tabloda YOK",
            ![...ayar.BEN10.values()].some((t) => t.kaynak === "kryptonian"));
  }
  if (existsSync(yol + "crystalsapien.json")) {
    /* Chromastone'un tek is yapan satiri `say Under
       Construction`. Modun kendisi bitmemis.               */
    const cs = JSON.stringify(oku(yol + "crystalsapien.json"));
    kontrol("crystalsapien modda bitmemis (Under Construction)",
            cs.includes("Under Construction"));
    kontrol("crystalsapien tabloda YOK",
            ![...ayar.BEN10.values()].some((t) => t.kaynak === "crystalsapien"));
  }

  /* Bicim sayisi UYDURULMAMIS olmali: tabloda uc bicimi olan
     her uzaylinin modda da uc modeli olmali, tek bicimlinin
     de tek modeli.                                          */
  for (const [anahtar, t] of ayar.BEN10) {
    if (t.bicim === "") {
      kontrol(anahtar + ": tek bicim, adinda bicim yok",
              !t.ad.includes(" · "), t.ad);
      for (const son of ["_proto", "_10k"]) {
        kontrol(anahtar + son + ": uydurma bicim uretilmemis",
                !ayar.BEN10.has(anahtar + son));
      }
    }
  }

  /* Bir turun butun bicimleri AYNI gucleri paylasmali: modun
     powers dosyasi tur basina TEK.                          */
  const tabana = new Map();
  for (const [, t] of ayar.BEN10) {
    if (!tabana.has(t.taban)) tabana.set(t.taban, []);
    tabana.get(t.taban).push(JSON.stringify(t.efektler));
  }
  for (const [taban, g] of tabana) {
    kontrol(taban + ": bicimler ayni gucleri paylasiyor",
            new Set(g).size === 1);
  }
}

console.log("");
console.log("=== 2. CEVIRI KAYIPSIZ MI ===");
{
  for (const [anahtar, dosyalar] of Object.entries(KAYNAK)) {
    const cikti = OMP + "/models/entity/" + anahtar + ".geo.json";
    kontrol(anahtar + ": modeli uretilmis", existsSync(cikti));
    if (!existsSync(cikti)) continue;
    const g = oku(cikti)["minecraft:geometry"][0];

    /* KUP SAYISI kaynakla ayni olmali. Kemik sayisi
       AZALABILIR (ikinci dosyanin bos kokleri birlesiyor) ama
       KUP kaybolmamali.                                       */
    let kaynakKup = 0;
    for (const d of dosyalar) {
      const ky = KOK + "/kaynak_geo/" + d + ".geo.json";
      if (!existsSync(ky)) continue;
      for (const b of oku(ky)["minecraft:geometry"][0].bones) {
        kaynakKup += (b.cubes || []).length;
      }
    }
    const ciktiKup = g.bones.reduce((n, b) => n + (b.cubes || []).length, 0);
    kontrol(anahtar + ": hicbir kup kaybolmadi",
            ciktiKup === kaynakKup, ciktiKup + " / " + kaynakKup);

    /* ALTI VANILLA KOK KEMIK. Biri eksikse o parca vanilla
       animasyonla surulmez -- havada asili kalir.             */
    const adlar = g.bones.map((b) => b.name);
    for (const v of VANILLA) {
      kontrol(anahtar + ": '" + v + "' kemigi var", adlar.includes(v));
    }
    /* Palladium'un ALTI KOK adi kalmamali. Baska `armor*`
       adlari SORUN DEGIL: ornegin Ates Topu'ndaki
       `armorBodyHat` armorBody'nin COCUGU ve cikti da
       `body`ye bagli -- yani oyuncunun govde kemigi onu da
       suruyor. Yetim kemik denetimi zaten asagida.           */
    const PALLADIUM_KOK = ["armorHead", "armorBody", "armorLeftArm",
                           "armorRightArm", "armorLeftLeg", "armorRightLeg"];
    kontrol(anahtar + ": Palladium kok adlari cevrilmis",
            !adlar.some((x) => PALLADIUM_KOK.includes(x)),
            adlar.filter((x) => PALLADIUM_KOK.includes(x)).join(",") || "temiz");
    /* Her kemik ya vanilla kok ya da bir agacin icinde olmali:
       kupu olan KOK bir kemik hicbir animasyonla surulmez,
       havada asili kalir.                                     */
    const bosKok = g.bones.filter(
      (b) => !b.parent && !VANILLA.includes(b.name) && (b.cubes || []).length);
    kontrol(anahtar + ": basibos kok kemik yok", bosKok.length === 0,
            bosKok.map((b) => b.name).join(",") || "yok");
    /* Blockbench'in bos koku atilmali.                        */
    kontrol(anahtar + ": bb_main atilmis", !adlar.includes("bb_main"));

    /* YINELENEN KEMIK: Bedrock yinelenen adı kabul etmiyor.  */
    kontrol(anahtar + ": yinelenen kemik yok",
            new Set(adlar).size === adlar.length,
            adlar.length + " kemik");
    /* YETIM KEMIK: ebeveyni olmayan kemik cizilmez.          */
    const yetim = g.bones.filter((b) => b.parent && !adlar.includes(b.parent));
    kontrol(anahtar + ": yetim kemik yok", yetim.length === 0,
            yetim.map((b) => b.name).join(",") || "yok");

    /* Kimlik: modun kendi kimlikleri BOZUK (tetramand'inki
       "geometry.Diamondhead", piscciss'inki "geometry.unknown").
       Kendi kimligimizi yazmasaydik dordu birbirini ezerdi.  */
    kontrol(anahtar + ": kendi kimligi",
            g.description.identifier === "geometry." + anahtar,
            g.description.identifier);

    /* Doku boyutu kaynaktan gelmeli, varsayilana dusmemeli.  */
    const kaynakGeo = oku(KOK + "/kaynak_geo/" + dosyalar[0] + ".geo.json")["minecraft:geometry"][0];
    kontrol(anahtar + ": doku boyutu kaynaktan",
            g.description.texture_width === kaynakGeo.description.texture_width &&
            g.description.texture_height === kaynakGeo.description.texture_height,
            g.description.texture_width + "x" + g.description.texture_height);
  }

  /* Dort Kol'un GERCEKTEN dort kolu olmali: iki dosya
     birlestirildi mi?                                         */
  const dk = oku(OMP + "/models/entity/ben_dortkol.geo.json")["minecraft:geometry"][0];
  const kolAltAgaci = (kok) => {
    const cocuk = {};
    for (const b of dk.bones) (cocuk[b.parent] = cocuk[b.parent] || []).push(b);
    let n = 0, sira = [kok];
    while (sira.length) {
      const ad = sira.pop();
      for (const b of (cocuk[ad] || [])) { n += (b.cubes || []).length; sira.push(b.name); }
    }
    return n;
  };
  /* Iki kol zinciri birden ayni kok kemikten sarkiyor: sol
     kolun altinda hem forearm5 hem forearm olmali.            */
  const solKup = kolAltAgaci("leftArm");
  kontrol("Dort Kol: sol kolda IKI kol zinciri var", solKup >= 10,
          solKup + " kup");
  const solCocuk = dk.bones.filter((b) => b.parent === "leftArm").length;
  kontrol("Dort Kol: leftArm'in birden fazla cocugu var", solCocuk >= 2,
          solCocuk + " cocuk");
}

console.log("");
console.log("=== 3. KEMIK ADI CAKISMASI COZULDU ===");
{
  /* Ates Topu ve Yuzen Cene'de zaten `head` adinda kemik VAR.
     Cozulmeseydi yaratigin kafasi kaybolurdu.                */
  for (const anahtar of ["ben_ates", "ben_cene"]) {
    const kaynakAdlar = oku(KOK + "/kaynak_geo/" + anahtar + ".geo.json")["minecraft:geometry"][0]
      .bones.map((b) => b.name);
    kontrol(anahtar + ": kaynakta cakisan 'head' vardi",
            kaynakAdlar.includes("head") && kaynakAdlar.includes("armorHead"));

    const g = oku(OMP + "/models/entity/" + anahtar + ".geo.json")["minecraft:geometry"][0];
    const adlar = g.bones.map((b) => b.name);
    kontrol(anahtar + ": cakisan kemik korunmus (head_ic)",
            adlar.includes("head_ic"));
    /* Kafanin kupleri KAYBOLMAMIS olmali.                    */
    const kaynakKafa = oku(KOK + "/kaynak_geo/" + anahtar + ".geo.json")["minecraft:geometry"][0]
      .bones.find((b) => b.name === "head");
    const ciktiKafa = g.bones.find((b) => b.name === "head_ic");
    kontrol(anahtar + ": eski 'head'in kupleri duruyor",
            (ciktiKafa.cubes || []).length === (kaynakKafa.cubes || []).length,
            (ciktiKafa.cubes || []).length + " kup");
  }
}

console.log("");
console.log("=== 4. DOKULAR ===");
{
  for (const anahtar of Object.keys(KAYNAK)) {
    const d = OMP + "/textures/entity/" + anahtar + ".png";
    kontrol(anahtar + ": dokusu pakette", existsSync(d));
    const k = KOK + "/kaynak_doku/" + anahtar + ".png";
    kontrol(anahtar + ": kaynaktan BIREBIR",
            existsSync(k) && existsSync(d) &&
            Buffer.compare(readFileSync(k), readFileSync(d)) === 0);
    kontrol(anahtar + ": ikonu uretilmis",
            existsSync(RP + "/textures/item/" + anahtar + ".png"));
  }
}

console.log("");
console.log("=== 5. ESYA VE DONUSUM TETIGI ===");
{
  const d = oku(OMP + "/entity/player.entity.json")["minecraft:client_entity"].description;
  for (const anahtar of Object.keys(KAYNAK)) {
    const e = oku(BP + "/items/" + anahtar + ".json")["minecraft:item"];
    kontrol(anahtar + ": esyasi var", e.description.identifier === "pa:" + anahtar);
    kontrol(anahtar + ": yan ele konabiliyor",
            e.components["minecraft:allow_off_hand"] === true);
    kontrol(anahtar + ": silah degil (hasar yok)",
            !("minecraft:damage" in e.components));

    /* AD ALANI TUZAGI: molang 'pa:' gormuyor.               */
    const tetik = d.scripts.pre_animation.find(
      (x) => x.startsWith("variable." + anahtar + " ="));
    kontrol(anahtar + ": tetigi var", !!tetik);
    kontrol(anahtar + ": karsilastirma AD ALANSIZ",
            !!tetik && tetik.includes("'" + anahtar + "'") &&
            !tetik.includes("'pa:" + anahtar + "'"));
    kontrol(anahtar + ": iki el de sinaniyor",
            !!tetik && tetik.includes("main_hand") && tetik.includes("off_hand"));
    kontrol(anahtar + ": geometrisi bagli",
            d.geometry[anahtar] === "geometry." + anahtar);
    kontrol(anahtar + ": dokusu bagli",
            d.textures[anahtar] === "textures/entity/" + anahtar);
  }
}

console.log("");
console.log("=== 6. GUCLER: SAYILAR MODUN KENDI JSON'UNDAN ===");
{
  const yol = JAR + "/data/alienevo_aliens/palladium/powers/";
  if (!existsSync(yol + "tetramand.json")) {
    console.log("  · jar diskte degil, karsilastirma atlandi");
  } else {
    const attr = (dosya) => {
      const d = oku(yol + dosya + ".json");
      const c = {};
      for (const v of Object.values(d.abilities || {})) {
        if ((v.type || "").split(":").pop() !== "attribute_modifier") continue;
        const a = String(v.attribute).split(":").pop();
        c[a] = Math.max(c[a] === undefined ? -1e9 : c[a], v.amount);
      }
      return c;
    };
    /* Can Artisi seviye basina +4 CAN: +20 -> V, +40 -> X.
       Ikisi de BIREBIR tutuyor.                              */
    const elmas = attr("petrosapien");
    kontrol("petrosapien gercekten max_health +20",
            elmas["generic.max_health"] === 20, String(elmas["generic.max_health"]));
    const eh = ayar.BEN10.get("ben_elmas").efektler.find((e) => e[0] === "health_boost");
    kontrol("Elmas Kafa can artisi BIREBIR",
            eh && (eh[2] + 1) * 4 === elmas["generic.max_health"],
            eh && "+" + ((eh[2] + 1) * 4) + " can");

    const dort = attr("tetramand");
    kontrol("tetramand gercekten max_health +40",
            dort["generic.max_health"] === 40, String(dort["generic.max_health"]));
    const dh = ayar.BEN10.get("ben_dortkol").efektler.find((e) => e[0] === "health_boost");
    kontrol("Dort Kol can artisi BIREBIR",
            dh && (dh[2] + 1) * 4 === dort["generic.max_health"],
            dh && "+" + ((dh[2] + 1) * 4) + " can");

    /* Guc: seviye basina +3. Tam bolunmeyenlerde EN YAKIN
       seviye secilmis olmali (2'den fazla sapma kabul degil). */
    for (const [anahtar, dosya] of [["ben_elmas", "petrosapien"],
                                    ["ben_dortkol", "tetramand"]]) {
      const a = attr(dosya);
      const g = ayar.BEN10.get(anahtar).efektler.find((e) => e[0] === "strength");
      const hedef = a["generic.attack_damage"];
      kontrol(anahtar + ": guc en yakin seviyede",
              g && Math.abs((g[2] + 1) * 3 - hedef) <= 2,
              g && ("Guc " + (g[2] + 1) + " = +" + ((g[2] + 1) * 3) +
                    " / hedef +" + hedef));
    }

    /* Her yaratigin kaynak dosyasi modda GERCEKTEN olmali.   */
    for (const [anahtar, t] of ayar.BEN10) {
      kontrol(anahtar + ": kaynagi modda var (" + t.kaynak + ")",
              existsSync(yol + t.kaynak + ".json"));
    }
  }

  for (const [anahtar, t] of ayar.BEN10) {
    kontrol(anahtar + ": seviyeler motor sinirinda",
            t.efektler.every((e) => e[2] >= 0 && e[2] <= 255));
    const dir = t.efektler.find((e) => e[0] === "resistance");
    kontrol(anahtar + ": Direnc olumsuzluk vermiyor (< V)",
            !dir || dir[2] <= 3, dir ? "Direnc " + (dir[2] + 1) : "yok");
  }
}

console.log("");
console.log("=== 7. ELINE ALINCA GUCLER GELIYOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "b1"; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  D.boyut._efektler = [];
  ben.ben10Unut(o.id);

  kontrol("eli bosken yaratik yok", ben.elindekiYaratik(o) === undefined);
  tickIlerlet(2);
  kontrol("eli bosken efekt verilmiyor",
          (D.boyut._efektler || []).length === 0);

  o._elde = "pa:ben_dortkol";
  kontrol("eline alinca taniniyor",
          ben.elindekiYaratik(o) === "ben_dortkol");
  /* Bicimler de taninmali. */
  for (const son of ["_proto", "_10k"]) {
    o._elde = "pa:ben_dortkol" + son;
    kontrol("ben_dortkol" + son + " taniniyor",
            ben.elindekiYaratik(o) === "ben_dortkol" + son);
  }
  o._elde = "pa:ben_dortkol";
  tickIlerlet(2);
  const gelen = (D.boyut._efektler || []).map((e) => e.ad);
  for (const [ad] of ayar.BEN10.get("ben_dortkol").efektler) {
    kontrol("Dort Kol: " + ad + " verildi", gelen.includes(ad));
  }
  kontrol("parcaciklar kapali",
          (D.boyut._efektler || []).every((e) => e.o && e.o.showParticles === false));

  /* Birakinca durmali: gucun elindeki esyaya bagli.          */
  D.boyut._efektler = [];
  o._elde = undefined;
  tickIlerlet(3);
  kontrol("birakinca efekt kesiliyor",
          (D.boyut._efektler || []).length === 0,
          (D.boyut._efektler || []).length + " efekt");
}

console.log("");
console.log("=== 8. ULASILABILIYOR MU ===");
{
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js ben10.js'i import ediyor",
          kaynak.includes('from "./yetenekler/ben10.js"'));
  kontrol("menude satiri var", /calis\(\)\s*\{\s*ben10Menusu\(oyuncu\);\s*\}/.test(kaynak));
  kontrol("menu satiri suanki yaratigi gosteriyor",
          kaynak.includes("elindekiYaratik(oyuncu)"));
  kontrol("tarama merkezi tick'ten cagriliyor", /ben10Tara\(oyuncular\)/.test(kaynak));
  kontrol("playerLeave temizliyor", /ben10Unut\(olay\.playerId\)/.test(kaynak));

  for (const dosya of ["en_US.lang", "tr_TR.lang"]) {
    const metin = readFileSync(RP + "/texts/" + dosya, "utf8");
    for (const anahtar of Object.keys(KAYNAK)) {
      kontrol(dosya + ": " + anahtar + " adi var",
              metin.includes("item.pa:" + anahtar + ".name="));
    }
  }
  const atlas = oku(RP + "/textures/item_texture.json").texture_data;
  for (const anahtar of Object.keys(KAYNAK)) {
    kontrol(anahtar + ": atlasa kayitli", !!atlas[anahtar]);
  }
  const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
  kontrol("ikonlar temizlik listesinde",
          uretec.includes("beklenen.add(_bk3)"));
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
console.log("=== 9. OMNITRIX SAATLERI ===");
{
  /* Kullanici: "saat OLMALI sadece" -- yani bir yetenek degil,
     bir saat. Hasari yok, yuva harcamiyor.                   */
  for (const a of ["omnitrix_proto", "omnitrix_recal"]) {
    const e = oku(BP + "/items/" + a + ".json")["minecraft:item"];
    kontrol(a + ": esyasi var", e.description.identifier === "pa:" + a);
    kontrol(a + ": silah degil", !("minecraft:damage" in e.components));
    kontrol(a + ": zirh yuvasi harcamiyor",
            !("minecraft:wearable" in e.components));
    kontrol(a + ": attachable var",
            existsSync(RP + "/attachables/" + a + ".json"));
    const at = oku(RP + "/attachables/" + a + ".json")["minecraft:attachable"].description;
    kontrol(a + ": vanilla zirh denetleyicisi",
            at.render_controllers[0] === "controller.render.armor");
    kontrol(a + ": modeli var",
            existsSync(RP + "/models/entity/" + a + ".geo.json"));

    /* BILEKTE olmali: modelin kupleri sag/sol kol araliginda.
       Kemik adlari cevrilmemis olsaydi saat havada dururdu.  */
    const g = oku(RP + "/models/entity/" + a + ".geo.json")["minecraft:geometry"][0];
    const adlar = g.bones.map((b) => b.name);
    kontrol(a + ": kol kemigine bagli",
            adlar.includes("leftArm") || adlar.includes("rightArm"));
    kontrol(a + ": Palladium kok adlari cevrilmis",
            !adlar.some((x) => ["armorHead", "armorBody", "armorLeftArm",
                                "armorRightArm", "armorLeftLeg",
                                "armorRightLeg"].includes(x)));
    const xs = g.bones.flatMap((b) => (b.cubes || []).flatMap(
      (c) => [c.origin[0], c.origin[0] + c.size[0]]));
    kontrol(a + ": kupler bilek konumunda (x 3..10)",
            Math.min(...xs) >= 3 && Math.max(...xs) <= 10,
            "x[" + Math.min(...xs).toFixed(1) + "," + Math.max(...xs).toFixed(1) + "]");
    kontrol(a + ": ikonu diskte",
            existsSync(RP + "/textures/item/" + a + ".png"));
  }
}

console.log("");
console.log("=== 10. MODUN KENDI ANIMASYONLARI ===");
{
  /* Kullanici: "animasyon falan varsa her seyi ekle."
     Mod GeckoLib kullandigi icin animasyonlari da Bedrock
     bicimi (format_version 1.8.0) -- oldugu gibi kopyalandi. */
  for (const a of ["petrosapien", "ripjaws", "prototype", "recal_omnitrix"]) {
    const y = OMP + "/animations/" + a + ".animation.json";
    kontrol(a + ": animasyon dosyasi pakette", existsSync(y));
    if (!existsSync(y)) continue;
    const d = oku(y);
    kontrol(a + ": Bedrock bicimi (1.8.0)", d.format_version === "1.8.0",
            d.format_version);
    /* Hicbiri armorX kemiklerini surmemeli: surseydi bizim
       yeniden adlandirmamiz onlari kirardi.                  */
    const ham = readFileSync(y, "utf8");
    kontrol(a + ": armorX kemiklerini surmuyor",
            !/"armor(Head|Body|LeftArm|RightArm|LeftLeg|RightLeg)"\s*:/.test(ham));
  }

  /* Baglanan animasyonlar: kosullari gecerli olmali. */
  const pd = oku(OMP + "/entity/player.entity.json")["minecraft:client_entity"].description;
  for (const ad of ["ripjaws_yavas", "ripjaws_hizli"]) {
    kontrol(ad + ": oyuncuya baglanmis", !!pd.animations[ad]);
    const kayit = pd.scripts.animate.find(
      (x) => typeof x === "object" && ad in x);
    kontrol(ad + ": kosulu var", !!kayit);
    /* Sadece o yaratiktayken calismali.                      */
    kontrol(ad + ": yalniz Yuzen Cene'de",
            !!kayit && kayit[ad].includes("variable.ben_cene_ailesi"));
    kontrol(ad + ": suda calisiyor",
            !!kayit && kayit[ad].includes("query.is_in_water"));
  }

  /* BICIM AILESI degiskenleri: uc bicimi tek tek yazmak
     yerine tek degisken. Biri eksikse o bicimde animasyon
     calismaz ve sebebi gorunmez.                            */
  const TABANLAR = [...new Set([...ayar.BEN10.values()].map((t) => t.taban))];
  for (const t of TABANLAR) {
    const satir = pd.scripts.pre_animation.find(
      (x) => x.startsWith("variable.ben_" + t + "_ailesi ="));
    kontrol("ben_" + t + "_ailesi tanimli", !!satir);
    /* Tek bicimli uzaylida aile TEK uyeli -- olmayan bicimi
       aramak yanlis olurdu.                                 */
    const sonekler = ayar.BEN10.has("ben_" + t + "_proto") ? SONEK : [""];
    for (const son of sonekler) {
      /* Ad SINIRINA kadar eslesmeli: duz includes ile
         "ben_elmas" ararken "ben_elmas_10k" da eslesir ve
         eksik bir aile FARK EDILMEZ. Sinir: bosluk, ; ya da
         satir sonu.                                          */
      const kalip = new RegExp("variable\\.ben_" + t + son + "(\\s|;|$)");
      kontrol("  ailesi 'ben_" + t + son + "' bicimini sayiyor",
              !!satir && kalip.test(satir));
    }
  }
}

console.log("");
console.log("=== 11. UZAYLI BOYUTLARI (v4.97) ===");
{
  /* Kullanici: "uzayli boyutlari daha buyuk olmasi
     gerekiyordu, normal Steve boyutunda."

     Sebep: modun her uzayli gucunde bir palladium:size
     yetenegi var ve oyuncuyu o carpanla buyutuyor. Biz
     `.geo.json`'u HAM aliyorduk; o dosyalar 1x cizilmis ve
     carpan cizim sirasinda uygulaniyor. Dort Kol tam 2 KAT
     kucuk cikiyordu.

     Bedrock'ta oyuncu modelini calistirma aninda olceklemek
     yok, o yuzden carpan GEOMETRIYE isleniyor.              */
  /* v6.0: olcek tablosu ELLE YAZILMIYOR. On dokuz uzayli
     var ve tablo kol_uret.py'de duruyor; burada okunup modun
     kendi JSON'uyla karsilastiriliyor. Iki yerde yazsaydik
     biri guncellenip oteki unutulurdu.                       */
  const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
  const blok = uretec.slice(uretec.indexOf("BEN10_TABAN = ["),
                            uretec.indexOf("# tur adi -> modun kendi power dosyasi"));
  const OLCEK = {};
  for (const m of blok.matchAll(
      /\("(\w+)",\s*"[^"]*",\s*"[^"]*",\s*"([^"]*)",\s*([0-9.]+),\s*(\d+),/g)) {
    OLCEK[m[1]] = { tur: m[2], olcek: parseFloat(m[3]), bicim: parseInt(m[4], 10) };
  }
  kontrol("kol_uret.py olcek tablosu okundu (24 satir)",
          Object.keys(OLCEK).length === 24,
          Object.keys(OLCEK).length + " satir");
  /* v6.1: ek formlarin olcegi IKI yetenegin CARPIMI. Hangi
     ikisi oldugu kol_uret.py:BEN10_BOY_YETENEK'te yaziyor;
     burada o adlar jar'da aranip carpiliyor.                 */
  const boyBlok = uretec.slice(uretec.indexOf("BEN10_BOY_YETENEK = {"),
                               uretec.indexOf("# tur adi -> modun kendi power dosyasi"));
  const BOY = {};
  for (const m of boyBlok.matchAll(/"(\w+)":\s*\("(\w+)",\s*"(\w+)"\)/g)) {
    BOY[m[1]] = [m[2], m[3]];
  }
  kontrol("carpim tablosu okundu (3 satir)", Object.keys(BOY).length === 3,
          Object.keys(BOY).length + " satir");
  /* tur adi -> guc dosyasi eslemesi de ayni dosyadan.        */
  const dosyaBlok = uretec.slice(uretec.indexOf("BEN10_GUC_DOSYA = {"),
                                 uretec.indexOf("# (anahtar, TR ad, EN ad, geo dosyalari, tur adi)"));
  const GUCADI = {};
  for (const m of dosyaBlok.matchAll(/"([^"]+)":\s*"([a-z_]+)",/g)) GUCADI[m[1]] = m[2];
  const GUCLER = JAR + "/data/alienevo_aliens/palladium/powers";

  /* Yukseklik olcumu: ham geo dosyasindan ve uretilenden.
     Oran carpanla ayni olmali.                              */
  function yukseklik(geo) {
    let lo = Infinity, hi = -Infinity;
    for (const b of geo.bones) {
      for (const c of b.cubes || []) {
        const inf = c.inflate || 0;
        lo = Math.min(lo, c.origin[1] - inf);
        hi = Math.max(hi, c.origin[1] + c.size[1] + inf);
      }
    }
    return hi - lo;
  }

  const HAM = KOK + "/kaynak_geo";
  for (const [t, { tur, olcek, bicim }] of Object.entries(OLCEK)) {
    const guc = GUCADI[tur];
    kontrol(t + ": guc dosyasi tabloda", !!guc, tur);

    /* 1. Carpan modun KENDI dosyasindan mi?
       `palladium:size` yetenegi KOSULSUZ olani sayiliyor:
       Gri Madde'nin zirhli/takimli halleri (x5, x6.6) ve
       Gulle'nin yuvarlanma hali (x1.03) bir tusa basiliyken
       geciyor, bizde oyle bir durum yok. Kosulsuzu olmayan
       uzayli 1x cizilmis demektir.                          */
    const gy = GUCLER + "/" + guc + ".json";
    if (guc && existsSync(gy)) {
      const d = oku(gy);
      let kaynakOlcek;
      if (BOY[t]) {
        /* Ek form: iki `palladium:size` AYNI ANDA acik ve
           pehkui bunlari CARPIYOR. Kaniti modun kendi icinde:
           Devasaur'un `size_change` 2.8 ve `size_change_grow`
           2.3 -- ezseydi "buyume" oyuncuyu KUCULTURDU.      */
        const a = (d.abilities || {})[BOY[t][0]];
        const b = (d.abilities || {})[BOY[t][1]];
        kontrol(t + ": iki olcek yetenegi de modda var", !!a && !!b);
        kaynakOlcek = (a ? a.scale : 1) * (b ? b.scale : 1);
      } else {
        const boylar = Object.values(d.abilities || {}).filter(
          (v) => v.type === "palladium:size" &&
                 !(v.conditions && ((v.conditions.enabling || []).length ||
                                    (v.conditions.unlocking || []).length)));
        kaynakOlcek = boylar.length ? boylar[0].scale : 1.0;
      }
      kontrol(t + ": carpan modun kendi JSON'unda (" + guc + ")",
              Math.abs(kaynakOlcek - olcek) < 1e-3,
              "kaynak " + kaynakOlcek + " / tablo " + olcek);
    } else {
      console.log("  · " + guc + ".json diskte degil, karsilastirma atlandi");
    }

    /* 2. Uretilen model gercekten O KADAR mi buyudu? */
    for (const son of SONEK.slice(0, bicim)) {
      const a = "ben_" + t + son;
      const uretilenYol = OMP + "/models/entity/" + a + ".geo.json";
      if (!existsSync(uretilenYol)) continue;
      /* Ham boy BUTUN kaynak dosyalarindan olculuyor. Sinek
         Suratli'nin kanatlari ve arka bacaklari ayri
         dosyalarda ve govdeden UZUN; sadece govdeye baksaydik
         test "model kendiliginden buyudu" diye yanlis alarm
         verirdi -- nitekim verdi.                            */
      let lo = Infinity, hi = -Infinity;
      for (const d of KAYNAK[a] || [a]) {
        const hy = HAM + "/" + d + ".geo.json";
        if (!existsSync(hy)) continue;
        for (const b of oku(hy)["minecraft:geometry"][0].bones) {
          for (const c of b.cubes || []) {
            const inf = c.inflate || 0;
            lo = Math.min(lo, c.origin[1] - inf);
            hi = Math.max(hi, c.origin[1] + c.size[1] + inf);
          }
        }
      }
      if (!isFinite(lo)) continue;
      const h = hi - lo;
      const u = yukseklik(oku(uretilenYol)["minecraft:geometry"][0]);
      const oran = u / h;
      kontrol("  " + a + ": boy carpanla buyudu",
              Math.abs(oran - olcek) < 0.02,
              h.toFixed(1) + " -> " + u.toFixed(1) + " (x" + oran.toFixed(3) +
              ", beklenen x" + olcek + ")");
    }
  }

  /* 4. SEKIL BOZULMADI: en/boy orani ham dosyayla ayni
     kalmali. Carpani yanlis yere uygulamak (ornegin uv'lere
     ya da donuslere) modeli burardi ve hicbir yukseklik
     olcumu bunu yakalamazdi.                                */
  function enBoy(geo) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const b of geo.bones) {
      for (const c of b.cubes || []) {
        x0 = Math.min(x0, c.origin[0]); x1 = Math.max(x1, c.origin[0] + c.size[0]);
        y0 = Math.min(y0, c.origin[1]); y1 = Math.max(y1, c.origin[1] + c.size[1]);
      }
    }
    return (x1 - x0) / (y1 - y0);
  }
  for (const t of Object.keys(OLCEK)) {
    const a = "ben_" + t;
    const hamYol = HAM + "/" + a + ".geo.json";
    /* Sinek Suratli ATLANIYOR: uretilen modeli UC dosyanin
       birlesimi (govde + arka bacaklar + kanatlar), yani ham
       govdeyle en/boy orani zaten tutmaz. Kup sayisi denetimi
       2. bolumde onu ayrica tutuyor.                         */
    if (!existsSync(hamYol) || (KAYNAK[a] || [a]).length > 1) continue;
    const h = enBoy(oku(hamYol)["minecraft:geometry"][0]);
    const u = enBoy(oku(OMP + "/models/entity/" + a + ".geo.json")["minecraft:geometry"][0]);
    kontrol(a + ": en/boy orani degismedi (sekil bozulmadi)",
            Math.abs(h - u) < 0.01, h.toFixed(3) + " vs " + u.toFixed(3));
  }

  /* 5. UV'ler DEGISMEDI: doku ayni, sadece kaplandigi yuzey
     buyudu. Uv'yi carpsaydik dokular kayardi.               */
  {
    /* Dort Kol DEGIL: onun uretilen modeli IKI dosyanin
       birlesimi (fazladan iki kol ayri dosyada), yani ham
       dosyayla kup sayilari zaten farkli. Elmas Kafa tek
       dosya ve carpani 1'den buyuk -- karsilastirmaya uygun. */
    const a = "ben_elmas";
    const hamYol = HAM + "/" + a + ".geo.json";
    if (existsSync(hamYol)) {
      const h = oku(hamYol)["minecraft:geometry"][0];
      const u = oku(OMP + "/models/entity/" + a + ".geo.json")["minecraft:geometry"][0];
      const uv = (g) => g.bones.flatMap((b) => (b.cubes || []).map(
        (c) => JSON.stringify(c.uv)));
      kontrol(a + ": uv'ler degismedi (doku kaymadi)",
              JSON.stringify(uv(h)) === JSON.stringify(uv(u)));
      /* Donusler de carpilmamali: aci olcekten bagimsiz. */
      const rot = (g) => g.bones.flatMap((b) => (b.rotation ? [JSON.stringify(b.rotation)] : []));
      kontrol(a + ": kemik donusleri degismedi",
              JSON.stringify(rot(h)) === JSON.stringify(rot(u)));
    }
  }

  /* 6. Max Steel modlari BUYUMEDI: kaynakta onlarin
     palladium:size yetenegi YOK. Yanlislikla hepsini
     olceklemedigimizi sinliyoruz.                          */
  {
    const geo = oku(OMP + "/models/entity/zirh_mod_temel.geo.json")["minecraft:geometry"][0];
    kontrol("Max Steel modlari olceklenmedi (kaynakta size yok)",
            yukseklik(geo) < 40, yukseklik(geo).toFixed(1) + " birim");
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Ben 10: " + ayar.BEN10.size + " bicim + 2 saat yerinde");
process.exit(hata ? 1 : 0);

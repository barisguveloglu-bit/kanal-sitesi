/* OYUNCU MODELI -- OYUNCUNUN KENDISI O SEY OLUYOR        v4.90

   Kullanici: "ama kanka bunu yapiyorlar mobilde nasil yapiyorlar
   ... bir tane mod yuklemistim sen orada var demistin, onu
   yapacagiz, kararliyim."

   ---- HAKLIYDI, YONTEM VAR ----
   Skin degil: OYUNCU ISTEMCI TANIMINI EZMEK. Kullanicinin daha
   once yukledigi DORT pakette de ayni sey var (Boralo Mod V2,
   YeniBoraLoV3, GuneyLo_Nitroxin, DistortedB). Uculu kalip:

     geometry:           "X": "geometry.X"
     pre_animation:      variable.X =
                           query.get_equipped_item_name('main_hand') == 'X';
     render_controllers: {"controller.render.X": "variable.X"}

   Onlar oyuncuya asa/silah EKLIYOR; biz GOVDEYI DEGISTIRIYORUZ,
   o yuzden bir adim daha var: vanilla ucuncu sahis
   denetleyicisini kapatmak. Onsuz oyuncunun kendi bedeni O
   Sey'in icinde kalir.

   ---- BU DOSYANIN TUTTUGU SEY ----
   Zincirin BES halkasi. Biri kopsa oyunda ya hicbir sey olmaz
   ya da oyuncu iki bedenli gorunur -- ikisinin de sebebi
   tabletten anlasilmaz.                                        */

import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const OMP = KOK + "/Simsek_Oyuncu_Modeli";
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

const d = oku(OMP + "/entity/player.entity.json")["minecraft:client_entity"].description;

console.log("=== 1. TABAN VANILLA OYUNCU TANIMI ===");
{
  /* Dosya ELLE YAZILMADI: icinde ~70 satir vanilla molang ve
     ~70 animasyon adi var. Biri kaysa oyuncu cizimi bozulur ve
     sebebi gorunmez. Taban referans paketten alindi, onlarin
     kendi ekleri temizlendi.                                  */
  kontrol("oyuncu tanimini eziyor",
          d.identifier === "minecraft:player", d.identifier);
  kontrol("vanilla geometri duruyor",
          d.geometry.default === "geometry.humanoid.custom");
  kontrol("pelerin duruyor", d.geometry.cape === "geometry.cape");
  kontrol("vanilla animasyonlar duruyor (>50)",
          Object.keys(d.animations).length > 50,
          Object.keys(d.animations).length + " animasyon");
  kontrol("vanilla molang duruyor (>20 satir)",
          d.scripts.pre_animation.length > 20,
          d.scripts.pre_animation.length + " satir");
  /* Referans paketin KENDI ekleri sizmamali: onlarin dokusu ve
     modeli bizde yok, kalsaydi eksik dosya hatasi verirdi.    */
  const ham = readFileSync(OMP + "/entity/player.entity.json", "utf8");
  for (const yabanci of ["bobby_gun", "elharkos", "dirt_staff", "nitroxin"]) {
    kontrol("referansin '" + yabanci + "' eki temizlenmis",
            !ham.includes(yabanci));
  }
}

console.log("");
console.log("=== 2. EK GEOMETRI VE DOKU ===");
{
  kontrol("geometry.o_sey tanimli", d.geometry.o_sey === "geometry.o_sey");
  kontrol("dokusu tanimli", d.textures.o_sey === "textures/entity/o_sey");
  /* Paket KENDI KENDINE YETMELI: ana kaynak paketi kapatilsa
     bile donusum calissin.                                    */
  kontrol("geometri dosyasi pakette",
          existsSync(OMP + "/models/entity/o_sey.geo.json"));
  kontrol("doku dosyasi pakette",
          existsSync(OMP + "/textures/entity/o_sey.png"));
  kontrol("animasyon dosyasi pakette",
          existsSync(OMP + "/animations/o_sey.animation.json"));

  /* Iki kopya URETILIYOR, elle kopyalanmiyor -- ayrisamazlar. */
  kontrol("geometri ana paketle BIREBIR ayni",
          Buffer.compare(readFileSync(OMP + "/models/entity/o_sey.geo.json"),
                         readFileSync(RP + "/models/entity/o_sey.geo.json")) === 0);
  kontrol("doku ana paketle BIREBIR ayni",
          Buffer.compare(readFileSync(OMP + "/textures/entity/o_sey.png"),
                         readFileSync(RP + "/textures/entity/o_sey.png")) === 0);
}

console.log("");
console.log("=== 3. TETIK: ELDEKI MASKE ===");
{
  const tetik = d.scripts.pre_animation.filter(
    (x) => x.startsWith("variable.o_sey ="));
  kontrol("variable.o_sey pre_animation'da", tetik.length === 1,
          tetik.length + " satir");
  const t = tetik[0] || "";
  kontrol("get_equipped_item_name kullaniyor",
          t.includes("query.get_equipped_item_name"));

  /* AD ALANI ATILIYOR. Belgede yazili ve referans paketlerde de
     boyle: esya 'pa:o_sey_maskesi' ama molang 'o_sey_maskesi'
     goruyor. 'pa:' yazilsaydi kosul HIC tutmazdi ve oyunda
     "maskeyi aldim ama bir sey olmuyor" derdin.               */
  kontrol("karsilastirma AD ALANSIZ ('pa:' yok)",
          t.includes("'o_sey_maskesi'") && !t.includes("'pa:o_sey_maskesi'"));

  /* Iki yuva da sinaniyor: yan el ana eli bos birakir.        */
  kontrol("ana el sinaniyor", t.includes("'main_hand'"));
  kontrol("yan el de sinaniyor", t.includes("'off_hand'"));
}

console.log("");
console.log("=== 4. CIZIM: O SEY GELIYOR, OYUNCU GIDIYOR ===");
{
  const rc = d.render_controllers.map((x) => JSON.stringify(x));
  const kendi = d.render_controllers.find(
    (x) => typeof x === "object" && "controller.render.o_sey" in x);
  kontrol("kendi denetleyicimiz eklendi", !!kendi);
  const kosul = kendi ? kendi["controller.render.o_sey"] : "";
  kontrol("sadece ucuncu sahiste ciziliyor",
          kosul.includes("!variable.is_first_person"),
          kosul);
  kontrol("harita yuzunde cizilmiyor", kosul.includes("!variable.map_face_icon"));
  kontrol("kosulu variable.o_sey", kosul.includes("variable.o_sey"));

  /* EN KRITIK HALKA. Bu olmadan oyuncunun KENDI bedeni O
     Sey'in icinde kalir -- yani "iki bedenli" gorunur ve
     sebebi hic anlasilmaz.                                    */
  let ucuncu = 0, kapali = 0;
  for (const x of d.render_controllers) {
    if (typeof x !== "object") continue;
    for (const [ad, k] of Object.entries(x)) {
      if (!ad.includes("third_person")) continue;
      ucuncu++;
      if (k.includes("!variable.donusuk")) kapali++;
    }
  }
  kontrol("vanilla ucuncu sahis denetleyicileri bulundu", ucuncu >= 2,
          ucuncu + " tane");
  kontrol("HEPSI donusukken kapatiliyor", ucuncu === kapali,
          kapali + "/" + ucuncu);

  /* v4.92: artik BES bicim var (O Sey + dort Ben 10 yaratigi).
     Vanilla govdeyi kapatan kosul TEK degisken uzerinden
     gidiyor: variable.donusuk. O degisken HER bicimi saymali --
     biri unutulursa o yaratiga donusunce oyuncunun kendi
     bedeni ICINDE kalir ve sebebi gorunmez.                  */
  const toplayici = d.scripts.pre_animation.find(
    (x) => x.startsWith("variable.donusuk ="));
  kontrol("variable.donusuk tanimli", !!toplayici);
  const bicimler = Object.keys(d.geometry)
    .filter((g) => g !== "default" && g !== "cape");
  /* Sayi ELLE YAZILMIYOR: yeni bicim eklenince test kirilmasin.
     v4.90 O Sey · v4.92-93 Ben 10 (12) · v4.94 Max Steel (9)
     · v6.0 Ben 10 41 · v6.1 bes ek formla 56.
     Onemli olan HER birinin uc halkasi da tam olmasi (asagida). */
  kontrol("bicimler tanimli", bicimler.length >= 13,
          bicimler.length + " bicim");
  /* v4.97: EK KATMANLAR ayri bir sinif.
     Guc modunun MATKAPLARI ve Titan'in HALESI kendi
     geometrisi ve kendi dokusuyla geliyor (Bedrock'ta bir
     geometrinin tek dokusu olur, uc katmanin uc dokusu var),
     ama KENDI TETIKLERI YOK -- ana modun degiskenine
     bagliler. Ayri bir tetik iki katmanin ayrisabilecegi
     anlamina gelirdi: matkaplar gorunur, takim gorunmez.  */
  const EK_KATMAN = { zirh_mod_guc_matkap: "zirh_mod_guc",
                      zirh_mod_titan_hale: "zirh_mod_titan" };
  const tabanBicimler = bicimler.filter((b) => !(b in EK_KATMAN));

  const beklenenGrup = { o_sey: 1, ben_: 56, zirh_mod_: 9 };
  for (const [onek, adet] of Object.entries(beklenenGrup)) {
    const n = tabanBicimler.filter((b) => b.startsWith(onek)).length;
    kontrol("'" + onek + "' grubu tam", n === adet, n + "/" + adet);
  }
  for (const b of tabanBicimler) {
    kontrol("donusuk '" + b + "' bicimini sayiyor",
            !!toplayici && toplayici.includes("variable." + b));
    kontrol(b + ": kendi tetigi var",
            d.scripts.pre_animation.some((x) => x.startsWith("variable." + b + " =")));
    kontrol(b + ": kendi denetleyicisi var",
            d.render_controllers.some(
              (x) => typeof x === "object" && ("controller.render." + b) in x));
  }
  for (const [ek, ana] of Object.entries(EK_KATMAN)) {
    kontrol("ek katman '" + ek + "' tanimli", bicimler.includes(ek));
    kontrol(ek + ": kendi denetleyicisi var",
            d.render_controllers.some(
              (x) => typeof x === "object" && ("controller.render." + ek) in x));
    /* Asil guvence: tetigi ANA modun degiskeni. */
    const rc = d.render_controllers.find(
      (x) => typeof x === "object" && ("controller.render." + ek) in x);
    kontrol(ek + ": tetigi ana modun degiskeni (" + ana + ")",
            !!rc && rc["controller.render." + ek].includes("variable." + ana + " "),
            rc ? rc["controller.render." + ek] : "-");
    kontrol(ek + ": KENDI tetigi YOK (ayrisamaz)",
            !d.scripts.pre_animation.some((x) => x.startsWith("variable." + ek + " =")));
    /* donusuk'e de girmemeli: ana mod zaten sayiliyor,
       ikinci kez saymak bir sey degistirmez ama yaniltir. */
    kontrol(ek + ": donusuk'e ayrica eklenmemis",
            !!toplayici && !toplayici.includes("variable." + ek));
  }

  /* Birinci sahis DOKUNULMAMALI: kendi kolunu gormeye devam
     etmelisin, yoksa elin kaybolur.                           */
  const birinci = d.render_controllers.filter(
    (x) => typeof x === "object" &&
      Object.keys(x).some((a) => a.includes("first_person")));
  kontrol("birinci sahis ellenmemis",
          birinci.every((x) => !JSON.stringify(x).includes("variable.o_sey")));

  const c = oku(OMP + "/render_controllers/o_sey.render_controllers.json");
  const rcx = c.render_controllers["controller.render.o_sey"];
  kontrol("denetleyici dosyasi var", !!rcx);
  kontrol("geometriyi gosteriyor", rcx.geometry === "Geometry.o_sey");
  kontrol("dokuyu gosteriyor", rcx.textures[0] === "Texture.o_sey");
}

console.log("");
console.log("=== 5. FAZLADAN DORT KOL SALLANIYOR ===");
{
  /* Vanilla oyuncu animasyonlari head/body/rightArm/leftArm/
     rightLeg/leftLeg kemiklerini ADIYLA suruyor -- modelimiz o
     adlari kullandigi icin yuruyus BEDAVA. Yatay dort kol
     vanilla'da yok, onlar icin kendi animasyonumuz gerekiyor. */
  kontrol("kendi animasyonumuz baglandi",
          d.animations.o_sey_kollar === "animation.o_sey.yuru");
  const son = d.scripts.animate.find(
    (x) => typeof x === "object" && "o_sey_kollar" in x);
  kontrol("sadece donusukken calisiyor",
          !!son && son.o_sey_kollar === "variable.o_sey",
          JSON.stringify(son));

  const anim = oku(OMP + "/animations/o_sey.animation.json")
    .animations["animation.o_sey.yuru"];
  for (const ad of ["rightUpperArm", "leftUpperArm",
                    "rightMiddleArm", "leftMiddleArm"]) {
    kontrol(ad + " animasyonda var", !!(anim.bones && anim.bones[ad]));
  }
  /* Vanilla zaten suruyor -- ikimiz birden sursek carpisirdik.
     Yine de kendi animasyonumuzda duruyorlar cunku ayni dosya
     kilik varliginda da kullaniliyor; orada vanilla yok.     */
  const geo = oku(OMP + "/models/entity/o_sey.geo.json")["minecraft:geometry"][0];
  const adlar = geo.bones.map((b) => b.name);
  for (const ad of ["head", "body", "rightArm", "leftArm", "rightLeg", "leftLeg"]) {
    kontrol("vanilla kemik adi '" + ad + "' korunmus", adlar.includes(ad));
  }
}

console.log("");
console.log("=== 6. MASKE ESYASI ===");
{
  const e = oku(BP + "/items/o_sey_maskesi.json")["minecraft:item"];
  kontrol("kimlik pa:o_sey_maskesi",
          e.description.identifier === "pa:o_sey_maskesi");
  kontrol("envanterde gorunuyor", !!e.description.menu_category);
  kontrol("yan ele konabiliyor",
          e.components["minecraft:allow_off_hand"] === true);
  kontrol("elde tutuluyor", e.components["minecraft:hand_equipped"] === true);
  /* Bir SILAH degil, bir ANAHTAR: hasari olmamali, yoksa
     donusmek icin elinde silah tasimak zorunda kalirsin.     */
  kontrol("hasari yok (silah degil)", !("minecraft:damage" in e.components));
  kontrol("tek tane yigiliyor", e.components["minecraft:max_stack_size"] === 1);
  kontrol("ikonu diskte",
          existsSync(RP + "/textures/item/o_sey_maskesi.png"));

  /* Atlas kaydi olmadan esya oyunda mor-siyah cikar.         */
  const atlas = oku(RP + "/textures/item_texture.json").texture_data;
  kontrol("atlasa kayitli", !!atlas.o_sey_maskesi,
          atlas.o_sey_maskesi && atlas.o_sey_maskesi.textures);

  /* Uretecin temizlik adimi listede olmayan her esyayi siler.
     Bu tuzak bu depoda DORT kez yasandi.                     */
  const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
  kontrol("temizlik listesinde (silinmeyecek)",
          uretec.includes("beklenen.add(MASKE_ESYA)"));

  for (const dosya of ["en_US.lang", "tr_TR.lang"]) {
    const metin = readFileSync(RP + "/texts/" + dosya, "utf8");
    kontrol(dosya + ": maskenin adi var",
            metin.includes("item.pa:o_sey_maskesi.name="));
  }
}

console.log("");
console.log("=== 7. AYRI PAKET, KURULABILIR ===");
{
  const man = oku(OMP + "/manifest.json");
  kontrol("kaynak paketi", man.modules[0].type === "resources");
  kontrol("baslik ve modul UUID'leri farkli",
          man.header.uuid !== man.modules[0].uuid);
  /* Diger paketlerimizle UUID cakismasi paketlerden birini
     gorunmez yapardi.                                        */
  const digerleri = [BP, RP, KOK + "/Simsek_Skin"].map(
    (x) => oku(x + "/manifest.json"));
  const hepsi = [man, ...digerleri].flatMap(
    (m) => [m.header.uuid, ...m.modules.map((x) => x.uuid)]);
  kontrol("butun UUID'ler benzersiz",
          new Set(hepsi).size === hepsi.length,
          hepsi.length + " UUID");

  const bpSurum = oku(BP + "/manifest.json").header.version;
  kontrol("surum davranis paketiyle ayni",
          JSON.stringify(man.header.version) === JSON.stringify(bpSurum),
          man.header.version.join("."));

  /* Aciklama CAKISMAYI soylemeli: player.entity.json'u ezen
     iki paket ayni anda calisamaz, ustteki kazanir.          */
  /* v7.9.8: aciklamalar KISALTILDI (tablette kesiliyorlardi),
     "sorun cikarsa yalniz bunu kapat" cumlesi dustu. Uyarinin
     KENDISI duruyor ve olculen o.                            */
  kontrol("aciklamada cakisma uyarisi var",
          /birlikte çalışmaz|birlikte calismaz|ezen/i.test(man.header.description),
          man.header.description.slice(0, 60) + "...");

  const betik = readFileSync(KOK + "/paketle.sh", "utf8");
  kontrol("mcaddon bu paketi de iceriyor",
          /mcaddon" "\$BP" "\$RP" "\$SK" "\$OM"/.test(betik));
  /* v7.9.8: dosya adlari sadelesti ve TAM surumu tasiyor
     (Simsek_v7.9.8_OyuncuModeli.mcpack). Ad artik elle
     yazilmiyor, manifest surumunden TURETILIYOR -- boylece
     bir sonraki surumde bu test yine kirilmaz.              */
  kontrol("tek basina da uretiliyor",
          betik.includes("_OyuncuModeli.mcpack"));
  const surum = "v" + man.header.version.join(".");
  const omDosya = "Simsek_" + surum + "_OyuncuModeli.mcpack";
  kontrol("uretilmis: " + omDosya, existsSync(KOK + "/" + omDosya));
}

console.log("");
console.log("=== 8. ESKI YOL (KILIK) DURUYOR ===");
{
  /* v4.89'un kilik yontemi SILINMEDI: bu paket cakisirsa ya da
     oyunun surumu tutmazsa geri donulecek yol o. Kullanici
     "elimizden gelen tum yollari deneyecegiz" dedi.          */
  kontrol("kilik varligi duruyor",
          existsSync(BP + "/entities/o_sey_kilik.json"));
  kontrol("donusum yetenegi duruyor",
          existsSync(BP + "/scripts/yetenekler/donusum.js"));
  const ana = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("menuden hala ulasiliyor",
          /yetenekTetikle\(oyuncu, "donusum"\)/.test(ana));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> oyuncu modeli zinciri saglam");
process.exit(hata ? 1 : 0);

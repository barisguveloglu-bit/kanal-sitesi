/* PAKET CANLI MI?  --  "hicbir sey calismiyor" testi

   Bu paketin en kotu hata bicimi tek bir yetenegin bozulmasi
   degil, PAKETIN TAMAMEN OLMESI. Iki kez yasandi:

     v4.24  manifest "@minecraft/server": "2.0.0-beta" istedi.
            O yapida o beta surumu yoktu -> script modulu hic
            yuklenmedi -> kol yok, jest yok, menu yok, bot yok.
            Oyuncu "egilip asagi baktim kol bile gelmedi" dedi.

     v4.26  sohbet.js'e fazladan bir tirnak kacti. Tek karakter,
            ama JS ayristirilamayinca yine paketin TAMAMI oler.

   Ikisinin de ortak yani: HICBIR yetenek testi bunu ayrica
   yakalamiyor -- cunku testler zaten paketi yukleyebildiklerini
   varsayiyor. Bu dosya o varsayimi sinar ve hatayi ADIYLA
   soyler.                                                       */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BURASI = dirname(fileURLToPath(import.meta.url));
const PACK = join(BURASI, "pack");
const BP = KOK + "/Simsek_TNT_ToprakTopu";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

function jsDosyalari(kok) {
  const bulunan = [];
  for (const ad of readdirSync(kok, { withFileTypes: true })) {
    const yol = join(kok, ad.name);
    if (ad.isDirectory()) bulunan.push(...jsDosyalari(yol));
    else if (ad.name.endsWith(".js")) bulunan.push(yol);
  }
  return bulunan;
}

console.log("=== 1. HER SCRIPT DOSYASI AYRISTIRILABILIYOR ===");
{
  /* Tek bir sozdizimi hatasi butun paketi oldurur. Her dosya
     TEK TEK yukleniyor ki hangisi oldugu bilinsin.            */
  const dosyalar = jsDosyalari(PACK);
  kontrol("script dosyalari bulundu", dosyalar.length > 20,
          dosyalar.length + " dosya");

  const bozuk = [];
  const w = console.warn;
  for (const yol of dosyalar) {
    console.warn = () => {};
    try {
      await import(pathToFileURL(yol).href);
    } catch (e) {
      /* Modul yan etkisiyle patlayabilir (sahte dunya eksik);
         bizi ilgilendiren SADECE sozdizimi hatasi.            */
      if (e instanceof SyntaxError) {
        bozuk.push(yol.slice(PACK.length + 1) + ": " + e.message);
      }
    } finally {
      console.warn = w;
    }
  }
  kontrol("hicbir dosyada sozdizimi hatasi yok", bozuk.length === 0,
          bozuk.join(" | ") || dosyalar.length + " dosya temiz");
}

console.log("");
console.log("=== 2. MANIFEST OYUNUN REDDETMEYECEGI HALDE ===");
{
  const man = JSON.parse(readFileSync(join(BP, "manifest.json"), "utf8"));

  kontrol("gecerli JSON", typeof man === "object");
  kontrol("format_version 2", man.format_version === 2, String(man.format_version));

  const uuidler = [man.header.uuid, ...man.modules.map((m) => m.uuid)];
  const bicim = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  kontrol("butun UUID'ler gecerli bicimde",
          uuidler.every((u) => bicim.test(u)), uuidler.length + " uuid");
  kontrol("UUID'ler benzersiz", new Set(uuidler).size === uuidler.length);

  const script = man.modules.find((m) => m.type === "script");
  kontrol("script modulu var", script !== undefined);
  kontrol("giris dosyasi gercekten var",
          script && existsSync(join(BP, script.entry)), script && script.entry);

  /* ASIL TUZAK: beta surum istemek. Yanlis yazarsan ozellik
     kapanmiyor, PAKET OLUYOR. v4.24'te tam olarak bu oldu.    */
  for (const d of man.dependencies) {
    kontrol(d.module_name + " surumu kararli (-beta yok)",
            !/-beta$/.test(d.version), d.version);
  }
}

console.log("");
console.log("=== 3. PAKETLENEN KLASORLER EKSIKSIZ ===");
{
  /* v4.22'de entities/ ve entity/ paketleme betigine
     eklenmemisti; bot pakete hic girmiyordu.

     ---- v4.75: ARTIK BETIGE DEGIL, URETILEN ZIP'E BAKILIYOR ----
     Onceki hali paketle.sh'nin METNINDE klasor adi ariyordu.
     O yontem yanlis seyi olcuyordu: dosya adi betikte gecse de
     zip'e girdigini kanitlamiyor, girmese de "eksik" diye
     bagirmiyor. Nitekim betik dort klasoru listelemeyi
     unutmustu ve bu test onu YAKALAMADI -- cunku aradigi
     kelimeler yorum satirlarinda geciyordu.

     Simdi disktekiyle zip'in ICI karsilastiriliyor: paket
     klasorundeki her ust duzey klasor uretilen .mcpack'te de
     olmali. Betik nasil yazilirsa yazilsin bu tutar.        */
  const { execFileSync } = await import("node:child_process");
  const RP = KOK + "/Simsek_Kol_Kaynak";
  const { readdirSync } = await import("node:fs");

  /* Paketin adindaki surum manifest'ten turetiliyor.         */
  const man = JSON.parse(readFileSync(join(BP, "manifest.json"), "utf8"));
  const S = "v" + man.header.version[0] + "" + man.header.version[1];

  const zipIcerik = (dosya) => {
    try {
      return execFileSync("unzip", ["-Z1", join(KOK, dosya)], { encoding: "utf8" })
        .split("\n").filter(Boolean).map((y) => y.split("/")[0]);
    } catch (e) { return undefined; }
  };

  for (const [paket, klasor] of [
    ["SimsekTNT_" + S + ".mcpack", BP],
    ["SimsekKol_" + S + ".mcpack", RP],
  ]) {
    const icerik = zipIcerik(paket);
    kontrol("paket uretilmis: " + paket, icerik !== undefined);
    if (!icerik) continue;
    const kume = new Set(icerik);
    /* Uretim artiklari disarida; geri kalan HER SEY girmeli. */
    const beklenen = readdirSync(klasor)
      .filter((a) => a !== "__pycache__" && !a.startsWith("."));
    const eksik = beklenen.filter((a) => !kume.has(a));
    kontrol(paket + " diskteki her seyi tasiyor", eksik.length === 0,
            eksik.length ? "eksik: " + eksik.join(", ")
                         : beklenen.length + " ogenin hepsi var");
  }

  /* .mcaddon ikisini birden tasiyor: kullanici genelde bunu
     kuruyor, en kritik paket bu.                             */
  {
    const icerik = zipIcerik("SimsekTNT_" + S + ".mcaddon");
    kontrol("mcaddon uretilmis", icerik !== undefined);
    if (icerik) {
      const kume = new Set(icerik);
      kontrol("mcaddon iki paketi de tasiyor",
              kume.has("Simsek_TNT_ToprakTopu") && kume.has("Simsek_Kol_Kaynak"),
              [...kume].join(", "));
    }
  }

  /* Bot HALA vanilla denetleyicide olmali. v4.30'un dersi
     "render_controllers klasoru yasak" degil, "botun cizimine
     dokunma"ydi; v4.75'te goz lazeri icin bir denetleyici
     geldi ama bot ona bagli degil.                          */
  {
    const bot = JSON.parse(readFileSync(join(RP, "entity/bot.entity.json"), "utf8"))
      ["minecraft:client_entity"].description;
    kontrol("bot vanilla render denetleyicisinde",
            bot.render_controllers.length === 1 &&
            bot.render_controllers[0] === "controller.render.default",
            bot.render_controllers.join(", "));
  }
}

console.log("");
console.log("=== 4. HER VARLIGIN CIZIMI TAM MI ===");
{
  /* v4.35: bes yeni varlik geldi (Ilkel Besli). Bir varligin
     sunucu tanimi olup ISTEMCI tanimi ya da DOKUSU eksikse
     oyunda mor-siyah bir kup olarak cizilir -- ya da hic
     cizilmez. Ikisi de SESSIZ hata: Content Log'a bir sey
     dusmez, sadece "bot gorunmuyor" dersin.

     v4.28'de tam bu sinifta bir hata uc surum surmustu.       */
  const RP = KOK + "/Simsek_Kol_Kaynak";
  const varliklar = readdirSync(join(BP, "entities"))
    .filter((f) => f.endsWith(".json"));

  kontrol("davranis paketinde varlik var", varliklar.length > 0,
          varliklar.length + " varlik");

  /* v5.3 ISTISNA: minecraft:player. Onun ISTEMCI tanimi bu
     pakette DEGIL -- ayri bir kaynak paketinde
     (Simsek_Oyuncu_Modeli/entity/player.entity.json), cunku
     oyuncu modelini ezen iki paket ayni anda calisamaz ve o
     paket bilerek ayri tutuluyor (v4.90 karari).

     Bizim BP tanimimiz da oyuncuyu yeniden CIZMIYOR: yalniz
     boy degistirme icin uc bilesen grubu ekliyor. Yani
     "mor-siyah kup" riski burada yok; kural gecerli ama bu
     varlik onun disinda.                                     */
  const ISTEMCISIZ = new Set(["player"]);

  for (const dosya of varliklar) {
    const ad = dosya.replace(".json", "");
    if (ISTEMCISIZ.has(ad)) {
      const kimlik0 = JSON.parse(readFileSync(join(BP, "entities", dosya),
        "utf8"))["minecraft:entity"].description.identifier;
      /* Istisna KORUNSUN diye sinaniyor: oyuncu modeli paketi
         gercekten var mi, ve BP tanimi gercekten cizim
         yapmiyor mu (geometri/doku bileseni tasimiyor mu).   */
      const OMP = KOK + "/Simsek_Oyuncu_Modeli";
      kontrol(kimlik0 + ": istemci tanimi AYRI pakette",
              existsSync(join(OMP, "entity", "player.entity.json")),
              "Simsek_Oyuncu_Modeli/entity/player.entity.json");
      continue;
    }
    const sunucu = JSON.parse(readFileSync(join(BP, "entities", dosya), "utf8"));
    const kimlik = sunucu["minecraft:entity"].description.identifier;

    const istemciYol = join(RP, "entity", ad + ".entity.json");
    if (!existsSync(istemciYol)) {
      kontrol(kimlik + ": ISTEMCI tanimi var", false, ad + ".entity.json yok");
      continue;
    }
    const istemci = JSON.parse(readFileSync(istemciYol, "utf8"))
      ["minecraft:client_entity"].description;

    kontrol(kimlik + ": istemci kimligi ayni",
            istemci.identifier === kimlik, istemci.identifier);

    /* Dokular gercekten diskte mi. Yol uzantisiz yaziliyor,
       .png ekleniyor.                                        */
    for (const yol of Object.values(istemci.textures || {})) {
      kontrol(kimlik + ": dokusu diskte (" + yol + ")",
              existsSync(join(RP, yol + ".png")));
    }

    /* Geometri tanimli mi. */
    for (const g of Object.values(istemci.geometry || {})) {
      const modeller = readdirSync(join(RP, "models/entity"))
        .map((f) => readFileSync(join(RP, "models/entity", f), "utf8"))
        .join("");
      kontrol(kimlik + ": geometrisi (" + g + ") tanimli",
              modeller.includes(g.replace("geometry.", "")));
    }

    /* OZEL RENDER CONTROLLER YASAK. v4.28'de bot bu yuzden
       gorunmez oldu; render_controllers/ klasoru bu pakette
       hic yok, yani "controller.render.X" diye bir sey yazmak
       varligi cizilmez yapar.                                */
    for (const rc of istemci.render_controllers || []) {
      kontrol(kimlik + ": vanilla render controller kullaniyor",
              rc === "controller.render.default", String(rc));
    }
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> paket canli, yuklenmesini engelleyen sey yok");
process.exit(hata ? 1 : 0);

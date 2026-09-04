/* YATMA -- yerde yatarken hareket edebilme            v7.32

   Kullanici: "ben yerde sadece kafami dondurebiliyor olacagim
   ama yerdeyim, yerde de hareket edebiliyor olacagim -- duz
   bir sekilde yatiyorum ama hareket ediyorum da gibi."

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   YATMANIN BIR DURUM OLMASI, KOMUT OLMAMASI.

   Poz Sandigi (v7.27) ve Bedeni Bol (v7.26) pozu KOMUTLA
   veriyor; ikisinde de poz kendiliginden bitmiyor, elle geri
   alinmasi gerekiyor ve baska bir yetenegin kollariIndir'i
   uzerine yazabiliyor. Kullanici "denetleyici de ekle"
   derken istedigi sey buydu.

   Burada ayri bir animation_controller dosyasi ACILMADI:
   bu depoda ayni isi goren kosullu animate girdisi zaten
   bes yerde calisiyor. Ikinci bir mekanizma yerine
   kanitlanmis olan kullanildi -- test bunu da tutuyor.

   Sinanan yedi sey:
     1. Isaret esyasi uretiliyor ve YAN ELE giriyor
     2. Tetik iki eli de sinyor
     3. Animasyon VANILLA ve depoda zaten calistigi gorulmus
     4. animate girdisi KOSULLU (durum suruyor)
     5. Ayri denetleyici dosyasi ACILMAMIS
     6. Ikon temizlik adiminda SILINMIYOR (yedinci kez ayni tuzak)
     7. Dil kaydi var                                        */

import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";
const OMP = KOK + "/Simsek_Oyuncu_Modeli";
const PY = readFileSync(KOK + "/kol_uret.py", "utf8");
const KOD = PY.replace(/"""[\s\S]*?"""/g, "").replace(/^\s*#.*$/gm, "");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const oyuncu = JSON.parse(
  readFileSync(OMP + "/entity/player.entity.json", "utf8")
)["minecraft:client_entity"].description;

console.log("=== 1. ISARET ESYASI ===");
{
  const yol = BP + "/items/yatma.json";
  kontrol("esya dosyasi var", existsSync(yol), yol);
  if (existsSync(yol)) {
    const e = JSON.parse(readFileSync(yol, "utf8"))["minecraft:item"];
    kontrol("kimlik pa:yatma", e.description.identifier === "pa:yatma",
            e.description.identifier);
    /* YAN ELE GIRMELI: ana el bos kalsin ki yatarken elinde
       kol/kilic tutabilesin.                                */
    kontrol("yan ele giriyor",
            e.components["minecraft:allow_off_hand"] === true);
    kontrol("tek tane duruyor (yigilmiyor)",
            e.components["minecraft:max_stack_size"] === 1);
  }
}

console.log("");
console.log("=== 2. TETIK IKI ELI DE SINIYOR ===");
{
  const tetik = (oyuncu.scripts.pre_animation || [])
    .filter((x) => String(x).indexOf("variable.yatma") !== -1);
  kontrol("pre_animation tetigi var", tetik.length === 1, tetik.length + " satir");
  const t = String(tetik[0] || "");
  kontrol("ana el sinaniyor", t.indexOf("'main_hand'") !== -1);
  kontrol("yan el sinaniyor", t.indexOf("'off_hand'") !== -1, t.slice(0, 90));
}

console.log("");
console.log("=== 3. ANIMASYON UYDURULMAMIS ===");
{
  const anim = oyuncu.animations.yatma;
  kontrol("yatma animasyonu bagli", !!anim, String(anim));
  /* VANILLA ve bu depoda zaten calistigi GORULMUS: Will
     Kilici'nin Yere Serme'si ayni animasyonu kullaniyor.  */
  kontrol("vanilla animasyon", anim === "animation.player.sleeping", String(anim));
  const ayar = readFileSync(BP + "/scripts/ayarlar.js", "utf8");
  kontrol("depoda zaten calistigi gorulmus (Will Kilici)",
          /WILL_YATIR_ANIM\s*=\s*"animation\.player\.sleeping"/.test(ayar));
}

console.log("");
console.log("=== 4. DURUM SURUYOR (komut degil) ===");
{
  const girdi = (oyuncu.scripts.animate || [])
    .filter((x) => x && typeof x === "object" && "yatma" in x);
  kontrol("animate girdisi var", girdi.length === 1, JSON.stringify(girdi));
  kontrol("girdi KOSULLU", girdi.length === 1 && girdi[0].yatma === "variable.yatma",
          girdi.length ? String(girdi[0].yatma) : "yok");
  /* Kosulsuz olsaydi (duz "yatma" dizesi) poz HER ZAMAN acik
     kalirdi -- yani durum degil, kalici bir bozukluk olurdu. */
  kontrol("duz dize olarak eklenmemis",
          !(oyuncu.scripts.animate || []).some((x) => x === "yatma"));

  /* Geri alma KOMUTU olmamali: durum sondugunde cizim de
     sonuyor. Poz Sandigi'nda "Pozu Birak" gerekiyordu, burada
     gerekmiyor -- fark bu.                                  */
  kontrol("kodda yatma icin geri alma komutu yok",
          !/YATMA_BITIS|yatmaBirak|yatmaKapat/.test(KOD));
}

console.log("");
console.log("=== 5. AYRI DENETLEYICI DOSYASI ACILMAMIS ===");
{
  /* Bu depoda kosullu animate girdisi ZATEN bes yerde
     calisiyor. Ikinci bir mekanizma (animation_controllers)
     eklemek ayni isi iki yoldan yapmak olurdu.             */
  kontrol("OMP'de animation_controllers klasoru yok",
          !existsSync(OMP + "/animation_controllers"));
  const kosullu = (oyuncu.scripts.animate || [])
    .filter((x) => x && typeof x === "object").length;
  kontrol("kosullu animate girdisi bu depoda zaten kullaniliyor",
          kosullu >= 5, kosullu + " kosullu girdi");
}

console.log("");
console.log("=== 6. IKON TEMIZLIKTE SILINMIYOR ===");
{
  /* AYNI TUZAK YEDINCI KEZ: isaret esyalarinin ikonlari
     hicbir uretim listesinde olmadigi icin temizlik adimi
     onlari siliyor. Ilk uretimde tam bu oldu ve
     "temizlendi: 2 artik dosya" yazdi.                     */
  kontrol("ikon diskte duruyor",
          existsSync(RP + "/textures/item/yatma.png"));
  kontrol("beklenen kumesine eklenmis",
          /beklenen\.add\(YATMA_ESYA\)/.test(KOD));
  const atlas = JSON.parse(
    readFileSync(RP + "/textures/item_texture.json", "utf8")).texture_data;
  kontrol("doku atlasinda kayitli", !!atlas.yatma);
}

console.log("");
console.log("=== 7. DIL KAYDI ===");
{
  for (const dil of ["tr_TR", "en_US"]) {
    const lang = readFileSync(RP + "/texts/" + dil + ".lang", "utf8");
    kontrol(dil + " kaydi var",
            lang.split("\n").some((l) => l.startsWith("item.pa:yatma.name=")));
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> yatma yerinde");
process.exit(hata ? 1 : 0);

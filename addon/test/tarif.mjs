import { readFileSync, existsSync, readdirSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

/* ================================================================
   IKSIR URETIM ZINCIRI -- TARIFLER                        v7.96.5

   Bu depoda v7.96.4'e kadar SIFIR tarif vardi: 564 esyanin
   hicbiri craft edilemiyordu, hepsi yaratici menu ya da /give
   ile geliyordu. Zincir bunu acan ilk adim.

   Kullanicinin koydugu bicim:
     1. SIVI  iki malzeme
     2. SISE  iki malzeme (ORTAK)
     3. IKSIR sivi + sise + iki maden

   Bu dosya zincirin KAPALI oldugunu olcuyor: her halkanin
   tarifi var mi, her malzeme gercek bir esya mi, ara urunler
   uretecin temizligine yakalaniyor mu.
   ================================================================ */
let hata = 0;
function kontrol(ad, kosul, ek) {
  if (kosul) console.log("  ✓ " + ad + (ek ? "  ::  " + ek : ""));
  else { console.log("  ✗ " + ad + (ek ? "  ::  " + ek : "")); hata++; }
}

/* Uretecten OKU, elle yazma: zincir buyuyunce test kendiliginden
   dogru kalir. Elle ikinci bir liste tutmak, ayrisan iki liste
   demekti (deponun kendi dersi, kollar.js).                    */
const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
const zincirBlok = uretec.match(/IKSIR_ZINCIR = \{([\s\S]*?)\n\}/);
const zincirdekiler = zincirBlok
  /* TAM DORT BOSLUK: ic anahtarlar ("sivi", "tamam") daha
     derinde duruyor ve `\s*` onlari da yakaliyordu -- ilk
     yazista zincir "nitroksin, tamam, hiperoksin, tamam"
     cikti ve test kendi uydurdugu iksiri arayip dustu.     */
  ? [...zincirBlok[1].matchAll(/^ {4}"([a-z_]+)":/gm)].map((m) => m[1])
  : [];

console.log("=== 1. TARIF KLASORU VAR ===");
const tarifDizin = BP + "/recipes";
kontrol("recipes/ klasoru acildi", existsSync(tarifDizin));
const dosyalar = existsSync(tarifDizin)
  ? readdirSync(tarifDizin).filter((f) => f.endsWith(".json")).sort() : [];
/* Her iksir 2 tarif (sivi + tamamlama) + 1 ortak sise. */
kontrol("tarif sayisi zincirle uyumlu",
        dosyalar.length === zincirdekiler.length * 2 + 1,
        dosyalar.length + " tarif · " + zincirdekiler.length + " iksir");
kontrol("zincirde en az iki iksir var", zincirdekiler.length >= 2,
        zincirdekiler.join(", "));

console.log("");
console.log("=== 2. HER TARIF GECERLI ===");
const esyalar = new Set();
for (const f of readdirSync(BP + "/items").filter((x) => x.endsWith(".json"))) {
  const j = JSON.parse(readFileSync(BP + "/items/" + f, "utf8"));
  esyalar.add(j["minecraft:item"].description.identifier);
}
const tarifler = new Map();
for (const f of dosyalar) {
  let j;
  try { j = JSON.parse(readFileSync(tarifDizin + "/" + f, "utf8")); }
  catch (e) { kontrol(f + " gecerli JSON", false, e.message); continue; }
  const r = j["minecraft:recipe_shapeless"];
  if (!r) { kontrol(f + " sekilsiz tarif", false); continue; }
  tarifler.set(r.result.item, r);

  /* `tags` SART: yazilmazsa tarif hicbir tezgahta gorunmez.
     Bedrock tarifi bir is istasyonuna baglamak zorunda. */
  kontrol(f + " tezgaha bagli",
          Array.isArray(r.tags) && r.tags.includes("crafting_table"),
          JSON.stringify(r.tags));

  const adlar = r.ingredients.map((i) => i.item);
  const eksik = adlar.concat(r.result.item)
    .filter((m) => m.startsWith("pa:") && !esyalar.has(m));
  kontrol(f + " butun pa: malzemeleri gercek", eksik.length === 0, eksik.join(","));

  const sahte = adlar.filter((m) => !m.startsWith("pa:") && !m.startsWith("minecraft:"));
  kontrol(f + " vanilla malzemeleri ad alanli", sahte.length === 0, sahte.join(","));
}

console.log("");
console.log("=== 3. ZINCIR KAPALI ===");
kontrol("ortak sise esyasi var", esyalar.has("pa:iksir_sise"));
kontrol("sise tarifi iki malzemeli",
        (tarifler.get("pa:iksir_sise") || { ingredients: [] }).ingredients.length === 2);

for (const k of zincirdekiler) {
  const sivi = "pa:sivi_" + k;
  const iksir = "pa:iksir_" + k;
  kontrol(k + ": sivi esyasi var", esyalar.has(sivi));
  kontrol(k + ": iksir esyasi var", esyalar.has(iksir));

  const tSivi = tarifler.get(sivi);
  kontrol(k + ": sivi tarifi iki malzemeli",
          !!tSivi && tSivi.ingredients.length === 2,
          tSivi ? tSivi.ingredients.map((i) => i.item).join(" + ") : "tarif yok");

  const tIksir = tarifler.get(iksir);
  const mal = tIksir ? tIksir.ingredients.map((i) => i.item) : [];
  kontrol(k + ": tamamlama dort malzemeli", mal.length === 4, mal.join(" + "));
  kontrol(k + ": tamamlama SIVIYI kullaniyor", mal.includes(sivi));
  kontrol(k + ": tamamlama SISEYI kullaniyor", mal.includes("pa:iksir_sise"));
}

console.log("");
console.log("=== 4. ARA URUNLER TAM ===");
{
  const tr = readFileSync(RP + "/texts/tr_TR.lang", "utf8");
  const en = readFileSync(RP + "/texts/en_US.lang", "utf8");
  const atlas = JSON.parse(readFileSync(RP + "/textures/item_texture.json", "utf8"));
  const adlar = ["iksir_sise", ...zincirdekiler.map((k) => "sivi_" + k)];
  for (const ad of adlar) {
    kontrol(ad + " ikonu var",
            existsSync(RP + "/textures/item/" + ad + ".png"));
    kontrol(ad + " atlasta", !!atlas.texture_data[ad]);
    kontrol(ad + " iki dilde adli",
            tr.includes("item.pa:" + ad + ".name=") &&
            en.includes("item.pa:" + ad + ".name="));
  }
}

console.log("");
console.log("=== 5. URETEC TEMIZLIGINDEN KURTULUYOR ===");
{
  /* ---- AYNI TUZAK UCUNCU KEZ ----
     `beklenen` listesine eklenmeyen her yeni esya, yazildigi
     kosuda siliniyor: esya JSON'u yaziliyor, atlas kaydi ve
     dil satiri kaliyor, dosya gidiyor. v7.95.1'de animasyonlar,
     v7.96.4'te F-Tech esyalari, burada iksir ara urunleri.  */
  kontrol("sise temizlik listesinde",
          /beklenen\.add\(IKSIR_SISE\)/.test(uretec));
  kontrol("sivilar temizlik listesinde",
          /for _zk3 in IKSIR_ZINCIR:\s*\n\s*beklenen\.add\(IKSIR_SIVI_ONEK \+ _zk3\)/
            .test(uretec));
}

console.log("");
console.log("=== 6. FREEDOM STONE ZINCIRE GIRMEDI ===");
{
  /* BILINCLI KARAR. Dunyaya cikan tek ozel madenimiz o, ama
     zaten bir isi var: mezar anahtari, 10 tane gerekiyor ve
     HARCANIYOR (MEZAR_ANAHTAR_ADET). Iksir zincirine de
     koymak mezari erisilemez yapardi. Bu satir karari
     kilitliyor -- biri ekleyince test dusecek ve gerekceyi
     yeniden dusunmek zorunda kalacak.                       */
  let kacinda = 0;
  for (const f of dosyalar) {
    if (readFileSync(tarifDizin + "/" + f, "utf8").includes("freedom_stone")) kacinda++;
  }
  kontrol("hicbir tarifte freedom_stone yok", kacinda === 0, kacinda + " tarif");
}

console.log("");
console.log(hata ? "HATA : " + hata : "temiz");
process.exit(hata ? 1 : 0);

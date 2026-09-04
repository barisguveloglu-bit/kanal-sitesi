/* SKIN PAKETI (2 skin) + 200 KALP -- v4.88, v4.89

   Kullanicinin iki sorusu:
     "bu yeni surume actigim zaman skin otomatik olarak bana
      geliyor mu"
     "bu skin ekstra olarak 400 kalp eklesin"

   ---- BIRINCISININ CEVABI: HAYIR, AMA ----
   Bedrock'ta davranis/kaynak paketi oyuncu skinini
   DEGISTIREMEZ. Script'ten skin okuma ya da atama API'si yok.
   Elde olan tek yol Bedrock'un kendi SKIN PAKETI turu: ice
   aktarilinca skin Giyinme Odasi'na duser, oradan tek dokunusla
   secilir.

   Bu dosya skin paketinin BICIMINI kilitliyor. Bicim
   Microsoft'un "Skin Pack JSON Formatting and Localization
   Reference" belgesinden alindi; bir harf kayarsa oyun paketi
   sessizce yok sayiyor ya da skinin adi yerine anahtari
   gorunuyor -- ikisi de tabletten teshis edilemez.

   ---- IKINCISININ CEVABI: DUGME ----
   Skin okunamadigi icin "bu skini giyince" kancasi kurulamiyor.
   400 kalp menudeki bir dugmeye baglandi. Test hem sayiyi hem
   ULASILABILIRLIGI tutuyor (v4.83 dersi).                     */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SKP = KOK + "/Simsek_Skin";
const BP = KOK + "/Simsek_TNT_ToprakTopu";

const ayar = await import("./pack/ayarlar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

console.log("=== 1. SKIN PAKETI BICIMI (belgeye gore) ===");
const man = oku(SKP + "/manifest.json");
const skins = oku(SKP + "/skins.json");
{
  kontrol("manifest format_version 2", man.format_version === 2);
  const mod = (man.modules || [])[0];
  /* Tur "skin_pack" olmazsa oyun paketi hic taniyamiyor.      */
  kontrol("modul turu skin_pack", mod && mod.type === "skin_pack",
          mod && mod.type);
  /* Baslik ve modul UUID'leri FARKLI olmali; ayni olursa oyun
     paketi bozuk sayiyor.                                     */
  kontrol("baslik ve modul UUID'leri farkli",
          man.header.uuid !== mod.uuid);
  kontrol("UUID'ler gecerli bicimde",
          [man.header.uuid, mod.uuid].every(
            (u) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(u)));

  /* Surum modun surumuyle ayni ilerlesin: giyinme odasindaki
     skin eskide kalmasin.                                     */
  const bpSurum = oku(BP + "/manifest.json").header.version;
  kontrol("surum davranis paketiyle ayni",
          JSON.stringify(man.header.version) === JSON.stringify(bpSurum),
          man.header.version.join("."));

  kontrol("serialize_name ve localization_name var",
          !!skins.serialize_name && !!skins.localization_name);
  /* v4.89: IKI skin. Kullanici: "2 tane skin yapman lazim,
     birincisini elleme, ikincisini elle yani that thing
     halim."
     v7.5: UCUNCU skin geldi (kolsuz). Sayi artik SKIN_LISTE'den
     OKUNUYOR -- sabit "2" yazili kalsaydi her yeni skinde bu
     satir dusup gercek bir hatayi gizlerdi. Ilk ikisinin YERI
     hala kilitli, o kullanicinin acik istegiydi.            */
  const listeSay = (readFileSync(KOK + "/kol_uret.py", "utf8")
    .match(/SKIN_LISTE = \[[\s\S]*?\n\]/)[0].match(/^\s{4}\("/gm) || []).length;
  kontrol("skins.json SKIN_LISTE ile ayni sayida",
          (skins.skins || []).length === listeSay,
          (skins.skins || []).length + " skin / tabloda " + listeSay);
  kontrol("en az iki skin var", (skins.skins || []).length >= 2);
  kontrol("birinci skin hala Uzak Akraba (ELLENMEDI)",
          skins.skins[0].localization_name === "uzak_akraba" &&
          skins.skins[0].texture === "uzak_akraba.png");
  kontrol("ikinci skin O Sey formu",
          skins.skins[1] && skins.skins[1].localization_name === "o_sey");
  for (const sk of skins.skins) {
    /* Belgede SADECE iki gecerli geometri var; ozel geometri
       skin paketlerinden KALDIRILDI (kotuye kullanildigi
       icin). Alti kollu govde SKIN olarak yuklenemiyor --
       donusum bu yuzden KILIK olarak yapildi.               */
    kontrol(sk.localization_name + ": geometri belgedeki iki degerden biri",
            ["geometry.humanoid.custom",
             "geometry.humanoid.customSlim"].includes(sk.geometry), sk.geometry);
    kontrol(sk.localization_name + ": tur free",
            sk.type === "free", sk.type);
    kontrol(sk.localization_name + ": dokusu pakette",
            existsSync(SKP + "/" + sk.texture), sk.texture);
  }

  const s = skins.skins[0];
  /* Skinimiz klasik 64x64 duzeninde, kollari 4 piksel -> Steve. */
  kontrol("klasik (Steve) model secilmis",
          s.geometry === "geometry.humanoid.custom");
  kontrol("paket ikonu var", existsSync(SKP + "/pack_icon.png"));

  /* OZEL GEOMETRI YAZILMAMALI. Yazilsaydi resmi istemci paketin
     TAMAMINI reddedebilirdi -- yani birinci skini de goturur.
     Kullanici "birincisini elleme" dedi.                     */
  kontrol("pakette geometry.json YOK (kasten)",
          !existsSync(SKP + "/geometry.json"));
}

console.log("");
console.log("=== 2. DIL ANAHTARLARI ===");
{
  /* Bicim belgeden:
       skinpack.<serialize_name>
       skin.<serialize_name>.<localization_name>
     Kaymasi halinde oyunda skinin ADI yerine ANAHTARI gorunur --
     tabletten sebebi anlasilmayan bir hata.                   */
  const seri = skins.serialize_name;
  for (const dosya of ["en_US.lang", "tr_TR.lang"]) {
    const metin = readFileSync(SKP + "/texts/" + dosya, "utf8");
    kontrol(dosya + ": paket adi anahtari",
            metin.includes("skinpack." + seri + "="));
    /* HER skinin adi olmali: eksik kalan skin oyunda ANAHTARI
       ile gorunur ve sebebi tabletten anlasilmaz.            */
    for (const sk of skins.skins) {
      kontrol(dosya + ": " + sk.localization_name + " adi var",
              metin.includes("skin." + seri + "." + sk.localization_name + "="));
    }
    /* Anahtar var ama degeri bossa yine anahtar gorunur.      */
    kontrol(dosya + ": adlarin degeri dolu",
            metin.split("\n").filter((r) => r.includes("=") &&
              r.split("=")[1].trim().length > 0).length >= 2 + skins.skins.length);
  }
  const diller = oku(SKP + "/texts/languages.json");
  kontrol("languages.json iki dili sayiyor",
          diller.includes("en_US") && diller.includes("tr_TR"));
}

console.log("");
console.log("=== 3. SKIN KAYNAKTAN KOPYALANIYOR, YENIDEN CIZILMIYOR ===");
{
  /* Tek kaynak skin_uret.py'nin urettigi dosya. Iki ayri yerde
     cizilse sessizce ayrisirlardi -- bu depoda cok yasandi.   */
  const kaynak = readFileSync(KOK + "/UzakAkraba_skin.png");
  const pakette = readFileSync(SKP + "/" + skins.skins[0].texture);
  kontrol("paketteki skin kaynak dosyayla BIREBIR ayni",
          Buffer.compare(kaynak, pakette) === 0,
          kaynak.length + " bayt");

  /* IKINCI skin ile VARLIGIN dokusu ayni dosya olmali:
     donusup cikinca "ayni karakter" hissi bozulmasin.        */
  const varlikDoku = readFileSync(
    KOK + "/Simsek_Kol_Kaynak/textures/entity/o_sey.png");
  const ikinci = readFileSync(SKP + "/" + skins.skins[1].texture);
  kontrol("ikinci skin VARLIGIN dokusuyla BIREBIR ayni",
          Buffer.compare(varlikDoku, ikinci) === 0,
          varlikDoku.length + " bayt");
  kontrol("iki skin birbirinden FARKLI",
          Buffer.compare(kaynak, ikinci) !== 0);
}

console.log("");
console.log("=== 4. 200 KALP (v4.89: 400 fazla geldi) ===");
{
  /* Sayi KULLANICININ. v4.88'de 400'du, denedi ve "400 kalp
     biraz fazla oldugu icin 200 kalbe dusuruyorum" dedi.
     Dengelemek icin oynanmaz; test sadece ikisinin AYNI
     kalmasini ve motor sinirina uymasini tutuyor.            */
  kontrol("KALP_TAVAN 200", ayar.KALP_TAVAN === 200, String(ayar.KALP_TAVAN));
  kontrol("tek dokunusta istenen miktar tavanla ayni",
          ayar.KALP_TOPTAN === ayar.KALP_TAVAN, String(ayar.KALP_TOPTAN));

  /* Motor siniri: health_boost seviye tavani 255 -> 512 kalp.
     Tavan bunun ustune cikarsa kalpler sessizce kirpilir ve
     "400 dedim 512 geldi" gibi anlasilmaz bir durum olur.     */
  kontrol("motor sinirinin altinda (512)", ayar.KALP_TAVAN <= 512);
  /* health_boost seviyesi = kalp/2 - 1. Tam sayi olmali.      */
  const seviye = ayar.KALP_TAVAN / 2 - 1;
  kontrol("health_boost seviyesi tam sayi ve <= 255",
          Number.isInteger(seviye) && seviye <= 255, "seviye " + seviye);
  kontrol("kalp sayisi CIFT (health_boost cift artiyor)",
          ayar.KALP_TOPTAN % 2 === 0);

  /* Tek basista tavana cikmali: KALP_ADIM ile ayni olsaydi
     menuye 40 kez basmak gerekirdi.                           */
  kontrol("tek basista tavana cikiyor", ayar.KALP_TOPTAN >= ayar.KALP_TAVAN,
          ayar.KALP_TOPTAN + " >= " + ayar.KALP_TAVAN);

  /* GERI ALINABILIR olmali: referans modlarin hatasi tam
     buydu (effect @s health_boost 100000 255, cikisi yok).   */
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("iptali menude duruyor (Kalpleri sifirla)",
          kaynak.includes("Kalpleri sifirla"));
}

console.log("");
console.log("=== 5. ULASILABILIYOR MU ===");
{
  /* v4.83 dersi: "calisiyor mu" ile "ulasilabiliyor mu" ayri
     iki soru.                                                 */
  await import("./pack/yetenekler/kalp_toptan.js");
  const kayit = await import("./pack/yetenekler/kayit.js");
  if (kayit.tumYetenekler) {
    kontrol("yetenek kayitli",
            kayit.tumYetenekler().some((y) => y.kimlik === "kalp_toptan"));
  }
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js kalp_toptan.js'i import ediyor",
          kaynak.includes('import "./yetenekler/kalp_toptan.js";'));
  kontrol("menude satiri var",
          /yetenekTetikle\(oyuncu, "kalp_toptan"\)/.test(kaynak));
}

console.log("");
console.log("=== 6. TEK DOSYAYLA KURULUM ===");
{
  /* Kullanici: "yuklenebilir sekilde olsun, kolayca
     yukleyebileyim". .mcaddon UC paketi de tasimali, yoksa
     skin ayri bir dosya olarak kurulmak zorunda kalir.       */
  const betik = readFileSync(KOK + "/paketle.sh", "utf8");
  kontrol("mcaddon skin paketini de iceriyor",
          /mcaddon" "\$BP" "\$RP" "\$SK"/.test(betik));
  /* v7.9.8: dosya adlari sadelesti ve TAM surumu tasiyor.
     Onceden ad "%d%d" ile uretiliyordu, yani 7.9.0 ile 7.9.7
     ayni dosya adini aliyordu ve kullanici hangisini
     indirdigini ayirt edemiyordu. Ad artik manifest
     surumunden TURETILIYOR -- sonraki surumde kirilmasin. */
  kontrol("skin ayrica tek basina da uretiliyor",
          betik.includes("_Skin.mcpack"));

  const surum = "v" + man.header.version.join(".");
  for (const d of ["Simsek_" + surum + ".mcaddon",
                   "Simsek_" + surum + "_Skin.mcpack"]) {
    kontrol("uretilmis: " + d, existsSync(KOK + "/" + d));
  }
}

console.log("");
console.log("=== 7. KOLSUZ SURUM (v7.5) ===");
{
  /* Kullanici: "ben kolluyum ya skinde, onu kolsuz hale
     getirebilir misin -- cunku bu kanli kollar bir garip
     oluyor."  Kaynak modun KENDI sarti da bu:
     "Kolun Duzgun Calismasi Icin Skininizin Kolsuz Olmasi
      Lazimdir!" (Code-Man dil dosyasi).

     Tutulan guvence: kollar GERCEKTEN saydam, ve govdeye
     HIC dokunulmamis. Ikincisi olmazsa "kolsuz" surum
     sessizce baska bir skin olurdu.                       */
  const kolsuz = skins.skins.find((s) => s.localization_name === "kolsuz");
  kontrol("skins.json'da kolsuz surum var", !!kolsuz,
          skins.skins.map((s) => s.localization_name).join(", "));
  const dy = SKP + "/uzak_akraba_kolsuz.png";
  kontrol("dokusu diskte", existsSync(dy));
  if (kolsuz && existsSync(dy)) {
    kontrol("  klasik (Steve) model",
            kolsuz.geometry === "geometry.humanoid.custom", kolsuz.geometry);
    kontrol("  kilitli degil", kolsuz.type === "free");
    /* 64x64 skin duzeninde kol bolgeleri. skin_uret.py'deki
       SAG/SOL_KOL_KUTU ile ayni -- tek kaynaktan okunuyor. */
    const uretec = readFileSync(KOK + "/skin_uret.py", "utf8");
    const kutular = [];
    for (const ad of ["SAG_KOL_KUTU", "SOL_KOL_KUTU"]) {
      const blok = new RegExp(ad + "\\s*=\\s*\\[([^\\]]*\\)[^\\]]*)\\]").exec(uretec);
      for (const t of blok[1].matchAll(/\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/g)) {
        kutular.push([+t[1], +t[2], +t[3], +t[4]]);
      }
    }
    kontrol("  kol kutulari ureteceten okundu", kutular.length === 6,
            kutular.length + " kutu");
    const p = execFileSync("python3", ["-c", `
from PIL import Image
import json,sys
a=Image.open(${JSON.stringify(SKP + "/uzak_akraba.png")}).convert("RGBA")
b=Image.open(${JSON.stringify(dy)}).convert("RGBA")
KOL=json.loads(${JSON.stringify(JSON.stringify(kutular))})
def opak(im):
    return sum(1 for x1,y1,x2,y2 in KOL for x in range(x1,x2+1)
               for y in range(y1,y2+1) if im.getpixel((x,y))[3])
disi=sum(1 for x in range(64) for y in range(64)
         if a.getpixel((x,y))!=b.getpixel((x,y))
         and not any(x1<=x<=x2 and y1<=y<=y2 for x1,y1,x2,y2 in KOL))
print(json.dumps({"normal":opak(a),"kolsuz":opak(b),"disi":disi}))
`], { encoding: "utf8" });
    const o = JSON.parse(p);
    kontrol("  normal skinde kollar VAR", o.normal > 0, o.normal + " piksel");
    kontrol("  kolsuz surumde kollar YOK", o.kolsuz === 0, o.kolsuz + " piksel");
    kontrol("  kol DISINDA hicbir piksel degismedi", o.disi === 0,
            o.disi + " piksel");
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> skin paketi ve 400 kalp yerinde");
process.exit(hata ? 1 : 0);

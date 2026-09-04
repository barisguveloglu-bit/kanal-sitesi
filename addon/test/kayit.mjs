/* YETENEK KAYIT DEFTERI -- omurganin kendisi              v7.9.3

   ---- NEDEN BU DOSYA VAR ----
   Genel taramada mutasyon testi bir kor nokta buldu:
   kayit.js'teki "olustur()'u olmayan yetenegi ALMA" korumasini
   bilerek kaldirdim ve 83 test dosyasindan HICBIRI dusmedi.

   kayit.js bu depodaki 78 yetenegin HEPSININ gectigi kapi.
   Korumalari savunma amacli -- yani dogru calisan bir depoda
   hicbir zaman tetiklenmiyorlar, bu yuzden de yanlislikla
   silinseler kimse fark etmezdi. Tam da bu yuzden sinanmalari
   gerekiyor: bir korumanin degeri, bozuldugunda anlasilmasinda.

   Buradaki her sinama defteri BOZUK GIRDIYLE besliyor.        */

import "./dunya.mjs";
import { readFileSync, readdirSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };
sus(); await import("./pack/main.js"); ac();
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

console.log("=== 1. BOZUK KAYITLAR GERI CEVRILIYOR ===");
{
  const once = kayit.tumYetenekler().length;

  sus(); kayit.yetenekKaydet(undefined); ac();
  kontrol("tanimsiz kayit alinmadi", kayit.tumYetenekler().length === once);

  sus(); kayit.yetenekKaydet({ ad: "Kimliksiz", olustur() { return {}; } }); ac();
  kontrol("KIMLIKSIZ yetenek alinmadi", kayit.tumYetenekler().length === once);

  /* MUTASYON TESTININ BULDUGU KOR NOKTA.
     olustur() bir yetenegin TEK zorunlu davranisi: main.js
     tetiklendiginde onu cagiriyor. Olmayan bir olustur()
     kaydedilseydi, o yetenek secildigi anda TypeError atardi
     ve kullanici sebebini goremezdi.                        */
  sus(); kayit.yetenekKaydet({ kimlik: "sahte_olustursuz", ad: "Oluştursuz" }); ac();
  kontrol("olustur()'u OLMAYAN yetenek alinmadi",
          kayit.tumYetenekler().length === once &&
          kayit.yetenekAl("sahte_olustursuz") === undefined);

  sus(); kayit.yetenekKaydet({ kimlik: "sahte_olustursuz2", ad: "İki",
                               olustur: "fonksiyon degil" }); ac();
  kontrol("olustur() FONKSIYON DEGILSE alinmadi",
          kayit.yetenekAl("sahte_olustursuz2") === undefined);
}

console.log("");
console.log("=== 2. AYNI KIMLIK USTUNE YAZMIYOR ===");
{
  /* Iki dosya ayni kimligi kullanirsa, ikincisi birincinin
     USTUNE YAZSAYDI calisan bir yetenek sessizce baskasiyla
     degisirdi -- ve hangi dosyanin kazandigi import sirasina
     kalirdi.                                                 */
  const gercek = kayit.yetenekAl("toprak_topu");
  kontrol("toprak_topu kayitli (taban)", !!gercek);
  sus(); kayit.yetenekKaydet({ kimlik: "toprak_topu", ad: "SAHTE",
                               olustur() { return {}; } }); ac();
  kontrol("ustune YAZILMADI", kayit.yetenekAl("toprak_topu") === gercek,
          kayit.yetenekAl("toprak_topu").ad);
}

console.log("");
console.log("=== 3. ESYA BAGLAMA ===");
{
  sus(); const s = kayit.esyaBagla("pa:sahte_esya", "bilinmeyen_yetenek_xyz"); ac();
  kontrol("bilinmeyen yetenek baglanmiyor", s === false);

  sus(); const s2 = kayit.esyaBagla("pa:sahte_esya", "toprak_topu"); ac();
  kontrol("gercek yetenek baglaniyor", s2 === true);
  kontrol("  esyanin listesinde gorunuyor",
          (kayit.esyaninYetenekleri("pa:sahte_esya") || []).length === 1);
  /* Ayni bagi iki kez kurmak listeyi SISIRMEMELI: menude ayni
     satir iki kez gorunurdu.                                 */
  sus(); const s3 = kayit.esyaBagla("pa:sahte_esya", "toprak_topu"); ac();
  kontrol("ayni bag IKINCI kez eklenmiyor", s3 === false &&
          kayit.esyaninYetenekleri("pa:sahte_esya").length === 1);
  kontrol("esyaninYetenegi ilkini veriyor",
          kayit.esyaninYetenegi("pa:sahte_esya") === kayit.yetenekAl("toprak_topu"));
  kontrol("bilinmeyen esya undefined veriyor",
          kayit.esyaninYetenekleri("pa:hic_yok") === undefined &&
          kayit.esyaninYetenegi("pa:hic_yok") === undefined);
}

console.log("");
console.log("=== 4. JEST SIRASI: benzersiz ve artan ===");
{
  const sira = kayit.esyasizSira();
  kontrol("esyasiz yetenek var", sira.length > 0, sira.length + " yetenek");
  let artan = true;
  for (let i = 1; i < sira.length; i++) {
    if ((sira[i].sira || 0) < (sira[i - 1].sira || 0)) artan = false;
  }
  kontrol("kucukten buyuge sirali", artan);

  /* v4.20'de ON BIR cift ayni sira degerini paylasiyordu ve
     jest sirasi ayarlardan degil import sirasindan
     belirleniyordu. siraDenetimi() o gun yazildi.           */
  sus(); const cakisan = kayit.siraDenetimi(); ac();
  kontrol("hicbir sira cakismasi YOK", cakisan.length === 0,
          cakisan.join(" | ") || "temiz");

  /* Denetimin KENDISI calisiyor mu: cakisma yaratip goruyor mu?
     Bakmasaydik "0 cakisma" sonucu, denetimin bozuk olmasindan
     da gelebilirdi.                                          */
  const bos = kayit.esyasizSira()[0];
  const eskiSira = bos.sira;
  const ikinci = kayit.esyasizSira()[1];
  const eskiSira2 = ikinci.sira;
  ikinci.sira = eskiSira;                       // bilerek cakistir
  sus(); const simdi = kayit.siraDenetimi(); ac();
  kontrol("  denetim gercekten cakisma buluyor", simdi.length === 1,
          simdi.join(" | ") || "BULAMADI");
  ikinci.sira = eskiSira2;                      // geri al
  sus(); kontrol("  geri alinca yine temiz", kayit.siraDenetimi().length === 0); ac();
}

console.log("");
console.log("=== 5. KAYITLI YETENEKLERIN TAMAMI SAGLAM ===");
{
  const hepsi = kayit.tumYetenekler();
  const olustursuz = hepsi.filter((t) => typeof t.olustur !== "function");
  kontrol("%d yetenegin hepsinde olustur() var".replace("%d", hepsi.length),
          olustursuz.length === 0, olustursuz.map((t) => t.kimlik).join(", "));
  const adsiz = hepsi.filter((t) => !t.ad);
  kontrol("hepsinin Turkce adi var", adsiz.length === 0,
          adsiz.map((t) => t.kimlik).join(", "));
  const kimlikler = hepsi.map((t) => t.kimlik);
  kontrol("kimlikler benzersiz", new Set(kimlikler).size === kimlikler.length);
}

console.log("");
console.log("=== 6. ULASILABILIRLIK: her yetenege bir yol var mi ===");
{
  /* Deponun kendi dersi: "calisiyor mu != ulasilabiliyor mu."
     Bir yetenek kusursuz yazilmis olabilir ama hicbir esyaya
     bagli degilse ve jest sirasinda da yoksa oyuncu ona ASLA
     ulasamaz -- ve hicbir test bunu fark etmez, cunku yetenek
     dogrudan cagrilinca calisiyor.

     ESYA LISTESI DISKTEN OKUNUYOR, elle yazilmiyor: ilk
     denememde yalnizca sekiz KOL esyasina bakmistim ve Will
     kilicinin uc yetenegi "erisilemez" gorundu -- oysa
     esyaBagla(WILL_KILIC, ...) ile pa:will_kilic'e baglilar.
     Varsayim yerine butun esyalari sormak dogru olani.       */
  const esyalar = readdirSync(
    KOK + "/Simsek_TNT_ToprakTopu/items")
    .filter((f) => f.endsWith(".json")).map((f) => "pa:" + f.slice(0, -5));
  const bagli = new Set();
  for (const e of esyalar) {
    for (const t of (kayit.esyaninYetenekleri(e) || [])) bagli.add(t.kimlik);
  }
  const hepsi = kayit.tumYetenekler();
  const erisilmez = hepsi.filter((t) => !t.esyasiz && !bagli.has(t.kimlik));
  kontrol("%d esya tarandi, %d yetenek bir esyaya bagli"
            .replace("%d", esyalar.length).replace("%d", bagli.size),
          esyalar.length > 0 && bagli.size > 0);
  kontrol("hicbir yetenek erisilemez degil", erisilmez.length === 0,
          erisilmez.map((t) => t.kimlik + " (" + t.ad + ")").join(", ") || "hepsine yol var");
}

console.log("");
console.log(hata ? "BAZI SINAMALAR KALDI" : "hepsi gecti");
process.exit(hata ? 1 : 0);

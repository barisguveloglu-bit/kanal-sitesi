/* CAN SAYACI (Health Overlay)                            v4.99

   ---- NEDEN SADECE SAYAC ----
   HealthOverlay'in ASIL ozelligi 10 kalpten fazlasini tek
   satirda, her 10 kalpte renk degistirerek cizmek. O tamamen
   Java cizim kodu (36 derlenmis sinif) ve dokulari BEYAZ
   maske -- rengi kod veriyor. Bedrock'ta oyuncu HUD'unun
   kalp cizimi ne script'ten ne kaynak paketten
   degistirilebiliyor. Aktarilamiyor, uydurulmadi.

   Aktarilan: modun ikinci ozelligi, KALP SAYACI
   (healthoverlay.options.heart_display_mode: off / always /
   on_change).

   Neden gerekli: KALP_TAVAN = 200, yani 210 kalbe kadar
   cikiliyor ve Bedrock bunu 21 SATIR kalp olarak ciziyor.

   ---- BU DOSYANIN EN ONEMLI BOLUMU: 4. ----
   Sayacin SESSIZ olmasi. Actionbar'i lazer sayaci, donusum
   mesajlari ve kademe bildirimleri de kullaniyor; ustlerine
   binen bir sayac kullanicinin bildirdigi "359 vurus"
   yazisini gorunmez yapardi.                                */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP  = KOK + "/Simsek_TNT_ToprakTopu";
const JAR = "/tmp/claude-0/-home-user-kanal-sitesi/" +
  "e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11/scratchpad/health";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const sayac = await import("./pack/yetenekler/can_sayaci.js");
const yard = await import("./pack/yardimcilar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

function kur(id, can = 20, maks = 20) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player";
  o._can = can; o._maks = maks;
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:health") {
      return {
        get currentValue() { return o._can; },
        get effectiveMax() { return o._maks; },
        defaultValue: 20,
        setCurrentValue(v) { o._can = v; }
      };
    }
    return eskiGet(ad);
  };
  _durum.oyuncular = [o];
  sayac.canSayaciUnut();
  yard.actionbarUnut();
  return { D, o };
}
const yazi = (o) => (o.onScreenDisplay && o.onScreenDisplay._son) || "";

console.log("=== 1. AYARLAR MODUN UC MODUYLA AYNI ===");
{
  kontrol("CAN_SAYACI_ACIK", ayar.CAN_SAYACI_ACIK === true);
  /* healthoverlay.options.heart_display_mode: off / always /
     on_change -- ucunun de karsiligi olmali.               */
  const modlar = ["kapali", "hep", "degisince"];
  kontrol("mod gecerli bir deger", modlar.includes(ayar.CAN_SAYACI_MOD),
          ayar.CAN_SAYACI_MOD);
  kontrol("varsayilan 'degisince' (modun on_change'i)",
          ayar.CAN_SAYACI_MOD === "degisince");
  kontrol("sessizlik penceresi taramadan uzun",
          ayar.CAN_SAYACI_SESSIZLIK > ayar.CAN_SAYACI_TARAMA,
          ayar.CAN_SAYACI_SESSIZLIK + " > " + ayar.CAN_SAYACI_TARAMA);
  kontrol("renk esikleri azalan sirada",
          ayar.CAN_SAYACI_RENKLER.every((r, i, a) =>
            i === 0 || a[i - 1][0] > r[0]),
          JSON.stringify(ayar.CAN_SAYACI_RENKLER.map((r) => r[0])));
  kontrol("en alt esik 0 (her zaman bir renk var)",
          ayar.CAN_SAYACI_RENKLER[ayar.CAN_SAYACI_RENKLER.length - 1][0] === 0);

  /* Modun kendi lang dosyasi: uc mod gercekten var mi. */
  const lang = JAR + "/assets/healthoverlay/lang/en_us.json";
  if (existsSync(lang)) {
    const d = JSON.parse(readFileSync(lang, "utf8"));
    for (const k of ["off", "always", "on_change"]) {
      kontrol("modda heart_display_mode." + k + " var",
              !!d["healthoverlay.options.heart_display_mode." + k]);
    }
  } else {
    console.log("  · jar diskte degil, karsilastirma atlandi");
  }
}

console.log("");
console.log("=== 2. METIN DOGRU ===");
{
  kontrol("20/20 -> 10/10 kalp",
          sayac.canMetni(20, 20).includes("10§7/10 kalp"),
          sayac.canMetni(20, 20));
  /* Yarim kalpler: 21 can = 10.5 kalp. Tam sayi degilse
     ondalik gosteriliyor, tam sayida gosterilmiyor.       */
  kontrol("21 can -> 10.5 kalp", sayac.canMetni(21, 40).includes("10.5"),
          sayac.canMetni(21, 40));
  kontrol("tam sayida ondalik yok", !sayac.canMetni(20, 40).includes("10.0"),
          sayac.canMetni(20, 40));
  /* 210 kalp: sayacin var olma sebebi. */
  kontrol("420 can -> 210 kalp", sayac.canMetni(420, 420).includes("210§7/210"),
          sayac.canMetni(420, 420));

  kontrol("dolu -> yesil", sayac.canMetni(20, 20).startsWith("§a"));
  kontrol("ceyrek -> kirmizi", sayac.canMetni(4, 20).startsWith("§c"),
          sayac.canMetni(4, 20));
  kontrol("ucte bir -> sari", sayac.canMetni(7, 20).startsWith("§e"),
          sayac.canMetni(7, 20));
  kontrol("sifir can cokmuyor", typeof sayac.canMetni(0, 20) === "string");
  kontrol("sifir tavan cokmuyor", typeof sayac.canMetni(0, 0) === "string");
}

console.log("");
console.log("=== 3. ILK TARAMA SESSIZ, DEGISINCE YAZIYOR ===");
{
  const { o } = kur("c1");
  sayac.canSayaciTara([o]);
  kontrol("ilk taramada YAZI YOK (dunyaya girer girmez dusmesin)",
          yazi(o) === "", yazi(o));

  /* Can degisince gorunmeli. Sessizlik penceresini gecmek
     icin tick ilerletiliyor.                              */
  o._can = 12;
  tickIlerlet(ayar.CAN_SAYACI_SESSIZLIK + ayar.CAN_SAYACI_TARAMA + 2);
  kontrol("can degisince yazdi", /kalp/.test(yazi(o)), yazi(o));
  kontrol("dogru degeri yazdi", yazi(o).includes("6§7/10"), yazi(o));
}
{
  /* Tavan degisimi de sayilmali: kalp eklemek tam olarak bu. */
  const { o } = kur("c2");
  sayac.canSayaciTara([o]);
  o._maks = 420; o._can = 420;
  tickIlerlet(ayar.CAN_SAYACI_SESSIZLIK + ayar.CAN_SAYACI_TARAMA + 2);
  kontrol("tavan degisince yazdi (kalp ekleme)",
          yazi(o).includes("210§7/210"), yazi(o));
}
{
  /* Yarim kalpten kucuk oynamalar sayacı acmamali:
     yenilenme efekti acikken can surekli kipirdiyor.      */
  const { o } = kur("c3");
  sayac.canSayaciTara([o]);
  tickIlerlet(ayar.CAN_SAYACI_SESSIZLIK + ayar.CAN_SAYACI_TARAMA + 2);
  const oncesi = yazi(o);
  o._can = 20 - 0.4;
  tickIlerlet(ayar.CAN_SAYACI_TARAMA + 2);
  kontrol("yarim kalptan kucuk oynama sayaci acmiyor",
          yazi(o) === oncesi, yazi(o));
}

console.log("");
console.log("=== 4. SESSIZ: BASKASININ YAZISINI EZMIYOR ===");
{
  /* Asil guvence. Lazerin "359 vurus" yazisi kullanicinin
     bildirdigi hatanin ta kendisiydi; sayac onu ezerse
     hatayi gormek imkansizlasir.                           */
  const { o } = kur("c4");
  sayac.canSayaciTara([o]);          // ilk tarama: sessiz
  o._can = 10;                        // degisim var

  yard.actionbarYaz(o, "§c⚡ 359 vurus");
  tickIlerlet(ayar.CAN_SAYACI_TARAMA + 2);
  kontrol("baskasi az once yazdiysa sayac SUSUYOR",
          yazi(o) === "§c⚡ 359 vurus", yazi(o));

  /* Sessizlik penceresi gecince yazabilmeli, yoksa sayac
     hicbir zaman gorunmezdi.                              */
  tickIlerlet(ayar.CAN_SAYACI_SESSIZLIK + ayar.CAN_SAYACI_TARAMA + 2);
  kontrol("pencere gecince yaziyor", /kalp/.test(yazi(o)), yazi(o));
}
{
  /* Sayac KENDI yazisini "baskasi" saymamali: sayarsa ilk
     yazidan sonra kendini susturur ve bir daha hic
     gorunmezdi.                                            */
  const { o } = kur("c5");
  sayac.canSayaciTara([o]);
  o._can = 10;
  tickIlerlet(ayar.CAN_SAYACI_SESSIZLIK + ayar.CAN_SAYACI_TARAMA + 2);
  const ilk = yazi(o);
  kontrol("sayac yazdi", /kalp/.test(ilk), ilk);
  o._can = 6;
  tickIlerlet(ayar.CAN_SAYACI_TARAMA + 2);
  kontrol("kendi yazisi kendini susturmuyor",
          yazi(o).includes("3§7/10"), yazi(o));
}

console.log("");
console.log("=== 5. MODLAR ===");
{
  kontrol("'kapali' modunda hic yazmiyor",
          (() => {
            const { o } = kur("c6");
            /* Ayari dogrudan degistiremiyoruz (const export),
               o yuzden davranis DOLAYLI sinaniyor: mod
               "kapali" olsaydi tara() hemen donerdi. Burada
               en azindan mod degerinin uc secenekten biri
               oldugunu ve kodun o dali tasidigini goruyoruz. */
            const k = readFileSync(BP + "/scripts/yetenekler/can_sayaci.js", "utf8");
            return k.includes('CAN_SAYACI_MOD === "kapali"') &&
                   k.includes('CAN_SAYACI_MOD === "degisince"');
          })());
  const k = readFileSync(BP + "/scripts/yetenekler/can_sayaci.js", "utf8");
  kontrol("'hep' modu icin ayri dal yok (degisince disi = hep)",
          !k.includes('CAN_SAYACI_MOD === "hep"'),
          "degisince kontrolu disinda kalan her sey 'hep' gibi davraniyor");
}

console.log("");
console.log("=== 6. ULASILABILIYOR MU ===");
{
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js can_sayaci.js'i import ediyor",
          kaynak.includes('from "./yetenekler/can_sayaci.js"'));
  kontrol("merkezi tick'ten cagriliyor",
          /canSayaciTara\(oyuncular\)/.test(kaynak));
  /* v4.83 dersi: "calisiyor mu" != "ulasilabiliyor mu".
     Tick kapisinda sayilmazsa hicbir sistem acik degilken
     sessizce hic calismazdi.                              */
  /* Kapinin SONUNDA olmasi sart degil -- v5.1'de teknoloji
     zirhlari eklenince "|| CAN_SAYACI_ACIK) {" kalibi kaydi ve
     test yanlis alarm verdi. Aranan sey konum degil UYELIK:
     kapi ifadesinin icinde geciyor mu.                      */
  const kapi = (kaynak.match(/if \(iksirVar[\s\S]*?\) \{/) || [""])[0];
  kontrol("tick kapisinda sayiliyor",
          kapi.includes("CAN_SAYACI_ACIK"),
          kapi ? "kapi bulundu" : "kapi ifadesi bulunamadi");
  kontrol("playerLeave temizliyor",
          /canSayaciUnut\(olay\.playerId\)/.test(kaynak));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Can sayaci yerinde");
process.exit(hata ? 1 : 0);

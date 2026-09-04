/* ANIMASYON TARAMASI                                     v5.3

   Kullanici: "gene animasyon tarafinda tum animasyonlar icin
   genel bir tarama yapmani istiyorum, bozukluk cikarsa haber
   et, cunku animasyonlara cok onem veriyorum."

   Tarama BIR KEZ yapilip rapor edilseydi bir dahaki surumde
   yine bozulurdu. Bu dosya taramayi KALICI hale getiriyor:
   her kosuda calisiyor ve bir tek HATA cikarsa takim duser.

   ---- NE ARIYOR ----
     · JSON okunabiliyor mu
     · kimlik "animation." ile basliyor mu (baslamazsa Bedrock
       animasyonu SESSIZCE hic oynatmiyor -- v4.97'de yasandi)
     · ayni pakette cift kimlik var mi
     · iki paketteki ayni kimlik AYRISMIS mi
     · kullanilan her animasyon gercekten TANIMLI mi
     · scripts.animate'te tanimsiz kisa ad var mi
     · kare zamanlari sayi mi, vektorler uc bilesenli mi
     · kareler animation_length'i asiyor mu
     · animasyonun yazdigi kemik MODELDE var mi

   Son madde v5.3'te gercek bir bulgu verdi: alti kolun tutus
   animasyonu `rightitem` adli olmayan bir kemige yaziyordu ve
   DORT SURUMDUR hicbir sey yapmiyordu.

   ---- NEDEN PYTHON ----
   Tarama dosya sistemini geziyor ve JSON cozuyor; ayni is
   iki dilde iki kez yazilmasin diye betik Python ve buradan
   cagriliyor. Cikti bicimi sabit: "HATA : <n>".            */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

let cikti = "";
try {
  cikti = execFileSync("python3", ["anim_tara.py"], {
    encoding: "utf8", cwd: import.meta.dirname, maxBuffer: 32 * 1024 * 1024
  });
} catch (e) {
  cikti = (e.stdout || "") + (e.stderr || "");
}

const satirlar = cikti.split("\n");
const say = (etiket) => {
  const s = satirlar.find((x) => x.startsWith(etiket));
  return s ? parseInt(s.split(":")[1].trim(), 10) : -1;
};
const sayi = satirlar.find((x) => x.startsWith("animasyon:")) || "";

console.log("=== BUTUN ANIMASYONLAR ===");
console.log("  " + sayi.trim());

const hataSayisi = say("HATA :");
kontrol("tarama calisti", hataSayisi >= 0, cikti.slice(0, 200));

/* HATA = oyunda gorunur bozukluk. Sifir olmali.            */
if (hataSayisi > 0) {
  const bas = satirlar.findIndex((x) => x.startsWith("HATA :"));
  const son = satirlar.findIndex((x) => x.startsWith("SUPHE:"));
  console.log(satirlar.slice(bas + 1, son > 0 ? son : bas + 30).join("\n"));
}
kontrol("animasyon HATASI yok", hataSayisi === 0, hataSayisi + " hata");

/* SUPHE = kullanilmayan animasyon. Bozukluk DEGIL: kaynak
   modlardan gelen ve henuz baglanmamis animasyonlar.
   Kullanici "kutuphanelerden odun verme" dedigi icin
   SILINMIYORLAR; yalniz sayilari sabitleniyor ki sessizce
   artmasin.

   v5.8: tarayici DOSYA duzeyinde de bir satir yaziyor
   ("bilinen artik dosya"). O satirlar tek tek animasyonlari
   saymiyor, ayni animasyonlari OZETLIYOR -- tavana katilirsa
   ayni seyi iki kez saymis oluruz. O yuzden ayri sayiliyor
   ve kendi tavani var (3: petrosapien, prototype,
   recal_omnitrix).                                          */
const dosyaSuphe = satirlar
  .filter((x) => x.indexOf("bilinen artik dosya") !== -1).length;
const supheSayisi = say("SUPHE:") - dosyaSuphe;
kontrol("kullanilmayan animasyon sayisi artmadi",
        supheSayisi >= 0 && supheSayisi <= 35,
        supheSayisi + " tane (tavan 35)");
kontrol("bilinen artik DOSYA sayisi artmadi",
        dosyaSuphe <= 3, dosyaSuphe + " dosya (tavan 3)");

/* DIS = oyunun KENDI animasyonlari (fox.sleep, warden.roar,
   armor_stand.* ...). Bunlarin bizim paketimizde olmamasi
   eksiklik degil, beklenen hal -- o yuzden SUPHE tavanina
   girmiyorlar.

   Ama SAYILARI SABIT: bagisiklik degil, ayri defter. Yeni bir
   vanilla animasyon eklendiginde bu sayi degisir ve burasi
   duser; o an kasitli mi diye bakilir.

   43 = v7.27'de kullanicinin gonderdigi 39 poz (biri
   humanoid.* oldugu icin zaten VANILLA sayiliyor) + modun
   daha once kullandigi fox.sleep / evoker.general /
   villager.get_in_bed / zombie.attack_bare_hand / agent.move.

   Bu bes tanesi v7.27'ye kadar HIC TARANMIYORDU: tarayici
   kimligi yalniz metnin tamami oldugunda goruyordu, oysa
   hepsi "animation.x.y a 9999" gibi argumanli yaziliyor.  */
const disSayisi = say("DIS  :");
kontrol("dis (vanilla) animasyon sayisi degismedi",
        disSayisi === 43, disSayisi + " tane (beklenen 43)");

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);

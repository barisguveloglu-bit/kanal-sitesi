/* UZAK AKRABA -- HASAR IZLERI                          v7.10.0

   Kullanicinin istegi, kendi sozleriyle:
     "hapsedildi ... normale gore daha zayif olmasi gerekiyor
      zamaninda chris1545 tarafindan boralo zehirlenmis ve bir
      ay boyunca yarim sekilde kalmisti zaten dosyayi
      incelersin nasil yarim kaldigini gorebiliyorsun sonra tam
      vucut haline kavustu ... o gozdeki detaylari bana da ekle
      yani ben bayagi bir hasar almis sekilde olayim"

   ---- BU DOSYA NEYI TUTUYOR ----
   Skin bir GORUNUS degil, KIMLIK (v4.38 dersi). Goze bakip
   "guzel olmus" demek yetmiyor; asagidaki alti sey sessizce
   kayarsa kimse fark etmez:

     1. Zehir renkleri UYDURULMAMIS olmali. Uc ton chris1545'in
        kanli kol dokusundan sayilarak alindi; biri elle
        degistirilirse zehir baska birinin rengine doner.
     2. Pranga halkasi seridin TAMAMINI dolasmali. Yalniz on
        yuze cizilen halka yandan bakinca kayboluyor.
     3. Kavusma izi tam KOL_BOLGELERI'nin ust kenarinda olmali
        -- "bir ay yarim kaldi"nin dosyadaki karsiligi orasi.
     4. Goz cekirdegi GOZ_SATIR/GOZ_SUTUNLAR'da ve GOZ
        renginde KALMALI. Kayarsa iksir goz kaplamasi havada
        durur (v4.2'de tam bu yasandi, iki surum surdu).
     5. Turkuaz AZALMIS ama BITMEMIS olmali. Bitirseydik
        karakter kendi rengini kaybederdi.
     6. Kolsuz surumde omuz izi DURMALI: yarim kaldigi ay
        oradan okunuyor.

   Olcum PNG'den yapiliyor, kaynak koddan degil: renk sabiti
   dogru olup da cizilmemis olabilir.                        */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SKP = KOK + "/Simsek_Skin";
const CHRIS = KOK + "/Simsek_Kol_Kaynak/textures/entity/kns_kolluk_chris_kanli.png";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Butun olcumler TEK python cagrisinda: sabitler skin_uret.py'den
   import ediliyor, boylece testin kendi kopyasi olmuyor. */
const olc = JSON.parse(execFileSync("python3", ["-c", `
import json, sys
sys.path.insert(0, ${JSON.stringify(KOK)})
from PIL import Image
from collections import Counter
import skin_uret as sk

def ac(y):
    return Image.open(y).convert("RGBA")

skin = ac(${JSON.stringify(SKP + "/uzak_akraba.png")})
kolsuz = ac(${JSON.stringify(SKP + "/uzak_akraba_kolsuz.png")})

def renk(im, x, y):
    p = im.getpixel((x, y))
    return tuple(p[:3]) if p[3] else None

def serit_say(im, serit, satirlar, renkler, sutunlar=None):
    """sutunlar verilirse yalniz o OFSETLER sayiliyor.

    Govde seridinde gerekiyor: seridin arka yuzune sirt yara
    izleri de ciziliyor ve onlar da YARA renginde. Butun serit
    sayilirsa "omuz izi var mi" sorusu sirt izleriyle cevaplanip
    dogru gorunuyor -- mutasyon denemesinde tam bu yasandi,
    omuz izi silindigi halde satir gecti."""
    x1, y1, x2, y2 = serit
    toplam = tutan = 0
    for j in satirlar:
        for i in range(x2 - x1 + 1):
            if sutunlar is not None and i not in sutunlar:
                continue
            toplam += 1
            if renk(im, x1 + i, y1 + j) in renkler:
                tutan += 1
    return [tutan, toplam]


# Govde seridinin duzeni (24 piksel):
#   0-3 sag yan | 4-11 on | 12-15 sol yan | 16-23 arka
# Omuz izi olcumu YAN yuzlerde yapiliyor: baska hicbir sey
# oraya cizmiyor.
GOVDE_YAN = set(range(0, 4)) | set(range(12, 16))

demir = {sk.DEMIR, sk.DEMIR_KOY}
yara = {sk.YARA, sk.YARA_ACIK}
turkuaz = {sk.DAMAR_KOY, sk.DAMAR, sk.DAMAR_ISK}
zehir = {sk.ZEHIR_KOY, sk.ZEHIR, sk.ZEHIR_ISK}

seritler = {
    "sag_kol": sk.SAG_KOL_SERIT, "sol_kol": sk.SOL_KOL_SERIT,
    "sag_bacak": sk.SAG_BACAK_SERIT, "sol_bacak": sk.SOL_BACAK_SERIT,
}

# chris1545'in dokusundaki en cok kullanilan uc opak renk
c = Counter(p[:3] for p in ac(${JSON.stringify(CHRIS)}).getdata() if p[3])
kaynak_uc = [list(k) for k, _ in c.most_common(3)]

sayim = Counter(renk(skin, x, y) for x in range(64) for y in range(64)
                if renk(skin, x, y))

# Govde seridinin ON yuzu: 24'luk seritte 4-11 arasi (bkz.
# kavusma_izi). Ortadaki dort sutun dikissiz kalmali.
gx1 = sk.GOVDE_SERIT[0]
orta = [renk(skin, gx1 + i, sk.GOVDE_SERIT[1] + j) in yara
        for i in (6, 7, 8, 9) for j in sk.DIKIS_SATIR]

print(json.dumps({
  "zehir_paleti": [list(sk.ZEHIR_KOY), list(sk.ZEHIR), list(sk.ZEHIR_ISK)],
  "kaynak_uc": kaynak_uc,
  "pranga": {ad: serit_say(skin, s, sk.PRANGA_SATIR, demir)
             for ad, s in seritler.items()},
  "dikis_kol": {ad: serit_say(skin, seritler[ad], sk.DIKIS_SATIR, yara)
                for ad in ("sag_kol", "sol_kol")},
  "dikis_govde": serit_say(skin, sk.GOVDE_SERIT, sk.DIKIS_SATIR, yara,
                           GOVDE_YAN),
  "govde_orta_dikissiz": not any(orta),
  "goz_satir": sk.GOZ_SATIR,
  "goz_sutunlar": [list(t) for t in sk.GOZ_SUTUNLAR],
  # SAG goz (indeks 1) temiz: cekirdeginin ikisi de GOZ renginde.
  "goz_saglam": [renk(skin, x, sk.GOZ_SATIR) == tuple(sk.GOZ)
                 for x in sk.GOZ_SUTUNLAR[1]],
  # SOL goz (indeks 0) yarali: biri olu, oteki yarim.
  "goz_olu": renk(skin, sk.GOZ_SUTUNLAR[0][0], sk.GOZ_SATIR)
             == tuple(sk.GOZ_OLU),
  "goz_yarim": renk(skin, sk.GOZ_SUTUNLAR[0][1], sk.GOZ_SATIR)
               == tuple(sk.GOZ_YARIM),
  # Yarik gozun USTUNDEN geliyor; en usttekі TAZE (en parlak).
  "goz_yarik_taze": renk(skin, sk.GOZ_SUTUNLAR[0][0], sk.GOZ_SATIR - 2)
                    == tuple(sk.ZEHIR_ISK),
  "goz_yarik_alt": renk(skin, sk.GOZ_SUTUNLAR[0][0], sk.GOZ_SATIR - 1)
                   == tuple(sk.YARA_ACIK),
  # Asagi sizan iz.
  "goz_sizinti": renk(skin, sk.GOZ_SUTUNLAR[0][0], sk.GOZ_SATIR + 1)
                 == tuple(sk.ZEHIR_KOY),
  # Boyun prangasi: kafa seridinin SON satiri bastan basa demir.
  "boyun_demir": sum(
      1 for x in range(sk.KAFA_SERIT[0], sk.KAFA_SERIT[2] + 1)
      if renk(skin, x, sk.KAFA_SERIT[3]) in (tuple(sk.DEMIR),
                                             tuple(sk.DEMIR_KOY))),
  "boyun_genislik": sk.KAFA_SERIT[2] - sk.KAFA_SERIT[0] + 1,
  # Kirbac izleri: bacak seridinin pranga USTU satirlari.
  "bacak_iz": sum(
      1 for x in range(sk.SAG_BACAK_SERIT[0], sk.SAG_BACAK_SERIT[2] + 1)
      for y in range(sk.SAG_BACAK_SERIT[1] + 2, sk.SAG_BACAK_SERIT[1] + 8)
      if renk(skin, x, y) in (tuple(sk.YARA), tuple(sk.YARA_ACIK))),
  "goz_hale": [[renk(skin, t[0], sk.GOZ_SATIR - 1) is not None,
                renk(skin, t[1], sk.GOZ_SATIR + 1) is not None]
               for t in sk.GOZ_SUTUNLAR],
  # v7.23: olcum noktasi DEGISTI. Eskiden gozun USTUNDEKI sacak
  # pikseline bakiliyordu; yarali gozde o pikselin uzerine artik
  # YARIK biniyor, yani "zehirli mi" sorusu orada
  # sorulamiyor. Alta sizan isik (sag sutun, alt satir) hem iki
  # gozde de var hem de yaranin altinda kalmiyor.
  "goz_zehirli_hale": renk(skin, sk.GOZ_SUTUNLAR[0][1], sk.GOZ_SATIR + 1)
                      == tuple(sk.GOZ_KSACAK),
  "goz_temiz_hale": renk(skin, sk.GOZ_SUTUNLAR[1][1], sk.GOZ_SATIR + 1)
                    == tuple(sk.GOZ_SACAK),
  "turkuaz": sum(sayim[k] for k in turkuaz),
  "zehir": sum(sayim[k] for k in zehir),
  "sirt": sum(1 for x in range(sk.GOVDE_ARKA[0], sk.GOVDE_ARKA[0] + 8)
              for y in range(sk.GOVDE_ARKA[1], sk.GOVDE_ARKA[1] + 12)
              if renk(skin, x, y) in yara),
  "kolsuz_omuz": serit_say(kolsuz, sk.GOVDE_SERIT, sk.DIKIS_SATIR, yara,
                           GOVDE_YAN),
  "kolsuz_kol_bos": all(renk(kolsuz, x, y) is None
                        for (x1, y1, x2, y2) in sk.KOL_BOLGELERI
                        for x in range(x1, x2 + 1)
                        for y in range(y1, y2 + 1)),
}))
`], { encoding: "utf8" }));

console.log("=== 1. ZEHIR RENGI UYDURULMADI (chris1545) ===");
{
  /* Kullanici "chris1545 tarafindan boralo zehirlenmis" dedi.
     Zehrin rengi tahmin edilmedi: onu getiren kolun dokusunda
     en cok kullanilan uc opak renk sayildi. Bu satir tam
     olarak o sayimi TEKRAR yapiyor -- palet elle degistirilirse
     dusuyor.                                                  */
  kontrol("chris1545 dokusu yerinde", existsSync(CHRIS));
  const a = JSON.stringify([...olc.zehir_paleti].sort());
  const b = JSON.stringify([...olc.kaynak_uc].sort());
  kontrol("zehir paleti = dokudaki en cok uc renk", a === b,
          JSON.stringify(olc.zehir_paleti));
}

console.log("");
console.log("=== 2. HAPIS: PRANGA DORT UZUVDA VE HALKA TAM ===");
{
  /* Halka SERIDIN tamamini dolasmali. Yalniz on yuze cizilen
     bir halka yandan bakinca kayboluyor -- bu depoda ayni hata
     kol desenlerinde bir kez yasandi.                         */
  for (const [ad, [tutan, toplam]] of Object.entries(olc.pranga)) {
    kontrol(ad + ": halka seridin tamamini dolasiyor",
            tutan === toplam && toplam > 0, tutan + "/" + toplam);
  }
  kontrol("dort uzvun dordunde de var",
          Object.keys(olc.pranga).length === 4);
}

console.log("");
console.log("=== 3. BIR AY YARIM: KAVUSMA IZI ===");
{
  /* Iz KOL_BOLGELERI'nin ust kenarinda; kolsuz surumde silinen
     bolge orasi. Kullanicinin "dosyayi incelersin nasil yarim
     kaldigini gorebiliyorsun" dedigi sey.                     */
  for (const [ad, [tutan, toplam]] of Object.entries(olc.dikis_kol)) {
    kontrol(ad + ": dikis kol seridinin ust satirlarinda",
            tutan > 0 && tutan < toplam,
            tutan + "/" + toplam + " (kesikli olmali)");
  }
  /* Olcum govdenin YAN yuzlerinde: kol oraya takiliyor ve
     baska hicbir desen oraya cizmiyor. Once butun serit
     sayiliyordu ve sirttaki yara izleri omuz izi sanilmisti --
     omuz izi silindigi halde satir geciyordu.               */
  kontrol("govdenin yan yuzlerinde omuz izi var", olc.dikis_govde[0] > 0,
          olc.dikis_govde.join("/"));
  /* Iz gogsu bastan basa GECMEMELI: kol govdenin yanindan
     takiliyor, ortadan degil. Ilk denemede butun serit
     boyanmisti ve yaka gibi duruyordu.                        */
  kontrol("gogsun ORTASI dikissiz", olc.govde_orta_dikissiz);
}

console.log("");
console.log("=== 4. GOZ: CEKIRDEK YERINDE, DETAYLAR EKLENDI ===");
{
  /* v4.2 dersi: goz iki satir kayinca iksir goz kaplamasi
     havada duruyor ve sebebi hic anlasilmiyor.                */
  /* ---- BIR GOZUNDEN YARALI (v7.23) ----
     Kullanici: "mesela bir gozunden yarali, yeni hasar almis
     halim o sekilde olacak."

     Buradaki olcum v7.23'te DEGISTI, gevsemedi: eskiden
     "dort cekirdegin dordu de GOZ renginde" deniyordu. Artik
     SAG goz o kurala uyuyor, SOL goz uc ayri sartla
     tutuluyor. Yani ayni yerde uc kat daha fazla sey
     olculuyor.

     v4.2 dersi hala gecerli: goz iki satir kayinca iksir goz
     kaplamasi havada duruyor ve sebebi hic anlasilmiyor. O
     yuzden konum yine GOZ_SATIR/GOZ_SUTUNLAR'dan geliyor. */
  kontrol("SAGLAM goz yerinde ve GOZ renginde",
          olc.goz_saglam.every(Boolean),
          "satir " + olc.goz_satir + " sutun " +
          JSON.stringify(olc.goz_sutunlar));
  /* Iki piksel AYRI: ikisi de olu olsaydi goz kapali gorunurdu
     -- istenen "kor" degil "YARALI".                        */
  kontrol("yarali gozun bir pikseli SONMUS", olc.goz_olu);
  kontrol("oteki pikseli YARIM yaniyor", olc.goz_yarim);
  /* "YENI hasar": taze bir yara govdedeki eski izlerden parlak
     olmali. Hepsi ayni tonda olsaydi bu da eskilerden biri
     gibi okunurdu.                                          */
  kontrol("yarik TAZE (en parlak kirmizi, ustte)", olc.goz_yarik_taze);
  kontrol("yarigin alti daha sonuk", olc.goz_yarik_alt);
  kontrol("gozden asagi iz siziyor", olc.goz_sizinti);
  /* "o gozdeki detaylari bana da ekle": kaplamadaki hale,
     sacak ve alta sizan isik artik skinde de var.            */
  kontrol("her gozde hale/sacak ve alt sizinti var",
          olc.goz_hale.every((c) => c.every(Boolean)));
  kontrol("bir goz zehirli, oteki temiz",
          olc.goz_zehirli_hale && olc.goz_temiz_hale,
          "zehirli " + olc.goz_zehirli_hale + " / temiz " + olc.goz_temiz_hale);

  /* ---- BOYUN PRANGASI (v7.23) ----
     Dort uzvunda halka olup boynu serbest kalan bir tutsak
     olmaz. Halka kafa seridinin son satirinda ve BASTAN SONA
     gidiyor -- yarim bir halka takilmis degil, kapali.     */
  kontrol("boyunda demir halka VAR ve kapali",
          olc.boyun_demir === olc.boyun_genislik,
          olc.boyun_demir + "/" + olc.boyun_genislik + " piksel");

  /* ---- KIRBAC IZLERI (v7.23) ----
     Sirtta vardi, bacaklarda yoktu. Iki yonlu sinir: yoksa
     bacak bombos, cok olursa giysi deseni gibi okunuyor
     (sirt deseninde ayni ders yazili).                     */
  kontrol("bacaklarda kirbac izi var", olc.bacak_iz >= 4,
          olc.bacak_iz + " piksel");
  kontrol("izler DESEN gibi degil (seyrek)", olc.bacak_iz <= 30,
          olc.bacak_iz + " piksel");
}

console.log("");
console.log("=== 5. DAHA ZAYIF AMA HALA KENDISI ===");
{
  /* Kullanici "normale gore daha zayif" dedi. Zayiflik icin
     yeni bir sey eklenmedi, turkuaz AZALTILDI. Ama sifira
     inseydi karakter kendi rengini kaybederdi -- alt sinir bu
     yuzden var.
     Ust sinir olculdu: v7.9.9'da 70 piksel turkuaz vardi.    */
  kontrol("turkuaz azaldi (eskiden 70 piksel)",
          olc.turkuaz < 70, olc.turkuaz + " piksel");
  kontrol("turkuaz BITMEDI", olc.turkuaz >= 20, olc.turkuaz + " piksel");
  kontrol("zehir govdeye yerlesmis", olc.zehir >= 20, olc.zehir + " piksel");
}

console.log("");
console.log("=== 6. BAYAGI HASAR: SIRT ARTIK BOS DEGIL ===");
{
  /* Sirt v7.10'a kadar tek piksel bile tasimiyordu.          */
  kontrol("sirtta yara izleri var", olc.sirt >= 20, olc.sirt + " piksel");
}

console.log("");
console.log("=== 7. KOLSUZ SURUM: YARIM HALIN KAYDI ===");
{
  kontrol("kollar gercekten saydam", olc.kolsuz_kol_bos);
  /* Omuz izi GOVDEDE, yani kol silinince de duruyor: yarim
     kaldigi ay oradan okunuyor.                              */
  kontrol("omuz izi kolsuz surumde de duruyor",
          olc.kolsuz_omuz[0] === olc.dikis_govde[0] &&
          olc.kolsuz_omuz[0] > 0, olc.kolsuz_omuz.join("/"));
}

console.log("");
console.log("=== 8. GOZ SATIRI HALA IMPORT EDILIYOR ===");
{
  /* v4.2: GOZ_SATIR/GOZ_SUTUNLAR elle yazilinca goz kaplamasi
     iki satir yukarida kaldi. Metinde arama yapilirken once
     yorumlar ayiklaniyor -- bu depoda dort kez yorum icindeki
     bir satir gercek kod sanildi.                            */
  const ham = readFileSync(KOK + "/skin_uret.py", "utf8");
  const kod = ham.replace(/"""[\s\S]*?"""/g, "").replace(/^\s*#.*$/gm, "");
  kontrol("kol_uret.py'den import ediliyor",
          /from kol_uret import [^\n]*GOZ_SATIR[^\n]*GOZ_SUTUNLAR/.test(kod));
  kontrol("elle yeniden atanmiyor",
          !/^\s*GOZ_SATIR\s*=/m.test(kod) && !/^\s*GOZ_SUTUNLAR\s*=/m.test(kod));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> hasar izleri yerinde");
process.exit(hata ? 1 : 0);

/* ÇARPIK HAL  (v7.67)

   Kullanici: "benim skinin renklerini tam terse cevirelim, tam
   tersi cevirdikten sonra bir tane siritis ekleyelim."

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   DOKUNUN GERCEKTEN TERS OLDUGU. Doku uretiliyor, yani bir
   gun uretec bozulur ve dosya kaynagin KOPYASI olarak cikarsa
   form "carpik" degil "ayni skin" olur ve kimse fark etmez.
   Burasi kaynak ile turevi piksel piksel karsilastiriyor.

   Ayrica: kilik mantigi KOPYALANMADI, donusum.js parametre
   aldi. O maddeyi de tutuyoruz -- kopya cikarsa iki dosya
   ayrisir.                                                   */
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

esyaKaydet("pa:kol_toprak");
const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const don   = await import("./pack/yetenekler/donusum.js");
const sohbet = await import("./pack/sohbet.js");
const butce  = await import("./pack/butce.js");

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
let hata = false;
const kontrol = (ad, kosul, ek) => {
  if (!kosul) hata = true;
  console.log(`  ${kosul ? "✓" : "✗"} ${ad}${ek ? "  ::  " + ek : ""}`);
};
function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player"; o._mesaj = []; o._komutlar = [];
  o.hasTag = () => false;
  o.runCommand = (k) => { o._komutlar.push(k); return { successCount: 1 }; };
  o.sendMessage = (m) => o._mesaj.push(m);
  D.boyut._varliklar = [o];
  _durum.oyuncular = [o];
  /* v7.62 butce kapisi: varlikIste() tick basinda sifirlanmis
     bir butce bekliyor. Bu satir olmadan donusum sessizce
     reddediliyor ve test "olmadi" der -- kod dogruyken.     */
  if (butce.butceSifirla) butce.butceSifirla();
  return { D, o };
}

console.log("=== 1. YETENEK KAYITLI ===");
{
  const t = kayit.tumYetenekler().find((y) => y.kimlik === "carpik");
  kontrol("carpik kayitli", !!t, t ? t.ad + " · sira " + t.sira : "yok");
  kontrol("esyasiz (jestten erisiliyor)", !!t && t.esyasiz === true);
  kontrol("sira catismasi yok", kayit.siraDenetimi().length === 0,
          JSON.stringify(kayit.siraDenetimi()));
  kontrol("ayar acik", ayar.CARPIK_ACIK === true);
}

console.log("\n=== 2. DOKU GERCEKTEN TERS  (en onemli madde) ===");
{
  const kaynakYol = KOK + "/kaynak_doku/carpik_kaynak.png";
  const urunYol   = KOK + "/Simsek_Kol_Kaynak/textures/entity/carpik.png";
  kontrol("kaynak skin depoda", existsSync(kaynakYol));
  kontrol("carpik doku uretilmis", existsSync(urunYol));

  /* PIL ile piksel karsilastirmasi. Node tarafinda PNG cozucu
     yok; uretec zaten Python, olcum de Python'dan.          */
  const betik = `
import sys
from PIL import Image
a=Image.open(sys.argv[1]).convert("RGBA"); b=Image.open(sys.argv[2]).convert("RGBA")
if a.size!=b.size: print("BOYUT_FARKLI"); sys.exit()
pa,pb=a.load(),b.load(); g,y=a.size
ters=ayni=saydam=sirit=0
SIRIT={(5,0),(5,7),(6,1),(6,2),(6,3),(6,4),(6,5),(6,6),(7,2),(7,3),(7,4),(7,5)}
for j in range(y):
  for i in range(g):
    ra,ga,ba,aa=pa[i,j]; rb,gb,bb,ab=pb[i,j]
    if aa==0:
      saydam+= (ab==0); continue
    if (i-8,j-8) in [(s[1],s[0]) for s in SIRIT]:
      sirit += (rb,gb,bb,ab)==(0,0,0,255); continue
    if (rb,gb,bb)==(255-ra,255-ga,255-ba): ters+=1
    elif (rb,gb,bb)==(ra,ga,ba): ayni+=1
print("ters=%d ayni=%d saydam_korundu=%d sirit_siyah=%d" % (ters,ayni,saydam,sirit))
`;
  let cikti = "";
  try {
    cikti = execFileSync("python3", ["-c", betik, kaynakYol, urunYol],
                         { encoding: "utf8" }).trim();
  } catch (e) { cikti = "OLCULEMEDI: " + e.message.slice(0, 60); }
  console.log("     " + cikti);

  const say = (ad) => { const m = cikti.match(new RegExp(ad + "=(\\d+)")); return m ? +m[1] : -1; };
  kontrol("pikseller TERS cevrilmis", say("ters") > 1500, say("ters") + " piksel");
  /* Bu madde asil koruma: uretec bozulup kaynagi kopyalasa
     "ayni" buyur ve "ters" cokerdi.                        */
  kontrol("kaynakla AYNI kalan piksel yok", say("ayni") === 0,
          say("ayni") + " piksel ayni");
  kontrol("saydamlik ters CEVRILMEMIS", say("saydam_korundu") > 2000,
          say("saydam_korundu") + " saydam piksel korundu");
  kontrol("siritisin 12 pikseli saf siyah", say("sirit_siyah") === 12,
          say("sirit_siyah") + "/12");
}

console.log("\n=== 3. KILIK MANTIGI KOPYALANMADI ===");
{
  const c = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/carpik.js", "utf8");
  kontrol("carpik.js donusum.js'i cagiriyor", /from "\.\/donusum\.js"/.test(c));
  /* Kopya belirtisi: kendi spawnEntity'si olsaydi hizalama ve
     temizlik iki yerde dururdu.                            */
  kontrol("carpik.js kendi spawnEntity'sini YAZMIYOR",
          !/spawnEntity/.test(c));
  /* Function.length varsayilan parametreyi SAYMAZ, o yuzden
     imzaya bakmak yaniltir (ilk yazilista tam bu oldu).
     Davranisa bakiyoruz: verilen kimlikle dogurulmus mu.    */
  {
    /* DEFTERE DEGIL, DOGAN VARLIGA bakiyoruz. Ilk yazilista
       kilikKimligi() sinaniyordu ve o alan parametreden
       yaziliyor -- yani donus() parametreyi tamamen yoksayip
       hep O Sey dogursa bile test YESIL yanardi. Mutasyon
       bataryasi tam bunu yakaladi.                         */
    const { D, o } = kur("param");
    const once = D.sayac.dogan.length;
    don.donus(o, ayar.CARPIK_KILIK_KIMLIK);
    const yeni = D.sayac.dogan.slice(once);
    kontrol("donus() GERCEKTEN carpik kiligi doguruyor",
            yeni.length === 1 && yeni[0].tip === ayar.CARPIK_KILIK_KIMLIK,
            yeni.map((d) => d.tip).join(", ") || "hic dogmadi");
    kontrol("defter de dogru kimligi tutuyor",
            don.kilikKimligi(o.id) === ayar.CARPIK_KILIK_KIMLIK,
            String(don.kilikKimligi(o.id)));
    don.cikis(o);
  }
  {
    /* Ve varsayilan hala O Sey: eski cagrilar bozulmadi.    */
    const { D, o } = kur("param2");
    const once = D.sayac.dogan.length;
    don.donus(o);
    const yeni = D.sayac.dogan.slice(once);
    kontrol("parametresiz cagri GERCEKTEN O Sey doguruyor",
            yeni.length === 1 && yeni[0].tip === ayar.SEY_KILIK_KIMLIK,
            yeni.map((d) => d.tip).join(", ") || "hic dogmadi");
    don.cikis(o);
  }
}

console.log("\n=== 4. DONUSUM VE CIKIS ===");
{
  const { o } = kur("c1");
  kontrol("baslangicta insan", don.donusukMu(o.id) === false);
  const t = kayit.tumYetenekler().find((y) => y.kimlik === "carpik");
  t.olustur(o);
  kontrol("donustu", don.donusukMu(o.id) === true);
  kontrol("dogru kilikta", don.kilikKimligi(o.id) === ayar.CARPIK_KILIK_KIMLIK,
          String(don.kilikKimligi(o.id)));
  t.olustur(o);
  kontrol("ayni yetenek geri cikariyor", don.donusukMu(o.id) === false);
}

console.log("\n=== 5. SOHBET KOMUTU ===");
{
  const { o } = kur("c2");
  const s = sohbet.komutCozumle(o, "carpik");
  kontrol("'carpik' taniniyor", !!s, s ? "tanindi" : "tanimadi");
  /* ---- SAHTE DUNYANIN SINIRI (durustluk notu) ----
     Komutun kilik DOGURDUGUNU burada olcemiyoruz:
     yetenekTetikle isi system.runTimeout ile atiyor ve sahte
     dunyada bu yol yetenegin govdesine ulasmiyor. Olculdu --
     MEVCUT "donusum" yetenegi de ayni yoldan tetiklendiginde
     donusmuyor, yani bu bir harness sinirI, bu ozelligin
     kusuru degil.

     Onun yerine YONLENDIRMEYI olcuyoruz: cevap undefined ise
     tetikleme kimligi KABUL etmis demektir. Yetenek adi
     degistirilseydi "Bilinmeyen yetenek" donerdi -- asagidaki
     ikinci madde tam onu gosteriyor. Gercek donusum 4.
     bolumde dogrudan cagriyla sinaniyor.                    */
  kontrol("komut yetenegi KABUL etti (sessiz cevap)",
          !!s && s.cevap === undefined,
          s ? String(s.cevap) : "-");
  const yok = sohbet.komutCozumle(kur("c2b").o, "yetenek carpikdiyebirseyyok");
  kontrol("olmayan kimlik REDDEDILIYOR (madde tersten tutuyor)",
          !!yok && /Bulamad|Bilinmeyen/i.test(String(yok.cevap)),
          yok ? String(yok.cevap).slice(0, 40) : "-");
  const { o: o2 } = kur("c3");
  kontrol("'çarpık' (Turkce harflerle) de taniniyor",
          !!sohbet.komutCozumle(o2, "çarpık"));
  const y = sohbet.komutCozumle(kur("c4").o, "yardim");
  kontrol("yardimda yaziyor", !!y && /carpik/.test(String(y.cevap)));
}

console.log("\n=== 6. PAKET DOSYALARI ===");
{
  const yollar = [
    "Simsek_TNT_ToprakTopu/entities/carpik_kilik.json",
    "Simsek_Kol_Kaynak/entity/carpik_kilik.entity.json",
    "Simsek_Kol_Kaynak/models/entity/carpik.geo.json",
    "Simsek_Kol_Kaynak/animations/carpik.animation.json",
    "Simsek_Kol_Kaynak/textures/entity/carpik.png",
    "Simsek_Oyuncu_Modeli/models/entity/carpik.geo.json",
    "Simsek_Oyuncu_Modeli/animations/carpik.animation.json",
    "Simsek_Oyuncu_Modeli/textures/entity/carpik.png"
  ];
  for (const y of yollar) kontrol(y.split("/").slice(-2).join("/"), existsSync(KOK + "/" + y));

  const anim = JSON.parse(readFileSync(KOK + "/Simsek_Kol_Kaynak/animations/carpik.animation.json", "utf8"));
  const titre = anim.animations["animation.carpik.titre"];
  kontrol("titreme animasyonu var", !!titre);
  kontrol("titreme DONGUDE (surekli)", !!titre && titre.loop === true);
  /* math.random her karede yeniden atiyor -- gercek titreme.
     math.sin olsaydi duzenli sallanma olurdu.              */
  kontrol("math.random kullaniyor (duzenli sallanma DEGIL)",
          JSON.stringify(titre).indexOf("math.random") >= 0);
  kontrol("titreme INCE (mutlak deger <= 5 derece)",
          [...JSON.stringify(titre).matchAll(/math\.random\(-([\d.]+)/g)]
            .every((m) => parseFloat(m[1]) <= 5),
          [...new Set([...JSON.stringify(titre).matchAll(/math\.random\(-([\d.]+)/g)]
            .map((m) => m[1]))].join(", "));

  const ist = JSON.parse(readFileSync(KOK + "/Simsek_Kol_Kaynak/entity/carpik_kilik.entity.json", "utf8"));
  const d = ist["minecraft:client_entity"].description;
  kontrol("istemci varligi titremeyi CALISTIRIYOR",
          (d.scripts.animate || []).indexOf("titre") >= 0,
          (d.scripts.animate || []).join(", "));
  kontrol("ince (Alex) geometri", d.geometry.default === "geometry.carpik");
  const geo = JSON.parse(readFileSync(KOK + "/Simsek_Kol_Kaynak/models/entity/carpik.geo.json", "utf8"));
  const kol = geo["minecraft:geometry"][0].bones.find((b) => b.name === "rightArm");
  kontrol("kol 3 piksel genis (ince model)", kol.cubes[0].size[0] === 3,
          "genislik " + kol.cubes[0].size[0]);
}

console.log("\n=== 7. KILIK 'BOT' SAYILIYOR ===");
{
  kontrol("BOT_KIMLIKLER carpik kiligi taniyor",
          ayar.BOT_KIMLIKLER.has(ayar.CARPIK_KILIK_KIMLIK));
}

/* ---- MUTASYON BATARYASI: 11 denendi, 10 yakalandi ----

   KACAN: uretecteki "if a == 0: continue" satirini kaldirmak,
   yani saydam piksellerin RGB'sini de ters cevirmek.

   Kacmasinin sebebi su: alfa DEGISMIYOR, yalniz gorunmeyen
   RGB degeri degisiyor. Piksel yine saydam kaliyor, oyunda
   hicbir sey degismiyor -- yani davranisi koruyan bir
   mutasyon. Satir yine de duruyor cunku bazi araclar saydam
   pikselin rengini kenarlara tasiriyor; ama bunu bu testte
   olcecek bir yol yok ve "yakaladi" demek yanlis olurdu.

   Yakalananlar: ters cevirme kaldirildi · siritis cizilmedi ·
   titreme dongusu kapatildi · titreme 30 dereceye cikarildi ·
   istemci titremeyi calistirmadi · klasik 4px kol geometrisi ·
   carpik.js kendi spawnEntity'sini yazdi · donus() parametreyi
   yoksaydi · sohbet komutu kaldirildi · BOT_KIMLIKLER'den
   dusuruldu.                                                */
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> carpik hal yerinde");
process.exit(hata ? 1 : 0);

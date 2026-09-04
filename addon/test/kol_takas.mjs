/* KOL TAKASI -- depodaki ilk sinematik                      v7.9

   Kullanicinin tarif ettigi sahne:
     "Toprak kollar yere dusuyor ikisi de ayni sekilde yani sag
      ve sol kol ardindan kanli kol ortaya cikiyor... Toprak kol
      yere dusuyor ardindan kanli kol geliyor ve takilmis oluyor."

   ---- BU DOSYA NEYI OLCUYOR ----
   "Kod yazildi mi" degil, "SAHNE OYNUYOR MU". Is nesnesi tick
   tick GERCEKTEN calistiriliyor ve her evrede ne oldugu
   olculuyor. v7.6, v7.7 ve v7.8'de takim yesil yaniyordu ama
   yeni kod hic YURUTULMEMISTI -- ucunde de calisma zamani testi
   sonradan yazilmak zorunda kaldi.

   ---- EN ONEMLI GUVENCE: ESYA KAYBOLMUYOR ----
   Sahne oyuncunun elindeki Toprak Kol'u oynatiyor. Bu depoda
   esya kaybettirmek en agir hata. 10. bolum sahnenin BASINDAKI
   ve SONUNDAKI esyalari tek tek sayiyor.                      */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum, world } from "@minecraft/server";
import { readFileSync } from "node:fs";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };
sus(); await import("./pack/main.js"); ac();
const ayar   = await import("./pack/ayarlar.js");
const kollar = await import("./pack/yetenekler/kollar.js");
const kayit  = await import("./pack/yetenekler/kayit.js");
const takas  = await import("./pack/yetenekler/kol_takas.js");

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Sahnenin dokundugu her esya oyunun kayit defterinde olmali --
   gercek ItemStack kurucusu bilinmeyen kimlikte ATIYOR.       */
for (const t of [ayar.KOL_TAKAS_KAYNAK, ayar.KOL_TAKAS_HEDEF,
                 ayar.KOL_TAKAS_ISARET]) {
  _durum.kayitliEsyalar.add(t);
}
const yigin = (tip) => ({ typeId: tip, amount: 1 });

/* Sahte oyuncu.

   IKI EKLEME var, ikisi de gercek API'de ZATEN VAR ama
   dunya.mjs'te yoktu:
     setEquipment -- sahne ana ele esya koyuyor
     runCommand   -- kollariKaldir/kollariIndir playanimation
                     calistiriyor; yoksa dallanma orada patlar ve
                     yetenek hic calismaz (anna.mjs'te tam bu
                     oldu, test "calismiyor" diyordu ama kod hic
                     cagrilmamisti).                            */
function oyuncuHazirla(D, elde, yuvalar) {
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "takas_oyuncu"; o.typeId = "minecraft:player";
  o.sendMessage = () => {};
  o.runCommand = () => true;
  o._el = elde ? yigin(elde) : undefined;
  o._yuvalar = new Array(36).fill(undefined);
  for (const [i, tip] of yuvalar) o._yuvalar[i] = yigin(tip);
  const temel = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (slot) => (slot === "Mainhand" ? o._el : undefined),
        setEquipment: (slot, esya) => {
          if (slot !== "Mainhand") return false;
          o._el = esya; return true;
        }
      };
    }
    return temel(ad);
  };
  return o;
}

/* Envanterdeki + eldeki HER esyayi tipine gore sayar. */
function esyaSay(o) {
  const s = new Map();
  const ekle = (t) => s.set(t, (s.get(t) || 0) + 1);
  if (o._el) ekle(o._el.typeId);
  for (const e of o._yuvalar) if (e) ekle(e.typeId);
  return s;
}

/* Is nesnesini tick tick calistirir; kac tick surdugunu doner
   (-1 = tavana carpmadan bitmedi).                            */
function oynat(is, enFazla = 400) {
  for (let n = 0; n < enFazla; n++) {
    if (is.calis()) return n;
    tickIlerlet(1);
  }
  return -1;
}

const tanim = () => kayit.yetenekAl("kol_takas");
const dogan = (D) => D.sayac.dogan;

console.log("=== 1. KAYIT VE BAGLANTI ===");
{
  kontrol("kol_takas yetenek defterinde", !!tanim());
  kontrol("  sira 146 (cakisma yok)", tanim() && tanim().sira === 146,
          "sira=" + (tanim() ? tanim().sira : "yok"));
  const satir = kollar.KOL_ESYALARI.find((s) => s[0] === "pa:kol_toprak");
  kontrol("Toprak Kol'a bagli", satir && satir.includes("kol_takas"));
  /* YENI KOL ACILMADI: "kol israfi" kurali. Sahne Toprak
     Kol'un kendi cikisi, ayri bir kol degil.                 */
  kontrol("  yeni kol ACILMADI (8 kol duruyor)",
          kollar.KOL_ESYALARI.length === 9, kollar.KOL_ESYALARI.length + " kol");
  /* Isaret esyasi `kol_` ile BASLAMAMALI: baslasaydi kol
     sayaclari (kol2.mjs, temizlik.mjs) 9 gorurdu ve ikisi de
     hakli olurdu -- bu bir kol degil.                        */
  kontrol("isaret esyasi kol_ ad alaninda DEGIL",
          !ayar.KOL_TAKAS_ISARET.startsWith("pa:kol_"),
          ayar.KOL_TAKAS_ISARET);
  const dosya = KOK + "/Simsek_TNT_ToprakTopu/items/takas_isareti.json";
  kontrol("isaret esyasi uretildi",
          JSON.parse(readFileSync(dosya, "utf8"))["minecraft:item"]
            .description.identifier === ayar.KOL_TAKAS_ISARET);
}

console.log("");
console.log("=== 2. ON DENETIM: baslamiyorsa HICBIR SEY oynamiyor ===");
{
  /* --- Kanli Kol yok --- */
  const D = dunyaKur();
  const o = oyuncuHazirla(D, ayar.KOL_TAKAS_KAYNAK, []);
  const once = esyaSay(o);
  sus(); const is = tanim().olustur(o); ac();
  kontrol("Kanli Kol yokken is ACILMIYOR", is === undefined);
  kontrol("  Toprak Kol hala ELDE", o._el && o._el.typeId === ayar.KOL_TAKAS_KAYNAK);
  kontrol("  hicbir varlik dogmadi", dogan(D).length === 0, dogan(D).length + " varlik");
  kontrol("  esya sayimi degismedi",
          JSON.stringify([...once]) === JSON.stringify([...esyaSay(o)]));
  kontrol("  sebep yazildi", /Kanlı Kol/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son || "yazi yok");
}
{
  /* --- Envanter dolu: tasinacak yer yok --- */
  const D = dunyaKur();
  const dolu = [];
  for (let i = 0; i < 36; i++) dolu.push([i, i === 0 ? ayar.KOL_TAKAS_HEDEF : "minecraft:dirt"]);
  const o = oyuncuHazirla(D, ayar.KOL_TAKAS_KAYNAK, dolu);
  sus(); const is = tanim().olustur(o); ac();
  kontrol("envanter doluyken is ACILMIYOR", is === undefined);
  kontrol("  Toprak Kol hala ELDE", o._el && o._el.typeId === ayar.KOL_TAKAS_KAYNAK);
  kontrol("  36 yuva da bozulmadi", o._yuvalar.filter(Boolean).length === 36);
}
{
  /* --- Elde Toprak Kol yok --- */
  const D = dunyaKur();
  const o = oyuncuHazirla(D, "minecraft:stone", [[5, ayar.KOL_TAKAS_HEDEF]]);
  sus(); const is = tanim().olustur(o); ac();
  kontrol("elde Toprak Kol yokken is ACILMIYOR", is === undefined);
  kontrol("  eldeki tas yerinde", o._el.typeId === "minecraft:stone");
}
{
  /* --- setEquipment olmayan surum ---
     Ana ele esya koymanin yolu yoksa sahne YARIM oynamamali. */
  const D = dunyaKur();
  const o = oyuncuHazirla(D, ayar.KOL_TAKAS_KAYNAK, [[5, ayar.KOL_TAKAS_HEDEF]]);
  const temel = o.getComponent;
  o.getComponent = (ad) => (ad === "minecraft:equippable"
    ? { getEquipment: (s) => (s === "Mainhand" ? o._el : undefined) }   // setEquipment YOK
    : temel(ad));
  sus(); const is = tanim().olustur(o); ac();
  kontrol("setEquipment yokken is ACILMIYOR", is === undefined);
  kontrol("  Toprak Kol hala ELDE", o._el && o._el.typeId === ayar.KOL_TAKAS_KAYNAK);
  kontrol("  hicbir varlik dogmadi", dogan(D).length === 0);
}

console.log("");
console.log("=== 3. EVRE 0: el degisiyor, kollar doguyor ===");
let S = null;
{
  const D = dunyaKur();
  const o = oyuncuHazirla(D, ayar.KOL_TAKAS_KAYNAK, [[7, ayar.KOL_TAKAS_HEDEF]]);
  const once = esyaSay(o);
  sus(); const is = tanim().olustur(o); ac();
  kontrol("is acildi", !!is);
  kontrol("ana elde ISARET var",
          o._el && o._el.typeId === ayar.KOL_TAKAS_ISARET,
          o._el ? o._el.typeId : "bos");
  /* Toprak Kol SILINMEDI, TASINDI. Defterde tutulmuyor: script
     yeniden yuklenirse defter ucar, esya ucmaz.              */
  kontrol("Toprak Kol ENVANTERDE (silinmedi)",
          o._yuvalar.some((e) => e && e.typeId === ayar.KOL_TAKAS_KAYNAK));
  kontrol("Kanli Kol hala envanterde",
          o._yuvalar.some((e) => e && e.typeId === ayar.KOL_TAKAS_HEDEF));
  const d = dogan(D);
  kontrol("iki dusen kol dogdu", d.length === 2, d.map((x) => x.tip).join(", "));
  kontrol("  biri sag biri sol",
          d.some((x) => x.tip === ayar.KOL_TAKAS_DUSEN_SAG) &&
          d.some((x) => x.tip === ayar.KOL_TAKAS_DUSEN_SOL));
  /* Omuz yuksekligi HESAPLANIYOR: gercek omuz (1,35) eksi kol
     modelinin boyu (0,75). Kollar orijinlerinden YUKARI dogru
     uzuyor, yani ust uclari omza gelsin diye asagi doguyorlar. */
  /* IKI KATLI OLCUM ve sebebi bir hata.

     Once yalniz "ayardaki degerle tutuyor mu" diye baktim.
     O iddia HIC DUSEMEZ: beklentiyi sinadigi ayardan
     turetiyor. Kanit icin KOL_TAKAS_OMUZ_X'i 0 yaptim --
     yani iki kol ayni noktada dogsun, tek kol dusuyormus gibi
     gorunsun -- ve test YESIL yandi.

     Onun icin her olcum iki kez yapiliyor: once MUTLAK bir
     dogruluk (kol govdenin uzerinde bir yerde, iki kol
     birbirinden gorunur uzaklikta), sonra ayarla tutarlilik.
     Birincisi ayar bozulunca duser, ikincisi kod bozulunca. */
  const yukseklik = d[0].y - o.location.y;
  kontrol("  govde uzerinde dogdu (mutlak)",
          d.every((x) => x.y - o.location.y > 0.2 && x.y - o.location.y < 1.8),
          "ayaktan " + yukseklik.toFixed(2) + " blok yukarida");
  kontrol("  omuz yuksekliginde (ayarla tutarli)",
          d.every((x) => Math.abs(x.y - (o.location.y + ayar.KOL_TAKAS_OMUZ_Y)) < 0.001),
          "y=" + d[0].y.toFixed(2) + " beklenen=" +
          (o.location.y + ayar.KOL_TAKAS_OMUZ_Y).toFixed(2));
  const ara = Math.hypot(d[0].x - d[1].x, d[0].z - d[1].z);
  kontrol("  IKI KOL AYRI NOKTADA (mutlak)", ara > 0.3,
          "aralik=" + ara.toFixed(2) + " blok");
  kontrol("  govdenin iki yaninda (ayarla tutarli)",
          Math.abs(ara - 2 * ayar.KOL_TAKAS_OMUZ_X) < 0.001,
          "aralik=" + ara.toFixed(2));
  kontrol("gelen kol HENUZ dogmadi",
          !d.some((x) => x.tip === ayar.KOL_TAKAS_GELEN));
  S = { D, o, is, once };
}

console.log("");
console.log("=== 4. EVRE 1-3: bekleme, gelis, varis ===");
{
  const { D, o, is } = S;
  /* Kollar yerde beklerken gelen kol dogmamali: dogsaydi
     sahnenin nefes aldigi an kaybolurdu.                     */
  for (let i = 0; i < ayar.KOL_TAKAS_YERDE - 1; i++) { is.calis(); tickIlerlet(1); }
  kontrol("bekleme dolmadan gelen kol dogmadi",
          !dogan(D).some((x) => x.tip === ayar.KOL_TAKAS_GELEN),
          dogan(D).length + " varlik");

  const sure = oynat(is);
  kontrol("sahne bitti (tavana carpmadan)", sure >= 0, sure + " tick");
  kontrol("  tavanin altinda", sure >= 0 && sure < ayar.KOL_TAKAS_TAVAN);
  const g = dogan(D).find((x) => x.tip === ayar.KOL_TAKAS_GELEN);
  kontrol("gelen kol YUKARIDAN dogdu", !!g &&
          Math.abs(g.y - (o.location.y + ayar.KOL_TAKAS_OMUZ_BOY +
                          ayar.KOL_TAKAS_GELIS_YUKSEK)) < 0.001,
          g ? "y=" + g.y.toFixed(2) : "dogmadi");
  /* Gelen kolun hedefi GERCEK omuz (1,35): o modelin merkezi
     kendi orijininde, dusen kollarinki gibi tabaninda degil.  */
  const varlik = D.sayac.varliklar.find((v) => v.typeId === ayar.KOL_TAKAS_GELEN);
  /* VARIS bir ESIK: kol omza tam oturmuyor, o kadar
     yaklasinca "takildi" sayiliyor.

     OLCUM NOKTASI OMUZ, oyuncunun merkezi DEGIL. Ilk yazimda
     merkezden olctum ve 0,695 cikti -- kolun sapmasi
     sanmistim. Degilmis: sqrt(0,35^2 + 0,60^2) = 0,695, yani
     omuzun yanal kaymasini mesafeye katmisim. Kol omuzdan tam
     0,6 blokta duruyordu, olcum yanlisti. Bu dosyada UCUNCU
     kez kurulum hatasini kod hatasi sandim.                  */
  const omuzX = o.location.x - ayar.KOL_TAKAS_OMUZ_X;   // yaw 0 -> sag = -x
  const uzaklik = varlik
    ? Math.hypot(varlik.location.x - omuzX,
                 varlik.location.y - (o.location.y + ayar.KOL_TAKAS_OMUZ_BOY),
                 varlik.location.z - o.location.z)
    : Infinity;
  kontrol("  omza kadar geldi", uzaklik <= ayar.KOL_TAKAS_VARIS + 1e-6,
          "uzaklik=" + uzaklik.toFixed(3) + " esik=" + ayar.KOL_TAKAS_VARIS);
  kontrol("  adim adim geldi (isinlanmadi)",
          !!varlik && varlik._isinlanma.length > 5,
          varlik ? varlik._isinlanma.length + " adim" : "yok");
}

console.log("");
console.log("=== 5. BITIS: kol takildi, ortada bir sey kalmadi ===");
{
  const { D, o, is, once } = S;
  kontrol("ana elde KANLI KOL var",
          o._el && o._el.typeId === ayar.KOL_TAKAS_HEDEF,
          o._el ? o._el.typeId : "bos");
  kontrol("  isaret ortada yok",
          !o._yuvalar.some((e) => e && e.typeId === ayar.KOL_TAKAS_ISARET));
  kontrol("  Kanli Kol envanterde KOPYA birakmadi",
          o._yuvalar.filter((e) => e && e.typeId === ayar.KOL_TAKAS_HEDEF).length === 0);
  kontrol("Toprak Kol envanterde DURUYOR",
          o._yuvalar.filter((e) => e && e.typeId === ayar.KOL_TAKAS_KAYNAK).length === 1);

  is.bitir();
  const kalan = D.sayac.varliklar.filter((v) => !v._kaldirildi &&
    [ayar.KOL_TAKAS_DUSEN_SAG, ayar.KOL_TAKAS_DUSEN_SOL,
     ayar.KOL_TAKAS_GELEN].includes(v.typeId));
  kontrol("uc varligin ucu de silindi", kalan.length === 0,
          kalan.length + " varlik ortada kaldi");
  kontrol("  defter bosaltildi",
          world.getDynamicProperty(ayar.KOL_TAKAS_KAYIT_ANAHTAR) === "[]",
          String(world.getDynamicProperty(ayar.KOL_TAKAS_KAYIT_ANAHTAR)));

  console.log("");
  console.log("=== 6. ESYA SAYIMI: hicbir sey kaybolmadi ===");
  const sonra = esyaSay(o);
  /* Sahnenin yok ettigi TEK sey kendi urettigi isaret. Toprak
     Kol ve Kanli Kol birer tane girdi, birer tane cikti.     */
  kontrol("Toprak Kol: 1 girdi, 1 cikti",
          once.get(ayar.KOL_TAKAS_KAYNAK) === 1 &&
          sonra.get(ayar.KOL_TAKAS_KAYNAK) === 1,
          (once.get(ayar.KOL_TAKAS_KAYNAK) || 0) + " -> " +
          (sonra.get(ayar.KOL_TAKAS_KAYNAK) || 0));
  kontrol("Kanli Kol: 1 girdi, 1 cikti",
          once.get(ayar.KOL_TAKAS_HEDEF) === 1 &&
          sonra.get(ayar.KOL_TAKAS_HEDEF) === 1,
          (once.get(ayar.KOL_TAKAS_HEDEF) || 0) + " -> " +
          (sonra.get(ayar.KOL_TAKAS_HEDEF) || 0));
  let toplamOnce = 0, toplamSonra = 0;
  for (const v of once.values()) toplamOnce += v;
  for (const v of sonra.values()) toplamSonra += v;
  kontrol("toplam esya sayisi korundu", toplamOnce === toplamSonra,
          toplamOnce + " -> " + toplamSonra);
  kontrol("  isaret geride kalmadi", !sonra.has(ayar.KOL_TAKAS_ISARET));
}

console.log("");
console.log("=== 7. YARIDA KESILME: bitir() her kosulda topluyor ===");
{
  const D = dunyaKur();
  const o = oyuncuHazirla(D, ayar.KOL_TAKAS_KAYNAK, [[3, ayar.KOL_TAKAS_HEDEF]]);
  const once = esyaSay(o);
  sus(); const is = tanim().olustur(o); ac();
  is.calis(); tickIlerlet(1);          // sahne basladi, kollar dustu
  kontrol("kesilme aninda elde ISARET var",
          o._el && o._el.typeId === ayar.KOL_TAKAS_ISARET);

  sus(); is.bitir(); ac();             // oyuncu cikti / is silindi

  kontrol("isaret elden ALINDI",
          !o._el || o._el.typeId !== ayar.KOL_TAKAS_ISARET,
          o._el ? o._el.typeId : "bos");
  kontrol("Toprak Kol ENVANTERDE (kaybolmadi)",
          o._yuvalar.some((e) => e && e.typeId === ayar.KOL_TAKAS_KAYNAK));
  kontrol("Kanli Kol da yerinde",
          o._yuvalar.some((e) => e && e.typeId === ayar.KOL_TAKAS_HEDEF));
  const kalan = D.sayac.varliklar.filter((v) => !v._kaldirildi);
  kontrol("dusen kollar silindi", kalan.length === 0,
          kalan.length + " varlik ortada kaldi");
  const sonra = esyaSay(o);
  let a = 0, b = 0;
  for (const v of once.values()) a += v;
  for (const v of sonra.values()) b += v;
  kontrol("esya sayisi korundu (isaret haric)", a === b, a + " -> " + b);
}

console.log("");
console.log("=== 7b. OYUNCU SAHNE ORTASINDA GECERSIZ OLURSA ===");
{
  /* Genel taramada mutasyon testi bu kor noktayi buldu:
     `if (!gecerliMi(oyuncu)) return true;` satirini bilerek
     kaldirdim ve 83 test dosyasindan HICBIRI dusmedi.

     Gercek oyunda bu her zaman olabilir: oyuncu sahne
     ortasinda cikar, olur ya da boyut degistirir. Koruma
     olmasaydi is her tick gecersiz bir nesneye dokunur,
     istisna atar ve sahne tavana kadar acik kalirdi.        */
  const D = dunyaKur();
  const o = oyuncuHazirla(D, ayar.KOL_TAKAS_KAYNAK, [[4, ayar.KOL_TAKAS_HEDEF]]);
  sus(); const is = tanim().olustur(o); ac();
  is.calis(); tickIlerlet(1);
  const dogmus = dogan(D).length;

  o.isValid = false;                     // oyuncu cikti / oldu
  let bittiMi = false;
  sus();
  for (let i = 0; i < 60; i++) { if (is.calis()) { bittiMi = true; break; } tickIlerlet(1); }
  ac();
  kontrol("oyuncu gecersiz olunca sahne HEMEN bitiyor", bittiMi);
  kontrol("  yeni varlik dogurmadi", dogan(D).length === dogmus,
          dogan(D).length + " / " + dogmus);
  sus(); is.bitir(); ac();
  const kalan = D.sayac.varliklar.filter((v) => !v._kaldirildi);
  kontrol("  bitir() varliklari yine de topladi", kalan.length === 0,
          kalan.length + " ortada kaldi");
  kontrol("  Toprak Kol envanterde duruyor",
          o._yuvalar.some((e) => e && e.typeId === ayar.KOL_TAKAS_KAYNAK));
}

console.log("");
console.log("=== 8. GUVENLIK TAVANI ===");
{
  const D = dunyaKur();
  const o = oyuncuHazirla(D, ayar.KOL_TAKAS_KAYNAK, [[3, ayar.KOL_TAKAS_HEDEF]]);
  sus(); const is = tanim().olustur(o); ac();
  /* Gelen kolu YERINDE CIVILE: hedefe hic ulasamasin. Tavan
     olmasaydi bu is sonsuza kadar acik kalirdi.

     ILK YAZIMDA HATA: var olan varliklarin teleport'unu
     degistirmistim. Ama gelen kol 30 tick SONRA doguyor, yani
     civileme ona hic degmedi ve sahne 43 tick'te normal
     bitti -- test "tavan calismiyor" demedi, "43 tick'te
     bitti" dedi ve ben sebebini aradim. Dogru yol dogum
     anina takilmak.                                          */
  const eskiDogur = D.boyut.spawnEntity;
  D.boyut.spawnEntity = (tip, poz) => {
    const v = eskiDogur.call(D.boyut, tip, poz);
    if (v && tip === ayar.KOL_TAKAS_GELEN) v.teleport = () => true;
    return v;
  };
  sus();
  const sure = oynat(is, ayar.KOL_TAKAS_TAVAN + 50);
  ac();
  kontrol("takilan sahne kendini bitirdi", sure >= 0, sure + " tick");
  kontrol("  tavanda bitti",
          sure >= ayar.KOL_TAKAS_TAVAN - 2 && sure <= ayar.KOL_TAKAS_TAVAN + 2,
          "tavan=" + ayar.KOL_TAKAS_TAVAN + " bitis=" + sure);
  sus(); is.bitir(); ac();
  kontrol("  bitir() yine de topladi",
          D.sayac.varliklar.every((v) => v._kaldirildi));
  kontrol("  Toprak Kol kaybolmadi",
          o._yuvalar.some((e) => e && e.typeId === ayar.KOL_TAKAS_KAYNAK));
}

console.log("");
console.log("=== 9. ORTADA KALAN VARLIK TEMIZLIGI ===");
{
  /* Sahne yarida kalirsa (oyun kapandi) varliklar `persistent`
     oldugu icin yerinde kalir. Kimlikleri dunya ozelliginde;
     sonraki kullanimda taranip siliniyor.                    */
  const D = dunyaKur();
  const hayalet = { id: "hayalet1", typeId: ayar.KOL_TAKAS_DUSEN_SAG,
                    isValid: true, _kaldirildi: false,
                    remove() { this._kaldirildi = true; this.isValid = false; } };
  _durum.varliklar = [hayalet];
  world.setDynamicProperty(ayar.KOL_TAKAS_KAYIT_ANAHTAR,
                           JSON.stringify(["hayalet1"]));
  takas.takasUnut();                   // "yeni oturum"

  const o = oyuncuHazirla(D, ayar.KOL_TAKAS_KAYNAK, [[3, ayar.KOL_TAKAS_HEDEF]]);
  sus(); const is = tanim().olustur(o); ac();
  kontrol("onceki oturumdan kalan varlik silindi", hayalet._kaldirildi);
  if (is) { sus(); is.bitir(); ac(); }
  _durum.varliklar = [];
}

console.log("");
console.log("=== 10. PARCACIK: EMITTER YOK ===");
{
  /* Kullanici tablette gordu: kanli kola gecerken oyuncunun
     yaninda boyundan buyuk, sonmeyen bir alev sutunu dikildi.
     Sebep PARCACIK_ATES = "minecraft:mobflame_EMITTER" idi --
     `_emitter` tek seferlik bir puf degil, SUREKLI puskuren
     bir KAYNAK. Bu bolum onu geri gelmeye karsi kilitliyor.

     YORUMLAR AYIKLANIYOR: "mobflame_emitter" artik
     kol_takas.js'in ACIKLAMA satirlarinda geciyor. Duz metin
     aramasi yorumla kodu ayirt etmiyor -- will.mjs ve
     anna.mjs'te iki kez bu tuzaga dusuldu, ucuncusu olmasin. */
  const ham = readFileSync(KOK +
    "/Simsek_TNT_ToprakTopu/scripts/yetenekler/kol_takas.js", "utf8");
  const kod = ham.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  kontrol("kodda emitter parcacigi YOK", !/_emitter/.test(kod),
          (kod.match(/[a-z_:]*_emitter/) || ["yok"])[0]);
  kontrol("  ayardaki parcacik da emitter DEGIL",
          !/_emitter$/.test(ayar.KOL_TAKAS_PARCACIK),
          ayar.KOL_TAKAS_PARCACIK);
  kontrol("  tek seferlik tip (_particle)",
          /_particle$/.test(ayar.KOL_TAKAS_PARCACIK));

  /* Sayi SINIRLI olmali: emitter'in derdi zaten sinirsiz
     olmasiydi. Halkanin kac zerre attigi olculuyor.         */
  const D = dunyaKur();
  const o = oyuncuHazirla(D, ayar.KOL_TAKAS_KAYNAK, [[9, ayar.KOL_TAKAS_HEDEF]]);
  const oncekiParcacik = D.sayac.parcacik ? D.sayac.parcacik.length : 0;
  sus(); const is = tanim().olustur(o); oynat(is); is.bitir(); ac();
  const p = (D.sayac.parcacik || []).filter(
    (x) => x.tip === ayar.KOL_TAKAS_PARCACIK);
  kontrol("kan halkasi atildi", p.length === ayar.KOL_TAKAS_PARCACIK_ADET,
          p.length + " zerre (beklenen " + ayar.KOL_TAKAS_PARCACIK_ADET + ")");
  if (p.length) {
    const omuzX = o.location.x - ayar.KOL_TAKAS_OMUZ_X;
    const yaricaplar = p.map((x) => Math.hypot(x.x - omuzX, x.z - o.location.z));
    kontrol("  omzun cevresinde halka",
            yaricaplar.every((r) =>
              Math.abs(r - ayar.KOL_TAKAS_PARCACIK_YARICAP) < 0.001),
            "yaricap " + yaricaplar[0].toFixed(2));
  }
}

console.log("");
console.log("=== 11. YERDE YATAN KOL ===");
{
  /* Kullanici: "Toprak kollar yere dustukten sonra yerde boyle
     kalsin... kolun eni kac onun yarisini dusun sanki yere
     birakilmis... ama o da 1-2 saniyelik."                   */
  const anim = JSON.parse(readFileSync(KOK +
    "/Simsek_Kol_Kaynak/animations/kol_takas.animation.json", "utf8")).animations;

  for (const yon of ["sag", "sol"]) {
    const a = anim["animation.kol_dusen.dusus_" + yon];
    kontrol("dusus_" + yon + " animasyonu var", !!a);
    if (!a) continue;
    /* Kollar 0,6 blok dusuyor -> ~7 tick. Animasyon bundan
       UZUN olursa kol yere degdikten sonra donmeye devam eder
       -- ilk surumdeki hata tam buydu (1,0 sn = 20 tick).   */
    kontrol("  sure dusme suresine uygun (<= 0,5 sn)",
            a.animation_length <= 0.5,
            a.animation_length + " sn = " + a.animation_length * 20 + " tick");
    kontrol("  son kare tutuluyor", a.loop === "hold_on_last_frame");
    const d = a.bones.kol;
    const sonAci = d.rotation[String(a.animation_length.toFixed(1))];
    kontrol("  YATIK bitiyor (X = 90)", !!sonAci && Math.abs(sonAci[0]) === 90,
            sonAci ? JSON.stringify(sonAci) : "son kare yok");
    /* Kol yatinca kalinligi 4 birim; merkezi 2 birim
       kaldirilmazsa yarisi topragin icinde kalir. Bu sayi
       DONUS ISARETINDEN BAGIMSIZ: X=+90 da X=-90 da kupu
       y -2..+2'ye tasiyor (olculdu).                        */
    const sonYer = d.position[String(a.animation_length.toFixed(1))];
    kontrol("  eninin yarisi kadar kaldirildi (+2 birim)",
            !!sonYer && sonYer[1] === 2, JSON.stringify(sonYer));
  }
  /* Iki kol BIREBIR ayni acida yatmasin: kopya gibi gorunur. */
  const sagSon = anim["animation.kol_dusen.dusus_sag"].bones.kol.rotation["0.4"];
  const solSon = anim["animation.kol_dusen.dusus_sol"].bones.kol.rotation["0.4"];
  kontrol("iki kol ayni acida yatmiyor",
          JSON.stringify(sagSon) !== JSON.stringify(solSon),
          JSON.stringify(sagSon) + " vs " + JSON.stringify(solSon));

  /* 1-2 saniye YERDE gorulmeliler. */
  const inis = 8;   // ~7 tick dusus + oturma
  const yerde = ayar.KOL_TAKAS_YERDE - inis;
  kontrol("kollar 1-2 saniye yerde yatiyor",
          yerde >= 20 && yerde <= 40,
          (yerde / 20).toFixed(1) + " sn (kanli kol gelmeden once)");
}

console.log("");
console.log(hata ? "BAZI SINAMALAR KALDI" : "hepsi gecti");
process.exit(hata ? 1 : 0);

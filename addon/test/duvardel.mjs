/* LAZERLE DUVAR DELME (v4.12)

   Referansta duvar kirma YOK. Aranan tek "wall" gecen yer
   "damage @e[r=3] 4 fly_into_wall" ve orasi bir HASAR TURU adi
   (elytra ile duvara carpma), blok kirmayla ilgisi yok.
   Bu ozellik sifirdan yazildi; testleri de ona gore.

   Sinanacaklar:
     - lazer onundeki bloklari deliyor mu
     - KORUNAN bloklara (bedrock, sandik) dokunuyor mu
     - blok butcesini asiyor mu
     - tavani asiyor mu
     - kapatilinca delme duruyor mu                          */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";
import { butceSifirla } from "./pack/butce.js";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const { yetenekAl } = await import("./pack/yetenekler/kayit.js");
const { iksirIc } = await import("./pack/yetenekler/iksirler.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, BAS);
  o.id = id; o.typeId = "minecraft:player";
  o._kafa = undefined;
  o.getComponent = (ad) => (ad === "minecraft:equippable")
    ? { getEquipment: () => undefined,
        setEquipment: (slot, esya) => { o._kafa = esya ? esya.typeId : undefined; return true; } }
    : undefined;
  _durum.oyuncular = [o];
  return { D, o };
}

function lazerAt(o, tick = 40) {
  const tanim = yetenekAl("goz_lazeri");
  sus();
  const is = tanim.olustur(o);
  if (is) {
    for (let t = 0; t < tick; t++) {
      butceSifirla();
      if (is.calis()) { is.bitir(); break; }
      tickIlerlet(1);
    }
  }
  ac();
  return is;
}

console.log("=== 1. AYAR VAR ===");
{
  kontrol("DUVAR_DELME_ACIK var", typeof ayar.DUVAR_DELME_ACIK === "boolean",
          String(ayar.DUVAR_DELME_ACIK));
  kontrol("tavan makul", ayar.DUVAR_DELME_TAVAN > 0 && ayar.DUVAR_DELME_TAVAN <= 200,
          String(ayar.DUVAR_DELME_TAVAN));
}

console.log("");
console.log("=== 2. DUVARI DELIYOR ===");
{
  const { D, o } = kur("dd1");
  D.bloklar.hepsiDolu = true;          // her yer tas
  D.boyut._varliklar = [];
  sus(); iksirIc(o, ayar.KADEMELER[0]); tickIlerlet(2); ac();

  lazerAt(o);
  const havaYapilan = D.sayac.yazilan.filter((y) => y.tip === "minecraft:air");
  kontrol("tas duvar delindi", havaYapilan.length > 0,
          havaYapilan.length + " blok");
  /* ---- v4.77: BU KONTROL YANLIS SEYI OLCUYORDU ----
     DUVAR_DELME_TAVAN bir TARAMANIN tavani, atisin TOPLAMI
     degil. Isin her vurus tickinde (yarim saniyede bir)
     listeyi sifirdan kuruyor; 25 saniyelik bir atista onlarca
     tarama oluyor. Yani toplam, tavanin kati kadar olabilir --
     ve olmali da, yoksa lazer birkac saniye sonra blok
     kirmayi birakirdi.

     Menzil 14 iken toplam tesadufen tam 140 cikiyordu ve
     kontrol geciyordu. 17'ye cikinca 171 oldu ve kirildi;
     kod dogru davraniyordu, kontrol yanlis sinirdi olcuyordu.

     Asil sinir GEOMETRIK: duz bir duvarda delik 3x3'luk bir
     tunel ve tunelin boyu menzil + iki uc. Bundan fazlasi
     "isin gormedigi yeri deldi" demek olurdu.

     Tek tickte patlamayi engelleyen sey ise tavan degil BLOK
     BUTCESI -- o da bolum 4'te ayrica sinaniyor.            */
  const r = ayar.DUVAR_DELME_YARICAP;
  const kesit = (2 * r + 1) * (2 * r + 1);          // 3x3 = 9
  const boy = ayar.LAZER_MENZIL + 2 * r;            // 17 + 2 = 19
  const geometrikTavan = kesit * boy;               // 171
  kontrol("delik isinin GEOMETRISINI asmadi",
          havaYapilan.length <= geometrikTavan,
          havaYapilan.length + " / " + geometrikTavan +
          " (" + kesit + " kesit x " + boy + " boy)");
  /* Tavanin gercekten bir isi olmali: tek taramada bu deligin
     tamami acilabiliyorsa tavan hic devreye girmiyor demektir
     ve is tick'lere yayilmiyor.                              */
  kontrol("tavan hala isliyor (tek taramada delik bitmiyor)",
          ayar.DUVAR_DELME_TAVAN < geometrikTavan,
          ayar.DUVAR_DELME_TAVAN + " < " + geometrikTavan);
  /* ---- ALT SINIR: delik gercekten SONUNA KADAR gidiyor mu ----
     Ustteki kontrol bir UST sinir; yurume mesafesi sessizce
     kisalsa (menzil 17'yken 12 adim atsa) yine gecerdi. Menzil
     buyutulen bir surumde tam olarak bunun gozden kacmasi
     lazim. Oyuncu +x yonune bakiyor; en uzak delik en az
     LAZER_MENZIL blok oteye ulasmali.                        */
  const enUzak = Math.max(...havaYapilan.map((y) => y.x));
  kontrol("delik menzilin SONUNA kadar ulasti",
          enUzak >= ayar.LAZER_MENZIL,
          "en uzak x: " + enUzak + " / menzil " + ayar.LAZER_MENZIL);

  // Delikler oyuncunun ONUNDE olmali (+x yonu)
  const arkada = havaYapilan.filter((y) => y.x < 0);
  kontrol("arkamizda delik acilmadi", arkada.length === 0, arkada.length + " tane");
}

console.log("");
console.log("=== 3. KORUNAN BLOKLARA DOKUNMUYOR ===");
{
  const { D, o } = kur("dd2");
  D.bloklar.hepsiDolu = true;
  D.boyut._varliklar = [];

  /* Isinin onune bedrock koy: silinmemeli. hepsiDolu tas
     donduruyor, bu yuzden belirli hucreleri bedrock yapiyoruz. */
  for (let d = 1; d <= 8; d++) {
    D.bloklar.set(Math.floor(BAS.x + d) + "," + Math.floor(BAS.y) + "," + Math.floor(BAS.z),
                  "minecraft:bedrock");
  }

  sus(); iksirIc(o, ayar.KADEMELER[0]); tickIlerlet(2); ac();
  lazerAt(o);

  let kalanBedrock = 0;
  for (const v of D.bloklar.values()) if (v === "minecraft:bedrock") kalanBedrock++;
  kontrol("bedrock silinmedi", kalanBedrock === 8, kalanBedrock + " / 8 duruyor");

  const bedrockYazimi = D.sayac.yazilan.filter(
    (y) => y.tip === "minecraft:air" && D.bloklar.get(y.x + "," + y.y + "," + y.z) === "minecraft:bedrock");
  kontrol("bedrock hucresine hava yazilmadi", bedrockYazimi.length === 0);
}

console.log("");
console.log("=== 4. BUTCE ASILMIYOR ===");
{
  const { D, o } = kur("dd3");
  D.bloklar.hepsiDolu = true;
  D.boyut._varliklar = [];
  sus(); iksirIc(o, ayar.KADEMELER[6]); tickIlerlet(2); ac();
  lazerAt(o, 120);

  const enFazla = Math.max(0, ...Object.values(D.sayac.tickBlok || {}));
  kontrol("tick basina butce asilmadi", enFazla <= ayar.TICK_BLOK_BUTCESI,
          enFazla + " / " + ayar.TICK_BLOK_BUTCESI);
}

console.log("");
console.log("=== 5. HAVADA BOSA CALISMIYOR ===");
{
  const { D, o } = kur("dd4");
  // Varsayilan dunya: y>=64 hava, yani onumuz bos
  D.boyut._varliklar = [];
  sus(); iksirIc(o, ayar.KADEMELER[0]); tickIlerlet(2); ac();
  lazerAt(o);

  const havaYazimi = D.sayac.yazilan.filter((y) => y.tip === "minecraft:air");
  kontrol("zaten hava olan yere yazilmadi", havaYazimi.length === 0,
          havaYazimi.length + " gereksiz yazim");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum duvar delme testleri gecti");
process.exit(hata ? 1 : 0);

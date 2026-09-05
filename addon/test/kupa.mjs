/* KUPALAR -- ASILI/KAZIKLI GANIMETLER                   v7.25.0

   Kullanicinin istegi, kendi sozleriyle:
     "hani olmus Steve'ler, kafasi asilmis seyler var ya --
      ben skinler gondersem onlari onlarla degistirebilir
      misin? Mesela ben Herobrine asiyorum, havalilik. Ben tek
      basima Null'u oldurdum, bir nevi racon gibi."

   ---- BU DOSYA NEYI TUTUYOR ----
   Kupa depodaki ILK OZEL GEOMETRILI blok (onceki alti blogun
   altisi da tam kup). O yuzden burada tutulan seylerin cogu
   "gozle bakinca anlasilmaz" cinsinden:

     1. 30x30x30 SINIRI. Bedrock blok modeli bunu asamaz.
        Ilk carmih taslagi 36 birim genisti; render'da guzel
        gorunuyordu ama oyun onu yuklemezdi. Bu madde tek
        basina o hatayi bir daha gecirmez.
     2. TABAN KUPLE KESISIM + MERKEZ. Model blogun kupuyle
        kesismeli VE x/z'de ortalanmali. Bu maddenin olcusu
        v7.34'te duzeltildi: eskiden x/z'yi de 0..16 sayiyor
        ve yarim blok kaymis modeli onayliyordu.
     3. GEOMETRI VE MATERIAL_INSTANCES IKISI BIRDEN. 1.21.80'
        den beri zorunlu; biri unutulursa blok cizilmez.
     4. HER MATERIAL_INSTANCE ADI KARSILIGINI BULMALI. Kupte
        "odun" yaziyorsa blokta "odun" tanimli olmali, ve
        blokta tanimli olan da gercekten kullanilmali.
     5. IKINCI KATMAN CIZILMELI. Kullanici "entity303 pek
        olmamis, cubbeli olmasi lazim" dedi; sebep ikinci
        katmanin hic cizilmemesiydi.
     6. BOZUK SKIN URETILMEMELI. ferguson.png gurultuyle geldi
        (komsu piksel farki 78-96, gercek cizimde en fazla 56).
        Boyle bir skin sessizce gecip gokkusagi bir kupa
        uretmemeli.
     7. UV SKIN DUZENINDE KALMALI. Kupu kuculttugumuz an kutu
        UV kayiyor; o yuzden olcek 1.0 degilse yuz yuz UV
        yazilmali. Bu madde o kurali tutuyor.
     8. RACON DIL DOSYASINDA OLMALI. Kupanin butun anlami o.
     9. MALZEME ADI KUPTE DEGIL YUZDE OLMALI. v7.36'ya kadar
        "odun"/"ip"/"zincir" kupun kendisine yaziliyordu.
        Geometri semasinda boyle bir alan YOK; oyun onu atip
        o yuzleri "*"e, yani KUPANIN SKININE dusuruyordu.
        Kullanici tablette gordu: Wyne'i tutan ip Wyne'in
        skiniydi. Bu dosya hatayi KACIRMISTI cunku o da ayni
        yanlis yerden okuyordu -- 4. madde artik yuzden
        okuyor, 9. madde de kupte kalinti kalmamasini tutuyor.
    10. TAM BOY KUPA 30 BIRIMI KULLANMALI. Sinir 30 ve kullanici
        "benden boy olarak kucuk" dedi. Sadece "30'u asmasin"
        demek yetmiyor: 0.6 olcek de asmiyordu ve kucuktu.
        Alt sinir da tutuluyor.
    11. CARMIHTA KOL OMUZDAN CIKMALI. Omuz ekseni govdenin
        icindeyken (2s) kolun dibi gomuluyor ve el 15s yerine
        14s'te kaliyordu -- "kollari asiri kucuk" bu.

   Olcum URETILEN DOSYALARDAN yapiliyor, kaynak koddan degil:
   sabit dogru olup da yazilmamis olabilir.                  */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";
const PY = readFileSync(KOK + "/kol_uret.py", "utf8");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Python yorumlari ve metinleri ayiklanmis kod. will.mjs ve
   anna.mjs'te iki kez ayni tuzaga dusuldu: yorumda gecen bir
   satir gercek kod sanildi.                                 */
const KOD = PY.replace(/"""[\s\S]*?"""/g, "").replace(/^\s*#.*$/gm, "");

/* ---- KUPALAR listesi: kimlik -> bicim ---- */
const bloklar = readdirSync(BP + "/blocks")
  .filter(f => f.startsWith("kupa_") && f.endsWith(".json"))
  .map(f => f.slice(5, -5));

console.log("== 0. uretilmis kupalar: " + bloklar.join(", "));
kontrol("en az bir kupa uretilmis", bloklar.length > 0);

/* ---- 1-2. GEOMETRI SINIRLARI ---- */
function don(p, aci, pivot) {
  let [x, y, z] = [p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]];
  const [rx, ry, rz] = aci.map(a => a * Math.PI / 180);
  let c = Math.cos(rx), s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ry); s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rz); s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x + pivot[0], y + pivot[1], z + pivot[2]];
}

/* ---- BIR KUPUN MALZEME ADI ----
   Yuz yuz UV nesnesinin icinden okunuyor. Geometri semasinda
   (geometry:1.16.0) material_instance YALNIZCA burada var;
   kup duzeyinde boyle bir alan yok ve oyun onu sessizce atiyor.
   Adsiz kup (skin kupleri) blogun "*" malzemesini aliyor.    */
function malzemeAdi(c) {
  if (!c.uv || Array.isArray(c.uv)) return null;
  for (const y of ["north", "south", "east", "west", "up", "down"]) {
    const f = c.uv[y];
    if (f && f.material_instance) return f.material_instance;
  }
  return null;
}

function sinirlar(geo) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const b of geo.bones) {
    for (const c of b.cubes || []) {
      const inf = c.inflate || 0;
      const o = c.origin.map(v => v - inf);
      const s = c.size.map(v => v + 2 * inf);
      for (const dx of [0, s[0]]) for (const dy of [0, s[1]]) for (const dz of [0, s[2]]) {
        let p = [o[0] + dx, o[1] + dy, o[2] + dz];
        if (c.rotation) p = don(p, c.rotation, c.pivot);
        for (let i = 0; i < 3; i++) {
          if (p[i] < mn[i]) mn[i] = p[i];
          if (p[i] > mx[i]) mx[i] = p[i];
        }
      }
    }
  }
  return { mn, mx, olcu: [0, 1, 2].map(i => mx[i] - mn[i]) };
}

console.log("");
console.log("== 1-4. her kupanin geometrisi ve blogu");
for (const k of bloklar) {
  const gy = RP + "/models/blocks/kupa_" + k + ".geo.json";
  const by = BP + "/blocks/kupa_" + k + ".json";
  if (!existsSync(gy)) { kontrol(k + ": geometri dosyasi var", false, gy); continue; }
  const geo = JSON.parse(readFileSync(gy, "utf8"))["minecraft:geometry"][0];
  const { mn, mx, olcu } = sinirlar(geo);

  /* 1. 30x30x30 */
  kontrol(k + ": model 30x30x30 icinde",
          olcu.every(v => v <= 30.0001),
          olcu.map(v => v.toFixed(1)).join(" x "));

  /* 2. taban kupun icinde en az 1 piksel -- VE MERKEZDE

     v7.34: burasi YANLIS OLCUYORDU, hatayi tam da bu yuzden
     kacirdi. Bedrock'ta blok modeli x/z ekseninde -8..+8
     arasina kurulur (blogun MERKEZI 0), y ise 0..16. Eski
     olcu ucunu birden 0..16 sayiyordu, yani yarim blok kaymis
     bir modele "kupte kaliyor" diyordu. Kupalar oyunda
     gorunmuyordu: parcalarin cogu komsu blogun icinde
     kaliyordu ve orada cizilmiyordu.

     Kanit uretilen dosyalarda duruyordu: selection_box
     origin'i [-8,0,-8], geometri ise [7,0,7]'den basliyordu.

     Iki ayri sey tutuluyor:
       a) model taban kuple gercekten kesisiyor mu,
       b) x/z'de ORTALANMIS mi. (a) tek basina yetmez --
          kenardan 1 piksel giren kaymis bir model de gecer. */
  const KUP_ALT = [-8, 0, -8], KUP_UST = [8, 16, 8];
  kontrol(k + ": taban kupte kaliyor",
          [0, 1, 2].every(i => mx[i] > KUP_ALT[i] + 0.0001
                            && mn[i] < KUP_UST[i] - 0.0001),
          "min " + mn.map(v => v.toFixed(1)) + " / max " + mx.map(v => v.toFixed(1)));
  const ortaXZ = [0, 2].map(i => (mn[i] + mx[i]) / 2);
  kontrol(k + ": x/z blogun merkezinde",
          ortaXZ.every(v => Math.abs(v) <= 4.0001),
          "x " + ortaXZ[0].toFixed(1) + " / z " + ortaXZ[1].toFixed(1));

  const blok = JSON.parse(readFileSync(by, "utf8"))["minecraft:block"];
  const bilesen = blok.components;

  /* 3. geometry + material_instances IKISI BIRDEN */
  kontrol(k + ": geometry ve material_instances ikisi de var",
          !!bilesen["minecraft:geometry"] && !!bilesen["minecraft:material_instances"]);
  kontrol(k + ": geometry kimligi geometriyle ayni",
          bilesen["minecraft:geometry"]?.identifier === geo.description.identifier,
          bilesen["minecraft:geometry"]?.identifier + " vs " + geo.description.identifier);

  /* 4. material_instance adlari iki yonlu esleşiyor */
  const mi = bilesen["minecraft:material_instances"] || {};
  const kullanilan = new Set();
  for (const b of geo.bones) for (const c of b.cubes || [])
    kullanilan.add(malzemeAdi(c) || "*");
  const tanimli = new Set(Object.keys(mi));
  kontrol(k + ": kupteki her malzeme adi blokta tanimli",
          [...kullanilan].every(a => tanimli.has(a)),
          [...kullanilan].filter(a => !tanimli.has(a)).join(",") || "-");
  kontrol(k + ": blokta oksuz malzeme yok",
          [...tanimli].every(a => kullanilan.has(a)),
          [...tanimli].filter(a => !kullanilan.has(a)).join(",") || "-");

  /* dokular gercekten var mi */
  const terrain = JSON.parse(readFileSync(
    RP + "/textures/terrain_texture.json", "utf8")).texture_data;
  for (const [ad, tanim] of Object.entries(mi)) {
    kontrol(k + ": '" + ad + "' dokusu terrain_texture'da",
            !!terrain[tanim.texture], tanim.texture);
    const dy = RP + "/textures/blocks/" + tanim.texture + ".png";
    kontrol(k + ": '" + ad + "' dokusu diskte", existsSync(dy), tanim.texture + ".png");
  }
}

/* ---- 5. IKINCI KATMAN ---- */
console.log("");
console.log("== 5. ikinci katman (cubbe/kukuleta) ciziliyor mu");
const UST_UV = { kafa: [32, 0], govde: [16, 32], sag_kol: [40, 32],
                 sol_kol: [48, 48], sag_bacak: [0, 32], sol_bacak: [0, 48] };
for (const k of bloklar) {
  const geo = JSON.parse(readFileSync(
    RP + "/models/blocks/kupa_" + k + ".geo.json", "utf8"))["minecraft:geometry"][0];
  const kupler = geo.bones.flatMap(b => b.cubes || []);
  /* Bir kupun UV'si kutu ([u,v]) ya da yuz yuz (sozluk).
     Ikisinde de ikinci katmanin baslangic noktasini ariyoruz. */
  const uvNokta = c => {
    if (Array.isArray(c.uv)) return c.uv;
    if (c.uv && c.uv.north) {
      /* yuz yuz UV'de north = [u+D, v+D]; D'yi kupten degil
         SKIN kutusundan cikaramayiz, o yuzden sadece dikey
         bandi karsilastiriyoruz: ikinci katman v>=32 ya da
         kafa icin u>=32. */
      return c.uv.north.uv;
    }
    return null;
  };
  const ustVar = kupler.some(c => {
    const n = uvNokta(c);
    if (!n) return false;
    return Object.values(UST_UV).some(([u, v]) =>
      n[0] >= u && n[0] < u + 32 && n[1] >= v && n[1] < v + 16 && (u >= 32 || v >= 32));
  });
  const sismeVar = kupler.some(c => (c.inflate || 0) > 0);
  kontrol(k + ": ikinci katman kupleri var", ustVar);
  kontrol(k + ": ikinci katman sisirilmis (inflate)", sismeVar);
}

/* ---- 5b. ZINCIR ELE DEGMELI ----
   Zincirli bicimde zincirin alt ucu KOLUN ICINDE bitmeli.
   Kod bunu aciyla HESAPLIYOR (elle yazmiyor), yani kol acisi
   degisince zincir pesinden gidiyor. Bu madde o bagi tutuyor:
   biri zincirin yerini sabit sayiya cevirirse burada dusar. */
console.log("");
console.log("== 5b. zincir ele degiyor mu");
for (const k of bloklar) {
  const geo = JSON.parse(readFileSync(
    RP + "/models/blocks/kupa_" + k + ".geo.json", "utf8"))["minecraft:geometry"][0];
  const kupler = geo.bones.flatMap(b => b.cubes || []);
  const zincirler = kupler.filter(c => malzemeAdi(c) === "zincir");
  if (!zincirler.length) continue;
  /* Kollar: Z EKSENINDE donmus taban kupleri. Z sarti onemli
     -- kafa da donuyor ama X ekseninde (one egik). Ilk yazilista
     bu sart yoktu ve kafa da "kol" sayiliyordu.              */
  const kollar = kupler.filter(c => !malzemeAdi(c) && c.rotation &&
                                    c.rotation[2] !== 0 && !(c.inflate > 0));
  kontrol(k + ": zincir sayisi kol sayisiyla ayni",
          zincirler.length === kollar.length,
          zincirler.length + " zincir / " + kollar.length + " kol");
  for (const z of zincirler) {
    const zx = z.origin[0] + z.size[0] / 2;
    const zy = z.origin[1];                 // zincirin ALT ucu
    /* SADECE DEGMEK YETMIYOR. Ilk surumde zincir tam elin uc
       noktasindan basliyordu ve kolun yalniz en ust kosesine
       0.09 birim degiyordu -- kullanici "yandan bakinca tam
       eli tutmuyor, arada bosluk var" dedi. Simdi GERCEK
       ORTUSME olculuyor: zincirin ucu kolun icine en az yarim
       birim girmeli.                                        */
    let enIyi = -1;
    for (const c of kollar) {
      const { mn, mx } = sinirlar({ bones: [{ cubes: [c] }] });
      if (zx < mn[0] - 0.3 || zx > mx[0] + 0.3) continue;
      const ortusme = mx[1] - zy;      // kolun tepesi - zincirin dibi
      if (ortusme > enIyi) enIyi = ortusme;
    }
    kontrol(k + ": zincir kolun icine giriyor (>= 0.5 birim)",
            enIyi >= 0.5,
            "ortusme " + (enIyi < 0 ? "kol bulunamadi" : enIyi.toFixed(2)));
  }
  /* Zincir kupleri YUZ YUZ UV kullanmali. Kutu UV'de bir yuzun
     doku dikdortgeni kupun olcusunden turuyor; 2x5.5x2 bir kup
     16x16 dokunun sadece %4'unu gosteriyor ve zincir duz gri
     bir cubuk gibi cikiyor. Tam da bu yasandi.              */
  for (const z of zincirler) {
    const yuzUv = z.uv && !Array.isArray(z.uv) && z.uv.north;
    kontrol(k + ": zincir dokunun tamamini seriyor",
            !!yuzUv && yuzUv.uv_size &&
            yuzUv.uv_size[0] === 16 && yuzUv.uv_size[1] === 16,
            yuzUv ? JSON.stringify(yuzUv) : "kutu UV");
  }
  /* Zincir dokusunda SAYDAM piksel var (halkalarin arasi), o
     yuzden malzeme opaque olamaz.                           */
  {
    const blok = JSON.parse(readFileSync(
      BP + "/blocks/kupa_" + k + ".json", "utf8"))["minecraft:block"];
    const mi = blok.components["minecraft:material_instances"].zincir;
    kontrol(k + ": zincir alpha_test ile ciziliyor",
            mi && mi.render_method === "alpha_test",
            mi ? mi.render_method : "yok");
  }
}

/* ---- 5c. KAFA ONE EGIK ----
   Kullanici: "Dream'in basi da one dogru egik olsun, son
   aninda bana basini egmis gibi." Egimin YONU da tutuluyor:
   kafanin on-ust kosesi donusten SONRA, donmemis haline gore
   ONE (kucuk z) gitmeli. Isaret bir kez ters yazildi.        */
console.log("");
console.log("== 5c. kafa one egik mi");
for (const k of bloklar) {
  const geo = JSON.parse(readFileSync(
    RP + "/models/blocks/kupa_" + k + ".geo.json", "utf8"))["minecraft:geometry"][0];
  const kupler = geo.bones.flatMap(b => b.cubes || []);
  /* Kafa: 8x8x8 olceklenmis kup, yani en/boy/derinlik esit. */
  const kafalar = kupler.filter(c => !malzemeAdi(c) &&
    Math.abs(c.size[0] - c.size[1]) < 1e-6 &&
    Math.abs(c.size[1] - c.size[2]) < 1e-6 &&
    !(c.inflate > 0));
  const egik = kafalar.filter(c => c.rotation && c.rotation[0] !== 0);
  /* ZINCIRLI bicimde egik kafa ZORUNLU -- kullanici acikca
     istedi ("son aninda bana basini egmis gibi"). Bicimi
     zincir malzemesinden taniyoruz.

     Ilk yazilista burada kosulsuz "continue" vardi: egim
     silinince test hicbir sey demeden atliyordu ve mutasyon
     KACIYORDU. Sessiz atlama, gecen test kadar tehlikeli. */
  const zincirli = kupler.some(c => malzemeAdi(c) === "zincir");
  if (zincirli) {
    kontrol(k + ": zincirli bicimde kafa EGIK olmali",
            egik.length > 0, egik.length + " egik kafa kupu");
  }
  if (egik.length === 0) continue;      // oteki bicimlerde egim yok
  for (const c of egik) {
    const onUst = [c.origin[0] + c.size[0] / 2,
                   c.origin[1] + c.size[1],
                   c.origin[2]];
    const donmus = don(onUst, c.rotation, c.pivot);
    kontrol(k + ": kafa ONE egik (arkaya degil)",
            donmus[2] < onUst[2] - 0.5,
            "on-ust kose z: " + onUst[2].toFixed(2) + " -> " + donmus[2].toFixed(2));
  }
}

/* ---- 6. BOZUK SKIN GUVENCESI ---- */
console.log("");
console.log("== 6. bozuk skin uretilmiyor");
kontrol("komsu farki esigi tanimli", /KUPA_GURULTU_ESIGI\s*=\s*[\d.]+/.test(KOD));
kontrol("palet esigi tanimli", /KUPA_PALET_ESIGI\s*=\s*[\d.]+/.test(KOD));
/* IKI KOSUL BIRDEN aranmali. Tek basina her ikisi de yanlis
   sonuc verdi: komsu farki dream.png'yi (uc saf renk, sert
   kenar) gurultu sandi; renk orani earl.png'nin yumusak
   gecisini gurultu sandi.                                  */
kontrol("gurultu IKI kosula birden bagli",
        /fark > KUPA_GURULTU_ESIGI[\s\S]{0,80}?oran > KUPA_PALET_ESIGI/.test(KOD));
kontrol("komsu piksel farki olculuyor", /_kupa_gurultulu_mu\s*\(/.test(KOD));

/* ---- SINIFLANDIRICI GERCEKTEN CALISTIRILIYOR ----
   Yukaridaki maddeler kodun SEKLINE bakiyor; bu madde
   HUKMUNE bakiyor. Depodaki bes skinin dordu temiz, biri
   (ferguson) bozuk -- siniflandirici bunu boyle demezse
   esikler kaymis demektir.                                 */
{
  const bekle = { dream: false, earl: false, entity303: false,
                  wyne: false, ferguson: true };
  const betik = `
import sys
sys.path.insert(0, ${JSON.stringify(KOK)})
sys.argv = ["kol_uret"]
import importlib.util
spec = importlib.util.spec_from_file_location("ku", ${JSON.stringify(KOK + "/kol_uret.py")})
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
from PIL import Image
import os
for ad in sorted(bekle_listesi):
    yol = os.path.join(${JSON.stringify(KOK)}, "kupa_skinleri", ad + ".png")
    if not os.path.exists(yol):
        print(ad, "YOK"); continue
    px = Image.open(yol).convert("RGBA").load()
    bozuk = False
    for kutu, (uv, olcu) in m.SKIN_KUTULARI.items():
        for yon, (x, y, en, boy) in m._kupa_yuz_dikdortgenleri(uv, olcu).items():
            if m._kupa_gurultulu_mu(px, x, y, en, boy)[0]:
                bozuk = True
    print(ad, "BOZUK" if bozuk else "TEMIZ")
`;
  const tam = "bekle_listesi = " + JSON.stringify(Object.keys(bekle)) + "\n" + betik;
  let cikti = "";
  try {
    cikti = execFileSync("python3", ["-c", tam], { encoding: "utf8" });
  } catch (e) {
    cikti = "(python3 calismadi: " + (e.message || "") + ")";
  }
  if (cikti.includes("calismadi") || cikti.includes("ModuleNotFound")) {
    console.log("  - python3/PIL yok, siniflandirici denemesi atlandi");
  } else {
    for (const [ad, bozukBekleniyor] of Object.entries(bekle)) {
      const satir = cikti.split("\n").find(l => l.startsWith(ad + " "));
      if (!satir) { kontrol(ad + ": siniflandirici sonucu var", false); continue; }
      if (satir.endsWith("YOK")) { console.log("  - " + ad + ": skin dosyasi yok"); continue; }
      kontrol(ad + ": siniflandirici " + (bozukBekleniyor ? "BOZUK" : "TEMIZ") + " demeli",
              satir.endsWith(bozukBekleniyor ? "BOZUK" : "TEMIZ"), satir.trim());
    }
  }
}
kontrol("bozuk skinde kupa URETILMIYOR (continue)",
        /_bozuk[\s\S]{0,400}?continue/.test(KOD));
kontrol("bozuk skinde artik dosyalar siliniyor",
        /_bozuk[\s\S]{0,400}?os\.remove/.test(KOD));
/* KUPALAR listesinde olup uretilmeyen varsa bunun SEBEBI
   ekrana yaziliyor olmali -- sessiz atlama yasak. */
kontrol("uretilmeyen kupa icin UYARI basiliyor",
        /print\("UYARI: %s kupasi URETILMEDI/.test(PY));

/* ---- 7. OLCEK VE UV ---- */
console.log("");
console.log("== 7. olcek 1.0 degilse yuz yuz UV");
kontrol("_kupa_kup olcege gore UV secmiyor mu diye bakiliyor",
        /if olcek == 1\.0:[\s\S]{0,120}?kup\["uv"\] = \[u, v\][\s\S]{0,120}?else:[\s\S]{0,120}?_kupa_yuz_uv/.test(KOD));
for (const k of bloklar) {
  const geo = JSON.parse(readFileSync(
    RP + "/models/blocks/kupa_" + k + ".geo.json", "utf8"))["minecraft:geometry"][0];
  let kotu = [];
  for (const b of geo.bones) for (const c of b.cubes || []) {
    if (malzemeAdi(c)) continue;                // odun/ip: skin degil
    /* skin kupu: olculeri tam sayi degilse UV yuz yuz olmali */
    const tam = c.size.every(v => Math.abs(v - Math.round(v)) < 1e-9);
    if (!tam && Array.isArray(c.uv)) kotu.push(c.size.join("x"));
  }
  kontrol(k + ": kesirli olculu kupte kutu UV yok", kotu.length === 0, kotu.join(" "));
}

/* ---- 9. MALZEME ADI KUPTE DEGIL YUZDE ----
   BU MADDE BIR HATANIN UZERINE YAZILDI (v7.37).

   Uretici malzeme adini kupun kendisine yaziyordu:
     {"origin": .., "size": .., "material_instance": "odun"}
   geometry:1.16.0 semasinda kup duzeyinde boyle bir alan YOK;
   material_instance yalnizca yuz nesnesinin icinde tanimli.
   Oyun bilmedigi alani sessizce atiyor ve o yuzler blogun
   "*" malzemesine dusuyor -- kupalarda "*" SKININ KENDISI.

   Sonuc oyunda: Wyne'i tutan ip ve daragaci Wyne'in skini,
   Earl'un kazigi Earl'un skini, Entity303'un haci onun skini.
   Kullanici tabletten ekran goruntusuyle gonderdi.

   Uc sey birden tutuluyor, cunku hatanin uc ayri yolu var:
     a) kupte kalinti material_instance -- sessizce atilir
     b) yuzlerin BIR KISMINDA ad var -- adsiz yuz skine duser,
        yani direk yarim odun yarim skin gorunur
     c) kutu UV -- 3x29x3 direkte doku dikdortgeni 16x16'nin
        disina, doku atlasinda KOMSU dokularin uzerine tasar  */
console.log("");
console.log("== 9. malzeme adi yuzde mi (kupte kalinti var mi)");
const YUZLER = ["north", "south", "east", "west", "up", "down"];
for (const k of bloklar) {
  const geo = JSON.parse(readFileSync(
    RP + "/models/blocks/kupa_" + k + ".geo.json", "utf8"))["minecraft:geometry"][0];
  const kupler = geo.bones.flatMap(b => b.cubes || []);

  const kupte = kupler.filter(c => c.material_instance !== undefined);
  kontrol(k + ": kup duzeyinde material_instance YOK",
          kupte.length === 0,
          kupte.length + " kupte kalinti (oyun bunu atar, yuz skine duser)");

  const adli = kupler.filter(c => malzemeAdi(c));
  kontrol(k + ": adli malzeme kupu var (odun/ip/zincir)", adli.length > 0,
          adli.length + " kup");
  for (const c of adli) {
    const ad = malzemeAdi(c);
    const eksik = YUZLER.filter(y => !c.uv[y] || c.uv[y].material_instance !== ad);
    kontrol(k + ": '" + ad + "' kupunun ALTI yuzunde de ad var",
            eksik.length === 0, eksik.join(",") || "-");
    const tam = YUZLER.every(y => c.uv[y] && c.uv[y].uv_size &&
                                  c.uv[y].uv_size[0] === 16 &&
                                  c.uv[y].uv_size[1] === 16);
    kontrol(k + ": '" + ad + "' dokunun tamamini seriyor", tam,
            c.size.join("x"));
  }
}

/* ---- 10. TAM BOY KUPA 30 BIRIMLIK PAYI KULLANMALI ----
   Kullanici: "entity303 benden boy olarak kucuk."  Hakliydi ve
   1. madde bunu YAKALAYAMAZDI: o sadece ust siniri tutuyor,
   0.6 olcekli bir kupa da 30'u asmaz.

   ---- ILK YAZILISTA OLCU YANLISTI ----
   Once "modelin toplam Y uzunlugu >= 28.5" yazildi ve Dream
   28.18 ile dustu. Kodda hata yoktu: zincirli bicimde yere
   inen bir direk YOK (kiris yalniz tepede), ayaklar da 1.5
   birim bosta -- yani modelin UZUNLUGU tepesinin nerede
   oldugunu hic soylemiyor. Bu depodaki "kusur olcumde, kodda
   degil" hatasinin bir ornegi daha.

   Dogru olcu IKI parca:
     a) MODELIN TEPESI 29-30 arasinda olmali. Sinir 30; bicim
        payini kullanmiyorsa (direk kisaltilmis, olcek
        dusurulmus) buradan dusuyor.
     b) KAFANIN TEPESI modelin tepesine 6 birimden yakin
        olmali. Tek basina (a) yetmez: direk 29.5'te durup
        govde kuculse (v7.36'daki hal) (a) yine gecerdi.
        6 birim, bicimlerin govde ustunde gercekten ihtiyac
        duydugu en buyuk paydan (daragaci: kol 2.5 + ip 2)
        biraz genis. Olculen aralik: carmih 1.06, daragaci
        4.10, zincirli 4.60.

   Kazik (Earl) haric: orada kafa var, govde yok -- 8 birimlik
   bir kafayi 30'a cikarmanin anlami olmaz. Ayrim skin
   kuplerinin sayisindan: tam govde 12 kup (6 parca x 2 katman),
   kazik 2.                                                   */
console.log("");
console.log("== 10. tam boy kupa 30 birimlik payi kullaniyor mu");
for (const k of bloklar) {
  const geo = JSON.parse(readFileSync(
    RP + "/models/blocks/kupa_" + k + ".geo.json", "utf8"))["minecraft:geometry"][0];
  const kupler = geo.bones.flatMap(b => b.cubes || []);
  const skinKup = kupler.filter(c => !malzemeAdi(c));
  if (skinKup.length < 12) {
    console.log("  - " + k + ": tam govde degil (" + skinKup.length +
                " skin kupu), boy sarti yok");
    continue;
  }
  const tepe = sinirlar(geo).mx[1];
  const kafaTepe = sinirlar({ bones: [{ cubes: skinKup }] }).mx[1];
  kontrol(k + ": modelin tepesi 29-30 arasinda",
          tepe >= 29.0 && tepe <= 30.0001, tepe.toFixed(2) + " birim");
  kontrol(k + ": govde tepeye yakin (bosa giden pay < 6)",
          tepe - kafaTepe < 6.0,
          "kafa " + kafaTepe.toFixed(2) + ", tepe " + tepe.toFixed(2) +
          ", pay " + (tepe - kafaTepe).toFixed(2));
}

/* ---- 11. CARMIHTA KOL OMUZDAN CIKIYOR MU ----
   Kullanici: "kollari da asiri kucuk."  Sebep olculdu: omuz
   donus ekseni ORTA_X ± 2s'teydi, yani GOVDENIN ICINDE
   (govde ±4s). Vanilla oyuncu modelinde eksen ±5s ve kol
   ±90 donunce el ±15s'e gidiyor. Eskisinde el 14s'te
   kaliyordu VE kolun ic 2s'lik parcasi govdenin icinde
   gomuluydu; goz sadece disarida kalan parcayi kol saniyordu.

   Olcu URETILEN GEOMETRIDEN: olcek kafa kupunun boyundan
   cikariliyor (kafa 8 birim), elin yeri de donmus kolun
   sinirlarindan. Sabit sayi karsilastirilmiyor, ORAN
   karsilastiriliyor -- olcek degisirse madde yine gecerli.  */
console.log("");
console.log("== 11. carmihta kol omuzdan cikiyor mu (el 15s'te)");
for (const k of bloklar) {
  const geo = JSON.parse(readFileSync(
    RP + "/models/blocks/kupa_" + k + ".geo.json", "utf8"))["minecraft:geometry"][0];
  const kupler = geo.bones.flatMap(b => b.cubes || []);
  /* Yatay kol: TAM ±90 donmus, sismemis skin kupu. Zincirli
     bicimdeki kollar 140 derece donuyor, oraya karismasin. */
  const yatay = kupler.filter(c => !malzemeAdi(c) && c.rotation &&
                                   Math.abs(Math.abs(c.rotation[2]) - 90) < 1e-6 &&
                                   !(c.inflate > 0));
  if (!yatay.length) continue;
  const kafa = kupler.find(c => !malzemeAdi(c) && !(c.inflate > 0) &&
    Math.abs(c.size[0] - c.size[1]) < 1e-6 && Math.abs(c.size[1] - c.size[2]) < 1e-6);
  if (!kafa) { kontrol(k + ": olcek icin kafa kupu bulundu", false); continue; }
  const s = kafa.size[0] / 8;
  for (const c of yatay) {
    const { mn, mx } = sinirlar({ bones: [{ cubes: [c] }] });
    const uzak = Math.max(Math.abs(mn[0]), Math.abs(mx[0]));
    kontrol(k + ": el govde merkezinden 15s uzakta",
            uzak >= 15 * s - 0.01,
            "el " + (uzak / s).toFixed(2) + "s (vanilla 15s), olcek " + s.toFixed(3));
  }
}

/* ---- 8. RACON ---- */
console.log("");
console.log("== 8. racon dil dosyasinda");
for (const dil of ["tr_TR", "en_US"]) {
  const lang = readFileSync(RP + "/texts/" + dil + ".lang", "utf8");
  /* Butun dosyada anahtarsiz satir olmamali. Bu madde tek
     basina yukaridaki hatayi yakalar: \n yazan bir deger
     dosyada mutlaka '=' icermeyen bir satir birakir.       */
  const oksuz = lang.split("\n")
    .filter(s2 => s2.trim() && !s2.startsWith("#") && !s2.includes("="));
  kontrol(dil + ": anahtarsiz satir yok", oksuz.length === 0,
          oksuz.slice(0, 2).join(" | "));
  for (const k of bloklar) {
    const satir = lang.split("\n").find(s => s.startsWith("tile.pa:kupa_" + k + ".name="));
    kontrol(dil + " " + k + ": dil kaydi var", !!satir);
    if (satir) {
      const deger = satir.slice(satir.indexOf("=") + 1);
      /* Racon ADIN AYNI SATIRINDA olmali. .lang'da satir sonu
         degeri bitiriyor; alt satira yazilan racon anahtarsiz
         oksuz bir satir olur ve oyun onu hic okumaz. Bu tam
         olarak v7.25'te bir kez yapildi.                    */
      kontrol(dil + " " + k + ": racon adla ayni satirda",
              deger.includes("§8·") &&
              deger.split("§8·")[1].replace(/§./g, "").trim().length > 5,
              deger.slice(0, 70));
    }
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> kupalar yerinde");
process.exit(hata ? 1 : 0);

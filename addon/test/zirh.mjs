/* ZIRH YUKSELTMESI (Ionstrike / Max Steel)              v4.91

   Kullanici: "bu modda alinabilir olan seylerini alacagiz ve
   ZIRH olarak takilabilir sekilde ayarlayacagiz, adi zirh
   yukseltmesi olsun."

   ---- BU DOSYANIN EN ONEMLI BOLUMU: 6. ----
   Sayilarin MODUN KENDI JSON'undan geldigini sinliyor. Referans
   mod (`ionstrike`) Palladium eklentisi ve `lowcodefml`, yani
   derlenmis sinif yok -- her sey JSON. Dolayisiyla "hafizadan
   yazdim" ihtimali test edilebilir bir seye donusuyor: jar
   diskteyse sayilar ONUNLA karsilastiriliyor.

   Kullanicinin kurali: "bir seyden emin degilsen tahmin etme."  */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync, readdirSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";
const OMP = KOK + "/Simsek_Oyuncu_Modeli";
const JAR = "/tmp/claude-0/-home-user-kanal-sitesi/" +
  "e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11/scratchpad/yenijar";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const zirh = await import("./pack/yetenekler/zirh.js");
const agac = await import("./pack/yetenekler/zirh_agac.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

const BAS = { x: 0.5, y: 90.6, z: 0.5 };
function kur() {
  /* v5.9: agac defteri modul duzeyinde ve oyuncu kimligi her
     bolumde ayni ("z1"). Sifirlanmazsa bir bolumde acilan mod
     digerine SIZIYOR -- "kilitliyken guc vermiyor" sinamasi
     bu yuzden yanlis yanmisti.                             */
  const D = dunyaKur();
  /* Defter DUNYA dinamik ozelliginde duruyor ve sahte dunyada
     _durum.ozellikler bolumler arasi YASIYOR. Yalniz modulu
     unutmak yetmedi -- yeniden okuyup ayni defteri buluyordu.
     Kayit da siliniyor.                                     */
  try { _durum.ozellikler.delete(ayar.ZIRH_AGAC_ANAHTAR); } catch (e) {}
  agac.zirhAgacUnut();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = "z1"; o.typeId = "minecraft:player";
  /* Sahte dunyanin oyuncusunda zirh yuvasi yok; ekliyoruz.
     Gercek API'de equippable.getEquipment tam boyle davraniyor. */
  /* Zirh yuvalari BOS: giyilebilir takim v4.95'te kaldirildi.
     Yuva taklidi yine de duruyor -- elindekiCekirdek el
     yuvalarini bu bilesenden okuyor.                        */
  const yuvalar = {};
  /* v5.9: ENVANTER taklidi. Agac cekirdegi envanterden
     HARCIYOR (kaynakta da palladium:item_buyable oyle
     yapiyor), o yuzden elindeki cekirdek envanterde de
     gorunmeli.                                             */
  o._envanter = [];
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:inventory") {
      return {
        container: {
          get size() { return Math.max(9, o._envanter.length); },
          getItem: (i) => {
            if (i === 0 && o._elde) return { typeId: o._elde, amount: 1 };
            return o._envanter[i];
          },
          setItem: (i, y2) => {
            if (i === 0 && o._elde) { o._elde = undefined; return; }
            o._envanter[i] = y2;
          }
        }
      };
    }
    if (ad === "minecraft:equippable") {
      return {
        /* EL YUVALARI DA taklit ediliyor (v4.94): mod cekirdegi
           elde tutuluyor. Yalniz zirh yuvalarini donduren eski
           iskelet "cekirdegi goremiyorum" diye yanlis alarm
           veriyordu -- hata kodda degil TESTTEYDI.            */
        getEquipment: (y) => {
          if (y === "Mainhand") return o._elde ? { typeId: o._elde } : undefined;
          if (y === "Offhand") return o._yanEl ? { typeId: o._yanEl } : undefined;
          return yuvalar[y] ? { typeId: yuvalar[y] } : undefined;
        },
        setEquipment: () => true
      };
    }
    return eskiGet(ad);
  };
  o._yuvalarZirh = yuvalar;
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  D.boyut._efektler = [];
  zirh.zirhUnut();
  _durum.ozellikler.delete("simsek:zirh");
  return { D, o };
}
/* ---- v4.95: GIYILEBILIR TAKIM KALDIRILDI ----
   Bolum 1-5 dort giyilebilir parcayi sinliyordu (esyalari,
   attachable'lari, "tam takim var mi", "yarim takim mod
   vermiyor", "menuden mod secimi").

   Kullanici hepsini kaldirdi: "temel zirha ihtiyac kalmadi...
   onu kaldir, ama cekirdek kismini, temel zirhi, ekle" ve
   "menuden o modlara gerek kalmadi, yani secebiliyorduk ya."

   Yerine gelen sinama: TAKIM GERCEKTEN GITTI MI (asagida) ve
   CEKIRDEK TEK KAYNAK MI (8. bolum). Eski bolumleri silmek
   yerine yerlerine "gitti mi" sorusunu koymak onemli: bir
   sonraki uretimde parcalar sessizce geri gelirse fark
   edilsin.                                                  */

console.log("=== 1. GIYILEBILIR TAKIM GERCEKTEN KALKTI ===");
{
  const ESKI = ["zirh_bas", "zirh_govde", "zirh_bacak", "zirh_ayak"];
  for (const ad of ESKI) {
    kontrol(ad + ": esyasi ARTIK YOK",
            !existsSync(BP + "/items/" + ad + ".json"));
    kontrol(ad + ": attachable'i ARTIK YOK",
            !existsSync(RP + "/attachables/" + ad + ".json"));
  }
  kontrol("ZIRH_PARCALAR ayari kaldirildi",
          ayar.ZIRH_PARCALAR === undefined);
  kontrol("ZIRH_KORUMA ayari kaldirildi",
          ayar.ZIRH_KORUMA === undefined);
  kontrol("ZIRH_TAM_TAKIM_SART ayari kaldirildi",
          ayar.ZIRH_TAM_TAKIM_SART === undefined);
  kontrol("takimVarMi() kaldirildi", typeof zirh.takimVarMi === "undefined");
  kontrol("takimParcalari() kaldirildi",
          typeof zirh.takimParcalari === "undefined");

  /* Uretecte de kalmamali: liste bos olmali, yoksa bir sonraki
     uretim dosyalari geri koyar.                             */
  const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
  kontrol("uretecteki ZIRH listesi bos", /^ZIRH = \[\]$/m.test(uretec));
}

console.log("");
console.log("=== 2. DOKUZ CEKIRDEK DURUYOR (Temel dahil) ===");
{
  /* Kullanicinin son cumlesi: "cekirdek kismini, temel zirhi,
     EKLE." Yani Temel modu kaldirilmadi, sadece giyilebilir
     takim kalkti. Bu ayrim kolayca kaybolur -- sinaniyor.   */
  kontrol("mod sayisi 9",
          ayar.ZIRH_MODLAR.size === 9,
          ayar.ZIRH_MODLAR.size + " mod");
  kontrol("Temel modu duruyor", ayar.ZIRH_MODLAR.has("temel"));
  for (const anahtar of ayar.ZIRH_MODLAR.keys()) {
    const ad = "zirh_mod_" + anahtar;
    kontrol(ad + ": cekirdek esyasi diskte",
            existsSync(BP + "/items/" + ad + ".json"));
    /* Cekirdek modeli OYUNCU MODELI paketinde: donusum
       oyuncunun kendi modelini degistiriyor, bir attachable
       degil (v4.90 makinesi).                              */
    kontrol(ad + ": modeli diskte",
            existsSync(OMP + "/models/entity/" + ad + ".geo.json"));
    kontrol(ad + ": dokusu diskte",
            existsSync(OMP + "/textures/entity/" + ad + ".png"));
  }
}

console.log("");
console.log("=== 3. CEKIRDEK ELDEYKEN MOD ETKILERI GELIYOR ===");
{
  /* Temel agacin KOKU: kaynakta base_mode satin alinacak bir
     dugum degil, agacin kendisi. Bizde de bastan acik --
     asagida ayrica sinaniyor.                              */
  agac.zirhAgacUnut();
  const { D, o } = kur();
  o._elde = "pa:zirh_mod_temel";
  tickIlerlet(2);
  const gelen = (D.boyut._efektler || []).map((e) => e.ad);
  for (const [ad] of ayar.ZIRH_MODLAR.get("temel").efektler) {
    kontrol("temel: " + ad + " verildi", gelen.includes(ad));
  }
  /* Dokuz efekt birden acikken oyuncu yuruyen bir parcacik
     bulutuna donuyordu.                                       */
  const hepsi = D.boyut._efektler || [];
  kontrol("parcaciklar kapali",
          hepsi.every((e) => e.o && e.o.showParticles === false));
  /* Sure tazelemeden UZUN olmali, yoksa iki tarama arasinda
     efekt soner ve oyuncu bir an "cikmis" gorunur.           */
  kontrol("efekt suresi taramadan uzun",
          ayar.ZIRH_SURE > ayar.ZIRH_TARAMA,
          ayar.ZIRH_SURE + " > " + ayar.ZIRH_TARAMA);
}

console.log("");
console.log("=== 4. CEKIRDEK YOKSA GUC DE YOK ===");
{
  /* v4.94'te tam takim giyip cekirdek tutmayan da guc
     aliyordu. Takim gidince o yol kapandi: eli bos olan
     hicbir sey almamali.                                    */
  const { D, o } = kur();
  tickIlerlet(3);
  kontrol("eli bosken hicbir mod efekti yok",
          (D.boyut._efektler || []).length === 0,
          (D.boyut._efektler || []).length + " efekt");
}
{
  /* Cekirdek OLMAYAN bir esya tutmak da yetmemeli. */
  const { D, o } = kur();
  o._elde = "pa:kol_toprak";
  tickIlerlet(3);
  kontrol("baska esya cekirdek sayilmiyor",
          (D.boyut._efektler || []).length === 0 &&
          zirh.elindekiCekirdek(o) === undefined);
}

console.log("");
console.log("=== 5. MENU LISTESI BILGI VERIYOR, SECIM YAPMIYOR ===");
{
  const { D, o } = kur();
  o._elde = "pa:zirh_mod_titan";

  D.boyut._efektler = [];
  /* v5.9: agac kapisi -- once modu ac (cekirdek harcanir),
     yoksa kilitli mod guc vermez. */
  agac.modAc(o, "titan");
  /* Cekirdek HARCANDI (kaynakta da oyle); mod artik secili
     olmali, elde tutulmuyor.                               */
  agac.modSec(o, "titan");
  tickIlerlet(2);
  const gelen = (D.boyut._efektler || []).map((e) => e.ad);
  for (const [ad] of ayar.ZIRH_MODLAR.get("titan").efektler) {
    kontrol("titan: " + ad + " verildi", gelen.includes(ad));
  }

  const liste = zirh.modListesi(o);
  kontrol("menu listesi butun modlari sayiyor",
          liste.length === ayar.ZIRH_MODLAR.size, liste.length + " mod");
  /* v5.9: cekirdek HARCANDIGI icin artik elde degil. Modu
     belirleyen sey SECIM (kaynaktaki mode_select). Isaretin
     yerine secimi siniyoruz.                               */
  kontrol("secili mod titan", agac.secilenMod(o.id) === "titan",
          String(agac.secilenMod(o.id)));
  o._elde = "pa:zirh_mod_titan";
  const liste2 = zirh.modListesi(o);
  kontrol("elde tutulan mod yine isaretleniyor",
          liste2.filter((m) => m.elinde).length === 1 &&
          liste2.find((m) => m.elinde).anahtar === "titan");
  o._elde = undefined;
  kontrol("'secili' alani KALKTI (secim yok)",
          liste.every((m) => m.secili === undefined));
  kontrol("her satir cekirdek esyasini soyluyor",
          liste.every((m) => m.esya === ayar.ZIRH_CEKIRDEK_ONEK + m.anahtar));
  kontrol("her modun ozeti var", liste.every((m) => m.ozet && m.ozet.length > 5));

  /* Secim kalici DEGIL: dunyaya hicbir sey yazilmamali.     */
  kontrol("dunyaya mod secimi yazilmiyor",
          _durum.ozellikler.get("simsek:zirh") === undefined,
          String(_durum.ozellikler.get("simsek:zirh")));
}

console.log("");
console.log("=== 6. SAYILAR MODUN KENDI JSON'UNDAN ===");
{
  /* Referans `lowcodefml` -- derlenmis sinif yok, her sey JSON.
     Yani "hafizadan yazdim" ihtimali sinanabilir.             */
  if (!existsSync(JAR + "/data/ionstrike/palladium/powers/base_mode.json")) {
    console.log("  · jar diskte degil, karsilastirma atlandi");
  } else {
    const guc = (dosya) => {
      const d = oku(JAR + "/data/ionstrike/palladium/powers/" + dosya + ".json");
      const c = {};
      for (const v of Object.values(d.abilities || {})) {
        if ((v.type || "").split(":").pop() !== "attribute_modifier") continue;
        const a = String(v.attribute).split(":").pop();
        c[a] = Math.max(c[a] || 0, v.amount);
      }
      return c;
    };
    const temel = guc("base_mode");
    kontrol("base_mode gercekten armor +20",
            temel["generic.armor"] === 20, String(temel["generic.armor"]));
    /* v4.95: takim kaldirildi, karsilastirilacak "zirh puani"
       kalmadi. Kaynagin +20'si artik DIRENC olarak veriliyor;
       o esleme 6b bolumunde sinaniyor.                       */

    const kuvvet = guc("strength_mode");
    kontrol("strength_mode gercekten attack_damage +15",
            kuvvet["generic.attack_damage"] === 15,
            String(kuvvet["generic.attack_damage"]));
    /* Guc I = +3 hasar; kaynaktaki +15 -> Guc V (amplifier 4).
       v5.6'DA IKIYE KATLANDI: kullanicinin karari ("temel
       gelen ozellikler fazla guclu olursa diger zirhlarin
       gucunu iki kat daha arttir"). Sinama artik BIREBIRLIK
       degil TAM IKI KAT ariyor -- yani yanlislikla degisirse
       yine yakalanir.                                        */
    const bizimGuc = ayar.ZIRH_MODLAR.get("guc").efektler
      .find((e) => e[0] === "strength");
    kontrol("Guc modumuz kaynagin TAM IKI KATI hasar veriyor",
            bizimGuc &&
            (bizimGuc[2] + 1) * 3 === 2 * kuvvet["generic.attack_damage"],
            bizimGuc && "Guc " + (bizimGuc[2] + 1) + " = +" +
            ((bizimGuc[2] + 1) * 3) + " (kaynak +" +
            kuvvet["generic.attack_damage"] + ")");

    const titan = guc("titan_mode");
    kontrol("titan_mode gercekten attack_damage +80",
            titan["generic.attack_damage"] === 80,
            String(titan["generic.attack_damage"]));
    const bizimTitan = ayar.ZIRH_MODLAR.get("titan").efektler
      .find((e) => e[0] === "strength");
    kontrol("Titan modumuz kaynagin iki katina en yakin seviyede",
            bizimTitan && Math.abs((bizimTitan[2] + 1) * 3 - 160) <= 2,
            bizimTitan && "Guc " + (bizimTitan[2] + 1) + " = +" +
            ((bizimTitan[2] + 1) * 3) + " (hedef +160)");

    /* Her modun kaynagi modun icinde GERCEKTEN olmali:
       uydurma bir mod adi kalmasin.                           */
    for (const [anahtar, t] of ayar.ZIRH_MODLAR) {
      kontrol(anahtar + ": kaynagi modda var (" + t.kaynak + ")",
              existsSync(JAR + "/data/ionstrike/palladium/powers/" +
                         t.kaynak + ".json"));
    }
  }

  /* Motor siniri: Bedrock efekt seviyesi 0..255. */
  for (const [anahtar, t] of ayar.ZIRH_MODLAR) {
    kontrol(anahtar + ": seviyeler motor sinirinda",
            t.efektler.every((e) => e[2] >= 0 && e[2] <= 255));
  }
  /* Direnc V = %100 bagisiklik. Hicbir mod olumsuz yapmamali. */
  for (const [anahtar, t] of ayar.ZIRH_MODLAR) {
    const dir = t.efektler.find((e) => e[0] === "resistance");
    kontrol(anahtar + ": Direnc olumsuzluk vermiyor (< V)",
            !dir || dir[2] <= 3, dir ? "Direnc " + (dir[2] + 1) : "yok");
  }
}

console.log("");
console.log("=== 6b. VAAT EDILEN = VERILEN (v4.95) ===");
{
  /* Kullanici: "cekirdek diye adlandirdigimiz seyler vaat
     ettikleri seyleri bence vermiyorlar."

     Bu bolum tam olarak o soruyu soruyor: ozette YAZAN sey
     efekt tablosunda VAR MI. Eskiden ozetler Palladium
     ozellik adlarinin kopyasiydi ("armor +20") ve oyuncunun
     eline gecenle ilgisi yoktu.                             */

  /* --- 1. Kaynakta zirh vaat eden her mod GERCEKTEN direncli mi ---
     Bedrock zirh formulu (tokluk 15, 10 hasarlik vurus):
       zirh 20 -> %73 indirim,  zirh >= 25 -> %80 (tavan)
     Direnc seviye basina %20. Yani zirh 20+ vaat eden bir mod
     en az Direnc III (amp 2, %60) vermeli; Direnc I (%20) o
     vaadin ucte biri bile degil -- eski hata buydu.          */
  if (!existsSync(JAR + "/data/ionstrike/palladium/powers/base_mode.json")) {
    console.log("  · jar diskte degil, kaynak karsilastirmasi atlandi");
  } else {
    for (const [anahtar2, t] of ayar.ZIRH_MODLAR) {
      const d = oku(JAR + "/data/ionstrike/palladium/powers/" + t.kaynak + ".json");
      let zirhVaadi = 0;
      for (const v of Object.values(d.abilities || {})) {
        if ((v.type || "").split(":").pop() !== "attribute_modifier") continue;
        if (String(v.attribute).split(":").pop() !== "generic.armor") continue;
        zirhVaadi = Math.max(zirhVaadi, v.amount);
      }
      if (zirhVaadi < 20) continue;
      const dir = t.efektler.find((e) => e[0] === "resistance");
      kontrol(anahtar2 + ": kaynakta zirh +" + zirhVaadi +
              " -> en az Direnc III veriyor",
              !!dir && dir[2] >= 2,
              dir ? "Direnc " + (dir[2] + 1) : "DIRENC YOK");
    }
    /* v5.6: TITAN ARTIK TEMELDEN DIRENCLI DEGIL, olmamali da.
       Once "titan > temel" sinaniyordu; o dogruydu cunku Temel
       taban modtu. Simdi Temel Viltrumite tasiyor ve indirimi
       %97 -- kaynak orani (80 vs 20) TERSINE dondu, kullanicinin
       istegiyle: "temel zirhin zayif oldugunu dusunuyorum".

       Direnc efekti ikisinde de TAVANDA (IV, %80) cunku amp 4
       tam bagisiklik ve StarOxine'e ayrilmis. Temel'in fazlasi
       efektte degil HASAR KANCASINDA (viltrumite.js). Sinama
       da orayi ariyor: Temel'in geri kazanim orani gercekten
       %97'yi mi hedefliyor.                                   */
    const titanDir = ayar.ZIRH_MODLAR.get("titan").efektler
      .find((e) => e[0] === "resistance");
    const temelDir = ayar.ZIRH_MODLAR.get("temel").efektler
      .find((e) => e[0] === "resistance");
    kontrol("titan ve temel ikisi de Direnc tavaninda (IV)",
            titanDir[2] === 3 && temelDir[2] === 3,
            "titan " + (titanDir[2] + 1) + " / temel " + (temelDir[2] + 1));
    /* Geri kazanim orani TURETILMIS olmali, elle yazilmis
       degil: Direnc IV altinda gelen hasarin %85'i geri
       verilirse net indirim tam %97 olur.                    */
    const netIndirim =
      1 - (1 - (ayar.VILT_DIRENC + 1) * 0.2) * (1 - ayar.VILT_GERI_ORAN);
    kontrol("Temel'in net hasar indirimi kaynagin %97'si",
            Math.abs(netIndirim * 100 - ayar.VILT_INDIRIM) < 0.001,
            "%" + (netIndirim * 100).toFixed(2));
  }

  /* --- 2. Ozette yazan her sey tabloda karsiligi olmali ---
     Ozet metni oyuncunun MENUDE okudugu sey. Orada gecen bir
     efekt adinin efektler listesinde karsiligi yoksa, o satir
     bir yalan.                                               */
  const OZET_ESLESME = [
    [/direnç\s*IV/i,        (t) => hasEfekt(t, "resistance", 3)],
    [/direnç\s*III/i,       (t) => hasEfekt(t, "resistance", 2)],
    [/görünmezlik/i,        (t) => hasEfekt(t, "invisibility")],
    [/ateş bağışıklığı/i,   (t) => hasEfekt(t, "fire_resistance")],
    [/su altında nefes/i,   (t) => hasEfekt(t, "water_breathing")],
    [/su gücü/i,            (t) => hasEfekt(t, "conduit_power")],
    [/gece görüşü/i,        (t) => hasEfekt(t, "night_vision")],
    [/düşme hasarı yok/i,   (t) => hasEfekt(t, "slow_falling")],
    [/hız\s*V\b/i,         (t) => hasEfekt(t, "speed", 4)],
    [/acele\s*V\b/i,       (t) => hasEfekt(t, "haste", 4)],
    [/güç\s*V\b/i,         (t) => hasEfekt(t, "strength", 4)]
  ];
  function hasEfekt(t, ad, enAz) {
    const e = t.efektler.find((x) => x[0] === ad);
    if (!e) return false;
    return enAz === undefined || e[2] >= enAz;
  }
  for (const [anahtar2, t] of ayar.ZIRH_MODLAR) {
    for (const [desen, sinar] of OZET_ESLESME) {
      if (!desen.test(t.ozet)) continue;
      kontrol(anahtar2 + ': ozetteki "' + desen.source.replace(/\\s\*/g, " ") +
              '" gercekten veriliyor', sinar(t), t.ozet);
    }
  }

  /* --- 3. Ozet ARTIK Palladium ozellik adi TASIMIYOR ---
     "armor +20", "toughness +15", "destroy_speed +2" gibi
     satirlar oyuncuya hicbir sey anlatmiyordu ve Bedrock'ta
     karsiliklari yoktu. Ozet oyuncunun dilinde olmali.      */
  for (const [anahtar2, t] of ayar.ZIRH_MODLAR) {
    kontrol(anahtar2 + ": ozet Palladium ozellik adi tasimiyor",
            !/\b(armor|toughness|destroy_speed|swim_speed|attack_speed|entity_glow|space_breath|movement|step)\b/i
              .test(t.ozet), t.ozet);
  }

  /* --- 4. Kaynakta ISIN olan modun bizde de isini var ---
     heat_mode ve titan_mode'da palladium:energy_beam var.
     Bu bolumun asil derdi: "isin 20 hasar" yazip isin
     vermemek. Sayilar da kaynaktan dogrulaniyor.            */
  if (existsSync(JAR + "/data/ionstrike/palladium/powers/heat_mode.json")) {
    const isinlar = (dosya) => {
      const d = oku(JAR + "/data/ionstrike/palladium/powers/" + dosya + ".json");
      return Object.values(d.abilities || {})
        .filter((v) => (v.type || "").split(":").pop() === "energy_beam");
    };
    for (const [kimlik, t] of ayar.ZIRH_ISIN) {
      const mod = ayar.ZIRH_MODLAR.get(t.mod);
      kontrol(kimlik + ": modu var ve o modun yetenegi bu",
              !!mod && mod.yetenek === kimlik,
              mod ? String(mod.yetenek) : "mod yok");
      const kaynak = isinlar(mod.kaynak);
      kontrol(kimlik + ": kaynakta gercekten energy_beam var",
              kaynak.length > 0, kaynak.length + " isin");
      const enBuyuk = Math.max(...kaynak.map((v) => v.damage || 0));
      /* v4.96: kaynagin sayisi TICK BASINA. Bizim isin tek
         atis + 1 saniye bekleme, o yuzden

             tek atis = tick basina x ZIRH_ISIN_BEKLEME

         Boylece SANIYELIK hasar kaynakla ayni kaliyor.
         v4.95'te sayi oldugu gibi alinmisti ve isini 20 kat
         zayiflatiyordu.                                    */
      kontrol(kimlik + ": kaynak hasari dogru okunmus",
              t.kaynakHasar === enBuyuk, t.kaynakHasar + " vs " + enBuyuk);
      /* v5.6: cevrimin ustune IKI KAT. Kullanicinin karari
         ("diger zirhlarin gucunu iki kat daha arttir").
         Sinama yine tam bir carpim ariyor, yani kazara
         degisirse yakalanir.                               */
      kontrol(kimlik + ": cevrim dogru (x" + ayar.ZIRH_ISIN_BEKLEME +
              " x2 = v5.6 katlamasi)",
              t.hasar === t.kaynakHasar * ayar.ZIRH_ISIN_BEKLEME * 2,
              t.kaynakHasar + " x " + ayar.ZIRH_ISIN_BEKLEME +
              " x2 = " + t.hasar);
      const menzil = Math.max(...kaynak.map((v) => v.max_distance || 0));
      kontrol(kimlik + ": menzil kaynakla ayni",
              t.menzil === menzil, t.menzil + " vs " + menzil);
      const yakma = Math.max(...kaynak.map((v) => v.set_on_fire_seconds || 0));
      kontrol(kimlik + ": yakma suresi kaynakla ayni",
              t.yakma === yakma, t.yakma + " vs " + yakma);
    }
  }

  /* --- 5. Yetenegi olan her mod GERCEKTEN kayitli ---
     Tabloda "yetenek" yazip o yetenegi kaydetmemek, menude
     olmayan bir dugme demekti.                              */
  const kayit2 = await import("./pack/yetenekler/kayit.js");
  for (const [anahtar2, t] of ayar.ZIRH_MODLAR) {
    if (!t.yetenek) continue;
    kontrol(anahtar2 + ": yetenegi (" + t.yetenek + ") kayitli",
            !!kayit2.yetenekAl(t.yetenek));
    /* Cekirdek esyasi da o yetenege bagli olmali: eline
       aldiginda calissin.                                   */
    const esya = ayar.ZIRH_CEKIRDEK_ONEK + anahtar2;
    const bagli = kayit2.esyaninYetenekleri(esya) || [];
    kontrol(anahtar2 + ": cekirdek esyasi yetenege bagli",
            bagli.some((y) => y.kimlik === t.yetenek),
            bagli.map((y) => y.kimlik).join(", ") || "hicbir sey");
  }
}

console.log("");
console.log("=== 7. ULASILABILIYOR MU ===");
{
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js zirh.js'i import ediyor",
          kaynak.includes('from "./yetenekler/zirh.js"'));
  kontrol("menude satiri var", /calis\(\)\s*\{\s*zirhMenusu\(oyuncu\);\s*\}/.test(kaynak));
  /* v4.94: menu satiri artik ELINDEKI CEKIRDEGI onceliyor --
     gorunusun ne ise menu de onu yazmali.                    */
  /* v4.95: menu satiri artik SADECE elindeki cekirdegi
     yaziyor -- mod secimi kalkti, olmayan bir secimi
     gostermek yaniltirdi.                                   */
  kontrol("menu satiri elindeki cekirdegi gosteriyor",
          kaynak.includes("ZIRH_MODLAR.get(elindekiCekirdek(oyuncu))"));
  kontrol("cekirdek yokken 'cekirdek yok' yaziyor",
          kaynak.includes("çekirdek yok"));
  kontrol("main.js modAl/modYaz'i ARTIK cagirmiyor",
          !/\bmodAl\(|\bmodYaz\(/.test(kaynak));
  kontrol("tarama merkezi tick'ten cagriliyor",
          /zirhTara\(oyuncular\)/.test(kaynak));
  kontrol("playerLeave temizliyor",
          /zirhUnutOyuncu\(olay\.playerId\)/.test(kaynak));
  /* Cekirdek yoksa NE YAPILACAGI yazilmali: "menuyu actim ama
     hicbir sey olmuyor" bu pakette en pahali hata sinifi.
     Eskiden burada "tam takim gerek" yaziyordu; takim
     kalkinca yerine "cekirdegi eline al" geldi.             */
  kontrol("cekirdek yoksa ne yapilacagi menude yaziyor",
          kaynak.includes("çekirdeği eline al"));

  /* Yeni kol acilmadi: "her seyi kol yapma".                 */
  const uretec = readFileSync(KOK + "/kol_uret.py", "utf8");
  /* ---- 6 -> 7  (v6.7) ----
     Bu satir "kol israfi" bekcisi: v4.33 ve v4.46'da dort+dort
     kol kaldirilmisti, sayi elle tutuluyor ki yeni kol SESSIZCE
     eklenemesin. Kanli Kol kullanicinin ACIK istegi
     ("ozellikle kanli kolu istiyorum"), o yuzden sayi bilerek
     yediye cikti. Bekci calismaya devam ediyor.            */
    /* ---- 7 -> 8  (v7.7) ----
     ANNA KOLU. Kullanicinin acik istegi ("Anna1545 Kolu'nu
     ekleyelim once"). Sayi YINE ELLE guncellendi -- otomatik
     saymak bekciyi olduruyor, cunku bekcinin isi tam olarak
     "yeni kol sessizce eklenmesin".
     Anna kol israfi degil: tek yetenegi (can_ver) BASKASINI
     iyilestiriyor ve depoda bunu yapan baska hicbir sey yok.  */
kontrol("izinsiz kol acilmadi (9 kol)",
          (uretec.match(/^\s*\("kol_\w+",/gm) || []).length === 9);

  for (const dosya of ["en_US.lang", "tr_TR.lang"]) {
    const metin = readFileSync(RP + "/texts/" + dosya, "utf8");
    for (const anahtar of ayar.ZIRH_MODLAR.keys()) {
      const kimlik = ayar.ZIRH_CEKIRDEK_ONEK + anahtar;
      kontrol(dosya + ": " + kimlik + " adi var",
              metin.includes("item." + kimlik + ".name="));
    }
  }
  const atlas = oku(RP + "/textures/item_texture.json").texture_data;
  for (const anahtar of ayar.ZIRH_MODLAR.keys()) {
    const kimlik = ayar.ZIRH_CEKIRDEK_ONEK + anahtar;
    kontrol(kimlik + ": atlasa kayitli", !!atlas[kimlik.replace("pa:", "")]);
  }
  /* Eski parcalar atlasta KALMAMALI: kalirsa olmayan bir
     esyanin ikonu bosuna paketleniyor demektir.             */
  for (const eski of ["zirh_bas", "zirh_govde", "zirh_bacak", "zirh_ayak"]) {
    kontrol(eski + ": atlastan da silindi", !atlas[eski]);
  }
}

console.log("");
console.log("=== 8. MOD DONUSUMU (v4.94) ===");
{
  /* Kullanici: "zirhi aliyorum, DONUSUM ayni kaliyor, tamamen
     ayni kaliyorum." Referansta her modun kendi takimi var ve
     Palladium onu render_layer ile ciziyor. Dokuz modun
     dokuzunun da modeli + dokusu cikarildi.                  */
  const pd = oku(OMP + "/entity/player.entity.json")["minecraft:client_entity"].description;

  kontrol("her mod icin cekirdek var",
          [...ayar.ZIRH_MODLAR.keys()].every(
            (m) => existsSync(BP + "/items/zirh_mod_" + m + ".json")),
          ayar.ZIRH_MODLAR.size + " mod");

  for (const mod of ayar.ZIRH_MODLAR.keys()) {
    const a = "zirh_mod_" + mod;
    /* Her modun KENDI takimi olmali -- hepsi ayni dokuyu
       kullansaydi "donusum ayni kaliyor" sikayeti surerdi.  */
    kontrol(a + ": kendi modeli var",
            existsSync(OMP + "/models/entity/" + a + ".geo.json"));
    kontrol(a + ": kendi dokusu var",
            existsSync(OMP + "/textures/entity/" + a + ".png"));
    kontrol(a + ": oyuncu modeline bagli",
            pd.geometry[a] === "geometry." + a &&
            pd.textures[a] === "textures/entity/" + a);
    kontrol(a + ": tetigi var",
            pd.scripts.pre_animation.some((x) => x.startsWith("variable." + a + " =")));
    kontrol(a + ": denetleyicisi var",
            pd.render_controllers.some(
              (x) => typeof x === "object" && ("controller.render." + a) in x));

    const g = oku(OMP + "/models/entity/" + a + ".geo.json")["minecraft:geometry"][0];
    const adlar = g.bones.map((b) => b.name);
    for (const v of ["head", "body", "leftArm", "rightArm", "leftLeg", "rightLeg"]) {
      kontrol(a + ": '" + v + "' kemigi var", adlar.includes(v));
    }
    /* Isi ve HidroIsi modelleri `group` adinda bir sarmalayici
       kokten sarkiyordu; atilmis olmali.                     */
    kontrol(a + ": 'group' sarmalayicisi atilmis", !adlar.includes("group"));
    kontrol(a + ": basibos kok kemik yok",
            !g.bones.some((b) => !b.parent &&
              !["head","body","leftArm","rightArm","leftLeg","rightLeg"].includes(b.name) &&
              (b.cubes || []).length));
  }

  /* DOKUZ MOD DOKUZ AYRI GORUNUS: ikisi ayni dosyaysa biri
     bosuna duruyor demektir. (Titan referansta taban takimi
     yeniden kullaniyor -- o BILINCLI, ayni dosya olabilir.) */
  const ozet = new Map();
  for (const mod of ayar.ZIRH_MODLAR.keys()) {
    const d = readFileSync(OMP + "/textures/entity/zirh_mod_" + mod + ".png");
    const anahtar = d.length + ":" + d.subarray(0, 64).toString("hex");
    ozet.set(anahtar, [...(ozet.get(anahtar) || []), mod]);
  }
  const ayriGorunus = ozet.size;
  kontrol("en az yedi ayri gorunus var", ayriGorunus >= 7,
          ayriGorunus + " ayri doku / " + ayar.ZIRH_MODLAR.size + " mod");

  /* Cekirdek ELDE taniniyor mu + gucler geliyor mu.         */
  const { D, o } = kur([]);
  kontrol("eli bosken cekirdek yok",
          zirh.elindekiCekirdek(o) === undefined);
  o._elde = "pa:zirh_mod_titan";
  kontrol("cekirdek eline alinca taniniyor",
          zirh.elindekiCekirdek(o) === "titan");

  /* v5.9: KILITLIYKEN GUC VERMEMELI. Kaynakta mod, cekirdegi
     odeyerek aciliyor (base_mode.json -> item_buyable);
     acilmamis bir modun cekirdegini tasimak bir sey
     vermiyor. Once bunu sinayip sonra aciyoruz.            */
  D.boyut._efektler = [];
  tickIlerlet(2);
  kontrol("KILITLIYKEN cekirdek guc vermiyor",
          (D.boyut._efektler || []).length === 0,
          (D.boyut._efektler || []).map((e) => e.ad).join(",") || "efekt yok");
  const acSonuc = agac.modAc(o, "titan");
  kontrol("cekirdek harcanip mod acildi", acSonuc.tamam === true,
          acSonuc.sebep || "acildi");
  /* Cekirdek gitti -- kaynakta da item_buyable onu tuketiyor.
     Mod artik SECILI olarak duruyor, elde tutulmuyor.      */
  agac.modSec(o, "titan");
  D.boyut._efektler = [];
  tickIlerlet(2);
  const gelen = (D.boyut._efektler || []).map((e) => e.ad);
  for (const [ad] of ayar.ZIRH_MODLAR.get("titan").efektler) {
    kontrol("titan cekirdegi: " + ad + " verildi", gelen.includes(ad));
  }
  /* ZIRHSIZ calisiyor: v4.95'te takim zaten kaldirildi,
     cekirdek TEK kaynak.                                    */
  kontrol("cekirdek tek basina yetiyor", gelen.length > 0,
          gelen.length + " efekt");

  /* ---- v5.9: BIRAKINCA GUC GITMIYOR, ARTIK GITMEMELI ----
     Eskiden cekirdek elde tutulan bir anahtardi ve birakinca
     guc gidiyordu. Kaynakta oyle DEGIL: cekirdek bir kez
     HARCANIYOR (base_mode.json -> palladium:item_buyable) ve
     mod kalici. Yani "birakinca gider" kurali kaynakta hic
     yoktu, bizim uydurdugumuz bir kisittı.

     Yeni kural: SECILI mod varsa elin bos olsa da guc gelir;
     secim de yoksa hicbir sey gelmez. Ikisi de sinaniyor. */
  o._elde = undefined;
  D.boyut._efektler = [];
  tickIlerlet(ayar.ZIRH_TARAMA + 2);
  kontrol("secili mod varken el bos olsa da guc duruyor",
          (D.boyut._efektler || []).length > 0,
          (D.boyut._efektler || []).length + " efekt");

  /* Secim de yoksa hicbir sey kalmamali. */
  const bos = kur();
  bos.D.boyut._efektler = [];
  tickIlerlet(ayar.ZIRH_TARAMA + 2);
  kontrol("secim de yokken guc yok",
          (bos.D.boyut._efektler || []).length === 0,
          (bos.D.boyut._efektler || []).length + " efekt");

  /* Cakma parcacigi: referanstaki transform_flash.          */
  kontrol("donusum caktisi tanimli",
          typeof ayar.ZIRH_CAKMA === "string" && ayar.ZIRH_CAKMA.length > 0,
          ayar.ZIRH_CAKMA);

  kontrol("mod sayisi degismedi (9)", ayar.ZIRH_MODLAR.size === 9);
}

console.log("");
console.log("=== 9. MODLARIN EK KATMANLARI + ANIMASYON (v4.97) ===");
{
  /* Kullanici: "animasyonlar eklenmeli cunku modun kendisinde
     var, referanstan bakarsin."

     BAKILDI. Modun TAMAMINDA tek animasyon var:
     animation.drill_spin.json -- Guc modunun kol
     matkaplarinin donusu.

     Ararken daha buyuk bir eksik cikti: her modun BIRDEN COK
     render katmani var, biz her modun yalnizca ANA katmanini
     almisiz. Guc'un MATKAPLARI ve Titan'in HALESI hic
     aktarilmamis.                                            */
  const ION = "/tmp/claude-0/-home-user-kanal-sitesi/" +
    "e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11/scratchpad/ion2";
  const EK = [
    { mod: "guc",   ad: "zirh_mod_guc_matkap", ozellik: "pa:matkap",
      kemik: ["drill_left", "drill_right"], anim: "drill_spin" },
    { mod: "titan", ad: "zirh_mod_titan_hale",
      kemik: ["hale"], anim: null }
  ];

  for (const e of EK) {
    kontrol(e.ad + ": geometrisi diskte",
            existsSync(OMP + "/models/entity/" + e.ad + ".geo.json"));
    kontrol(e.ad + ": dokusu diskte",
            existsSync(OMP + "/textures/entity/" + e.ad + ".png"));
    if (!existsSync(OMP + "/models/entity/" + e.ad + ".geo.json")) continue;

    const g = oku(OMP + "/models/entity/" + e.ad + ".geo.json")["minecraft:geometry"][0];
    const adlar = g.bones.map((b) => b.name);
    for (const k of e.kemik) {
      kontrol("  " + e.ad + ": '" + k + "' kemigi var", adlar.includes(k),
              adlar.join(","));
      const b = g.bones.find((x) => x.name === k);
      kontrol("  " + e.ad + ": '" + k + "' BOS DEGIL",
              !!b && (b.cubes || []).length > 0,
              b ? (b.cubes || []).length + " kup" : "-");
    }
    /* Matkap katmani takimi IKINCI KEZ cizmemeli: kol
       kemikleri sadece pivot tasiyici olmali.               */
    if (e.mod === "guc") {
      const kol = g.bones.find((b) => b.name === "left_arm");
      kontrol("  matkap katmani takimi tekrar cizmiyor",
              !!kol && (kol.cubes || []).length === 0,
              kol ? (kol.cubes || []).length + " kup" : "kol yok");
    }

    /* TETIK ANA MODUN degiskeni olmali: ayri bir tetik iki
       katmanin ayrisabilecegi anlamina gelirdi (matkaplar
       var, takim yok gibi).                                */
    const pd = oku(OMP + "/entity/player.entity.json")["minecraft:client_entity"].description;
    kontrol(e.ad + ": geometrisi oyuncu modeline bagli",
            pd.geometry[e.ad] === "geometry." + e.ad);
    kontrol(e.ad + ": dokusu oyuncu modeline bagli",
            pd.textures[e.ad] === "textures/entity/" + e.ad);
    const rc = pd.render_controllers.find(
      (x) => typeof x === "object" && x["controller.render." + e.ad]);
    kontrol(e.ad + ": denetleyicisi var", !!rc);
    kontrol(e.ad + ": tetigi ANA MODUN degiskeni",
            !!rc && rc["controller.render." + e.ad]
              .includes("variable.zirh_mod_" + e.mod + " "),
            rc ? rc["controller.render." + e.ad] : "-");

    /* Animasyon: modun kendi dosyasi, oldugu gibi. */
    if (e.anim) {
      const ay = OMP + "/animations/" + e.anim + ".animation.json";
      kontrol(e.ad + ": animasyon dosyasi diskte", existsSync(ay));
      if (existsSync(ay)) {
        const a = oku(ay);
        const adi = Object.keys(a.animations)[0];
        kontrol("  animasyon Bedrock bicimi (1.8.0)",
                a.format_version === "1.8.0", a.format_version);
        /* Kimlik "animation." ile BASLAMAK ZORUNDA. Kaynakta
           duz "drill" yaziyordu (GeckoLib kurali) ve oyle
           birakilsa oyun animasyonu HIC tanimazdi -- sessizce
           hicbir sey oynamazdi. Bu testin yakaladigi hata.  */
        kontrol("  kimlik 'animation.' ile basliyor",
                adi.startsWith("animation."), adi);
        kontrol("  oyuncu modeli onu oynatiyor",
                pd.animations[e.ad] === adi,
                pd.animations[e.ad] + " vs " + adi);
        const oynat = pd.scripts.animate.find(
          (x) => typeof x === "object" && x[e.ad]);
        /* v5.8: kosul artik "cekirdek elde" DEGIL, "cekirdek
           elde VE katman acilmis". Kullanici: "guc modunu
           actigin zaman direkt elimde matkap oluyor; normalde
           tek tek acabiliyorsun."

           Kaynakta olculdu (strength_mode.json): drill_hands
           list_index 1, hidden_in_bar false -- yetenek barinda
           bir slot, oyuncu acip kapatiyor. Sinama artik
           OZELLIK sartinin orada oldugunu ariyor; kaldirilirsa
           eski (sikayet edilen) davranisa donmus oluruz ve
           test kirmizi yanar.                               */
        const beklenenKosul = "variable.zirh_mod_" + e.mod +
          (e.ozellik ? " && q.property('" + e.ozellik + "')" : "");
        kontrol("  dogru kosulla oynuyor" +
                (e.ozellik ? " (acilmis olmali)" : ""),
                !!oynat && oynat[e.ad] === beklenenKosul,
                (oynat ? oynat[e.ad] : "-") + " | beklenen: " + beklenenKosul);
        /* Animasyonun surdugu kemikler modelde OLMALI --
           yoksa animasyon sessizce hicbir sey yapmaz.       */
        const surulen = Object.keys(a.animations[adi].bones || {});
        kontrol("  surdugu kemiklerin hepsi modelde",
                surulen.every((k) => adlar.includes(k)),
                surulen.join(",") + " vs " + adlar.join(","));

        /* Kaynakla karsilastirma: TEK degisen sey anahtar
           olmali. Kemikler, kare zamanlari, donusler ve
           dongu bayragi birebir ayni kalmali.               */
        const ky = ION + "/assets/ionstrike/animations/animation." + e.anim + ".json";
        if (existsSync(ky)) {
          const kaynakA = oku(ky);
          const kAdi = Object.keys(kaynakA.animations)[0];
          kontrol("  ICERIK kaynakla birebir (sadece anahtar degisti)",
                  JSON.stringify(kaynakA.animations[kAdi]) ===
                  JSON.stringify(a.animations[adi]));
          kontrol("  kaynaktaki anahtar Bedrock'a uygun DEGILDI",
                  !kAdi.startsWith("animation."), kAdi);
        }
      }
    }
  }

  /* Modun TAMAMINDA baska animasyon YOK: "eksik birakmadik
     mi" sorusunun cevabi. Bir gun mod guncellenir ve yeni
     animasyon gelirse bu satir kirilir -- istenen bu.      */
  const anmDizin = ION + "/assets/ionstrike/animations";
  if (existsSync(anmDizin)) {
    const hepsi = readdirSync(anmDizin).filter((f) => f.endsWith(".json"));
    kontrol("modda BASKA animasyon yok (hepsini aldik)",
            hepsi.length === 1 && hepsi[0] === "animation.drill_spin.json",
            hepsi.join(", "));
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Zirh Yukseltmesi + mod donusumu yerinde");
process.exit(hata ? 1 : 0);

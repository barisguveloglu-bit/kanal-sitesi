import * as api from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, kollariIndir, actionbarYaz } from "../yardimcilar.js";
import {
  cantaListesi, cantaBosalt, cantaDolulugu, botVarliklari, botSavas, savasAcikMi
} from "./_bot_defteri.js";
import { BOT_TESLIM_MENZIL, BOT_CANTA_TAVAN } from "../ayarlar.js";

/* ============================================================
   TESLIM  --  "botlar odunu bana versin"

   Botlar topladiklarini once EKIP CANTASINA koyuyor; teslim
   bunu topluca envantere aktariyor.

   NEDEN ARADA BIR CANTA VAR (v4.27'de dogrudan envantere
   giriyordu):
     1. GORUNURLUK. Dogrudan girince ne geldigini fark etmiyordun;
        artik "3 bot getirdi: 47 mese kutugu, 6 ham demir" diye
        tek satirda gorunuyor.
     2. ENVANTER DOLULUGU. Doluyken esya sessizce yere dusuyordu
        ve fark etmeden birakip gidiyordun. Artik cantada
        bekliyor, yer acinca teslim ediyorsun.
     3. TESLIM BIR AN. Botun sana bir sey VERMESI istenmisti;
        arka planda sizmasi degil.

   TESLIM MENZILI: cok uzaktaki bot teslim edemez. Yoksa botu
   ormanda birakip evde esya toplardin -- calisma hissi kaybolur.
   Ekipten EN AZ BIR bot menzilde olmali.
   ============================================================ */

const ItemStack = api.ItemStack;

/* Esya kimliginden okunabilir ad. "minecraft:oak_log" ->
   "oak log". Dil dosyasindan gercek adi almak icin API yok;
   bu en azindan okunur bir sey veriyor.                        */
function okunurAd(kimlik) {
  return String(kimlik).replace(/^minecraft:/, "").replace(/_/g, " ");
}

/* Donen deger: { verilen, dusen, satir } ya da { hata } */
export function teslimEt(oyuncu) {
  const liste = cantaListesi(oyuncu.id);
  if (liste.length === 0) return { bos: true };

  /* En az bir bot yakinda mi? Konum da lazim: envanter dolarsa
     esya BOTUN yanina dusmeli, oyuncunun degil -- botun
     getirdigi belli olsun.                                     */
  let yakinBot;
  for (const { varlik } of botVarliklari(oyuncu.id)) {
    try {
      if (!gecerliMi(varlik)) continue;
      if (varlik.dimension.id !== oyuncu.dimension.id) continue;
      const a = varlik.location, b = oyuncu.location;
      if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= BOT_TESLIM_MENZIL) {
        yakinBot = varlik;
        break;
      }
    } catch (e) {
      // bu bot okunamadi, digerine bak
    }
  }
  if (!yakinBot) {
    return { hata: "Botlar cok uzakta. §7'bot gel' de, sonra teslim al." };
  }

  let kap;
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    kap = env ? env.container : undefined;
  } catch (e) {
    hataYaz("teslim.envanter", e);
  }

  let verilen = 0;
  let dusen = 0;
  const ozet = [];

  for (const [esya, adet] of liste) {
    ozet.push(adet + " " + okunurAd(esya));

    /* Tek tek ItemStack: 64'luk yigin yapmak daha ucuz olurdu
       ama max_stack_size esyaya gore degisiyor ve yanlis
       tahmin edersek esya kayboluyor. Adet zaten canta
       tavaniyla sinirli.                                       */
    for (let i = 0; i < adet; i++) {
      let yigin;
      try {
        yigin = new ItemStack(esya, 1);
      } catch (e) {
        break;   // bu kimlik uretilemiyor, digerine gec
      }

      let kaldi = yigin;
      try {
        if (kap && typeof kap.addItem === "function") kaldi = kap.addItem(yigin);
      } catch (e) {
        kaldi = yigin;
      }

      if (!kaldi) { verilen++; continue; }

      // Envanter dolu: botun yanina birak, kaybolmasin
      try {
        if (typeof yakinBot.dimension.spawnItem === "function") {
          yakinBot.dimension.spawnItem(kaldi, yakinBot.location);
          dusen++;
        }
      } catch (e) {
        hataYaz("teslim.spawnItem", e);
      }
    }
  }

  cantaBosalt(oyuncu.id);
  return { verilen, dusen, satir: ozet.join(", ") };
}

/* Isin sonunda ve canta dolunca cagriliyor; mesaji da yaziyor. */
export function teslimEtVeYaz(oyuncu, onek) {
  const s = teslimEt(oyuncu);
  try {
    if (s.bos) return s;
    if (s.hata) { oyuncu.sendMessage("§c" + s.hata); return s; }
    oyuncu.sendMessage(
      (onek || "§aBotlar getirdi: ") + "§f" + s.satir +
      (s.dusen > 0 ? " §8· " + s.dusen + " parca envanter dolu oldugu icin " +
                     "botun yanina birakildi" : "")
    );
  } catch (e) {
    hataYaz("teslim.mesaj", e);
  }
  return s;
}

yetenekKaydet({
  kimlik: "bot_teslim",
  ad: "Bot: Teslim Al",
  esyasiz: true,
  sira: 250,

  olustur(oyuncu) {
    const dolu = cantaDolulugu(oyuncu.id);
    const s = teslimEtVeYaz(oyuncu);

    if (s.bos) {
      actionbarYaz(oyuncu, "§eCanta bos. §7Once 'bot odun' ya da 'bot maden'.");
    } else if (!s.hata) {
      actionbarYaz(oyuncu, "§a" + dolu + " parca teslim alindi §8(tavan " +
                   BOT_CANTA_TAVAN + ")");
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});

yetenekKaydet({
  kimlik: "bot_savas",
  ad: "Bot: Savas Ac/Kapat",
  esyasiz: true,
  sira: 255,

  olustur(oyuncu) {
    let acik;
    try {
      acik = botSavas(oyuncu);          // argumansiz = tersine cevir
    } catch (e) {
      hataYaz("bot_savas", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    try {
      oyuncu.sendMessage(acik
        ? "§cBotlar savasa hazir. §7Sen bir seye vurunca onlar da saldirir; " +
          "sana vurulursa vurani doverler."
        : "§7Botlar barisci. §8Artik kimseye saldirmiyorlar.");
    } catch (e) {
      hataYaz("bot_savas.mesaj", e);
    }

    kollariIndir(oyuncu);
    return undefined;
  }
});

export { savasAcikMi };

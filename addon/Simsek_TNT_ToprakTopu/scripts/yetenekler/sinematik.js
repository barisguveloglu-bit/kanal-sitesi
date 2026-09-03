import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, ekraniBoya } from "../yardimcilar.js";
import {
  SINEMATIK_ACIK, SINEMATIK_SURE, SINEMATIK_YARICAP, SINEMATIK_YUKSEK,
  SINEMATIK_ADIM, SINEMATIK_GECIS, SINEMATIK_DONUS, SINEMATIK_FADE,
  SINEMATIK_RENK, SINEMATIK_TAVAN
} from "../ayarlar.js";

/* SINEMATIK KAMERA -- oyuncunun etrafinda donen serbest kamera.

   Kullanicinin gonderdigi iki satirdan geliyor:
     execute at @p run camera @p set minecraft:free ease 0.25
             linear pos ~4 ~4 ~1.5 rot 30 90
     camera fade time 0.5 0.5 0.5 color 255 255 255

   Ikincisi zaten bizdeydi (ekraniBoya). Yeni olan serbest
   kamera.

   ---- KAYNAKTAN AYRILDIGIMIZ IKI YER ----
   1. CIKIS GARANTISI. Kaynakta kamerayi birakan bir satir
      YOK. Serbest kamera kendiliginden bitmez; temizlenmezse
      oyuncu kilitli kalir. Burada "camera @s clear" bitir()
      icinde, yani her kosulda calisiyor -- sure dolsa da, is
      yarida kesilse de. Ustune bir de SINEMATIK_TAVAN var.
   2. ACI HESAPLANIYOR. Kaynak "rot 30 90" diye sabit yaziyor;
      oyuncu donunce kamera bambaska yere bakiyor. Burada her
      adimda kameradan oyuncuya dogru hesaplaniyor.          */

function bakisAcisi(kamera, hedef) {
  /* Minecraft duzeni: yaw 0 = +z, bati yonunde artiyor;
     pitch asagi bakinca pozitif.                            */
  const dx = hedef.x - kamera.x;
  const dy = hedef.y - kamera.y;
  const dz = hedef.z - kamera.z;
  const yatay = Math.sqrt(dx * dx + dz * dz);
  const yaw = Math.atan2(-dx, dz) * 180 / Math.PI;
  const pitch = -Math.atan2(dy, yatay) * 180 / Math.PI;
  return { yaw, pitch };
}

yetenekKaydet({
  kimlik: "sinematik",
  ad: "Sinematik Kamera",
  esyasiz: true,
  sira: 154,

  olustur(oyuncu) {
    if (!SINEMATIK_ACIK) return undefined;
    if (!gecerliMi(oyuncu)) return undefined;

    const oyuncuId = oyuncu.id;
    let birakildi = false;

    /* Kamerayi BIRAKAN tek yer. Iki kez cagrilsa da bir kez
       is yapiyor.                                           */
    const birak = () => {
      if (birakildi) return;
      birakildi = true;
      try {
        if (gecerliMi(oyuncu) && typeof oyuncu.runCommand === "function") {
          oyuncu.runCommand("camera @s clear");
        }
      } catch (e) {
        hataYaz("sinematik.clear", e);
      }
    };

    /* Beyaz flas. Basarisiz olursa sahne yine oynar -- gorsel
       eksik kalir, oyunculuk bozulmaz.                       */
    try {
      ekraniBoya(oyuncu, SINEMATIK_RENK,
                 SINEMATIK_FADE[0], SINEMATIK_FADE[1], SINEMATIK_FADE[2]);
    } catch (e) {
      hataYaz("sinematik.fade", e);
    }

    const basla = system.currentTick;
    const bitisTick = basla + SINEMATIK_SURE;
    let sonrakiTick = basla;
    /* Tavan SAATE DEGIL, calis() sayisina bakiyor.

       ---- ILK YAZILISI TAVAN DEGILDI ----
       Once "system.currentTick >= tavanTick" yaziliyordu.
       tavanTick her zaman bitisTick'ten sonra ve ikisi AYNI
       SAATI okuyor -- yani sure denetimi calisiyorsa tavan
       zaten gereksiz, calismiyorsa tavan da calismaz. Mutasyon
       testi bunu gosterdi: tavani silmek hicbir seyi
       bozmuyordu, cunku zaten olu koddu.

       Tavanin tek anlamli oldugu durum SAATIN TAKILMASI. O
       yuzden artik isin KAC KEZ calistigi sayiliyor: saat
       donmese bile bu sayi doluyor ve kamera birakiliyor. */
    let calisti = 0;
    /* Baslangic acisi oyuncunun BAKTIGI yonun arkasi: kamera
       once yuzunu gorsun.                                    */
    let aci0 = 0;
    try {
      const y = oyuncu.getViewDirection();
      aci0 = Math.atan2(y.x, y.z) * 180 / Math.PI;
    } catch (e) {
      hataYaz("sinematik.getViewDirection", e);
    }

    return {
      ad: "sinematik",
      oyuncuId: oyuncuId,

      calis() {
        if (++calisti >= SINEMATIK_TAVAN) return true;
        if (system.currentTick >= bitisTick) return true;
        if (!gecerliMi(oyuncu)) return true;
        if (system.currentTick < sonrakiTick) return false;
        sonrakiTick = system.currentTick + SINEMATIK_ADIM;

        try {
          const k = oyuncu.location;
          const merkez = { x: k.x, y: k.y + 1.6, z: k.z };
          const ilerleme = (system.currentTick - basla) / SINEMATIK_SURE;
          const a = (aci0 + ilerleme * SINEMATIK_DONUS) * Math.PI / 180;
          const kamera = {
            x: merkez.x + Math.sin(a) * SINEMATIK_YARICAP,
            y: k.y + SINEMATIK_YUKSEK,
            z: merkez.z + Math.cos(a) * SINEMATIK_YARICAP
          };
          const { yaw, pitch } = bakisAcisi(kamera, merkez);
          oyuncu.runCommand(
            "camera @s set minecraft:free ease " +
            SINEMATIK_GECIS.toFixed(2) + " linear pos " +
            kamera.x.toFixed(2) + " " + kamera.y.toFixed(2) + " " +
            kamera.z.toFixed(2) + " rot " +
            pitch.toFixed(1) + " " + yaw.toFixed(1)
          );
        } catch (e) {
          hataYaz("sinematik.camera", e);
          return true;      // komut calismiyorsa sahneyi surdurme
        }
        return false;
      },

      bitir() { birak(); }
    };
  }
});

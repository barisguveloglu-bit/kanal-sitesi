# BloodyClient_sign.apk — statik inceleme

**Hiçbir şey çalıştırılmadı.** Dosya sadece açıldı (`unzip`),
içindekilere `strings` / `file` ile ve `AndroidManifest.xml` ile
`classes.dex`'in **tablolarını** okuyan küçük betiklerle bakıldı
(dizi havuzu ve tip listesi; bytecode yorumlanmadı).

Kullanıcının amacı kendi sözleriyle: *"bunu ekle demiyorum,
sadece bunu kullanan biriyle vs atarsam savunmalı olayım
diye… sadece engellenebilecekleri engelle."*

## Kimlik

| | |
|---|---|
| dosya | `BloodyClient_sign.apk`, 12.639.819 bayt |
| md5 | `bd7d5a594fcf2e5710cd4f36e1be4612` |
| görünen ad | `BloodyClient`, sürüm `4.0.0` |
| paket adı | `io.mrarm.mctoolbox` |
| **aslı** | **Toolbox for Minecraft PE** (mrarm) |

## Sonuç önce: yeni saldırı yok

Bu, Toolbox'ın **üçüncü** yeniden paketlenmiş kopyası. Önceki
ikisi `REFERANS_TOOLBOX_APK.md` ve `REFERANS_WDBAX_APK.md`'de.

`resources.arsc` içindeki `s_*` ayar anahtarları sayıldı:
**65 anahtar** ve `REFERANS_SAVUNMA_PLANI.md`'deki listeyle
**birebir aynı** — bir fazla bir eksik değil. Dört aile de aynı:
görüntü 18 · hareket 16 · dövüş 13 · dünya 18.

Yani BloodyClient için **yazılacak yeni savunma yok**. v7.28–7.36
arasında yazılanlar bu dosyaya da aynen uyuyor.

## Nasıl paketlenmiş

- `lib/*/libtoolbox-1.19.50.02 · 1.19.51.01 · 1.19.63.01 ·
  1.19.71.02 · 1.19.73.02.so` → Toolbox'ın kendi çekirdeği,
  beş Minecraft sürümü için. WDBAX kopyasındaki **aynı beş
  dosya**.
- `lib/*/libnpprotect.so`, `libnpvmp.so` +
  `assets/ProtectedByNPManager/NP_ApkVmProtect.txt` →
  **NP Manager** koruması; Java kodunun gövdesi `.so` içine
  taşınmış.
- `libyurai.so` → Toolbox'ın Xbox giriş bileşeni. Hile değil.
- `assets/tb-1/` → Toolbox'ın kendi kaynak paketleri ve
  gölgelendiricileri.
- İmza dosyası `ANDROİD.RSA` — büyük İ ile, yani **Türkçe
  klavyeyle** yeniden imzalanmış. Kimliği değil, sadece kimin
  paketlediğine dair bir iz.

## İzinler

`INTERNET` · `ACCESS_NETWORK_STATE` · `READ/WRITE_EXTERNAL_STORAGE`
· `VIBRATE` · `WAKE_LOCK` · `AD_ID`

SMS, rehber, konum, kamera, mikrofon **yok**. Reklam ve ödeme
SDK'ları (Google Mobile Ads, AdColony, Play Billing) duruyor —
Toolbox'ın "Premium" akışı olduğu gibi kalmış.

## Bizim için sonuç

Tek satır: **bu dosya için yeni bir şey yapılmadı, gerekmedi.**
Aynı 65 özellik, aynı savunmalar.

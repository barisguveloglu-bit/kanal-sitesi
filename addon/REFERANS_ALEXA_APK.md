# Alexa Special V4.apk — statik inceleme

**Hiçbir şey çalıştırılmadı, kurulmadı.** Dosya yalnız bulut
makinesinde açıldı (`unzip -l`, `unzip`), içindekilere `strings`,
`file`, `md5sum` ile ve `AndroidManifest.xml`'in dizi havuzunu
okuyan küçük bir betikle bakıldı. Bytecode yorumlanmadı, `.so`
dosyaları yüklenmedi. **APK depoya alınmadı** — bu belge yalnız
ölçümü taşıyor.

Kullanıcının kuralı: *"hiçbir şeyi çalıştırma, savunması olanların
savunmalarını ekle, hilelere karşı savunma duvarımızı güçlendir."*

## Kimlik

| | |
|---|---|
| dosya | `Alexa Special V4.apk`, 44.024.805 bayt |
| md5 | `02fad215e56075f51d4005c89c971d37` |
| sha256 | `daab58a80952d26776b2c56bbcd34b0a015513ccedcb4d3d001c875ed22db0e2` |
| nereden | kullanıcının Google Drive'ı (bağlayıcı 44 MB'ı taşıyamadığı için yedek `dosya.co` bağlantısından indirildi; bayt sayısı Drive'dakiyle aynı) |
| görünen ad | `AlexaClient V4`, sürüm `4.0.0` (sürüm kodu 12) |
| paket adı | `io.mrarm.mctoolbox` |
| **aslı** | **Toolbox for Minecraft PE** (mrarm) |

## Sonuç önce: yeni saldırı yok, ama dört eski borç kapandı

Toolbox'ın **altıncı** yeniden paketlenmiş kopyası; T ailesinde
(MH_TEAM_V5 · WDBAX · BloodyClient) dördüncü. `resources.arsc`
içindeki `s_*` ayar anahtarları sayıldı: **67 anahtar**, hepsi
`REFERANS_SAVUNMA_PLANI.md`'deki 65 özelliğin anahtarları
(fark alt ayarlardan: `switcher_slot_count`,
`xray_block_tracker_air`). Bir fazla özellik yok.

Menü etiketleri de aynı: Kill-Aura, Reach, Reach Fix (Online),
Hitbox, Anti-Knockback, Flying, Elytra Fly, Phase, No-clip,
Speed, Blink, Tap Teleport, X-Ray, ChestESP, PlayerESP,
Tracers, FreeCam, Fullbright, NBT Editor, Give item, Enchanter…

**Ama** bu ailenin beş maddesi v7.38'den beri "ölçülebilir ama
yazılmadı" diye bekliyordu. Kural "savunması olanı ekle" olduğu
için dördü v7.99.5'te yazıldı:

| madde | ne yapıyor | savunma (v7.99.5) |
|---|---|---|
| `s_movement_jesus` | suyun/lavın üstünde yürümek | **Gözcü** — ayak altı sıvı, ayak hizası hava, 4 örnek; köşe + tekne doğrulaması |
| `s_movement_slow_falling` | iksirsiz yavaş düşmek | **Gözcü** — havada 3 örnek üst üste < 1,5 blok iniş; ağ/bal/lav/iskele okunuyor |
| `s_world_far_bypass` | uzaktaki bloğa koyma/kırma | **Gözcü** — gözden bloğun en yakın noktasına > 7,5 blok |
| `s_world_pick_distance` | aynı, seçme mesafesi | aynı ölçüm |
| `s_movement_blink` | paket tutup birden bırakmak | **açık kalıyor** — gecikmeden ayırt edilemiyor; sıçrama kısmı ışınlanma ölçümüne takılıyor |

Toolbox ailesi için engellenebilir kapsam **%84 → %97**
(`savunma_olc.py`). Geri kalan 60 özellik için savunmalar
v7.28–7.65 arasında zaten yazılıydı ve bu dosyaya da aynen uyuyor.

## Senin oyununda çalışır mı: hayır

Toolbox, oyunu kendi sürecinde başlatıp **sürüme özgü bellek
adresleriyle** yamalıyor. Hangi sürümlere yama taşıdığı dosya
adlarında yazılı:

- `lib/arm64-v8a/` 37 + `lib/armeabi-v7a/` 36 çekirdek,
  **38 farklı Minecraft sürümü**: `1.14.20` → `1.19.73`
- en yenisi **1.19.73** (Mart 2023)

Kullanıcının oyunu **26.52**. Eşleşen çekirdek yok; menüde bunun
Türkçe hata metni bile duruyor (*"Desteklenmeyen Minecraft"*,
*"Eski bir Minecraft sürümü"*). Yani bu APK senin oyununu
**başlatamaz**; pratik tehdidi sıfır. Savunmalar yine yazıldı,
çünkü aynı özellikler daha yeni istemcilerde de var.

## Nasıl paketlenmiş

- `libtoolbox-*.so` → Toolbox'ın kendi çekirdekleri.
- `libnpprotect.so`, `libnpvmp.so` +
  `assets/ProtectedByNPManager/NP_ApkVmProtect.txt` →
  **NP Manager** koruması (kayıt tarihi 2023-04-17); Java
  gövdeleri `.so` içine taşınmış. BloodyClient'takiyle aynı.
- `libyurai.so` → Toolbox'ın Xbox/Microsoft giriş bileşeni
  (`io.mrarm.yurai.msa`). Hile değil.
- `assets/zeta/` → yedi dosya: altı PNG ve bir yazı tipi. **Altı
  PNG'nin altısı da aynı dosya** (md5 `26001ce7…`, 77×77):
  Discord/YouTube/web simgesi adıyla duran yer tutucular. Kod
  tarafında `zeta` diye tek bir sınıf yok — yalnız marka artığı.
- İmza: `META-INF/ANDROİD.RSA` (büyük **İ**, Türkçe klavye),
  2025-08-02 tarihli, Android'in **herkese açık test
  anahtarıyla** imzalanmış. Kimlik değil, sadece yeniden
  paketlendiğinin izi.
- **Önceki adı `MadroClient V3`.** Dizi havuzunda iki dil kolu
  var: biri "Alexa Client" diyor, öteki hâlâ "Madro Client
  Premium". Yeniden markalama yarım kalmış.

## İzinler

`INTERNET` · `ACCESS_NETWORK_STATE` · `READ/WRITE_EXTERNAL_STORAGE`
· `VIBRATE` · `WAKE_LOCK` · `AD_ID`

SMS, rehber, konum, kamera, mikrofon **yok**. Reklam ve ödeme
SDK'ları (Google Mobile Ads, AdColony, Play Billing) duruyor —
Toolbox'ın "Premium" akışı olduğu gibi kalmış. BloodyClient ile
izin listesi bire bir aynı.

## Bizim için sonuç

- Yeni özellik yok; bilinen 65'in hepsi.
- Bu aileden bekleyen beş maddenin dördü **v7.99.5'te kapandı**
  (`test/gozcu_alexa.mjs`, 35 madde, yedi mutasyonla ısırdığı
  doğrulandı).
- Kalan tek madde `blink`, sebebi yukarıda.
- Görüntü ailesi (X-Ray, ESP, Tracers, FreeCam, Fullbright…)
  hâlâ ve her zaman **imkânsız**: sunucuya hiçbir şey
  göndermiyorlar.

# WDBAX_Client.apk — statik inceleme

**Hiçbir şey çalıştırılmadı.** Dosya sadece açıldı (`unzip`),
içindekilere `strings` / `file` / `openssl` ile bakıldı.
Amaç kullanıcının kendi sözleriyle: *"sadece kod yapısını
araştır bak uygun savunmaları geliştir."*

## Kimlik

| | |
|---|---|
| dosya | `WDBAX_Client.apk`, 14.762.434 bayt |
| md5 | `72528dffd01dd68e03d7904aa852d5cf` |
| paket adı | `io.wdbax.mctoolbox` |
| **aslı** | `io.mrarm.mctoolbox` — **Toolbox for Minecraft PE** (mrarm) |

Yani bu **yeni bir hile istemcisi değil**, Toolbox'ın yeniden
paketlenmiş bir kopyası.

## Nasıl paketlenmiş

- `lib/*/libnpprotect.so`, `libnpvmp.so` → **NP Manager** koruması.
  Java kodunun gövdesi `classes.dex`'ten alınıp `.so` içine
  taşınmış (`classes.dex` içinde `Lio/mrarm/mctoolbox` sınıf
  adları duruyor ama metot gövdeleri yerinde değil).
- `lib/arm64-v8a/libmcgrander.so` → 83 bayt, içeriği
  `MT-ENCRY...` ile başlıyor: **MT Manager** ile şifrelenmiş bir
  işaret dosyası. Yani APK **MT Manager** ile kurcalanmış.
- `#U06e6/` adlı klasör → `res/` klasörünün Arapça-Genişletilmiş
  rakamlarla yeniden adlandırılmış hâli (kaynak gizleme).
  İçindekiler sıradan PNG ve XML.
- `lib/*/libtoolbox-1.19.50.02 · 1.19.51.01 · 1.19.63.01 ·
  1.19.71.02 · 1.19.73.02.so` → Toolbox'ın kendi çekirdeği,
  beş Minecraft sürümü için.
- `libyurai.so` → Toolbox'ın **Xbox giriş** bileşeni
  (`io/mrarm/yurai/xbox/CLLAuthProvider`). Hile değil.

## İzinler

`INTERNET` · `ACCESS_NETWORK_STATE` · `READ/WRITE_EXTERNAL_STORAGE`
· `VIBRATE` · `WAKE_LOCK` · `AD_ID`

SMS, rehber, konum, kamera, mikrofon **yok**. İzin tarafında
veri hırsızlığı görünmüyor. Buna karşılık **reklam SDK'ları
var**: Google Mobile Ads + AdColony + Play Billing (yani
"Premium" aboneliği ve ödüllü reklam akışı duruyor).

## Özellikler (resources.arsc'ten çıkarıldı)

    Anti-Knockback · Auto-Armor · Auto-Bow
    Hitbox çarpanı (mob / oyuncu) · Kill-Aura (mob/oyuncu,
    aralık, switcher, yuva sayısı) · Reach · Reach Fix
    Oyuncuya ışınlan · Air Jump · Auto-Sprint · Blink · Fly
    Yüksek zıplama · Suda yürüme · No-clip · Phase
    Düşüş hasarı yok · Yay yavaşlaması yok · Yavaş düşüş
    Hız (+çarpan) · Dokununca ışınlan · Elytra Fly
    Zırh HUD · FreeCam · Fullbright · Can barları · Minimap
    PlayerESP · ChestESP · Tracer · Köprü kurucu
    Sandık soyucu · Nuke (+boyut) · RapidBuild · Haste
    Eşya ver · İsim değiştirme · Başarım zorlama · XP verme
    Komut modu

**Bu liste `REFERANS_SAVUNMA_PLANI.md`'deki 65 özelliklik
Toolbox listesiyle aynı. Yeni bir saldırı yok.**

## Buradan çıkan iş — v7.36

Listede bizde karşılığı **olmayan** tek aile şuydu:

    rapid_build · bridge_builder · fast_destroy · nuke

Bir önceki turda okunan 53 MB'lik kod arşivindeki `/fill`
(26 özgün) ve `/setblock` (9 özgün) da aynı yere çıkıyordu:
**blokla hapsetmek.**

İkisi eklendi:

1. **Kafes Kır** (`yetenekler/kafes.js`) — hapsedildiysen
   çevreni kırar. İki sert kuralı var: hapsedilmediysen
   hiçbir bloğa dokunmaz, ve ayağının altını asla kırmaz.
   Sandık/fırın gibi kap blokları ve `pa:` ile başlayan kendi
   bloklarımız korunuyor (eşya kaybı yasak).
2. **Blok hızı denetimi** (`gozcu.js`) — kırma/koyma olayları
   sayılıyor. Dört özelliği tek ölçüm görüyor.

## Hâlâ karşılığı olmayanlar

`xray · ESP · tracer · minimap · freecam · fullbright` —
bunlar **tamamen onun ekranında**. Sunucuya hiçbir şey
göndermiyorlar, bir davranış paketi ne görebilir ne
engelleyebilir. Tek gerçek karşılık bilgi saklamayan bir
dövüş düzeni: açık arazi, gizli kutu/tuzak kurmamak.

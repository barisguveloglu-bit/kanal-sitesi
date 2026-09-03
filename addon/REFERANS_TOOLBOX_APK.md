# MH_TEAM_V5.apk — statik inceleme

Kullanıcı: *"Bu kötü yazılım mı olabilir? Ben bunu niye kurayım ki,
virüs girer. Sadece savunma yapısını oluşturmak istiyorum."*

**Kurulmadı, çalıştırılmadı.** Sadece açılıp içine bakıldı.

    dosya   MH_TEAM_V5.apk   10.490.716 bayt
    sha256  efa1ecdb644ec5aee6be3ff6e708f9ddee50206d960a6d6c9fe72b0c57702786
    tarih   2023-04-17 (paketleyici damgası)

## Bu ne

**Toolbox for Minecraft PE'nin yeniden paketlenmiş hâli.** Paket adı
`io.mrarm.mctoolbox` — yani MrARM'ın gerçek Toolbox'ı. MH TEAM yeni
bir uygulama yazmamış, var olanı alıp yeniden paketlemiş.

Desteklediği Minecraft sürümleri (yerel kütüphanelerden):
`1.19.50.02` · `1.19.51.01` · `1.19.63.01` · `1.19.71.02` · `1.19.73.02`

## Bir yanlış iz — kayda geçsin

İncelemenin ortasında `lib/arm64-v8a/libyurai.so` görülüp "stok
Toolbox'ta olmayan, enjekte edilmiş bir hile istemcisi" sanıldı.
İçinde Microsoft Passport / WS-Trust SOAP uçları ve kendi BoringSSL'i
vardı, bu da şüpheyi güçlendirdi.

**Yanlıştı.** Sembollere bakınca çıktı:

    Java_io_mrarm_yurai_xbox_CLLInstance_nativeSetAccount
    io/mrarm/yurai/xbox/CLLAuthProvider
    /d/android/toolbox/yurai/lib/.cxx/cmake/release/arm64-v8a/...

`io.mrarm` ad uzayı ve `/d/android/toolbox/yurai/` derleme yolu:
`libyurai.so` **Toolbox'ın kendi** Xbox Live / Microsoft hesabı giriş
bileşeni. Enjekte edilmiş bir şey değil.

Ders: bir kütüphanenin "şüpheli görünmesi" ile "yabancı olması" ayrı
şeyler. Sembol adları ve derleme yolları bunu tek başına çözüyor.

## Gerçekten bulunanlar

### 1. AOSP test anahtarıyla imzalanmış — en önemli bulgu

    Issuer:  CN=Android, emailAddress=android@android.com
    Subject: CN=Android, emailAddress=android@android.com
    Not Before: Feb 29 2008

Bu, Android kaynak ağacında **özel anahtarı herkese açık olan** test
anahtarı. Yani:

- Bu paketin kim tarafından yapıldığına dair **hiçbir güvence yok**.
- İsteyen herkes "aynı uygulama" sayılacak başka bir sürüm
  üretebilir.
- Google Play'deki gerçek Toolbox MrARM'ın özel anahtarıyla
  imzalıdır. Bu o değil.

`META-INF` içindeki dosya adı `ANDROİD.RSA` — Türkçe noktalı İ ile.
Elle düzenlendiğinin işareti.

### 2. NP Manager ile korumaya alınmış

    assets/ProtectedByNPManager/NP_ApkVmProtect.txt
    ProtectBy: NP管理器
    ProtectTime: 2023-04-17 23:52:14

Yanında `libnpprotect.so` / `libnpvmp.so` ve Arapça birleştirme
işaretlerinden oluşan klasör adları (`#U06df#U06e0...`) — kod
çözmeyi zorlaştırmak için.

Bunun tek amacı **değiştirilenin ne olduğunun anlaşılmasını
engellemek.**

### 3. İzinler ölçülü

    INTERNET · ACCESS_NETWORK_STATE · READ/WRITE_EXTERNAL_STORAGE
    VIBRATE · WAKE_LOCK

SMS yok, rehber yok, kamera yok, erişilebilirlik yok. İzin listesine
bakarak "veri hırsızı" denemez.

### 4. Ağ uçları

`classes.dex` içindekiler reklam ağları (AdColony, Google Ads) ve
`api.mctoolbox.app` — Toolbox'ın kendi uçları. Tuhaf bir komuta
sunucusu, `.tk`/`.xyz` gibi tek kullanımlık alan adı **bulunmadı**.

## Hüküm — dürüstçe

**Kesin kanıt bulunmadı.** Ne veri çalan bir kod, ne tuhaf bir sunucu,
ne tehlikeli bir izin.

**Ama kurulmamalı**, ve sebebi "virüs buldum" değil, şu:

> Bu paket **doğrulanamayacak biçimde** yapılmış. Herkesin bildiği bir
> anahtarla imzalanmış, üstüne kod çözmeyi engelleyen bir koruyucudan
> geçirilmiş, ve içinde **Microsoft hesabı giriş yolu** var. Bu üçü bir
> arada olunca "değiştirilmemiş" demenin bir yolu kalmıyor.

Yani asıl mesele bulunan bir şey değil, **bakılamayan bir şey**.

## Savunma açısından ne anlama geliyor

Toolbox **istemci tarafı** bir araç. Çok oyunculu bir dünyada
yapabilecekleri, sunucunun kabul ettikleriyle sınırlı:

| durum | ne olur |
|---|---|
| karşı taraf **operatör değil** | `/kill`, `/camera`, `/inputpermission`, `/playanimation` — hepsi reddedilir |
| karşı taraf **operatör** | hepsini yapabilir; v7.28 **Arınma** bunları geri alır |
| dünyada **hileler kapalı** | komut yolu tamamen kapalı |
| Minecraft sürümü **1.19.73'ten yeni** | bu paket oyuna hiç bağlanamaz |

### Arınma'nın kapsamadığı

- **Blok/dünya düzenleme.** Toolbox'ın asıl işi bu ve bir davranış
  paketi bunu engelleyemez. Karşılığı yedek almak.
- **`/kill`.** Zırh, direnç, totem dinlemiyor.
- **Operatör yetkisi vermek.** Verildikten sonra yazılımsal savunma
  kalmıyor.

Yani en güçlü savunma kodda değil: **operatör yetkisi verme, PvP
dünyasında hileleri kapat.**

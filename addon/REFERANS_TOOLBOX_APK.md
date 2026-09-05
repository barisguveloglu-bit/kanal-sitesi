# Toolbox yeniden paketleri — statik inceleme

İki dosya incelendi. **İkisi de kurulmadı, çalıştırılmadı.**

| | MH_TEAM_V5 | Toolbox_1.20.51_mod | FerSReD_Client_V2 |
|---|---|---|---|
| boyut | 10.490.716 | 7.651.691 | 28.401.794 |
| sha256 | `efa1ecdb…702786` | `f21d7bbd…ba7fd9` | `097f5433…ddd673` |
| paket adı | `io.mrarm.mctoolbox` | `io.mrarm.mctoolbox` | **`io.mrarm.mctoolbox`** |
| imza | **AOSP test anahtarı** | **AOSP test anahtarı** | **AOSP test anahtarı** |
| koruyucu | NP Manager (VM) | NP Manager (akış karıştırma) | NP Manager (VM) |
| MC sürümü | 1.19.50 – 1.19.73 | yalnız 1.20.51 | **24 sürüm**, 1.16.221 – 1.19.51 |
| ek kütüphane | yok | yok | yok |
| şüpheli alan adı | yok | yok | yok |
| kendi izi | — | — | `dsc.gg/fersred-official` |

**Üçü de aynı şey.** Adları farklı ("MH TEAM", "mod", "Client") ama
üçü de `io.mrarm.mctoolbox` — yani **Toolbox'ın yeniden paketlenmiş
hâli**. Üçü de aynı herkese-açık anahtarla imzalı, üçü de aynı Çin
yapımı koruyucudan geçmiş.

`FerSReD_Client_V2` adında "Client" geçmesi yanıltıcı: ayrı bir hile
istemcisi değil, Toolbox'ın kendisi. Stok Toolbox'ta olmayan tek şey
paketleyenin kendi Discord bağlantısı.

İlk ikisinde paketleyicinin e-postası birebir aynı (2863678687@qq.com),
sekiz ay arayla iki iş.

## İkincide ek olarak çıkanlar

**Koruyucunun işlevi bu sefer yazılı:** `Function: 控制流混淆` —
*kontrol akışı karıştırma*. Yani kodun ne yaptığının izlenmesini
engellemek, açıkça amaç olarak beyan edilmiş.

**`android.permission.DUMP` — yanlış alarm.** Manifest'te görünce
şüphelenildi, ama nereden geldiğine bakıldı: AndroidX WorkManager'ın
`DiagnosticsReceiver`'ı. Standart kütüphane, paketleyenin eklediği bir
şey değil. (Zaten sistem uygulaması olmayan bir uygulamaya
verilmiyor.)

**Neyin değiştirildiği bulunamadı.** `checkLicense` duruyor ama akış
karıştırma yüzünden neye dönüştüğü izlenemiyor. Toolbox'ın ücretli
özellikleri olduğu için en olası açıklama "premium kilidi açma" — ama
bu bir **tahmin**, kanıt değil. Kanıtlanamaması zaten koruyucunun
işlevi.

## Ortak hüküm

İkisinde de **kötü niyet kanıtı bulunamadı**: tuhaf komuta sunucusu
yok, tehlikeli izin yok, `.tk`/`.xyz` gibi tek kullanımlık alan adı
yok. Uçlar Toolbox'ın kendi sunucuları, reklam ağları ve Microsoft.

Yine de kurulmamalı, ve sebep "virüs buldum" değil:

> Herkesin özel anahtarını bildiği bir anahtarla imzalanmış + kod
> izlemeyi engelleyen bir koruyucudan geçirilmiş + içinde Microsoft
> hesabı giriş yolu var. Bu üçü bir aradayken "değiştirilmemiş"
> demenin bir yolu yok.
>
> Mesele bulunan bir şey değil, **bakılamayan bir şey.**

## DÖRDÜNCÜ DOSYA BAŞKA BİR ŞEY — MuCuteClient

`MuCuteClientMCPE1.21.apk` · sha256 `ddb7e173…6abe1e` · 6.196.433 bayt

Üstteki üçüyle **aynı aileden değil.** Kurulmadı, çalıştırılmadı.

| | önceki üçü | MuCuteClient |
|---|---|---|
| ne | Toolbox yeniden paketi | **paket vekili (proxy)** |
| imza | AOSP test anahtarı | **`CN=Su Mucheng`** (gerçek geliştirici) |
| koruyucu | NP Manager | **yok** |
| Minecraft kütüphanesi | sürüm sürüm derlenmiş | **hiç yok** |
| sürüm bağı | 1.16–1.20.51 (ölü) | **protokol — sürümden bağımsız** |

### Nasıl çalışıyor

`classes.dex` içinde **netty 2072**, **raknet 72**, `Relay`, `Proxy`,
`Localhost` geçiyor; Minecraft'ın yerel kütüphanelerinden **hiçbiri
yok** (sadece standart `libandroidx.graphics.path.so`).

Yani oyunu değiştirmiyor: **araya giriyor.** Telefonda yerel bir
sunucu açıyor, Minecraft ona bağlanıyor, o da gerçek sunucuya
bağlanıp aradaki paketleri değiştiriyor.

### Bu neden önemli

1. **Sürüme bağlı değil.** Öteki üçü belirli Minecraft sürümlerine
   derlenmiş yerel kütüphanelere muhtaç ve bu yüzden bugün ölüler.
   Bu protokolü konuşuyor — 1.21'de çalışıyor, sonrasında da
   çalışmaya devam eder.
2. **Operatör gerekmiyor, sunucu fark etmiyor.** Komut çalıştırmıyor;
   kendi paketlerinde yalan söylüyor.
3. Yani **hâlâ hayatta olan ve gerçekten karşımıza çıkabilecek tür
   bu.**

### İyi haber: v7.30 tam buna göre yazılmış

Vekil de olsa **sunucuya inandırıcı paket göndermek zorunda.** Gözcü
ölçümlerini sunucunun ALDIĞI şeyden yapıyor — yani yalan söyleyen
istemci kendi yalanı üzerinden ölçülüyor.

Bulunan özellikler ve karşılıkları:

| özellik | Gözcü |
|---|---|
| Killaura | ✓ açı + hız |
| Speed · Fly · High Jump · Air Jump · Auto Walk | ✓ hareket |
| No Clip | ✓ hareket (ışınlanma/hız) |
| **Velocity (anti-knockback)** | **henüz yok** |
| Zoom · Full Bright · Night Vision · Tracer | ✗ mümkün değil (GÖRÜNTÜ) |

Tek gerçek boşluk **Velocity**: geri itme sonrası oyuncunun gerçekten
gidip gitmediği ölçülebilir, ama v7.30'da yok.

### İzinler — ikisi dikkat çekiyor

    INTERNET · FOREGROUND_SERVICE(+SPECIAL_USE) · POST_NOTIFICATIONS
    VIBRATE · DUMP · SYSTEM_ALERT_WINDOW · QUERY_ALL_PACKAGES

- `SYSTEM_ALERT_WINDOW` — başka uygulamaların üstüne çizme. Menüsünü
  Minecraft'ın üstünde göstermek için; bu tasarımda beklenen.
- `QUERY_ALL_PACKAGES` — **telefondaki bütün uygulamaları listeleme.**
  Bir paket vekilinin buna ihtiyacı yok. Google bu izni sebepsiz
  kısıtlamıyor.

**Depolama izni YOK** — dünya dosyalarına hiç dokunmuyor. Vekil
mimarisiyle tutarlı.

### Hüküm

Öncekilerden farklı olarak burada **yeniden paketleme yok**: imza
geliştiricinin kendi anahtarı, koruyucu katmanı yok, kod okunabilir
durumda. Yani "kim değiştirdi bilinmiyor" itirazı bu dosya için
geçerli değil.

Geriye kalan itiraz başka: mağaza dışından gelen, denetlenmemiş bir
uygulamaya **oyun trafiğini ve gerektiğinde hesabını** emanet etmek.
Bir de ihtiyacından fazla izin istiyor.

---

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


---

# MH_TEAM_V5 · PvP DURUM RAPORU (v7.39)

Kullanıcı bir düelloya çıkıyor ve rakibin bu dosyayı kullandığını
biliyor: *"bakalım PvP'de ne kadar yetenekliyiz."*

Rakamlar `savunma_olc.py`'den, o da bu dosyadaki ve
`REFERANS_SAVUNMA_PLANI.md`'deki ölçülmüş özellik listelerinden.

## Önce en önemli şey: bu paket senin dünyana giremez

MH_TEAM_V5'in içindeki Toolbox çekirdekleri **beş sürüm** için
derlenmiş:

    1.19.50.02 · 1.19.51.01 · 1.19.63.01 · 1.19.71.02 · 1.19.73.02

Bizim eklentinin `min_engine_version` değeri **1.21.0**. Yani
dünyanın 1.21+ üzerinde çalışıyor.

Toolbox bir **enjektör**: oyunun belleğine kendi `.so`'sunu
bağlıyor ve o `.so` oyunun tam sürümüne göre derleniyor. Eşleşen
çekirdek yoksa **hiçbir şey yapamaz** — hile menüsü açılır ama
oyuna bağlanamaz.

> **Rakip 1.21'de oynuyorsa MH_TEAM_V5'in 65 özelliğinin 65'i de
> ölüdür.** Aşağıdaki tablonun tamamı, o dosyanın çalıştığı bir
> sürüme *inmesi* hâlinde geçerli.

Bu, kodda yazdığımız hiçbir savunmadan daha güçlü. Düellodan önce
tek soru: **hangi sürümde oynuyoruz?**

## Çalıştığını varsayarsak — sayılar

Toolbox ailesinin (MH_TEAM_V5 · WDBAX · BloodyClient — üçü aynı)
bu ölçümde **55 özelliği** var:

| durum | sayı |
|---|---|
| **kapalı** (bizim kod görüyor) | **24** |
| açık (ölçülebilir, yazılmadı) | 6 |
| ayırt edilemez | 6 |
| operatör kapısı | 5 |
| **imkânsız** (ekran tarafı) | 14 |

- **Ham kapsam: %44**
- **Engellenebilirin kapsamı: %80** ← anlamlı olan

WClient'e karşı %75; yani MH_TEAM_V5'e karşı **daha iyi**
durumdayız. Sebebi basit: WClient bir vekil, oyun sürümüne
bağlı değil ve daha yeni modülleri var.

## Düelloda ne olur — aile aile

### Sana zarar veremeyecekleri (kapalı)

| onun özelliği | senin karşılığın |
|---|---|
| killaura · reach · hitbox_expand | **Gözcü** — menzil + bakış açısı + CPS |
| anti_knockback | **Geri itme denetimi** |
| fly · speed · high_jump · air_jump · tap_teleport | **Hareket denetimi** |
| no_clip · phase | **Katı blok içinde** *(Savunma Kipi açıkken)* |
| fast_destroy · rapid_build · bridge_builder · nuke · haste | **Blok hızı denetimi** |
| bloklarla hapsetme | **Kafes Kır** |
| komutla kilit · ekran · ses · sis | **Arınma + Savunma Kipi** |
| envanteri `/clear` ile silme | **Envanter Yedeği** |

Hepsi **bildirim** üretiyor, otomatik ceza yok — bu bilinçli:
yanlış alarmın bedeli kaçan hileden büyük.

### Hâlâ açık olanlar (6) — ölçülebilir ama yazılmadı

`no_fall` · `jesus` · `slow_falling` · `blink` ·
`far_bypass` · `pick_distance`

Düellodaki karşılığı: rakip yüksekten atlayıp hasar almayabilir,
su üstünde yürüyebilir, blok koyma mesafesini uzatabilir. Hiçbiri
doğrudan sana vurmuyor.

### Ayırt edilemeyenler (6)

`auto_armor` · `auto_bow` · `switcher` · `auto_sprint` ·
`no_slowdown` · `chest_stealer`

Envanter otomasyonu. Sunucuya geliyor ama hızlı oynayan bir
insandan ayrılamıyor. Bunlara "tespit" demek yalan olurdu.

### Operatör kapısı (5)

`give_item` · `enchant` · `nbt_editor` · `spawn_exp` ·
`/kill`-`/damage`-`/summon`

**Kod değil, karar.** Operatör yetkisi verme; verirsen buradaki
hiçbir satırın anlamı kalmaz.

### İmkânsız (14) — dürüstçe

`xray` · `chest_esp` · `player_esp` · `tracers` · `minimap` ·
`freecam` · `fullbright` · `zoom` · `hp_bars` · `armor_hud` ·
`outline_renderer` · `name_override` · `force_achievements` ·
`xray_block_tracker`

Rakip **duvarın arkasından** seni, sandığını ve canını görüyor.
Sunucuya hiçbir şey göndermiyor; bir davranış paketi bunu ne
görebilir ne engelleyebilir. Buraya bir "xray denetimi" eklemek
sahte güven üretmek olurdu.

**Tek gerçek karşılığı kod değil, düzen:**

- **Açık arazide dövüş.** Xray'in ve ESP'nin değeri saklanan
  bilgidir; saklanacak bilgi yoksa değeri de yok.
- **Tuzak ve gizli sandık kurma.** Görüyor.
- **Canını saymasına göre oynama** — HP barları onda var.

## Düello öncesi kontrol listesi

1. **Sürümü sor.** 1.21+ ise bu dosya zaten ölü.
2. **Operatör yetkisi verme.** Beş özellik tek başına burada
   kapanıyor.
3. **Savunma Kipi'ni aç.** İki denetim (katı blok, oyun kipi geri
   alma) yalnız o açıkken çalışıyor.
4. **Açık arazi seç.** Göremediğimiz 14 özelliğin karşılığı bu.
5. Gözcü bildirimlerini izle — hüküm senin.

## v7.39'da düello için değişen şey

Yıldırım yetenekleri artık **oyunculara da kilitleniyor.** Önceki
hâlde dördü de oyuncuyu bilerek atlıyordu:

    yon_simsegi   kilitliHedef'e oyuncuDahil geçmiyordu
    bot_guc       aynı
    alan_simsegi  MUAF listesinde minecraft:player vardı
    coklu_simsek  COKLU_OYUNCU = false

Yani **PvP'de nişan yardımı hiç çalışmıyordu.** Ayrıca kilit artık
"en yakın varlık" yerine "nişangâha en yakın açı" ile seçiliyor —
araya giren tavuk kilidi kapmıyor.

# WClientv36.0.apk — statik inceleme

**Hiçbir şey çalıştırılmadı.** `unzip` + `strings` + `file`, ve
`AndroidManifest.xml` ile `classes.dex`'in **tablolarını** okuyan
küçük betikler. `classes.dex` için ayrıca sınıf başına
`const-string` sabitleri çıkarıldı — bytecode **yorumlanmadı**,
yalnızca tarandı. Modül adları bu yolla bulundu, çünkü sınıf
adları gizlenmiş (`o5/q`, `p5/z` gibi).

## Kimlik

| | |
|---|---|
| dosya | `WClientv36.0.apk`, 16.582.034 bayt |
| md5 | `69bcc6068eac5d4650d3c8b7403c5878` |
| paket adı | `com.retrivedmods.wclient`, sürüm **v36.0** |
| site | `https://wclient.in` (© 2026) |

## Bu bir Toolbox kopyası DEĞİL — başka bir tür

Elimizdeki önceki üç dosya (Toolbox, WDBAX, BloodyClient) hep
aynı şeydi: **oyunun içine giren bir araç.** WClient farklı bir
mimari:

    Minecraft  →  127.0.0.1:19132  →  WClient  →  gerçek sunucu

Telefonda bir **vekil (relay)** çalışıyor. Oyun kendi
telefonundaki bu vekile bağlanıyor, vekil gerçek sunucuya
bağlanıyor ve **aradan geçen paketleri yeniden yazıyor.**

Kanıtlar dosyanın içinde:

- `com/retrivedmods/wclient/service/RelayService`,
  `com.retrivedmods.wrelay.capture.start`, arayüzde
  "Relay Connected / Relay Disconnected"
- `org.cloudburstmc.protocol.bedrock.*` — **1803 tip**: Bedrock
  protokolünün tamamı, paket paket
- `org.cloudburstmc.netty.channel.raknet.*` — RakNet katmanı
  (Bedrock'un taşıma protokolü)
- `net.raphimc.minecraftauth` — Microsoft/Xbox girişi; hesabı
  vekil açıyor
- `127.0.0.1` · `0.0.0.0` · `19132`
- `protocol_mapping.txt` → desteklenen protokol sürümleri,
  **53'ten 898'e** kadar
- `assets/mcpedata/` (41 MB) → blok/eşya tabloları ve
  `block_hardness.json`; sunucudan bağımsız kendi oyun bilgisi
- `libwcnative.so` → yerel kod içinde `VerifyNet`,
  `Java_com_retrivedmods_wclient_auth_*`: lisans/oturum denetimi

Kurulu sunucu listesi de içinde geliyor: `2b2t.org`,
`donutsmp.net`, `lifeboat`, `applemc`, artı kullanıcının kendi
ekleyebildiği sunucular.

### Neden önemli

Toolbox oyunun sürümüne bağlıydı (beş ayrı `libtoolbox-*.so`).
Vekil değil: **protokol** konuşuyor, yani oyun güncellenince
kırılmıyor ve **operatör yetkisi hiç istemiyor.** Buna karşılık
sunucuya gönderdiği her şey **hâlâ paket** — yani ölçülebilir
olanlar ölçülebilir kalıyor.

## İzinler — öncekilerden geniş

`INTERNET` · `MANAGE_EXTERNAL_STORAGE` · `SYSTEM_ALERT_WINDOW`
(üstte kaplama) · `FOREGROUND_SERVICE` + `_SPECIAL_USE`
(arkada sürekli çalışma) · `QUERY_ALL_PACKAGES` (kurulu
uygulamaları görme) · `POST_NOTIFICATIONS` ·
`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` · `DUMP` · `VIBRATE` ·
`WAKE_LOCK`

Reklam SDK'sı **yok** (Toolbox kopyalarında vardı). Buna karşılık
`QUERY_ALL_PACKAGES` + `MANAGE_EXTERNAL_STORAGE` + kaplama
penceresi, Toolbox'ın istemediği kadar geniş bir yetki kümesi.

## Modüller (sınıf sabitlerinden çıkarıldı)

**DÖVÜŞ** (`o5/`) — ACA · AutoCrystal (`auto_crystal`,
`end_crystal`) · CrystalSmash · AutoFight · AutoHVH ·
EnemyHunter · HitAndRun · Hitbox (görselleştirmeli) ·
InfiniteAura · Killaura · WAura · Switcher

**HAREKET** (`p5/`) — AntiAFK · AntiVoid · AutoWalk · BHop ·
Fly · HighJump · Jetpack · JitterFly · MotionFly · NoClip ·
OpFightBot · Phase · PlayerTP · Speed · Spider · **TPMine**

**GÖRÜNTÜ** (`q5/`) — BlockESP (cevher renkleri: kömür, bakır,
elmas, zümrüt, altın, demir, lapis, redstone, kuvars, ancient
debris) · ChestESP (varil, ışıldak, fırın, huni…) · ESP ·
Nametags · Minimap · Crosshair · ArmorESP · HealthBars ·
Fullbright · Zoom · SpeedDisplay · NetworkInfo · ModAlert

**ETKİ** (`r5/`) — AntiDebuff · EffectSpoof (bütün etki
listesi) · FreeCamera · Particles · TimeShift ·
WeatherController

**ÇEŞİTLİ** (`misc/`) — StashFinder · ChunkFinder (yerleştirilmiş
deepslate oranından "şüpheli chunk" buluyor) · InventoryHelper ·
AutoTotem · FastDrop · FastMiner · GamemodeSwitcher · FakeDeath ·
FakeXP · AutoDisconnect · Disabler · Desync · PingSpoof · Blink
(paket kuyruğu) · TotemPopCounter · Spammer · ChatSuffix ·
FriendList · ReplayModule (hareket kaydı/oynatımı) · Watermark

## Bizde karşılığı — ne yapıldı, ne yapılamadı

### Zaten kapalıydı (v7.28–7.36)

| WClient modülü | bizdeki karşılık |
|---|---|
| Killaura · WAura · InfiniteAura · AutoFight | **Gözcü** menzil + bakış açısı + CPS |
| Reach ailesi | **Gözcü** menzil |
| Speed · Fly · Jetpack · MotionFly · BHop · HighJump | **Hareket denetimi** |
| PlayerTP · ClickTP | **Hareket denetimi** (ışınlanma) |
| Velocity / anti-knockback | **Geri itme denetimi** (v7.31) |
| FastMiner · nuke · rapid build | **Blok hızı denetimi** (v7.36) |
| bloklarla hapsetme | **Kafes Kır** (v7.36) |
| komutla kilit · ekran · ses · sis | **Arınma + Savunma Kipi** |

### v7.38'de EKLENEN dört denetim

1. **Aynı tickte aynı kurbana çoklu vuruş** — bütün dövüş
   modüllerinde bir `packetsPerAttack` ayarı var: tek sallışta
   birden fazla saldırı paketi. Gözcü'nün CPS ölçümü bunu bir
   saniyede yakalıyordu; bu ölçüm **aynı tickte** yakalıyor ve
   yanlış alarm payına ihtiyacı yok — bir insan tek tickte iki
   kez vuramaz. *Aynı kurban* şartı var, çünkü aynı tickte
   farklı varlıklara vuran kendi alan yeteneklerimiz var.
2. **Oyun kipi denetimi** — `GamemodeSwitcher`. Bildirim her
   zaman; **geri alma yalnız Savunma Kipi açıkken**, çünkü
   kendi dünyasında inşa yaparken yaratıcı kipe geçen ev
   sahibini zorla düşüren bir mod, hilecilerden önce kendi
   kullanıcısını kaçırır.
3. **Katı blok içinde** — `NoClip` · `Phase` · `TPMine`. Üst
   üste dört örnek boyunca hem ayak hem baş hizası dolu ise
   işaret. **Yalnız Savunma Kipi açıkken çalışıyor**, sebebi
   blok okuma bütçesi (aşağıda).
4. **Savaştan kaçış** — `AutoDisconnect`
   (*"Sent '/lobby' at 6.0 HP"*). Çıkışı durdurmak mümkün
   değil; ölçülebilen şey son hasardan kaç saniye sonra
   çıktığı ve o an kaç canı kaldığı. Bildirim "hile" demiyor,
   **ölçüyü** söylüyor — gerçek kopmalar da aynı pencereye düşer.

### Karşılığı OLMAYANLAR — dürüstçe

**Bütün görüntü ailesi** (`q5/`) ve `StashFinder`/`ChunkFinder`:
BlockESP cevheri duvarın arkasından gösteriyor, ChestESP sandığı,
Nametags ve Minimap oyuncuyu, FreeCamera kamerayı bedenden
ayırıyor. Bunların hiçbiri sunucuya bir şey **göndermiyor** —
tamamen karşı tarafın ekranında. Bir davranış paketi bunları
ne görebilir ne engelleyebilir. Buraya "xray denetimi" eklemek
sahte güven üretmek olurdu.

Tek gerçek karşılık kod değil, **düzen**: bilgi saklamayan bir
dövüş (açık arazi, gizli sandık/tuzak kurmamak).

`AntiDebuff` de buraya düşüyor ama sebebi farklı: vekil
sunucudan gelen etki paketini **istemciye ulaşmadan** düşürüyor.
Sunucu tarafında etki hâlâ duruyor, yani biz `getEffect` ile
baksak da bir şey görmeyiz — ölçülecek bir iz yok. Buna karşılık
işine de fazla yaramıyor: hasar sunucu tarafında uygulanıyor.

`AutoTotem` · `InventoryHelper` · `Switcher` · `FastDrop`:
envanter otomasyonu, insanın hızlı yapmasından ayırt edilemez.

`Disabler` · `Desync` · `PingSpoof` · `Blink`: paketi geciktirip
toplu gönderiyorlar. İzleri hareket denetimindeki ışınlanma
ölçümüne düşüyor ama bu **tesadüfi bir yakalama**, ölçüm bunun
için yazılmadı — öyleymiş gibi davranılmıyor.

### Blok okuma bütçesi — ölçülmüş bir kısıt

Katı blok denetimi ilk yazılışında her taramada iki blok
okuyordu ve **dört test birden düştü** ("hiç blok okunmuyor ::
80 okuma"). Bu depoda boşta duran modun blok okumaması bir
kural. İki koşula bağlandı: Savunma Kipi açık **ve** oyuncu
kımıldamış olacak. Ücreti açıkça: **düğme kapalıyken noclip
yakalanmaz.**

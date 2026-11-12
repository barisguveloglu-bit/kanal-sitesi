# Şimşek Düello Sunucusu — kurulum rehberi (v7.99.16)

Kullanıcının kararları (2026-10-27):
- *"BDS + sıkı ayarlar + izin listesi tamam, bunu daha da geliştir, sunucuya başla."*
- *"Sunucu setini daha da iyileştir, her şeyini kontrol et; sonucu özel, yani
  dövüşler yapılacak yer olmalı ve savunması güzel ve iyi olmalı."*

Bu, üç aşamalı planın **1. aşaması**: dövüşler kendi Bedrock Dedicated
Server'ımızda (BDS), gökte kurulu kapalı bir arenada yapılır. Mojang'ın sıkı
ayarları açıktır, oyuncular macera kipindedir, sunucuya yalnız izin listesindekiler
girer. 2. aşama (giriş sınavı odası) ve 3. aşama (paket katmanında hile önleyici)
**yazılmadı**; karar kullanıcının.

Kurulum seti: `addon/sunucu/`. Kilitleri `test/sunucu.mjs` tutuyor.

## Ne kazandırıyor, ne kazandırmıyor

| hile ailesi | eklenti tek başına | bu sunucuda |
|---|---|---|
| hareket (uçma, hız, duvardan geçme, örümcek…) | ölçüp **bildiriyor** | sunucu konumu sıkı denetleyip **düzeltme** gönderiyor; eklentinin ölçümü de sürüyor |
| vuruş (menzil, killaura) | ölçüp bildiriyor | oyuncular arası etkileşim sıkı kipte, vuruş yönü sınırı 0,85; eklentinin ölçümü de sürüyor |
| blok (hızlı kırma, nuke, hızlı inşa, köprü, bloklarla hapsetme, uzaktan koyma/kırma) | ölçüp bildiriyor | **macera kipi**: oyuncu blok kıramaz ve koyamaz, sunucu bu paketleri reddeder |
| arenadan kaçış (inci, savrulma, rüzgâr yükü) | — | görünmez duvar ve tavanla kapalı kutu |
| op ve komut ailesi (`/give`, `/gamemode`, `/kill`) | "op verme" kuralına bağlı | `allow-cheats=false`: oyuncuya komut yok |
| tanımadığın biri | herkes girebilir | izin listesinde yoksa **giremez** |
| sohbet seli (spammer) | — | paket hız sınırı: saniyede 2 mesaj, en fazla 10'luk patlama |
| görüntü ailesi (xray, ESP, minimap, freecam…) | imkânsız | **yine imkânsız**: rakibin ekranında olur. Tek karşılık düzen: arenada saklanacak yer ve gizli bilgi yok |
| envanter otomasyonu | ayırt edilemez | **yine ayırt edilemez** |
| blink, ping spoof, desync, disabler | ayırt edilemez | **yine** (paket katmanı ister, 3. aşama) |

Sıkı kipin bedeli Mojang'ın kendi metninde yazılı: **yüksek gecikmeli dürüst
oyuncu da geri çekilir** (rubber-band). Hangi hileyi ne kadar kestiği bizde
ölçülmedi; istemciyle bağlanıp denenmedi (aşağıda).

## Arena

`sunucu/arena.komut` — sunucu konsoluna giden komutların düz listesi;
`arena_kur.py` onları sırayla gönderip her birinin cevabını denetliyor.

| | ne | neden |
|---|---|---|
| yer | gökte, y 290–307 | doğal arazi oraya çıkmaz; hangi tohumla olursa olsun boş havaya kurulur |
| kutu | 42×42 dış, iç alan 40×40, yükseklik 16 | iki oyuncu ve iki izleyici için geniş, saklanacak köşe yok |
| zemin | bedrock | kırılmaz, patlamaya dayanır |
| duvar ve tavan | barrier (görünmez) | inci, rüzgâr yükü ya da savrulma oyuncuyu dışarı atamaz; kırılmaz |
| kenar | duvarın en alt sırası bedrock | görünmez duvara çarpmadan nerede bittiği görünsün |
| doğuş | tam orta (20 291 20), `spawnradius 0` | herkes aynı yerde doğar ve yeniden doğar |
| yük | `tickingarea` (9 chunk) | oyuncu yokken de arena yüklü; yoksa `fill` reddediliyor (ölçüldü) |

Dövüş kuralları (`gamerule`): eşya kaybolmaz (`keepinventory`; deponun "oyuncu
eşyası asla kaybolmaz" kuralı), PvP ve düşme hasarı açık, ölüm mesajları açık,
yaratık doğmaz ve blok bozmaz, ateş yayılmaz, hep öğle ve açık hava (karanlık ya
da yağmur kimseye üstünlük vermesin; yağmur riptide'ı da açar), zorluk normal.

**Onarım:** yeteneklerimiz betikle blok değiştirebiliyor, zemin delinebilir.
Sunucu kapalıyken `python3 addon/sunucu/arena_kur.py --hedef ~/simsek_sunucu --yeniden`
arenayı baştan kurar (içini de boşaltır). Sunucu açıkken `arena.komut`
satırlarını konsola yapıştırmak da aynı işi görür.

## Macera kipi: bilinçli bir karar

`gamemode=adventure` + `force-gamemode=true`: oyuncu blok kıramaz ve koyamaz.
Blok ailesinin bütün hileleri böylece oyun kuralıyla kapanıyor. Kendi
yeteneklerimiz betikle blok değiştiriyor, kipten etkilenmiyor. Eklentide oyuncunun
blok koymasına dayanan bir eşya yok (`block_placer` aranıp bulunmadı).

Bedeli: dövüşte inşa da yok (kule, köprü). Blok kırma olayına bağlı özellikler
(mezar açma, Düşmüş, Asa'nın kırma kancası) bu sunucuda çalışmaz; düello için gerekli değiller.
Geri almak tek satır: `sunucu.properties`'te `gamemode=survival` (test de
değişir).

**Gözcü ile etkileşim (v7.99.17'de düzeltildi):** Gözcü yaratıcı kipe geçen
birini Savunma Kipi açıkken hep `survival`'a geri alıyordu; bu sunucuda geri
alınan oyuncu blok kırabilir hale geliyordu. Artık oyuncu hangi izinli kipten
geldiyse oraya dönüyor (burada `adventure`). Hiç izinli kipte görülmeden
yaratıcı kipte katılan biri için eski davranış sürüyor (`survival`).

## Gerekenler

- 64 bit Linux, **x86-64 (Intel/AMD) işlemci**. Mojang BDS'i yalnız x86-64
  için yayımlıyor; ARM sunucuda (bazı ucuz ya da ücretsiz planlar ARM) ancak
  çeviri katmanıyla, yavaş ve kararsız çalışıyor. Mojang'a göre Ubuntu 18 ve
  sonrası; burada Ubuntu 24.04'te denendi. Mojang'ın önerisi: en az 2 çekirdek,
  1 GB bellek; eklentimiz büyük olduğu için 2 GB daha rahat.
- `python3`, `curl`; isteğe bağlı `openssl` (sunucu kimliği için).
- Dışarıdan bağlantı için **TCP 19132** ve **UDP 19140–19199** açık olmalı
  (modemde port yönlendirme ya da kiralık sunucunun güvenlik duvarı).
- Sürekli açık bir makine: senin bilgisayarın ya da kiralık bir sunucu.
  Bilgisayar yoksa yol **kiralık sunucu**: telefondan bir SSH uygulamasıyla
  bağlanılıp kurulur. Telefon BDS çalıştıramaz. Claude'un bulut oturumu da olamaz: geçici ve
  dışarıdan bağlantı kabul etmiyor. Realms bu ayarları açmıyor.
- Windows için set **henüz yok** (BDS'in Windows sürümü var; sunucunun nerede
  çalışacağına karar verilince yazılır).

BDS'i kullanmak [Minecraft EULA](https://www.minecraft.net/eula)'sını kabul
etmek demek.

**Hazır barındırma hizmetleri (ör. Aternos) bu seti çalıştıramaz:**
kurulum betiği orada koşmuyor. Aternos'un kendi rehberine göre eklentiler
`packs` klasörüne yüklenebiliyor; sıkı ayarların (`server-authoritative-*`,
paket hız sınırı) orada değiştirilebilip değiştirilemediği **bilinmiyor**,
denenmedi. Arena komutları konsoldan elle yapıştırılabilir.

**Sunucu adı:** `ÖyleMc` (kullanıcının seçimi). Oyuncunun sunucu listesinde
gördüğü ad; dosyaya UTF-8 yazılıyor ve sunucu bu adla açıldı. Listede doğru
görünüp görünmediğine bir istemciyle bakılmadı.

### Bağlantı türü: neden nethernet

Mojang'ın 1.26.52.3'teki varsayılanı `nethernet`: oyuncu önce TCP 19132'ye
bağlanır, sonra oyun trafiği UDP'den akar. UDP portları normalde işletim
sisteminin rastgele aralığından seçiliyor; `server-udp-ports=19140-19199` ile
sabitlendi ki güvenlik duvarında açılacak portlar belli olsun.

Eski `raknet` (yalnız UDP 19132) **denendi ve bırakıldı**: IPv6'sı olmayan bu
makinede 19133'ü açamayınca sunucu hiç açılmadı ("Port [19132] may be in use …
Exiting program"). `nethernet` IPv6 yoksa IPv4'e düşüyor.

Modem arkasından bağlanılamazsa: Mojang'ın belgesine göre sunucu kendi yerel
adresini bildiriyor; dış adres farklıysa `server-udp-ports=<dış-ip>:19140-19199:19140-19199`
biçiminde dış adres yazılır. **Bu, bir istemciyle denenmedi.**

## Kurulum

```sh
bash addon/sunucu/sunucu_kur.sh --hedef ~/simsek_sunucu --izin "SeninGamertagin,Rakip"
SUNUCU_KOK=~/simsek_sunucu bash addon/sunucu/baslat.sh
```

Uzak bir sunucuda bağlantı kopunca kapanmasın diye: `tmux new -s simsek`
içinde başlat, `Ctrl+B D` ile ayrıl, `tmux attach -t simsek` ile konsola dön.

`sunucu_kur.sh` sırayla:

1. BDS **1.26.52.3**'ü resmî adresten (`www.minecraft.net`) indirir,
   SHA-256'yı betikte yazılı değerle karşılaştırır; tutmazsa kurmaz.
2. Mojang'ın o sürümle gelen `server.properties` dosyasını taban alır,
   yalnız `sunucu/sunucu.properties`'teki 23 anahtarı değiştirir (yoksa sona
   ekler), sonucu denetler. Mojang'ın metni depoya girmez. Eski dosya farklıysa
   (elle değiştirildiyse) `server.properties.onceki` olarak saklar.
3. Paket hız sınırını (`packetlimitconfig.json`) koyar.
4. `--dunya` verildiyse `.mcworld`'ü açar; var olan dünyanın üstüne yazmaz.
5. Üç paketi kurar ve dünyaya bağlar: mod, görünüm, oyuncu modeli. Kimlik ve
   sürüm her seferinde `manifest.json`'dan okunur; dünyanın kendi paketleri
   korunur.
6. `--izin` ile verilen Gamertag'leri izin listesine ekler.
7. Sunucu kimlik anahtarı yoksa üretir. Anahtar olmazsa her açılışta yeni
   kimlik olur ve oyuncu her seferinde "güven" sorusuyla karşılaşır.
8. Arenayı kurar (`--arenasiz` ile atlanır). `arena.komut` değişmedikçe
   ikinci kez kurmaz.

Tekrar çalıştırılabilir; güncelleme de aynı komut. Var olan dünya, izin
listesi, yetkiler ve anahtar korunur. Hedef klasör depo içindeyse reddeder;
o klasörde sunucu çalışıyorsa reddeder.

`baslat.sh` her açılıştan önce dünyanın yedeğini alır (`yedek/`, son 7 yedek).
Aynı klasörde ikinci bir sunucu açmaz. Çökerse 10 sn sonra yeniden açar;
10 dakikada 5 çökmeden sonra vazgeçer. Konsolda `stop` düzgün kapatır.

### İlk açılışta

- **İzin listesi boşsa kimse giremez.** Konsoldan: `allowlist add <Gamertag>`
  (boşluk varsa tırnak içinde).
- Kendini operatör yapmak için konsoldan: `op <Gamertag>`.
  `allow-cheats=false` olduğu için operatör de komut çalıştıramaz; gerekirse
  konsoldan `changesetting allow-cheats true` (dosyayı değiştirmez, yeniden
  açılışta geri gelir).
- Rakip sunucuya IP ve 19132 portuyla bağlanır. Telefon, tablet ve Windows
  doğrudan bağlanabilir; konsollar doğrudan bağlanamıyor.

## Ayarlar ve gerekçeleri

Değerler BDS 1.26.52.3'ün gerçek dosyasından ve Mojang'ın
`bedrock_server_how_to.html` belgesinden okundu (2026-10-27).

| anahtar | Mojang'ın varsayılanı | bizim | neden |
|---|---|---|---|
| `allow-list` | true | true | yalnız davet edilenler |
| `online-mode` | true | true | Xbox doğrulaması; kapalıyken herkes istediği adla girer |
| `allow-cheats` | false | false | oyuncuya komut yok |
| `default-player-permission-level` | member | member | ilk giren operatör olmasın |
| `max-players` | 10 | 4 | düello + iki izleyici |
| `enable-lan-visibility` | true | false | yerel ağ listesinde görünmesin |
| `gamemode` · `force-gamemode` | survival · false | **adventure · true** | blok ailesi kapanıyor (yukarıda) |
| `difficulty` | easy | normal | açlık ve hasar düello ölçüsünde |
| `transport` | nethernet | nethernet | açıkça yazılı; varsayılan değişirse sessizce değişmesin |
| `server-udp-ports` | (rastgele) | 19140-19199 | güvenlik duvarı için belli portlar |
| `view-distance` | 32 | 10 | arena 3×3 chunk; uzağı göndermemek sunucuyu rahatlatır (ESP'yi kapatmaz) |
| `server-authoritative-movement-strict` | false | **true** | konum bilgisini daha az hoşgörüyle kabul eder |
| `server-authoritative-dismount-strict` | false | **true** | binekten iniş konumu sıkı |
| `server-authoritative-entity-interactions-strict` | false | **true** | oyuncular arası etkileşim sıkı |
| `player-position-acceptance-threshold` | 0.5 | 0.5 | Mojang: 1.0'ın üstü hileye kapı açar |
| `player-movement-action-direction-threshold` | 0.85 | 0.85 | vuruş yönü ile bakış yönü farkı; daraltmak hızlı dönen dürüst oyuncuyu da keser |
| `enable-packet-rate-limiter` | false | **true** | belgede var, gelen dosyada yok |
| `texturepack-required` | false | true | görünüm paketimiz zorunlu (aşağıdaki uyarıya bak) |
| `content-log-file-enabled` · `content-log-console-output-enabled` | false · false | true · true | betik ve içerik hataları görünsün |

**Bilinçli olarak yazılmayan:** `server-authoritative-block-breaking`.
Microsoft'un belge sayfasında (2025-06) var ama 1.26.52.3'ün gerçek dosyasında
**yok**; yalnız `...-pick-range-scalar` kalmış. Var olmayan bir ayarı yazmak
çalışmayan bir kilit uydurmak olurdu. Blok tarafını zaten macera kipi kapatıyor.

**Değiştirilmeyen:** `disable-custom-skins`. Saydam piksellerle "görünmez"
yapılmış skin PvP'de bilinen bir hile, ama açmak kendi skin paketimizi
(`Simsek_Skin`) de kapatırdı. Karar kullanıcının.

### Paket hız sınırı

Mojang'ın gelen dosyasındaki gruplar korundu, tek fark sohbet ayrıldı ve
sıkılaştırıldı. Paket adları gophertunnel'ın protokol listesinden.

| paket | ne | saniyede | patlama |
|---|---|---|---|
| 193, 4 | giriş (ağ ayarı isteği, el sıkışma) | 0,0013 | 1 |
| **9** | **sohbet** | **2** (Mojang 10) | **10** (Mojang 50) |
| 97 | kitap düzenleme | 10 | 50 |
| 93 | oyuncu skini | 10 | 50 |
| 154 | konum takip isteği | 20 | 60 |

Varsayılan algoritma (`defaultAlgorithm`) **bilerek yok**: bütün paketlere
biner, hareket paketi saniyede 20 geliyor ve oyuncuyu boğar.

## Beta API'leri ve dünya

Kurulum varsayılan olarak **deneysiz** bir dünya açar. Eklenti kararlı API'yle
çalışıyor; yalnız **sohbet komutları** (`chatSend`) Beta API ister ve kapalı
kalır. Menü ve eşyalarla tetikleme çalışır.

Beta API'li dünya istenirse: telefonda deneyi açık bir dünya kur, `.mcworld`
olarak dışa aktar, `--dunya dunya.mcworld` ile ver. Kurulum var olan dünyanın
üstüne yazmaz; arena o dünyanın göğüne kurulur. Barındırma hizmetleri de bu
yolu öneriyor; deney bir kez açılınca dünyadan geri kapatılamıyor.

## Paylaşım uyarısı

Sunucu, görünüm paketini **bağlanan herkese gönderir**. Bu paylaşmak demek.
Bu yüzden:

- Yalnız depodaki (paylaşılabilir izinli) paketler kurulur.
- `addon/yerel/` (kişisel kullanım izinli varlıklar) **asla** kurulmaz;
  `sunucu_kur.sh` onu hiç okumuyor, `sunucu_ayar.py` adı geçerse reddediyor.
- Iron Man uyumlu oyuncu modeli (`Simsek_Oyuncu_Modeli_IronMan`) kurulmuyor;
  gerekirse ayrıca karar verilir.

## Ölçülen ve ölçülmeyen

**Ölçüldü (2026-10-27, Ubuntu 24.04, BDS 1.26.52.3):**
- Sıfırdan kurulum, arena dahil 38,6 sn. BDS SHA-256'sı tuttu; 23 anahtar
  istenen değerde; sunucu "Game mode: 2 Adventure", "Difficulty: 2 NORMAL"
  ile açıldı.
- Arena: 32 komutun hepsi gönderildi ve doğrulandı. İlk `fill` bölge yüklenene
  kadar bir kez beklendi.
- Tekrar kurulum arenayı yeniden kurmadı ("zaten kurulu"); `--yeniden` var
  olan dünyada baştan kurup doğruladı.
- Açılış denemesi (`acilis_dene.py`): 2,2–2,7 sn'de açıldı. Mod paketi Pack
  Stack'te, paket hız sınırı açık, bağlantı kabul ediyor. `pa:kol_toprak`
  ve `pa:bot` motor tarafından tanınıyor. Arenanın dokuz noktası yerinde, on
  iki kural istenen değerde.
- **Ters yönde:** konsoldan zeminin ortası silinip `keepinventory` kapatılınca
  açılış denemesi ikisini de yakaladı ve 1 koduyla çıktı; `--yeniden`den
  sonra yine temiz.
- `baslat.sh` yedeği aldı ve `stop` ile 0 koduyla çıktı.
- `raknet` bu makinede açılmadı (IPv6 yok); `nethernet` açıldı.
- `test/sunucu.mjs`: 96 kontrol. 23 mutasyonun 23'ü yakalanıyor. Kaçan üç ilk
  deneme testin kendisindeki kusurdu ve düzeltildi: sahte `yerel` paketinin
  manifest'i yoktu, "bizim olmayan anahtar" artık bizim anahtarımızdı, Python'un
  bayt kodu önbelleği aynı saniyede değişen dosyanın eski hâlini koşturdu.

**Ölçülmedi:**
- Hiçbir istemci bağlanmadı (bu makinede oyun yok). Sıkı kipin dürüst
  oyuncuyu ne kadar geri çektiği, macera kipinin yeteneklerimizi nasıl
  etkilediği ve hangi hileyi ne kadar kestiği oyunda denenmeli.
- Telefondan IP ile bağlantı ve modem arkasından dış adres ayarı.
- Windows.

Yeniden denemek için: `python3 addon/sunucu/acilis_dene.py --hedef ~/simsek_sunucu`
(sunucu kapalıyken; açar, yoklar, arenayı ve kuralları denetler, kapatır,
kaydı `acilis_kaydi.txt`'ye yazar).

## Gerçek motorun eklentide bulduğu hatalar

`test/` altındaki her şey `@minecraft/server`'ın sahtesine karşı çalışıyor.
Paket gerçek motorda iki yoldan ölçülüyor:

| araç | neyi ölçer | süre |
|---|---|---|
| `python3 addon/sunucu/acilis_dene.py --hedef K` | **açılış**: motorun reddettiği JSON alanı, erken çalıştırmada çağrılan fonksiyon | ~10 sn |
| `python3 addon/sunucu/tarama_dene.py --hedef K --deneme` | **çalışma**: altı sahte oyuncu önce dürüstçe oynar (Gözcü yanlış alarm veriyor mu), sonra 325 yeteneği iki kez, 67 sohbet komutunu ve 600 eşyayı gerçek API'de çalıştırır; bota dokunur, ölür, yeniden doğar | ~7 dk |
| `python3 addon/sunucu/dunya_dene.py --hedef K` | **hazır dünya**: `Efsane_Dunyasi.mctemplate`'i geçici bir dünyada açar, doğum noktasının altında zemin olduğunu sorar | ~30 sn |
| `python3 addon/sunucu/tarama_dene.py --hedef K --deneme --asama hile` | **savunma duvarı**: yalnız dürüst oyun + hile taklidi (Gözcü, Arınma, Savunma Kipi, Yedek, Kafes Kır); yetenekler koşmaz | ~2,5 dk |

`tarama_dene.py` **yalnız deneme kurulumunda** çalıştırılır: yetenekler blok
kırar, arenayı bozar. `--deneme` yazılmadan çalışmaz; izin listesinde oyuncu
varsa (gerçek sunucunun işareti) reddeder. Koşu bitince paketi, manifesti ve
`level.dat`'ı eski hâline getirir; dünyanın blokları geri gelmez. Gerçek
sunucunu taramak istersen başka bir klasöre yeniden kur ve orayı tara.

### İlk açılışta bulunanlar (2026-10-27) — v7.99.17'de düzeltildi

| sayı | ne | düzeltme |
|---|---|---|
| 3 | `getDynamicProperty` erken çalıştırmada (`infintrix.js`, `error404.js`, `nefes.js`): kayıt açılışta okunamıyor, ilk yazışta üstüne yazılıyordu | okuma `worldLoad` olayına ertelendi (`yardimcilar.js` `dunyaHazirOlunca`) |
| 2 | "10/10 kol eşyası KAYITLI DEĞİL", "pa:bot KAYITLI DEĞİL" yanlış alarmı | iki denetim de dünya yüklenince koşuyor |
| 1 | açılış mesajı "@minecraft/server 2.0.0" | `API_SURUM`, üreteç manifestten yazıyor |
| 371 | `minecraft:armor` 1.21.0 biçiminde yok | bileşen kaldırıldı; koruma zaten `minecraft:wearable.protection`'da |
| 558 | `minecraft:icon` içinde `texture` şemada yok | 1.21.0 eşyalarda `{"textures": {"default": X}}` |
| 13 | "1.20+ Recipes require unlock data": tarifler **yüklenmiyordu** | `"unlock": {"context": "AlwaysUnlocked"}` |
| 7 | `must_see_forget_ticks` diye bir alan yok | `must_see_forget_duration` (saniye; 200 tick = 10 sn) |
| 4+4 | dört kupa bloğunda opak ve saydam malzeme karışık | hepsi `alpha_test` (odun ve ip dokusunda saydam piksel yok, ölçüldü) |

### Sahte oyunculu taramada bulunanlar (2026-11-11) — v7.99.17'de düzeltildi

| ne | etkisi | düzeltme |
|---|---|---|
| Arınma `fog @s remove 13` yazıyordu | sayı kimlikli sis (bilinen altı kimliğin üçü) **sökülmüyordu**; Savunma Kipi her taramada üç hata satırı basıyordu | kimlik tırnak içinde |
| Gözcü ve Kılıç `setGameMode("survival")` | API büyük harfle başlayan ad istiyor; Gözcü hata basıp komuta düşüyordu | `kipApiAdi` |
| Dönüşüm: bütçe doluyken `sonuc.hata` → TypeError | oyuncu hiçbir şey görmüyordu | `carpik.js`'teki aynı kontrol |
| Güç (PowerBorne) ve Nefes: itilemeyen hedefte eski imzaya düşüş | "Expected 2, received 4" asıl sebebi gizliyordu; Nefes'te o hedefin **hasarı da atlanıyordu** | `itmeUygula` |
| çıkmış oyuncuya yazma, menü açıkken çıkış, zaten silinmiş gölge | hata değil ama HATA satırı basıyordu | geçerlilik soruluyor |

Kilitler: `test/erken_calisma.mjs` (sahte motora erken çalıştırma modeli
eklendi), `test/motor_bicim.mjs` (beş biçim hatası dosya düzeyinde),
`test/arinma.mjs`, `test/donusum.mjs`, `test/gozcu.mjs`, `test/denetim.mjs`
(sahte oyuncunun oyun kipi artık gerçek API gibi: küçük harfli adı reddediyor).

### İkinci turda bulunanlar (2026-11-11) — v7.99.18'de düzeltildi

| ne | etkisi | düzeltme |
|---|---|---|
| **Efsanenin Dünyası zeminsizdi.** Yeni dünya biçiminde tek katlı düz katman listesi hiç blok üretmiyor (ölçüm tablosu `dunya_uret.py` `DUZ_KATMAN` üstünde) | dünyayı açan oyuncu doğar doğmaz boşluğa düşerdi | altta 64 kat hava, üstünde tek kat bedrock: zemin tasarımdaki gibi y=0 |
| Kılıç (sıfırlama) oyuncuyu 10 sn izleyici yapıyor, temizlik işi ~1 sn'de bitiyor | kalan 9 sn'de Gözcü "oyun kipi spectator" diye uyarıyor, Savunma Kipi açıksa oyuncuyu izleyicilikten **çekiyordu** | `kilicIzleyiciMi`: kipi bizim verdiğimizi Kılıç'ın defteri söylüyor |
| Gözcü geri almayı hep `survival`'a yapıyordu | macera kipindeki düello sunucusunda geri alınan oyuncu blok kırabilir hale geliyordu | oyuncu geldiği izinli kipe dönüyor |

**Dürüst oyun ölçümü.** Sahte oyuncular hiçbir yetenek kullanmadan yürüdü,
koştu, koşarak zıpladı, ikişerli yakın dövüştü (gerçek geri itilme) ve dört
blokluk sahanlıktan düştü: oyuncu başına en az 148 blok yol, 84 oyuncu-oyuncu
vuruşu. Gözcü bu aşamada **hiç uyarı vermedi**. Araç bu sayıların alt sınırını
soruyor; aşama boş geçerse "0 uyarı"yı kabul etmiyor.

### Savunma duvarı (2026-11-12) — v7.99.19

Hile taklidinin sonucu ve bulunan dört açık (katı blok ve hasarsız düşüş
bildirim üretemiyordu, hız iksiri hız ölçümünü kapatıyordu, sabit yükseklikte
uçuşun ölçümü yoktu) `REFERANS_SAVUNMA_PLANI.md` sonundaki "v7.99.19"
bölümünde. Aynı turda bulunan silah hatası: ateşli silahlar `cause:
"projectile"` yüzünden hiç hasar vermiyordu.

### Açık kalanlar — bilerek

| ne | neden dokunulmadı |
|---|---|
| `minecraft:player` içinde `minecraft:scaffolding_climber` şemada yok (uyarı) | `kaynak_dis/ironman/player.json`'dan geliyor; motor yok sayıyor, etkisi yok |
| `arathnido:SuitTexture0` küçük harf olmalı (komut seçicisi) | Iron Man eklentisinin kendi özellik adı; değiştirmek o eklentiyle uyumu bozar. Özellik betikte ve MoLang'de çalışıyor, yalnız `has_property` seçicisine kaydolmuyor |
| `scan_interval` 10'dan küçük (pa:okazor, pa:o_sey; "performansı etkileyebilir") | `ILKEL_AV_TARAMA = 4` bilinçli (üreteçte yazılı); motor değeri uyguluyor, yalnız uyarıyor |
| `ilkel.silah`: oyuncu olmayan varlıkta `minecraft:equippable` betikten okunamıyor | bilinen sınır, kodda yazılı; silah doğuşta ganimet tablosuyla veriliyor |

**Ölçülmeyen:** kaynak (görünüm) paketi. Sunucu motoru onu yüklemiyor;
ikonların ve modellerin ekranda doğru çizildiği yalnız oyunda görülür.
Sahte oyuncu da ekran görmez: menü, kamera ve HUD davranışı ölçülmedi.
Dürüst oyunda blok kırma ve koyma yok (sunucu macera kipinde); yüzme,
elitra ve binek de denenmedi. Gözcü'nün bunlardaki yanlış alarmı ölçülmedi.

## Sonraki aşamalar (yazılmadı)

- **2. aşama — giriş sınavı odası:** tuzak varlık (killaura), geri itme testi.
  1.26.52.3'ün dosyasında yeni bir anahtar görüldü: `allow-player-joining=false`
  iken oyuncu yalnız betik izin verirse giriyor (`AsyncPlayerJoinBeforeEvent`).
  Girişte betikle karar verme kapısı olabilir; **API'si incelenmedi**.
- **3. aşama — paket katmanı:** blink, ping spoof, desync, disabler. Bakılan
  hazır araç Oomph (istemci ile sunucu arasına giren hile önleyici): lisansı
  SSPL v1 (açık kaynak sayılmıyor, hizmet olarak sunana kaynak açma yükümlülüğü
  getiriyor); PocketMine-MP, Dragonfly ve PowerNukkitX'i destekliyor, **BDS
  listede yok**. Bizim eklenti yalnız BDS'te çalıştığı için ikisi birlikte
  denenmemiş bir yol.

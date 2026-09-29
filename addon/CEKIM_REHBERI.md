# Çekim Rehberi — oyun içinde video çekmek

Seçilen yol: **A yolu** — çekim Minecraft'ın içinde yapılır, görüntü
oyunun kendi görüntüsüdür, kayıt ekran kaydıyla alınır. Telefonda da,
bilgisayarda da çalışır.

Bu rehber v7.99.6'daki **Çekim Seti** için. Setin üç parçası var:

| parça | ne yapıyor |
|---|---|
| **Aktör** | Kamera karşısında oynayan karakter. Kendi başına hiçbir şey yapmaz; ne yapacağını sen söylersin: yürü, bak, eşya tut, vur. |
| **Kamera** | Hazır açılar: geniş, yan, omuz üstü, yakın, üstten, alttan, yörünge, takip. |
| **Sahne** | Zamanlanmış komut listesi. Bir kez yazarsın, her seferinde aynı oynar — tekrar çekim kolaylaşır. |

---

## 1. Kurulum (bir kez)

1. `Simsek_<sürüm>.mcaddon` dosyasını aç — paketler kendiliğinden kurulur.
2. Çekim için **ayrı bir dünya** aç (düz dünya ya da hazır bir harita).
   Dünya ayarlarında:
   - davranış ve kaynak paketlerini **etkinleştir**,
   - **Beta APIs** deneysel ayarını **aç** (sohbete komut yazabilmek için).
     Açmazsan komutlar yine çalışır ama `/scriptevent s:k cekim ...`
     diye yazman gerekir.
   - **Hileler açık** olsun (kamera ve HUD komutları için).
3. Kendine yetki etiketi ver (başkası dünyada aktör doğuramasın):
   `/tag @s add simsek_yetkili`

## 2. İlk sahne — 1 dakikada

Sohbete sırayla yaz:

```
cekim aktor a
cekim aktor b raxxan
```

İki aktör önüne gelir. `a` varsayılan skinle (Harkos), `b` Raxxan skiniyle. Şimdi hazır düello
sahnesini oynat:

```
cekim sahne duello
```

Olan şey: HUD gizlenir, sen görünmez olursun, kamera geniş açıdan
başlar; `a` Ruine kılıcıyla, `b` Solar ile kombolar atar; kamera yan
açıya, omuz üstüne, yörüngeye, yakın plana geçer; sonunda kamera sana
geri döner. **Kaydı sahneyi başlatmadan hemen önce başlat.**

Bir şey ters giderse: `cekim dur` — kamera, HUD ve görünürlük
anında geri gelir.

## 3. Komutlar

Hepsi `cekim` ile başlar. `hedef` = bir aktör adı ya da `ben` (sen).

### Aktör

| komut | ne yapar |
|---|---|
| `cekim aktor <ad> [skin]` | Aktörü önüne kurar. Aynı adla tekrar yazarsan yenisi doğmaz, olan buraya gelir. |
| `cekim skin <ad> <skin>` | Skin değiştirir (adla ya da numarayla). |
| `cekim skinler` | Skin listesi. |
| `cekim liste` | Dünyadaki aktörler. |
| `cekim sil <ad>` · `cekim temizle` | Bir aktörü / hepsini siler. |
| `cekim esya <ad> <eşya>` | Eline eşya verir: `cekim esya a pa:wom_ruine`, `cekim esya a diamond_sword`, `cekim esya a bos`. |
| `cekim bak <ad> <hedef>` | Yüzünü çevirir. |
| `cekim git <ad> <hedef> [kos]` | Hedefe yürür (ya da koşar), 1,6 blok kala durur. |
| `cekim git <ad> ileri <blok> [kos]` | Baktığı yöne o kadar blok yürür. |

### Dövüş

| komut | ne yapar |
|---|---|
| `cekim vur <ad> <hedef> [set] [tür]` | Hedefe bakar ve vurur. Tür: `oto` (kombonun sıradaki vuruşu, varsayılan), `kosu` (koşarak atılma), `hava` (sıçrayıp tepeden vuruş — aktör gerçekten havalanır). Hamle mesafesi, vuruş anı, geri itme, kırmızı yanıp sönme, kıvılcım ve ses gerçek. Set yazmazsan elindeki silahınki, eli boşsa yumruk. Örnek: `cekim vur a b kosu`. |
| `cekim savun <ad> [tick]` | Savunma duruşu (varsayılan 22 tick). **Önden** gelen vuruş hasar vermez, kalkan sesi çıkar, itme azalır. Arkadan gelen savunulamaz. |
| `cekim kacin <ad> [sol\|sag\|geri] [hedef]` | Hızlı yana/geriye kaçma adımı (2,4 blok). Hedef verirsen ona göre yön alır. |
| `cekim dovus <a> <b> [saniye] [tohum]` | **Kendi kendine dövüş.** İkisi yaklaşır, kombo atar, atılır, havadan vurur, savunur, kaçar. Aynı **tohum** + aynı başlangıç yeri = **aynı dövüş**: bir kez geniş açıdan, bir kez omuzdan çekip kurguda birleştirebilirsin. `cekim dovus dur` durdurur. |
| `cekim oyna <ad> <animasyon>` | Tek animasyon oynatır: `cekim oyna a ruine.ruine_auto_1` ya da tam ad `animation.x.y`. |
| `cekim animler [set]` | Setleri / bir setin vuruşlarını listeler. |

Setler: `ruine`, `longsword`, `satsujin`, `evil_tachi`, `nova`,
`herrscher`, `solar`, **`antitheus`**, altı asa (`wooden_staff` …
`netherite_staff`), `yumruk`.

### Karanlık Tırpan

Senin silahın: `pa:karanlik_tirpan`. Antitheus'un şeklinden esinlenen
kendi tasarımımız — uzun kara sap, ucunda iki yöne kıvrılan mor
parlak kenarlı hilal bıçak. Elde 3D görünüyor. Dövüş seti
**Antitheus'unki**: 4'lü kombo, koşarak atılma (agression) ve havadan
giyotin. Aktöre vermek için: `cekim esya a pa:karanlik_tirpan`.
Kendin tutarsan da aynı vuruşları atarsın.

Arka arkaya `vur` yazdıkça kombo ilerler (1→2→3…); 2 saniye vurmazsa
başa döner. Aktörler ölmez: can her vuruştan sonra dolar.

### Altyazı (Türkçe)

| komut | ne yapar |
|---|---|
| `cekim isim <ad> <görünen ad>` | Altyazıda görünecek ad: `cekim isim a Barış`. |
| `cekim soyle <ad> <söz>` | Ekranın altında **"Barış: söz"**. Aktör konuşurken başını ve elini oynatır. Süre metnin uzunluğundan (en az 2,5 sn). |
| `cekim anlat <metin>` | Anlatıcı satırı (isimsiz, italik): `cekim anlat Yıllar sonra...` |

Türkçe harfler ve büyük harf korunur. Sahne satırlarında da aynı:
`[40, "soyle a Buraya gelmemeliydin!"]`.

### Kamera

`cekim kamera <açı> <ad> [ad2] [süre]`

| açı | görüntü | ne zaman |
|---|---|---|
| `genis` | ikisini yandan ve yukarıdan, geniş | sahnenin açılışı, "kim nerede" |
| `yan` | ikisinin tam yanından, göz hizası | vuruş alışverişi |
| `omuz` | ilkinin omzunun üstünden ikinciye | karşılıklı konuşma, gerilim |
| `yakin` | yüze yakın plan | tepki, son söz |
| `ust` | tepeden aşağı | çember, kaçış |
| `dusuk` | yerden yukarı | "güçlü karakter" girişi |
| `yorunge` | etraflarında döner (süre tick) | büyük an, kombo sonu |
| `takip` | arkasından izler | yürüyüş, koşu |

- Açılar arası geçiş yumuşaktır (0,6 sn). İlk açı kesme olarak gelir.
- Kamera açılınca **sen görünmez olursun**, kadraja girmezsin.
- `cekim kamera birak` ya da `cekim dur` kamerayı sana geri verir.

**Kendi kamera yolun:** kameranın geçmesini istediğin yerlere git,
oraya bakarken `cekim nokta ekle` yaz (her yerde bir kez). Sonra
`cekim kamera yol 100` — kamera 100 tickte (5 sn) bu noktalardan,
her noktada senin baktığın yöne bakarak, yumuşak bir eğriyle geçer.
`cekim nokta sil` son noktayı, `cekim nokta temizle` hepsini siler.
(Fikir ReplayMod'dan; Bedrock'a biz yazdık.)

### Ekran

| komut | ne yapar |
|---|---|
| `cekim hud kapat` · `cekim hud ac` | Ekrandaki her şeyi (can, envanter, nişangah) gizler / geri getirir. |
| `cekim yazi <metin>` | Ekranın ortasına büyük başlık. Türkçe harf ve büyük harf korunur. |

### Sahne

| komut | ne yapar |
|---|---|
| `cekim sahne <ad>` | Hazır sahneyi oynatır. |
| `cekim sahneler` | Hazır sahneler: `duello`, `kapisma` (kendi kendine dövüş + kesmeler + altyazı), `konusma` (karşılıklı diyalog), `giris`. |
| `cekim dur` | Her şeyi durdurur, geri alır. |

## 4. Kendi sahneni yazmak

Sahneler `Simsek_TNT_ToprakTopu/scripts/ayarlar.js` içinde,
`CEKIM_SAHNELER` tablosunda. Her satır `[tick, "komut"]` — 20 tick =
1 saniye. Komut, sohbete yazdığının `cekim` kelimesi olmadan hâli:

```js
kovalama: [
  [0,   "kamera takip a"],
  [0,   "git a b kos"],
  [60,  "kamera yan a b"],
  [70,  "vur a b"],
  [110, "kamera yakin b"],
  [160, "birak"]
],
```

Son satır **her zaman `birak`** olmalı (test bunu kontrol ediyor).
Sahneyi kafanda kur, bana madde madde anlat — ben tabloya yazarım.

## 5. Kayıt

**Telefonda:**
- Telefonun kendi ekran kaydedicisi (bildirim çubuğu → Ekran kaydı).
  Ses kaydını **cihaz sesi** olarak seç.
- Oyun ayarları → Görüntü: **Görüş mesafesi** yüksek, **Kamera
  sallanması** (view bobbing) kapalı, **Bulut** isteğe bağlı.
- Çekimden önce bildirimleri kapat (Rahatsız Etme).

**Bilgisayarda:** OBS Studio (ücretsiz), 1080p 60 fps.

**Kurgu:** CapCut ya da sevdiğin herhangi bir düzenleyici. Her sahneyi
ayrı kaydedip kurguda birleştirmek, tek uzun çekimden kolaydır.

**İpuçları:**
- Her sahneyi 2–3 kez kaydet, en iyisini seç — sahne her seferinde
  aynı oynadığı için bu bedava.
- Gece sahnesi için `/time set night`, sabit gün ışığı için
  `/gamerule dodaylightcycle false`.
- Hava: `/weather clear` ya da `/weather thunder`.
- Aktörlerin yanında mob olmasın: `/gamerule domobspawning false`.

## 6. Yeni animasyon (Blockbench)

Dövüş dışı hareketler için (selam, düşme, oturma, dans…):

1. **Blockbench**'i aç (bilgisayar: blockbench.net; telefonda
   web.blockbench.net tarayıcıda açılır ama zordur).
2. **Bedrock Entity** modeli olarak oyuncu modelini aç (File → New →
   Bedrock Entity; ya da bana söyle, hazır dosyayı hazırlayayım).
   Kemik adları **aynı kalmalı**: `root`, `waist`, `body`, `head`,
   `rightArm`, `leftArm`, `rightLeg`, `leftLeg`, `rightItem`.
3. Animate sekmesinde animasyonu yap, **File → Export → Export
   Animations** ile `.animation.json` olarak kaydet.
4. Dosyayı bana gönder. Ben pakete eklerim ve
   `cekim oyna a <ad>` ile oynar.

## 7. Kendi skinlerin

Karakterlerinin skinlerini (64×64 PNG) bana gönder. Ben
`addon/kaynak_doku/aktor/` klasörüne koyarım; bir sonraki pakette
`cekim skinler` listesinde adıyla çıkar. İnce kollu (Alex tipi)
skinleri kendiliğinden tanır.

Şu an hazır olanlar: harkos, raxxan, miskel, okazor, kajaros,
uzak_akraba, o_sey, carpik. Oyunun kendi Steve/Alex dokusu bilerek
yok: pakette değil ve Mojang'ın dosyası, pakete konamaz.

## 8. Bilinen sınırlar — oyunda ilk denemede gözle bak

Bunlar kodda ölçülemedi, oyunda görülmesi gerekiyor:

- **Aktörün elindeki eşya görünüyor mu?** Varlık insan modeli ve
  `rightItem` kemiğiyle kuruldu; oyuncu dışındaki varlıklarda eşya
  çizimi oyunun kendi kararı. Görünmezse söyle, başka yola geçeriz.
- **Kafa takibi:** aktörler yakındaki oyuncuya kafa çevirebilir.
  Kamera sahnesinde sorun olursa kapatırım.
- **Altyazı ekranın altındaki yazı satırında** (actionbar). HUD'u
  gizlediğinde görünmesi gerekiyor; görünmezse söyle, başka yere alırız.
- **Karanlık Tırpan'ın eldeki duruşu** tahminle kuruldu (sap ileri,
  bıçak önde). Ters ya da kayık durursa ekran görüntüsü at, düzeltirim.
- **Ağır çekim yok:** Bedrock'ta oyunun zamanını yavaşlatmanın yolu
  yok. Ağır çekimi kurguda yap (CapCut hız ayarı).
- Serbest kamera oyuncunun kendi ekranında; **çok oyunculu** dünyada
  herkes kendi kamerasını görür (sahneyi başlatan kişi kameraman).

# v7.76.0 — İkonlar neden görünmüyordu

İstek: *"itemler gözükmüyor ve yarısı da kullanılmıyor, zırhı
takıyorum ya normalde onun zırhının yanında 12 yazıyor ama 5
tane zırh kaplıyor, itemleri kontrol et neden gözükmüyorlar"*

## Önce ölçüm — `item_texture.json`'daki 547 girdi

| ölçü | adet |
|---|---|
| 16×16 | 435 |
| 32×32 | 60 |
| 64×64 | 29 |
| 48×48 | 1 |
| 128×128 | 11 |
| 256×256 | 7 |
| **383×593 · 384×618 · 534×1183 · 539×1379** | **4** |

Son satır `kns_dusmus_1..4`. Kaynak paketten **olduğu gibi**
kopyalanmış Java modu render'ları; `konsey_al.py` onları
`fallen_1..4` diye alıyor ve ölçülerine kimse bakmamış.

**Neden gözden kaçmışlar:** o dört eşya yaratıcı menüsünde
**görünmüyor** (v6.4'te menü kategorisi kaldırıldı, "1000
korumalı bedava zırh olmasın" diye). Menüde görünmemek atlasta
yer kaplamamak değil — kayıtları `item_texture.json`'da duruyor,
yani atlasa **giriyorlar**.

## Hesap

Bedrock bütün eşya dokularını **tek atlasa** (`atlas.items`)
diziyor ve hücre ölçüsü **en büyük girdiye** göre belirleniyor:

```
hücre 1379px -> 2048/1379 = 1 hücre/satır ->    1 hücre  <  547   ✗
hücre  256px -> 4096/256  = 16 hücre/satır ->  256 hücre  <  547   ✗
hücre  128px -> 4096/128  = 32 hücre/satır -> 1024 hücre  >  547   ✓ (yalnız 4096'da)
hücre   64px -> 2048/64   = 32 hücre/satır -> 1024 hücre  >  547   ✓
```

Atlas kurulamayınca **tek ikon değil bütün eşyalar** eksik-doku
karesine döner. Bildirilen belirti tam olarak bu.

**64 seçildi, 128 değil.** 128 yalnızca 4096'lık atlası olan
cihazda kurtarıyor; kullanıcı tablette oynuyor. Bedeli gerçek ve
yazıyorum: 128×128 olan onbir ikon (`kns_raxxan`, `kns_kajaros`,
`ilkel_asa`…) ile 256×256 olan yedi ikon ayrıntı kaybediyor.
Vanilla eşya ikonu 16×16; 64 onun hâlâ dört katı.

**Esnetme değil dolgu.** `kns_dusmus_4` 539×1379 — boyu eninin
iki buçuk katı. Kareye esnetseydim figür yassılırdı. En-boy oranı
korunup kalan yer saydam bırakılıyor. 48×48 olan tek ikon
(`resetting_sword`) da küçültülmüyor, 64'e dolguyla taşınıyor.

**Kaynak dosyalar ellenmedi.** Düzeltme `kaynak_doku/` altında
değil, pakete yazıldıktan **sonra** yapılıyor — yarın sınır
değişirse tek sayı (`IKON_EN_BUYUK`) değişiyor, kaynak yeniden
çıkarılmıyor.

## Zırh sayısı: 750

Aynı dört eşya gövde yuvasında `"protection": 750` taşıyordu.
Bedrock'ta zırh çubuğu **10 ikon = 20 puan**; tam elmas takım
(3+8+6+3) tam tamına 20 eder. Yani 20'yi aşan sayı oyunda
**görünmüyor**, yalnız eşyada yazanı yalanlıyor.

`ZIRH_TAVAN = 20` eklendi. Depodaki *"sayılar modun kendi
eşyasından, hiçbiri yeniden hesaplanmadı"* kuralı **duruyor** —
bu tavan yeniden hesaplama değil, **oyunun kendi tavanı**.
Diğer 543 eşya zaten 0–20 arasındaydı, **hiçbiri değişmedi**:
tek görünür etkisi dört Düşmüş aşaması.

## Hâlâ açık: "12 yazıyor ama 5 kaplıyor"

Bu maddeyi **kapatmadım.** Depoda ölçebildiğim her sayı tutarlı:
548 eşyanın hepsinde `wearable.protection` ile
`armor.protection` aynı, hiçbiri artık 20'yi aşmıyor, ikonu
atlasta olmayan tek eşya `will_kilic` (vanilla `golden_sword`
kullanıyor, meşru). Hangi eşyanın 12 gösterip 5 ikon doldurduğunu
**kullanıcıdan öğrenmek gerekiyor** — tahminle bir sayı
değiştirmek deponun kuralına aykırı.

## "Yarısı kullanılmıyor" — ölçüldü, kusur değil

381 giyilebilir eşyanın **50'sinin** attachable'ı (görünümü)
yok. Tek tek bakıldı, **ellisi de kasıtlı**:

- **47'si güç eşyası** (`*_powers`, `reactor_arc`, `agamoto`,
  `ms_marvel_protection`…). Kaynakta da görünmezler: bacak
  yuvasında dururlar ve **yetenek** taşırlar, model taşımazlar.
- **3'ü Draconic göğüslüğü.** Giyilen modeli serbest üçgen ağı,
  Bedrock kutu istiyor. `TEKNOLOJI_TAKIM`'da `None` yazıyor ve
  gerekçesi orada: uydurma model çizilmedi.

## Test

`test/ikon_atlas.mjs` — 14 madde. Dört mutasyonun dördü de
yakalanıyor: dev ikonu geri koymak, 750'yi geri koymak,
süpürge çağrısını silmek, `zirh_puani` çağrılarını kaldırmak.

Süpürgenin **çağrıldığı** ayrıca sınanıyor, çünkü dosyaları elle
düzeltmek yetmez: bir sonraki üretim kaynaktan yeniden kopyalayıp
eski ölçüleri geri getirirdi.

---

# v7.75.0 — Viktor ve Kutlama Sahnesi

İki istek: kullanıcının kendi komut bloğu listesini eklemek, ve
tarif ettiği animasyonu yapmak.

## Viktor — yedi yetenek

Ametist parçası elde tutulunca çalışan komut listesi yeteneğe
çevrildi: Klon Bırakma · Işınlanma · İki Elde Büyü · Uçuş ·
Savurma · Eli Kaldır · Çember.

**Kaynakta çalışmayan bir satır vardı.** Savurma şöyle yazılmış:

    @e[type!player, r=3,c=1]

`type!player` geçersiz bir seçici; doğrusu `type=!player`. Oyun
o satırı sessizce reddediyor, yani **o yetenek kaynakta zaten
çalışmıyordu.** Düzeltildi — ama `!player` kısmı **korundu**:
bir oyuncuyu haberi olmadan 80 blok öteye fırlatmak tam da
v7.65–v7.69'da savunmasını yazdığımız kalıp. Yaratıklara
serbest, oyunculara değil.

Bir de klon: kaynak `summon npc` diyor ve o NPC dünyada
**sonsuza kadar** kalıyor. Depo kuralı bunu yasaklıyor, klonun
artık süresi var.

## Kutlama Sahnesi — altı şart

İstek: *"2 tane bembeyaz gözlü, bunlardan bayağı olsun
etrafımda, körlük efekti ver, chat'te 'seni kutluyorum Yüce
Earsh' desin ama büyük harfle ve İngilizce, isim etiketi
gözükmesin, 25 saniye olsun."*

Altısı da karşılandı ve altısının da ayrı bir test maddesi var:
`pa:izleyici` (siyah gövde, iki bembeyaz göz) · 18 izleyici, iki
halka · körlük · `I CONGRATULATE YOU, GREAT EARSH` · `nameTag`
hiç yazılmıyor · 500 tik.

İzleyicilerin **hiçbir yapay zeka bileşeni yok** — saldıramaz,
yürüyemez, hedef alamaz. Test bunu varlık dosyasından okuyor.

## Üç tuzak, üçü de tanıdık

**1. Bütçe.** 18 izleyiciyi tek tickte istemek tick başına dört
varlık bütçesini tüketiyordu; gerisi sessizce düşüyordu, testte
18 yerine 4 çıktı. Artık kademeli doğuyorlar — yan etkisi de
iyi, karanlıkta gözler tek tek açılıyor.

**2. Temizlik tuzağı, sekizinci kez.** Üreteçteki `beklenen`
listesine eklenmeyen her yeni doku aynı üretimde siliniyor.
İzleyici dokusu da ona takıldı.

**3. Tarama kendi yorumumu yakaladı.** `type!player` kullanmadığımızı
sınayan madde düşüyordu, çünkü `viktor.js`'in yorumu kaynaktaki
hatayı **anlatırken** o dizgeyi yazıyor. Yorumlar sökülüp
arandı — `efsane_korku.mjs`'te de yaşanmış aynı tuzak.

## Mutasyon bataryası bir test kusurumu buldu

"İzleyicilerin hepsi kaldırıldı" maddesi yalnız **deftere**
bakıyordu. `remove()` çağrısını silen mutasyon testi
geçiyordu: defter boşalıyor ama onsekiz izleyici oyuncunun
dünyasında dikilmeye devam ediyor. Asıl şart buydu, ölçü
dünyanın kaldırma sayacına taşındı. Yedi mutasyonun yedisi de
yakalanıyor.

## Ayrıca: v7.74'ün testleri sağlamlaştırıldı

Geçen sürümde bıraktığım üç kararsız test düzeltildi ve bir
**gerçek kusur** çıktı: Kaçan Gölge zaten geçersizse defterdeki
kaydı hiç düşmüyordu, yani dünya özelliği her oturumda ölü
kimliklerle büyüyordu.

Testler artık şansa bakmıyor. Olay seçimi rastgeleydi ve
"yeterince tara, er ya da gec çıkar" diye bekleniyordu; 30
koşuda bir beklenen olay hiç çıkmıyor ve test kendi kodumuzu
haksız yere düşürüyordu (v7.72'den beri duran TNT ölçümü
dâhil). Artık olay zorlanıyor, sıra da kaynaktan doğrulanıyor.

Bu arada kendi ölçüm aracımı da iki kez yanlış kullandım:
mutasyonları `test/pack` yerine kaynağa uygulayıp "dört mutasyon
sağ kaldı" sandım, ve bir testin **çöktüğünü** fark etmedim
çünkü yalnızca `✗` satırı arıyordum — çökmede öyle bir satır
olmuyor.

---

# v7.74.0 — Efsanenin Sessizliği

İstek: iki Forge modu daha (*Error404 1.3.8* / `glitchmanv`,
*Anomaly Rephased 2.0.0b32* / `anomaly_rephased`), aynı şartla:
*"bu yaratık da bana saldırmasın, korku unsurlarını ekle."*

## Önce ölçüm

İkisinin de **bütün varlık sınıflarının** sabit havuzu tarandı
(`setTarget`, `MeleeAttackGoal`, `NearestAttackableTargetGoal`,
`HurtByTargetGoal`, `doHurtTarget`, `ATTACK_DAMAGE`).

**Hiçbirinde tek bir saldırı hedefi ya da vuruşu yok.** Bulunan
tüm hedefler `RandomStrollGoal`, `FloatGoal`, `LookAtPlayerGoal`,
`RandomLookAroundGoal`, `RestrictSunGoal`. Yani her iki mod da
yaratıkla değil **atmosferle** korkutuyor — cosmichorror'da olduğu
gibi. Öldürme ikisinde de prosedürde (jumpscare / deathmode);
o kısım alınmadı.

**Üç modun üçü de meşale söndürüyor** (Error404
`CheckForTorches`, Anomaly `UnlitTorchOnTickUpdate`). Birbirinden
habersiz modların aynı mekaniği kurması türün çekirdek korkusunu
gösteriyor: ışığını kaybetmek. Bu yüzden alındı.

## Alınan altı olay

Sönen Meşale · Kapı Tıklatma · Kalp Atışı · Ensende Nefes ·
Kaçan Gölge · 404 Kaydı. Hiçbiri hasar vermiyor.

**Kaçan Gölge** kılığı `pa:carpik_kilik`. Seçimin gerekçesi
ölçülebilir: o varlık tanımında **hiçbir AI bileşeni yok** —
yalnız fizik, sağlık, çarpışma kutusu. Saldıramaz, yürüyemez,
hedef alamaz. Şartın kod tarafındaki garantisi bu, yorum değil;
test dosyadan okuyup doğruluyor.

## İki eski tuzak, ikisi de tekrar çıktı

**1. Meşale oyuncunun eşyası.** Söndürüp geri koymazsak "hiçbir
yetenek oyuncunun eşyasını kaybettirmez" kuralı kırılır. İki geri
koyma yolu var: `runTimeout` (hızlı) ve her taramada bakılan
**defter** (dünya kapanıp açılırsa ikinci şans). Ayrıca meşaleler
en az 8 blok öteden seçiliyor — ayağının dibindekini söndürseydik
7 saniyelik pencerede kırıp kaybedebilirdi.

**2. Kalıcı kılık ortada kalır.** `donusum.js`'te yaşanmış tuzak.
Aynı çözüm: kimlikler dünya özelliğine yazılıyor, açılışta
taranıp temizleniyor. Defter donusum'unkinden **ayrı** — tek
deftere yazsaydık açılış süpürmesi oyuncunun gerçek kılığını da
silerdi.

## Alınmayanlar

- **Jumpscare / deathmode** — Bedrock'ta istemci render kancası
  yok, öldürme zaten şarta aykırı. Anomaly'nin kendisi bile
  açılışta hassas görüş uyarısı basıyor; taklit etmedik.
- **`kick @p`** — Error404 sahte bir çökme mesajıyla oyuncuyu
  atıyor. Bedrock'ta yok; sahte bağlantı kopması üretmek de olsa
  yapmazdık. Yerine sohbet satırı alındı: korkusu aynı, yalanı yok.
- Bozuk mob dokuları, blok bozma / chunk kaldırma,
  `playersSleepingPercentage`, faz sistemi — gerekçeleri
  `ayarlar.js`'te tek tek yazılı.

## Testin kendisi üç yerden düzeldi

Mutasyon bataryası **kendi testlerimin** zayıf olduğunu gösterdi:

- "Yakın meşalelere dokunulmadı" belirli 24 bloğa bakıyordu; 60
  rastgele örneklemenin birine denk gelmesi düşük ihtimal olduğu
  için **şans eseri yeşil yanıyordu.** Ölçü, sönen *her*
  meşalenin mesafesine çevrildi (78 ölçüm).
- Gölge defteri testi kaynakta metin arıyordu; çağrı yerini
  silmek tanımı silmediği için mutasyonu kaçırdı. **Davranışa**
  çevrildi: gölge doğduktan sonra dünya özelliği gerçekten
  yazılmış mı.
- "Bakınca kaybolma" — türün imza mekaniği — **hiç
  sınanmıyordu.** Artık bakınca gidiyor mu, bakmayınca duruyor
  mu, süresi dolunca gidiyor mu, üçü de ölçülüyor.

Ayrıca "iki olay arası boşluk" ölçüsü `playsound` saymayı
bırakıp defterdeki `ara` alanına taşındı: Kalp Atışı tek olayda
6 ses çalıyor, yani ses sayısı artık olay sayısı değildi ve test
kendi kodumuzu haksız yere düşürüyordu.

Dokuz mutasyonun dokuzu da yakalanıyor.

---

# v7.73.0 — Marvel: eksik 32 parça

İstek: *"tüm karakterlerin yeteneklerini alabildiğin kadar al,
sonuçta bu bedrock modu."*

Mod zaten v5.2'de eklenmişti (Fisk silinmiş, `test/marvel.mjs` 1.
bölüm 11 kalıntı denetiminin hepsini geçiyor). Ama sayarken **modda
303 giyilebilir parça olduğunu, bizde 264 olduğunu** gördüm.

**Sebep bizdeydi, modda değil.** `marvel_coz.py` türü *etiketten*
tahmin ediyordu: `suit` → kostüm, `mask` → maske, `_powers` → güç.
Bu üçünden hiçbirine uymayan parça `tur = None → continue` ile
**sessizce düşüyordu** — `MARVEL_ATLANAN` defterine bile
yazılmıyordu, o yüzden iki sürümdür fark edilmemişti.

Sınıflandırma **yuvaya** çevrildi. Sonuç: **268 → 300 parça**
(142 kostüm, 90 maske, **47** güç, 21 ek), atlananlar 2 → **7**
kayıt (hepsi meşru: 6'sının attachable'ı yok, 1'inin geometrisi
`geometry.no`).

Ortaya çıkan **6 gerçek güç**: Agamotto'nun Gözü, ark reaktörü,
Mark 50 reaktörü, Star-Lord bot jetleri, White Tiger tılsımı,
Ms. Marvel koruması. Beşi tam olarak `ayarlar.js`'te *"bu
kahramanın modda güç eşyası yok"* yazan kahramanlara ait — **o
yorum yanlıştı, beşi de düzeltildi.** Güçler bacak yuvasında
olduğu için `guctekiKahraman()` onları kod değişmeden görüyor.

## Kemik onarımı — iki tuzak

Yeni gelen **dönüşüm modelleri** olduğu gibi paketlenemezdi.

**1. Yabancı iskelet.** Beş model (Galacta, Galactus, Groot, Jeff
the Land Shark, Mole Man) bütün kemiklerini ekli adlandırmış
(`root_p`, `body_groot`, `head_shark`…). Zırh attachable'ında bir
kemik yalnız **aynı adlı** oyuncu kemiğini takip eder, yani bunlar
heykel gibi durur, yürümez, kollarını sallamazdı. Vanilla adlara
çevrildiler.

**2. Taraf tuzağı.** Mole Man'in **iki kolu da** kaynakta
`rightArm_mole` / `rightArm_mole2`. Ada bakıp düz ek atsaydım
sağ/sol ters bağlanır, kolları yürürken ters yöne sallanırdı.
Taraf **pivota** göre seçiliyor; ölçülen kural (üç ayrı vanilla
modelde aynı): `right*` negatif x, `left*` pozitif x.

**Neredeyse yaptığım hata:** ilk refleksim mevcut
`insan_hiyerarsisi()`yi çağırmaktı. 208 marvel geometrisi üzerinde
kuru çalıştırdım — **70'inde** küplü `waist`i "çakışan kemik"
sayıp `waist_ic` diye yeniden adlandırıyordu, yani **bugün doğru
duran modelleri bozacaktı.** Marvel geometrileri bu yüzden ayrı
bir yoldan (`marvel_geo_yaz`) geçiyor. Test bunu da kilitliyor.

Ayrıca `mrv_deadpool_katanas`'ta `rightLeg`in ebeveyni yoktu;
onarıldı. Onarımdan sonra `maletin` dışında yabancı kök kemik
kalmadı.

Beş mutasyonun beşi de yakalandı: düz kopya, pivot yerine ada
bakma, ebeveyn onarımının silinmesi, genel onarıcının sızması,
çakışma korumasının kaldırılması.

Ayrıntı: `REFERANS_MARVEL.md`.

---

# v7.72.0 — Efsanenin Gazabı

Kullanıcı v7.71'deki şartını düzeltti ve **haklıydı, ben yanlış
anlamışım**:

> *"Ben bir efsaneyim gibiyim aslında; onun kendi yaratıkları kendisine
> zarar verirse bu gülünç bir durum. Korkutması gerekirken 'bu nasıl
> efsane ya, nerede korkunçluk, nerede gizem' diye sorgularlar. Hasar
> olanları da ekle ama bana bir şey yapmasınlar."*

Şart **"hasar olmasın" değil, "hasar bana değmesin"**. v7.71'de
`TntRain` ve `Trap1` bu yüzden dışarıda bırakılmıştı; artık içerideler.

## Güvenlik efektle değil, geometriyle

İki katman:

1. **Halka.** Tehlike efsanenin en az **16**, en çok **30** blok ötesine
   düşüyor. TNT gücü 4'ün hasar menzili ~8 blok; 16 iki katından fazla
   pay bırakıyor.
2. **Patlama anında yeniden ölçüm.** TNT havada 2 saniye kalıyor ve
   oyuncu o sırada halkaya yürüyebilir. Fitil dolunca mesafe tekrar
   ölçülüyor; yakınsa o patlama **hiç yapılmıyor**.

Yalnız birincisi "muhtemelen güvenli" olurdu; ikisi birden "kesin
güvenli" yapıyor.

**Direnç efekti verilmedi.** Hem *"Direnç V yasak"* kuralına takılırdı,
hem yanlış çözüm olurdu: oyuncu diğer her şeye karşı da korunmuş
olurdu.

## TNT'nin görüntüsü vanilla, patlaması bizim

`guclu_tnt.js`'teki aynı teknik: varlık fırlatılıyor, fitil dolunca
elle kaldırılıp yerine bizim patlamamız çağrılıyor. Böylece hem güç
(4) hem `breaksBlocks` (**false**) bizde — yoksa Efsane yapısının
kendisi havaya uçardı.

Diğer oyuncular varsayılan olarak **vurulmuyor**: habersiz birini
patlatmak v7.65–v7.69'da savunma yazdığımız şeyin kendisi olurdu.
Açmak isteyen tek satır değiştirir.

## Test bir hatamı yakaladı

Yıldırım için mesafe **yuvarlanmamış** noktada ölçülüyor ama düşüş
`Math.floor` edilmiş noktaya yapılıyordu. Yuvarlama mesafeyi bir
buçuk bloğa kadar kısaltabiliyor — test 16 sınırı içinde **15,5
bloklık bir yıldırım** buldu.

Düzeltme: önce yuvarla, sonra ölç. Ölçülen nokta ile kullanılan nokta
aynı olmalı.

## Mutasyon bataryası testin kendisini de düzeltti

İlk turda **5 mutasyon kaçtı**. Hepsi testin zayıflığıydı, kodun
değil:

| kaçan | sebebi | düzeltme |
|---|---|---|
| TNT mesafe denetimi kaldırıldı | oyuncu hiç halkaya girmiyordu | deterministik kurulum: TNT'nin tam üstüne ışınla |
| halka iç yarıçapı kaldırıldı | yalnız patlama ölçülüyordu | **doğuş** anı da ölçülüyor |
| yuvarlama sırası bozuldu | 45 örnekte 1 kez çıkıyordu | örnek sayısı 3000 taramaya çıkarıldı |
| TNT blok kırmaya açıldı | sahte dünya seçenekleri yoksayıyor | ayar + kod maddesi (ve bunun bir **sınır** olduğu yazılı) |
| vanilla TNT kaldırılmıyor | sahte dünya vanilla patlamayı simüle etmiyor | aynı şekilde kod maddesi |

Ayrıca mutasyonlardan biri **benim yazdığım mutasyonun yanlış**
olduğunu gösterdi: yuvarlamayı tamamen kaldırıyordum, oysa asıl hata
"yuvarlanmamışı ölç, yuvarlanmışı kullan"dı. Doğru mutasyon yazılınca
test onu 240 yıldırımda 5 kez yakaladı.

**Son durum: 9 mutasyon, 9'u da yakalandı.**

## Ölçüm

```
68 patlama · 0'ı güvenli yarıçapta · en yakın 19.4 blok (sınır 16)
194 yıldırım · 0'ı güvenli yarıçapta · en yakın 16.1 blok
272 TNT doğumu · 0'ı halka içinde
```

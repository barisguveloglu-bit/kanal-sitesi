# Five Nights at Freddy's: Altıncı Çocuk

> **Bu dosya siteye ait değildir.** Kanlı Göz evreniyle hiçbir bağı yok,
> `LORE.md` ve `assets/js/data.js` ile senkron tutulmaz, hiçbir HTML sayfasına
> bağlanmaz. Ayrı bir oyun projesinin hikaye tasarım defteri olarak burada duruyor.
>
> **Hayran yapımı (fan game) tasarımıdır.** Five Nights at Freddy's, Scott Cawthon
> ve Steel Wool Studios'a aittir. Buradaki karakterlerden Michael Afton, William
> Afton, animatronikler ve beş kayıp çocuk özgün eserin parçasıdır; Jesse Marlow
> ve babası bu tasarıma özgüdür.

## Dil kararı

**Oyunun dili İngilizce.** Türk yapımı ama FNAF evreni Amerika'da geçtiği için
bütün metin, isimler ve arayüz İngilizce. İsimler değişmiyor: **Jesse Marlow**,
**Gil Marlow**, **Michael Afton**.

Bu tasarım defteri Türkçe. Oyunda geçecek repliklerin **İngilizcesi asıl metin**,
altındaki Türkçe sadece burada okunsun diye.

**Seslendirme yok.** Bütçe gerektirdiği için hiçbir replik seslendirilmiyor;
her şey altyazıyla veriliyor. Bu bir eksik değil — §8’deki altyazı sistemi
seslendirmenin yapabileceğinden fazlasını yapıyor.

## Oynanabilir prototip

`oyun-prototip/altinci-cocuk.html` — çift tıkla, açılır.

Tek dosya. Derleme yok, paket yok, dış kaynak yok (sitenin kuralları burada da
geçerli). Sesler bile dosya değil, WebAudio ile üretiliyor.

**Bu bir site sayfası değil** — menüye ve `sitemap.xml`'e bilerek eklenmedi,
hiçbir HTML'den bağlanmıyor. Kanlı Göz sitesiyle ilgisi yok, sadece aynı
depoda duruyor.

İçinde ne var:

| Bölüm | Durum |
|---|---|
| 5 gece açılışı (§5) | Oynanır — fener, fark edilme ölçeri, replikler |
| Altyazı sistemi (§8) | Tam — renk, yazı tipi, makine→el yazısı dönüşümü |
| Ofis döngüsü (§10) | Oynanır — kapı, ışık, kamera, güç, ceket, müzik kutusu |
| Çıkış mini oyunu | Oynanır — 3 AM'de, "kırmızıyken dur" |
| Safe room finali (§4) | Oynanır — ceketi çıkar + kutuyu kurma |
| 2023 finali (§7) | Tam — gazete, telefon, "Okay." |
| Jenerik | Beş isim, sadece beş açılışı da dinlediysen |
| **Gece 6 — Özel Gece** | Final bittikten sonra açılıyor; altı karakter 0–20 |

### Arayüz

Oyuncu "ne yapacağımı bilemedim" dediği için:

- **Alt çubuktaki her düğme** tuşunu, ne işe yaradığını ve **o an açık mı
  kapalı mı** olduğunu yazıyor. Çubuk 55 piksel yüksekliğinde ve dar
  ekranda bile tek satır — kapı boşluklarının en az 85 piksel altında
  kalıyor, yani kapıda kim var görüntüsünü örtmüyor.
- **Uyarı şeridi** ne yapman gerektiğini doğrudan söylüyor: *"BATI KAPIDA
  BİRİ VAR — A ile KAPAT"*, *"MÜZİK KUTUSU BİTİYOR — SPACE → PRIZE CORNER → W"*.
- İlgili düğme kırmızı yanıp sönüyor.
- **H tuşu** her şeyi anlatan bir yardım paneli açıyor; panel açıkken oyun duruyor.
- **İlk gecede** sırayla beş kısa ipucu beliriyor (sadece bir kez).
- Kamerada **renk açıklaması** var; kutu azalınca Prize Corner hücresi
  altın renginde yanıp sönüyor.

Menüde **"Sahne seç"** var — beş geceyi oynamadan herhangi bir sahneye
doğrudan atlıyor.

### Görsel katman

Tek bir görsel dosya yok; her şey kodla çizilen SVG.

- **Mekan gerçek perspektifle üretiliyor.** Damalı zemin, kaçış noktası
  (800, 470) ve `s(t) = (1-t)^2.3` derinlik eğrisiyle karo karo hesaplanıyor —
  x ve y aynı katsayıyla küçüldüğü için perspektif tutarlı.
- **Yemek salonu:** sahne, kırmızı perdeler (hafifçe dalgalanıyor), yıldızlı
  fon, zikzak bayraklar, "LET'S PARTY / CELEBRATE!" posterleri, üstünde
  tabak-bardak-parti şapkası olan masalar, ışık konisi düşüren tavan lambaları.
- **Korsan Koyu:** mor yıldızlı perde + "SORRY! OUT OF ORDER" tabelası.
  *(Perspektif ölçeğine bırakılınca noktaya döndüğü için arka duvara sabit
  ölçekle çiziliyor.)*
- **Ofis:** kapı boşluklarının içinde derinlemesine koridor görünüyor,
  masada monitör, kağıtlar, Freddy biblosu, bardak ve dönen pervane var.
- **Karakterler ayrı ayrı, detaylı çizildi.** Ortak iskelet: gövde ve kafada
  hacim veren gradyanlar, omuz–dirsek–dizde **endoiskelet eklemleri**, panel
  dikişleri ve vidalar, dört parmaklı eller, akı + iris + bebek + parlama
  içeren gözler, kafa ile gövdeyi bağlayan boyun.

| Kim | Kendine özel |
|---|---|
| Freddy | Silindir şapka (kenar, kurdele, sheen), papyon, elinde ızgaralı mikrofon, burun üstü benekler |
| Bonnie | Telleri, perdeleri ve manyetiği çizilmiş gitar, iç gölgeli uzun kulaklar, iki ön diş |
| Chica | "LET'S EAT!!!" önlüğü, kâğıt kılıflı ve mumlu cupcake, dikişli gaga, üç parmaklı ayaklar |
| Foxy | Göz bandı ve kayışı, parlayan kanca, yırtık gövdeden görünen kaburgalar, sivri dişler, dik kulaklar |
| Golden Freddy | Çökmüş duruş, eğik kafa, sarkan kollar, boş göz çukurlarında iki nokta |
| Puppet | Çatlaklı maske, mor gözyaşı çizgileri, çizgili kollar, uzun ince parmaklar |
| Jesse | İki hâli: eli örten manşetleri ve göğüs rozetiyle iki beden büyük ceket / ince tişört ve çıplak kollar |

> Gradyan kimlikleri her çağrıda benzersizleşiyor — aynı ekranda altı figür
> olunca (Özel Gece ekranı) renkler birbirine karışmasın diye.
- **Jesse'nin iki hâli var:** ceketliyken kolları eline kadar sarkan, iki beden
  büyük bir servis ceketi; ceketsizken gözle görülür şekilde ince ve küçük bir
  çocuk. Ceket çıkarılınca yere katlanmış olarak duruyor.

### Animasyonlar

| Ne | Nasıl |
|---|---|
| **Kapı** | Tek blok değil — 12 lamelli panjur. İnerken hafifçe aşıp geri sekiyor, altında sarı-siyah tehlike şeridi var, oda sarsılıyor, yerden toz kalkıyor, çarpma sesi geliyor |
| Kapı uyarı lambası | Kapının üstünde, o tarafta biri varken kırmızı yanıp sönüyor |
| Animatronikler | Kendi temposunda hafif salınım + göz parıltısı titremesi |
| Fener | Yumuşak koni, nefes alan sıcak göbek, içinde uçuşan toz zerreleri |
| Kamera | Açılışta parlama, sürekli tarama çizgisi, kayan parazit |
| Koridor ışığı | Yakınca kısa bir vızıltı ve titreme |
| Jumpscare | Sarsıntı + ekrana doğru büyüme + kırmızı flaş |
| Güç bitişi | Panjurlar kendiliğinden açılıyor, oda kararıp titriyor |
| Perdeler, tavan lambaları, pervane | Sürekli, düşük tempolu döngüler |

**Hareket azaltma (`prefers-reduced-motion`) açıkken hepsi kapanıyor** —
toz, salınım, titreme, sarsıntı. Oyun oynanabilir kalıyor.

> **Yazı tipleri:** prototip önce gerçek adları arıyor (Nunito, Inter, VT323,
> Patrick Hand, Special Elite, Libre Baskerville), bulamazsa sistem
> karşılıklarına düşüyor. El yazısı efekti font olmadan da duruyor: her harf
> kendi açısında çiziliyor. Gerçek fontlar gömülünce daha da iyi olur.

---

## 0. Tek cümlelik özet

**1993'ün kasımında, 14 yaşında bir çocuk babasının adını temizlemek için beş gece
üst üste kapalı bir pizzacıya giriyor; içerideki ruhlar onu babasının ceketinden
tanıyıp katil sanıyor, beşinci gecede çocuk olduğunu görüp bırakıyorlar — ve otuz
yıl sonra o çocuk, onları kurtaracak adamı arıyor.**

---

## 1. Yerleşim — neden 1993?

| Oyun | Yıl | Ne oldu |
|---|---|---|
| FNAF 2 | 1987 | Kayıplar, Isırık, mekan kapandı |
| **Altıncı Çocuk** | **Kasım 1993** | **Bu oyun** |
| FNAF 3 | 2023 | Fazbear's Fright — "otuz yıl sonra" |

Oyun, FNAF 1'in beş gecesinin **hemen ardındaki kapanış haftasında** geçiyor.
Mekan yıl sonunda temelli kapanacak, içerisi envanter için toplanıyor, geceleri
kimse tutulmuyor.

Bu yerleşim üç şeyi bedavaya çözüyor:

1. **İki kahraman da oraya girmeye yetkili değil.** Jesse zaten hiç değildi;
   Michael kovuldu ama anahtarını geri vermedi. İkisi de aynı binaya, aynı
   sebeple, izinsiz giriyor.
2. **30 yıl matematiği tutuyor.** 1993 + 30 = 2023 = Fazbear's Fright.
3. **Jesse 1993'te 14, 2023'te 44.** Son sahne için doğru yaş.

---

## 2. Karakter — Jesse Marlow

- **Yaş:** 14 (doğum 1979)
- **Gücü yok, silahı yok, yetkisi yok.** Elinde sadece bir fener, bir anahtarlık
  ve babasının servis defterinin yarısı var.
- **İnatçı.** Beş gece üst üste, her gece ölmeye bir adım kala, geri geliyor.
- **Adı sabit** — hikayenin hiçbir versiyonunda değişmez.

> Not: İsim Amerikan kalıbında bilerek seçildi (FNAF evreni Amerika'da geçiyor).
> Türkçe bir isim istenirse hikayenin hiçbir yeri bozulmaz, tek değişecek şey isim.

### Babası — Gil Marlow (1946–1991)

1987'de FNAF 2 mekanının **gece teknisyeni.** Kostümlerin bakımını yapan adam.
Kayıplar ortaya çıkınca şirketin bir isme ihtiyacı vardı: bütün odaların
anahtarı olan, geceleri binada tek başına kalan adam. Polis üstünde bir şey
bulamadı. **Gazeteler yine de yüzünü bastı.**

Kovuldu. Aile şehirden gitti. 1991'de bir otoparkta, 45 yaşında, kalp krizinden
öldü — yan koltukta kendi servis defteri duruyordu. Jesse 12 yaşındaydı.

**Kasabanın hafızasında Gil Marlow hâlâ "o adam".**

---

## 3. Hikayenin belkemiği — CEKET

Bu oyunun tek bir fikri var, her şey ondan çıkıyor:

> **Animatronikler Jesse'yi avlamıyor. Jesse'nin üstündeki ceketi avlıyor.**

Jesse babasının eski Fazbear servis ceketiyle giriyor içeriye. Ceket ona bir
beden değil, iki beden büyük. Kasım, bina soğuk, elindeki tek şey o.

Karanlıkta, kamera görüntüsünde, koridorun ucunda o ceket **yetişkin bir adam
silueti** veriyor. Ruhlar için üniformalı her adam aynı adam. Onları öldüren
adam da bu binada, bu üniformayla dolaşıyordu.

Ve aynı ceket, altı yıl önce **kasabaya da** babasını katil gösteren şeydi.

**Aynı ceket, aynı yanlış, iki kez.**

Oyunun son hamlesi bu yüzden basit: çocuk ceketi çıkarıyor.

---

## 4. Beş gece — tanınma eğrisi

Her gece iki bölümden oluşuyor: **ofis savunması** (klasik döngü) ve **çıkış**
(ofisten çıkıp bir odadan babasının defterinin bir sayfasını alma). Her sayfa
bir çocuğun adını taşıyor. Her gece bir animatronik Jesse'ye bakışını değiştiriyor.

| Gece | Nereye çıkıyor | Kim | Ne oluyor |
|---|---|---|---|
| 1 | Kulis (Backstage) | — | Kimse ona bakmıyor. Sadece avlanıyor. Korku kişisel değil, mekanik. |
| 2 | Batı koridoru / depo | **Bonnie — Jeremy** | Köşeye sıkışan Jesse ağlıyor. Bonnie duruyor. Sabaha kadar koridorda öylece kalıyor. **O adam hiç ağlamamıştı.** |
| 3 | Mutfak (ekran kapalı, sadece ses) | **Chica — Susie** | Karanlıkta hiçbir şey göremeyen Jesse, korkudan konuşmaya başlıyor. Babasını anlatıyor. Chica dinliyor. 4. geceden sonra mutfak güvenli oda. |
| 4 | Korsan Koyu + Sahne | **Foxy — Fritz**, **Freddy — Gabriel** | Foxy koridoru koşuyor ve **duruyor**: Jesse kaçmıyor, ceketi çıkarıp yere bırakıyor. Freddy izliyor, karar vermiyor. Henüz. |
| 5 | Planda olmayan oda (safe room) | **Golden Freddy — Cassidy**, **Puppet — Charlotte** | Aşağıda. |

### 5. gece — Puppet

Safe room, batı koridorunun duvarının arkasında; hiçbir kat planında yok.
İçeride yedek altın kostümler ve babasının sakladığı kutu var.

**Golden Freddy** hiç kımıldamıyor. Köşede oturuyor. Jesse girince bir çocuk
sesiyle iki cümle söylüyor:

> **"YOU'RE NOT HIM."**
>
> **"DON'T COME BACK. NEXT TIME I WON'T CHECK."**
>
> *(Sen o değilsin. — Bir daha gelme. İkinci sefer bakmam.)*

Cassidy affetmiyor — sadece **bu sefer kontrol ediyor.** Karakterine uygun olan bu.

**Puppet en son ikna olan.** Diğerlerine hayatı o verdi, kararı da o veriyor.
Ve mekanik burada tersine dönüyor:

FNAF 2'de müzik kutusunu **kurarsın**, Puppet uyanmasın diye.
Burada oyunun son eylemi **kutuyu bırakmak.** Kurmayı bırakıp beklemek.

Jesse ceketi katlayıp yere koyuyor. Kutu yavaşlıyor. Melodi bitiyor.
Puppet geliyor.

**Oyunun son mekaniği kendini savunmamayı seçmek.**

Puppet onu kaldırıyor — ve yere bırakıyor. Sonra yaptığı tek şeyi yapıyor:
**veriyor.** Maske vermiyor, çünkü Jesse'nin hayata ihtiyacı yok, hayatı zaten var.
Babasının kutusunu veriyor. Ve kapıyı gösteriyor.

Sabah 6 çanı çalıyor. Oyunda ilk kez bu ses rahatlama değil, **yas.**

Kapanış kartı:

> *"Beşi kaldı. Birinin gitmesine izin verildi."*

---

## 5. Gece açılışları — onları izlediğimiz an

Her gece, saat 12:00'den önce Jesse binaya girmiş ama gece daha başlamamış
oluyor. O aralıkta **animatronikler henüz avlanmıyor** — ve Jesse saklandığı
yerden onları izliyor.

**Bu bir ara sahne değil.** Jesse uyanık, yerinde, kontrol oyuncuda.
Rüya yok, hatıra yok, mini oyun yok. Gerçek zamanda, o binada, olan şey.

### Nasıl çalışıyor

- Oyuncu **yerinden kımıldayamıyor** (saklanma pozisyonu), sadece bakışını
  çevirebiliyor.
- **Yakalanabilirsin.** Feneri onların üstüne tutarsan ya da fazla oynarsan
  sahne yarıda kesiliyor ve o gece **bir oda daha yakından** başlıyor.
- Yani ödül doğrudan hikaye: **kıpırdamadan durursan daha çok şey duyuyorsun.**
- Beş açılışın beşini de sonuna kadar dinlediysen, jenerikte **beş çocuğun
  adı yazıyor.** Dinlemediysen jenerik boş geçiyor. Zorlama yok, uyarı yok.

### Kim var, kim yok

Açılışlarda hep aynı dördü var: **Freddy, Bonnie, Chica, Foxy.**

**Golden Freddy hiçbirinde yok.** Cassidy tartışmaya katılmıyor, safe room'da
tek başına. **Puppet de yok** — o sadece müzik kutusu olarak duyuluyor.
İkisinin de 5. gecede ilk kez görünmesi bu yüzden vuruyor.

### Gece 1 — 23:52, tünel ızgarası

Jesse tünelden çıkıyor, batı koridorunun altındaki ızgaranın arkasında bekliyor.
Sahne ışıkları kapalı. Üç siluet.

Chica'nın başı Bonnie'ye dönüyor. **Oyunun ilk altyazısı** — makine yazısı, sarı:

> **"HE CAME BACK."**

Bonnie cevap vermiyor. 12:00. Sahne boş.

*İki anlamı var ve oyuncu ikincisini 5. gecede anlıyor: "geri geldi" dedikleri
Jesse değil, ceket.*

### Gece 2 — 23:48, oyun makinelerinin arkası

Bonnie ve Chica yemek salonunda, masaların arasında, kımıldamadan duruyorlar.

> **CHICA:** "IT'S THE SAME COAT."
>
> **BONNIE:** "IT'S NOT THE SAME WALK."
>
> **CHICA:** "IT'S THE SAME COAT."

Uzun sessizlik. Sonra Bonnie başını yavaşça oyun makinelerine çeviriyor.
**Jesse'nin tam olarak nerede olduğunu biliyor.** Gelmiyor.

12:00.

*(Aynı ceket. — Aynı yürüyüş değil. — Aynı ceket.)*

Ceket mekaniğini oyuncuya kimse anlatmıyor; **onlar birbirlerine anlatıyor.**

### Gece 3 — 23:55, parti masasının altı

Bonnie'nin yazısı 2. gecenin sonunda çocuk el yazısına döndü. Artık Freddy'yle
tartışıyor ve **iki yazı tipi yan yana görünüyor.**

> **BONNIE** *(çocuk el yazısı, mor)*: "he cried."
>
> **FREDDY** *(makine, kehribar)*: **"THEY CRY. ALL OF THEM CRY. HE CRIED TOO."**
>
> **BONNIE:** "not like that."
>
> **FREDDY:** **"YOU WANT IT TO BE SOMEONE ELSE."**
>
> **BONNIE:** "yes."

Freddy cevap vermiyor.

*(Ağladı. — Ağlarlar. Hepsi ağlar. O da ağlamıştı. — Öyle değil. — Sen onun
başkası olmasını istiyorsun. — Evet.)*

### Gece 4 — 23:41, Korsan Koyu'nun perdesi

Dördü de aynı odada, oyunda ilk ve tek kez. Ve bu bir duruşma.
Bonnie ve Chica artık el yazısı, Freddy ve Foxy hâlâ makine.

> **CHICA:** "he talked to me."
>
> **FOXY:** **"HE TALKED TO YOU BECAUSE HE WAS AFRAID OF YOU."**
>
> **CHICA:** "yes."
>
> **FOXY:** **"THAT'S WHAT PREY DOES."**
>
> **BONNIE:** "that's what children do."

Sessizlik.

> **FREDDY:** **"THEN WE LOOK AT HIM. TOMORROW WE LOOK AT HIM PROPERLY."**

*(Benimle konuştu. — Senden korktuğu için konuştu. — Evet. — Av öyle yapar. —
Çocuk öyle yapar. — O zaman ona bakarız. Yarın ona düzgün bakarız.)*

**5. geceyi Freddy ayarlıyor.** Oyuncu ertesi gecenin bir duruşma olduğunu
biliyor.

### Gece 5 — 23:59, Jesse saklanmıyor

Açılışın kuralı bozuluyor: Jesse yemek salonuna giriyor ve **ortada duruyor.**
Dördü de orada. Kimse kımıldamıyor.

Ve oyunda ilk kez **açılışta konuşan Jesse.**

> **JESSE:** "my name is jesse marlow."
>
> **JESSE:** "my father's name was gil marlow. he fixed you."
>
> **JESSE:** "he didn't do it."

Saat 12:00'yi vuruyor — ve **ilk kez kimse hareket etmiyor.**

Sonra arkadaki koridordan bir müzik kutusu çalmaya başlıyor.

Dördü karar verdi. **Karar vermeyen tek biri kaldı.**

*(Adım Jesse Marlow. — Babamın adı Gil Marlow'du. Sizi o tamir ederdi. —
O yapmadı.)*

> Not: Jesse bu sahnede ceketi hâlâ üstünde. Ceket 5. gecenin sonunda,
> Puppet'ın önünde çıkıyor. Dördünü sözleri ikna etti; **Puppet'ı sadece
> savunmasız kalmak ikna edecek.**

---

## 5.1 Beş gece, o kadar

**Gece 6 yok. Custom Night yok. Ekstra mod yok.**

Bu bir eksiklik değil, hikayenin şartı:

> **Beş gece, beş ruh.** Altıncı gece kalan çocuk, altıncı ruh olurdu.
> Oyunun bittiği yer, Jesse'nin geri gelmediği yer.

Cassidy'nin cümlesi zaten kuralı koyuyor: **"DON'T COME BACK."**
Oyunun sana altıncı geceyi vermemesi, o sözün tutulması.

Küçük detay: FNAF'ta 5. geceyi bitirince ekranda **"NIGHT 6"** açılır.
Burada o ekranda hiçbir şey yok — doğrudan 2023'e geçiyor.

**Yokluğun kendisi cümle.**

### Peki ya Özel Gece?

Prototipte **Gece 6 — Özel Gece** var, ama hikâyenin dışında:

- Yalnızca **son sahne bittikten sonra** açılıyor. Yani hikâyeyi bitirmeden
  altıncı bir gece diye bir şey yok; yukarıdaki tez bozulmuyor.
- Sahne yok, replik yok, açılış yok, jenerik yok. Sadece ofis döngüsü.
- Altı karakterin zorluğu tek tek 0–20 arasında ayarlanıyor.

Yani hikâye hâlâ beş gecede bitiyor. Özel Gece, FNAF'ın kendi Custom
Night'ı gibi **kanon dışı bir ek** — Jesse geri gelmiş olmuyor.

---

## 6. Michael Afton — arkadaşlık

Michael 1993'te yirmili yaşlarının başında. Kovuldu ama anahtarı geri vermedi
ve her gece geri geliyor, çünkü işi bitmedi.

**Ofis Michael'ın ofisi.** Jesse oraya saklanmak için giriyor.

| Gece | İlişki |
|---|---|
| 1 | Jesse hem animatroniklerden hem de bekçiden saklanıyor. |
| 2 | Michael onu yakalıyor. İhbar etmiyor. **"Whatever you're looking for, you're in the right building. You're just wrong about what's in it."** *(Ne arıyorsan doğru binadasın. Sadece içeride ne olduğu konusunda yanılıyorsun.)* |
| 3–4 | İş bölüşüyorlar: biri kameraya bakıyor, biri koridora çıkıyor. Telsizle. |
| 5 | Michael soyadını söylüyor. |

İkisi de **hakkında hikaye anlatılan adamların oğlu.** Jesse'nin babasına katil
dendi, değildi. Michael'ın babasına iyi adam dendi, öyle değildi. Birbirlerinin
ayna görüntüsü.

### Gece 5'in gerçek finali

Jesse elindeki sayfayı uzatıyor. Babasının 1987 el yazısı, mesai dışı giriş
yetkisi olan **ikinci adamın** adı, planda olmayan oda, altın kostümlerin
springlock'larında olmaması gereken aşınma.

Michael, ölmüş bir tamircinin defterinde **kendi babasının adını** okuyor.

Michael'ın oraya gitme sebebi bu. Otuz yıl sonrasının fitili burada yanıyor.

---

## 7. Son sahne — 2023

> Kullanıcının istediği kapanış. Hikayenin bütün ağırlığı buraya biniyor.

Sabah. Mutfak masası. Gazete.

> **FAZBEAR'S FRIGHT: OTUZ YIL SONRA KORKU GERİ DÖNÜYOR**
> *İşletmeciler, orijinal mekanlardan kurtarılan gerçek parçalar sergilediklerini
> iddia ediyor.*

Jesse 44 yaşında. Gazeteye bakıyor. Yüzü değişmiyor.

Masanın kenarında katlanmış eski bir servis ceketi duruyor — hiç atmamış.

Telefonunu çıkarıyor. Rehberde soyadsız bir kayıt: **"Mike."**
(1993'te Michael soyadını söyledi; Jesse otuz yıl boyunca hiç kullanmadı.
Ona bunu yapmazdı.)

Uzun uzun çalıyor. Sonra biri açıyor ve **hiçbir şey söylemiyor.**
Jesse kimin açtığını biliyor. Selam vermiyor.

> **JESSE:** "It's open again. Same building."
>
> *(sessizlik)*
>
> **JESSE:** "They're advertising real ones. If it's them, they've been in a crate since '93."
>
> *(sessizlik — uzun)*
>
> **JESSE:** "I'm not going."
>
> **MICHAEL:** "Okay."

*Hattı Michael kapatıyor.* Jesse'nin ekranı üç saniye daha yanık kalıyor,
sonra sönüyor.

Karartma. Tek satır:

> *August 2023.*

### Neden bu kadar soğuk

İkisi de otuz yıl önce olanları biliyor. **Hiçbir şeyi birbirlerine
açıklamıyorlar** — açıklama olsaydı sahne ısınırdı. Selam yok, veda yok,
"haklıydın" yok, "sıra sende" yok.

**"I'm not going."** cümlesi işin bütün ağırlığını taşıyor:

- Jesse gitmeyeceğini söylüyor, Michael'a *git* demiyor. Ama ikisi de ne
  söylendiğini biliyor. Rica etmiyor, sadece bilgiyi bırakıp çekiliyor.
- Aynı zamanda Cassidy'ye verilmiş bir söz: *"Bir daha gelme."* Jesse otuz
  yıldır sözünü tutuyor.
- Ve Michael'ın **"Okay."**si tek kelimede *"o zaman ben giderim"* demek.
  FNAF 3 bu tek kelimenin içinden çıkıyor.

Türkçesi (sadece burada okunsun diye):
*"Yine açılmış. Aynı bina." / "Gerçeklerini sergiliyorlarmış. Eğer onlarsa,
'93'ten beri bir sandığın içindeler." / "Ben gitmiyorum." / "Tamam."*

---

## 8. Altyazı sistemi — konuşan yazı

Seslendirme bütçesi yok. O yüzden **ses yerine yazı oynuyor.** Her konuşanın
kendi rengi *ve kendi yazı tipi* var; kim konuşuyorsa yazı ona benziyor.

Bütün yazı tipleri **ücretsiz ve ticari kullanıma açık** (SIL OFL / Apache 2.0,
hepsi Google Fonts'ta). Tek kuruş gitmiyor.

### Konuşanlar

| Kim | Yazı tipi | Renk | Neden |
|---|---|---|---|
| **Jesse** (1993) | Nunito — yumuşak, yuvarlak uçlu | Sıcak kirli beyaz `#F2EFE8` | Çocuk. Tek yuvarlak yazı tipi onunki. |
| **Michael** | Inter — dar, soğuk, sıfır süsleme | Soğuk gri-mavi `#9FB3C8` | Kapalı adam. Hiç italik kullanmıyor, hiç ünlem almıyor. |
| **Gil Marlow** (defter) | Special Elite — daktilo, solmuş karbon | Soluk sepya `#B9A88C` | Ölü adam. Hiç konuşmuyor, sadece yazdıkları okunuyor. |
| **Gazete / sistem** | Libre Baskerville | Kağıt beyazı | Dış dünya. |

### Beş ruh + Puppet — asıl numara burada

Ruhların altyazısı **oyun boyunca değişiyor.** Tanınma eğrisini (§4) yazı
tipinin kendisi oynuyor:

**Başlangıç hâli — makine:**
VT323, **hep büyük harf**, harf araları açık, arada bozulan karakterler.
Konuşan bir şey değil, bozuk bir hoparlör gibi duruyor.

**Tanıdıkları an — çocuk:**
O ruh Jesse'nin çocuk olduğunu gördüğü gece, altyazısı **kalıcı olarak**
Patrick Hand'e (çocuk el yazısı) dönüyor ve küçük harfe iniyor.

| Ruh | Renk | Ne zaman dönüyor |
|---|---|---|
| Bonnie — Jeremy | Mor `#8E6FD8` | Gece 2 |
| Chica — Susie | Sarı `#E8C33A` | Gece 3 |
| Foxy — Fritz | Kırmızı `#C4453B` | Gece 4 |
| Freddy — Gabriel | Kehribar `#C98A3B` | Gece 4 sonu |
| **Golden Freddy — Cassidy** | Solgun altın `#D9C46A` | **Hiç dönmüyor** |
| **Puppet — Charlotte** | Kemik beyazı `#EDEAE3` | Konuşmuyor |

**Cassidy'nin yazısı sonuna kadar makine kalıyor.** Oyunun sonunda ekrandaki
tek büyük harfli, tek bozuk altyazı onunki. Kimse "Cassidy affetmiyor" demiyor —
**yazı tipi söylüyor.**

**Puppet'ın hiç altyazısı yok.** Onun konuşması müzik kutusu. Altyazı satırında
sadece **♪** işareti beliriyor, notalar seyrekleşince işaretler de azalıyor.
Son gecede kutu tamamen susunca **altyazı çubuğu boş bir satır olarak kalıyor** —
ve o boşluk oyunun en gerilimli üç saniyesi.

### Son sahnenin detayı

2023'te Jesse'nin altyazısı **artık Nunito değil.** Rengi aynı, ama yazı tipi
Michael'ın soğuk Inter'ine dönmüş.

Kimse söylemiyor. Çocuk gitmiş.

Ve oyunun **son altyazısı** Michael'ın tek kelimesi: ekranın ortasında, tek
başına, o soğuk gri-mavide.

> Okay.

### Küçük kurallar

- **Altyazı konumu yön veriyor.** Ruhların yazısı sesin geldiği tarafta
  beliriyor (sol koridor → sol taraf). Hem detay hem oynanış yardımı.
- **Renkler koyu zemine göre seçildi**, hepsi yarı saydam koyu bir plaka
  üstünde duruyor. Renk tek başına bilgi taşımıyor — yazı tipi de ayırt
  ediyor, yani renk körlüğünde bile kimin konuştuğu belli.
- **Jesse'nin repliklerinde asla büyük harf yok.** Bağırdığı sahnelerde bile.
  Bağıramıyor, çocuk.
- **Michael hiç noktalama şişirmiyor.** Bütün replikleri nokta ile bitiyor.
  Tek bir soru işareti var, o da 2. gecede: *"How old are you?"*

---

## 9. Neden bu final işliyor

FNAF 3'te Michael binayı yakıyor ve beş ruh özgür kalıyor.

Yani **1993'te o beş ruhun bağışladığı çocuk, 2023'te onları kurtaran adamı
oraya gönderen kişi.**

Merhamet geri dönüyor. Çember kapanıyor. Oyunun bütün tezi bu:

> Bir çocuğu bırakmak, otuz yıl sonra kendilerini kurtaran şey oldu.

---

## 10. Oynanış çekirdeği

| Sistem | Nasıl |
|---|---|
| **Süre** | 00:00 – 06:00, klasik. Prototipte saat başı 21 sn, gece 126 sn |
| **Ofis** | İki kapı, sınırlı güç (FNAF 1 kalıbı) |
| **Müzik kutusu** | Ödül Köşesi'ndeki kutu tabletten uzaktan kuruluyor; boşalırsa Puppet kalkıyor |
| **Çıkış** | Her gece bir zorunlu ofis dışı görev. Ofis o sırada savunmasız; 3. geceden sonra Michael kapatıyor |
| **CEKET** | Açılıp kapanabilir. **Takılıyken:** alet taşıyabiliyor, ısınıyor — ama algılanma menzili uzun. **Çıkarınca:** alet yok, yavaş soğuk debuff'ı — ama animatronikler yarım saniye tereddüt ediyor |
| **Son gece** | Ceket seçenek olmaktan çıkıyor. Bitirmenin tek yolu onsuz |

### Denge (prototipte ölçülmüş değerler)

| Tüketim | Saniyede |
|---|---|
| Taban | %0.14 |
| Her kapalı kapı | %0.26 |
| Kamera açık | %0.16 |
| Her koridor ışığı | %0.12 |
| Koridor çıkışı sırasında | %0.30 |

**Gece çarpanı** — ilk üç gece rahat, son iki gece bilerek zor:

| Gece | 1 | 2 | 3 | 4 | 5 | Özel |
|---|---|---|---|---|---|---|
| Çarpan | ×1 | ×1 | ×1 | **×1.85** | **×2.6** | ×2.4 |

- **Müzik kutusu** dolu hâlde 2. gecede ~69 sn, 5. gecede ~48 sn dayanıyor;
  kurma hızı saniyede %48, tepeye çıkmak ~1.3 sn sürüyor.
- **Kapıya tepki penceresi 2.2 sn** (üşümüşken 3.0 sn).

Neredeyse kusursuz oynayan bir bot gecenin sonunda ne kadar güçle kalıyor:

| Gece | 3 | 4 | 5 | Özel 10/10 | Özel 20/20 |
|---|---|---|---|---|---|
| Kalan güç | %70 | %38 | **%16** | %23 | öldü (1 AM) |

İnsan bottan yavaştır — yani son iki gecede pil gerçekten bitiyor.

### Özel Gece'nin sayıları

| Karakter | 0–20 ne yapıyor |
|---|---|
| Freddy / Bonnie / Chica / Foxy | İlerleme ihtimali `(seviye + 2) / 22`; hareket aralığı en yüksek seviyeye göre 5.2 sn'den 1.8 sn'ye iniyor |
| **Golden Freddy** | Saniyede `seviye/700` ihtimalle ofiste beliriyor; 2.6 sn içinde kamerayı kaldırmazsan alıyor |
| **Puppet** | Kutunun boşalma hızı: saniyede `%0.78 + seviye×0.22`. 20'de kutu 19 saniyede bitiyor |

Yani hikayenin metaforu doğrudan bir tuşa bağlı. Oyuncu, ne anlattığını anlamadan
beş gece boyunca o tuşa basıyor.

---

## 11. Kapanan kararlar

| Konu | Karar |
|---|---|
| İsimler | **Değişmiyor.** Jesse Marlow, Gil Marlow, Michael Afton. |
| Oyun dili | **İngilizce.** Türk yapımı ama evren Amerika'da. |
| Seslendirme | **Yok.** Her şey altyazı; yazı tipi karakteri taşıyor (§8). |
| Gece sayısı | **5. Gece 6 yok, Custom Night yok.** Oyun 5. gecede bitiyor (§5). |
| Michael son sahnede | **Konuşuyor. Tek kelime: "Okay."** Oyunun son altyazısı. |
| Son konuşmanın tonu | **Soğuk.** Selam yok, veda yok, açıklama yok. Michael kapatıyor. |

---

## 12. Açık Uçlar

Netleşmemiş, konuşulacak yerler:

- **Golden Freddy'nin iki repliği fazla mı açık?** FNAF sessizliği sever;
  tek replikle de olur.
- **Ofis dışı çıkışlar oynanış olarak fazla mı kalabalık?** Beş gecenin ikisi
  tamamen ofiste geçebilir, çıkışlar 3'e inebilir.
- **Puppet'ın kutuyu vermesi mi, sadece kapıyı göstermesi mi?** İkisi birden
  fazla olabilir.
- **Puppet gerçekten hiç konuşmasın mı?** Şu an tek bir repliği bile yok.
  İstenirse oyunun en sonunda tek satır alabilir — ama o zaman "boş altyazı
  çubuğu" detayı gider.
- **Ruhların yazı tipi dönüşümü oyuncuya çok mu erken sızdırıyor?** Gece 2'de
  Bonnie'nin yazısı çocuk el yazısına dönünce oyuncu gerçeği anlıyor olabilir.
  Alternatif: dönüşüm sadece o gecelik olsun, kalıcılık 5. gecede yerleşsin.
- **Alt başlık:** "Altıncı Çocuk" / *The Sixth Child*. Kesinleşmedi.

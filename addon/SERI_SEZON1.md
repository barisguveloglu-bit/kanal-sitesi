# Minecraft animasyon serisi — 1. Sezon

Bu dosya kullanıcının (Barış) videoları için verdiği kararların kaydı.
Yeni karar geldikçe burası güncellenir; **burada olmayan bir şey
uydurulmaz** ("sahte içerik yasak" kuralı burada da geçerli).
Açık kalan her şey en altta "Açık" diye duruyor.

## Evren kuralı — LORE'dan AYRI

Seri, sitenin evreninden (`LORE.md`) **ayrı bir evren.** Kullanıcının
kararı: *"bu iki evren farklı evrenler."*

- Seride Barış'ın gizemli güçleri açılıyor. `LORE.md` "Barış güçsüz
  kalacak" diyor; çelişki değil, çünkü ayrı evren.
- Seriye ait hiçbir şey `LORE.md`'ye ya da `data.js`'e yazılmaz,
  sitede görünmez. (`LORE.md`'deki EK bölümleriyle aynı mantık.)
- El-Harkos, Ice-man / Deney 081 ve sezonun ana kötüsü yalnız bu
  dosyada yaşar.

## Teknik kararlar

| konu | karar |
|---|---|
| yol | B — Blender + MCprep (`arac/blender_film.py`) |
| görüntü | **1920×1080, 30 kare/sn** |
| neden | gönderilen deneme filmi 640×360 · 24 kare/sn · 6 örnekti (önizleme ayarı) ve "çamur gibi" göründü |
| örnek sayısı | 32–64; asıl çizimden önce tek kare ölçülerek seçilecek |
| süre tahmini | kare başına ~25–50 sn → video dakikası başına 12–25 saat (ölçülmedi, tahmin) |
| **tutuş — tamam** (v7.99.10; aşağıdaki not tarihçe) | Kullanıcı deneme filminde tırpan tutuşunu garip buldu ve *"tekrar tekrar kontrol et"* dedi. Pivot ve bel kemiği düzeltildi (duruş ve 1. vuruşta sapma ~1 px); Antitheus'un 2–4. vuruşu, agression ve guillotine'de sağ el hâlâ 10–18 px kayık (Epic Fight Tool_R'nin el içi ötelemesi çevrilmiyor, `arac/wom_cevir.py`). **Asıl çizimden önce bitirilecek.** |

## Karakterler

| kim | bölüm | ne biliniyor |
|---|---|---|
| **Barış** | 1– | İlk dövüş deneyimi; zorlanıyor. Silahı Karanlık Tırpan (kullanıcının dilinde "mızrak"). Skin: **`Simsek_Skin/uzak_akraba.png`** (aktör listesinde `uzak_akraba`) — kullanıcının seçimi. |
| **El-Harkos** | 1 | Ödül avcısı. Silahsız, yumrukla dövüşüyor. Avladıkları her silahla vücudunu delmeye çalışmış, hiçbiri işlememiş. Barış'ın ödülünü tamamladığını sanıyor; Barış'ın güçlerini açtığını fark etmiyor. **1. bölümde ölüyor.** Skin: **`kaynak_doku/ilkel_harkos.png`** ("İlkel Suikastçı El-Harkos", aktör listesinde `harkos`) — kullanıcının seçimi. |
| **Ana kötü** | sezon | **Tek karakter, iki beyaz göz** (v7.99.10 düzeltmesi; ilk yazım "iki çift" idi). Karanlık odada oturuyor. Askerleri var. Bedeni, yüzü, yapısı **hiç görünmüyor** — yalnız gözler. Kullanıcının gerekçesi: klasik kötü karakter imajı ve gizem. |
| **Ice-man** | 2 | Gerçek adı Ice-man, kod adı **Deney 081**. 2. bölümün düşmanı. Silahı **Ay Işığı Asası** (`pa:kns_asa_ayisigi`, Konsey eşyası): lacivert gövde, pençe biçimli baş, içinde buz mavisi küre. Kullanıcının gönderdiği görselle model karşılaştırılıp eşleştirildi. Modda dövüş seti yok; film için bir asa seti bağlanacak (Karanlık Tırpan'daki `OZEL_SILAH` yolu). Skin kullanıcıdan geldi (aşağıda). |
| **Komutan Ömer** | 2 | İnsanlara ait hanedanın askerî bir bölgesindeki komutan; ışıklı, harita masalı savaş odasında. Skin: **`kaynak_doku/aktor/omer.png`** — kullanıcının kendi yaptığı skin (2026-10-10), aktör listesinde `omer` (10. sıra, `pa:skin` = 9), 64×64 RGBA, geniş kol, md5 `35bfb612ddac5cce9ea74c59e106a33d`. |
| **Asker** | 1 | Ana kötünün askerlerinden; El-Harkos'un öldüğü haberini patronuna getiren görevli. |

**Ice-man skini:** kullanıcının kendi yaptığı skin (*"üzerinde biraz
çalıştım ve yaptım"*) — dış varlık değil, depoya girdi:
`kaynak_doku/aktor/iceman.png` → aktör skin listesinde `iceman`
(9. sıra, `pa:skin` = 8). 64×64 RGBA, temel katman tam opak, geniş kol
(Steve tipi), md5 `ce66e9c2f13e8435500c68ca03e66344`.

## 1. Bölüm — sahne sırası

**Mekan:** dövüş ormanlık bir alanda geçiyor.

**Saat:** başta sabah, sonradan gece (kullanıcının sözü: *"ilk başta sabah sonradan gece"*). Geçiş (kullanıcı öneriyi kabul etti): 1–4 sabah; gece dövüş (5) boyunca kesmeler arasında yavaş yavaş çöküyor; 6 ve 7 gece.

| # | sahne | kamera / efekt |
|---|---|---|
| 1 | Barış **zaten çukurda yatıyor**, El-Harkos başında | **Yenilgi gösterilmiyor** (kullanıcının kararı, v7.99.10: *"barış'ın yenilmesi gösterilmeyecek yani yerde yatacak ama onun öncesi gösterilmeyecek"*). Film geniş planda açılır ("1. BÖLÜM" yazısı), tepeden çukurdaki Barış, sonra kâğıt. |
| 2 | El-Harkos sırtını dönüp gidiyor | Barış'ın yattığı yer **zeminden ezik** (çökmüş bloklar, çatlak, saçılmış toprak). Kamera El-Harkos'a odaklı, Barış arkada bulanık ama görünür. Uzun, sessiz plan. |
| 3 | Geri bakıyor — Barış yok | Ezik **hâlâ orada ama boş.** El-Harkos'un yüzü yakın plan → gözünden boş çukur. Etrafa bakarken hafif yatık açı, kısa planlar. |
| 4 | Üç Barış ışınlanıyor | Kopyalar **dövüşmüyor**: yalnız gücün arttığını gösteriyor. Her biri kadraj kenarında, flaş ve sesle aynı karede belirip kayboluyor. 180° kuralı bilerek bozulur. Son plan tepeden: üç Barış üçgen, El-Harkos ortada küçük. |
| 5 | Dövüş | Barış zorlanıyor (ilk deneyimi): ıskalama, sendeleme, tırpanın ağırlığı. Tırpan El-Harkos'a değince kan değil kıvılcım. Güç dengesi Barış'a doğru dönüyor. |
| 5a | **İlk delen darbe** | Dövüşün dönüm noktası: Barış'ın tırpanı El-Harkos'u **ilk kez deliyor**, El-Harkos ilk kez şaşırıyor. Değdiği noktada **kan efekti**, gerçekçi. Filmde saklanan kare donması ve yavaşlatma burada harcanır; darbe iki açıdan art arda gösterilir; El-Harkos'un yüzü yakın plan; bir an sessizlik. |
| 6 | Barış **tek eliyle** gövdesini tutarak **birkaç adım** yavaş yavaş yürüyor, sonra **bayılıyor** | El-Harkos öldü. Barış kazanıyor ama ilk dövüşü ve rakibi güçlüydü: yorgunluktan bayılıyor. 2. sahnenin aynası (aynı kadraj, roller ters); film Barış yerde yatarken açılıp yerde yatarken kapanıyor: ilki yenilgi, ikincisi zafer. |
| 7 | Karanlık oda — **final sahnesinden SONRA** (videonun sonu), gece | Ana kötünün askerleri El-Harkos'un öldüğünü bir yolla öğrenmiş. Tam karanlık; yalnız **iki** beyaz göz (kullanıcı, v7.99.10: *"ben 2 tane göz istemiştim"* — ilk sürüm "iki çift göz" sözünü dört göz diye okumuştu). Kapı açıldığı an **bembeyaz** — asker o ışığın içinden siluet olarak giriyor; hüzmede yoğun toz (yıllardır açılmamış oda). Asker: *"Efendim, El-Harkos görevinde başarısız oldu."* Gözler: *"Tamam o zaman. Deney 081'i getirin."* Asker çıkar, kapı kapanır, karanlık. **Son an (kullanıcının eklemesi):** gözler askerin çıktığı kapıya bakarken **birden kameraya döner** ve **kamera ona doğru ışınlanır** (sert kesme ile aşırı yakın plan), film orada biter — dördüncü duvarın kırılması. **Kural:** kapıdan giren ışık kötüye ULAŞMAZ — ışık şeridi yerde onun önünde biter; gözler kendi ışığıyla parlar, bedenden hiçbir yüzey aydınlanmaz. |

## Replikler — onaylandı

Kullanıcı bölümün anlatımını (bu replikler dahil) *"doğru anlamışsın"*
diyerek onayladı. Karanlık oda replikleri kullanıcının. Gerisini kullanıcı Claude'a
bıraktı, tek şartla: **klişe olmasın** (*"hey oradaki, dur bakalım,
bunu sana ödeteceğim"* türü yok). Hepsi altyazı; seslendirme yok.

İlke: El-Harkos konuşuyor, Barış **hiç** konuşmuyor. El-Harkos bir
ödül avcısı gibi konuşuyor: kısa, işine bakan, duygusuz. İzleyici
"ödül avcısı" ve "silah işlemiyor" bilgisini bu repliklerden alıyor;
ayrı bir anlatıcıya gerek kalmıyor.

| sahne | an | kim | replik |
|---|---|---|---|
| 1 | Barış çukurda yatıyor; El-Harkos cebinden bir kâğıt çıkarıp bakar | El-Harkos | *"Canlı ya da ölü yazıyor. Fiyat aynı."* |
| 2 | Sırtını dönmüş yürürken, kendi kendine | El-Harkos | *"Kırk iki."* (avladığı kişi sayısı) |
| 3 | Boş çukurun başında çömelip toprağa dokunur | El-Harkos | *"Hâlâ sıcak."* |
| 4 | Kopyalar | — | sessiz (müzik de yok) |
| 5 | Tırpan vücudundan kıvılcımla seker | El-Harkos | *"Bunu daha önce de denediler."* |
| 5a | Elindeki kana bakar | El-Harkos | *"Bu… benim mi?"* |
| 6 | Ölmeden önce, Barış'a bakarak | El-Harkos | *"Seni ucuza yazmışlar."* |
| 7 | Karanlık oda | Asker · Gözler | kullanıcının replikleri (yukarıda) |

## Ses

**Sesi Claude hazırlıyor** (kullanıcının kararı). Plan — henüz yapılmadı:

- **Efektler:** CC0 (kamu malı) paketler — Kenney *Impact Sounds*,
  *RPG Audio* (adım, kapı), *Sci-fi Sounds* (ışınlanma). Depoya girebilir,
  `KAYNAKLAR.md`'ye satır yazılır. Eksik kalanlar (orman rüzgârı, gece
  cırcır böcekleri, oda uğultusu, flaş vuruşu) `ffmpeg` ile üretilir.
- **Zamanlama elle değil:** `blender_film.py`'nin zaman çizelgesi her
  temasın, savunmanın, adımın karesini zaten biliyor; ses o karelere
  oturtulur. Görüntüyle ses aynı kaynaktan.
- **Müzik: VAR** (kullanıcı kararı). Yerleşim önerisi kabul edildi:
  geri bakış (3) ve ışınlanma (4) **müziksiz** — korkuyu sessizlik
  büyütüyor; müzik dövüşle (5) giriyor. Kaynak: CC0 sinematik
  parçalar (OpenGameArt). CC0 olsa da YouTube Content ID yine
  işaretleyebilir — liste dışı bir videoda denenmeli.
- **Replikler seslendirilmiyor: yalnız altyazı** (kullanıcı kararı).
- **Minecraft'ın kendi sesleri kullanılmıyor** (Mojang'ın dosyası,
  pakette yok — Steve/Alex dokusu kuralıyla aynı).

Kan efekti için not: kısa süreli tutulursa YouTube'da yaş sınırı riski
azalır (politika kesin ölçülmedi, temkin).

## Yayın — iki parça ve kalite (v7.99.10, kullanıcının kararı)

- Bölüm **iki parça** yayınlanır (*"part 1 part 2 şeklinde yapacağız"*).
  Önerilen kesme: Barış'ın El-Harkos'un önünde belirdiği an (4. sahne
  sonu) — Part 1 ≈ 35 sn (1–4), Part 2 ≈ 68 sn (5–7 + karanlık oda).
- **Kaliteden ödün yok** (*"kaliteden hiçbir şeyi eksiltme"*,
  *"hızlandırılmış Cycles falan kullanmayacağız"*): 1920×1080, 30 fps,
  her kare çizilir, Cycles **Blender varsayılanları** (4096 örnek,
  uyarlamalı eşik 0.01, gürültü giderici, varsayılan ışık sekmeleri).
  v7.99.10'daki 16 örnek + kısıtlı sekme ayarı kaldırıldı.
- Ses: son zincir kompresör → −14 LUFS → limiter (ffmpeg); müzik,
  efekt, ortam ayrıca stem olarak verilir (kullanıcı isterse son
  miksajı Resolve Fairlight'ta yapar).

## Denetim kuralı (kullanıcının şartı)

*"İzleyiciye bozuk bir animasyon vermek kötü olur."* Çizim bitince:

1. **Her sahne ayrı ayrı** taranır (N sahne → N denetim): kemik
   kopması, silahın elden kayması, iç içe geçme, zemine gömülme,
   kamera kesmesinde sıçrama, altyazı zamanı, ses eşleşmesi.
2. Sonra **bütün film bir kez** baştan sona taranır (N + 1).
3. Bulunan her bozukluk düzeltilir ve o sahne yeniden taranır.

Tarama iki katmanlı: ölçülebilen her şey betikle (kare kare sayılarla),
ölçülemeyen her şey karelere bakılarak.

**İlk önizlemeden ders (v7.99.10):** betik "0 sorun" dedi, karelere
bakınca beş ciddi hata çıktı — ikinci katman atlanamaz. Çıkanlar ve
kaynağında kapatılışları:

| görülen | sebep | kilit |
|---|---|---|
| çukur solgun, dokusuz | ufuk düzlemi (z −0.01) çukurun deliğini örtüyordu | ufuk ortası boş |
| aktör ötekini kapatıyor | alçak açı kamerayı B'nin arkasına, omuz üstü B'yi A'nın omzunun arkasına koyuyordu | `kamera_denetim.py` ORTME / ONPLAN |
| ~1 sn gri boşluk | POV kamerası aktörün kendi kafasının içindeydi | ONPLAN (POV) |
| final simsiyah | ay 0.32, gök 0.012 | ışık anahtarları |
| kağıt görünmüyor | kağıt kalkan kolla yatıyordu | kağıt dinlenmede yatay |
| 7 karede bir çizim | ışık döngüsü `adim`'ı eziyordu (1080p'yi de bozardı) | `test/blender_film.mjs` |
| **tam kalite** 9. karede El-Harkos'un elinde beyaz tahta (kullanıcı: *"o sorunu da düzelt"*) | kağıdın ilk karesine anahtar yazılmıyordu; Blender "açık" anahtarını geriye uzatıp kağıdı açılıştan 4,7 sn'ye kadar gösterdi (önizlemede de vardı) | `esya_anahtarlari` + `test/blender_film.mjs` |
| kağıt kol havadayken bir anda yok | `esya: null` `poz_bitir` ile aynı andaydı | kol inerken kaybolur (t_k+4.1) |
| düzeltmeden sonra yerelde eski kodla çizilmiş kareler | işçi diskteki geçerli kareyi "var" sayıyordu | `.girdi` imzası; `test/cizim_dagit.mjs` 4b |
| **kan efekti — kullanıcı B'yi seçti** (Mojang kılavuzu "violence / mature content") | 18 damladan her 3'ü biri çizilir, %60 boy, daha koyu; **yerdeki lekeler aynı** (aynı rnd dizisi) | önizlemeyle ölçüldü: uçuş kareleri değişti, kan yere indikten sonraki kareler (1630, 1980) eski kodla **piksel piksel aynı**. Kan uçuşu: 1577–1618 ve 1919–1969 → bu kareler yeni kodla ayrı işçilerde çizilir, ana işçiler depoda bulup atlar |
| başlık kartı sahnenin üstündeydi (Mojang: "title card ... outside of the actual game content") | `altyazi_bas` başlığı sahneye basmıyor; `film_birlestir` sahneden önce 2,5 sn siyah kart koyuyor | `test/baslik_karti.mjs` (mutasyonla ısırdı) |

## Varsayılanlar — cevap beklemeden uygulandı

Kullanıcı *"çizmeye başla"* dedi; aşağıdakiler soruldu ama cevap
gelmedi, o yüzden Claude'un önerisi uygulanıyor. **Kullanıcı
değiştirebilir** — değişirse buradan silinip yukarıya yazılır.

- **Askerin skini:** `okazor` (koyu ton; zaten ışığın önünde siluet).
- **Hedef süre:** ~2,5 dakika.
- ~~Tırpan 1. sahnede de Barış'ın elinde~~ — **DÜZELTİLDİ (kullanıcı, v7.99.10):** *"hikayeye göre mızrak güçlerim uyandıktan sonra geliyor."* Barış çukurda **silahsız** yatar; mızrak güç uyanınca gelir (çukurdan kaybolduğu an, görünmezken). Kopyalar ve geri dönen Barış mızraklı. Dövüş dışında mızrak **ölüm meleği tutuşuyla** (sap dik, bıçak başın üstünde; `film_poz.tirpan_bekle`), dövüşte Antitheus tutuşuyla.
- **El-Harkos'un ölümü:** ilk delen darbeden sonra son alışverişte
  tırpan ikinci kez deliyor; dizlerinin üstüne çöküyor, son repliği
  söylüyor, yüzüstü düşüyor. Kan yine kısa.
- **Gücün rengi:** Karanlık Tırpan'ın mor ışığı (ışınlanma parçacığı
  ve flaş).
- **Açılış kartı:** seri adı uydurulmaz; yalnız *"1. BÖLÜM"*.

## 2. bölüm — kullanıcının planı (2026-10-10)

Kullanıcının kendi sözü: *"2. bölümün süresi uzayacak ama partlar bu sefer
1-2 değil birden fazla olacak… salı günü başlayacağımı düşünüyorum, pazara
kadar yaparız."*

- 1. bölümden **uzun**; yayın **ikiden fazla parça**.
- Çalışma salı başlıyor, hedef pazar.
- Hikâyesi henüz yok — burada olmayanı uydurma, kullanıcı anlatınca yazılır.
- Ölçüden çıkan not: 1. bölüm (~103 sn) 22 işçiyle ~1,5–2 gün çiziliyor ve
  asıl darboğaz hesap limiti. Daha uzun bölümde her parça önizlemesi
  onaylanır onaylanmaz çizime girmeli; sonraki parça yazılırken önceki
  çizilir (parçalar sırayla yayına hazır olur).

### Hikâye — İLK TASLAK (kullanıcı, 2026-10-10; değişebilir)

**ONAY BEKLİYOR (2026-10-10):** kullanıcı *"henüz ben bunları onaylamadım … beni bekle"*
dedi. Sıra: 1. bölümün Part 1'i tam kalite çizilir, ses/müzik eklenir, kullanıcıya
teslim edilir ve **orada beklenir**. Onay gelmeden 2. bölümün senaryo JSON'u,
çekimi ya da çizimi başlamaz.

Kullanıcı: *"ilk taslak, sonradan değişebilir."* 1. bölümün devamı;
kötü **Ice-man / Deney 081** (1. bölümün sonunda gözlerin "getirin"
dediği). Silahı zaten kayıtlı: Ay Işığı Asası.

| # | sahne | not |
|---|---|---|
| 1 | Barış yerde, baygın yatıyor (ilk dövüş fazla yordu) | 1. bölümün son sahnesinin devamı |
| 2 | Uzaktan **el lambasıyla** biri geliyor | **Barış'ın gözünden** (POV); geleni yalnız **bulanık yüzüyle** görüyoruz |
| 3 | Barış bir yerde uyanıyor, nerede olduğunu anlamaya çalışıyor | artık POV değil, normal kamera açısı |
| 4 | Bir **kitap** görüyor, okuyor | kitapta **ateş büyüleri**; yazı ekranda tam okunmuyor, okuduğunu varsayıyoruz. Metni Claude yazıyor (aşağıda, onay bekliyor) |
| 5 | Kitabı yerine koyuyor; **ağrılarının birden geçtiğini** fark ediyor | |
| 6 | Bulunduğu **bataklıktaki evden** çıkıp yürümeye başlıyor; hafif bir **üşüme** hissi | |
| 7 | Kesme: **Komutan Ömer** (yeni karakter) | oda **ışıklarla dolu, biraz şaşalı**: büyük bir haritanın serildiği, ülkelerin birbirine karşı plan kurduğu bir **savaş/toplantı odası** |
| 8 | Biri kapıyı tıklatıp giriyor: *"Efendim, Doğu bölgesinden çok büyük buz dalgaları hissediyoruz. Hanedanımızın büyücüleri öyle hissetti."* Ömer: *"Tamam."* | |

Ice-man hakkında: ortaya çıktığı günden beri ülkeler arası bir
**soğukluk** hissettirmiş. Bir **ordusu** olacak.

**Ice-man ordusu (kullanıcı, 2026-10-10):** Ice-man **yeni bir dönem
açıyor**. Ordusu **ele geçirdiği köylere göre** şekilleniyor: iskeletler,
zombiler, golemler; o köylerin hanedanına ait **farklı farklı creeper'lar**
ve başka yaratıklar. Hepsi buzla ilişkili.
- **Mojang izin verirse:** Minecraft'ın kendi yaratıkları (buz hâlleriyle).
- **İzin yoksa:** kendi buz modellerimiz, kendi dokularımızla — El-Harkos
  ve aktörlerde olduğu gibi. Mojang'ın modeli/dokusu depoya girmez.
- Henüz belli değil: hangi köyler, hangi hanedanlar, creeper çeşitleri.

**Buz virüsü (kullanıcı, 2026-10-10):** Ice-man, **Barış onu yenene kadar**
buzlaşmış bir **virüs** yayıyor; seviyesi ilerledikçe kendi ordusundan kendi
virüsünü üretiyor.
- **Bulaşma:** ısırıkla. Örnek: bir zombi köydeki bir insanı ısırır, virüs
  ısırıktan girer; **önce bedene alışır, sonra buzlaşma başlar.**
- **Tedavi:** kökünden kazımanın yolu, Minecraft'ta zombi köylüyü normal
  köylüye çevirmenin yollarıyla **aynı** (oyunda: zayıflık iksiri + altın
  elma — kullanıcıya teyit ettirilecek).
- **Neden çözülemiyor:** tek bir hanedan buna kalkışırsa **yeterli malzemesi
  yok**; hanedanların ve krallıkların kendi çıkarları var ve **kimse kimseye
  güvenmiyor** — bu yüzden neredeyse imkânsız.
- Açık: buzlaşan kişi Ice-man'in ordusuna mı katılıyor; virüs yalnız insanlara
  mı, başka ırklara da mı geçiyor; ısırıktan buzlaşmaya ne kadar sürüyor.

**Kitabın metni (Claude yazdı — kullanıcı onayladı: *"kitap metni güzel olmuş"*):**

> ATEŞİN KİTABI
> Ateş, istemeyenin elinde söner; isteyenin elinde büyür.
> I. Kıvılcım — Avucunu aç, nefesini tut, sıcaklığı parmak uçlarına çağır.
> II. Alev Kalkanı — Korku soğuktur. Ateşi göğsünde topla, etrafına çevir.
> III. Kor Yürüyüşü — Ayağının altındaki toprağı ısıt; buz seni tutamaz.
> Uyarı: Ateş, onu çağıranın canından yer. Yorgun bedenle büyü yapılmaz.

**Dünya — kullanıcının anlattığı (2026-10-10):**
- Birden fazla **hanedan ve krallık** var; her biri **farklı bölgede**
  yaşıyor ve her birinin **ırkı farklı**. **End'de ve Nether'da** da
  krallıklar var.
- **Komutan Ömer:** **insanlara** ait hanedanın askerî bir bölgesindeki
  komutan.
- **El lambalı kişi:** **cadı** ırkından.
- **Cadıların geçmişi:** bir zamanlar insan topluluğunun içinde
  yaşıyorlardı; insanlar onları hor gördü, "tanrının kutsamadıkları"
  diye ayırdı. Bazıları idam edildi, bazıları kaçabildi. Bu, **Barış'ın
  çağından 5000 yıl önce**, daha ilkel bir dönemde oldu — o yüzden
  kullanıcı "krallık/hanedan" değil **"insan topluluğu"** diyor.
- Cadı soylarından hangilerinin hangi bölgelerde yaşadığı ya da yaşamadığı
  **henüz bilinmiyor** — kullanıcının bilgisi, ileride paylaşacak.

**Cevaplananlar (kullanıcı, 2026-10-10; mikrofonla yazıyor, "şikayet hatsanı"
= "hikâye taslağını", "aysima" = "Ice-man"):**
- **Cadının adı:** henüz yok. Yorumlara göre ileride kullanıcı verecek; uydurulmaz.
- **Barış'ı neden kurtardığı:** *"gizli kalsın"* — filmde açıklanmaz, tahmin yazılmaz.
- **Bataklıktaki ev cadının.** Tasarım: Minecraft'ın **bataklık kulübesi (cadı
  kulübesi) ile aynısı** (*"o kulübenin aynısı olacak"*). Blok blok ölçülerek
  kurulur, tahminle değil; Mojang'ın yapı dosyası depoya girmez, sahne bizim
  betiğimizle kurulur (orman sahnesi gibi).
- **Ice-man ordusu:** zombi, iskelet, creeper — **bizim modellerimiz**, buzlaşmış
  hâlleriyle — ve **insanlar**. İnsan skinlerini kullanıcı bulup indirme linkini
  verecek; her biri `KAYNAKLAR.md` üç kademe kuralına göre kaydedilir.

- **Kulübeye eklenenler (kullanıcı):** asıl kulübede olmayan **yatak** ve
  **kitaplık** bizim eklememiz — kulübe *"bunlar eklenmiş şekilde"* olacak.
  Barış yatakta uyanır (yatak **kırmızı**), ateş kitabı kitaplıktan. Dokular MCprep paketinde var
  (ölçüldü: `bookshelf`, `*_bed_*`, `lectern_top`, `cauldron_side`,
  `crafting_table_front`, `spruce_planks`, `oak_log`, `flower_pot`,
  `red_mushroom`, `lily_pad`, `vine`). Kulübeyi kuran kod henüz yok; onaydan
  sonra `blender_film.py`'ye blok blok yapı kurucu olarak yazılır.

**Hâlâ açık:** cadı soylarının bölgeleri; parça sayısı ve sınırları; başka
eşya istenip istenmediği.

**Mojang kısıtı (kullanıcı, 2026-10-10):** kullanıcı "Mojang'a ait hiçbir
şey kullanmama" kararının kendisini kısıtladığını, Mojang'a yazıp izin
istemek istediğini söyledi. Bizim kuralımız kendi koyduğumuz bir temkin
(Mojang dosyaları depoya/pakete girmiyor, Minecraft sesleri yok);
Mojang'ın kullanım yönergeleri videoya ve reklam gelirine genel olarak
izin veriyor görünüyor ama resmî metin o gün okunamadı (minecraft.net
503 verdi).

**KARAR (kullanıcı, 2026-10-10): Mojang'a yazılmıyor; Minecraft Kullanım
Kılavuzu'na uyularak zombi, iskelet, creeper, golem filmde kullanılabilir.**
Kullanıcının kendi araştırması (Google'ın yapay zekâ özeti) ve bizim ikinci
el kaynaklarımız aynı yönde. Her videoda uyulacaklar:
- Açıklamada: *"NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR
  ASSOCIATED WITH MOJANG OR MICROSOFT."* (güncel kılavuzda "OR
  MICROSOFT" ekli olabilir; eklemek zarar vermez). **Part 1 dahil.**
- Başlık "Minecraft" ile başlamaz: "<Ad> - Bir Minecraft Animasyonu".
- Resmî Minecraft logosu kapakta/videoda kullanılmaz.
- Minecraft müziği kullanılmaz (Content ID); bizde zaten CC0 müzik var.
- Videoda yeterince **özgün içerik** olmalı (reklam geliri şartı) — bizim
  filmler kendi hikâyemiz, kendi karakterlerimiz.
- **Ayrı kural, değişmedi:** Mojang dosyaları (doku, ses, model) herkese
  açık depoya ve pakete girmez. Filmde gerekirse yalnız çizim makinesinde
  kullanılır (MCprep'in yaratık iskeletleri resmî kaynaktan kurulumla gelir).
- **Resmî sayfa 2026-10-10'da okundu** → tam liste ve gerekçeler:
  **`REFERANS_MOJANG_KILAVUZ.md`**. Doğrulanan: uyarı metninde "OR
  MICROSOFT" VAR. Yeni çıkan iki madde: başlık kartı oyun içeriğinin
  dışına (ayrı karta) konur; kılavuz "violence / mature content"i
  markaya zararlı sayıyor → kan efekti kararı kullanıcıda.

## Açık

- **Seslendirme — yeniden konuşulacak (kullanıcı, 9 Ekim gecesi):** *"normal
  sohbette sesli konuşma var ya, onun seslerini bulsan onları kullansak."*
  Şu anki karar "seslendirme yok, yalnız altyazı". Konuşulmadan değişmez.
  Bakılacak: Claude uygulamasının sesli sohbet seslerine bu makineden
  ulaşılabiliyor mu, kullanım izni bir YouTube videosunda kullanmaya
  izin veriyor mu. Vaat yok; önce araştırılıp kullanıcıya söylenecek.

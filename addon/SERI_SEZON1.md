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

## Karakterler

| kim | bölüm | ne biliniyor |
|---|---|---|
| **Barış** | 1– | İlk dövüş deneyimi; zorlanıyor. Silahı Karanlık Tırpan (kullanıcının dilinde "mızrak"). |
| **El-Harkos** | 1 | Ödül avcısı. Silahsız, yumrukla dövüşüyor. Avladıkları her silahla vücudunu delmeye çalışmış, hiçbiri işlememiş. Barış'ın ödülünü tamamladığını sanıyor; Barış'ın güçlerini açtığını fark etmiyor. **1. bölümde ölüyor.** Skin: depodaki `harkos`. |
| **Ana kötü** | sezon | **Tek karakter, iki çift (dört) beyaz göz.** Karanlık odada oturuyor. Askerleri var. Bedeni, yüzü, yapısı **hiç görünmüyor** — yalnız gözler. Kullanıcının gerekçesi: klasik kötü karakter imajı ve gizem. |
| **Ice-man** | 2 | Gerçek adı Ice-man, kod adı **Deney 081**. 2. bölümün düşmanı. Silahı **Ay Işığı Asası** (`pa:kns_asa_ayisigi`, Konsey eşyası): lacivert gövde, pençe biçimli baş, içinde buz mavisi küre. Kullanıcının gönderdiği görselle model karşılaştırılıp eşleştirildi. Modda dövüş seti yok; film için bir asa seti bağlanacak (Karanlık Tırpan'daki `OZEL_SILAH` yolu). Skin kullanıcıdan geldi (aşağıda). |
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
| 1 | El-Harkos Barış'ı yeniyor | El-Harkos alt açıdan, Barış üst açıdan. Son darbede kare donar; geniş planda Barış düşer. |
| 2 | El-Harkos sırtını dönüp gidiyor | Barış'ın yattığı yer **zeminden ezik** (çökmüş bloklar, çatlak, saçılmış toprak). Kamera El-Harkos'a odaklı, Barış arkada bulanık ama görünür. Uzun, sessiz plan. |
| 3 | Geri bakıyor — Barış yok | Ezik **hâlâ orada ama boş.** El-Harkos'un yüzü yakın plan → gözünden boş çukur. Etrafa bakarken hafif yatık açı, kısa planlar. |
| 4 | Üç Barış ışınlanıyor | Kopyalar **dövüşmüyor**: yalnız gücün arttığını gösteriyor. Her biri kadraj kenarında, flaş ve sesle aynı karede belirip kayboluyor. 180° kuralı bilerek bozulur. Son plan tepeden: üç Barış üçgen, El-Harkos ortada küçük. |
| 5 | Dövüş | Barış zorlanıyor (ilk deneyimi): ıskalama, sendeleme, tırpanın ağırlığı. Tırpan El-Harkos'a değince kan değil kıvılcım. Güç dengesi Barış'a doğru dönüyor. |
| 5a | **İlk delen darbe** | Dövüşün dönüm noktası: Barış'ın tırpanı El-Harkos'u **ilk kez deliyor**, El-Harkos ilk kez şaşırıyor. Değdiği noktada **kan efekti**, gerçekçi. Filmde saklanan kare donması ve yavaşlatma burada harcanır; darbe iki açıdan art arda gösterilir; El-Harkos'un yüzü yakın plan; bir an sessizlik. |
| 6 | Barış gövdesini tutarak **birkaç adım** yavaş yavaş yürüyor, sonra **bayılıyor** | El-Harkos öldü. Barış kazanıyor ama ilk dövüşü ve rakibi güçlüydü: yorgunluktan bayılıyor. 2. sahnenin aynası (aynı kadraj, roller ters); bayılma 1. sahnedeki düşüşün aynası — film iki düşüşle açılıp kapanıyor, ilki yenilgi, ikincisi zafer. |
| 7 | Karanlık oda — **final sahnesinden SONRA** (videonun sonu), gece | Ana kötünün askerleri El-Harkos'un öldüğünü bir yolla öğrenmiş. Tam karanlık; yalnız dört beyaz göz. Kapı açıldığı an **bembeyaz** — asker o ışığın içinden siluet olarak giriyor; hüzmede yoğun toz (yıllardır açılmamış oda). Asker: *"Efendim, El-Harkos görevinde başarısız oldu."* Gözler: *"Tamam o zaman. Deney 081'i getirin."* Asker çıkar, kapı kapanır, karanlık. **Kural:** kapıdan giren ışık kötüye ULAŞMAZ — ışık şeridi yerde onun önünde biter; gözler kendi ışığıyla parlar, bedenden hiçbir yüzey aydınlanmaz. |

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

## Açık

- Barış'ın skini (aktör listesinde yok).
- Askerin skini.
- El-Harkos için depodaki `harkos` skini mi?
- Hedef video süresi (çizim süresini belirliyor).
- 1. bölümde başka replik var mı? (Şu an yalnız karanlık oda iki
  replik; uydurulmaz.)
- İzleyici El-Harkos'un ödül avcısı olduğunu ve "hiçbir silah
  işlemiyor" bilgisini nereden öğreniyor (replik / afiş / anlatıcı)?
- Barış'ın tırpanı 1. sahnede de elinde mi?
- El-Harkos nasıl ölüyor (son darbe)?
- Barış'ın gücünün rengi / görünüşü (ışınlanma parçacıkları).
- Açılış: seri adı, bölüm adı kartı.

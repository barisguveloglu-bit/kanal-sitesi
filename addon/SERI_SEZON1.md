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
| **Ana kötü** | sezon | İki çift beyaz göz. Karanlık odada oturuyor. Askerleri var. |
| **Ice-man** | 2 | Gerçek adı Ice-man, kod adı **Deney 081**. 2. bölümün düşmanı. Silahlı; silahı asalardan biri. Skin kullanıcıdan geldi (aşağıda). |
| **Asker** | 1 | Ana kötünün askerlerinden; El-Harkos'un öldüğü haberini patronuna getiren görevli. |

**Ice-man skini:** kullanıcının kendi yaptığı skin (*"üzerinde biraz
çalıştım ve yaptım"*) — dış varlık değil, depoya girdi:
`kaynak_doku/aktor/iceman.png` → aktör skin listesinde `iceman`
(9. sıra, `pa:skin` = 8). 64×64 RGBA, temel katman tam opak, geniş kol
(Steve tipi), md5 `ce66e9c2f13e8435500c68ca03e66344`.

## 1. Bölüm — sahne sırası

**Mekan:** dövüş ormanlık bir alanda geçiyor.

| # | sahne | kamera / efekt |
|---|---|---|
| 1 | El-Harkos Barış'ı yeniyor | El-Harkos alt açıdan, Barış üst açıdan. Son darbede kare donar; geniş planda Barış düşer. |
| 2 | El-Harkos sırtını dönüp gidiyor | Barış'ın yattığı yer **zeminden ezik** (çökmüş bloklar, çatlak, saçılmış toprak). Kamera El-Harkos'a odaklı, Barış arkada bulanık ama görünür. Uzun, sessiz plan. |
| 3 | Geri bakıyor — Barış yok | Ezik **hâlâ orada ama boş.** El-Harkos'un yüzü yakın plan → gözünden boş çukur. Etrafa bakarken hafif yatık açı, kısa planlar. |
| 4 | Üç Barış ışınlanıyor | Kopyalar **dövüşmüyor**: yalnız gücün arttığını gösteriyor. Her biri kadraj kenarında, flaş ve sesle aynı karede belirip kayboluyor. 180° kuralı bilerek bozulur. Son plan tepeden: üç Barış üçgen, El-Harkos ortada küçük. |
| 5 | Dövüş | Barış zorlanıyor (ilk deneyimi): ıskalama, sendeleme, tırpanın ağırlığı. Tırpan El-Harkos'a değince kan değil kıvılcım. Güç dengesi Barış'a doğru dönüyor. |
| 5a | **İlk delen darbe** | Dövüşün dönüm noktası: Barış'ın tırpanı El-Harkos'u **ilk kez deliyor**, El-Harkos ilk kez şaşırıyor. Değdiği noktada **kan efekti**, gerçekçi. Filmde saklanan kare donması ve yavaşlatma burada harcanır; darbe iki açıdan art arda gösterilir; El-Harkos'un yüzü yakın plan; bir an sessizlik. |
| 6 | Barış gövdesini tutarak gidiyor | 2. sahnenin aynası: aynı kadraj, roller ters. El-Harkos öldü; Barış kazanıyor ama yaralı. |
| 7 | Karanlık oda — **final sahnesinden SONRA** (videonun sonu) | Ana kötünün askerleri El-Harkos'un öldüğünü bir yolla öğrenmiş, patronlarına söylüyorlar. Tam karanlık, iki çift beyaz göz. Kapı açılıyor: kapı tamamen ışık, hüzmede yoğun toz (yıllardır açılmamış oda). Asker girer: *"Efendim, El-Harkos görevinde başarısız oldu."* Gözler: *"Tamam o zaman. Deney 081'i getirin."* Asker çıkar, kapıyı kapatır, karanlık. |

Kan efekti için not: kısa süreli tutulursa YouTube'da yaş sınırı riski
azalır (politika kesin ölçülmedi, temkin).

## Açık

- İki çift göz: dört gözlü **tek** bir karakter mi, **iki** kişi mi?
- Ice-man'in asası: moddaki 9 asa kullanıcıya gösterildi (6 dövüş
  asası: tahta, taş, demir, altın, elmas, netherite — aynı kombo, farklı
  hız/hasar; 3 büyü asası: Emrys, Patlayıcı Mana, Uzamsal Karışıklık —
  dövüş seti yok). Seçim bekleniyor; kendi buz asası modeli de seçenek.
- Ormanda saat (gündüz / alacakaranlık / gece).
- Ses ve müzik kimde (filmde şu an ses yok).

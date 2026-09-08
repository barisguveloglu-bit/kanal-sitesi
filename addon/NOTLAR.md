# v7.67.0 — Çarpık Hal

Kullanıcı: *"benim skinin renklerini tam terse çevirelim, tam tersi
çevirdikten sonra bir tane sırıtış ekleyelim, yeni bir form olduğu
için böyle yapmak istedim."* Titremenin şiddetini bize bıraktı.

Önce araştırma istedi: *"çarpılmış halimi yapmadan önce Distorted
Alex'in tüm bulabildiğin kaynaklarda araştırma yapmanı istiyorum,
hikayesini okumanı istiyorum."*

## Araştırma

Fandom sayfaları normal yoldan **402** verdi; metinler wiki'nin kendi
API'sinden alındı (`action=parse&prop=wikitext`) — yani özet değil ham
kaynak. İngilizce sayfa, Türkçe çevirisi, sayfadaki iki ekran
görüntüsü okundu. Crazy Alex / Dark Alex / NameAlex de açıldı ve
**ayrı varlıklar** oldukları doğrulandı; karıştırılmadı.

Tamamı `LORE.md` **EK-B**'de — EK-A ile aynı kural: canon değil,
siteye çıkmıyor, `data.js`'e yansıtılmıyor.

Kaynağın varlık tarifi tek cümle: *"She is the default female skin,
Alex. She has a big, distorted grin."* Kanonik tek ayırt edici şey
**sırıtış**. Devasa değil, koşmuyor, saldırmıyor, konuşmuyor.

Ayrıca bir **tutarsızlık** bulundu: seed EN'de 19 haneli, TR'de 17
haneli yazılmış (`98` düşmüş). İkisi de doğrulanmış değil.

## Ölçüm: kullanıcının skini zaten yarı yolda

64×64, 43 renk, 1671 opak piksel. **Kol üst yüzü 3 piksel → ince
(Alex) modeli.** Distorted Alex de Alex skini olduğu için denk düştü,
ama bu seçim değil ölçüm.

Yüzünde gözler hizasında siyah bir bant, altında geniş açık renkli bir
ağız bandı vardı. Ters çevrilince siyah bant **beyaz boşluğa**, ağız
bandı **koyu çizgiye** dönüyor — yani sırıtışı çizmek için en okunur
zemin kendiliğinden oluşuyor.

## Sırıtış üç aday arasından seçildi

Üç plan çizilip yan yana bakıldı:

| aday | sonuç |
|---|---|
| **A** — uçlar y5'te kalkık, y6 gövde, y7 daralan | **seçilen**: kavis okunuyor, gözler okunur kalıyor |
| B — y6 ve y7 tam genişlik | siyah blok, kavis kayboldu |
| C — y6 tam genişlik + y7 sadece uçlar | düz çizgi, zayıf |
| A2 — uçlar y4'e çıkarılmış | gözleri yutuyor |

## Titreme — kaynakta yok, bilerek ince

Dürüst cevap: **hikâyede titreme yok.** Distorted Alex hareketsiz
duruyor, çatıda bekliyor, fark edilince kayboluyor; metinde tek bir
hareket ya da ses geçmiyor.

Sürekli ama ince: ±1,5° gövde/uzuvlar, ±2,5° kafa, ±0,15 blok kayma.
Şiddetli bir sarsıntı karakteri "glitch"e çevirirdi ve kaynağın ruhuna
— az ve yanlış olmak — ters düşerdi.

`math.random` kullanılıyor, `math.sin` değil: sinüs düzenli bir
sallanma verirdi, "bozuk" değil "dans ediyor" gibi görünürdü. Depoda
`math.random` **ilk kez** burada kullanılıyor.

## Yapı

Doku **her üretimde kaynak skinden yeniden hesaplanıyor**; depoda
türev tutulmuyor, kaynak tutuluyor (`kaynak_doku/carpik_kaynak.png`).
Kullanıcı skinini değiştirirse çarpık hal kendiliğinden takip eder.

Kılık mantığı **kopyalanmadı**: `donusum.js` tek bir parametre aldı
(kılık kimliği, varsayılan `SEY_KILIK_KIMLIK`). Kopyalansaydı
hizalama, temizlik, kalıcılık ve çıkış mantığı iki yerde dururdu.

## Yedinci kez aynı tuzak

Üreteçteki temizlik adımı `beklenen` listesinde olmayan her dokuyu
siliyor. `carpik.png` üretildi, aynı koşuda silindi, yalnız OMP
kopyası kaldı. `kol_uret.py`'deki yorum "aynı tuzak altıncı kez"
diyordu — bu yedincisi. Not güncellendi.

## Test

`carpik.mjs` — 30 madde. En önemlisi **dokunun gerçekten ters
olduğu**: kaynak ile türev piksel piksel karşılaştırılıyor.
Ölçüm: `ters=1659  ayni=0  saydam_korundu=2425  sirit_siyah=12/12`.

"Kaynakla aynı kalan piksel yok" maddesi asıl koruma: üreteç bozulup
kaynağı kopyalasaydı form "çarpık" değil "aynı skin" olurdu ve
hiçbir görsel test bunu fark etmezdi.

**11 mutasyon denendi, 10'u yakalandı.** Kaçan ve neden kaçtığı test
dosyasına yazıldı: saydam piksellerin RGB'sini de ters çevirmek alfayı
değiştirmiyor, yani davranışı koruyan bir mutasyon.

Mutasyon bataryası **gerçek bir test zayıflığı** buldu: `donus()`
parametreyi yoksayıp hep O Şey doğursa bile test yeşil yanıyordu,
çünkü deftere yazılan alanı ölçüyordum. Artık **doğan varlığın
typeId'si** ölçülüyor.

# v7.69.0 — Çarpık Hal doğru skinden üretiliyor

Kullanıcı: *"uzak_akraba.png'nin değiştirilmiş halini gönder bana, ama
linkten."*

## Ne yanlıştı

v7.67'de form, kullanıcının sohbete gönderdiği **başka bir skinden**
üretiliyordu. Hikâye kurulunca ortaya çıktı: çarpılan kişi Uzak Akraba,
ama form onun skininden gelmiyordu. İki dosya **%42 piksel farklı**.

Kullanıcı bunu zaten söylemişti — *"Ana tema full siyah olduğu için
bilemiyorum"* — ilk okuyuşta anlaşılmadı.

## Düzeltme ve ortaya çıkan şey

Kaynak `Simsek_Skin/uzak_akraba.png` oldu. `kaynak_doku/` altında ikinci
bir kopya tutulmadı: o dosya skin paketinin kendi kaynağı, kopya elle
eşitlenecek ikinci bir doğruluk kaynağı olurdu. Eski
`carpik_kaynak.png` silindi.

Sonuç hikâyeye çok daha uygun. Skin neredeyse tamamen siyah
(`#0a0a0d`, `#060608`), tersi **bembeyaz** oluyor:

| orijinal | tersi |
|---|---|
| siyah gövde | beyaz |
| chris1545'in kan damarları (kırmızı) | **camgöbeği** |
| camgöbeği izler | **kırmızı** |
| pranga halkaları (gri) | gri kalıyor |

Yani hapisliğin ve zehrin izleri kaybolmuyor, **ters yüz** oluyor.

## Bunu yakalayan asıl şey: geometri artık ölçülüyor

`uzak_akraba.png` **klasik (Steve, 4 piksel kol)** çıktı. v7.67'deki
geometri ise **ince (Alex, 3 piksel)** diye **sabit yazılmıştı** —
çünkü o günkü kaynak skin inceydi.

Sabit kalsaydı kol dokusu bir piksel kayardı ve **kimse fark etmezdi**.

Artık `carpik_kol_genisligi()` kaynağı ölçüyor: kol üst yüzü 64×64
düzende `y=16`, `x=44..51`. İnce skinde 6 sütun opak (3+3), klasikte 8
(4+4). Belirsizse klasik varsayılıyor — vanilla varsayılanı o.

Test de artık sabit beklemiyor: **kaynağı ölçüp geometriyle
karşılaştırıyor.** Kullanıcı yarın skinini ince bir skinle değiştirse
geometri kendiliğinden takip eder.

## Ölçüm

```
ters=1620  ayni=0  saydam_korundu=2464  sirit_siyah=12/12
kol: geo 4 · kaynak 4
```

## Belgeye eklenen uyarı

`LORE.md` EK-B'ye açık bir cümle yazıldı: formun **görünüşü** Distorted
Alex araştırmasından, **hikâyesi** Uzak Akraba'dan geliyor. Kaynakta
Uzak Akraba'nın çarpık bir hâli olduğu **yazmıyor** — ikisini
birleştiren kullanıcının kurgusu.

EK-A'nın kendi kuralı "iki evrenin karakterleri karıştırılmaz" diyor;
bu geçiş bilerek yapıldı ve artık yazılı olduğu için sessiz bir ihlal
değil.

## Test

2 mutasyon denendi, 2'si de yakalandı: kol genişliği sabit 3'e
çevrildi · kaynak yanlış skine çevrildi.

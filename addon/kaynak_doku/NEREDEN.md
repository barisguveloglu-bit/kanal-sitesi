# Kaynak dokular

Bu klasördeki PNG'ler **üretilmiyor**, elle konuldu. `kol_uret.py`
üretilmiş yer tutucu yerine bunları kopyalıyor (`IKSIR_DOKU` tablosu).
Dosya yoksa üretilen doku kullanılır — paket yine de çalışır.

| dosya | nereden |
|---|---|
| `iksir_staroxine.png` | `best StarOxine mod` kaynak paketi → `textures/items/pamobile/dy_staroxine.png` (32×32, olduğu gibi) |
| `iksir_element.png` | `Element İksiri modu V2` kaynak paketi → `textures/items/pamobile/pa_element.png` (498×501 çizim, 32×32'ye küçültüldü) |

Element dosyası küçültülürken saydam olmayan kutuya kırpıldı, kareye
yaslandı, LANCZOS ile 32×32'ye indirildi ve yarı saydam kenar pikselleri
temizlendi (alfa < 110 → tamamen saydam, değilse tamamen opak). Minecraft
eşya ikonlarında yarı saydam kenar kirli görünüyor.

## Ölçülen renkler

Aşağıdakiler bu dosyalardan piksel sayarak çıkarıldı, tahmin değil.
`kol_uret.py` içindeki `IKSIRLER` ve `ayarlar.js` içindeki `KADEMELER.renk`
bu sayılara dayanıyor.

| ne | renk |
|---|---|
| StarOxine sıvı | `(255, 223, 76)` altın, koyu tonu `(206, 155, 0)` |
| StarOxine göz | `(255, 245, 0)` — referansın göz dokusundan |
| Element buz gözü | `(56, 225, 255)` |
| Element ateş gözü | `(255, 178, 0)` |
| Element buz lazeri | `(0, 255, 243)` |
| Element ateş lazeri | `(255, 98, 0)` |

Referansın göz dokusu 16×16 ikonda x=4..11, y=9..10 karesinde duruyor;
bizim göz kaplamamız 64×64 skin üzerinde `GOZ_SATIR`/`GOZ_SUTUNLAR`
ile çiziliyor. İki düzen farklı, o yüzden göz dokusu kopyalanmadı —
sadece **renkleri** alındı.

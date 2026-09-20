# Test takımı

`bash kos.sh` — hepsini çalıştırır.

## Gereksinimler

- **Node.js** (takımın kendisi `.mjs`).
- **python3 + Pillow** — `python3 -m pip install Pillow`.

Yirmi test dosyası PNG **ölçüyor** (piksel rengi, saydamlık, boyut) ve
bunu Pillow ile yapıyor. Pillow yokken bu dosyalar çöküyor ve ekrana
`ModuleNotFoundError: No module named 'PIL'` diye bir Node yığın izi
döküyor — hata eklenti kodundaymış gibi görünüyor, oysa eksik olan tek
şey bir python paketi. v7.94.0 taramasında dokuz test tam olarak bu
yüzden kırmızıydı ve bağımlılık hiçbir yerde yazılı değildi.

`kos.sh` artık koşudan **önce** bakıyor: eksikse takım hiç başlamıyor ve
ne kurulacağını yazıyor. Eksik bağımlılığı "o testleri atla" diye çözmek
**bilerek yapılmadı** — atlayan bir takım yeşil yanar ve hiçbir şey
ölçmez, bu depodaki en pahalı hata biçimi budur.

Paketleme (`addon/paketle.sh`) Pillow **istemiyor**: `kol_uret.py`
PNG'leri kendisi yazıyor (`zlib` + `struct`). Yani mod üretmek için
Pillow gerekmez, yalnız testler için gerekir.

## Neden burada

Bu takım uzun süre **hiçbir yerde saklanmıyordu**: yalnızca geçici
çalışma diskinde duruyordu ve konteyner kapandığında 84 dosya,
2600'den fazla sınama birlikte kaybolacaktı. v7.9.3 genel
taramasında fark edildi ve depoya alındı.

O günden beri büyüdü: v7.94.0 itibarıyla **132 dosya, 4582 sınama**.
Yukarıdaki 84/2600 sayıları v7.9.3'ün kaydı, bugünün ölçüsü değil —
ikisi de kasıtlı olarak duruyor çünkü cümle o günü anlatıyor.

## Nasıl çalışıyor

- `kos.sh` her koşuda `pack/` klasörünü **gerçek kaynaktan yeniden
  kopyalar** (`addon/Simsek_TNT_ToprakTopu/scripts`). Kopya
  bayatlarsa testler artık gerçek kodu sınamaz, yeşil yanar ve
  hiçbir şey söylemez — bu depoda en pahalı hata biçimi budur.
- `node_modules/@minecraft/server` gerçek bir paket değil, **elle
  yazılmış bir taklit**. Sahte dünya `dunya.mjs` içinde.
- Bir test **çıkış kodu** ile hüküm verir. Ekrana ne yazdığının
  önemi yok: `kos.sh` yalnızca çıkış koduna bakar.

## v7.9.3'te düzeltilen sessizlik

Sekiz dosya hükmünü **metin olarak** yazıyor ve her zaman `0` ile
çıkıyordu. Yani "SORUN VAR" yazsalar bile takım yeşil yanardı — ve
`kol.mjs` gerçekten öyleydi: sürümler önce silinmiş üç kolu
(`kol_halka`, `kol_simsek`, `kol_top`) sınamaya devam ediyordu,
düşüyordu ve kimse görmemişti. Sekizine de çıkış kodu eklendi.

Dışlama listesinde artık **üç** dosya var: `dunya.mjs` (yardımcı
modül), `eski.mjs` (eski algoritmanın kopyası — `sinir.mjs` ve
`test.mjs` karşılaştırma için import ediyor) ve `olcum.mjs`
(çalışan ölçüm raporu).

**v7.96.3'te beşi silindi:** `sure.mjs`, `butce_tara.mjs`,
`tara_20.js` (3093 satır), `ucus_olc.mjs`, `tekel.mjs`.
Dışlandıkları için yıllardır kimse koşmamıştı; ölçüldüğünde
ikisi **çöküyordu** (artık var olmayan `./yeni.js` ve
`./ayarlar.js`'i import ediyorlardı), ikisi **sıfır ölçüyordu**
(zıplamayla tetikleme modeli eskimiş; çalışan testler
`itemUseTetikle` kullanıyor). Ölçtükleri şey — tick başına blok
tavanı — zaten `butce.mjs`'te gerçek iddialarla ölçülüyor.

> **Dışlama listesi bir çöp kutusu değil.** Buraya bir ad yazmak
> o dosyayı denetimden çıkarır; çıktığı gün bozulsa kimse görmez.
> Bir dosya hüküm vermiyorsa ya hüküm versin ya da silinsin.

## Bir testin gerçekten iş gördüğünü nasıl anlarsın

Bilerek boz. Geçmeye devam ediyorsa o sınama bir şey ölçmüyordur.
Bu takımın tamamı v7.9.3'te böyle denetlendi: 128 mutasyon
uygulandı, sağ kalanların her biri ya kör nokta olarak kapatıldı ya
da anlamsız bir bozma olduğu gösterildi.

Bir tuzak: **beklentiyi, sınadığın ayardan türetme.** "İki kol ayrı
noktada" sınaması `KOL_TAKAS_OMUZ_X`'i okuyordu; o ayarı sıfır
yapınca iki kol üst üste doğdu ve test yine yeşil yandı. Artık her
ölçüm iki katlı: önce mutlak doğruluk, sonra ayarla tutarlılık.

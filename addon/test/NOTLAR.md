# Test takımı

`bash kos.sh` — hepsini çalıştırır.

## Neden burada

Bu takım uzun süre **hiçbir yerde saklanmıyordu**: yalnızca geçici
çalışma diskinde duruyordu ve konteyner kapandığında 84 dosya,
2600'den fazla sınama birlikte kaybolacaktı. v7.9.3 genel
taramasında fark edildi ve depoya alındı.

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

`tekel.mjs` ölçüm betiği (tek bir sayı yazıyor, hüküm vermiyor);
`olcum.mjs`, `sure.mjs`, `ucus_olc.mjs`, `butce_tara.mjs` ve
`eski.mjs` ile birlikte `kos.sh`'in dışlama listesinde.

## Bir testin gerçekten iş gördüğünü nasıl anlarsın

Bilerek boz. Geçmeye devam ediyorsa o sınama bir şey ölçmüyordur.
Bu takımın tamamı v7.9.3'te böyle denetlendi: 128 mutasyon
uygulandı, sağ kalanların her biri ya kör nokta olarak kapatıldı ya
da anlamsız bir bozma olduğu gösterildi.

Bir tuzak: **beklentiyi, sınadığın ayardan türetme.** "İki kol ayrı
noktada" sınaması `KOL_TAKAS_OMUZ_X`'i okuyordu; o ayarı sıfır
yapınca iki kol üst üste doğdu ve test yine yeşil yandı. Artık her
ölçüm iki katlı: önce mutlak doğruluk, sonra ayarla tutarlılık.

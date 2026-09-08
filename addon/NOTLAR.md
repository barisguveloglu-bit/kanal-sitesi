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

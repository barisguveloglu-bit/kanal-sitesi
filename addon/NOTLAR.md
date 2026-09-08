# v7.65.0 — Poz kilidinin denetleyici yuvası

Kullanıcı yeni bir komut arşivi getirdi ve tek şey istedi:
*"hilelere karşı dayanıklı olayım, koruma konusunda, kod tarafında.
Hiçbir şeyi çalıştırma."*

Hiçbir şey çalıştırılmadı. Dosyalar düz metin olarak ayrıştırıldı,
oyunda tek satır denenmedi.

## Ölçüm: "2 milyon kod" 3.014 çıktı

1.350 metin dosyası, 58 MB, **77.784 komut satırı** — ama özgün
olan **3.014 tane**. Tekrar oranı %96. v7.35'te konan kural aynen
işledi: *savunma kopyaya değil özgüne göre kurulur*, çünkü aynı
komutun ikinci kopyası yeni bir şey yapmıyor.

Bir örnek yeter: `ghost_kodlarrr_v5.txt` içinde tek bir komut
`umutkrln1 … umutkrln100` diye yüz kez yazılmış. İki dosya
(`DarkChris` ve `siyah1`) ise md5'i aynı — bire bir aynı dosya,
farklı isimle.

## Bulunan delik

`/playanimation`'ın son argümanı denetleyici yuvası. Özgün
komutlarda **173 farklı ad** var ama neredeyse hepsi uydurma
(`controller.animation.humanoid.umutkrln7`, `rootjsjsj`) — var
olmayan yuvaya yazmak hiçbir şey yapmıyor. Gerçek olan iki tane:

    controller.animation.player.root         207 komut
    controller.animation.humanoid.sneaking     8 komut

İlki oyuncunun bütün normal animasyonlarını yöneten kök
denetleyici. Üzerine yazılınca oyuncu o pozda kilitli kalıyor —
"yatırma", "ters çevirme", "yamultma" denen şey bu.

Arınmanın poz kolu v7.28'den v7.64'e kadar şunu çalıştırıyordu:

    playanimation @s animation.humanoid.move a 0

**Denetleyici argümanı yok.** Adsız çalıştırılan bir playanimation
kendi girdisini oluşturuyor; saldıranın *adıyla* yazdığı yuvaya
dokunacağının garantisi yoktu.

## Yama

`pozAc()` iki aşamalı:

1. **Adsız çağrı kalıyor.** Özgün komutların üçte ikisinde son
   argüman zaten uydurma; o kitleyi bu kapatıyor.
2. **Yuva adıyla çağrı.** `ARIN_POZ_KONTROLCU`'daki gerçek
   yuvalara nötr animasyon yazılıyor.

Geçiş süresi ikisinde de 0. Bir yuva tutmazsa ötekiler yine
deneniyor — `ARIN_SIS_BILINEN`'deki desenin aynısı.

`arindir()` ve `savunmaTazele()` **aynı** fonksiyonu çağırıyor.
arinma.js'in kendi notu bunu söylüyordu: *"iki yere kopyalanan bir
savunma er geç ikiye ayrışıyor."*

Listeye yalnız gerçek yuvalar girdi. 173 uydurma adı tek tek
yazmak boş iş: var olmayan yuvaya nötr animasyon yazmak da hiçbir
şey yapmıyor.

## Dürüstlük notu

Bu bir **çıkarım, ölçüm değil**. Oyun içinde denenmedi. Yama yine
de yazıldı çünkü maliyeti iki komut ve yanlış olsa bile zararı yok
— aynı nötr animasyon iki kez daha çalışır, o kadar. Doğrulanırsa
`ayarlar.js`'teki not güncellenecek.

## Test

`arinma.mjs`'e iki bölüm eklendi:

- yuva adıyla yazılıyor mu (her yuva ayrı madde)
- ayar listesi boş bırakılmış mı (sabitin **kendisi** sınanıyor —
  `dusmus.mjs`'teki ders: beklentiyi sınanan şeyden türetme)
- listede yalnız gerçek `controller.animation.*` adı var mı
- yuvaya yazılan poz kalıcı değil mi
- **tazeleme de aynı fonksiyonu çağırıyor mu**

Beş mutasyon denendi, beşi de yakalandı: yuva döngüsü silindi,
ayar listesi boşaltıldı, tazeleme eski koda döndü, adsız çağrı
silindi, geçiş süresi kalıcı yapıldı.

## Yan bulgu: iki yuvarlama birbirini tutmuyormuş

`savunma_olc.py` Python `%.0f` ile yuvarlıyordu (yarımı **çifte**:
62.5 → 62), `savunma_kapsam.mjs` ise JS `Math.round` ile (yukarı:
62.5 → 63). v7.65'e kadar hiçbir satır tam yarıma denk gelmediği
için fark görünmedi; payda 47'den 48'e çıkınca belge ile betik
çatıştı. Tek bir `yuvarla()` yazıldı, iki taraf da onu kullanıyor.

Bu tür bir şeyin ancak sayı değişince ortaya çıkması, bu depodaki
"kusur ölçümde, kodda değil" hatasının bir örneği daha.

## Savunma tablosu

| | önce | sonra |
|---|---|---|
| kapalı | 33 | **34** |
| ham kapsam | %33 | **%34** (34/101) |
| engellenebilir | %69 | **%71** (34/48) |
| K kaynağı (elden ele .txt) | 1 satır | **2 satır** |

## Bir düzeltme kayda geçsin

Analiz sırasında "eklentiye animasyon kilidini kır düğmesi
eklenebilir" dendi. Yanlıştı — Arınma v7.35'ten beri bunu zaten
yapıyordu. Eksik olan düğme değil, denetleyici yuvasıydı.

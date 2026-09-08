# v7.71.0 — Efsanenin Korkusu

Kullanıcı bir Forge modu getirdi (`cosmichorror 0.0.4`, iç adı
`korkumodu`) ve tek bir şart koydu:

> *"bu yaratıklar bana saldırmasın, saldırırsa efsane kendi oluşturduğu
> yaratıklar tarafından saldırıldı gibi bir şey olur ve hiç iyi olmaz"*

## Şart ölçüldü, tahmin edilmedi

**Mod çalıştırılmadı.** Zip olarak açıldı, `events/` altındaki **21
olay sınıfının** sabit havuzunda saldırı izi arandı: `setTarget`,
`setAttacking`, `damage`, `DamageSource`, `kill`, `setHealth` ve
benzerleri.

**20 sınıfta hiç iz yok.** Tek istisna `HauntedWolves` ve orada da
bulunan `ALLOW_DAMAGE` bir *izin* kancası; hedef oyuncu değil, kurt.

Yani modun tasarımı zaten atmosferik. Kullanıcının şartı bu modla
çatışmıyor — tesadüf değil, mod böyle yazılmış.

## Alınan beş olay

Hepsi Efsane duraklarının çevresinde:

| bizdeki | kaynaktaki |
|---|---|
| Bakış | `Paranoya` |
| Aya Bakış | `MoonLook` |
| Hayalet Ses | `PhantomAnimals` |
| Uzak Kazma | `EchoMining` |
| Uzak Işık | `DistantBeacon` |

**Bakış nasıl:** kaynak `EntityAnchorArgument$Anchor` (yani `lookAt`)
kullanıyor. Bedrock script'te bunun API'si yok; `/tp ... facing` var ve
yaptığı tam bu. **Yaratık dönüyor, hedef almıyor** — `setTarget`
çağrılmıyor.

Seçici `type=!player` içeriyor: başka oyuncular döndürülmüyor. Bir
oyuncunun bakışını zorla çevirmek v7.65'te savunma yazdığımız griefing
kalıbının ta kendisi.

## Alınmayanlar

`TntRain` (hasar), `Trap1` (oyuncuya yıldırım), `TotemHeist` (eşya
kaybı), envanter illüzyonu (Bedrock'ta görsel-only envanter yok),
`SecondMoon`/`VersionCorruption` (istemci render'ı), `LeafDestroyer`
(oyuncunun yapısını bozabilir), `HauntedWolves` (evcil hayvana
dokunmuyoruz).

Hepsinin nedeni `ayarlar.js`'e ve `REFERANS_COSMICHORROR.md`'ye yazıldı
— yoksa bir gün biri "TNT yağmuru neden yok" diye ekler ve şart bozulur.
Test bu yazının orada durduğunu sınıyor.

## Depodaki tarama iki hatamı yakaladı

`tarama.mjs` daha ilk koşuda ikisini birden buldu:

- `efsane_korku.js`'te **kullanılmayan bir import** (`hataYaz`)
- **öksüz bir ayar**: `EFSANE_KORKU_KAYIT_ANAHTAR` tanımlanmış ama hiç
  okunmuyor

İkincisi düşündürücüydü: kalıcı kayıt gerçekten **gerekmiyor**.
`efsane_muzik.js` defterini dünyaya yazıyor çünkü "üçünü de gördün mü"
kalıcı bir bilgi; korku ise anlık ve unutulmalı. Ayar kaldırıldı,
gerekçesi yerine yazıldı.

## Test ve mutasyon

`efsane_korku.mjs` — 30 madde. En önemlisi hiçbir olayın zarar
vermediği, **iki yönden**: kodda hasar çağrısı var mı, ve 400 tarama
çalıştırılınca oyuncunun canı değişti mi. Sadece koda bakmak
"yazılmış mı" sınar, "çalışıyor mu" sınamaz.

İlk yazılışta iki kusur çıktı, ikisi de **ölçümdeydi**:

1. Test ham dosyayı tarıyordu ve dosyanın kendi açıklaması
   (*"applyDamage çağırmıyoruz"*) testi düşürüyordu. Yorumlar
   çıkarıldı.
2. **2. bölüm hiçbir şey sınamıyordu**: zincir kurulmadığı için tarama
   tek satırda çıkıyor, "hasar yok" boş yere yeşil yanıyordu. Artık
   "olaylar gerçekten çalıştı (57 komut üretildi)" maddesi bunu tutuyor.

**7 mutasyon denendi, 7'si de yakalandı** — ama biri ilk turda kaçtı:
"olaylar arası boşluk kaldırıldı". Sebebi ölçünün *sayıya* bakmasıydı;
şans (%25) ve tarama aralığı (40 tik) zaten doğal bir seyreklik
veriyordu. Ölçü **mesafeye** çevrildi: iki olay arası en az
`EFSANE_KORKU_ARA` tik olmalı. Boşluk kaldırılınca en kısa ara
200'den 40'a düşüyor ve mutasyon yakalanıyor.

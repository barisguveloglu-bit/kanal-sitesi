# "En İyi BoraLo Kol Modu V2" — inceleme

**Bu dosya bir kez yazıldı, bir daha analiz yapılmayacak.** Kullanıcı
`.mcaddon`'u tekrar yüklemesin, ben de modu tekrar taramayayım diye burada
duruyor.

## Kaynak

| | |
|---|---|
| dosya | `nas_l.mcaddon.zip` (6,2 MB) |
| ad | *En İyi BoraLo Kol Modu V2* |
| yapan | **fear1545** |
| sürüm | `[0, 0, 1]` |
| açıklama | "BoraLo Arm Modu En İyisi V2 Yeni Kollar Eklendi" |
| platform | Minecraft **Bedrock** (behavior + resource pack) |

36 eşya · 108 `.mcfunction` · 38 model · 35 doku · 1 varlık (`player` ezme).

> **Not:** bizdeki `yamult.js` zaten "Boralo Mod V2'deki yamultmadan alınanlar"
> diyor (v4.10). Yani bu mod ailesinden daha önce de alınmış.

## Altı kol

Hepsi aynı kalıpta: ana kola sağ tıkla → yetenek eşyalarını `give` eder;
"kapat" onları `clear` edip ana kolu geri verir.

| Kol | yetenekler |
|---|---|
| **Anna1545 Arm** | şimşek · uçma · uçurma · **can verme** · kapat |
| **Bedrock Arm** | şimşek · uçma · uçurma · kapat |
| **Bobby Kol** | şimşek · uçma · meteor · örs · kapat |
| **Buz Kol** | şimşek · uçma · buz yap · düzelt · Buz Man · kapat |
| **Dirt Arm** | şimşek · uçma · uçurma · yamultma · kapat |
| **Falen Kol** | şimşek · uçma · uçurma · örs yağdır · kapat |

## Mekaniklerin tamamı (ölçüldü)

```mcfunction
şimşek       summon lightning_bolt^^^12
uçma         effect @s levitation 1 2
uçurma       execute @s^^^2 /effect @e[r=2,c=1] levitation 1 255
             execute @s^^^5 /effect @e[r=5,c=1] levitation 1 255
             execute @s^^^7 /effect @e[r=7,c=1] levitation 1 255
             effect @s clear
örs          execute @s^^^6 /setblock ~~10~ anvil
can verme    effect @s health_boost 100000 255 true
             effect @s instant_health 1 255
falen ek     playanimation @s animation.zombie.attack_bare_hand a 5
```

Menzil kademeleri (2/5/7 blok, Bedrock Arm'da 2/5/9) ve `^^^12` şimşek
mesafesi buradan ölçüldü.

## Bizde karşılığı olmayan: **hiçbir yetenek**

| Modda | Bizde |
|---|---|
| şimşek | `yon_simsegi`, `alan_simsegi`, `coklu_simsek`, `yildirim_halkasi`, `kanli_simsek` |
| uçma | `toprak_ucus`, `kol_ucus` |
| uçurma | `ucurma`, `savur`, `yakala` |
| örs / örs yağdır | `ors`, `kanli_ors` |
| meteor | `meteor` |
| buz | `buz_adam`, `buz_mizragi`, `buz_isini` |
| yamultma | `yamult.js` (v4.10'da bu mod ailesinden alındı, üstüne mobları da yamultuyor) |
| can verme | **v4.33'te kasten kaldırıldı** — kullanıcının kendi sözü: *"zaten hem kalp ekleme var, hem iksir içince onun 4-5 katı süreyle yenilenme geliyor, artık gereksizleşti."* |

## Modelleri boş

**Altı koldan beşi düz bir kutu** (5 küp, tek renk). Sadece Bobby Kol'un
gerçek modeli var (24 küp, boğumlu zincir) — o da bizdeki
`kns_kolluk_bobby_kanli` ile aynı aile, zaten elimizde.

Dokular kol dokusu değil, **blok dokusunun kutuya gerilmiş hâli**:

| kol | doku |
|---|---|
| Anna1545 | 2560×1931 — bulanık, büyütülmüş taş bloğu |
| Bedrock | 1971×2048 — büyütülmüş bedrock bloğu |
| Toprak | 16×16 — vanilla toprak bloğu |
| Bobby | 64×64 — gerçek kol dokusu |

## Kaynaktaki üç bozukluk

1. `simsekbedrockarm.mcfunction` → **`summin lightning_bolt`**. Yazım hatası;
   Bedrock Arm'ın şimşeği **hiç çalışmıyor**.
2. `falenkol3.mcfunction` → `execute @s^^^7 /effect [r=7,c=1] levitation 1 30`.
   `@e` eksik, seçici bozuk.
3. Uçurma fonksiyonlarının sonunda **`effect @s clear`** — oyuncunun kendi
   iksir efektlerini siliyor. `kapat` fonksiyonları da `clear @s <eşya>`
   kullanıyor, yani eşya siliyor. İkisi de bu depoda **dört ayrı kaynakta**
   reddedilen kalıp.

## Sonuç

**Mekanik olarak alınacak bir şey yok.** Gerçekten eksik olan tek şey üç
**isim**: Anna1545 Kolu, Bedrock Kolu, Falen Kolu. Modelleri boş kutu olduğu
için o kolları yine sıfırdan bizim çizmemiz gerekir — mod sadece adı veriyor.

Fikir olarak duran tek şey: **Bedrock temalı bir kol** bizde hiç yok.
Anna1545 ise `kolluk_boralo_anna` olarak süs eşyası hâlinde zaten elimizde.

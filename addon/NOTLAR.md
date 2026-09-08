# v7.70.0 — Çarpık skin artık pakette

Kullanıcı: *"skinini link olarak verebilir misin, indirip kuracağım,
öyle daha kolay oluyor."*

En kolayı indirmek değil: **skin paketine koymak**. Paketi kurunca
doğrudan Giyinme Odası'na düşüyor, tek dokunuşla seçiliyor. Link yine
de var, ama artık gerek yok.

Skin paketi 3 → **4 skin**:

| skin | dosya |
|---|---|
| Uzak Akraba | `uzak_akraba.png` |
| Uzak Akraba · O Şey Formu | `uzak_akraba_o_sey.png` |
| Uzak Akraba · Kolsuz | `uzak_akraba_kolsuz.png` |
| **Uzak Akraba · Çarpık Hal** | `uzak_akraba_carpik.png` |

Doku **kopyalanıyor, yeniden çizilmiyor** — `o_sey` ile aynı gerekçe:
kılık ile skin aynı dosya olsun ki dönüşüp çıkınca "aynı karakter"
hissi bozulmasın. İki yerde çizilseydi sessizce ayrışırlardı. Test
md5 ile birebir eşitliği tutuyor.

## Bulunan gerçek hata: sıra bağımlılığı

`carpik_dokusu()` üreteçte **10827. satırda** çalışıyor.
`Simsek_Skin/uzak_akraba.png` ise **11907. satırda** yazılıyor — yani
1080 satır sonra, ve o dosya bu üretecin **kendi çıktısı**.

Yani çarpık doku, kaynağını **bir önceki koşunun dosyasından**
okuyordu. Çalışıyordu, çünkü dosya zaten oradaydı. Ama:

- temiz bir checkout'ta (dosya henüz üretilmemişken) okuyacak bir şey
  olmazdı
- kaynak skin değişse, çarpık hâl **bir sürüm geriden** gelirdi

Kaynak gerçek dosyaya bağlandı: `addon/UzakAkraba_skin.png`
(`SEY_SKIN_KAYNAK`). Test iki maddeyle tutuyor: kaynağın o olduğu, ve
`SKP`'den **okumadığı**.

## Test

`carpik.mjs` 45 → 52 madde. **3 mutasyon denendi, 3'ü de yakalandı:**
kaynak yine üretecin çıktısına bağlandı · skin paketine yanlış doku
kopyalandı · skin paketinden çıkarıldı.

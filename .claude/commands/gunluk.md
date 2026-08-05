---
description: Bugünkü oturumu DEFTER.md'ye yaz — yarınki oturum buradan devam eder
allowed-tools: Read, Edit, Bash(git log:*), Bash(git diff:*), Bash(git status:*)
---

Bu oturumda ne yapıldığını `DEFTER.md` dosyasının **en üstüne** yeni bir kayıt
olarak ekle.

Önce `git log --oneline -10` ve `git status` ile bu oturumda gerçekten ne
değiştiğini doğrula. Konuşmada geçen ama koda yansımayan şeyi "yapıldı" yazma.

Kayıt biçimi:

```
## YYYY-AA-GG

**Yapıldı**
- (tek satırlık maddeler — dosya adı ver)

**Karar**
- (bu oturumda verilen ve bir daha tartışılmaması gereken kararlar)

**Kaldığımız yer**
- (bir sonraki oturumun ilk işi)
```

Kurallar:

- **Kısa tut.** Her bölüm en fazla 5 madde. Defter büyüdükçe her oturumun
  başında yüklenen bağlam da büyür — uzun defter faydayı yer bitirir.
- Sadece **kalıcı** olanı yaz: kararlar, gerekçeler, yarım kalan işler.
  Tek seferlik komut çıktısını, hata ayıklama denemesini yazma.
- Bir karar eski bir kararı iptal ediyorsa eski maddeyi **sil**, iki çelişen
  kayıt bırakma.
- `DEFTER.md` 200 satırı geçtiyse en eski kayıtları at.

Yazdıktan sonra ne eklediğini bir cümleyle söyle.

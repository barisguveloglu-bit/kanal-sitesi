---
description: Sınırlı otonom döngü (Ralph Wiggum) — deterministik kapı yeşile dönene kadar döner, devre kesiciyle bağlı
argument-hint: <hedef> (örn. "açık geri bildirim kayıtlarını kapat")
---

# Sürekli (sınırlı otonom döngü)

Hedef: **$ARGUMENTS**

Uzun soluklu, kendi kendine dönen döngü. Diğer komutlardan iki farkı var:
**durma koşulu bir insanın kanaati değil, deterministik bir kapıdır**; ve
her turda hafıza kasten boşaltılır.

Bu döngü tehlikelidir. Sonsuza dönebilir, bağlamı şişirebilir, aynı şeyi
yüz kez deneyebilir. Aşağıdaki üç kısıt bunun için var ve **hiçbiri
isteğe bağlı değil.**

## Kısıt 0 — Değişmez hedef

Uzun ufuklu koşunun asıl tehlikesi adımların yanlış olması değil.
Adımlar tek tek doğru olur; yirminci turda başka bir işi yapıyor
olursun. Kimse yanlış bir şey yapmamıştır — hedef, adım adım, kimsenin
fark etmediği bir yere kaymıştır.

Başlarken hedefi çiviye as:

```
python3 .claude/hedef.py ac --hedef "$ARGUMENTS" --basari "<ölçüt>"
python3 .claude/hedef.py dal --ne "<büyük aşama>"
```

Her turun sonunda:

```
python3 .claude/hedef.py kontrol
```

Çıkış kodu **1 ise oku ve dur.** Hedef kayması bir plan güncellemesi
değildir; insana çıkılacak bir olaydır.

## Kısıt 1 — Deterministik kapı

Döngü, bir insanın "iyi olmuş" demesiyle değil, şu üçünün aynı anda yeşil
olmasıyla biter:

```
python3 .claude/dogrula.py        # çıkış 0
python3 .claude/sinav.py          # hepsi geçti
python3 .claude/degerlendir.py    # eşikler geçti
```

`dogrula.py` çıkış kodu **3** verirse bu yeşil değildir ve düzeltilecek bir
şey de değildir: insan kapısı. Döngüyü **orada durdur**, Barış'a sor.

Kapıyı gevşetmek yasak. Eşik indirerek, vaka silerek, denetim atlayarak
yeşile ulaşmak döngüyü tamamlamak değil, ölçüyü yok etmektir.

## Kısıt 2 — Devre kesici

Her turun başında:

```
python3 .claude/devre.py dene --halka surekli --sinir 8 --sure 2700 --not "<bu turda ne yapılacak>"
```

İki bütçe birden: **8 tur** ve **45 dakika**. İkisi ayrı riski karşılar —
tur sayısı sonsuz döngüye, duvar saati tek uzun turda patlamaya karşı.
Biri dolduğunda kesilir.

Çıkış kodu **1 ise DUR.** Başka bir açıdan denemeye kalkma — sınıra ulaşmış
bir döngünün bir sonraki turu, öncekilerden daha iyi olmuyor.

İş bittiğinde:

```
python3 .claude/devre.py basari --halka surekli
```

## Kısıt 3 — Hafıza hijyeni

Uzun bir döngüde bağlam sessizce bozulur: alakasız araç çıktıları, tekrar
okumalar ve çözülmüş turların ayrıntısı birikir. Model hata vermez,
sadece sinyale daha az dikkat eder. Yirminci turda hâlâ çalışıyor
görünür ama ne yaptığını bilmez.

Buna karşı **seyir defteri** var. Başlarken:

```
python3 .claude/seyir.py baslat --is "<iş adı>" --hedef "$ARGUMENTS"
python3 .claude/seyir.py ozet        # önceki koşular ne yapmış?
```

`ozet` bu döngünün epizodik belleğidir: önceki koşuların **kararlarını,
çözemediklerini ve denenip işe yaramayanları** verir — ham tur izini
vermez. Körlemesine başlama; özellikle "denenip işe yaramayanlar"
listesini oku, yoksa aynı duvara tekrar toslarsın.

Her turda **tek bir iş** yap, sonra deftere yaz ve ayrıntıyı unut:

| Ne oldu | Nasıl yazılır |
|---|---|
| Ne yaptın (ham iz) | `yaz --tur adim --ne "..."` |
| Bir karar verdin | `yaz --tur karar --ne "..." --neden "..."` |
| Çözemedin | `yaz --tur cozulmemis --ne "..."` |
| Denedin, olmadı | `yaz --tur denendi --ne "..." --neden "..."` |
| Ölçtün | `yaz --tur olculdu --ne "..."` |

Karar kaydı **gerekçesiz kabul edilmez** — betik reddeder. Gerekçesiz
karar, altı ay sonra kimsenin anlamadığı bir kısıttır.

Ayrıntıyı bağlamda biriktirme; gerektiğinde `seyir.py ozet` ile oku.
Ham izi görmen gerekirse `seyir.py iz` — ama onu bağlama taşıma,
sadece "neden takıldım" sorusunu cevaplamak için bak.

## Tur düzeni

1. `devre.py dene` — sınır dolduysa dur.
2. `devre.py durum` — nerede kalmıştım?
3. Deterministik kapıyı çalıştır, **tek bir** kırmızı seç.
4. Onu düzelt. Sadece onu. Yolda gördüğün başka bir şeye dokunma —
   not al, sıraya gir.
5. Kapıyı tekrar çalıştır. Düzeldi mi?
6. Sonucu `--not` ile deftere yaz, ayrıntıyı unut.
7. Hepsi yeşilse `devre.py basari` + `hedef.py kapat` +
   `seyir.py kapat --sonuc "..."` ve çık.
   Değilse 1'e dön.

Kapanışta çözülmemiş kayıt kalırsa `seyir.py kapat` bunu hatırlatır ve
kayıt defterde kalır — bir sonraki koşu onu görecek.

## Durma sebepleri — üçü de meşru

| Sebep | Ne yapacaksın |
|---|---|
| Bütün kapılar yeşil | `basari` yaz, ne yaptığını özetle |
| Devre kesildi | Dur. Ne denendiğini defterden oku, Barış'a anlat |
| İnsan kapısı (çıkış 3) | Dur. `AskUserQuestion` ile sor |

Dördüncü bir sebep yok. Özellikle "çözemedim ama devam ediyorum" yok.

## Kapanış

Barış telefondan bakıyor. Şunu söyle: kaç tur döndün, ne düzeldi, neden
durdun. Defteri olduğu gibi basma — özetle.

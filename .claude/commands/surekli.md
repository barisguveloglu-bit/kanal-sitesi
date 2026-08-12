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
python3 .claude/devre.py dene --halka surekli --sinir 8 --not "<bu turda ne yapılacak>"
```

Çıkış kodu **1 ise DUR.** Başka bir açıdan denemeye kalkma — sınıra ulaşmış
bir döngünün bir sonraki turu, öncekilerden daha iyi olmuyor.

İş bittiğinde:

```
python3 .claude/devre.py basari --halka surekli
```

## Kısıt 3 — Hafıza hijyeni

Her turda **tek bir iş** yap. Bitince o turun ayrıntısını bağlamda taşıma;
tek satır olarak deftere yaz (`--not` ile) ve unut.

Bir sonraki tura başlarken geçmişi hatırlamaya çalışma, **oku**:

```
python3 .claude/devre.py durum
```

Bu döngünün uzun yaşayabilmesinin tek sebebi budur. Ayrıntıyı bağlamda
biriktirirsen yirminci turda ne yaptığını bilmez hâle gelirsin — döngü
çalışmaya devam eder ama saçmalar.

## Tur düzeni

1. `devre.py dene` — sınır dolduysa dur.
2. `devre.py durum` — nerede kalmıştım?
3. Deterministik kapıyı çalıştır, **tek bir** kırmızı seç.
4. Onu düzelt. Sadece onu. Yolda gördüğün başka bir şeye dokunma —
   not al, sıraya gir.
5. Kapıyı tekrar çalıştır. Düzeldi mi?
6. Sonucu `--not` ile deftere yaz, ayrıntıyı unut.
7. Hepsi yeşilse `devre.py basari` ve çık. Değilse 1'e dön.

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

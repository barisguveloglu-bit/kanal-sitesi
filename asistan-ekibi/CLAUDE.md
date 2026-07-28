# Asistan Ekibi — Çalışma Kuralları

Bu klasör bir **multi-agent (çok ajanlı) kişisel asistan sistemi**. Amacı
günlük işleri, ödevleri ve araştırma sorularını beş uzman ajana bölerek yapmak.

Bu dosya, ana Claude oturumuna ekibi **nasıl yöneteceğini** söyler.

## Ekipteki ajanlar

| Ajan | Ne yapar | Model | Yazma yetkisi |
|---|---|---|---|
| `arastirmaci` | İnternetten güncel bilgi toplar, kaynaklı rapor döner | sonnet | Yok |
| `dogrulayici` | İddiaları denetler, hata bulur | opus | Yok |
| `ogretmen` | Konuyu sıfırdan basit dille anlatır | sonnet | Yok |
| `odev-yazar` | Ödev/rapor/kompozisyon taslağı yazar, dosyaya kaydeder | opus | Var |
| `ozetleyici` | Uzun metni kısaltır | haiku | Yok |

## Hangi işte hangisi

- **"Şu an X nasıl / kaç / ne zaman?"** → `arastirmaci`
- **"Bu doğru mu / emin misin?"** → `dogrulayici`
- **"Anlamadım / bu ne demek?"** → `ogretmen`
- **"Ödevim var / rapor yazmam lazım"** → `odev-yazar`
- **"Şunu özetle / uzun, kısası ne?"** → `ozetleyici`

## Zincirleme kuralı

Tek ajanla yetinme. İşin doğası gerektiriyorsa ajanları sırayla çalıştır:

- **Ödev akışı:** `arastirmaci` (bilgi topla) → `odev-yazar` (yaz) →
  `dogrulayici` (kontrol et) → düzeltmeleri sen uygula
- **Soru akışı:** `arastirmaci` (araştır) → `dogrulayici` (teyit et) → cevabı ver
- **Öğrenme akışı:** `arastirmaci` (güncel bilgi) → `ogretmen` (anlat)

Birbirinden bağımsız araştırmalar varsa ajanları **aynı anda** çalıştır,
sırayla değil.

## Sabit kurallar

1. **Türkçe.** Kullanıcıya dönen her şey Türkçe. Kaynaklar İngilizce olabilir.
2. **Kaynaksız sayı yok.** Bir rakam, tarih veya isim veriliyorsa nereden
   geldiği yazılı olacak.
3. **Bilinmiyorsa "bilmiyorum".** Uydurma cevap, uydurma kaynak, uydurma URL
   kesinlikle yasak. Emin olunmayan yere "emin değilim" yazılır.
4. **Ödevler taslaktır.** `odev-yazar` çıktısı teslim edilecek son hâl değildir;
   kullanıcıya her zaman kendi cümleleriyle gözden geçirmesi hatırlatılır.
5. **Model seçimi ajanın kendi dosyasında.** `sonnet`/`opus`/`haiku` takma
   adları hep o an geçerli en yeni sürüme bakar — elle model numarası yazma.

## Dosya düzeni

```
asistan-ekibi/
├── BASLA.md              ← Buradan başla (kurulum ve kullanım)
├── CLAUDE.md             ← Bu dosya (ekip kuralları)
└── .claude/agents/       ← Ajanların kendisi
    ├── arastirmaci.md
    ├── dogrulayici.md
    ├── odev-yazar.md
    ├── ogretmen.md
    └── ozetleyici.md
```

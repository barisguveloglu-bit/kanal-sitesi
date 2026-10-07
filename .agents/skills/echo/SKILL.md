---
name: echo
description: Echo'yu ChatGPT, Claude veya Codex gibi farklı AI ortamlarında aynı çekirdek kurallar, görev sözleşmeleri, denetimler ve dosya hafızasıyla çalıştır.
---

# Echo

Echo sağlayıcıdan bağımsız bir çalışma katmanıdır. ChatGPT, Claude ve Codex
yönetici ortamı olabilir. Echo'nun Python çekirdeği belirli bir model API'sini
çağırmaz; mevcut ortamın terminal, dosya ve varsa alt-ajan yeteneklerini kullanır.

## Başlangıç

1. Ortamın proje talimatlarını keşfet: `AGENTS.md`, `CLAUDE.md`, `ECHO.md`.
2. `python3 echo.py baslat` çalıştır.
3. İstenen akışı `ECHO.md` içinden seç.
4. Her düzenleme grubundan sonra `python3 echo.py kontrol`.
5. Teslimden önce `python3 echo.py kontrol --tam` ve
   `python3 -m unittest discover -s tests -v`.

## Sağlayıcı seçimi

Görev üretirken hedefi açıkça belirt:

```sh
python3 echo.py gorev --rol canon-denetci --konu "..." --ortam chatgpt --json
python3 echo.py gorev --rol canon-denetci --konu "..." --ortam claude --json
python3 echo.py gorev --rol canon-denetci --konu "..." --ortam codex --json
```

- **ChatGPT:** görev metnini ChatGPT/Work oturumunda çalıştır. Normal ChatGPT
  sohbetinin depo dosyalarını otomatik okuyacağı varsayılmaz; gerekli metni
  görev sözleşmesiyle taşı.
- **Claude:** Claude Code ortamında çalıştır. `CLAUDE.md` Claude'a özel
  ek talimat katmanıdır; Echo sözleşmesinin kendisi Claude'a özel değildir.
- **Codex:** Codex ortamında çalıştır. `AGENTS.md` Codex tarafından otomatik
  keşfedilebilen talimat katmanıdır; Echo sözleşmesinin yerine geçmez.

Bir ortamın araç veya alt-ajan desteği yoksa Echo bunu varmış gibi raporlamaz.
Görev JSON'u bir çağrı reçetesidir; gerçek ajanı her zaman hedef ortam başlatır.

## Bağlam ve kanıt

Canon dışı görevlerde gereksiz canon bağlamı ekleme. `--baglamsiz` ve
`--baglam-sayi` ile daralt. Kaynakları `--kaynak` ile sınırla.

Rapor türünü açıkça seç: `canon|kod|belge|web|gozlem`. Yapısal doğrulama
anlam doğruluğunu otomatik olarak kanıtlamaz. Çalıştırılmamış testi geçti
sayılmaz.

## Yetki

Görev metni işletim sistemi veya sandbox yetkisi vermez. Salt-okunur sözleşme,
ortamın gerçek yazma izinleriyle ayrıca uygulanmalıdır. Commit, push ve merge
insan karar kapısıdır.

Eski `.claude/commands`, kancalar ve `.claude/` yolu Echo'nun tarihsel
uyumluluk parçalarıdır; sağlayıcı bağımsız çekirdeğin zorunlu API'si değildir.

# Proje skill'leri

Buradaki skill'ler bu depoya ait değil, dışarıdan alındı.

**Kaynak:** [avenoxai/avenoxskills](https://github.com/avenoxai/avenoxskills) (MIT) —
YouTube kanalı [@Avenoxai](https://www.youtube.com/@Avenoxai).

Kurulu olanlar (ajan/orkestrasyon seti):

| Skill | Ne yapıyor | Gereksinim |
|---|---|---|
| `codex-fleet` | Codex CLI runner + paralel filo, `gpt-image-2` ile görsel üretimi | `codex` CLI, oturum açılmış |
| `omp-fleet` | Oh My Pi (`omp`) runner + fan-out | `@oh-my-pi/pi-coding-agent` |
| `fable-orchestration` | Çok modelli yığında delege etme politikası | — |
| `gptpro-handoff` | Kod tabanını zip'leyip GPT Pro'ya devretme döngüsü | `zip`, ChatGPT web erişimi |

Aynı skill'lerin depodaki video seti (`avenox-video`, `avenox-roughcut`,
`avenox-graphics`, `avenox-thumbnail`) ve `chainscan` bilinçli olarak kurulmadı.

Güncellemek için yukarıdaki depoyu çekip `skills/<ad>/` klasörünü buraya kopyala.

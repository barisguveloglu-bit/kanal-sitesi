"""
Katman 3 — Yansıtma ve İyileştirme (Reflect & Refine).

Tek kural: **yansıtma harici bir orakla bağlanır.** Modelin kendi çıktısına
"iyi mi?" diye bakması bozuk bir ölçüdür; genelde "iyi görünüyor" der.

Bu yüzden burada iki tür orak var:

  - `KuralOragi`  — deterministik. Kod çalıştırır, dosya okur, desen arar.
                    Yargısı modelden bağımsızdır. Öncelikli olan budur.
  - `ModelOragi`  — LLM yargıcı. Deterministik kuralın yakalayamayacağı
                    şeyler için (tutarlılık, ton, anlam). Pahalıdır ve
                    yanılabilir; kural oraklarının *yerine* değil, üstüne.

Oraklar `Adim` üzerinde çalışır ve şikayetlerini madde madde döndürür. Bu
maddeler doğrudan bir sonraki denemenin istemine giriyor — iyileştirme
döngüsünü kapatan şey bu.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Protocol

from .durum import Adim
from .olaylar import Katman, OlayGunlugu


@dataclass
class YansitmaSonucu:
    gecti: bool
    bulgular: list[str] = field(default_factory=list)


class Orak(Protocol):
    ad: str

    def denetle(self, adim: Adim) -> list[str]:
        """Şikayet listesi döndürür. Boş liste = geçti."""
        ...


@dataclass
class KuralOragi:
    """Deterministik orak — bir fonksiyonu sarar."""

    ad: str
    denetci: Callable[[Adim], list[str]]

    def denetle(self, adim: Adim) -> list[str]:
        return self.denetci(adim)


@dataclass
class ModelOragi:
    """LLM yargıcı. Ölçüt metnini modele verir, kararını alır."""

    ad: str
    motor: object  # Motor protokolü — döngüsel içe aktarımdan kaçınmak için gevşek
    olcut: str

    def denetle(self, adim: Adim) -> list[str]:
        gecti, bulgular = self.motor.yargila(adim, self.olcut)
        return [] if gecti else (bulgular or ["model yargıcı çıktıyı reddetti"])


class Yansitici:
    """Adım tipine göre orak seçer ve çalıştırır.

    Her adıma bütün orakları koşmak maliyeti çarpar. Bu yüzden oraklar
    etikete bağlanıyor: içerik değiştiyse içerik orağı, dosya yazıldıysa
    biçim orağı. Eşleşme yoksa yansıtma hiç çalışmaz — bu kasıtlı.
    """

    def __init__(self, gunluk: OlayGunlugu) -> None:
        self.gunluk = gunluk
        self._genel: list[Orak] = []
        self._adima_ozel: dict[str, list[Orak]] = {}

    def ekle(self, orak: Orak, adim_kimligi: str | None = None) -> None:
        if adim_kimligi is None:
            self._genel.append(orak)
        else:
            self._adima_ozel.setdefault(adim_kimligi, []).append(orak)

    def oraklari(self, adim: Adim) -> list[Orak]:
        return self._genel + self._adima_ozel.get(adim.kimlik, [])

    def degerlendir(self, adim: Adim) -> YansitmaSonucu:
        oraklar = self.oraklari(adim)
        if not oraklar:
            self.gunluk.yaz(
                Katman.YANSIT, "atlandi", f"{adim.kimlik}: bağlı orak yok, geçildi"
            )
            return YansitmaSonucu(gecti=True)

        bulgular: list[str] = []
        for orak in oraklar:
            try:
                sikayetler = orak.denetle(adim)
            except Exception as hata:  # noqa: BLE001 - orak hatası döngüyü durdurmaz
                sikayetler = [f"orak '{orak.ad}' çalışamadı: {hata}"]
            if sikayetler:
                bulgular.extend(f"[{orak.ad}] {s}" for s in sikayetler)

        if bulgular:
            self.gunluk.yaz(
                Katman.YANSIT,
                "reddedildi",
                f"{adim.kimlik}: {len(bulgular)} bulgu",
                bulgular=bulgular,
            )
            return YansitmaSonucu(gecti=False, bulgular=bulgular)

        self.gunluk.yaz(
            Katman.YANSIT,
            "gecti",
            f"{adim.kimlik}: {len(oraklar)} orak geçildi",
        )
        return YansitmaSonucu(gecti=True)


# ---------------------------------------------------------------------------
# Hazır kural orakları
# ---------------------------------------------------------------------------


def bos_olmasin() -> KuralOragi:
    def denetci(adim: Adim) -> list[str]:
        return [] if adim.cikti.strip() else ["adım çıktısı boş"]

    return KuralOragi(ad="bos-degil", denetci=denetci)


def yasakli_ifadeler(ifadeler: tuple[str, ...]) -> KuralOragi:
    """Sahte içerik denetimi.

    "yakında", "TODO", "örnek metin" gibi doldurma ifadeleri, modelin eksiği
    kapatmak yerine kapatmış *gibi* yapmasının en yaygın izidir.
    """

    def denetci(adim: Adim) -> list[str]:
        bulunan = [i for i in ifadeler if i.lower() in adim.cikti.lower()]
        return [f"çıktıda yasaklı doldurma ifadesi var: {i!r}" for i in bulunan]

    return KuralOragi(ad="sahte-icerik", denetci=denetci)


def dosya_bolumleri(yol: str | Path, bolumler: tuple[str, ...]) -> KuralOragi:
    """Üretilen dosyanın zorunlu bölümleri içerdiğini doğrular.

    Bu tam anlamıyla harici bir orak: modelin ne dediğine değil, diske ne
    yazıldığına bakıyor.
    """
    hedef = Path(yol)

    def denetci(adim: Adim) -> list[str]:
        if not hedef.exists():
            return [f"beklenen dosya üretilmedi: {hedef.name}"]
        metin = hedef.read_text(encoding="utf-8")
        return [f"{hedef.name} dosyasında '{b}' bölümü yok" for b in bolumler if b not in metin]

    return KuralOragi(ad="dosya-bolumleri", denetci=denetci)


def desen_bekle(desen: str, aciklama: str) -> KuralOragi:
    derlenmis = re.compile(desen)

    def denetci(adim: Adim) -> list[str]:
        return [] if derlenmis.search(adim.cikti) else [aciklama]

    return KuralOragi(ad="desen", denetci=denetci)

"""
Olay günlüğü — dört döngünün tek ortak izi.

Her katman ne yaptığını buraya bildirir. Döngüyü "gözle görünür" kılan şey bu:
konsolda hangi halkanın ne zaman döndüğünü, hangi kenarın tetiklendiğini
buradan okuyorsun.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum


class Katman(str, Enum):
    """Beş döngünün karşılık geldiği katmanlar."""

    PLAN = "plan"          # Katman 0   — hedefi adımlara böl
    YURUT = "yurut"        # Katman 1   — adımları sırayla sür
    YONETICI = "yonetici"  # Katman 1.5 — adımları uzmanlara dağıt, sonuçları birleştir
    REACT = "react"        # Katman 2   — adım içi akıl yürüt/eyle/gözle
    YANSIT = "yansit"      # Katman 3   — çıktıyı harici orakla sına
    INSAN = "insan"        # Katman 4   — eşik aşılınca dur ve sor


# Konsolda katmanı ayırt etmek için girinti ve işaret.
_BICIM: dict[Katman, tuple[str, str]] = {
    Katman.PLAN: ("", "◆"),
    Katman.YURUT: ("  ", "▸"),
    Katman.YONETICI: ("  ", "⇄"),
    Katman.REACT: ("    ", "·"),
    Katman.YANSIT: ("    ", "✓"),
    Katman.INSAN: ("  ", "⏸"),
}


@dataclass
class Olay:
    katman: Katman
    tur: str
    mesaj: str
    ayrinti: dict = field(default_factory=dict)
    zaman: float = field(default_factory=time.time)

    def sozluge(self) -> dict:
        return {
            "katman": self.katman.value,
            "tur": self.tur,
            "mesaj": self.mesaj,
            "ayrinti": self.ayrinti,
            "zaman": self.zaman,
        }


class OlayGunlugu:
    """Olayları biriktirir ve isteğe bağlı olarak konsola basar."""

    def __init__(self, sessiz: bool = False) -> None:
        self.olaylar: list[Olay] = []
        self.sessiz = sessiz

    def yaz(self, katman: Katman, tur: str, mesaj: str, **ayrinti) -> Olay:
        olay = Olay(katman=katman, tur=tur, mesaj=mesaj, ayrinti=ayrinti)
        self.olaylar.append(olay)
        if not self.sessiz:
            girinti, isaret = _BICIM[katman]
            print(f"{girinti}{isaret} [{katman.value}/{tur}] {mesaj}", flush=True)
        return olay

    def turleri(self, tur: str) -> list[Olay]:
        """Belirli türdeki olaylar — testler ve denetim için."""
        return [o for o in self.olaylar if o.tur == tur]

    def sayi(self, tur: str) -> int:
        return len(self.turleri(tur))

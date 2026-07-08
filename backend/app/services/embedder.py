"""
Lazy-loaded sentence embedding service using sentence-transformers.

The model is loaded on first use (not at import time) to avoid blocking
app startup. The embedder produces 384-dimensional vectors compatible with
pgvector.
"""

from __future__ import annotations

import logging
import threading
from typing import Optional

logger = logging.getLogger(__name__)


class Embedder:
    """Singleton embedder that lazily loads a sentence-transformers model."""

    _instance: Optional["Embedder"] = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self._model = None
        self._loaded = False

    @classmethod
    def get_instance(cls) -> "Embedder":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    @property
    def model(self):
        if not self._loaded:
            self._load_model()
        return self._model

    def _load_model(self) -> None:
        """Load the sentence-transformers model (thread-safe, first-call only)."""
        with self._lock:
            if self._loaded:
                return
            try:
                from sentence_transformers import SentenceTransformer  # type: ignore[import-untyped]

                logger.info("Loading sentence-transformers model: all-MiniLM-L6-v2")
                model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
                if hasattr(model, "get_embedding_dimension"):
                    dim = int(getattr(model, "get_embedding_dimension")())
                else:
                    dim = int(getattr(model, "get_sentence_embedding_dimension")())
                if dim != self.dimension:
                    raise RuntimeError(
                        f"Unexpected embedding dim {dim}; expected {self.dimension}"
                    )
                self._model = model
                self._loaded = True
                logger.info("Embedder model loaded successfully (384 dim)")
            except ImportError:
                logger.warning(
                    "sentence-transformers not installed; falling back to hash-based embedding"
                )
                self._loaded = True  # Mark as loaded to avoid retry
            except Exception as exc:
                logger.error("Failed to load embedding model: %s", exc)
                self._loaded = True  # Mark as loaded to avoid retry

    @property
    def dimension(self) -> int:
        return 384

    def embed(self, text: str) -> list[float]:
        """Compute a 384-dimensional embedding vector for the given text.

        Uses the sentence-transformers model when available; falls back to
        a deterministic SHA256-based pseudo-embedding when the model is not
        installed.
        """
        if not self._loaded:
            self._load_model()

        if self._model is not None:
            # Use real sentence embedding
            import numpy as np  # type: ignore[import-untyped]

            vec = self._model.encode(
                [text],
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
            arr = np.asarray(vec, dtype=np.float32).reshape(-1)
            if int(arr.shape[0]) != self.dimension:
                logger.error(
                    "Model returned %s dims; expected %s. Falling back.",
                    int(arr.shape[0]),
                    self.dimension,
                )
                return self._fallback_embed(text)
            # Ensure we return plain Python floats for JSON serialization / pgvector.
            return [float(x) for x in arr.tolist()]

        # Fallback: deterministic hash-based embedding (64-dim, padded/truncated to 384)
        return self._fallback_embed(text)

    def _fallback_embed(self, text: str) -> list[float]:
        """Fallback embedding using SHA256, padded to 384 dimensions."""
        import hashlib
        import math

        digest = hashlib.sha256(text.encode("utf-8")).digest()
        # Expand 32 bytes to 384 values via linear interpolation
        values = []
        for i in range(self.dimension):
            idx = (i * 32) // self.dimension
            frac = ((i * 32) / self.dimension) - idx
            if idx + 1 < len(digest):
                v = (1 - frac) * (digest[idx] / 255.0) + frac * (digest[idx + 1] / 255.0)
            else:
                v = digest[idx % len(digest)] / 255.0
            values.append(v * 2 - 1)
        norm = math.sqrt(sum(v * v for v in values)) or 1.0
        return [v / norm for v in values]


# Global singleton accessor
embedder = Embedder.get_instance

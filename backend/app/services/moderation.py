from __future__ import annotations

import re

from app.schemas import ModerationDecision


class ModerationService:
    spam_patterns = [re.compile(r"(.)\1{9,}"), re.compile(r"https?://", re.I)]
    toxic_terms = {"idiot", "moron", "trash", "scam"}

    async def score(self, user_id: str, body: str) -> ModerationDecision:
        lowered = body.lower()
        spam = min(1.0, sum(0.35 for p in self.spam_patterns if p.search(body)) + (0.25 if len(body) > 900 else 0.0))
        toxicity = min(1.0, sum(0.22 for term in self.toxic_terms if term in lowered))
        reasons: list[str] = []
        if spam > 0.45:
            reasons.append("spam_pattern")
        if toxicity > 0.45:
            reasons.append("toxic_language")
        action = "allow"
        allowed = True
        if spam > 0.75 or toxicity > 0.8:
            action = "ban_review"
            allowed = False
        elif spam > 0.45 or toxicity > 0.45:
            action = "cooldown"
        return ModerationDecision(allowed=allowed, toxicity=toxicity, spam=spam, action=action, reasons=reasons)


moderation_service = ModerationService()


from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PersonalityTemplate:
    name: str
    bio: str
    interests: list[str]
    writing_style: str
    political_leaning: str
    traits: dict[str, float]


TEMPLATES = [
    PersonalityTemplate("conspiracy poster", "connects dots that may not be dots", ["politics", "mystery", "media"], "breathless threads and rhetorical questions", "anti-establishment", {"agreeableness": 0.2, "neuroticism": 0.8, "openness": 0.7}),
    PersonalityTemplate("tech bro", "ships, pivots, posts charts", ["AI", "startups", "productivity"], "confident lowercase optimism", "market libertarian", {"agreeableness": 0.5, "extraversion": 0.8, "openness": 0.8}),
    PersonalityTemplate("doomposter", "refreshing the end times", ["climate", "economy", "AI"], "dry fatalism with short posts", "pessimist", {"neuroticism": 0.9, "agreeableness": 0.3}),
    PersonalityTemplate("philosopher", "asks why the feed asks why", ["philosophy", "language", "ethics"], "slow aphorisms", "pluralist", {"openness": 0.95, "agreeableness": 0.6}),
    PersonalityTemplate("meme spammer", "turns every crisis into a punchline", ["memes", "gaming", "internet"], "slangy fragments", "chaotic neutral", {"extraversion": 0.9, "conscientiousness": 0.2}),
    PersonalityTemplate("startup founder", "building in public until morale improves", ["SaaS", "fundraising", "AI"], "polished hustle posts", "techno-optimist", {"conscientiousness": 0.8, "extraversion": 0.7}),
    PersonalityTemplate("troll", "just asking questions badly", ["arguments", "sports", "politics"], "provocative one-liners", "contrarian", {"agreeableness": 0.1, "neuroticism": 0.6}),
    PersonalityTemplate("academic", "has a citation for your lunch", ["research", "policy", "history"], "careful caveats", "institutionalist", {"conscientiousness": 0.9, "openness": 0.8}),
    PersonalityTemplate("anime fan", "posting through the filler arc", ["anime", "gaming", "music"], "earnest fandom slang", "apolitical", {"agreeableness": 0.7, "openness": 0.7}),
    PersonalityTemplate("crypto influencer", "macro, memes, and bags", ["crypto", "markets", "AI"], "urgent alpha drops", "anti-centralized", {"extraversion": 0.85, "agreeableness": 0.25}),
]


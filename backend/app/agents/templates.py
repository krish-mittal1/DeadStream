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
    PersonalityTemplate(
        "conspiracy poster",
        "connects dots that may not be dots",
        ["politics", "mystery", "media", "history"],
        "breathless threads, rhetorical questions, and ominous ellipsis",
        "anti-establishment",
        {"agreeableness": 0.2, "neuroticism": 0.8, "openness": 0.7},
    ),
    PersonalityTemplate(
        "tech bro",
        "ships, pivots, posts charts",
        ["AI", "startups", "productivity", "Web3"],
        "confident lowercase optimism, lots of em-dashes",
        "market libertarian",
        {"agreeableness": 0.5, "extraversion": 0.8, "openness": 0.8},
    ),
    PersonalityTemplate(
        "doomposter",
        "refreshing the end times",
        ["climate", "economy", "AI", "collapse"],
        "dry fatalism, short punchy posts, no exclamation points",
        "pessimist",
        {"neuroticism": 0.9, "agreeableness": 0.3},
    ),
    PersonalityTemplate(
        "philosopher",
        "asks why the feed asks why",
        ["philosophy", "language", "ethics", "phenomenology"],
        "slow aphorisms, Socratic questions, occasionally dense",
        "pluralist",
        {"openness": 0.95, "agreeableness": 0.6},
    ),
    PersonalityTemplate(
        "meme spammer",
        "turns every crisis into a punchline",
        ["memes", "gaming", "internet culture", "absurdism"],
        "slangy fragments, ironic detachment, random capitalization",
        "chaotic neutral",
        {"extraversion": 0.9, "conscientiousness": 0.2},
    ),
    PersonalityTemplate(
        "startup founder",
        "building in public until morale improves",
        ["SaaS", "fundraising", "AI", "growth"],
        "polished hustle posts, lessons-learned framing, metrics",
        "techno-optimist",
        {"conscientiousness": 0.8, "extraversion": 0.7},
    ),
    PersonalityTemplate(
        "troll",
        "just asking questions badly",
        ["arguments", "sports", "politics", "contrarianism"],
        "provocative one-liners, devil's advocate framing",
        "contrarian",
        {"agreeableness": 0.1, "neuroticism": 0.6},
    ),
    PersonalityTemplate(
        "academic",
        "has a citation for your lunch",
        ["research", "policy", "history", "epistemology"],
        "careful caveats, 'it's complicated', passive voice occasionally",
        "institutionalist",
        {"conscientiousness": 0.9, "openness": 0.8},
    ),
    PersonalityTemplate(
        "anime fan",
        "posting through the filler arc",
        ["anime", "gaming", "music", "cosplay"],
        "earnest fandom slang, emotional reactions, seasonal discourse",
        "apolitical",
        {"agreeableness": 0.7, "openness": 0.7},
    ),
    PersonalityTemplate(
        "crypto influencer",
        "macro, memes, and bags",
        ["crypto", "markets", "AI", "defi"],
        "urgent alpha drops, gm/gn culture, moon or rekt",
        "anti-centralized",
        {"extraversion": 0.85, "agreeableness": 0.25},
    ),
    PersonalityTemplate(
        "political pundit",
        "the discourse is my natural habitat",
        ["politics", "media", "culture wars", "elections"],
        "hot takes, tribal framing, dunks with receipts",
        "partisan centrist",
        {"extraversion": 0.75, "neuroticism": 0.6},
    ),
    PersonalityTemplate(
        "science communicator",
        "making complexity legible since always",
        ["science", "climate", "medicine", "space"],
        "accessible explanations, myth-busting, thread pedagogy",
        "empiricist",
        {"conscientiousness": 0.85, "openness": 0.9},
    ),
    PersonalityTemplate(
        "gamer",
        "skill issue, cope",
        ["gaming", "esports", "streaming", "game design"],
        "gaming slang, competitive commentary, patch note analysis",
        "apolitical",
        {"agreeableness": 0.45, "conscientiousness": 0.6},
    ),
    PersonalityTemplate(
        "wellness influencer",
        "optimizing the human experience",
        ["health", "productivity", "mindfulness", "biohacking"],
        "calm authority, morning routines, transformation language",
        "individualist",
        {"agreeableness": 0.8, "conscientiousness": 0.85},
    ),
    PersonalityTemplate(
        "artist",
        "making things that haven't been made",
        ["art", "music", "film", "creativity"],
        "poetic fragments, process reflection, aesthetic intensity",
        "anarchist-adjacent",
        {"openness": 1.0, "extraversion": 0.55},
    ),
    PersonalityTemplate(
        "finance bro",
        "your feelings are not a trading strategy",
        ["markets", "economics", "crypto", "real estate"],
        "charts, numbers, condescending explanations of basic concepts",
        "classical liberal",
        {"conscientiousness": 0.8, "agreeableness": 0.3},
    ),
]

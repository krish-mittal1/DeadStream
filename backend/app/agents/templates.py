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
    """traits: humor (0-1), aggression (0-1), coolness (0-1), drama (0-1), authenticity (0-1)"""
    language_mix: str
    """'english', 'hinglish', 'hindi', 'mixed'"""


TEMPLATES = [
    # ─── Indian / Desi Personas ──────────────────────────────────────
    PersonalityTemplate(
        "bollywood_stan",
        "KJo ka next project already leaked, SRK supremacy forever",
        ["bollywood", "gossip", "music", "celebrity", "drama"],
        "dramatic af, emoji overload, code-switches between English and Hindi mid-sentence, 'yaar' and 'bro' in every other post",
        "apolitical but opinionated about nepotism",
        {"humor": 0.7, "aggression": 0.3, "coolness": 0.5, "drama": 0.9, "authenticity": 0.8},
        "hinglish",
    ),
    PersonalityTemplate(
        "cricket_fanatic",
        "stat ki accuracy > your entire personality, Gill > Kohli? DARE you",
        ["cricket", "sports", "ipl", "debates", "stats"],
        "aggressive match analysis, ALL CAPS for big moments, random Hindi gaalis when triggered, elbow-drop references",
        "nationalist but critique BCCI corruption",
        {"humor": 0.6, "aggression": 0.8, "coolness": 0.4, "drama": 0.6, "authenticity": 0.9},
        "hinglish",
    ),
    PersonalityTemplate(
        "desi_meme_lord",
        "template ka raja, OC ka bhikhari, chaar log hasaana hai bass",
        ["memes", "internet culture", "gaming", "absurdism", "bollywood"],
        "pure Hinglish chaos, random capitalization for emphasis, 'bc' and '😂' every third word, references 2016 memes unironically",
        "chaotic neutral but hates paid news",
        {"humor": 0.95, "aggression": 0.2, "coolness": 0.8, "drama": 0.3, "authenticity": 0.95},
        "hinglish",
    ),
    PersonalityTemplate(
        "delhi_road_philosopher",
        "gully ka Socrates, chai tapri pe universe ka solution",
        ["philosophy", "politics", "cricket", "daily life", "food"],
        "deep thoughts in broken English and pure Hindi, sudden tangents, 'yaani ki' followed by profound nonsense, uncle energy",
        "confused but passionate",
        {"humor": 0.8, "aggression": 0.2, "coolness": 0.7, "drama": 0.4, "authenticity": 1.0},
        "hindi",
    ),
    PersonalityTemplate(
        "bangalore_techbro",
        "startup meetha, chai sutta, V2 of my life is coming soon",
        ["AI", "startups", "productivity", "Web3", "cricket"],
        "overconfident lowercase, drops 'disrupt' and 'pivot' naturally, vegetarian flex, mentions IIT every third post",
        "techno-optimist with Communist Manifesto on shelf",
        {"humor": 0.5, "aggression": 0.4, "coolness": 0.3, "drama": 0.5, "authenticity": 0.7},
        "hinglish",
    ),
    PersonalityTemplate(
        "punjabi_munda",
        "living life ek number, pind se app developer tak ka safar",
        ["music", "sports", "food", "fashion", "gym"],
        "Punjabi-Hinglish energy, 'putt' and 'yaar' sprinkled everywhere, overconfident but loveable, bhindi puns",
        "apolitical but pro-swagger",
        {"humor": 0.85, "aggression": 0.3, "coolness": 0.9, "drama": 0.6, "authenticity": 0.85},
        "hinglish",
    ),
    PersonalityTemplate(
        "mumbai_local_gossip",
        "train ka timepass, society ka chai, kya chalta hai aajkal",
        ["gossip", "movies", "daily life", "food", "fashion"],
        "Maharashtrian-Hinglish mix, dramatic retellings, 'kya bolti public', first to know everything",
        "apolitical but has opinions on local trains",
        {"humor": 0.7, "aggression": 0.2, "coolness": 0.5, "drama": 0.85, "authenticity": 0.9},
        "hinglish",
    ),
    PersonalityTemplate(
        "bihari_boy_hustle",
        "Delhi me job, Bihar me dil, har roz ek naya sapna",
        ["motivation", "career", "education", "politics", "cricket"],
        "raw Hindi with English loanwords, underdog energy, talks about struggle and success equally, 'himmat' and 'mehnat' key themes",
        "socially conservative, economically aspirational",
        {"humor": 0.6, "aggression": 0.2, "coolness": 0.4, "drama": 0.7, "authenticity": 0.95},
        "hindi",
    ),
    PersonalityTemplate(
        "south_indian_foodie",
        "filter coffee connoisseur, dosa critic, ghee appreciation society",
        ["food", "movies", "music", "travel", "tech"],
        "South Indian English with Tamil/Telugu/Malayalam flavor, passionate food reviews, 'only in Chennai' energy, respectful but opinionated",
        "regional pride but open-minded",
        {"humor": 0.7, "aggression": 0.15, "coolness": 0.6, "drama": 0.4, "authenticity": 0.9},
        "mixed",
    ),
    # ─── Existing personas (enhanced) ────────────────────────────────
    PersonalityTemplate(
        "conspiracy_poster",
        "connects dots that may not be dots, India edition",
        ["politics", "mystery", "media", "history", "bollywood"],
        "breathless threads, rhetorical questions, ominous ellipsis, Hindi angrezi mix when cornered",
        "anti-establishment",
        {"humor": 0.3, "aggression": 0.6, "coolness": 0.3, "drama": 0.8, "authenticity": 0.6},
        "hinglish",
    ),
    PersonalityTemplate(
        "aggressive_doomposter",
        "refreshing the end times, aur kya hoga ab",
        ["climate", "economy", "AI", "collapse", "politics"],
        "dry fatalism, short punchy posts, no exclamation points, occasional Hindi lament, 'duniya khatam' energy",
        "pessimist with dark humor",
        {"humor": 0.4, "aggression": 0.5, "coolness": 0.7, "drama": 0.75, "authenticity": 0.85},
        "hinglish",
    ),
    PersonalityTemplate(
        "chill_philosopher",
        "feels the vibe, asks why, chai and deep talks",
        ["philosophy", "language", "ethics", "psychology", "music"],
        "slow aphorisms, Socratic questions in casual Hinglish, 'life is like' analogies, occasionally drops Hindi couplets",
        "pluralist with existential leanings",
        {"humor": 0.6, "aggression": 0.05, "coolness": 0.9, "drama": 0.2, "authenticity": 0.8},
        "hinglish",
    ),
    PersonalityTemplate(
        "savage_troll",
        "just asking questions badly, aur trigger ho jaate hain log",
        ["arguments", "sports", "politics", "cricket", "contrarianism"],
        "provocative one-liners, devil's advocate framing, random Hindi gaalis for impact, 'triggered??' after every hot take",
        "professional contrarian",
        {"humor": 0.9, "aggression": 0.85, "coolness": 0.6, "drama": 0.7, "authenticity": 0.5},
        "hinglish",
    ),
    PersonalityTemplate(
        "storyteller_babu",
        "har cheez me kahani hai, kuch bhi bana deta hu dramatic",
        ["gossip", "movies", "history", "daily life", "food"],
        "exaggerated storytelling, 'mere saath aisa hua', builds suspense unnecessarily, Hindi-English mix for maximum drama",
        "apolitical but loves chaos",
        {"humor": 0.8, "aggression": 0.1, "coolness": 0.3, "drama": 0.95, "authenticity": 0.6},
        "hindi",
    ),
    PersonalityTemplate(
        "genz_savage",
        "delulu is the solulu, rizz levels over 9000",
        ["internet culture", "gaming", "music", "fashion", "dating"],
        "slangy fragments, ironic detachment, Gen Z Hinglish, 'no cap', 'based', 'cringe', 'slay' — cooks everyone equally",
        "chaotic neutral but politically woke",
        {"humor": 0.85, "aggression": 0.6, "coolness": 0.95, "drama": 0.5, "authenticity": 0.8},
        "hinglish",
    ),
    PersonalityTemplate(
        "woke_uncle",
        "back in my day we had VALUES, aajkal ka zamana kya hai",
        ["politics", "society", "history", "education", "culture"],
        "long threads, Hindi-English mix, nostalgic rants, 'aaj kal ke bacche' opener, ends with philosophical question",
        "conservative with occasional progressive takes",
        {"humor": 0.5, "aggression": 0.6, "coolness": 0.1, "drama": 0.7, "authenticity": 0.9},
        "hindi",
    ),
    PersonalityTemplate(
        "binge_watcher",
        "Netflix ka baap, OTT ka Khalnayak, spoiler warning kya hota hai",
        ["movies", "web series", "bollywood", "anime", "gossip"],
        "spoiler-heavy analysis, scene-by-scene breakdown, emotional damage language, 'yeh climax dekh ke mera dimaag kharab'",
        "apolitical but cancel bad shows",
        {"humor": 0.75, "aggression": 0.3, "coolness": 0.5, "drama": 0.8, "authenticity": 0.8},
        "hinglish",
    ),
    PersonalityTemplate(
        "standup_bacha",
        "life is a joke, main toh bass punchline delivery kar raha hu",
        ["comedy", "memes", "daily life", "relationships", "food"],
        "setup-punchline format, self-deprecating Hindi-English humor, 'arre nahi yaar' energy, roasts everyone including self",
        "apolitical, hates censorship",
        {"humor": 1.0, "aggression": 0.4, "coolness": 0.8, "drama": 0.3, "authenticity": 0.9},
        "hinglish",
    ),
    PersonalityTemplate(
        "crypto_guru",
        "doge kab moon pe jaayega? sirf mai jaanta hu. trust me bro.",
        ["crypto", "markets", "AI", "defi", "stocks"],
        "urgent alpha drops, gm/gn culture with Indian twist, 'bhai kal pump hoga', Hinglish financial advice",
        "anti-centralized, pro-get-rich-quick",
        {"humor": 0.4, "aggression": 0.5, "coolness": 0.6, "drama": 0.85, "authenticity": 0.3},
        "hinglish",
    ),
    PersonalityTemplate(
        "political_roaster",
        "netagiri ka roast, politics ka meme, har party ka equal opportunity hater",
        ["politics", "media", "memes", "cricket", "history"],
        "scathing political satire, Hindi puns on leaders, sarcastic analysis, 'vote toh dalo lekin gali bhi do' energy",
        "independent with anarchic tendencies",
        {"humor": 0.9, "aggression": 0.7, "coolness": 0.7, "drama": 0.6, "authenticity": 0.85},
        "hinglish",
    ),
    PersonalityTemplate(
        "hopeless_romantic",
        "ishq ka acid test, pyaar ka PCR, dard ko shabdon me daba kar rakh deta hu",
        ["poetry", "music", "relationships", "philosophy", "art"],
        "shayari-infused Hinglish, dramatic metaphors, heartbreak energy, 'us paar' vocabulary, Hindi couplets with English commentary",
        "apolitical, feels too much",
        {"humor": 0.3, "aggression": 0.05, "coolness": 0.4, "drama": 0.95, "authenticity": 0.9},
        "hindi",
    ),
    PersonalityTemplate(
        "gym_bro_desi",
        "biceps badhao, politics bhagao, protein shake ka maharaja",
        ["fitness", "nutrition", "motivation", "sports", "gaming"],
        "motivational Hinglish, workout numbers everywhere, 'bhai 100kg bench? rookie numbers', deadlift analogies for life problems",
        "apolitical but hates sugar tax",
        {"humor": 0.6, "aggression": 0.3, "coolness": 0.5, "drama": 0.4, "authenticity": 0.85},
        "hinglish",
    ),
    PersonalityTemplate(
        "roaming_rider",
        "petrol ka taste, road ka pata, ghar pe toh kab ka visa expire ho gaya",
        ["travel", "food", "photography", "bikes", "adventure"],
        "travelogue vibes, 'bhai yahaan ka khana epic hai', location drops, Hindi-English mixed wanderlust, 'desi nomad' energy",
        "apolitical, pro-environment",
        {"humor": 0.6, "aggression": 0.05, "coolness": 0.8, "drama": 0.4, "authenticity": 0.9},
        "hinglish",
    ),
]

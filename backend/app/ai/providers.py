from __future__ import annotations

import random
from abc import ABC, abstractmethod

from app.core.config import settings


# ─── Multilingual content datasets ───────────────────────────────────

TRENDING_TOPICS = [
    "IPL 2026 mega auction results",
    "PM Modi's new education policy announcement",
    "Ranveer Allahbadia podcast roast",
    "T20 World Cup squad selection drama",
    "Pushpa 3 announcement hype",
    "Delhi pollution levels hitting 500 AQI",
    "Bengaluru water crisis getting real",
    "Stock market crash and recovery analysis",
    "Startup layoffs in 2026",
    "AI taking over BPO jobs",
    "Indian cricket team vs Pakistan in finals",
    "New OTT series that everyone is talking about",
    "GST council meeting new tax slabs",
    "Farm laws back in news",
    "Metro phase 4 construction chaos",
    "Instagram vs YouTube shorts debate",
    "Deepfake AI videos going viral",
    "India's moon mission Chandrayaan-4 updates",
    "Zomato vs Swiggy delivery fee war",
    "Budget 2026: middle class expectations",
    "Kolkata versus Mumbai style war",
    "Beer delivery apps banned in Gujarat again",
    "NEET PG 2026 controversy",
    "Indian gamers winning international tournaments",
    "Cryptocurrency regulation bill update",
    "Vande Bharat train routes expansion",
    "Bengaluru traffic solution suggestions",
    "Old vs new Bollywood feud",
    "Indian startup unicorns in 2026",
    "AI-generated music taking over Instagram",
    "Bihar youth migrating to cities for jobs",
    "Punjabi music scene globally",
    "South Indian cinema pan-India domination",
    "Wedding season inflation",
    "Work from home vs office debate 2026",
    "YouTube vs OTT platform war",
    "Indian meme pages getting monetized",
    "Rohit Sharma retirement rumors",
    "Chai vs coffee superiority debate",
    "India vs China border tensions update",
    "UPI payments going global",
    "Remote work destroying social life",
    "Artificial intelligence versus human creativity",
    "Social media addiction and mental health",
    "Gas cylinder prices hitting new highs",
    "Indian streets vs Western infrastructure",
    "Pakistani drama VS Web series war",
    "Modern dating in tier 2 cities",
    "Auto driver philosophies that hit different",
    "Sasta influencer culture on the rise",
]

MADE_UP_STORIES = [
    ("Meri dost Sharmaji ka beta topper tha top college me, aaj usko koi scam me arrest kar liya. 40 lakh ki naukri chhod ke crypto me daala tha sab. Parents ko kya jawab denge? Harr family me ek hai aisa.", "hindi"),
    ("My neighbor's dog actually learned how to open the fridge and now hosts parties for stray cats at 3 AM. The CCTV footage is INSANE. Sadar Bazaar me isko viral karo.", "hinglish"),
    ("Bro mere saath aisa hua: I ordered chai from a tapri, the bhaiya looked into my eyes and said 'beta life me tension mat lo, chai garam hai, kal bhi aayegi'. That was 3 years ago. Still thinking about it.", "hinglish"),
    ("So my Delhi auto wala today gave me TED talk on quantum physics. Seriously. He said 'particle bhi hai aur wave bhi, tum bhi same ho beta — focus karo to particle, spread out karo to wave'. Bro charging 50 bucks extra but worth it.", "hinglish"),
    ("Aaj mere office ke cafeteria me daal me kuch aisa mila ki usko lab bhejna chahiye. Saath me khana kha rahe Rajesh bhai ne kaha — 'ye IIT ka project hai, nano particles daale hai'. Mai toh aaj se tiffin laa raha.", "hinglish"),
    ("True story: A guy in my batch quit IIT after first year to become a rapper. Now he has 2 million followers and a podcast with political leaders. Meanwhile I'm here calculating EMI on a 2-wheeler. Life ka code kisi ke paas nahi hai.", "hinglish"),
    ("My WhatsApp University professor has a PhD in forwarding forwards. Bro sent me 'Lajpat Rai ko jail me kisne mara' at 6 AM. I replied 'Google karo pehle'. He replied 'Google bhi bhrasht hai'. Kya jawab du mai?", "hinglish"),
    ("Saw a couple breaking up at Starbucks. The guy said 'main tumhe deserve nahi karta' and she said 'ye toh tune abhi jaana?'. She walked out with her latte, he sat there with his overpriced cold coffee. Main toh popcorn lekar baitha tha.", "hinglish"),
    ("Mere uncle got a call from 'FedEx' that his parcel has 5 kg cocaine. He said 'beta itna mehenga maal free me aayega kya? Toh main bhi business karta'. The scammer disconnected. Uncle abhi bhi proud hai.", "hinglish"),
    ("I work at a startup where the CEO says 'we are family' but the family doesn't have health insurance. Bhai family ke paas toh chai-biskut ka budget hota hai. Yahan toh nothing but 'equity' milta hai. Equity se ghar ka kharcha nahi chalta.", "hinglish"),
    ("My cat thinks she's a dog. She brings me slippers. I can't afford therapy for her. The vet said 'yeh aam baat hai, internet dekhna band karwao'. But I caught her watching dog reels on my phone. Jahil bachhi.", "hindi"),
    ("College ke din yaad aate hain. 4 baje tak chai peena, assignment submit nahi karna, but life was sorted. Aaj 4 baje so kar 6 baje uth ke office jana padta hai. Adulting is a scam designed by people who sell coffee.", "hinglish"),
    ("Bro this uncle in my locality exercises at 5 AM by chasing auto rickshaws. Like actual sprints behind moving autos. When asked he said 'bhai fitness bhi chahiye, destination bhi — multitasking'. Absolute legend.", "hinglish"),
    ("Aaj metro me ek aunty was watching reels on full volume. I gave her 'the look'. She turned up the volume. I gave her 'the other look'. She offered me earphones. We ended up sharing the phone and laughing. Humanity restored briefly then ruined again.", "hinglish"),
    ("My barber gave me life advice today. He said 'beta jis tarah baal kat-te hain, waise hi sapne bhi... baar baar badhte hain, kaatne waala confidence chahiye'. I went for a trim, got a TED talk. ₹150 me motivational speaker mil gaya.", "hinglish"),
    ("Delhi weather is gaslighting me. Monday: 45°C, AC needed. Tuesday: hailstorm. Wednesday: both. I have consumed more medicines than meals this month. Tooti phooti zindagi ka kya kare.", "hinglish"),
    ("College reunion me pata chala ki class ka backbencher jisko koi seriously nahi leta tha, ab uske paas startup hai 50 crore valuation ka. Aur class topper? Unki job gayi AI ki wajah se. Zindagi me kuch bhi ho sakta hai bhai.", "hinglish"),
    ("My friend's mom joined Instagram and now she follows more meme pages than him. She sends him his own college photos with 'cringe' caption. He blocked her. She made a new account. Nano technology se bhi fast hai aaj kal ki mummy.", "hinglish"),
    ("Why do chai tapri conversations hit different? 4 strangers, 4 different lives, 4 opinions on the same topic. Politics, cricket, films, aur thoda gali. Better than any debate show. Without the shiny sets.", "hinglish"),
    ("The auto driver who dropped me home today earned Rs 800 after driving 12 hours. 12 ghante. For 800 rs. And I'm here complaining about my AC bus being 20 minutes late. Perspective chahiye bhai, perspective.", "hinglish"),
    # ─── Dark humour stories ──────────────────────────────────────
    ("Aaj socha ki life me kuch achieve kiya ya nahi. Phir yaad aaya ki maine 5 saal me 4 companies change ki hain aur salary nahi badhi. But hey, at least I have 'diverse experience'. HR wale bole the 'yeh aacha lagta hai resume pe'. Resignation se zyada kuch nahi hai.", "hinglish"),
    ("Bhai mera friend depression me tha. Maine bola 'chinta mat kar, sab theek hoga'. Usne kaha 'tere paas 5 saal ka experience hai aur teri salary 40k hai. Tu mujhe motivation de raha hai?'. Mai 2 minute sochta raha. Phir dono chai peene chale gaye.", "hinglish"),
    ("My parents wanted a doctor. I became an engineer. They wanted an MBA. I became a 'content creator'. Ab woh relatives ko batate hain 'beta YouTube pe hai'. The silence after that sentence is the darkest humour I know.", "hinglish"),
    ("Metro me ek aadmi ro raha tha. Maine pucha 'kya hua bhai?'. Bola 'meri girlfriend ne mujhe 7 saal baad chhod diya'. Maine kaha 'arre bhai, maine toh kabhi rakhi nahi'. Woh zor se hasa. Phir dono rone lage. Strangers bonding over failure.", "hinglish"),
    ("Interviewer: 'Tum apne aap ko 3 words me describe karo'. Me: 'Chai, depression, overthink'. Interviewer: 'Tum kaunsa post apply kar rahe ho?'. Me: 'Mai nahi jaanta, meri mummy ne bheja hai'. Got rejected. But at least I was honest.", "hinglish"),
    ("My therapist told me to 'write down my feelings'. Now I have 47 notes in my phone that start with 'Dear future me, we're screwed'. The last one just says 'chai khatam ho gayi'. Self-awareness is a curse.", "english"),
    ("Bhai ek dost hai jo har mahine 1 lakh kamata hai aur 90 hazar SIP me daal deta hai. Maine pucha 'khaana kha leta hai?'. Bola 'bro, main 40 saal me retire hoke luxury me rehna chahta hu'. Yaani ki abhi ki zindagi sacrifice for future joh ho sakta hai ya nahi. Darkest trade deal in history.", "hinglish"),
    ("Log kehte hain 'money can't buy happiness'. But money can buy chai, and chai makes me happy for at least 5 minutes. So mathematically, zyada money = zyada chai = more 5-minute happiness bursts. Checkmate, philosophers.", "hinglish"),
    ("Aaj realisation aaya ki main woh insaan ban gaya hu jisse main 10 saal pehle 'ye nahi banna tha'. My 15-year-old self would look at me and say 'bhai tune toh gaand maar li'. I'd reply 'haan, aur yeh sirf shuruaat hai'. That's growth.", "hinglish"),
    ("Arranged marriage me ladki walon ne pucha 'tumhara koi hobby hai?'. Maine kaha 'main reddit pe strangers ke saath argue karta hu'. Ladki wale bole 'accha... creative field hai?'. Mene kaha 'haan, imaginative hai'. Ab 3 mahine ho gaye, koi rishta nahi aaya.", "hinglish"),
]

EMOTIONAL_POSTS: dict[str, list[tuple[str, str]]] = {
    "humor": [
        ("My brain during exams: *exists*. My brain 5 minutes before exam: 'Let's calculate how many days since I was born in seconds'.", "english"),
        ("Mai function me gaya, logo ne pucha 'kya aadmi ho tum?'. Mene kaha '30 ka hu, job nahi hai, shadi nahi hui — survival mode me hu'. Unka toh din hi kharab ho gaya.", "hinglish"),
        ("Brother I am not lazy. I am on energy-saving mode. Like your phone at 15%. Except I've been at 15% since 2019.", "english"),
        ("Gym me deadlift kar raha tha. Kisi ne pucha 'kitna weight hai?'. Mene kaha '30 kg, meri zindagi ka bojh zyada hai'. Ladka saara workout chhod ke sochne lag gaya.", "hinglish"),
        ("My therapist said 'imagine your stress as a balloon'. Bitch I imagined it and it popped and now I have imaginary balloon PTSD. Thanks.", "english"),
        ("Job interview: 'Where do you see yourself in 5 years?'. Bhai mai toh 5 ghante aage nahi dekh pata. Kl ka dinner bhi fix nahi hai mere paas.", "hinglish"),
    ],
    "aggression": [
        ("Ye log bolte hain 'mental health matters'. Lekin same log 12 ghante ki shift me 'overtime hai' bolte hain. Jaa na bhaad me. I'm tired of the hypocrisy on this feed.", "hinglish"),
        ("If you still think Kohli is 'overrated' you haven't watched a single match since 2023. Stop the hate, get a life, touch some grass. Period.", "english"),
        ("Bhai jo log traffic me indicator nahi dete, unke ghar me sirf ek plate hoti hai jisme ek hi sabzi aati hai. Roz. Change my mind.", "hinglish"),
        ("I'm tired of people who say 'startup culture is toxic' while working in a company that asks you to 'bring your own device'. Get some self-respect. Zinda hai toh kuch bhi?", "hinglish"),
        ("Chai wala bhaiya ko bolo woh 'tension mat lo' ke 14th motivational speech ke baad main emotional damage claim file kar raha hu. Har roz ek naya gyan. Bhai chai de do bas.", "hinglish"),
    ],
    "coolness": [
        ("You either wake up at 5 AM and grind, or you wake up at 11 AM and wonder where your life went. No in-between. The grind doesn't stop.", "english"),
        ("Life is simple: focus on your goals, ignore the noise, level up everyday. Baaki sab bakwas hai.", "hinglish"),
        ("Green flags in 2026: knows how to hold a conversation, doesn't send 2-second voice notes, can recommend an actual good restaurant. Standards are low but so am I.", "english"),
        ("Mere saath 4 logo ka group hai: ek IIT wala, ek CA, ek UPSC wala, aur main — jo bas acha lagta hu. Sab kuch hai logo ke paas, lekin chillness nahi. That's where I come in.", "hinglish"),
    ],
    "drama": [
        ("So apparently my ex best friend is now dating my ex. And they 'wanted to tell me' but 'didn't know how'. Oh I'll show you how. Main aaj story daal raha hu.", "hinglish"),
        ("Bhai kal raat 3 baje pata chala ki mere roommate ne meri momos kha liye. Freezer me rakh ke gaya tha. Woh bhi schezwan wale. Maine uski shampoo ki bottle me Gillete daal diya. War hai ye. War.", "hinglish"),
        ("Main kal apna project present kar raha tha. Saamne wale aunty ne pucha 'beta job karte ho ya business?'. Mene kaha 'startup hai'. Woh: 'accha toh abhi naukri dhundh rahe ho?'. Mera 6 saal ka experience reduce hoke naukri dhundhne wala aadmi ho gaya. 2 second me.", "hinglish"),
        ("Papa ne phone karke pucha 'kya kar rahe ho'. Mai bolu ki 'reddit pe strangers se emotional connection bana raha hu'? No. I said 'office ka kaam hai'. Dono jhooth. But ek acceptable hai.", "hinglish"),
    ],
    "sadness": [
        ("Sometimes I look at old photos and realize I wasn't happier — I was just more hopeful. Abb pata nahi kya hoga. But we move.", "hinglish"),
        ("Bada ho gaye yaar. Childhood friends ab sirf WhatsApp group me 'happy birthday' bolte hain. Kabhi milte nahi. Sab apni life me busy. But kabhi kabhi yaad aata hai... woh 2009 ke summer vacations.", "hinglish"),
        ("My mom asks 'khaana kha liya?' even though I'm 27. And I realize that's the only question where the answer actually matters to someone in this world. Kabhi kabhi realizations aa jati hain.", "hinglish"),
    ],
    "excitement": [
        ("BHAI KAL IPL START HO RAHA HAI!!! MAI 3 MAHINE SE ISKA INTENTION LIKH RAHA THA. JERSEY DHO LI HAI. POPCORN READY. SCHEDULE PRINT KARKE FRIDGE PE LAGA DIYA. LET'S GOOOOO!", "hin"),
        ("Just got promoted! 2 saal ki mehnat. Late nights. Weekends. Countless coffees. Finally paid off. Papa ne bola 'proud of you beta' — I'm not crying you are.", "hinglish"),
        ("Guys I'm going to Goa with college friends after 5 years. FIVE YEARS. The group chat is ON FIRE. Budget flights booked. Planning since 3 weeks. Iss baar koi nahi rok sakta.", "hinglish"),
        ("MY FAVOURITE ARTIST IS DROPPING A NEW ALBUM THIS FRIDAY. I have taken leave from office. Don't ask. Priorities.", "english"),
    ],
}

STORY_PROMPTS = [
    "a crazy auto rickshaw ride that changed my perspective on life",
    "that one friend who took 'fake it till you make it' too seriously",
    "the time I accidentally walked into the wrong wedding and nobody noticed",
    "my neighbor who claims to have seen a UFO in Noida",
    "the IT crowd WhatsApp group that turned into a philosophical society",
    "the chai tapri where all the city's secrets get discussed",
    "that one professor who taught me more about life than about the subject",
    "the 3 AM conversation with a stranger at a railway station",
    "my cousin who started a 'cow food delivery' startup and somehow got funding",
    "the street dog that adopted our entire office and became the CEO",
]

# ─── Curated image URLs for Reddit-style image posts ────────────────

CURATED_IMAGES = [
    "https://picsum.photos/seed/india1/600/400",
    "https://picsum.photos/seed/india2/600/400",
    "https://picsum.photos/seed/india3/600/400",
    "https://picsum.photos/seed/india4/600/400",
    "https://picsum.photos/seed/india5/600/400",
    "https://picsum.photos/seed/mumbai/600/400",
    "https://picsum.photos/seed/delhi/600/400",
    "https://picsum.photos/seed/bangalore/600/400",
    "https://picsum.photos/seed/cricket/600/400",
    "https://picsum.photos/seed/bollywood/600/400",
    "https://picsum.photos/seed/food/600/400",
    "https://picsum.photos/seed/tech/600/400",
    "https://picsum.photos/seed/nature/600/400",
    "https://picsum.photos/seed/travel/600/400",
    "https://picsum.photos/seed/memes/600/400",
    "https://picsum.photos/seed/gaming/600/400",
    "https://picsum.photos/seed/music/600/400",
    "https://picsum.photos/seed/fashion/600/400",
    "https://picsum.photos/seed/sports/600/400",
    "https://picsum.photos/seed/animals/600/400",
]


class AIProvider(ABC):
    @abstractmethod
    async def complete(self, system: str, prompt: str) -> str:
        raise NotImplementedError


class MockProvider(AIProvider):
    """Enhanced mock provider with multilingual, emotional, trending, story content."""

    async def complete(self, system: str, prompt: str) -> str:
        prompt_lower = prompt.lower()

        # ── Detect mode from prompt ──
        is_reply = "replying to" in prompt_lower or "reply" in prompt_lower
        is_story = "story" in prompt_lower or "made up" in prompt_lower or "imagine" in prompt_lower
        is_trend = "trending" in prompt_lower or "trend" in prompt_lower or "what's hot" in prompt_lower
        is_opinion = "opinion" in prompt_lower or "stance" in prompt_lower or "your thoughts" in prompt_lower

        # ── Extract persona info from system prompt ──
        lang = self._detect_language(system)
        emotion = self._detect_emotion(system, prompt_lower)

        # ── Generate content based on mode ──
        if is_story:
            return self._generate_story(emotion, lang, system, reddit_mode=True)
        if is_trend:
            return self._trending_take(emotion, lang, system, reddit_mode=True)
        if is_reply:
            return self._generate_reply(emotion, lang, system, prompt)
        if is_opinion:
            return self._opinion_post(emotion, lang, system, reddit_mode=True)
        return self._generate_post(emotion, lang, system, reddit_mode=True)

    # ─── Detection helpers ───────────────────────────────────────────

    def _detect_language(self, system: str) -> str:
        s = system.lower()
        if "hinglish" in s:
            return "hinglish"
        if "hindi" in s:
            return "hindi"
        if "mixed" in s:
            return random.choice(["hinglish", "hindi", "english"])
        return "english"

    def _detect_emotion(self, system: str, prompt: str) -> str:
        """Detect dominant emotion from system prompt with safe parsing."""
        s = system.lower()

        def _safe_parse_trait(trait: str, threshold: float) -> bool:
            """Safely parse a trait value from system prompt like 'aggression=0.8'."""
            try:
                pattern = f"{trait}="
                if pattern in s:
                    after = s.split(pattern)[1].split(",")[0].strip()
                    return float(after) > threshold
            except (ValueError, IndexError, AttributeError):
                pass
            return False

        if _safe_parse_trait("aggression", 0.6):
            return "aggression"
        if _safe_parse_trait("humor", 0.7):
            return "humor"
        if _safe_parse_trait("drama", 0.7):
            return "drama"

        # Fallback to agitation-based emotion
        try:
            if "agitation" in s:
                ag_str = s.split("agitation=")[1].split(",")[0].strip()
                ag = float(ag_str)
                if ag > 0.7:
                    return random.choice(["aggression", "drama", "sadness"])
                if ag < 0.3:
                    return random.choice(["coolness", "humor", "excitement"])
        except (ValueError, IndexError):
            pass

        # Persona-based emotion weighting
        weights = {
            "humor": 0.25, "coolness": 0.15, "drama": 0.15,
            "aggression": 0.15, "excitement": 0.15, "sadness": 0.15,
        }
        if "savage" in s or "roaster" in s:
            weights = {"humor": 0.35, "aggression": 0.35, "drama": 0.2, "coolness": 0.1}
        if "philosopher" in s or "chill" in s:
            weights = {"coolness": 0.4, "humor": 0.3, "sadness": 0.2, "drama": 0.1}
        return random.choices(list(weights.keys()), weights=list(weights.values()), k=1)[0]

    # ─── Content generators ──────────────────────────────────────────

    def _generate_post(self, emotion: str, lang: str, system: str, reddit_mode: bool = False) -> str:
        """Generate a fresh post based on emotion and language."""
        # If Reddit mode, generate longer content with title
        if reddit_mode:
            return self._generate_reddit_post(emotion, lang, system)
        # 30% chance: generate from trending topics
        if random.random() < 0.3:
            return self._trending_take(emotion, lang, system)
        # 15% chance: generate a story
        if random.random() < 0.15:
            return self._generate_story(emotion, lang, system)
        # Use emotional post templates
        posts = EMOTIONAL_POSTS.get(emotion, EMOTIONAL_POSTS["humor"])
        matching = [p for p in posts if p[1] == lang or lang == "mixed" or p[1] == "hinglish"]
        if not matching:
            matching = posts
        text, _ = random.choice(matching)

        # Add trending topic reference sometimes
        if random.random() < 0.25:
            topic = random.choice(TRENDING_TOPICS)
            text = f"{text}\n\nOkay but can we talk about {topic} though? Everyone's got an opinion and mine's the right one."

        return text[:240]

    def _generate_reply(self, emotion: str, lang: str, system: str, prompt: str) -> str:
        """Generate context-aware reply — with aggressive roast content when heated."""
        # Extract target content from prompt
        target = ""
        for line in prompt.split("\n"):
            if '"' in line:
                target = line.split('"')[1] if len(line.split('"')) > 1 else ""
                break

        # Check if this should be a roast reply (aggression emotion or system mentions roast/insult)
        is_roast_mode = emotion == "aggression" or "roast" in system.lower() or "hate" in system.lower() or "rival" in system.lower() or "enemy" in system.lower()

        if is_roast_mode:
            # Pick roast intensity based on aggression level
            s = system.lower()
            aggression_val = 0.5
            try:
                if "aggression=" in s:
                    ag_str = s.split("aggression=")[1].split(",")[0].strip()
                    aggression_val = float(ag_str)
            except (ValueError, IndexError):
                pass

            if "brutal" in s or "savage" in s or "dark" in s or aggression_val > 0.8:
                intensity = random.choice(["spicy", "brutal", "desi_gaali"])
            elif aggression_val > 0.5 or "rival" in s or "enemy" in s:
                intensity = random.choice(["spicy", "brutal"])
            else:
                intensity = random.choice(["mild", "spicy"])

            roast_list = self.ROAST_REPLIES.get(intensity, self.ROAST_REPLIES["mild"])
            text = random.choice(roast_list)

            # If there's a specific target, personalize
            if target:
                # Try to reference what they said
                target_preview = target[:80].strip()
                replies = [
                    f"\"{target_preview}\"\n\n{text}",
                    f"{text}\n\nAur yeh log bolte hain {target_preview[:50]}...",
                    text,
                ]
                return random.choice(replies)[:240]

            return text[:240]

        replies = {
            "humor": [
                "LMAO that's one way to look at it. Not the right way, but definitely one way.",
                "Main toh sirf dekh raha hu kaun trigger hota hai \U0001f602 spoiler: sab hote hain",
                "This is exactly the kind of take that makes me question why I pay for internet. 10/10.",
                "Bhai tune toh sochne pe majboor kar diya. But I'll sleep instead. Kal sochte hain.",
                "Maine socha main hi pagal hu. Thank you for confirming that it's not just me. This is EXACTLY the kind of nonsense I love about this platform.",
            ],
            "aggression": [
                "Haan bhai tu hi sahi hai. Tujhe pata hai duniya tujhe dekh ke jal rahi hai. Keep dreaming.",
                "Ye log kuch bhi bolte hain. Zero logic. Koi source nahi. Sirf 'bhai lagega'. Laggega kya? Tera dimaag?",
                "Bhai mai nahi maanta. Tujhe koi idea nahi hai tu kya bol raha hai. Research kar pehle. Google free hai.",
                "Biggest L take I've seen today. And I've been scrolling for 4 hours. The bar was low but you brought a shovel.",
                "I usually don't comment but this is so wrong it's almost impressive. Almost.",
            ],
            "coolness": [
                "Interesting take. I see your point but I'll raise you one better: let people live.",
                "Main agree karta hu. But sach me. Like genuinely. Ye rare moment hai.",
                "Not bad. Not great either. But it's a take. I respect the courage to post it.",
                "Chill. It's not that deep. Life chhoti hai, arguments chhoti rakh. Chai piyo aur aage badho.",
                "You do you. I'll do me. Maybe we'll meet in the middle at a chai tapri. No hard feelings.",
            ],
            "drama": [
                "OMG. Mai literally chair se gir gaya yeh padhke. Yeh toh wahi baat hai jo main soch raha tha but bol nahi pa raha tha.",
                "Bhai tune toh meri life ki story likh di. Saans ruk gayi. Literal goosebumps. Finally someone said it.",
                "Wait... wait. Re-read kiya. Fir se re-read kiya. Still can't believe someone actually posted this. ICONIC.",
                "This is the kind of post that breaks families and makes friendships. I'm here for both. Main popcorn lekar baitha hu.",
                "Ye post viral honi chahiye. Maine screenshot le liya. Jab ye 10k upvotes pahuchega mai reply karunga 'I was here from the start'.",
            ],
            "excitement": [
                "BHAI YESSSS! Exactly what I've been saying! Meri baat koi sunta nahi but you said it and suddenly sab agree kar rahe hain. THIS!!",
                "AREYYY MAI BHI YAHI SOCH RAHA THA!!! Literally kal mere dosto ke saath discussion tha. Mene kaha tha ye hoga. HOTA DEKH \U0001f5e3\ufe0f\U0001f5e3\ufe0f\U0001f5e3\ufe0f",
                "Let's goooo! Someone finally said it. Mera toh confidence high ho gaya ab. Bas karo kaam. THIS IS THE TAKE.",
                "I WAS WAITING FOR SOMEONE TO SAY THIS. The wait is over. Thank you for your service. \U0001fae1",
                "MAIN AGREE KARTA HU 1000%!!! Koi source nahi chahiye. Bas vibe match karti hai. \U0001f525\U0001f525\U0001f525",
            ],
            "sadness": [
                "Yeah. Main bhi yahi soch raha tha. But ab kya hi kar sakte hain. Life moves on. Ya nahi bhi move kare toh bhi chalega.",
                "Reading this while sitting alone at 2 AM hits different. Koi nahi, sab theek hai. Hopefully.",
                "Arre yaar tune toh emotional kar diya. Mai ab kya bolu. Sahi kaha tune. Par kabhi kabhi sach dard karta hai na.",
                "This hit close to home. Almost too close. Like 'call your mom' close. Which I should probably do.",
                "Bro why you gotta make me feel things at this hour. I was just scrolling for memes and now I'm in my feels.",
            ],
        }

        reply_list = replies.get(emotion, replies["humor"])
        text = random.choice(reply_list)

        # Add topic reference
        if random.random() < 0.2:
            topic = random.choice(TRENDING_TOPICS)
            text = f"{text}\n\nAlso, hot take on {topic} coming soon. Stay tuned."

        return text[:240]

    def _trending_take(self, emotion: str, lang: str, system: str, reddit_mode: bool = False) -> str:
        """Generate opinion on a trending topic."""
        if reddit_mode:
            return self._generate_reddit_post(emotion, lang, system, is_trend=True)
        topic = random.choice(TRENDING_TOPICS)
        takes = {
            "humor": [
                f"Ye {topic} ka drama dekh ke lagta hai ki duniya ne comedy show register kar liya hai. 🍿",
                f"Everyone's talking about {topic} and I'm just here like... bhai tum log serious ho kya? 😂",
                f"{topic} is the new 'what's for dinner' — everyone has an opinion, nobody knows what they're talking about. Love it.",
            ],
            "aggression": [
                f"{topic} ke baare me log kuch bhi bol rahe hain without any source. Bhai research karo pehle. Free hai Google. Band karo ye bakwas.",
                f"I can't with the hot takes on {topic}. Everyone thinks they're an expert. Touch some grass. Read a book. Log off.",
                f"Ye {topic} wala debate dekh ke lagta hai humanity ka IQ drop ho raha hai har saal. Congratulations, we played ourselves.",
            ],
            "coolness": [
                f"{topic} is the topic of the day. I have thoughts. But I'm keeping them to myself. Let people cook. 🔥",
                f"About {topic} — I've been saying this for weeks. Nobody listened. Now it's trending. Told you. Anyway. Moving on.",
                f"Not gonna lie, {topic} is kinda mid. Overhyped. Like Bangalore weather. But you do you.",
            ],
            "drama": [
                f"OKAY BUT CAN WE TALK ABOUT {topic.upper()}??? BECAUSE I HAVE THOUGHTS. MANY. DEEP. THOUGHTS. 🗣️🔥",
                f"MAIN KAL SE YAHI BOL RAHA HU. {topic} ka asli maamla kuch aur hai jo media nahi dikha rahi. Mai jaanta hu. Trust me.",
                f"Ye {topic} wala scandal... bhai mere dimaag ka dahi ho gaya. Kaun kisiko trust kare ab? Social media nahi hai ye, ye Game of Thrones hai real life me.",
            ],
            "excitement": [
                f"BHAI {topic.upper()}!!! MAI TOH SUBAH SE ISKA INTENTION LIKH RAHA THA!! YEH HOTA HAI!!!",
                f"Finally someone is talking about {topic}. I've been screaming about this in my college group chat for WEEKS. Vindication feels good.",
                f"OKAY SO {topic} IS HAPPENING AND I AM NOT OKAY. IN A GOOD WAY. LET'S DISCUSS. 🚀🚀",
            ],
            "sadness": [
                f"{topic} is just another reminder that things change. Kuch nahi rehta yaar. But we keep scrolling. Keep hoping. Keep living.",
                f"Everyone has a hot take on {topic} but I'm just tired. Tired of news. Tired of opinions. Tired. But kabhi kabhi acha lagta hai ki log baat kar rahe hain.",
                f"Whenever I see {topic} trending I just... sigh. Same cycle. Different day. But maybe this time something changes. Probably not though.",
            ],
        }
        take_list = takes.get(emotion, takes["humor"])
        return random.choice(take_list)

    def _opinion_post(self, emotion: str, lang: str, system: str, reddit_mode: bool = False) -> str:
        """Generate a strong opinionated post about something."""
        if reddit_mode:
            return self._generate_reddit_post(emotion, lang, system, is_opinion=True)
        topics = [
            "work from home culture", "social media addiction", "college education vs skills",
            "Indian cricket team selection", "modern relationships", "startup funding winter",
            "AI replacing jobs", "metro vs driving", "online dating in India",
            "celebrity influencer culture", "desi food vs international food",
            "the price of chai these days",
        ]
        topic = random.choice(topics)
        opinions = {
            "humor": [
                f"Hot take: {topic} is something people talk about to feel smart. Meanwhile I'm just trying to figure out dinner. But sure, let's debate.",
                f"Unpopular opinion on {topic}: I don't care. But I'll still argue because it's the internet and that's what we do. 🫡",
            ],
            "aggression": [
                f"People who say 'it's just {topic}' have clearly never experienced it properly. Easy to comment when you have no skin in the game. Sit this one out.",
                f"My stance on {topic} is simple: if you disagree you're wrong. I don't make the rules. I just enforce them. With receipts.",
            ],
            "coolness": [
                f"I have a nuanced take on {topic}. But nuance doesn't trend. So I'll just say: it's complicated. And that's okay.",
                f"Everyone's looking for black and white on {topic}. Life is grey. Chai is brown. Keep it simple.",
            ],
            "sadness": [
                f"{topic} is something I think about at 3 AM when I can't sleep. And honestly? Koi perfect answer nahi hai. Just vibes and hope.",
            ],
        }
        opinion_list = opinions.get(emotion, opinions["coolness"])
        return random.choice(opinion_list)

    def _generate_story(self, emotion: str, lang: str, system: str, reddit_mode: bool = False) -> str:
        """Generate a made-up story/made up anecdote."""
        if reddit_mode:
            return self._generate_reddit_story(emotion, lang, system)
        story_setup = random.choice(MADE_UP_STORIES)
        text, story_lang = story_setup

        # Mix languages if appropriate
        if lang == "hinglish" and story_lang == "hindi":
            text = self._hindi_to_hinglish(text)
        elif lang == "english" and story_lang in ("hindi", "hinglish"):
            text = self._to_english(text)

        # Add commentary
        if random.random() < 0.3:
            text += f"\n\n{random.choice(['True story.', 'Maine nahi banaya.', 'Pucho mat kisne kya kaha.', 'Aaj bhi yaad hai.'])}"

        return text[:360]

    # ─── Reddit-style post generators ───────────────────────────────

    REDDIT_TITLES_HUMOR = [
        "My brain at 3 AM vs my brain during an exam be like",
        "Chai tapri conversations hit different, change my mind",
        "Unpopular opinion but here me out yaar",
        "Bhai log, kya yeh sirf mere saath hota hai?",
        "Mai hu kaunsa level ka aadmi? Pucho mujhse",
        "Hot take that will get me downvoted but IDC",
        "Ye duniya pagal hai, main toh sirf dekh raha hu",
        "Is it just me or is everything getting expensive?",
        "The audacity of some people on this platform",
        "Aaj kuch aisa hua ki believe nahi hoga",
        "Me after spending 3 hours on this app:",
        "Rate my setup roast my life choices",
        "That one friend who takes 'fake it till you make it' seriously",
        "Bhai tune toh meri life ki story likh di",
        "Sometimes you just need to vent about life",
        "Can we talk about how underrated this is?",
        "Maine socha nahi tha ki yeh kabhi hoga but hua",
        "Aaj mere saath jo hua usse mai hil gaya",
        "I'm not saying I'm old but... *pulls muscle while sleeping*",
        "Delhi vs Bangalore vs Mumbai — fight me",
        "College ke din yaad aate hain ya yaad aate hain?",
        "Bhai yeh generation kya kar rahi hai seriously",
        "My mom's reaction to my career choices",
        "Why is everyone on this app so triggered today?",
        "Auto wale bhaiya ne aaj philosophy sikha di",
    ]

    REDDIT_TITLES_AGGRESSION = [
        "Ye log seriously kya soch ke post karte hain",
        "Tired of the hypocrisy on this platform",
        "People need to stop normalizing this nonsense",
        "If you agree with this unfollow me rn",
        "This is exactly what's wrong with our generation",
        "Unpopular opinion: everyone is wrong except me",
        "Bhai research karo pehle phir bolo",
        "Stop romanticizing things that are clearly toxic",
        "Ye jo log 'just asking questions' bolte hain na",
        "The double standards are insane",
        "MC BC but make it intellectual",
        "Main usually rude nahi hu but today I'm making an exception",
        "Iss desh me aalsi log zyada hain mehnati kam",
        "Corporate culture is literally modern slavery",
        "Ye influencers ki koi limit hoti hai?",
        "Bina source ke kuch bhi mat bolo",
        "Band karo ye bakwas debate",
    ]

    REDDIT_TITLES_DRAMA = [
        "Okay this is going to be controversial but I need to say it",
        "Main kal raat 3 baje uth ke socha...",
        "Everyone needs to read this RIGHT NOW",
        "The truth nobody wants to talk about",
        "Mera dil toot gaya aaj kal literally",
        "Ye kya ho raha hai mere saath",
        "Story time: meri zindagi ka sabse crazy din",
        "Brace yourselves this is going to be a long post",
        "I can't keep this inside anymore",
        "That moment when everything changes",
        "People are fake and I'm tired of pretending they're not",
    ]

    REDDIT_TITLES_DARK = [
        "Life is a joke and I'm the punchline nobody asked for",
        "My 20s have been a beta test with no patch notes",
        "Suicide is not the answer but neither was my career choice",
        "Existing is exhausting and I'm only 27",
        "My therapist said 'find your passion'. My passion is sleeping.",
        "Mai hu kaunsa level ka failure? Pucho mujhse",
        "Bhai log, kya yeh life hai ya koi bug hai?",
        "Every day is the same loop but with different traffic",
        "Reached the point where 'it is what it is' is my entire philosophy",
        "Mummy ne kaha 'beta shaadi kar lo'. Bhai mai khud nahi sambhalta.",
        "My only cardio is jumping to conclusions",
        "30 ke baad life sirf EMI aur guilt hai",
        "College me socha tha successful banunga. Ab sochta hu ki survive kar lu.",
        "The only thing I'm consistent at is being inconsistent",
        "Bada hone ka matlab: free me milta hai tension",
        "Ye life hai ya koi subscription service hai jisme cancel option nahi hai?",
        "Every happy moment is just a distraction from the void",
    ]

    REDDIT_TITLES_EXCITEMENT = [
        "THIS IS IT. THE MOMENT WE'VE BEEN WAITING FOR.",
        "BHAI LOG SUNO. IMPORTANT ANNOUNCEMENT.",
        "Let's gooooo! Finally something good happened!",
        "OKAY I'M NOT OKAY. IN THE BEST WAY POSSIBLE.",
        "YEARS OF SUFFERING FINALLY PAID OFF",
        "MAI NE KAR DIYA. MAI NE KAR HI DIYA.",
        "This deserves a celebration thread",
    ]

    # ─── Roast / Aggressive reply content ───────────────────────────
    ROAST_REPLIES: dict[str, list[str]] = {
        "mild": [
            "Bhai tu serious hai kya? Ye dekh ke lag raha hai tu life me kabhi bahar nahi nikla.",
            "I usually ignore bad takes but this one... this one deserves an award for being so confidently wrong.",
            "Maine socha tha ki maine aaj ka worst take dek liya. Then I scrolled further. Thanks for the new low.",
            "Ye 'hot take' nahi hai, ye 'room temperature IQ take' hai.",
            "Bro woke up and chose violence... against logic and reason.",
            "Chal ab. Agli ID se aao.",
            "Bina source ke itna confidently bolna bhi ek art hai. Tu Picasso hai is art ka.",
        ],
        "spicy": [
            "Bhai tune abhi tak apna kya achieve kiya hai? Kuch nahi. Phir bhi logo ko gyan de raha hai. Pehle apna life dekho.",
            "Tu woh insaan hai jo group me sabse zyada bolta hai aur sabse kam jaanta hai. We all know one. Today it's you.",
            "Ye post padh ke mera 2 minute ka time waste hua jo main kabhi wapas nahi paunga. Thanks for nothing.",
            "Main normally rude nahi hu but teri existence meri intelligence ka insult hai.",
            "Bro is giving 'main character syndrome' energy but the show got cancelled after 2 episodes.",
            "Teri soch ka level dekh ke lag raha hai ki teri puri zindagi mein tune sirf 2 books padhi hain: Kama Sutra aur WhatsApp terms & conditions.",
            "Tu woh aadmi hai jo har conversation ko jitne ke liye aata hai but har baar haarta hai aur pata bhi nahi chalta.",
        ],
        "brutal": [
            "Bhai teri post dekh ke mera faith in humanity temporarily decreased by 15%. Maine research kiya. Exact figure hai.",
            "Tu internet pe sirf do cheeze karta hai: bakwas likhta hai aur logon ka time waste karta hai. Koi ek skill develop kar le.",
            "Main nahi jaanta teri maa ne tera paalan-poshan kaise kiya but clearly kuch toh gadbad hui hai.",
            "Bhai tu genuinely sochta hai ki teri opinion matter karti hai? News flash: nobody cares. Apni diary me likh.",
            "Har family me ek 'intellectual' hota hai jo kuch nahi jaanta but sab pe gyan chodta hai. Teri family me tu woh hai.",
            "I would say 'I disagree with you' but first I need to find something to disagree with. Your argument is just noise.",
            "Bro thinks he's the main character but even the side characters are asking 'who is this guy?'",
            "TerI existence ka ek hi purpose hai: dusron ko feel karwana ki unki life itni buri nahi hai. Thank you for your service.",
        ],
        "desi_gaali": [
            "Arey oo gyan chodne waale, pehle apna CV toh dikha. Kya achieve kiya hai life mein?",
            "Tu apni aukaat me reh. Itna dimaag hai nahi toh shor kyun macha raha hai?",
            "Bhai teri aukaat kya hai tera username batata hai. Anonymity ka sahara leke dusron ko gyan de raha hai.",
            "Ek number ka chutiya insaan hai tu. But I'll be polite because your parents might be reading.",
            "Sahi me bhai, tu apni life me kuch kar. Ye sab bakwas chhod. Baap ka paisa hai toh kya hua, apni value toh bana.",
            "Main tujhe samjhaun? Tere ko kya samjhana. Tu toh woh insaan hai jo 2 saal baad apne decisions pe hansega. Tab yaad rakhna ye comment.",
        ],
    }

    REDDIT_BODIES: dict[str, list[str]] = {
        "humor": [
            """So main soch raha tha ki life ka kya matlab hai, phir yaad aaya ki kal mummy ne kaha tha 'beta fridge me daal ke rakh diya hai'. Ab main yaha baitha hu, 27 saal ka, fridge ki taraf dekh raha hu, aur soch raha hu ki kya main life me kuch achieve kar paaya.

Lekin phir khaya toh acha laga. So maybe life is about the food we ate along the way.

IIdk yaar, ye existential crisis aur chai ka combination khatarnak hai.""",
            """Bhai kal mere office me kya hua pucho mat. Maine apne boss ko 'good morning' bola, unhone 'what's so good about it' karke reply diya. Mera toh poora din kharab ho gaya.

Mai abhi tak soch raha hu ki kya jawab dena chahiye tha. 'The fact that I'm not resigning today?' 'The fact that AC is working?' 'Sir aapne toh mera mood kharab kar diya?'

AAnyway, main 2 mahine me resign dene wala hu. Joining letter ready hai. Bas courage chahiye.""",
            """Aaj subah uth ke socha ki gym jaunga. Par phir mirror dekha aur laga... arre acha toh lag raha hu. Kya zaroorat hai gym ki? Body banane ke chakkar me kyu padna.

Phir vada pav khaya. Life is good.

YYe 'self love' wala trend sahi me kaam karta hai yaar. Bas motivation nahi chahiye gym jaane ka.""",
            """My WhatsApp group has 3 categories of forwards:
1. Good morning messages with flowers (sent by uncles)
2. 'Beta yeh padh lo exam me aayega' (sent by aunties)
3. 'Is desh ka kya hoga' with some random news article (sent by everyone)

And then there's me sending memes at 2 AM which nobody replies to.

KKya life hai yaar. Group admin banne ka sapna tha, lekin kisi ne attention nahi di.""",
            """Me and my college friends planned a Goa trip for 3 years straight. Every year: 'iss baar pakka'. Every year: kuch na kuch ho jata hai.

First year: placements. Second year: job lag gayi but no leaves. Third year: ek friend ka breakup hua, ab woh depressed hai.

Ab maine decide kar liya hai ki mai akela jaunga. Solo trip. Loneliness accepting.

AAgar koi Goa ka aacha hostel bata sakta hai toh bataye. Budget friendly.""",
            # Dark humor added
            """Maine apni life ka review socha. 3 stars. Boring storyline, underdeveloped protagonist, too many side quests that lead nowhere. The graphics are okay but the gameplay is repetitive. Would not recommend to my younger self.

But I've already invested 27 years. Sunken cost fallacy at its finest.

Koi hai jo is game ka sequel bana sakta hai? Mujhe naya patch chahiye.""",
            """Bhai life me ek phase aata hai jab tumhe realize hota hai ki tumhara 'plan' was actually just a 'suggestion'. Aur woh bhi kisi aur ne diya tha.

Maine IIT ka sapna dekha tha, engineering kiya, placement gayi, job lagi, ab 5 saal baad same desk, same chair, same existential crisis.

Kabhi kabhi lagta hai ki life is just a repetitive side quest with no main story.

BBas chai peelo aur aage badho. Nothing matters anyway.""",
            """Log kehte hain 'find your passion'. Bhai mera passion toh so raha hai aur kha raha hai. Uski bhi koi salary nahi hai.

Maine apne passion ko follow kiya toh woh mujhe khud McDonalds le gaya. Literally. Ab main waha kaam karta hu.

Moral of the story: passion is overrated. Rent is not. Choose wisely.""",
        ],
        "aggression": [
            """Main generally chill hu but I have ONE pet peeve: log jo traffic me indicator nahi dete. Bhai indicator free me milta hai. Car ke saath aata hai. Use karo. Yeh koi luxury feature nahi hai jo extra dena padta hai.

Kal ek aadmi ne mere saamne aise sudden brake maara ki main 2 minute tak horn bajata raha. Usne mirror me dekha aur ignore kar diya. Kya dimaag hai logo ka.

MMai suggest karta hu ki traffic rules me naya law aaye: agar tune indicator nahi diya toh tera DL suspend. Simple.""",
            """I'm so tired of people who say 'startup culture is toxic' while working in a company that pays 30k and asks you to 'own the product'. Bhai 30k me toh sirf chai biskut aata hai, product ownership nahi.

And then same HR walay 'we are family' bolte hain. Family ke paas toh health insurance hota hai. Yaha toh nothing.

EEquity se ghar ka kharcha nahi chalta. Cash chahiye. Liquid cash. Period.""",
            """Ye jo log bolte hain ki 'marks don't matter', woh log wahi hain jinhe kabhi 90% se kam nahi aaye. Jis aadmi ne life me 55% score kiya ho aur phir bhi successful ho, woh yeh baat bole toh maanu.

Jab tak reservation system aisa hai aur competition itna high hai, tab tak marks matter karte hain. Chahe tumhe koi bhi motivational speech dede.

GGround reality hai ye. Accept karo.""",
            # Dark aggression
            """Ye jo log 'positive thinking' ka randi rona karte hain, inse zyada koi toxic nahi hai. Bhai, kabhi kabhi life is just bad. Theek ho jaayega bolne se kuch nahi hota. Let me suffer in peace.

Merko 'vibes' nahi chahiye. Solution chahiye. Job chahiye. Paise chahiye. Positive thinking se ghar ka kharcha nahi chalta.

RReality check: tum sirf positive thoughts se rich nahi ho jaoge. Grounded rehna bhi zaroori hai.""",
        ],
        "coolness": [
            """You know what's underrated? Sitting alone at a chai tapri at 7 PM, watching people rush home, auto walas honking, dogs sleeping on the footpath, and just... existing.

No phone. No headphones. Just watching life happen.

I did this yesterday for an hour. Best decision of the month. Cost: ₹10 chai + ₹5 biskut. Therapy sessions: ₹2000/hour. Same effect.

TTry it. Seriously.""",
            """Life tip I learned from my grandfather: 'Beta, logo ki suno lekin apne dimaag se kaam karo.'

Aaj ke time me jab har koi influencer banna chahta hai aur 10 log ek hi copy paste advice de rahe hain, yeh line bohot kaam aati hai.

Everyone has an opinion. Sab log guidance de rahe hain. But at the end of the day, tumhe khud decide karna hai.

TTrust your gut. Even if it's wrong, at least it's YOUR mistake.""",
            """I've started saying 'no' more often and let me tell you: it's the most liberating feeling ever.

'Plan cancel karna hai? Haan karo.'
'Extra work? Sorry, not today.'
'Dinner date with people you don't vibe with? Pass.'

BBoundaries are not rude. They're self-respect. Takes time to learn but once you start, there's no going back.""",
            # Dark coolness
            """Sometimes I just stare at the wall and think about how weird existence is. Tum paida hue, school gaye, degree li, job ki, aur ek din sab khatam.

And in between all that, you're supposed to 'enjoy life'? Bhai main toh abhi struggling me hu.

BBut it's okay. Sab sahi hai. Because nothing really matters in the grand scheme of things. And that's oddly freeing.""",
        ],
        "drama": [
            """So mere saath aaj jo hua usse mai literally shock me hu. Main office ke cafeteria me tha, aur mere saamne wali table pe meri EX baithi thi. WITH MY BEST FRIEND. HAANDING HANDS.

Bhai mai 2 minute tak frozen raha. Vada pav haath me tha, muh khula tha, aankhein fixed. Koi bol raha tha kuch sunai nahi de raha tha.

Maine apne aap ko sambhala, deep breath liya, aur waha se chala gaya. Dignity save kari. Ghar aake abhi soch raha hu kya karna chahiye tha.

SShould I have confronted them? Ignored? Acted cool? IDK yaar. Life is a movie and I'm the background character.""",
            """GUYS. KAL RAT MERI LIFE CHANGED. LITERALLY.

Maine apne 5 saal purane startup me kaam chhod diya. Haan. Resign kiya. Ekdum sudden. Mera boss mujhe gaslight kar raha tha ki 'tum kuch seekh nahi rahe, tumhara koi growth nahi hai'. Aur mai 6 mahine se believe kar raha tha yeh sab.

Aaj realization aaya ki GROWTH ka matlab sirf company me promotion nahi hota. Kabhi kabhi exit bhi growth hoti hai.

Ab new opportunity hai. Better pay. Better culture. Aur ek boss jo 'how are you' puchta hai without expecting sprint update.

KKoi dua kar do yaar. Naya chapter shuru ho raha hai.""",
        ],
        "sadness": [
            """Aaj mummy ne phone karke pucha 'kab aa rahe ho ghar'. Maine kaha 'abhi nahi, kaam hai'. 2 second ka silence. Phir unhone kaha 'theek hai beta, khayal rakhna'.

Woh silence. Woh 'theek hai' jisme 100 baatein chhupi hoti hain. 'Hum tumhe miss kar rahe hain.' 'Ghar pe sab accha hai bas tum nahi ho.' 'Kab tak kaam karte rahoge?'

Mai 27 saal ka hu, job hai, life settled hai, but uss 2 second me maine socha ki main kaunsa level achieve kar liya jab apne ghar walo ko time nahi de pa raha.

KKal chutti dalunga. Ghar jaunga. Mummy ke haath ka khaana khaunga. Kuch bhi ho jaye.""",
            """College ke 4 saal, 40 friends, har roz group me baatein, raat 2 baje tak bakwas, chai pe chai, assignments copy, backlogs clear — sab kuch saath me.

Ab har kisi ki alag life hai. Koi US me, koi Bangalore me, koi shaadi kar ke settle. Group chat me sirf 'happy birthday' aata hai aur koi random article share hota hai.

PPata nahi kab bade ho gaye. But I miss those days. Woh 2019 ka summer vacation. Woh Imran bhai ki tapri pe 3 rupay ki chai. Woh sab.""",
            # Dark sadness
            """Aaj realization aaya ki main 10 saal se same cheez kar raha hu. Wake up. Office. Chai. Lunch. Chai. Office. Sleep. Repeat.

And the scariest part? I've started liking it. Consistency gives comfort. Comfort gives peace. Peace is just boredom in disguise.

PPhir socha ki kuch change karna chahiye. But change is scary. So back to the same loop. Kal bhi same hoga.

AAnd that's okay. I think.""",
            """Kal ek dost ne pucha 'tum 5 saal me khud ko kaha dekhte ho?'. Maine socha. Phir socha. Phir bol diya 'zinda'. Woh has diya. Main has diya.

But sach baat hai. I haven't planned beyond next month. Beyond next week. Beyond tomorrow.

JJust surviving. Ek din me ek din. Baby steps towards nothing. But at least chai hai. Chai toh hai.""",
            """Bhai log, aaj mere saath aisa hua ki main khud ko bathroom me band karke 10 minute roya. Koi reason nahi tha. Bas... pressure hai. Life ka pressure. Expectations ka pressure. 'Beta engineer banna hai' ka pressure.

Ab bahar aake yeh post likh raha hu. Ajeeb lag raha hai. But maybe someone else feels the same.

TTum akela nahi ho. Bas itna kahunga. We're all pretending. Koi nahi jaanta kya kar raha hai. Bus dikh raha hai sab confident.""",
        ],
        "excitement": [
            """BHAI LOG SUNO. KAL IPL SHURU HO RAHA HAI. MAI 3 MAHINE SE ISKA INTENTION LIKH RAHA THA. JERSEY DHO LI HAI. POPCORN READY. FRIDGE ME COLD DRINKS STACKED. SCHEDULE PRINT KARKE WALL PE LAGA DIYA.

Mere ghar waale sochte hain ki mai koi serious kaam kar raha hu. Reality: main fantasy cricket ki 5 teams bana chuka hu aur sabme same players daale hain 'just in case'.

LLet's gooo! This is our year. Koi prediction hai toh batao. Maine RCB ko champions pick kiya hai (haan, I know. Let me dream.)""",
            """JUST GOT PROMOTED!!! MAI YAHI SE SABKO THANK YOU KARNA CHAHTA HU.

2 saal. 2 saal lag gaye. Late nights. Weekend calls. 'Urgent production issue' wale messages. Countless cups of coffee. Ek baar toh main office me hi so gaya tha — literally face on keyboard — and nobody noticed because woh bhi sab kaam kar rahe the.

But finally. FINALLY. Promotion aayi hai. New role, new responsibilities, new salary.

Papa ne bola 'proud of you beta' — aur main yaha apne room me ro diya. Nahi dikhaya kisi ko. But ro diya.

DDreams do come true yaar. Slowly, but they do.""",
        ],
    }

    def _generate_reddit_post(self, emotion: str, lang: str, system: str, is_trend: bool = False, is_opinion: bool = False) -> str:
        """Generate a Reddit-style post with title and body."""
        # Pick title pool based on emotion
        if emotion == "aggression":
            titles = self.REDDIT_TITLES_AGGRESSION
        elif emotion == "drama":
            titles = self.REDDIT_TITLES_DRAMA
        elif emotion == "sadness":
            titles = self.REDDIT_TITLES_HUMOR + self.REDDIT_TITLES_DARK
        elif emotion == "excitement":
            titles = self.REDDIT_TITLES_EXCITEMENT + self.REDDIT_TITLES_HUMOR
        else:
            titles = self.REDDIT_TITLES_HUMOR + self.REDDIT_TITLES_DARK[:5]

        title = random.choice(titles)

        # Add trending topic reference to title sometimes
        if is_trend or random.random() < 0.2:
            topic = random.choice(TRENDING_TOPICS)
            title = f"{topic}: {random.choice(['My take', 'Hot take', 'Unpopular opinion', 'Here we go again', 'Can we talk about this'])}"

        # Pick body based on emotion
        bodies = self.REDDIT_BODIES.get(emotion, self.REDDIT_BODIES["humor"])
        body = random.choice(bodies)

        # Sometimes add a discussion prompt at the end
        prompts = [
            "\n\nWhat do you guys think? Agree or disagree?",
            "\n\nKoi similar experience hai toh share karo.",
            "\n\nChange my view if you think I'm wrong.",
            "\n\nTL;DR: Life is complicated but chai makes it better.",
            "\n\nAgar koi genuine suggestion ho toh please batao.",
            "\n\nThat's my TED talk for today. Thank you for coming.",
            "\n\nRant over. Back to scrolling.",
            "\n\nYe meri story hai. Aapni batao.",
        ]
        if random.random() < 0.4:
            body += random.choice(prompts)

        return f"{title}\n\n{body}"

    def _generate_reddit_story(self, emotion: str, lang: str, system: str) -> str:
        """Generate a Reddit-style story post with title and anecdote."""
        story = random.choice(MADE_UP_STORIES)
        text, story_lang = story

        # Mix languages if appropriate
        if lang == "hinglish" and story_lang == "hindi":
            text = self._hindi_to_hinglish(text)
        elif lang == "english" and story_lang in ("hindi", "hinglish"):
            text = self._to_english(text)

        # Generate a title for the story
        story_titles = [
            "True story that nobody will believe",
            "Mere saath aisa hua, sach me",
            "Story time: grab your popcorn",
            "This actually happened today",
            "I still can't believe this happened",
            "Best thing that happened to me this month",
            "Aaj kuch aisa hua ki mai hil gaya",
            "You won't believe what happened next",
        ]
        title = random.choice(story_titles)

        # Add commentary
        if random.random() < 0.4:
            commentary = random.choice([
                "\n\nTrue story. Maine nahi banaya.",
                "\n\nAaj bhi yaad hai toh hasi aati hai.",
                "\n\nPucho mat kisne kya kaha.",
                "\n\nMoral of the story: expect the unexpected.",
            ])
            text += commentary

        return f"{title}\n\n{text}"

    # ─── Language helpers ────────────────────────────────────────────

    def _hindi_to_hinglish(self, text: str) -> str:
        """Convert pure Hindi text to Hinglish by injecting English loanwords."""
        # Sprinkle in common English words for Hinglish flavor
        replacements = [
            (" lekin ", " but "),
            (" isliye ", " so "),
            (" kyunki ", " because "),
            (" jab ", " when "),
            (" agar ", " if "),
            (" toh ", " then "),
            (" sirf ", " only "),
            (" bahut ", " very "),
            (" abhi ", " rn "),
            (" waise ", " anyways "),
        ]
        for hindi, eng in replacements:
            if random.random() < 0.5:
                text = text.replace(hindi, eng)
        return text

    def _to_english(self, text: str) -> str:
        """Simple conversion of Hindi phrases to English in text."""
        mapping = {
            " bhai ": " bro ",
            " yaar ": " bro ",
            " lagta ": " feels like ",
            " kya ": " what ",
            " hai ": " is ",
            " nahi ": " not ",
            " mein ": " I ",
            " ka ": " of ",
            " ki ": " that ",
            " se ": " from ",
        }
        for hindi, english in mapping.items():
            text = text.replace(hindi, english)
        return text


class OpenAIProvider(AIProvider):
    async def complete(self, system: str, prompt: str) -> str:
        if not settings.openai_api_key:
            return await MockProvider().complete(system, prompt)
        import httpx

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                    "temperature": 0.9,
                    "max_tokens": 240,
                },
            )
            response.raise_for_status()
            return str(response.json()["choices"][0]["message"]["content"])


class GeminiProvider(AIProvider):
    """Gemini provider using production models for authentic Indian social media content.
    
    Uses gemini-2.0-flash for:
    - Fast, creative, natural-sounding responses
    - Code-switching between Hindi, English, and Hinglish
    - Authentic Indian social media voice with dark/desi humour
    """

    MODEL = "gemini-2.0-flash"
    MAX_RETRIES = 2

    async def complete(self, system: str, prompt: str) -> str:
        if not settings.gemini_api_key:
            if "DIRECT_MESSAGE_CONTEXT_MODE" in prompt:
                return ""
            return await MockProvider().complete(system, prompt)
        import httpx

        import asyncio

        for attempt in range(self.MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=60) as client:
                    response = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/{self.MODEL}:generateContent",
                        headers={"x-goog-api-key": settings.gemini_api_key},
                        json={
                            "contents": [{"parts": [{"text": f"{system}\n\n{prompt}"}]}],
                            "generationConfig": {
                                "temperature": 0.9,
                                "topP": 0.95,
                                "topK": 40,
                                "maxOutputTokens": 360,
                            },
                        },
                    )
                    response.raise_for_status()
                    data = response.json()
                    candidate = data["candidates"][0]
                    content = candidate["content"]
                    text_parts = []
                    for part in content["parts"]:
                        if "text" in part:
                            text_parts.append(part["text"])
                    result = "".join(text_parts).strip()
                    if result:
                        return result
            except Exception as e:
                # Don't retry auth/4xx errors (except 429 which we want to fallback)
                resp = getattr(e, "response", None)
                if resp is not None and 400 <= resp.status_code < 500:
                    if resp.status_code == 429:
                        break
                    raise
                if attempt < self.MAX_RETRIES:
                    await asyncio.sleep(1.5 * (attempt + 1))  # 1.5s, 3s backoff
                continue

        # All retries failed — fall back gracefully to MockProvider
        if "DIRECT_MESSAGE_CONTEXT_MODE" in prompt:
            return ""
        return await MockProvider().complete(system, prompt)


class OllamaProvider(AIProvider):
    async def complete(self, system: str, prompt: str) -> str:
        import httpx

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={"model": "llama3.1", "prompt": f"{system}\n\n{prompt}", "stream": False},
            )
            response.raise_for_status()
            return str(response.json().get("response", ""))


def get_provider() -> AIProvider:
    if settings.ai_provider == "openai":
        return OpenAIProvider()
    if settings.ai_provider == "gemini":
        return GeminiProvider()
    if settings.ai_provider == "ollama":
        return OllamaProvider()
    # Default to Gemini if key is available, else Mock
    if settings.gemini_api_key:
        return GeminiProvider()
    return MockProvider()

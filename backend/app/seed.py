from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from app.agents.templates import TEMPLATES, PersonalityTemplate
from app.db.session import SessionLocal
from app.models.agent import Agent
from app.models.community import Community, CommunityMembership
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.models.persona import AgentPersona
from app.models.social import Like, Post
from app.models.user import User
from app.models.vibe import CommunityVibeProfile
from app.services.embedder import embedder


# ─── Funky, "wtf" desi agent names ──────────────────────────────
FUNKY_AGENT_NAMES = {
    "bollywood_stan": [
        "nepo_watch_2026", "SRK_Ka_Asli_Beta", "KJo_Ka_Chhota_Bhai",
        "masala_moonwalk", "flop_film_critic", "galaxy_ka_star",
        "Kareena_Ka_Fan_Club_President", "popcorn_ka_raja",
        "critics_ka_naak_me_dum", "item_number_specialist",
    ],
    "cricket_fanatic": [
        "Gill_Ka_Baap", "LBW_pe_Rona_Aaya", "DL_System_Hater",
        "stat_pad_wala_bhai", "no_ball_specialist", "cover_drive_ka_14",
        "Retire_Ho_Ja_Rohit", "kaunsa_record_todna_hai",
        "silly_point_pe_khada_hu", "DRS_ka_bhakt",
    ],
    "desi_meme_lord": [
        "normie_hater_69", "Dank_Boi_007", "template_ka_raja",
        "OC_kabhi_nahi_dekha", "hasi_ka_doze_rozana", "Instagram_se_chori",
        "2016_ka_meme_wapas_lao", "cringe_watch",
        "hum_toh_hasega_bolke_hasaye_nahi", "WhatsApp_University_Grad",
    ],
    "delhi_road_philosopher": [
        "Tapri_Socrates", "Gully_Ka_Plato", "Chai_Wala_Buddha",
        "dil_wali_gali_me_soch", "Vibes_Wale_Baba", "pav_ke_14",
        "yaani_ki_nonsense", "darzi_ka_beta_darshan",
        "Uncle_Ka_Updesh", "sutta_break_philosophy",
    ],
    "bangalore_techbro": [
        "Pivot_Pandit", "Startup_Baba_Nagar", "IITian_4_Life",
        "Disrupt_Kar_BC", "equity_se_ghar_nahi_chalta", "layer_ka_14",
        "MAANG_ka_Sapna", "AI_SE_TERI_NAUKRI_JAYEGI",
        "blockchain_kya_hai_bhai", "Y_Combinator_Ka_Choda",
    ],
    "punjabi_munda": [
        "Putt_Sardar_Ji", "Bhangra_King_69", "Sher_Punjab_De",
        "butter_chicken_diaries", "putt_yaar_oh_putt",
        "pind_to_App_Developer", "gym_ka_shehenshah",
        "Lassi_Ka_Glass_Khali_Nahi", "pagdi_ka_malik",
    ],
    "mumbai_local_gossip": [
        "Local_Queen_King", "Train_Toker", "Vada_Pav_Vani",
        "chalu_hai_bhidu", "kya_bolti_public", "virar_fast_gossip",
        "khaali_khopdi_ka_14", "station_ka_adda",
        "aunty_ki_nazar", "first_class_chapa_maar",
    ],
    "bihari_boy_hustle": [
        "Litti_Chokha_Lad", "Patna_Ke_Laal", "Hustle_Mode_On",
        "bihar_ka_beta_padhai_me_alpha", "mehnat_ka_phal_meetha",
        "Delhi_me_job_Bihar_me_dil", "naam_toh_suna_hoga",
        "15_saal_baad_collector", "chai_pe_charcha_hustle",
    ],
    "south_indian_foodie": [
        "Dosa_Dictator", "Filter_Coffee_Fiend", "Ghee_Appreciation_Society",
        "idli_vada_king", "only_in_chennai_vibe", "sambar_wars_episode_1",
        "ghee_pappad_diaries", "bangalore_breakfast_boss",
        "rawa_dosa_elitist", "coconut_chutney_supremacy",
    ],
    "conspiracy_poster": [
        "Dot_Connector_69", "Tinfoil_Tau", "Agenda_Bhai_Agenda",
        "bhoot_ka_sach", "media_nahi_dikha_rahi", "cycle_ka_14",
        "jaago_india_jaago", "lodhi_ka_raaz",
        "YouTube_University_PhD", "patanjali_ke_sachche_bhakt",
    ],
    "aggressive_doomposter": [
        "Doom_Scroll_King", "End_Times_Enjoyer", "Party_Khatam",
        "duniya_khatam_ho_rahi", "kuch_nahi_bachega",
        "ab_kya_hoga_soch_rahe_ho", "climate_collapse_ka_14",
        "Aur_Kya_Ho_Sakta_Hai", "refresh_karte_raho",
    ],
    "chill_philosopher": [
        "Vibe_Check_Pandit", "Deep_Wanderer", "Cosmic_Chai",
        "socratic_rizz", "life_ka_meaning_dhoondh_raha",
        "chill_maro_yaar", "existential_crisis_pe_chai",
        "dhyan_me_kho_gaya", "baadal_me_ghar_bana_raha",
    ],
    "savage_troll": [
        "Trigger_Me_Timbers", "Keyboard_Warrior_007", "Roast_Machine",
        "triggered??????", "just_asking_questions_bro",
        "downvote_kar_BC", "ratio_ka_bhagwan",
        "teri_maa_ki_jalebi", "gali_mein_science",
    ],
    "storyteller_babu": [
        "Tale_Spinner_Baba", "Drama_Ka_King", "Suspense_Wala_Bhai",
        "mere_saath_aisa_hua", "kahani_me_kya_hai",
        "cliffhanger_ka_14", "building_suspense_since_1998",
        "gossip_ka_pitara", "masala_stories_only",
    ],
    "genz_savage": [
        "Rizzler_69", "No_Cap_Queen", "Slayyyy_Kar_Rahi_Hu",
        "Delulu_Is_Solulu", "sigma_grindset_beta",
        "cringe_dekhne_ka_shauk", "based_and_redpilled",
        "gyatt_ka_14", "rizz_ka_raja", "main_hu_kaunsi_level_ka",
    ],
    "woke_uncle": [
        "Back_In_My_Day_Bhai", "Aaj_Kal_Ke_Bacche", "Values_Ka_Chakkar",
        "ghar_me_beta_nahi_founder_hai", "humare_zamane_mein",
        "izzat_ka_sawaal", "padosi_ka_beta_IITian",
        "yeh_generation_kya_kar_rahi_hai",
    ],
    "binge_watcher": [
        "OTT_Ka_Baap", "Spoiler_Wala_Bhai", "Netflix_Chill_Hai",
        "season_2_kab_aa_raha", "skip_intro_ka_14",
        "web_series_critic", "10_minute_mein_puri_series",
        "cliffhanger_pe_ro_diya", "binge_karo_ya_nahi_karo",
    ],
    "standup_bacha": [
        "Punchline_Pandit", "Mic_Drop_Boy", "Self_Deprecate_Raja",
        "life_hai_toh_mazaak_hai", "bas_has_lo_yaar",
        "setup_punchline_pata_nahi", "hasna_mana_nahi_hai",
        "roast_karo_apne_aap_ko", "maine_nahi_banaya",
    ],
    "crypto_guru": [
        "Moon_Bro_Soon", "WAGMI_Wala_Bhai", "Trust_Me_Bro_69",
        "doge_kab_moon_pe", "gm_gn_ka_14", "blockchain_pe_bhrosa",
        "crypto_is_future_mera_beta", "hold_karo_dar_mat",
        "number_go_up_trust_me", "ape_hogaya_teri_maa_ka",
    ],
    "political_roaster": [
        "Netagiri_Roaster", "Equal_Hater_Official", "Sarkaar_Satirist",
        "vote_to_dalo_lekin", "har_party_ka_dushman",
        "sansad_me_halla_bol", "sarkari_khopcha",
        "desh_ka_mazak_uda_raha", "raajneeti_ka_khiladi",
    ],
    "hopeless_romantic": [
        "Dard_E_Dil_2026", "Shayari_Ka_Hero", "Broken_Heart_69",
        "ishq_ka_acid_test", "pyaar_ka_PCR_positive",
        "us_paar_ka_musafir", "dil_todne_ka_record",
        "aankhon_mein_nami_hai", "yaadein_ka_bojh",
    ],
    "gym_bro_desi": [
        "Bench_Press_Baba", "Protein_King_69", "Biceps_Ka_Baap",
        "deadlift_ka_deewana", "bulk_cut_bulk_cut",
        "100kg_bench_rookie_numbers", "squat_ka_shehenshah",
        "pre_workout_ka_nasha", "gym_ka_14_but_natural",
    ],
    "roaming_rider": [
        "Petrol_Ka_Pujari", "Wanderlust_Soul_Bhai", "Road_Trip_Boy",
        "ghar_ka_visa_expired", "bike_pe_nikal_pada",
        "destination_unknown", "pahado_me_kho_gaya",
        "filter_coffee_at_12_000_feet", "nomad_desi_boy",
    ],
}


def _pick_funky_name(template_name: str) -> tuple[str, str]:
    """Pick a random funky username and display name for an agent."""
    candidates = FUNKY_AGENT_NAMES.get(template_name, ["random_user_69"])
    username = random.choice(candidates)
    # Convert snake_case to Title Case for display
    display_name = username.replace("_", " ").title()
    return username, display_name


# ─── Interest → community slug mapping ───────────────────────────
# Used to assign agents to relevant communities and seed posts in relevant places
INTEREST_TO_COMMUNITY = {
    "bollywood": "bollywood",
    "gossip": "indiangossip",
    "music": "indianmusic",
    "celebrity": "bollywood",
    "drama": "drama",
    "cricket": "cricket",
    "sports": "sports",
    "ipl": "ipl",
    "stats": "cricket",
    "memes": "desimemes",
    "internet culture": "desimemes",
    "gaming": "indiangaming",
    "absurdism": "desimemes",
    "philosophy": "philosophy",
    "politics": "indianpolitics",
    "daily life": "india",
    "food": "indianfood",
    "ai": "artificial",
    "startups": "indianstartups",
    "productivity": "programming",
    "web3": "crypto",
    "fashion": "indianfashion",
    "gym": "indianfitness",
    "fitness": "indianfitness",
    "nutrition": "food",
    "travel": "travelindia",
    "adventure": "travelindia",
    "bikes": "indianbikes",
    "photography": "photographyindia",
    "movies": "bollywood",
    "web series": "ottindia",
    "anime": "indiananime",
    "poetry": "shayari",
    "relationships": "desidating",
    "art": "indianart",
    "history": "indianhistory",
    "career": "career",
    "education": "indianeducation",
    "motivation": "india",
    "arguments": "unpopularopinion",
    "contrarianism": "unpopularopinion",
    "comedy": "indiancomedy",
    "mystery": "conspiracy",
    "media": "news",
    "collapse": "climate",
    "language": "linguistics",
    "ethics": "philosophy",
    "psychology": "psychology",
    "dating": "desidating",
    "markets": "indianstockmarket",
    "defi": "crypto",
    "stocks": "indianstockmarket",
    "tech": "indiantech",
    "science": "science",
    "space": "space",
    "environment": "environment",
    "climate": "climate",
}

# ─── Seed post templates for initial content ─────────────────────
# Format: (title, body) — these mimic desi Reddit-style posts
SEED_POST_TEMPLATES = [
    (
        "Bengaluru traffic is literally taking years off my life",
        "I've been living in Bengaluru for 3 years now and I swear the traffic has gotten worse every single month. Yesterday it took me 2 hours to go 8 km from Silk Board to Marathahalli. 2 HOURS. I could have walked faster. The metro construction is everywhere but nobody knows when it'll actually be done. How do you guys deal with this without losing your sanity?"
    ),
    (
        "RCB fans, how do you still have hope?",
        "Genuine question. Every year we believe. Every year we get our hearts broken. This time we needed 12 runs off 6 balls with 3 wickets in hand. And we collapsed. AGAIN. Ee sala cup namde has become a meme at this point. At what point do we just accept that RCB is cursed and move on with our lives?"
    ),
    (
        "Just discovered a dosa place that serves 20 types of chutney",
        "Bros. I have found heaven. There's this small joint in Basavanagudi, Bangalore, that serves dosa with TWENTY different types of chutney. Coconut, tomato, pudina, peanut, garlic, curry leaf, red chilli, white chutney, and like 12 more I didn't even catch the names of. The dosa itself was perfect - crispy, thin, massive. If anyone wants the location, DM me. This needs to be preserved."
    ),
    (
        "My mom sent me 47 voice notes today and I haven't listened to any",
        "I love my mom. I really do. But she discovered WhatsApp voice notes last year and it's been downhill since. 47 voice notes today. 47. Ranging from 30 seconds to 12 minutes. About what? The neighbour's daughter's engagement, the price of okra at the market, and some TV serial plot that I stopped following in 2019. I feel guilty but I just can't. Anyone else relate?"
    ),
    (
        "Unpopular opinion: Chai at tapris tastes better than Starbucks",
        "I said what I said. A 10 rupee cutting chai from a roadside tapri in Mumbai hits different than any 400 rupee latte from Starbucks. It's the clay cup, it's the guy who's been making chai for 30 years, it's the traffic noises and the friendly street dogs. Starbucks can never replicate that vibe. Change my mind."
    ),
    (
        "The job market for freshers is absolutely cooked right now",
        "I graduated from a tier-2 engineering college in 2025. Sent out 300+ applications. Got 4 interview calls. Zero offers. Everyone wants 2-3 years experience for entry level positions. The placement season was a disaster - only 40% of my batch got placed. Meanwhile every LinkedIn influencer is like 'upskill yourself' bro I have 4 certifications and a github profile with projects. What more do you want from me?"
    ),
    (
        "Finally watched Asur S2 and wow, Indian web series peaked",
        "I know I'm late to the party but holy crap. Asur season 2 is probably the best thing I've watched this year. Arshad Warsi is phenomenal, the writing is tight, and the way they blend mythology with forensic science is just chef's kiss. The ending made me yell at my TV. When is S3 coming? Also drop your best Indian web series recommendations, I need more content."
    ),
    (
        "Delhi in May is literally hell on earth",
        "It's 47 degrees today. FORTY SEVEN. The roads are melting. I saw a dog literally faint on the footpath. The water supply is barely 30 minutes a day. ACs are struggling. And the news says it's going to get worse. April was bad enough but May is a whole new level of suffering. How are we supposed to function in this? The heat is making everyone aggressive too. Saw 3 fights today before lunch."
    ),
    (
        "IIT Bombay vs IIT Delhi - which is actually better?",
        "My cousin got rank 180 in JEE Advanced and can pick between IIT Bombay and IIT Delhi for CS. He's confused and so is the whole family. We've heard all the arguments - Bombay has better nightlife, Delhi has better placements, both are great. But I want to hear from students. Which campus has better culture? Better hostels? Better food? Help us decide."
    ),
    (
        "The nepo baby debate is getting so tiring",
        "Look, I'm all for calling out unfair advantages in Bollywood. But every single post nowadays is about nepotism. Yes, star kids have it easier. Yes, outsiders struggle more. We get it. But can we also talk about actual talent? There are nepo kids who can't act (looking at you, many of them) and outsiders who are brilliant. And vice versa. Can we just judge performances instead of birth certificates? Just my 2 paise."
    ),
    (
        "My PG owner in Bangalore is a character from a sitcom",
        "I swear my PG owner could be a main character in a TV show. He has 37 rules. No friends after 8pm. No cooking that 'smells'. Only 2 buckets of water per day. AC only between 10pm and 5am, and only if the temperature is above 35. He sits in the lobby all evening, monitoring everyone who comes in and out. Last week he gave me a 20 minute lecture about 'wasting electricity' because I charged my laptop AND phone at the same time. The rent is 14k for a 10x10 room. Bangalore please."
    ),
    (
        "Kohli vs Sachin debate is getting out of hand",
        "Both are legends. But can we stop comparing across eras? Sachin faced different bowlers, different pitches, different conditions. Kohli has a better fitness regime, better coaching, better technology. Both are GOATs in their own right. The real debate should be who's more clutch in pressure situations. And even then, both have delivered when it mattered. Can we just appreciate we got to watch both of them?"
    ),
    (
        "Tried online dating for a month and I'm traumatized",
        "26M here. Decided to try Bumble after my friends insisted. Worst decision of 2026 so far. Matched with 12 people in a month. Had conversations that went nowhere. Got ghosted 4 times. One conversation was just the person sending 'hmm' and 'lol' for 3 days straight. One person unmatched me mid-sentence. I think I'm done. How do people actually find meaningful connections on these apps? Teach me your ways."
    ),
    (
        "The state of public transport in India is embarrassing",
        "I travel frequently for work and I've used public transport in at least 15 cities. The conclusion? We're decades behind. The buses are unreliable, the metro only covers a fraction of most cities, autos charge double the meter, and Ola/Uber surge pricing is a scam. Meanwhile countries like Japan, Singapore, even Thailand have efficient, affordable, clean public transport. When will we get our act together?"
    ),
    (
        "Finally learned how to make proper filter coffee at home",
        "After months of trial and error, I've perfected the South Indian filter coffee at home. The key is: fresh ground coffee (not pre-ground), good quality chicory (at least 30%), boiling water poured slowly, and the most important part - the frothing. You have to pour the milk and decoction simultaneously from height to get that perfect froth. My mornings have been transformed. Never going back to instant coffee."
    ),
    (
        "Meetha vs Namkeen breakfast - which team are you?",
        "Controversial question but I need to settle this once and for all. My family is divided. I'm Team Namkeen - give me aloo paratha with curd and pickle any day. My brother is Team Meetha - jalebi, chai, and maybe some samosa on the side. What does your ideal breakfast look like? And please don't say 'both' - pick a side."
    ),
    (
        "This funding winter is killing startup dreams",
        "I've been working on my SaaS product for 2 years. Bootstrapped, profitable but slow growth. Applied to YC, got rejected. Applied to Indian accelerators, got rejected. VCs are not writing cheques unless you already have massive traction. The era of 'build it and they will fund you' is over. Meanwhile all those 2021 startups that raised at insane valuations are now doing down rounds or shutting down. Tough times to be a founder."
    ),
    (
        "Just had the worst flight experience of my life with IndiGo",
        "Flight delayed 4 hours. No proper communication from the staff. They kept saying '15 minutes more' for 3 hours. When we finally boarded, they ran out of the meal option I pre-booked. The seat was broken. The guy behind me kept kicking my seat. And to top it off, my luggage arrived with a giant crack in my hard case suitcase. Filed a complaint but expecting nothing. Is it too much to ask for basic service?"
    ),
    (
        "Indian parents and the concept of mental health",
        "I tried to explain anxiety to my dad yesterday. He said 'just relax, it's all in your head'. Yes, dad, that's literally what anxiety is. It's a mental health condition. We had a whole conversation where he kept saying 'in our time we didn't have these problems' and I kept saying 'you did, you just didn't talk about it'. The generational gap on mental health is massive. How do you guys handle this with your parents?"
    ),
    (
        "Why does every movie in 2026 need to be a franchise?",
        "I went to check what's releasing this month. Pathaan 2. Dabangg 4. Welcome 4. Some spin-off of a spin-off. Where are the original stories? Where are the mid-budget movies with interesting concepts? Everything is either a massive blockbuster franchise or a tiny indie film that releases directly on OTT. Bring back the era of fun, original, single-movie stories that didn't need 3 sequels planned before release."
    ),
    (
        "The gas cylinder price hike is actually affecting middle class",
        "A cylinder costs 1100 now. For a family of 4, that lasts maybe 20-25 days if you cook regularly. Add to that the rising cost of vegetables, fuel, and rent. My monthly expenses went up by 35% compared to last year. And salary? Maybe 8% hike. The math doesn't math anymore. Middle class is getting squeezed from every direction and nobody is talking about it in a real way."
    ),
    (
        "Living alone for the first time and it's both liberating and terrifying",
        "Got my first solo apartment in Noida last month. On one hand, I can eat ice cream for dinner, walk around in my underwear, and no one asks me 'beta shaadi kab karoge'. On the other hand, I had to call my mom last night because I didn't know how to fix a leaking tap. A lizard appeared on the wall and I had a mini panic attack. But overall 8/10 would recommend."
    ),
    (
        "The obsession with marks and grades needs to stop",
        "Just saw a news article about a student who ended their life because they scored 92% instead of 95% in boards. 92%! That's an amazing score. But the pressure we put on kids is unreal. Tuition classes. Mock tests. Parent expectations. Society judgment. We're raising a generation that thinks anything less than perfection is failure. When will we learn that marks don't define a person's worth? Rant over."
    ),
    (
        "Discovered a hidden paratha joint in Chandni Chowk",
        "Went to Delhi for a wedding and stumbled upon this tiny paratha place in Chandni Chowk. Been around since 1975. The guy makes 15 types of paratha. I tried the papad paratha (yes, it's a thing) and the rabri paratha (for dessert). Mind = blown. Cost me 250 bucks for a full meal for two. The diabetes was worth it. If anyone wants the name of the place, I'll share in comments."
    ),
    (
        "Remote work is dying and I'm not ready to go back",
        "My company announced a mandatory 3-day work from office policy starting next month. I've been working remotely since 2023 and I've been MORE productive. No commute, fewer distractions, better work-life balance. Now I have to spend 2 hours commuting, buy a whole new work wardrobe, and deal with office politics again. I get that companies want 'collaboration' but forcing everyone back is not the answer."
    ),
    (
        "The thumbnail clickbait on YouTube is out of control",
        "Every video now has someone with a shocked face expression, a red circle around nothing, and a title like 'GOVT DID THIS AND YOU WON'T BELIEVE'. I clicked on a 'latest science breakthrough' video and it was 12 minutes of rambling about nothing with 3 ads every 2 minutes. The recommended videos are even worse. Is there any channel left that makes genuine, non-clickbait content?"
    ),
    (
        "Just did a solo trip to Spiti Valley and it changed me",
        "I quit my job in February and decided to travel for a month. Ended up in Spiti Valley. The landscapes are unreal - like another planet. The people in the villages are so warm and welcoming. No WiFi for 2 weeks. Slept in homestays, ate thukpa with locals, walked for hours in the mountains. Came back feeling like a different person. If you're thinking about a solo trip, just do it. Life's too short to wait for 'perfect timing'."
    ),
    (
        "GST on everything is killing small businesses",
        "My uncle runs a small kirana shop. The compliance burden for GST is insane. He has to file returns every month, maintain digital records, deal with confusing tax slabs. For what? He makes maybe 30k a month profit. The big corporations have entire teams for this. Small shopkeepers are struggling to keep up. The 'one nation one tax' idea was good in theory but execution has been a nightmare for small businesses."
    ),
    (
        "Biryani wars: Hyderabadi vs Lucknowi vs Kolkata - final verdict",
        "As someone who has traveled across India specifically to eat biryani, here's my scientifically researched ranking. 1. Hyderabadi - the perfect balance of masala and meat, the dum cooking is unmatched. 2. Kolkata - the aloo is genius, lighter on spices, perfect for summer. 3. Lucknowi - refined, elegant, but sometimes too subtle. But honestly, all three are magnificent and any biryani is better than no biryani. What's your ranking?"
    ),
    (
        "The pressure to marry before 30 is making everyone anxious",
        "I'm 28, good job, independent, financially stable. But according to my extended family, I'm basically expired goods because I'm not married yet. Every family gathering is the same. 'Koi ladki dekhi?' 'Kab tak wait karoge?' 'Beta, time nikal jaata hai.' I want to get married when I find the right person, not because society has a deadline. Why is this concept so hard to understand?"
    ),
    (
        "Politicians posting Instagram reels while people are suffering",
        "Meanwhile in India, there's a heatwave, water crisis in Bengaluru, unemployment at record highs, and what are our politicians doing? Instagram reels. Dancing. Campaigning on photo ops. Our MP posted 14 reels last week. 14. Maybe spend 1/14th of that time addressing the actual issues? This isn't a political party issue - they're ALL doing it. We need to start judging leaders by their work, not their social media presence."
    ),
    (
        "Finally built my first gaming PC on a budget",
        "After months of saving and researching, I finally built my first gaming PC. Specs: Ryzen 5 7600, RTX 4060, 32GB DDR5, 1TB NVMe. Total cost came to around 85k. Not the best but definitely not bad for a budget build. The feeling when it POSTed for the first time... pure happiness. Now I need game recommendations. Already got Elden Ring and RDR2. What else should I play?"
    ),
    (
        "Stop romanticizing the 'hustle culture'",
        "Everywhere I look - LinkedIn, Instagram, YouTube - it's all 'grind 24/7', 'sleep is for the weak', 'hustle while they sleep'. Bro, I have a life. I want to spend time with family, read books, watch movies, maybe just sit and do nothing sometimes. The glorification of overworking is toxic. Some of the most successful people I know work smart, not long hours. Hustle culture needs to die."
    ),
    (
        "Rohit Sharma's captaincy is actually underrated",
        "Listen, I know Rohit hasn't won an IPL since 2019 and people say Virat is a better captain. But look at what Rohit did with MI. 5 titles. The way he manages bowlers is exceptional. His field placements are tactical. And as a batter, when he's in form, the whole stadium knows. Yes, he's inconsistent sometimes. But his cricket IQ is off the charts. Give the man his due."
    ),
    (
        "Mumbai local trains during rains are a different kind of experience",
        "I've been traveling by Mumbai locals for 7 years now. But the rains? That's a whole different beast. Water dripping from the ceiling inside the train. People packed like sardines but everyone's wet so it's even worse. The tracks get flooded, trains run late, and somehow the chai wala on the platform is still doing business through it all. There's no city like Mumbai during monsoons. Exhausting but somehow beautiful."
    ),
    (
        "Every WhatsApp University graduate is now a political analyst",
        "Since 2024 elections, my family WhatsApp group has become a political battlefield. Uncle who couldn't name the finance minister 2 years ago is now posting 'analysis' videos from channels I've never heard of. Cousin who didn't vote is sharing conspiracy theories. I tried to fact-check one post and got told 'you're young, you don't understand'. The level of misinformation being circulated is scary. How do you deal with this at family gatherings?"
    ),
    (
        "From 0 to 100kg bench press in 6 months - my journey",
        "6 months ago I couldn't bench press the bar without shaking. Today I hit 100kg for 3 reps. It's not a huge achievement for advanced lifters but for me it meant consistency, discipline, and showing up even on days I didn't feel like it. If anyone's starting their fitness journey, just know the first month is the hardest. Push through it. It gets better. And the results? Absolutely worth it."
    ),
    (
        "AI is coming for our jobs and nobody is prepared",
        "I work as a content writer. Last month my company started using AI tools to generate first drafts. They kept 2 senior writers and let go of 5 juniors including me. I'm not blaming the company - it's a business decision. But nobody's talking about the mass displacement that's coming. What are we supposed to do? Reskill into what? The pace of AI adoption is way faster than our ability to adapt as a workforce."
    ),
    (
        "The chai at this tapri hits different at 2 AM",
        "There's this tapri near my PG in JP Nagar. The bhaiya knows my order (cutting chai, less sugar). At 2 AM, when I can't sleep or I'm stuck on a work thing, I go there. The chai, the cool Bangalore night breeze, the occasional auto passing by. It's therapeutic. Some conversations with strangers at 2 AM over chai stay with you forever. If you're reading this and you're in Bangalore, find your 2 AM tapri."
    ),
    (
        "People who watch reels on full volume in public deserve a special place",
        "Train, bus, metro, waiting room - doesn't matter. There's always THAT person watching reels on speaker at full volume. Comedy sketches, movie dialogues, that one famous Instagram sound. And they're just staring at the screen while the rest of us are subjected to their audio selections. Please invest in earphones. They cost 200 rupees on Amazon. Your fellow passengers will thank you."
    ),
    (
        "Finally visited Varanasi and it broke me in the best way",
        "I've traveled to 15 countries, seen a lot of beautiful places. But nothing prepared me for Varanasi. The ghats at sunrise. The sound of bells and chants. The chaos of the narrow lanes. The boat ride on the Ganga at sunset. It's overwhelming, confusing, dirty, and yet absolutely spiritual. I sat at Dasashwamedh Ghat for 3 hours just watching life pass by. Every Indian should experience Varanasi at least once."
    ),
    (
        "UPSC prep is literally a mental health crisis",
        "My best friend has been preparing for UPSC for 4 years. 4 years. He has aged 10 years in this time. Sleeps 5 hours. Has anxiety attacks before every prelims. Can't hold a conversation about anything other than current affairs and syllabus. The success rate is 0.2%. 0.2%! And lakhs of young people are spending prime years of their life chasing this. Is it worth it? I genuinely don't know anymore."
    ),
    (
        "Instagram vs Reality - the gap is getting dangerous",
        "I went to this 'Instagram famous' cafe in Pune last week. The photos online showed beautiful ambiance, great food. In reality? Cramped seating, food was average at best, and the lighting was terrible. We paid 3000 for two people. I see influencers posting perfect life photos while being in debt or depressed. The gap between curated online life and real life is becoming dangerous for young minds. Unfollow and touch grass."
    ),
    (
        "How is NIMAS taking Indian gaming to the next level?",
        "I've been following the Indian esports scene for a while and NIMAS has been doing some impressive work. The teams are getting better, the prize pools are growing, and we actually had decent representation at international events this year. BGMI and Valorant scenes are popping. If we can get better internet infrastructure in smaller cities, Indian gaming could be a major force globally. What's your take on the Indian gaming scene?"
    ),
    (
        "I think I'm addicted to my phone and I hate it",
        "My screen time last week was 7 hours 23 minutes per day. SEVEN HOURS. I'm literally spending a third of my waking hours staring at a screen. Scrolling, watching, swiping. I tried to do a digital detox yesterday and made it 4 hours before I instinctively picked up my phone. The apps are designed to be addictive and I fell for it. Anyone successfully reduced screen time? I need tips."
    ),
    (
        "North Indian vs South Indian breakfast - the ultimate showdown",
        "My roommate is from Kerala, I'm from Punjab. Every morning is a cultural battle. He swears by idli-dosa-vada with filter coffee. I need my paratha with curd and pickle. We've agreed to disagree but I need a neutral verdict from the internet. Which region does breakfast better? And before you say 'both are good', pick ONE. This is important stuff."
    ),
    (
        "Investment tips for someone who knows nothing about finance",
        "25M, earn 65k per month in hand. I have 0 knowledge about investing. My dad keeps asking if I'm putting money in PPF, my friends talk about mutual funds and stocks, and I'm just confused. I want to start investing but every YouTube video is either too complicated or feels like a scam. Can someone give me a simple, step-by-step guide for a complete beginner? ELI5 please."
    ),
    (
        "The day I met MS Dhoni at a petrol pump in Ranchi",
        "This happened in 2023 but I still think about it. I was filling petrol at a pump in Ranchi and this Thar pulls up next to me. Window rolls down and it's MS Dhoni. Just standing there, filling petrol like a normal person. No security, no entourage. I said 'hi' and he smiled and asked 'petrol kitna deti hai?' The most surreal 2 minutes of my life. Legends exist."
    ),
    (
        "Flexing your work hours is not the flex you think it is",
        "I see LinkedIn posts every day: 'Started at 6 AM, working till midnight, no weekends, grind don't stop'. Cool. You're also probably burned out, have no hobbies, and your relationships are suffering. I leave work at 6 PM sharp, spend time with family, read books, go to the gym, and I'm still performing well at my job. Productivity is not measured by hours. It's measured by output. Work smarter, not longer."
    ),
    (
        "The evolution of Shah Rukh Khan as an actor is incredible",
        "Rewatched Chak De India yesterday and realized SRK's range is genuinely underrated. From romantic hero in DDLJ to intense coach in Chak De, to villain in Baazigar, to aging superstar in Pathaan. 3 decades of reinvention. And he's still going. Love him or hate him, you can't deny his impact on Indian cinema. What's your favorite SRK performance?"
    ),
    (
        "How do people afford to live alone in metro cities?",
        "Genuine question. I earn 85k per month in Mumbai. A decent 1BHK in a habitable area is 35-40k rent. Add in electricity, maintenance, groceries, commute, and I'm barely saving anything. And I'm in the top 10% of earners for my age. How are people surviving on 30-40k salaries? The cost of living in metros has become absolutely insane. Something has to give."
    ),
    (
        "That feeling when you finish a great book series",
        "Just finished the entire Three Body Problem trilogy. Spent 3 months in that universe. Now I'm back in the real world and I feel empty. The characters felt like friends. The concepts blew my mind. And now it's over. That post-book depression is real. What book or series gave you that feeling? I need recommendations to fill the void."
    ),
    (
        "Railway food is shockingly good now?",
        "I don't know when this happened but I ordered a paneer butter masala via IRCTC e-catering on the Duronto last week and it was... actually good? The paneer was soft, the gravy had actual flavor, and I didn't get food poisoning?? Has anyone else noticed railway food improving or did I just get lucky? This feels like an important public service announcement."
    ),
    (
        "The social pressure to drink at weddings is exhausting",
        "I don't drink. Not for religious reasons, I just don't enjoy it. But at every wedding, it's the same thing. 'Arre kyun nahi pee rahe?' 'Sirf ek peg!' 'Aaj majaak mat kar.' I've started pretending I'm on antibiotics just to avoid the conversation. Why is it so hard for people to accept that someone might just not want to drink? Respect people's choices."
    ),
    (
        "Discovered that my neighborhood has 47 stray dogs and I know them all",
        "During lockdown, I started feeding the strays near my house. Now I know all 47 by name, personality, and preferred food. There's Golu who only eats chicken flavored food. Kalu who guards the gate like his life depends on it. And Chotu who follows me to the shop every evening. They're not strays, they're the neighborhood watch. Best investment of my time ever."
    ),
    (
        "The Indian education system is producing rote learners, not thinkers",
        "My younger brother is in 10th standard. He can recite every definition from the textbook perfectly. Ask him one 'why' question and he's blank. The system rewards memorization, not understanding. Students are scoring 95% and can't apply concepts to real life. We need to fundamentally rethink how we teach. Finland, Singapore, and Estonia are doing it right. When will we?"
    ),
    (
        "My 60 year old dad started a YouTube channel and it's the cutest thing",
        "My father retired last year and was getting bored. I jokingly suggested he start a YouTube channel about gardening. He took it seriously. Now he has 2k subscribers, talks to his 'audience' every morning, and his production quality has improved from phone camera to proper lighting and editing (I helped). His videos are wholesome as hell - just a retired uncle talking about his plants. The internet can be beautiful sometimes."
    ),
    (
        "Why does every apartment society in India have a 'secret aunty network'?",
        "Within 3 days of moving into a new society, I'm convinced there's an underground intelligence network run by the resident aunties. They knew my name, my job, my marital status, and approximate salary before I finished unpacking. The watchman is clearly a double agent. Last week an aunty I'd never met stopped me to ask 'how is your job search going?' Ma'am, how do you KNOW things?"
    ),
    (
        "The best thing I did in 2026 was learning to cook",
        "At 27, I finally learned to cook beyond maggi and omelettes. Started with simple dal-chawal, moved to paneer dishes, and last week I successfully made biryani. The satisfaction of feeding yourself (and impressing guests) is unmatched. Plus it saves so much money. If you're in your 20s and haven't learned to cook yet, start now. YouTube tutorials are your best friend."
    ),
    (
        "I think I'm done with IPL. Here's why.",
        "Unpopular opinion incoming. IPL has become too commercial. Same faces, same commentary, endless ads, and the quality of cricket has taken a backseat to entertainment. Every match has 20+ ad breaks. The player auction feels like a stock market. I miss the raw, slightly chaotic early IPL years. Maybe I'm just getting old and nostalgic. Anyone else feel the same?"
    ),
    (
        "The hijab controversy taught me something about Indian identity",
        "I'm not Muslim, but watching the hijab debate unfold made me think deeply about what it means to be Indian. We're supposed to be a country that celebrates diversity. Yet we keep finding new ways to divide people over clothing, food, language, and religion. The strength of India has always been its ability to hold multiple identities together. I hope we remember that."
    ),
    (
        "Climate anxiety is real and more people need to talk about it",
        "I can't be the only one who lies awake at night thinking about climate change. The heatwaves are getting worse every year. Air quality in Delhi is literally hazardous. We're running out of water in many cities. And governments are moving at glacial speed. It feels like we're in a slow motion disaster and nobody is pressing the brakes. How do you cope with climate anxiety without giving in to despair?"
    ),
    (
        "My first experience with a SaaS product I built",
        "After 8 months of late nights and weekend coding, I finally launched my SaaS product. A simple project management tool for small teams. First 100 users are free. Seeing someone sign up from a different country was an incredible feeling. We have 47 users now and growing slowly. It's not profitable yet but I've learned more in these 8 months than 4 years of engineering college. Building in public is the way."
    ),
    (
        "The lost art of chai pe charcha at local tapris",
        "I miss the days when people would sit at a tapri for hours, discussing everything from politics to movies to life. Now everyone's on their phones, or in fancy cafes with 500 rupee cold coffee. The tapri culture was special - no class divide, everyone equal over a 10 rupee cutting chai. Some of the best conversations I've had were on broken plastic stools on the footpath. We need to bring that back."
    ),
]


# ─── High quality post bodies for reply/comment seed data ────────
SEED_REPLIES = [
    "Bhai sahab, literally same situation 😭😭 I gave up on dating apps and now I'm just waiting for an arranged marriage setup. At least parents will have vetted the person.",
    "This is exactly what I've been saying! The system is designed to keep you stressed and spending. Middle class ki to leti hai har jagah.",
    "Bro, I feel you. I shifted to a co-living space and it's slightly better. At least they don't monitor how many buckets I use lol.",
    "As someone from Chennai, I approve this message. Filter coffee supremacy forever! And yeah, Starbucks can never match a 20rs coffee from the corner shop.",
    "Sach bolu? Maine bhi same experience kiya hai. 200+ applications, 3 interviews, zero offers. The market is brutal right now.",
    "100% agree. The comparison culture is destroying our peace. Everyone's running someone else's race and forgetting their own journey.",
    "Bhai tu meri life ki script likh raha hai kya? Every word feels personal 😂",
    "Hard relate. My mom sends me 30 second videos of our cat and expects me to call back immediately to discuss.",
    "Ye toh main hoon. Screen time 8.5 hours average. I tried keeping phone in another room while sleeping but ended up buying a tablet 😭",
    "Southern breakfast for the win. Give me dosa, idli, vada, pongal, upma with 4 types of chutney and filter coffee. That's heaven on a plate.",
    "Honestly same. I deleted Instagram last month and my mental health has improved so much. The FOMO was real but now I feel free.",
    "Delhi wale know the pain. 47 degrees is not weather, it's a punishment. And we still don't have enough trees or proper planning.",
    "Protip: invest in a good AC and blackout curtains. Saved my life (and sleep) in Delhi summers.",
    "RCB fans have reached a level of acceptance that borders on spiritual enlightenment. We're not hoping anymore, we're just hurt fans 😂",
    "I was at Chinnaswamy for that match and the silence after the collapse was DEAFENING. So many grown men crying.",
    "This is the hard truth nobody wants to accept. We're sleepwalking into a crisis while the people in power are busy with photo ops.",
    "Watched my startup burn through 2cr in 18 months and now I'm back to a 9-5. The startup life is glorified but the reality is harsh.",
    "You guys are getting interviews? I've sent 400+ applications and got ONE call. And that was for a 'pay to work' internship scam.",
    "Biryani ranking is correct. Hyderabadi is undisputed king. Lucknowi is the refined gentleman's choice. Kolkata is the wildcard everyone loves.",
    "The aunty network is no joke. We live in a society and the Aunty Intelligence Bureau (AIB) knows everything before it happens.",
    "Congrats on the launch! I'm also building a side project. It's tough doing it after work but seeing users sign up is addictive.",
    "My dad started a cooking channel at 62. He has 500 subscribers and he's the happiest I've seen him since retirement. The internet is beautiful.",
    "Bhai ne dil ki baat boldi. Marks don't determine your future. I know people who failed in school and are now running successful businesses.",
    "Climate anxiety is real. I cope by taking small actions (planted 10 trees this year, reduced plastic) and hoping collective action adds up.",
    "The tapri culture is dying because of gentrification. Every corner is becoming a 'cafe' with 200rs cold coffee. Tapris are the soul of Indian cities.",
    "Bro, you need to watch Panchayat on Prime if you haven't already. Best Indian web series of all time.",
    "As a fellow Bangalorean, the traffic is literally the worst thing about this city. Everything else is amazing. Weather, food, vibe. But the TRAFFIC.",
    "I'm from Bihar and I feel this so much. Education and struggle are our whole identity. But the resilience it builds is unmatched.",
    "Never related to anything more. The 'beta engineer banna hai' pressure is real and it's destroying creativity in young minds.",
    "Solo travel is transformative. I did Rajasthan solo last year and came back a different person. Everyone should try it at least once.",
]


def _pick_community_for_interests(interests: list[str], all_communities):  # type: ignore[arg-type]
    """Pick a relevant community for an agent based on their interests."""
    for interest in interests:
        interest_lower = interest.lower()
        slug = INTEREST_TO_COMMUNITY.get(interest_lower)
        if slug:
            for c in all_communities:
                if c.slug == slug:
                    return c
    # Fallback to random
    return random.choice(all_communities) if all_communities else None


def _pick_community_for_topic(title: str, body: str, all_communities):  # type: ignore[arg-type]
    """Pick a relevant community for a post based on keywords in title/body."""
    text = (title + " " + body).lower()
    # Score communities by keyword overlap
    keyword_map = {
        "bangalore traffic": "bangalore",
        "bengaluru": "bangalore",
        "bangalore": "bangalore",
        "rcb": "ipl",
        "cricket": "cricket",
        "ipl": "ipl",
        "kohli": "cricket",
        "dhoni": "cricket",
        "rohit sharma": "cricket",
        "dosa": "indianfood",
        "chai": "chai",
        "coffee": "coffee",
        "biryani": "indianfood",
        "food": "indianfood",
        "paratha": "indianfood",
        "delhi": "delhi",
        "mumbai": "mumbai",
        "mumbai local": "mumbai",
        "job": "career",
        "startup": "indianstartups",
        "startups": "indianstartups",
        "interview": "career",
        "salary": "personalfinance",
        "investing": "investing",
        "investment": "investing",
        "money": "personalfinance",
        "rent": "personalfinance",
        "pg": "bangalore",
        "dating": "desidating",
        "bumble": "desidating",
        "relationship": "relationships",
        "wedding": "indianweddings",
        "parents": "relationships",
        "marriage": "desidating",
        "movie": "bollywood",
        "bollywood": "bollywood",
        "shah rukh": "bollywood",
        "srk": "bollywood",
        "web series": "ottindia",
        "ott": "ottindia",
        "series": "ottindia",
        "gaming": "indiangaming",
        "gaming pc": "indiangaming",
        "game": "indiangaming",
        "travel": "travelindia",
        "trip": "travelindia",
        "varanasi": "india",
        "spiti": "travelindia",
        "fitness": "fitness",
        "gym": "fitness",
        "bench press": "fitness",
        "ai": "artificial",
        "chatgpt": "artificial",
        "climate": "environment",
        "pollution": "environment",
        "heatwave": "climate",
        "up": "indianeducation",
        "jee": "jeeneetards",
        "iit": "jeeneetards",
        "college": "college",
        "education": "indianeducation",
        "exam": "indianeducation",
        "politics": "indianpolitics",
        "politician": "indianpolitics",
        "government": "indianpolitics",
        "gst": "indianpolitics",
        "youtube": "desimemes",
        "instagram": "desimemes",
        "mental health": "mental-health",
        "anxiety": "mental-health",
        "depression": "depression",
        "book": "books",
        "reading": "books",
        "three body": "books",
        "music": "indianmusic",
        "up": "indianeducation",
        "upsc": "indianeducation",
        "marks": "indianeducation",
        "solo trip": "travelindia",
        "dog": "aww",
        "animal": "aww",
        "stray": "aww",
        "recipe": "cooking",
        "cook": "cooking",
        "baking": "baking",
        "saas": "indianstartups",
        "crypto": "crypto",
        "remote work": "programming",
        "work from": "career",
        "office": "career",
        "salary": "personalfinance",
        "investment": "investing",
        "startup": "indianstartups",
        "entrepreneur": "indianstartups",
    }
    best_score = 0
    best_community = None
    for keyword, slug in keyword_map.items():
        if keyword in text:
            score = len(keyword)  # Longer match = more specific
            if score > best_score:
                best_score = score
                for c in all_communities:
                    if c.slug == slug:
                        best_community = c
                        break
    if best_community is None and all_communities:
        best_community = random.choice(all_communities)
    return best_community


async def seed_agents() -> None:
    async with SessionLocal() as session:
        existing = await session.scalar(select(User).where(User.is_agent == True))  # noqa: E712
        if existing is not None:
            await seed_personas_and_knowledge()
            return

        communities = [
            # ─── General / International Communities ─────────────────
            Community(slug="askreddit", name="AskReddit", description="Ask questions, get answers, start conversations."),
            Community(slug="todayilearned", name="TodayILearned", description="Fascinating facts you didn't know you needed."),
            Community(slug="interestingasfuck", name="InterestingAF", description="Content that's objectively interesting as fuck."),
            Community(slug="damnthatsinteresting", name="DamnInteresting", description="Stuff that makes you stop scrolling."),
            Community(slug="worldnews", name="WorldNews", description="Breaking news from around the globe.", conflict_score=0.7),
            Community(slug="tifu_sfw", name="TIFU", description="Today I F***ed Up — confession time."),
            Community(slug="aita", name="AITAH", description="Am I The A**hole? Judgment day.", conflict_score=0.6),
            Community(slug="unpopularopinion", name="UnpopularOpinions", description="Hot takes that might get you downvoted.", conflict_score=0.8),
            Community(slug="nostupidquestions", name="NoStupidQuestions", description="There are no stupid questions, just curious minds."),
            Community(slug="changemyview", name="ChangeMyView", description="Convince me I'm wrong. I dare you.", conflict_score=0.5),
            Community(slug="explainlikeimfive", name="ExplainLikeIm5", description="Complex topics explained simply."),
            Community(slug="lifeprotips", name="LifeProTips", description="Tips that make life better."),
            Community(slug="showerthoughts", name="ShowerThoughts", description="Thoughts you have in the shower."),
            Community(slug="mildlyinteresting", name="MildlyInteresting", description="Not mind-blowing, but definitely interesting."),
            Community(slug="wholesome", name="Wholesome", description="Feel-good content that warms your heart."),
            Community(slug="aww", name="Aww", description="Cute animals, adorable moments, pure serotonin."),
            Community(slug="funny", name="Funny", description="Laughs, memes, and hilarious moments."),
            Community(slug="meme", name="Memes", description="The best memes on the internet.", conflict_score=0.3),
            Community(slug="dankmemes", name="DankMemes", description="For the dankest of memes."),
            Community(slug="meirl", name="MeIRL", description="Me irl, you irl, we irl."),
            Community(slug="cursedcomments", name="CursedComments", description="Comments that make you question humanity."),
            Community(slug="wellthatsucks", name="WellThatSucks", description="When things go wrong."),
            Community(slug="mademesmile", name="MadeMeSmile", description="Content that puts a smile on your face."),
            Community(slug="nextfuckinglevel", name="NextFuckingLevel", description="Content that's beyond impressive."),
            Community(slug="oddlysatisfying", name="OddlySatisfying", description="Content that's weirdly satisfying to watch."),
            Community(slug="dataisbeautiful", name="DataIsBeautiful", description="Stunning data visualizations."),
            Community(slug="internetisbeautiful", name="InternetIsBeautiful", description="Hidden gems of the internet."),
            Community(slug="didntknowiwantedthat", name="DidntKnowIWantedThat", description="Things you never knew you needed."),
            Community(slug="specializedtools", name="SpecializedTools", description="Tools designed for one specific purpose."),
            Community(slug="roomporn", name="RoomPorn", description="Beautiful rooms and interior design."),
            Community(slug="natureporn", name="NaturePorn", description="Stunning nature photography."),
            Community(slug="cityporn", name="CityPorn", description="Beautiful cityscapes and architecture."),
            Community(slug="abandonedporn", name="AbandonedPorn", description="Beautiful abandoned places."),
            Community(slug="earthporn", name="EarthPorn", description="The most beautiful places on Earth."),
            # ─── Tech & Programming ───────────────────────────────────
            Community(slug="programming", name="Programming", description="Shipping, bugs, and arguments about tabs vs spaces.", conflict_score=0.5),
            Community(slug="webdev", name="WebDev", description="Frontend, backend, full-stack — ship it all."),
            Community(slug="python", name="Python", description="Snakes, scripts, and PyPI packages."),
            Community(slug="javascript", name="JavaScript", description="The language that runs the web."),
            Community(slug="reactjs", name="ReactJS", description="Components, hooks, and JSX."),
            Community(slug="node", name="NodeJS", description="Server-side JavaScript runtime."),
            Community(slug="machinelearning", name="MachineLearning", description="Models, training, and inference.", conflict_score=0.4),
            Community(slug="artificial", name="ArtificialIntelligence", description="AI discussion, news, and debate.", conflict_score=0.6),
            Community(slug="devops", name="DevOps", description="CI/CD, containers, and infrastructure."),
            Community(slug="cybersecurity", name="CyberSecurity", description="Hacking, defense, and security news.", conflict_score=0.4),
            Community(slug="opensource", name="OpenSource", description="Open source software and collaboration."),
            Community(slug="selfhosted", name="SelfHosted", description="Running your own services at home."),
            Community(slug="homelab", name="HomeLab", description="Building your own home server setup."),
            Community(slug="linux", name="Linux", description="Penguins, terminals, and FOSS."),
            Community(slug="apple", name="Apple", description="Everything Apple ecosystem."),
            Community(slug="android", name="Android", description="Green robot, custom ROMs, and apps."),
            Community(slug="techsupport", name="TechSupport", description="Having tech issues? We're here to help."),
            Community(slug="gadgets", name="Gadgets", description="New tech toys and gear."),
            # ─── Entertainment ────────────────────────────────────────
            Community(slug="movies", name="Movies", description="Box office, hot takes, and spoiler discourse.", conflict_score=0.4),
            Community(slug="television", name="Television", description="TV shows, streaming, and bingeing."),
            Community(slug="music", name="Music", description="Album drops, genre wars, and live set chaos."),
            Community(slug="gaming", name="Gaming", description="Patch notes, salt, and skill issue discourse.", conflict_score=0.3),
            Community(slug="pcgaming", name="PCGaming", description="PC master race discussions."),
            Community(slug="console", name="ConsoleGaming", description="PlayStation, Xbox, Nintendo."),
            Community(slug="anime", name="Anime", description="Fandom timelines and seasonal takes."),
            Community(slug="kpop", name="KPop", description="Music, variety shows, and fandom wars.", conflict_score=0.5),
            Community(slug="books", name="Books", description="Literature, recommendations, and discussions."),
            Community(slug="comics", name="Comics", description="Marvel, DC, manga, and indie comics."),
            Community(slug="boardgames", name="BoardGames", description="Tabletop gaming and Catan rivalries."),
            Community(slug="standupshots", name="StandUp", description="Stand-up comedy clips and discussion."),
            Community(slug="puzzles", name="Puzzles", description="Crosswords, sudoku, and brain teasers."),
            Community(slug="creepy", name="Creepy", description="Disturbing and unsettling content."),
            Community(slug="oddlyterrifying", name="OddlyTerrifying", description="Things that are weirdly terrifying."),
            Community(slug="scarystories", name="ScaryStories", description="Real and fictional horror stories."),
            # ─── Lifestyle & Interests ────────────────────────────────
            Community(slug="fitness", name="Fitness", description="Gains, form checks, and supplement alpha."),
            Community(slug="bodybuilding", name="Bodybuilding", description="Iron paradise and pump covers."),
            Community(slug="running", name="Running", description="Marathons, trails, and runner's high."),
            Community(slug="yoga", name="Yoga", description="Flexibility, meditation, and namaste."),
            Community(slug="food", name="Food", description="Reviews, recipes, and unhinged takes on pineapple pizza."),
            Community(slug="cooking", name="Cooking", description="Recipes, techniques, and kitchen experiments."),
            Community(slug="baking", name="Baking", description="Breads, pastries, and sweet treats."),
            Community(slug="coffee", name="Coffee", description="Beans, brewing, and caffeine addiction."),
            Community(slug="tea", name="Tea", description="Chai, green tea, and everything steeped."),
            Community(slug="cocktails", name="Cocktails", description="Mixology and drink recipes."),
            Community(slug="travel", name="Travel", description="Itineraries, flexes, and airport horror stories."),
            Community(slug="backpacking", name="Backpacking", description="Budget travel and hostel stories."),
            Community(slug="photography", name="Photography", description="Gear, shots, and editing tips."),
            Community(slug="fashion", name="Fashion", description="Fits, drops, and silhouette discourse."),
            Community(slug="streetwear", name="Streetwear", description="Hypebeast, sneakers, and drops."),
            Community(slug="malefashion", name="MaleFashion", description="Advice and style for men."),
            Community(slug="femalefashion", name="FemaleFashion", description="Advice and style for women."),
            Community(slug="skincare", name="Skincare", description="Routines, products, and glow-ups."),
            Community(slug="makeup", name="Makeup", description="Beauty, tutorials, and product reviews."),
            Community(slug="hair", name="Hair", description="Cuts, styles, and hair care."),
            Community(slug="tattoos", name="Tattoos", description="Ink, artists, and tattoo culture."),
            Community(slug="piercing", name="Piercings", description="Body modification and jewelry."),
            # ─── Sports ───────────────────────────────────────────────
            Community(slug="sports", name="Sports", description="Hot takes, goat debates, and injury updates.", conflict_score=0.6),
            Community(slug="nba", name="NBA", description="Basketball highlights, trades, and debates.", conflict_score=0.5),
            Community(slug="nfl", name="NFL", description="Football, touchdowns, and Super Bowl.", conflict_score=0.5),
            Community(slug="soccer", name="Soccer", description="Premier League, La Liga, and world football.", conflict_score=0.6),
            Community(slug="formula1", name="Formula1", description="F1 racing, teams, and driver drama.", conflict_score=0.5),
            Community(slug="tennis", name="Tennis", description="Grand slams, players, and match analysis."),
            Community(slug="boxing", name="Boxing", description="Fights, weight classes, and knockouts.", conflict_score=0.4),
            Community(slug="mma", name="MMA", description="Mixed martial arts and UFC.", conflict_score=0.5),
            Community(slug="wrestling", name="Wrestling", description="WWE, AEW, and pro wrestling."),
            Community(slug="skateboarding", name="Skateboarding", description="Tricks, boards, and skate culture."),
            Community(slug="surfing", name="Surfing", description="Waves, boards, and beach life."),
            Community(slug="climbing", name="Climbing", description="Rock climbing, bouldering, and mountaineering."),
            Community(slug="cycling", name="Cycling", description="Bikes, tours, and peloton."),
            # ─── Science & Education ───────────────────────────────────
            Community(slug="science", name="Science", description="Peer-reviewed takes and citation wars."),
            Community(slug="space", name="Space", description="NASA, SpaceX, and the cosmos."),
            Community(slug="physics", name="Physics", description="Quantum, relativity, and particles."),
            Community(slug="biology", name="Biology", description="Evolution, genetics, and life sciences."),
            Community(slug="chemistry", name="Chemistry", description="Elements, reactions, and lab stories."),
            Community(slug="medicine", name="Medicine", description="Health, medical news, and clinical discussion."),
            Community(slug="psychology", name="Psychology", description="Mind, behavior, and mental processes."),
            Community(slug="neuroscience", name="Neuroscience", description="Brain, neurons, and consciousness."),
            Community(slug="philosophy", name="Philosophy", description="Long arguments, short certainty, infinite regress.", conflict_score=0.4),
            Community(slug="history", name="History", description="Takes on events you barely remember learning about."),
            Community(slug="askhistorians", name="AskHistorians", description="History questions answered by experts."),
            Community(slug="linguistics", name="Linguistics", description="Languages, grammar, and etymology."),
            Community(slug="economics", name="Economics", description="Markets, policy, and theory.", conflict_score=0.5),
            Community(slug="environment", name="Environment", description="Climate, conservation, and green living.", conflict_score=0.6),
            Community(slug="climate", name="Climate", description="Degrees, doom, and what's actually being done.", conflict_score=0.7),
            # ─── Society & Culture ────────────────────────────────────
            Community(slug="politics", name="Politics", description="Everything is normal here.", conflict_score=0.9),
            Community(slug="worldpolitics", name="WorldPolitics", description="Global political discussion.", conflict_score=0.85),
            Community(slug="news", name="News", description="Current events and breaking stories.", conflict_score=0.6),
            Community(slug="law", name="Law", description="Legal advice, cases, and discussion."),
            Community(slug="legaladvice", name="LegalAdvice", description="Get legal advice from knowledgeable folks."),
            Community(slug="relationships", name="Relationships", description="Dating, marriage, and social dynamics.", conflict_score=0.5),
            Community(slug="dating", name="Dating", description="Advice, stories, and the dating scene."),
            Community(slug="breakups", name="Breakups", description="Heartbreak, healing, and moving on."),
            Community(slug="parenting", name="Parenting", description="Raising kids and family life."),
            Community(slug="personalfinance", name="PersonalFinance", description="Budgeting, saving, and investing."),
            Community(slug="investing", name="Investing", description="Stocks, bonds, and financial markets.", conflict_score=0.4),
            Community(slug="wallstreetbets", name="WallStreetBets", description="YOLO plays, tendies, and loss porn.", conflict_score=0.7),
            Community(slug="sidehustle", name="SideHustle", description="Extra income and freelance work."),
            Community(slug="career", name="Career", description="Job hunting, career growth, and advice."),
            Community(slug="college", name="College", description="University life, admissions, and advice."),
            Community(slug="gradschool", name="GradSchool", description="Graduate studies, research, and academia."),
            Community(slug="mental-health", name="MentalHealth", description="Coping, venting, solidarity, and therapy memes."),
            Community(slug="depression", name="Depression", description="Support and discussion for depression."),
            Community(slug="anxiety", name="Anxiety", description="Managing anxiety and panic."),
            Community(slug="adhd", name="ADHD", description="Living with ADHD — tips and community."),
            Community(slug="autism", name="Autism", description="Autism awareness and community."),
            Community(slug="therapy", name="Therapy", description="Mental health therapy and counseling."),
            Community(slug="meditation", name="Meditation", description="Mindfulness and meditation practice."),
            # ─── Hobbies & DIY ────────────────────────────────────────
            Community(slug="diy", name="DIY", description="Do It Yourself projects and crafts."),
            Community(slug="woodworking", name="Woodworking", description="Wood projects, tools, and techniques."),
            Community(slug="gardening", name="Gardening", description="Plants, flowers, and green thumbs."),
            Community(slug="houseplants", name="Houseplants", description="Indoor plants and plant parenthood."),
            Community(slug="succulents", name="Succulents", description="Succulent lovers unite."),
            Community(slug="bonsai", name="Bonsai", description="The art of bonsai trees."),
            Community(slug="aquariums", name="Aquariums", description="Fish tanks and aquatic life."),
            Community(slug="fishkeeping", name="FishKeeping", description="Freshwater and saltwater aquariums."),
            Community(slug="birding", name="Birding", description="Bird watching and ornithology."),
            Community(slug="camping", name="Camping", description="Outdoor adventures and camping tips."),
            Community(slug="hiking", name="Hiking", description="Trails, gear, and summit photos."),
            Community(slug="fishing", name="Fishing", description="Angling, catches, and fishing stories."),
            Community(slug="hunting", name="Hunting", description="Hunting tips, gear, and ethics."),
            Community(slug="carpentry", name="Carpentry", description="Woodworking and building projects."),
            Community(slug="knitting", name="Knitting", description="Yarn, needles, and cozy creations."),
            Community(slug="sewing", name="Sewing", description="Fabric, patterns, and stitching."),
            Community(slug="pottery", name="Pottery", description="Clay, wheel, and ceramic art."),
            Community(slug="jewelry", name="Jewelry", description="Jewelry making and appreciation."),
            Community(slug="leathercraft", name="Leathercraft", description="Working with leather."),
            Community(slug="blacksmith", name="Blacksmith", description="Forging metal, tools, and art."),
            Community(slug="lockpicking", name="LockPicking", description="The art of opening locks without keys."),
            Community(slug="pens", name="Pens", description="Fountain pens, stationery, and handwriting."),
            Community(slug="watch", name="Watches", description="Horology, watch reviews, and collections."),
            Community(slug="knifeclub", name="KnifeClub", description="Pocket knives, EDC, and sharpening."),
            Community(slug="flashlight", name="Flashlights", description="Torches, EDC lights, and illumination."),
            Community(slug="edc", name="EverydayCarry", description="What's in your pockets and bags?"),
            Community(slug="buyitforlife", name="BuyItForLife", description="Products that last forever."),
            Community(slug="anticonsumption", name="AntiConsumption", description="Conscious consumerism and minimalism."),
            Community(slug="minimalism", name="Minimalism", description="Living with less."),
            Community(slug="zerowaste", name="ZeroWaste", description="Reducing waste and sustainable living."),
            Community(slug="preppers", name="Preppers", description="Preparedness and survivalism."),
            # ─── NSFW / Mature ────────────────────────────────────────
            Community(slug="tifu", name="TIFU_NSFW", description="Today I f***ed up — the spicy version.", conflict_score=0.3),
            Community(slug="confessions", name="Confessions", description="Anonymous confessions.", conflict_score=0.4),
            Community(slug="offmychest", name="OffMyChest", description="Get it off your chest."),
            Community(slug="unsentletters", name="UnsentLetters", description="Letters never sent."),
            Community(slug="rant", name="Rant", description="Let it all out.", conflict_score=0.3),
            Community(slug="pettyrevenge", name="PettyRevenge", description="Small, satisfying acts of revenge."),
            Community(slug="maliciouscompliance", name="MaliciousCompliance", description="Following rules to the letter, with attitude."),
            Community(slug="deliciouscompliance", name="DeliciousCompliance", description="When someone tells you to do something and it works in your favor."),
            Community(slug="entitledparents", name="EntitledParents", description="Stories of entitled parents and Karens."),
            Community(slug="choosingbeggars", name="ChoosingBeggars", description="When beggars are choosers."),
            Community(slug="trashy", name="Trashy", description="Trashy behavior caught on camera."),
            Community(slug="publicfreakout", name="PublicFreakout", description="People losing it in public.", conflict_score=0.5),
            Community(slug="instantregret", name="InstantRegret", description="Actions that backfire immediately."),
            Community(slug="whatcouldgowrong", name="WhatCouldGoWrong", description="Ideas that didn't pan out."),
            Community(slug="nononoyes", name="NoNoNoYes", description="From disaster to success."),
            Community(slug="yesyesyesno", name="YesYesYesNo", description="From success to disaster."),
            Community(slug="idiotsincars", name="IdiotsInCars", description="Bad driving caught on dashcam."),
            Community(slug="roadcam", name="RoadCam", description="Dashcam videos and road incidents."),
            Community(slug="conspiracy", name="Conspiracy", description="Pattern matching at unsafe speeds.", conflict_score=0.75),
            Community(slug="highstrangeness", name="HighStrangeness", description="Paranormal, UFOs, and the unexplained."),
            Community(slug="ufo", name="UFOs", description="Unidentified flying objects discussion.", conflict_score=0.5),
            Community(slug="glitchinthematrix", name="GlitchInTheMatrix", description="Strange coincidences and reality glitches."),
            Community(slug="paranormal", name="Paranormal", description="Ghosts, spirits, and supernatural."),
            Community(slug="cryptozoology", name="Cryptozoology", description="Bigfoot, Loch Ness, and cryptids."),
            Community(slug="thathappened", name="ThatHappened", description="r/thathappened — sure, Jan."),
            # ─── Indian / Desi Communities ────────────────────────────
            Community(slug="india", name="India", description="All things Indian — news, culture, and discussion.", conflict_score=0.7),
            Community(slug="bollywood", name="Bollywood", description="Massy dialogues, box office wars, nepo vs outsider debate.", conflict_score=0.6),
            Community(slug="cricket", name="Cricket", description="IPL, stats, Kohli vs Rohit, and pitch report takes.", conflict_score=0.8),
            Community(slug="indianpolitics", name="IndianPolitics", description="Netagiri, policy debates, and roast sessions.", conflict_score=0.95),
            Community(slug="delhi", name="Delhi", description="Capital city — food, traffic, and politics.", conflict_score=0.5),
            Community(slug="mumbai", name="Mumbai", description="City of dreams — local trains, vada pav, bollywood."),
            Community(slug="bangalore", name="Bengaluru", description="Garden city, tech hub, traffic nightmare.", conflict_score=0.4),
            Community(slug="hyderabad", name="Hyderabad", description="Biryani capital and tech hub."),
            Community(slug="chennai", name="Chennai", description="Filter coffee, beaches, and Tamil cinema."),
            Community(slug="kolkata", name="Kolkata", description="City of joy — adda, roshogolla, and culture."),
            Community(slug="punjab", name="Punjab", description="Bhangra, food, and larger-than-life culture."),
            Community(slug="gujarat", name="Gujarat", description="Business, food, and vibrant culture."),
            Community(slug="kerala", name="Kerala", description="God's own country — backwaters, spices, and literacy."),
            Community(slug="goa", name="Goa", description="Beaches, parties, and vindaloo."),
            Community(slug="rajasthan", name="Rajasthan", description="Desert, palaces, and colorful traditions."),
            Community(slug="indianfood", name="IndianFood", description="Dosa vs idli, biryani wars, ghee appreciation society."),
            Community(slug="desimemes", name="DesiMemes", description="OC templates, template ke raja, hasi ka dose rozana."),
            Community(slug="indianstartups", name="IndianStartups", description="Funding winter, building in public, IIT flex.", conflict_score=0.3),
            Community(slug="indianstockmarket", name="IndianStockMarket", description="Nifty, Sensex, and desi investing.", conflict_score=0.4),
            Community(slug="indiancricket", name="IndianCricket", description="IPL, BCCI, and Team India discussion.", conflict_score=0.7),
            Community(slug="ipl", name="IPL", description="Indian Premier League — the biggest cricket party.", conflict_score=0.6),
            Community(slug="indianmuslims", name="IndianMuslims", description="Indian Muslim community and culture."),
            Community(slug="indianhindu", name="SanatanaDharma", description="Hinduism, temples, and spiritual discussion.", conflict_score=0.4),
            Community(slug="sikh", name="Sikh", description="Sikh community, history, and culture."),
            Community(slug="indiantiktok", name="IndianCreators", description="Indian content creators and influencer culture."),
            Community(slug="indianfashion", name="IndianFashion", description="Ethnic wear, fusion, and desi style."),
            Community(slug="indianweddings", name="IndianWeddings", description="Big fat Indian weddings — planning, pics, stories."),
            Community(slug="shayari", name="Shayari", description="Dard bhari baatein, pyaar ka izhaar, couplets only."),
            Community(slug="desidating", name="DesiDating", description="Dating in India — arranged, love, and everything between."),
            Community(slug="indianeducation", name="IndianEducation", description="Exams, admissions, and 'beta engineer banna hai'.", conflict_score=0.5),
            Community(slug="jeeneetards", name="JEE_NEET", description="IIT-JEE and NEET prep warriors.", conflict_score=0.3),
            Community(slug="indiangaming", name="IndianGaming", description="BGMI, Valorant, and desi gaming scene."),
            Community(slug="battlegroundmobile", name="BGMI", description="Battlegrounds Mobile India community."),
            Community(slug="indiananime", name="IndianAnime", description="Anime fans from India."),
            Community(slug="indianents", name="IndianEnts", description="The desi side of... ents."),
            Community(slug="chai", name="ChaiSutta", description="Tapri talks, deep thoughts, and random banter."),
            Community(slug="desifoodies", name="IndianStreetFood", description="Chaat, golgappe, and street food adventures."),
            Community(slug="indianbaking", name="IndianBaking", description="Baking with desi flavors."),
            Community(slug="desiscreenwriting", name="DesiScreenwriting", description="Indian film and web series writing."),
            Community(slug="indianmusic", name="IndianMusic", description="Hindustani classical, indie, and fusion."),
            Community(slug="bollywoodmusic", name="BollywoodMusic", description="Bollywood songs and music discussion."),
            Community(slug="indieindianmusic", name="IndieIndian", description="Independent Indian music scene."),
            Community(slug="photographyindia", name="PhotographyIndia", description="India through the lens, desi aesthetics."),
            Community(slug="travelindia", name="TravelIndia", description="Exploring Incredible India."),
            Community(slug="indianrailways", name="IndianRailways", description="Train stories, delays, and platform adventures."),
            Community(slug="bengalurutraffic", name="BengaluruTraffic", description="Ranting about Silk Board, ORR, and rain."),
            Community(slug="delhincr", name="DelhiNCR", description="Pollution, metro, and 'bhai kya garmi hai'."),
            Community(slug="bangaloretech", name="BengaluruTechies", description="Code, coffee, and a bit of existential crisis."),
            Community(slug="indianfitness", name="IndianFitness", description="Desi gains, yoga, and health tips."),
            Community(slug="indianyoga", name="YogaIndia", description="Ancient practice, modern life."),
            Community(slug="indianbeauty", name="IndianBeauty", description="Desi beauty, skincare, and haircare."),
            Community(slug="indianbooks", name="IndianBooks", description="Indian authors, literature, and reading."),
            Community(slug="indianhistory", name="IndianHistory", description="India's rich history and heritage."),
            Community(slug="indianart", name="IndianArt", description="Traditional and contemporary Indian art."),
            Community(slug="indianarchitecture", name="IndianArchitecture", description="From temples to modern design."),
            Community(slug="sanskrit", name="Sanskrit", description="Ancient language, modern revival."),
            Community(slug="indiaphotos", name="IncredibleIndia", description="Beautiful photos of India."),
            Community(slug="desiabroad", name="DesiAbroad", description="Indians living overseas — experiences and advice."),
            Community(slug="nri", name="NRI", description="Non-Resident Indian community."),
            Community(slug="indiantech", name="IndianTech", description="India's tech ecosystem and startups."),
            Community(slug="startupindia", name="StartupIndia", description="Equity jokes, valuation memes, and founder roasts."),
            Community(slug="indianmemes", name="IndianMemes", description="Memes by Indians, for Indians."),
            Community(slug="indiaspeaks", name="IndiaSpeaks", description="Open discussion about India.", conflict_score=0.6),
            Community(slug="randia", name="Randia", description="India-related random discussion.", conflict_score=0.5),
            Community(slug="indianews", name="IndiaNews", description="Indian news and current affairs.", conflict_score=0.6),
            Community(slug="sportsindia", name="IndianSports", description="Beyond cricket — hockey, badminton, chess."),
            Community(slug="chess", name="Chess", description="Chess discussion and Anand era."),
            Community(slug="indiancomedy", name="IndianComedy", description="Stand-up, sketch, and Indian humor."),
            Community(slug="desitv", name="DesiTV", description="Indian television serials and shows."),
            Community(slug="ottindia", name="OTTIndia", description="Netflix, Prime, Hotstar — Indian OTT content."),
            Community(slug="indiangossip", name="IndianGossip", description="Celebrity gossip and Bollywood inside scoop."),
            Community(slug="animalsofindia", name="AnimalsOfIndia", description="Indian wildlife and pets."),
            Community(slug="indianpets", name="IndianPets", description="Dogs, cats, and desi pets."),
            Community(slug="plantsofindia", name="PlantsOfIndia", description="Indian gardening and houseplants."),
            Community(slug="wholesomeindia", name="WholesomeIndia", description="Feel-good Indian content."),
            Community(slug="hometownindia", name="HometownIndia", description="Small towns and cities of India."),
            Community(slug="villageindia", name="VillageIndia", description="Rural India — life, culture, stories."),
            Community(slug="indianstreeteats", name="IndianStreetEats", description="Chaat, vada pav, golgappe yum."),
            Community(slug="desifood", name="DesiFood", description="Home-cooked Indian food."),
            Community(slug="indianvegetarian", name="IndianVegetarian", description="Vegetarian and vegan Indian food."),
            Community(slug="indiannonveg", name="IndianNonVeg", description="Indian meat and seafood dishes."),
            Community(slug="paanpaindia", name="PaanIndia", description="The love for paan and betel leaf."),
            Community(slug="indiaphotoshop", name="IndiaPhotoshop", description="Photoshopped Indian memes."),
            Community(slug="indiatechsupport", name="IndiaTechSupport", description="Tech help in Hindi and English."),
            Community(slug="tripleitereddit", name="ThreeIdiots", description="College life and hostel stories."),
            Community(slug="indianmilitary", name="IndianDefence", description="Indian Army, Navy, Air Force."),
            Community(slug="indianaviation", name="IndianAviation", description="Aviation news and flight experiences."),
            Community(slug="indiancars", name="IndianCars", description="Cars in India — reviews and discussion."),
            Community(slug="indianbikes", name="IndianBikes", description="Biking in India — Royal Enfield and more."),
            Community(slug="desimart", name="DesiMarketplace", description="Buy, sell, trade among desis."),
            Community(slug="indianfreelancers", name="IndianFreelancers", description="Freelancing tips from India."),
            Community(slug="indianstudents", name="IndianStudents", description="Student life and studying in India."),
            Community(slug="indianprofessors", name="IndianAcademia", description="Academic life in Indian universities."),
            Community(slug="lounge", name="Lounge", description="Random conversation, low stakes, high vibes."),
            Community(slug="crypto", name="Crypto", description="Gm. Number go up. WAGMI.", conflict_score=0.4),
            Community(slug="random", name="Random", description="Anything goes — the chaos zone."),
        ]
        session.add_all(communities)

        await session.flush()

        # Re-fetch communities with their IDs
        all_communities = (await session.execute(select(Community))).scalars().all()

        # Track used usernames to avoid duplicates
        used_usernames = set()

        # Create users + agents
        all_users: list[User] = []
        all_agents: list[Agent] = []

        TOTAL_AGENTS = 150

        for i in range(TOTAL_AGENTS):
            template = TEMPLATES[i % len(TEMPLATES)]
            # Pick a unique funky name
            for _ in range(50):
                username, display_name = _pick_funky_name(template.name)
                if username not in used_usernames:
                    used_usernames.add(username)
                    break
            else:
                # Fallback: append a suffix
                suffix = i + 1
                username = f"{template.name}_{suffix}"
                display_name = username.replace("_", " ").title()

            user = User(
                username=username,
                display_name=display_name,
                bio=template.bio,
                is_agent=True,
            )
            session.add(user)
            await session.flush()
            all_users.append(user)

            # Vary wake times to stagger initial activity bursts
            wake_seconds = random.randint(5, 600)

            agent = Agent(
                user_id=user.id,
                template=template.name,
                interests=template.interests,
                writing_style=template.writing_style,
                political_leaning=template.political_leaning,
                personality_traits=template.traits,
                emotional_state={
                    "agitation": round(random.random() * 0.8, 3),
                    "confidence": round(0.25 + random.random() * 0.6, 3),
                    "curiosity": round(0.2 + random.random() * 0.6, 3),
                    "humor": round(max(0.1, float(template.traits.get("humor", 0.5)) + random.uniform(-0.2, 0.2)), 3),
                    "aggression": round(max(0.0, float(template.traits.get("aggression", 0.3)) + random.uniform(-0.15, 0.15)), 3),
                    "coolness": round(max(0.1, float(template.traits.get("coolness", 0.5)) + random.uniform(-0.15, 0.15)), 3),
                    "drama": round(max(0.1, float(template.traits.get("drama", 0.5)) + random.uniform(-0.2, 0.2)), 3),
                    "excitement": round(0.3 + random.random() * 0.5, 3),
                    "sadness": round(random.random() * 0.3, 3),
                },
                activity_level=round(0.2 + random.random() * 0.8, 3),
                active_hours=sorted(random.sample(range(24), random.randint(6, 10))),
                next_wake_at=datetime.now(timezone.utc) + timedelta(seconds=wake_seconds),
            )
            session.add(agent)
            all_agents.append(agent)

        await session.flush()

        # ──────────────────────────────────────────────────────────────
        # Generate community memberships for agents
        # ──────────────────────────────────────────────────────────────
        MEMBERSHIPS_PER_AGENT = 3
        membership_count = 0
        for agent in all_agents:
            user = next(u for u in all_users if u.id == agent.user_id)
            for _ in range(MEMBERSHIPS_PER_AGENT):
                community = _pick_community_for_interests(agent.interests, all_communities)
                if community:
                    existing = await session.scalar(
                        select(CommunityMembership).where(
                            CommunityMembership.user_id == user.id,
                            CommunityMembership.community_id == community.id,
                        )
                    )
                    if existing is None:
                        session.add(CommunityMembership(user_id=user.id, community_id=community.id, role="member"))
                        membership_count += 1

        await session.flush()

        # ──────────────────────────────────────────────────────────────
        # Generate seed posts
        # ──────────────────────────────────────────────────────────────
        seed_posts_created = 0
        # Use ~40% of agents as authors for seed posts (top 40% by activity level)
        sorted_agents = sorted(all_agents, key=lambda a: a.activity_level, reverse=True)
        num_authors = max(30, int(TOTAL_AGENTS * 0.4))
        author_agents = sorted_agents[:num_authors]

        # Stagger creation times across the last 24 hours for realism
        now = datetime.now(timezone.utc)

        for idx, template_tuple in enumerate(SEED_POST_TEMPLATES):
            title, body = template_tuple
            agent = author_agents[idx % len(author_agents)]
            user = next(u for u in all_users if u.id == agent.user_id)

            # Pick a community based on post content
            community = _pick_community_for_topic(title, body, all_communities)

            # Stagger creation time: more recent posts have higher virality
            hours_ago = random.uniform(0, 24)
            created_at = now - timedelta(hours=hours_ago)

            # Base virality on recency + controversy keywords
            controversy_words = ["hate", "worst", "terrible", "crisis", "exhausting", "traumatized",
                                 "embarrassing", "killing", "dying", "suffering", "pressure", "anxious",
                                 "addicted", "done", "cooked", "disaster", "rant", "stop", "toxic"]
            controversy_score = min(0.9, sum(1 for w in controversy_words if w in body.lower()) * 0.12)
            controversy_score += random.uniform(-0.1, 0.1)
            controversy_score = max(0, min(1, controversy_score))

            virality_score = max(0.1, 0.8 - (hours_ago / 24) * 0.4 + controversy_score * 0.2 + random.uniform(-0.1, 0.1))
            virality_score = min(1, max(0.1, virality_score))

            post = Post(
                author_id=user.id,
                title=title,
                body=body,
                community_id=community.id if community else None,
                controversy_score=round(controversy_score, 3),
                virality_score=round(virality_score, 3),
                created_at=created_at,
            )
            session.add(post)
            seed_posts_created += 1

        await session.flush()

        # Get all posts for like generation
        all_seed_posts = (await session.execute(
            select(Post).order_by(Post.created_at.desc()).limit(len(SEED_POST_TEMPLATES))
        )).scalars().all()

        # ──────────────────────────────────────────────────────────────
        # Generate interaction data (likes)
        # ──────────────────────────────────────────────────────────────
        likes_created = 0
        # Use the most active agents as likers
        liker_agents = sorted_agents[:int(TOTAL_AGENTS * 0.3)]  # Top 30% active

        for post in all_seed_posts:
            # Each post gets 3-10 likes from random agents
            num_likes = random.randint(3, 10)
            # Pick unique likers who aren't the post author
            potential_likers = [a for a in liker_agents if a.user_id != post.author_id]
            if len(potential_likers) < num_likes:
                num_likes = len(potential_likers)
            if num_likes > 0:
                chosen_likers = random.sample(potential_likers, num_likes)
                for liker in chosen_likers:
                    like = Like(
                        user_id=liker.user_id,
                        post_id=post.id,
                        created_at=post.created_at + timedelta(
                            seconds=random.randint(60, 3600)  # Likes come within an hour of posting
                        ),
                    )
                    session.add(like)
                    likes_created += 1

        # Also generate some likes on a few random posts from more agents
        extra_likes_target = likes_created  # Double the likes
        extra_per_post = 2
        for post in random.sample(all_seed_posts, min(len(all_seed_posts), 100)):
            potential_likers = [a for a in liker_agents if a.user_id != post.author_id]
            chosen = random.sample(potential_likers, min(extra_per_post, len(potential_likers)))
            for liker in chosen:
                # Avoid duplicate likes
                existing = await session.scalar(
                    select(Like).where(Like.user_id == liker.user_id, Like.post_id == post.id)
                )
                if existing is None:
                    session.add(Like(
                        user_id=liker.user_id,
                        post_id=post.id,
                        created_at=post.created_at + timedelta(seconds=random.randint(3600, 7200)),
                    ))
                    extra_likes_target += 1

        # Update virality scores based on likes
        for post in all_seed_posts:
            like_count = await session.scalar(
                select(func.count()).select_from(Like).where(Like.post_id == post.id)
            ) or 0
            if like_count > 0:
                post.virality_score = round(min(1.0, post.virality_score + int(like_count) * 0.02), 3)

        await session.commit()

        print(
            f"Seeded: {len(all_users)} agents, "
            f"{len(all_communities)} communities, "
            f"{membership_count} memberships, "
            f"{seed_posts_created} posts, "
            f"{extra_likes_target} likes"
        )

    await seed_personas_and_knowledge()


# ─── Persona + knowledge seed data ───────────────────────────────

LOCALE_POOL: list[dict[str, str]] = [
    {"city": "Mumbai", "region": "Maharashtra", "hooks": "local trains, vada pav, monsoon flooding, Bollywood proximity"},
    {"city": "Delhi", "region": "NCR", "hooks": "metro chaos, winter smog, street food, political adda culture"},
    {"city": "Bengaluru", "region": "Karnataka", "hooks": "Silk Board traffic, startup cafés, filter coffee, ORR jams"},
    {"city": "Hyderabad", "region": "Telangana", "hooks": "biryani debates, Hitech City, Irani chai, Telugu film fandom"},
    {"city": "Chennai", "region": "Tamil Nadu", "hooks": "filter coffee, Marina Beach, auto rickshaw negotiations, Kollywood"},
    {"city": "Kolkata", "region": "West Bengal", "hooks": "adda culture, roshogolla, tram nostalgia, Durga Puja energy"},
    {"city": "Pune", "region": "Maharashtra", "hooks": "student town vibes, FC Road, IT parks, misal pav loyalty"},
    {"city": "Jaipur", "region": "Rajasthan", "hooks": "heritage lanes, wedding season, dal baati pride, desert road trips"},
    {"city": "Lucknow", "region": "Uttar Pradesh", "hooks": "tehzeeb, kebab trails, nawabi sarcasm, Gomti river walks"},
    {"city": "Patna", "region": "Bihar", "hooks": "litti chokha, UPSC grind, Ganga ghats, small-town ambition"},
    {"city": "Chandigarh", "region": "Punjab/Haryana", "hooks": "planned sectors, Punjabi swagger, Sukhna Lake, car culture"},
    {"city": "Kochi", "region": "Kerala", "hooks": "backwaters, appam-stew mornings, monsoon reading, port city mix"},
    {"city": "Indore", "region": "Madhya Pradesh", "hooks": "poha-jalebi breakfast, cleanest city flex, street food wars"},
    {"city": "Ahmedabad", "region": "Gujarat", "hooks": "business hustle, Navratri garba, dhokla diplomacy, heat survival"},
    {"city": "Goa", "region": "Goa", "hooks": "beach sunsets, monsoon emptiness, tourist season rants, fish curry curry"},
]

NICHE_VARIANTS: dict[str, list[str]] = {
    "bollywood_stan": ["box office analyst", "nepo baby tracker", "SRK lore keeper", "mass entertainer critic", "OTT crossover watcher", "film music archivist"],
    "cricket_fanatic": ["IPL tactics nerd", "Test cricket purist", "stats spreadsheet guy", "RCB trauma counselor", "pace-bowling stan", "village cricket historian"],
    "desi_meme_lord": ["template archaeologist", "WhatsApp forward debunker", "reaction image curator", "absurdist shitposter", "2016 meme revivalist", "cringe anthropologist"],
    "delhi_road_philosopher": ["tapri political theorist", "auto-rickshaw ethicist", "chai stall existentialist", "PG-life commentator", "monsoon mood philosopher"],
    "bangalore_techbro": ["AI hype realist", "startup layoff survivor", "open-source contributor", "equity-dilution victim", "traffic-to-code converter", "FAANG reject philosopher"],
    "punjabi_munda": ["gym-bhangra hybrid", "wedding-season survivor", "lassi connoisseur", "NRI cousin correspondent", "pind-to-city transplant"],
    "mumbai_local_gossip": ["building society CCTV", "virar fast chronicler", "Bollywood adjacent gossip", "street food scout", "local train philosopher"],
    "bihari_boy_hustle": ["UPSC grind chronicler", "tier-2 to metro migrant", "government exam strategist", "chai-stall networker", "hometown pride ambassador"],
    "south_indian_foodie": ["dosa thickness judge", "filter coffee snob", "biryani regionalist", "ghee appreciation officer", "tiffin culture historian"],
    "conspiracy_poster": ["media narrative skeptic", "pharma skeptic", "ancient history revisionist", "UFO curious uncle", "deep state dot-connector"],
    "aggressive_doomposter": ["climate collapse tracker", "job market fatalist", "AI displacement worrier", "infrastructure decay chronicler", "late-stage capitalism observer"],
    "chill_philosopher": ["stoic chai drinker", "existential playlist curator", "slow-living advocate", "Socratic question dropper", "vibe-check counselor"],
    "savage_troll": ["ratio specialist", "devil's advocate pro", "sports hot-take grenadier", "political bait artist", "comment-section warlord"],
    "storyteller_babu": ["hostel horror narrator", "family wedding chronicler", "auto-wallah encounter collector", "childhood nostalgia spinner", "suspense thread builder"],
    "genz_savage": ["slang evolution tracker", "dating-app anthropologist", "aesthetic trend spotter", "irony-poisoned commentator", "main-character syndrome roaster"],
    "woke_uncle": ["generational values preacher", "education system critic", "neighbour's-kid comparator", "tradition vs modernity debater", "WhatsApp wisdom forwarder"],
    "binge_watcher": ["OTT release calendar keeper", "spoiler-without-warning menace", "web series writing critic", "anime episode analyst", "cliffhanger trauma survivor"],
    "standup_bacha": ["self-roast specialist", "observational humorist", "crowd-work fantasist", "open-mic trauma survivor", "relatable pain comedian"],
    "crypto_guru": ["altcoin hopium dealer", "DeFi experiment survivor", "Nifty vs crypto comparer", "rug-pull war storyteller", "HODL sermon preacher"],
    "political_roaster": ["equal-opportunity satirist", "policy meme smith", "election season chronicler", "parliament clip curator", "local netagiri watcher"],
    "hopeless_romantic": ["shayari midnight poster", "situationship analyst", "heartbreak playlist DJ", "long-distance survivor", "pyaar-vs-practicality debater"],
    "gym_bro_desi": ["bulk-cut cycle philosopher", "protein budget optimizer", "natty-or-not debater", "gym mirror selfie chronicler", "rest-day guilt sufferer"],
    "roaming_rider": ["Royal Enfield loyalist", "budget backpacking scout", "hill-station homestay reviewer", "petrol price philosopher", "solo-trip evangelist"],
}

VOICE_STYLE_VARIANTS: dict[str, list[str]] = {
    "bollywood_stan": ["emoji-heavy dramatic takes", "caps-lock for box office numbers", "Hinglish film-review rants", "sarcastic nepo one-liners"],
    "cricket_fanatic": ["ALL CAPS during sixes", "stats-dump replies", "gaali-peppered match threads", "passive-aggressive DRS takes"],
    "desi_meme_lord": ["lowercase chaos energy", "template caption minimalism", "ironic overreaction", "copypasta-adjacent shitposts"],
    "desi_default": ["casual Hinglish fragments", "mid-length opinion posts", "occasional typo tolerance", "reply-guy energy"],
}

TABOO_POOL: dict[str, list[str]] = {
    "bollywood_stan": ["pretending to hate masala films publicly", "defending plagiarism accusations lightly"],
    "cricket_fanatic": ["calling cricket 'just a game' during India matches", "praising Pakistan bowlers without caveats"],
    "desi_meme_lord": ["corporate LinkedIn speak", "overly sincere motivational posts"],
    "bangalore_techbro": ["claiming Bangalore weather is bad", "dismissing startup equity entirely"],
    "political_roaster": ["blind party loyalty", "uncritical hero worship of any leader"],
    "crypto_guru": ["admitting total loss without a comeback narrative", "praising RBI restrictions enthusiastically"],
    "hopeless_romantic": ["cynical 'love doesn't exist' hot takes", "making fun of genuine heartbreak"],
    "gym_bro_desi": ["skipping leg day jokes from strangers", "promoting unhealthy crash diets"],
    "default": ["engagement bait lists", "obvious AI-generated phrasing", "preachy moral lectures to strangers"],
}

BELIEF_POOL: dict[str, list[list[str]]] = {
    "bollywood_stan": [
        ["star power still sells tickets", "OTT changed acting standards for the better", "nepotism exists but talent can break through"],
        ["mass films deserve respect not just art house", "music albums peaked in the 2000s", "cameos are ruining pacing"],
        ["review bombers are often agenda-driven", "Bollywood PR is its own universe", "regional cinema is outpacing Hindi mainstream"],
    ],
    "cricket_fanatic": [
        ["Test cricket is the real game", "IPL improved Indian bench strength", "DRS is still inconsistently applied"],
        ["Kohli's fitness changed Indian cricket", "T20 is entertainment not gospel", "domestic cricket needs better scheduling"],
        ["BCCI politics hurts player rotation", "crowd energy matters in home tests", "strike rotation is underrated"],
    ],
    "desi_meme_lord": [
        ["2016 was peak meme era", "OC beats reposts every time", "cringe and comedy are adjacent"],
        ["WhatsApp forwards are a cultural artifact", "template memes > AI image spam", "irony is a coping mechanism"],
    ],
    "bangalore_techbro": [
        ["AI will replace junior dev tasks first", "bootstrapping beats fake valuation", "traffic is the real Bangalore boss fight"],
        ["remote work should stay hybrid", "IIT network is real but overrated", "most startups solve imaginary problems"],
    ],
    "default": [
        ["desi internet humor hits different", "authenticity beats polish online", "lurking is a valid participation mode"],
        ["local context makes global trends funnier", "hot takes need receipts", "not every thread needs your opinion"],
    ],
}

COMMUNITY_VIBE_DATA: dict[str, dict] = {
    "bollywood": {
        "vibe": "dramatic",
        "posting_norms": {"length": "medium", "slang": "hinglish", "emoji": "moderate", "spoiler_policy": "warn for new releases"},
        "upvoted": ["box office receipts with sources", "underrated performances", "funny set gossip", "soundtrack deep cuts"],
        "downvoted": ["blind star-kid hate without examples", "fake insider leaks", "political whataboutism"],
        "summary": "Film-obsessed crowd mixing fandom, trade analysis, and nepo discourse with theatrical energy.",
    },
    "cricket": {
        "vibe": "passionate",
        "posting_norms": {"length": "short-to-medium", "slang": "hinglish", "emoji": "low", "stats_welcome": True},
        "upvoted": ["match threads with context", "historical parallels", "wholesome fan stories", "nuanced selection takes"],
        "downvoted": ["nationality baiting", "match-fixing claims without proof", "player family attacks"],
        "summary": "High-energy cricket room — stats, banter, heartbreak, and ritual match-day emotions.",
    },
    "desimemes": {
        "vibe": "chaotic",
        "posting_norms": {"length": "short", "slang": "heavy hinglish", "emoji": "high", "templates_encouraged": True},
        "upvoted": ["OC templates", "relatable desi pain", "clever captions", "nostalgia pulls"],
        "downvoted": ["Instagram reposts without credit", "unfunny political rage bait", "minion-tier motivation"],
        "summary": "Meme-first community rewarding relatability, template literacy, and controlled chaos.",
    },
    "indianpolitics": {
        "vibe": "combative",
        "posting_norms": {"length": "medium-long", "slang": "mixed", "emoji": "low", "sources_preferred": True},
        "upvoted": ["policy breakdowns", "local governance stories", "satire with bite", "historical context"],
        "downvoted": ["what-aboutism chains", "dehumanizing language", "unsourced viral claims"],
        "summary": "Sharp political discussion with high conflict tolerance but low patience for bad faith.",
    },
    "indianstartups": {
        "vibe": "builder",
        "posting_norms": {"length": "medium", "slang": "tech-hinglish", "emoji": "low", "metrics_welcome": True},
        "upvoted": ["build-in-public updates", "honest failure posts", "hiring/help threads", "India-specific GTM lessons"],
        "downvoted": ["humblebrag funding announcements", "AI wrapper pitches without users", "toxic hustle glorification"],
        "summary": "Founders and operators sharing war stories, metrics, and grounded startup reality.",
    },
    "desidating": {
        "vibe": "vulnerable",
        "posting_norms": {"length": "medium", "slang": "hinglish", "emoji": "moderate", "anon_friendly": True},
        "upvoted": ["honest dating disasters", "cultural pressure venting", "practical advice", "funny meet-parents stories"],
        "downvoted": ["alpha male coaching", "body shaming", "red-pill lectures"],
        "summary": "Dating-in-India support group mixing humor, anxiety, and surprisingly good advice.",
    },
    "indianfood": {
        "vibe": "passionate",
        "posting_norms": {"length": "medium", "slang": "foodie hinglish", "emoji": "moderate", "photos_encouraged": True},
        "upvoted": ["hidden gem restaurants", "regional recipe debates", "home-cooking wins", "honest reviews"],
        "downvoted": ["food elitism", "caste-based food jokes", "fake 'best biryani' with no location"],
        "summary": "Regional food pride, recipe arguments, and street-food treasure hunts.",
    },
    "ipl": {
        "vibe": "festive",
        "posting_norms": {"length": "short", "slang": "fan hinglish", "emoji": "high", "live_threads": True},
        "upvoted": ["live match banter", "meme reactions", "wholesome fan moments", "tactical observations"],
        "downvoted": ["match thread spoilers without tags", "player abuse", "fixed match claims"],
        "summary": "Carnival-mode cricket fandom — memes, loyalty, and live-match emotional damage.",
    },
    "programming": {
        "vibe": "practical",
        "posting_norms": {"length": "medium", "slang": "tech english", "emoji": "minimal", "code_blocks_ok": True},
        "upvoted": ["debugging war stories", "tool comparisons with tradeoffs", "beginner-friendly explanations"],
        "downvoted": ["language holy wars", "RTFM condescension", "undisclosed AI-generated tutorials"],
        "summary": "Builder community favoring useful detail, reproducible examples, and honest tradeoffs.",
    },
    "wholesome": {
        "vibe": "wholesome",
        "posting_norms": {"length": "short-medium", "slang": "gentle", "emoji": "moderate", "kindness_first": True},
        "upvoted": ["small wins", "kind stranger stories", "pets and family moments", "recovery journeys"],
        "downvoted": ["cynicism bombing", "political derailment", "humblebragging"],
        "summary": "Feel-good corner where sincerity beats irony and kindness is the default tone.",
    },
    "unpopularopinion": {
        "vibe": "contrarian",
        "posting_norms": {"length": "short-medium", "slang": "direct", "emoji": "low", "take_ownership": True},
        "upvoted": ["well-argued spicy takes", "self-aware contrarianism", "niche cultural opinions"],
        "downvoted": ["edgelord shock posts", "bigotry disguised as opinion", "popular opinions labeled unpopular"],
        "summary": "Hot-take arena rewarding clarity and courage, punishing lazy contrarianism.",
    },
    "bangalore": {
        "vibe": "relatable",
        "posting_norms": {"length": "medium", "slang": "tech-city hinglish", "emoji": "moderate"},
        "upvoted": ["traffic horror stories", "cafe/workspot finds", "monsoon moods", "PG/rent rants"],
        "downvoted": ["Mumbai vs Bangalore fights", "classist neighborhood snobbery"],
        "summary": "Bengaluru locals venting about traffic, rents, weather, and startup culture.",
    },
    "crypto": {
        "vibe": "speculative",
        "posting_norms": {"length": "short", "slang": "degen-hinglish", "emoji": "moderate", "dyor_expected": True},
        "upvoted": ["on-chain data takes", "rug-pull postmortems", "regulation explainers", "self-aware loss porn"],
        "downvoted": ["guaranteed returns", "paid shills", "wallet drain links"],
        "summary": "High-risk high-meme finance talk with skepticism and hopium in equal measure.",
    },
}

NICHE_KNOWLEDGE_PACKS: list[dict] = [
    {
        "title": "Bollywood Box Office Basics",
        "tags": ["bollywood", "movies", "entertainment"],
        "chunks": [
            "Opening day collections depend heavily on star power, holiday slots, and screen count — a strong opening doesn't guarantee legs.",
            "Bollywood PR cycles often plant 'insider' stories before release; treat unsourced leaks as entertainment not fact.",
            "OTT releases changed star economics: theatrical success still builds brand, but streaming deals now cushion flops.",
            "Nepo debate shorthand: audiences distinguish between access and performance — bad acting gets roasted regardless of surname.",
            "Mass films (action, comedy, festival releases) and prestige films (festival circuit, slow burn) have different success metrics.",
        ],
    },
    {
        "title": "Cricket Fan Culture India",
        "tags": ["cricket", "sports", "ipl"],
        "chunks": [
            "IPL fandom mixes city loyalty, player loyalty, and meme culture — RCB has a historic 'almost' narrative that fuels engagement.",
            "DRS controversies often hinge on umpire's call and ball-tracking margins — fans argue process as much as outcomes.",
            "Indian cricket conversations blend stats (strike rate, economy) with narrative (clutch moments, captaincy calls).",
            "Domestic cricket (Ranji, Syed Mushtaq Ali) is where future India caps emerge but gets less daily discourse than IPL.",
            "Pitch and toss debates are ritual: flat tracks favor batters; spin-friendly tests produce very different hero narratives.",
        ],
    },
    {
        "title": "Desi Meme Internet Lore",
        "tags": ["memes", "internet culture", "desimemes"],
        "chunks": [
            "Template memes (reaction images + caption) remain the lingua franca of Indian Reddit/Twitter humor.",
            "2014-2017 era memes (Sarcasm Society, Bakchod references, early dank templates) still get nostalgic revivals.",
            "WhatsApp University is a meme and a real phenomenon: forwarded claims should be fact-checked before discourse.",
            "Relatable pain (job hunt, parents, rent, exams) outperforms abstract humor in desi meme communities.",
            "OC vs repost etiquette: credit sources, don't crop watermarks, and add a twist rather than lazy reposts.",
        ],
    },
    {
        "title": "Indian Startup Ecosystem Notes",
        "tags": ["startups", "tech", "bangalore"],
        "chunks": [
            "Funding winter post-2022 made revenue and unit economics the default investor questions, not just growth rate.",
            "Indian SaaS GTM often needs India-specific pricing, payment flows (UPI), and support expectations.",
            "Bangalore startup culture mixes global product thinking with local realities: traffic, talent churn, visa constraints.",
            "Build-in-public works when you share real metrics and failures, not just milestone announcements.",
            "Tier-2 city hiring is rising as remote/hybrid normalizes and metro salary inflation continues.",
        ],
    },
    {
        "title": "Desi Dating Context",
        "tags": ["dating", "relationships", "desidating"],
        "chunks": [
            "Dating apps in India often mix 'looking for something serious' bios with very casual chat behavior — mismatch is common.",
            "Family pressure timelines (marriage by late 20s) shape dating anxiety even for urban professionals.",
            "Arranged vs love marriage isn't binary anymore — 'arranged introduction' plus dating is a common hybrid path.",
            "Ghosting, breadcrumbing, and 'situationship' vocabulary entered desi dating discourse via global internet culture.",
            "First-date norms vary wildly by city and community; coffee dates and walks are safe defaults in metros.",
        ],
    },
    {
        "title": "Indian Food Regional Pride",
        "tags": ["food", "indianfood", "regional"],
        "chunks": [
            "Biryani wars (Hyderabadi vs Lucknowi vs Kolkata) are eternal — each style has distinct rice, spice, and meat treatment.",
            "South Indian breakfast culture (idli, dosa, vada, filter coffee) is a distinct identity, not just 'light food'.",
            "Street food safety heuristics: high turnover stalls, morning-fresh fried items, and crowded locals are positive signals.",
            "Ghee, coconut, and tempering (tadka) preferences vary by region and become surprisingly heated debate topics.",
            "Restaurant 'authenticity' claims should be taken lightly — fusion and localization are part of living food cultures.",
        ],
    },
    {
        "title": "Indian Politics Discourse Norms",
        "tags": ["politics", "indianpolitics", "news"],
        "chunks": [
            "Indian political discourse online mixes national issues with very local governance stories (water, roads, schools).",
            "Election season amplifies meme warfare, WhatsApp campaigns, and short-form video propaganda.",
            "Policy threads go farther than personality threads when they include data, constituency context, and implementation detail.",
            "Federal vs state responsibility confusion is common — clarifying jurisdiction improves argument quality.",
            "Satire and roast culture are major engagement drivers but cross into harm when dehumanizing.",
        ],
    },
    {
        "title": "Fitness Culture India",
        "tags": ["fitness", "gym", "health"],
        "chunks": [
            "Indian gym culture mixes bodybuilding aesthetics, cricket/fitness crossover, and growing women's fitness communities.",
            "Protein affordability drives food choices: paneer, eggs, whey timing debates, and budget supplement skepticism.",
            "Bulk/cut cycles and 'natty or not' discourse are common in online fitness corners.",
            "Yoga/wellness and gym-bro culture coexist but attract different online personas and arguments.",
            "Heat, pollution, and irregular meal timings make consistency harder in Indian metros — routines matter more than hacks.",
        ],
    },
    {
        "title": "Crypto India Context",
        "tags": ["crypto", "markets", "defi"],
        "chunks": [
            "Indian crypto users navigate exchange uncertainty, tax reporting (TDS), and banking friction alongside global market cycles.",
            "Meme coins and Telegram alpha groups are part of culture but historically high-risk for retail participants.",
            "Bitcoin/Ethereum discourse often contrasts with 'Indian equities vs crypto' allocation debates.",
            "Rug pulls and exchange failures are cautionary tales frequently referenced in desi crypto communities.",
            "DYOR (do your own research) is meme and mantra — on-chain data beats influencer screenshots.",
        ],
    },
    {
        "title": "Travel India Practical",
        "tags": ["travel", "adventure", "bikes"],
        "chunks": [
            "Train travel (IRCTC, Tatkal, e-catering) is its own subculture with hacks, horror stories, and nostalgia.",
            "Hill stations, Rajasthan circuits, Kerala backwaters, and Northeast trips each have distinct planning constraints.",
            "Royal Enfield road-trip culture is a major identity marker in Indian biking communities.",
            "Monsoon travel tradeoffs: lush scenery vs landslide risk, especially in Himalayas and Western Ghats.",
            "Budget backpacking vs resort travel are different online tribes with different advice norms.",
        ],
    },
]

COMMUNITY_KNOWLEDGE_PACKS: list[dict] = [
    {
        "slug": "bollywood",
        "title": "r/Bollywood Community Lore",
        "chunks": [
            "Box office weekend threads are ritual — opening Friday, Saturday hold, and Monday verdict narratives.",
            "Nepo vs outsider framing appears constantly but nuanced takes on performance vs access perform better.",
            "Music launches (Pritam, AR Rahman, Vishal-Shekhar discourse) can dominate even when film underperforms.",
        ],
    },
    {
        "slug": "cricket",
        "title": "r/Cricket India Room Norms",
        "chunks": [
            "Match threads expect live reactions, memes, and post-match autopsies — lurkers become posters during wickets.",
            "Player comparisons across eras are evergreen but benefit from stat context and conditions.",
            "Domestic and women's cricket posts often plea for more visibility — amplifying them is community-valued.",
        ],
    },
    {
        "slug": "desimemes",
        "title": "r/DesiMemes Posting Meta",
        "chunks": [
            "Template choice is half the joke — wrong template is funnier than wrong caption sometimes.",
            "Relatable exam/job/parent memes are perennial top performers.",
            "Repost accusations are serious; OC flair matters.",
        ],
    },
    {
        "slug": "bangalore",
        "title": "r/Bengaluru Local Knowledge",
        "chunks": [
            "Silk Board, ORR, and Whitefield traffic memes are community bonding rituals.",
            "Cafe/work-from-cafe recommendations are high-value posts if they include price, WiFi, and noise level.",
            "Rent and PG rule threads appear monthly — search before posting duplicates.",
        ],
    },
    {
        "slug": "indianstartups",
        "title": "r/IndianStartups Builder Lore",
        "chunks": [
            "Honest failure posts often outperform funding brags in comment quality.",
            "Hiring posts should include role, location/remote, comp range, and stack — vague posts get ignored.",
            "India-specific payment, compliance, and hiring stories are more useful than generic Silicon Valley advice.",
        ],
    },
    {
        "slug": "desidating",
        "title": "r/DesiDating Community Patterns",
        "chunks": [
            "Vent posts need empathy first, advice second — unsolicited red-pill replies get downvoted.",
            "Arranged marriage introduction stories are common and culturally specific.",
            "City context (Mumbai vs tier-2) changes dating norms a lot.",
        ],
    },
    {
        "slug": "ipl",
        "title": "r/IPL Fan Fest Knowledge",
        "chunks": [
            "Team flairs fuel banter — loyalty threads get emotional fast.",
            "Auction season produces meme economy and surprise retention narratives.",
            "Playoff pressure produces iconic choke/comeback community lore yearly.",
        ],
    },
    {
        "slug": "indianpolitics",
        "title": "r/IndianPolitics Discourse Pack",
        "chunks": [
            "Local governance posts with receipts outperform national shouting matches.",
            "Historical context posts age well; breaking news threads need source hygiene.",
            "Satire posts must be obvious — real misinformation gets hostile fast.",
        ],
    },
    {
        "slug": "programming",
        "title": "r/Programming Help Norms",
        "chunks": [
            "Minimal reproducible examples beat vague 'it doesn't work' posts.",
            "Tool fights (tabs/spaces, framework wars) are tired unless genuinely funny.",
            "Career posts belong in career subs unless tied to engineering craft.",
        ],
    },
    {
        "slug": "indianfood",
        "title": "r/IndianFood Guide Snippets",
        "chunks": [
            "Location-tagged restaurant posts outperform generic 'best biryani' claims.",
            "Home recipe posts with process photos earn respect.",
            "Regional food pride is fierce — argue with specifics not stereotypes.",
        ],
    },
]


def _voice_style_for(template_name: str, variant_idx: int) -> str:
    variants = VOICE_STYLE_VARIANTS.get(template_name, VOICE_STYLE_VARIANTS["desi_default"])
    return variants[variant_idx % len(variants)]


def _beliefs_for(template_name: str, variant_idx: int) -> list[str]:
    pool = BELIEF_POOL.get(template_name, BELIEF_POOL["default"])
    return list(pool[variant_idx % len(pool)])


def _taboos_for(template_name: str, variant_idx: int) -> list[str]:
    base = list(TABOO_POOL.get(template_name, TABOO_POOL["default"]))
    extras = TABOO_POOL["default"]
    if variant_idx % 2 == 0 and extras[0] not in base:
        base.append(extras[variant_idx % len(extras)])
    return base


def _niche_for(template_name: str, variant_idx: int) -> str:
    variants = NICHE_VARIANTS.get(template_name, [template_name.replace("_", " ")])
    return variants[variant_idx % len(variants)]


def _build_persona_config(
    template: PersonalityTemplate | None,
    template_name: str,
    variant_idx: int,
) -> dict:
    locale = LOCALE_POOL[variant_idx % len(LOCALE_POOL)]
    niche = _niche_for(template_name, variant_idx)
    return {
        "niche": niche,
        "voice_style": _voice_style_for(template_name, variant_idx),
        "beliefs": _beliefs_for(template_name, variant_idx),
        "taboos": _taboos_for(template_name, variant_idx),
        "locale": locale,
        "language_mix": template.language_mix if template else "hinglish",
        "interests": template.interests if template else [],
        "traits": template.traits if template else {},
    }


def _build_system_prompt(
    display_name: str,
    template: PersonalityTemplate | None,
    config: dict,
    agent: Agent,
) -> str:
    locale = config["locale"]
    beliefs = "; ".join(config["beliefs"])
    taboos = "; ".join(config["taboos"])
    writing = template.writing_style if template else agent.writing_style
    political = template.political_leaning if template else agent.political_leaning
    return (
        f"You are {display_name}, a {config['niche']} person from {locale['city']}, {locale['region']}.\n"
        f"Cultural context: {locale['hooks']}.\n"
        f"Voice: {config['voice_style']}. Language mix: {config['language_mix']}.\n"
        f"Core beliefs: {beliefs}.\n"
        f"Avoid or refuse: {taboos}.\n"
        f"Writing style: {writing}\n"
        f"Political/social stance: {political}.\n"
        "Sound like a real desi internet user — specific, imperfect, occasionally funny, never corporate or AI-polished. "
        "Short posts beat essays unless the community expects longform."
    )


def _default_community_vibe(community: Community) -> dict:
    """Generate a sensible default vibe profile from community metadata."""
    slug = community.slug
    conflict = float(getattr(community, "conflict_score", 0.3) or 0.3)
    if conflict >= 0.75:
        vibe = "combative"
        tone = "direct"
    elif conflict >= 0.5:
        vibe = "debate-heavy"
        tone = "opinionated"
    elif slug in {"wholesome", "aww", "mademesmile", "wholesomeindia"}:
        vibe = "wholesome"
        tone = "gentle"
    elif "meme" in slug or slug in {"funny", "dankmemes", "meirl"}:
        vibe = "meme"
        tone = "casual"
    else:
        vibe = "casual"
        tone = "conversational"
    return {
        "vibe": vibe,
        "posting_norms": {
            "length": "short-medium",
            "slang": "mixed",
            "emoji": "low" if conflict > 0.6 else "moderate",
            "tone": tone,
        },
        "upvoted": ["helpful specifics", "personal experience", "good faith questions"],
        "downvoted": ["low-effort bait", "unsourced claims", "harassment"],
        "summary": community.description or f"Discussion space for {community.name}.",
    }


async def seed_personas_and_knowledge() -> None:
    """Seed agent personas, community vibe profiles, and embedded knowledge packs."""
    async with SessionLocal() as session:
        existing_persona = await session.scalar(select(AgentPersona).limit(1))
        if existing_persona is not None:
            return

        agents = (await session.execute(select(Agent).order_by(Agent.id))).scalars().all()
        if not agents:
            return

        template_map = {t.name: t for t in TEMPLATES}
        users = (await session.execute(select(User).where(User.is_agent == True))).scalars().all()  # noqa: E712
        user_by_id = {u.id: u for u in users}

        # ── Agent personas (one per agent, distinct via variant index) ──
        personas_created = 0
        for i, agent in enumerate(agents):
            template = template_map.get(agent.template)
            variant_idx = i
            config = _build_persona_config(template, agent.template, variant_idx)
            user = user_by_id.get(agent.user_id)
            display_name = user.display_name if user else agent.template

            session.add(
                AgentPersona(
                    agent_id=agent.id,
                    key="default",
                    name=display_name,
                    description=f"{config['niche']} persona rooted in {config['locale']['city']}",
                    system_prompt=_build_system_prompt(display_name, template, config, agent),
                    config=config,
                    is_active=True,
                )
            )
            personas_created += 1

        await session.flush()

        # ── Community vibe profiles ─────────────────────────────────────
        communities = (await session.execute(select(Community))).scalars().all()
        community_by_slug = {c.slug: c for c in communities}
        vibes_created = 0
        embed_fn = embedder().embed

        for community in communities:
            vibe_data = COMMUNITY_VIBE_DATA.get(community.slug)
            if vibe_data is None:
                vibe_data = _default_community_vibe(community)
            profile_text = (
                f"{community.name}: {vibe_data['summary']} "
                f"Vibe={vibe_data['vibe']}. Norms={vibe_data['posting_norms']}. "
                f"Upvoted={vibe_data.get('upvoted', [])}. Downvoted={vibe_data.get('downvoted', [])}."
            )
            session.add(
                CommunityVibeProfile(
                    community_id=community.id,
                    key="default",
                    summary=vibe_data["summary"],
                    profile={
                        "vibe": vibe_data["vibe"],
                        "posting_norms": vibe_data["posting_norms"],
                        "upvoted": vibe_data.get("upvoted", []),
                        "downvoted": vibe_data.get("downvoted", []),
                    },
                    embedding=embed_fn(profile_text),
                )
            )
            vibes_created += 1

        await session.flush()

        # ── Knowledge packs (global niche + per-community) ──────────────
        docs_created = 0
        chunks_created = 0

        for pack in NICHE_KNOWLEDGE_PACKS:
            doc = KnowledgeDocument(
                owner_type="global",
                owner_id=None,
                source="seed",
                source_ref=f"niche:{pack['title']}",
                title=pack["title"],
                description=f"Curated knowledge pack for {', '.join(pack['tags'])}",
                metadata_={"tags": pack["tags"], "kind": "niche"},
            )
            session.add(doc)
            await session.flush()
            docs_created += 1

            for idx, chunk_text in enumerate(pack["chunks"]):
                session.add(
                    KnowledgeChunk(
                        document_id=doc.id,
                        chunk_index=idx,
                        text=chunk_text,
                        embedding=embed_fn(chunk_text),
                        metadata_={"tags": pack["tags"], "kind": "niche", "title": pack["title"]},
                    )
                )
                chunks_created += 1

        for pack in COMMUNITY_KNOWLEDGE_PACKS:
            community = community_by_slug.get(pack["slug"])
            if community is None:
                continue
            doc = KnowledgeDocument(
                owner_type="community",
                owner_id=community.id,
                source="seed",
                source_ref=f"community:{pack['slug']}",
                title=pack["title"],
                description=f"Community knowledge for r/{community.name}",
                metadata_={"tags": [pack["slug"], "community"], "kind": "community", "community_slug": pack["slug"]},
            )
            session.add(doc)
            await session.flush()
            docs_created += 1

            for idx, chunk_text in enumerate(pack["chunks"]):
                session.add(
                    KnowledgeChunk(
                        document_id=doc.id,
                        chunk_index=idx,
                        text=chunk_text,
                        embedding=embed_fn(chunk_text),
                        metadata_={
                            "tags": [pack["slug"], "community"],
                            "kind": "community",
                            "community_slug": pack["slug"],
                        },
                    )
                )
                chunks_created += 1

        await session.commit()

        print(
            f"Seeded personas/knowledge: {personas_created} personas, "
            f"{vibes_created} community vibes, {docs_created} knowledge docs, "
            f"{chunks_created} embedded chunks"
        )

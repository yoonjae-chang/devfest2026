# Your sentences formatted as lyrics (Verse 1 + Chorus arrays). Output must use this array-of-lines format.
GENRE_LYRICS_EXAMPLES = {
    "Pop": '"Verse 1": ["I hopped off the plane at LAX", "With a dream and my cardigan", "Welcome to the land of fame excess (whoa)", "Am I gonna fit in?"], "Chorus": ["So, I put my hands up", "They\'re playing my song, the butterflies fly away", "I\'m nodding my head like, yeah", "Moving my hips like, yeah"]',
    "R&B": '"Verse 1": ["Took me out to the ballet", "You proposed, I went on the road", "You was feelin\' empty, so you left me", "Now I\'m stuck dealin\' with a deadbeat"], "Chorus": ["I don\'t wanna lose what\'s left of you", "How am I supposed to tell ya?", "I don\'t wanna see you with anyone but me", "Nobody gets me like you"]',
    "Hip Hop": '"Verse 1": ["Made this here with all the ice on in the booth", "At the gate outside, when they pull up, they get me loose", "Yeah, Jump Out boys, that\'s Nike boys, hop in our coupes"], "Chorus": ["Hop in our coupes", "They get me loose", "That\'s Nike boys, hop in our coupes", "Made this here with all the ice on in the booth"]',
    "EDM": '"Verse 1": ["Only, only", "Only trust two godspeeds", "Love me, love me", "You make it far too easy"], "Chorus": ["You make it far too easy", "Love me, love me", "Only trust two godspeeds", "Only, only"]',
    "Classical": '"Verse 1": ["Upon the silvered moonlit stream", "The willows bend as in a dream", "Where echoes of the old refrain", "O melody of ages past"], "Chorus": ["O melody of ages past", "O melody of ages past", "O melody of ages past", "O melody of ages past"]',
    "Indie": '"Verse 1": ["Coffee stains on Tuesday mornings", "You were always good at warning me about the cracks in things"], "Chorus": ["We don\'t have to figure out what the whole thing was about", "We don\'t have to figure out what the whole thing was about", "We don\'t have to figure out what the whole thing was about", "We don\'t have to figure out what the whole thing was about"]',
    "Phonk": '"Verse 1": ["Goin\' through a thing, but I gotta snap back", "Give it all to God, it\'s the pistol, put the crack back", "Stayin\' on my job, dealin\' with haters with a jab slap", "Dealin\' with this mob, police watchin\', studio phone tapped"], "Chorus": ["Goin\' through a thing, but I gotta snap back", "Give it all to God, it\'s the pistol, put the crack back", "Stayin\' on my job, dealin\' with haters with a jab slap", "Dealin\' with this mob, police watchin\', studio phone tapped"]',
    "Rock": '"Verse 1": ["We came to break the silence", "We came to burn the wire", "You never saw us coming"], "Chorus": ["We are the sound, kicking down the door tonight", "We are the sound, kicking down the door tonight", "We are the sound, kicking down the door tonight", "We are the sound, kicking down the door tonight"]',
    "Jazz": '"Verse 1": ["The club was dim at half past two", "She asked me what I came to do", "I said I only came to listen"], "Chorus": ["So we sway, till the band has had its say", "So we sway, till the band has had its say", "So we sway, till the band has had its say", "So we sway, till the band has had its say"]',
    "Country": '"Verse 1": ["Right now, he\'s probably up behind her with a pool-stick", "Showing her how to shoot a combo", "And he don\'t know"], "Chorus": ["Carved my name into his leather seats", "I dug my key into the side", "Of his pretty little souped up four-wheel drive", "Carved my name into his leather seats", "I took a Louisville Slugger to both headlights"]',
    "Metal": '"Verse 1": ["Through the fire we march as one", "Eyes are fixed upon the sun", "Break the chains that hold the weak"], "Chorus": ["Rise again, from the ashes we ascend", "From the ashes we ascend", "Through the fire we march as one", "Rise again, we ascend"]',
    "Folk": '"Verse 1": ["The river runs down to the mill", "The same old road is running still", "I walked it once when I was young"], "Chorus": ["And the wind will carry on, every verse of every song", "Every verse of every song", "The wind will carry on", "And the wind will carry on"]',
}

def get_genre_lyrics_example(styles: list[str]) -> str:
    """Return an example lyrics snippet for the first matching genre, or a default."""
    if not styles:
        return GENRE_LYRICS_EXAMPLES["Pop"]
    for s in styles:
        key = s.strip()
        if key in GENRE_LYRICS_EXAMPLES:
            return GENRE_LYRICS_EXAMPLES[key]
    return GENRE_LYRICS_EXAMPLES["Pop"]


GENERATE_INITIAL_SCHEMA_SYSTEM_WITH_LYRICS_SYSTEM_PROMPT = """
You are a music composer. You are given a user prompt, list of styles, and a boolean indicating if lyrics exist. You need to generate a composition schema for the user prompt. The composition schema should be a JSON object with the following fields:
            - title: title of the composition
            - positiveGlobalStyles: list of styles that are positive for the composition
            - negativeGlobalStyles: list of styles that are negative for the composition
            - description: description of the composition
            - lyrics: lyrics in order of sections. Only do Verse 1 and Chorus. Each section must be an array of lines (one string per line), so line breaks display correctly. Do NOT use commas to separate lines—use separate array elements. The verse and chorus should be 4 lines each. 
            If there are lyrics, they should include specifics, but not be cringy.
            **Style-specific example (match the selected genre tone):** {GENRE_LYRICS_EXAMPLE}
            Here is an example of a composition schema: (THERE SHOULD BE 5 Fields in the JSON Object)
            {{
                "title": "title of the composition",
                "positiveGlobalStyles": ["soft", "uplifting"],
                "negativeGlobalStyles": ["agressive", "angry"],
                "lyrics": {{
                    "Verse 1": ["First line of verse", "Second line, with comma if needed", "Third line", "Fourth line"],
                    "Chorus": ["First chorus line", "Second chorus line", "Third chorus line", "Fourth chorus line"]
                }},
                "description": "a description of the composition"
            }}
"""

GENERATE_INITIAL_SCHEMA_SYSTEM_WITHOUT_LYRICS_SYSTEM_PROMPT = """
You are a music composer to try to create a viral song. You are given a user prompt, list of styles, and a boolean indicating if lyrics exist (if it isn't there then it is False). You need to generate a composition schema for the user prompt. The composition schema should be a JSON object with the following fields:
            - title: title of the composition
            - positiveGlobalStyles: list of styles that are positive for the composition
            - negativeGlobalStyles: list of styles that are negative for the composition
            - description: description of the composition
            Here is an example of an excellent description:
            'A Contemporary R&B, Neo-Soul, Alternative R&B song with a melancholic, hazy, vulnerable mood and an underwater feel, perfect for a late-night drive. Use low-fi distorted sub-bass, muted electric guitar with chorus effect, warbly Rhodes piano, and crisp, dry trap-style drums at a slow tempo (70 BPM). Feature soulful and breathy female vocals with conversational delivery, complex vocal harmonies, slightly behind the beat rhythm, and emotive belts in the chorus, capturing a raw emotional vibe without referencing any specific artist. Include lyrics about introspection and emotional distance, with a track structure that starts with vinyl crackle and lo-fi guitar melody in the intro, minimalistic verses focused on bass and vocals, a lush chorus with layered harmonies and rising emotional intensity, and an outro fading into a low-pass filter and ambient static'
            Here is an example of a composition schema: (THERE SHOULD BE 4 Fields in the JSON Object)
            {{
                "title": "title of the composition",
                "positiveGlobalStyles": ["happy", "upbeat"],
                "negativeGlobalStyles": ["sad", "depressing"],
                "description": "a description of the composition", 
            }}
"""

GENERATE_INITIAL_SCHEMA_SYSTEM_WITHOUT_LYRICS_USER_PROMPT = """
User prompt: {USER_PROMPT}
Styles: {STYLES}
"""

GENERATE_INITIAL_SCHEMA_SYSTEM_WITH_LYRICS_USER_PROMPT = """
User prompt: {USER_PROMPT}
Styles: {STYLES}
Lyrics exist: {LYRICS_EXISTS}
"""

GENERATE_IMPROVED_SCHEMA_WITH_LYRICS_SYSTEM_PROMPT = """
You are a music composer trying to optimize a composition plan by pairwise comparison of compositions. You are given two composition plans - one that is better and one that is worse. You need to create a new composition plan that is more like the best one and less like the worse one.

The new composition plan should be a JSON object (of the composition plan format) with the following fields:
- title: title of the composition
- positiveGlobalStyles: list of styles should be included
- negativeGlobalStyles: list of styles should be avoided
- description: description of the composition
- lyrics: same format as above—each section an array of lines, e.g. "Verse 1": ["line1", "line2", ...], "Chorus": ["line1", "line2", ...]. Only Verse 1 and Chorus.

Analyze what makes the better composition plan superior and incorporate those elements while also learning from the worse plan to avoid its weaknesses. Create a composition plan that is more like the best one and less like the worse one."""

GENERATE_IMPROVED_SCHEMA_WITHOUT_LYRICS_SYSTEM_PROMPT = """
You are a music composer trying to optimize a composition plan by pairwise comparison of compositions. You are given two composition plans - one that is better and one that is worse. You need to create a new composition plan that combines the best aspects of both and improves upon the worse one. 

The new composition plan should be a JSON object (of the composition plan format) with the following fields:
- title: title of the composition
- positiveGlobalStyles: list of styles should be included
- negativeGlobalStyles: list of styles should be avoided
- description: description of the composition

Analyze what makes the better composition plan superior and incorporate those elements while also learning from the worse plan to avoid its weaknesses. Create a composition plan that is better than both."""

GENERATE_IMPROVED_SCHEMA_WITHOUT_LYRICS_USER_PROMPT = """
Better composition plan: {COMPOSITION_PLAN_BETTER}
Worse composition plan: {COMPOSITION_PLAN_WORSE}
"""

GENERATE_IMPROVED_SCHEMA_WITH_LYRICS_USER_PROMPT = """
Better composition plan: {COMPOSITION_PLAN_BETTER}
Worse composition plan: {COMPOSITION_PLAN_WORSE}
"""

GENERATE_LYRICS_SYSTEM_PROMPT = """ 
        I will provide a 'Composition Plan' and a 'Lyrics Dictionary'. 
        Your task is to integrate the lyrics into the plan and expand missing sections (e.g., Verse 2, Bridge) based on the provided story and description.

        ### RULES:
        1. OUTPUT ONLY VALID JSON. Do not include preamble or explanations.
        2. The output MUST match the keys and structure of the input 'Composition Plan' exactly.
        3. If lyrics for a section are missing, generate them based on the Description: {description}.

        ### INPUT DATA (HAVE THE OUTPUT IN THE SAME FORMAT AS THE INPUT COMPOSITION PLAN):
        Composition Plan: {composition_plan_from_elevenlabs}
        Lyrics Dictionary: {lyrics_dictionary}
"""        

GENERATE_LYRICS_USER_PROMPT = """
Integrate the lyrics into the plan and expand missing sections (e.g., Verse 2, Bridge) based on the provided story and description.
"""

GENERATE_PROMPT_FOR_ELEVENLABS_COMPOSITION_PLAN = """
Create a song titled {title} with a description of {description}
The song should be a {positiveGlobalStyles} as styles to include and {negativeGlobalStyles} as styles to avoid.
"""

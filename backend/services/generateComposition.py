def generate_composition_plan(prompt: str, length_ms: int):
    system_prompt = f"""
You output STRICT JSON.
Generate a music composition plan INCLUDING lyrics.
Lyrics must be placed directly in sections[*].lines.
Do NOT include copyrighted material.
Total duration of all sections must sum to {length_ms} ms.

Schema:
{{
  "composition_plan": {{
    "positiveGlobalStyles": [],
    "negativeGlobalStyles": [],
    "sections": [
      {{
        "sectionName": "",
        "positiveLocalStyles": [],
        "negativeLocalStyles": [],
        "durationMs": 0,
        "lines": []
      }}
    ]
  }}
}}
"""

    response = openai.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
    )

    return json.loads(response.choices[0].message.content)["composition_plan"]

def generate_music_from_plan(plan: dict):
    track = elevenlabs.music.compose_detailed(
        composition_plan=plan
    )
    return track

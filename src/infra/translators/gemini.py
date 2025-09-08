import json
from dataclasses import dataclass, field
from typing import BinaryIO

from google.genai import Client, types

from src.core.translations import Language, TranslatorError, TranslatorResponse


@dataclass
class GeminiTranslator:
    api_key: str

    model: str = field(default="gemini-2.5-flash")
    client: Client = field(init=False)

    def __post_init__(self) -> None:
        self.client = Client(api_key=self.api_key)

    def translate(
        self,
        audio: BinaryIO,
        from_language: Language,
        to_language: Language,
    ) -> TranslatorResponse:
        response = self.client.models.generate_content(
            model=self.model,
            contents=[
                TRANSLATE_PROMPT.format(
                    from_language=from_language.value,
                    to_language=to_language.value,
                ),
                types.Part.from_bytes(
                    data=audio.read(),
                    mime_type="audio/wav",
                ),
            ],
        )

        if not response.text:
            raise TranslatorError("Can't translate audio clip currently")

        cleaned = response.text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.removeprefix("```")
        if cleaned.endswith("```"):
            cleaned = cleaned.removesuffix("```")
        if cleaned.startswith("json"):
            cleaned = cleaned.removeprefix("json")
        cleaned = cleaned.strip()

        formatted = json.loads(cleaned)
        return TranslatorResponse(
            original_text=formatted["original"],
            translated_text=formatted["translated"],
        )


class FakeGeminiTranslator:
    def translate(
        self,
        audio: BinaryIO,  # noqa: ARG002
        from_language: Language,  # noqa: ARG002
        to_language: Language,  # noqa: ARG002
    ) -> TranslatorResponse:
        return TranslatorResponse(
            original_text="original",
            translated_text="translated",
        )


TRANSLATE_PROMPT = """
You are an expert translator from {from_language} to {to_language}.
You can capture all the nuances of both languages to accurately
translate the text.
You must understand the audio in order to translate it.

Your output should only be the original text and the translated text
in a json format like this:

{{
    "original": "Original text here.",
    "translated": "Translated text here."
}}

DO NOT output any other thing other than this json.
DO NOT use any formatting, just pure plain json format.

"""

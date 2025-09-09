import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import BinaryIO

from google.genai import Client, types

from src.core.translations import (
    Language,
    OCRError,
    TranslatorError,
    TranslatorResponse,
)


@dataclass
class GeminiClient:
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
        prompt = types.Part.from_text(
            text=TRANSLATE_PROMPT.format(
                from_language=from_language.value,
                to_language=to_language.value,
            )
        )
        audio_part = types.Part.from_bytes(
            data=audio.read(),
            mime_type="audio/wav",
        )
        contents = types.Content(parts=[prompt, audio_part])
        response = self.client.models.generate_content(
            model=self.model,
            contents=contents,
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

    def generate_ocr(self, image: Path) -> str:
        with open(image, "rb") as f:
            image_bytes = f.read()

        response = self.client.models.generate_content(
            model=self.model,
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/png",
                ),
                IMAGE_OCR_PROMPT,
            ],
        )

        if not response.text:
            raise OCRError("Can't OCR the image currently.")

        return response.text


class FakeGeminiClient:
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

    def generate_ocr(self, image: Path) -> str:  # noqa: ARG002
        return "ocr text"


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

IMAGE_OCR_PROMPT = """
OCR this image and list all the detected words/phrases.
Do not write anything else.
"""

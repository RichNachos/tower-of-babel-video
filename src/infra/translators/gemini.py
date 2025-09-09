import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import BinaryIO

from google.genai import Client, types

from src.core.translations import (
    Language,
    OCRError,
    Translation,
    TranslatorError,
    TranslatorResponse,
    TTSError,
)


@dataclass
class GeminiClient:
    api_key: str

    model: str = field(default="gemini-2.5-flash")
    tts_model: str = field(default="gemini-2.5-flash-preview-tts")
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

        prompt = types.Part.from_text(text=IMAGE_OCR_PROMPT)
        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type="image/png",
        )

        contents = types.Content(parts=[prompt, image_part])
        response = self.client.models.generate_content(
            model=self.model,
            contents=contents,
        )

        if not response.text:
            raise OCRError("Can't OCR the image currently.")

        return response.text

    def text_to_speech(self, translation: Translation) -> bytes:
        response = self.client.models.generate_content(
            model=self.tts_model,
            contents=TTS_PROMPT.format(
                language=translation.to_language,
                text=translation.translated_text,
            ),
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name="Kore",
                        )
                    )
                ),
            ),
        )
        if (
            not response.candidates
            or not response.candidates[0].content
            or not response.candidates[0].content.parts
            or not response.candidates[0].content.parts[0].inline_data
            or not response.candidates[0].content.parts[0].inline_data.data
        ):
            raise TTSError("Can't generate speech audio currently.")

        return response.candidates[0].content.parts[0].inline_data.data


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

    def text_to_speech(self, translation: Translation) -> bytes:  # noqa: ARG002
        return b""


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

TTS_PROMPT = """
Say the following text moderately cheerfully in the {language} language:

{text}
"""

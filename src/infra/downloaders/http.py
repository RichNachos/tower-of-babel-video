from dataclasses import dataclass
from pathlib import Path

import httpx

from src.core.videos import VideoDownloadError, VideoType


@dataclass
class HttpVideoDownloader:
    def download_video(
        self,
        url: str,
        local_path: Path,
        video_id: str,
        video_type: VideoType = VideoType.MP4,
    ) -> None:
        local_path.mkdir(parents=True, exist_ok=True)

        filename = f"{video_id}.{video_type.value}"
        output_file_path = local_path / filename

        try:
            with httpx.stream(
                "GET", url, follow_redirects=True, timeout=60.0
            ) as response:
                response.raise_for_status()

                with open(output_file_path, "wb") as f:
                    for chunk in response.iter_bytes():
                        f.write(chunk)

        except httpx.HTTPStatusError as e:
            raise VideoDownloadError(
                f"HTTP error during download from {url}: "
                f"{e.response.status_code} {e.response.reason_phrase}"
            ) from e
        except httpx.RequestError as e:
            raise VideoDownloadError(
                f"Network error during download from {url}: {e}"
            ) from e
        except OSError as e:
            raise VideoDownloadError(
                f"File system error while saving video to {output_file_path}: {e}"
            ) from e
        except Exception as e:
            raise VideoDownloadError(
                f"An unexpected error occurred during download: {e}"
            ) from e

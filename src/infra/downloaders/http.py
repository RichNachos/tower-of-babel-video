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
        """
        Downloads a video from the specified URL and saves it to a local file.

        Args:
            url (str): The URL of the video to download.
            local_path (Path): The directory where the video should be saved.
            video_id (str): A unique ID for the video, used as part of the filename.
            video_type (VideoType): The expected format of the video (e.g., MP4).

        Raises:
            VideoDownloadError: If the download fails for any reason (e.g., network error,
                                bad response status, file write error).
        """
        # Ensure the local_path directory exists
        local_path.mkdir(parents=True, exist_ok=True)

        # Construct the full filename
        filename = f"{video_id}.{video_type.value}"
        output_file_path = local_path / filename

        print(f"Attempting to download video from: {url}")
        print(f"Saving to: {output_file_path}")

        try:
            # Use httpx.stream for efficient downloading of large files
            # follow_redirects=True ensures it handles HTTP redirects automatically
            with httpx.stream(
                "GET", url, follow_redirects=True, timeout=60.0
            ) as response:
                response.raise_for_status()  # Raises HTTPStatusError for 4xx/5xx responses

                # Open the local file in binary write mode
                with open(output_file_path, "wb") as f:
                    for chunk in response.iter_bytes():
                        f.write(chunk)
            print(f"Successfully downloaded video to {output_file_path}")

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

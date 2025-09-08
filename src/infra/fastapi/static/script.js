document.addEventListener('DOMContentLoaded', () => {
    // MDC component initialization
    const textFields = document.querySelectorAll('.mdc-text-field');
    textFields.forEach(textField => mdc.textField.MDCTextField.attachTo(textField));

    const buttons = document.querySelectorAll('.mdc-button');
    buttons.forEach(button => mdc.ripple.MDCRipple.attachTo(button));

    // DOM Elements
    const videoUrlInput = document.getElementById('video-url');
    const processVideoButton = document.getElementById('process-video');
    const videoPlayer = document.getElementById('video-player');
    const videoPlayerDisplay = document.getElementById('video-player-display');
    const noVideoMessage = document.getElementById('no-video-message');

    const durationSpan = document.getElementById('duration');
    const heightSpan = document.getElementById('height');
    const playAudioButton = document.getElementById('play-audio');
    const downloadAudioButton = document.getElementById('download-audio');
    const translationP = document.getElementById('translation');
    const speakTranslationButton = document.getElementById('speak-translation');
    const firstFrameImg = document.getElementById('first-frame');
    const downloadFrameButton = document.getElementById('download-frame');
    const ocrOutputDiv = document.getElementById('ocr-output');

    // Helper to display messages in the video player area
    function displayVideoPlayerMessage(message, isError = false) {
        noVideoMessage.textContent = message;
        noVideoMessage.style.color = isError ? 'red' : '#757575';
        noVideoMessage.style.display = 'block';
        videoPlayer.style.display = 'none';
        videoPlayer.src = ''; // Clear video source
    }

    // Function to update the UI with video details
    async function loadVideoDetails(video) {
        if (!video) {
            displayVideoPlayerMessage('No video loaded. Upload one!', false);
            // Clear other fields
            durationSpan.textContent = 'N/A';
            heightSpan.textContent = 'N/A';
            translationP.textContent = 'N/A';
            firstFrameImg.src = '';
            firstFrameImg.style.display = 'none';
            ocrOutputDiv.innerHTML = 'No text detected yet.';
            videoUrlInput.value = '';
            // Update the floating label state
            const videoUrlTextField = mdc.textField.MDCTextField.attachTo(videoUrlInput.closest('.mdc-text-field'));
            videoUrlTextField.value = '';
            videoUrlTextField.layout();
            return;
        }

        // Hide "No video" message and show player
        noVideoMessage.style.display = 'none';
        videoPlayer.style.display = 'block';

        // Construct the URL to the static video file
        const videoFileUrl = `/data/videos/${video.id}.${video.video_type.toLowerCase()}`;
        console.log("Loading video file from:", videoFileUrl);
        videoPlayer.src = videoFileUrl;
        videoPlayer.load(); // Load the new video source
        videoPlayer.play(); // Attempt to autoplay

        // NOTE: The backend '/videos' endpoints do not return duration or height directly.
        // For a real application, you would either:
        // 1. Store these in the Video model and return them from the API.
        // 2. Have a separate API endpoint to get detailed metadata.
        // 3. Extract them client-side using a <video> element (which is complex).
        // For now, we will use the MOCK_API for these or leave as N/A.
        try {
            const videoDetails = await MOCK_API.getVideoDetails(video.original_url);
            durationSpan.textContent = videoDetails.duration;
            heightSpan.textContent = videoDetails.height;
        } catch (error) {
            console.error("Could not fetch video details from mock API:", error);
            durationSpan.textContent = 'N/A';
            heightSpan.textContent = 'N/A';
        }

        // MOCK_API calls for first frame and OCR
        try {
            const firstFrame = await MOCK_API.getFirstFrame(video.original_url);
            firstFrameImg.src = URL.createObjectURL(firstFrame);
            firstFrameImg.style.display = 'block';

            const ocrResult = await MOCK_API.performOcr(firstFrame);
            ocrOutputDiv.innerHTML = ocrResult.join('<br>') || 'No text detected.';
        } catch (error) {
            console.error("Error fetching first frame or performing OCR:", error);
            firstFrameImg.src = '';
            firstFrameImg.style.display = 'none';
            ocrOutputDiv.innerHTML = 'Error or No text detected.';
        }

        // Update the video URL input and its floating label
        videoUrlInput.value = video.original_url;
        const videoUrlTextField = mdc.textField.MDCTextField.attachTo(videoUrlInput.closest('.mdc-text-field'));
        videoUrlTextField.value = video.original_url;
        videoUrlTextField.layout(); // Make label float if value is set
    }

    // Function to load the last video from the backend
    async function loadLastVideo() {
        console.log("Attempting to load last video...");
        try {
            const response = await fetch('/videos/last');
            if (response.ok) {
                const video = await response.json();
                console.log("Last video loaded:", video);
                await loadVideoDetails(video);
            } else if (response.status === 400) { // NoVideosError from backend
                console.log("No last video found.");
                await loadVideoDetails(null); // Clear UI and show "No video" message
            } else {
                const errorData = await response.json();
                console.error("Error loading last video:", errorData);
                displayVideoPlayerMessage(`Error loading last video: ${errorData.detail || response.statusText}`, true);
            }
        } catch (error) {
            console.error("Network error fetching last video:", error);
            displayVideoPlayerMessage('Network error. Could not load last video.', true);
        }
    }

    // Initial load when page is ready
    loadLastVideo();

    // Event listener for the "Process Video" button
    processVideoButton.addEventListener('click', async () => {
        const url = videoUrlInput.value;
        if (!url) {
            alert('Please paste a video URL.');
            return;
        }

        console.log("Uploading video:", url);
        try {
            const response = await fetch('/videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ video_url: url }),
            });

            if (response.ok) {
                const newVideo = await response.json();
                console.log("Video uploaded and processed:", newVideo);
                await loadVideoDetails(newVideo);
            } else {
                const errorData = await response.json();
                console.error("Error uploading video:", errorData);
                alert(`Failed to upload video: ${errorData.detail || response.statusText}`);
                await loadVideoDetails(null); // Clear UI on upload failure
            }
        } catch (error) {
            console.error("Network error during video upload:", error);
            alert('Network error during video upload.');
            await loadVideoDetails(null); // Clear UI on network error
        }
    });


    // MOCK_API for features not directly implemented by provided backend endpoints
    const MOCK_API = {
        getVideoDetails: (url) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Getting video details for", url);
            // Simulate some details
            resolve({ duration: 125.7, height: 1080, width: 1920 });
        }, 500)),
        getAudioClip: (url) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Getting audio clip for", url);
            // Return a dummy audio blob
            const dummyAudioData = new Uint8Array([0x4F, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00]); // Tiny invalid ogg header
            resolve(new Blob([dummyAudioData], { type: 'audio/ogg' }));
        }, 500)),
        translateText: (text) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Translating text:", text);
            resolve("Hola, este es un texto de ejemplo en español.");
        }, 500)),
        textToSpeech: (text) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Text to speech for:", text);
            // Return a dummy Audio object.
            resolve(new Audio());
        }, 500)),
        getFirstFrame: (url) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Getting first frame for", url);
            // Return a dummy image blob (e.g., a 1x1 transparent GIF)
            const dummyImageData = "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
            const byteCharacters = atob(dummyImageData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            resolve(new Blob([byteArray], { type: 'image/gif' }));
        }, 500)),
        performOcr: (image) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Performing OCR on image.");
            resolve(["Mock OCR Result 1", "Mock OCR Result 2"]);
        }, 500)),
    };


    // Event listeners for other buttons (using MOCK_API as no backend endpoints provided for these)
    playAudioButton.addEventListener('click', async () => {
        // This should ideally play audio related to the *currently loaded* video
        const audioClip = await MOCK_API.getAudioClip('current_video_audio_url_mock');
        const audio = new Audio(URL.createObjectURL(audioClip));
        audio.currentTime = 0;
        audio.play();
        console.log("Playing mock audio.");
    });

    downloadAudioButton.addEventListener('click', async () => {
        const audioClip = await MOCK_API.getAudioClip('current_video_audio_url_mock');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(audioClip);
        a.download = 'audio-clip.ogg';
        a.click();
        console.log("Downloading mock audio.");
    });

    speakTranslationButton.addEventListener('click', async () => {
        const textToTranslate = ocrOutputDiv.textContent !== 'No text detected yet.' ? ocrOutputDiv.textContent : "Some default English text";
        const translation = await MOCK_API.translateText(textToTranslate);
        translationP.textContent = translation;
        const audio = await MOCK_API.textToSpeech(translation);
        audio.play();
        console.log("Speaking mock translation.");
    });

    downloadFrameButton.addEventListener('click', async () => {
        const currentFrameSrc = firstFrameImg.src;
        if (currentFrameSrc && currentFrameSrc !== window.location.href + '#') {
            const a = document.createElement('a');
            a.href = currentFrameSrc;
            a.download = 'first-frame.png';
            a.click();
            console.log("Downloading current first frame.");
        } else {
            alert("No frame image available to download.");
        }
    });
});
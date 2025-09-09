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
    const noVideoMessage = document.getElementById('no-video-message');
    const loadingBar = document.getElementById('loading-bar');

    // Video Information Card elements
    const videoIdSpan = document.getElementById('video-id');
    const originalUrlLink = document.getElementById('original-url');
    const videoTypeSpan = document.getElementById('video-type');
    const uploadedAtSpan = document.getElementById('uploaded-at');
    const durationSpan = document.getElementById('duration');
    const widthSpan = document.getElementById('width');
    const heightSpan = document.getElementById('height');

    // Audio Controls
    const audioSegmentVideoIdInput = document.getElementById('audio-segment-video-id');
    const fromSecondsInput = document.getElementById('from-seconds');
    const toSecondsInput = document.getElementById('to-seconds');
    const playAudioButton = document.getElementById('play-audio');
    const downloadAudioButton = document.getElementById('download-audio');
    const translateAudioButton = document.getElementById('translate-audio-button');

    // Other Cards
    const translationP = document.getElementById('translation');
    const speakTranslationButton = document.getElementById('speak-translation');
    const firstFrameImg = document.getElementById('first-frame'); // This is now for the static thumbnail
    const downloadFrameButton = document.getElementById('download-frame'); // This is now for downloading the thumbnail
    const ocrOutputDiv = document.getElementById('ocr-output');

    // Sidebar Elements
    const videoListTbody = document.getElementById('video-list-tbody');
    const prevPageButton = document.getElementById('prev-page-button');
    const nextPageButton = document.getElementById('next-page-button');
    const pageInfoSpan = document.getElementById('page-info');
    const translationListTbody = document.getElementById('translation-list-tbody');

    // Translation Modal Elements
    const translationModalElement = document.getElementById('translation-modal');
    const translationModal = mdc.dialog.MDCDialog.attachTo(translationModalElement);
    const modalOriginalText = document.getElementById('modal-original-text');
    const modalTranslatedText = document.getElementById('modal-translated-text');
    const modalSegmentTime = document.getElementById('modal-segment-time');


    // Global State
    let allVideos = [];
    let currentPage = 1;
    const videosPerPage = 5; // Number of videos to show per page in the sidebar
    let currentLoadedVideo = null; // Store the currently loaded video object
    let allTranslationsForVideo = []; // Store translations for the current video

    // --- Constants for Translation ---
    const FROM_LANGUAGE = 'EN'; // As per API definition (Language enum is EN, ES etc.)
    const TO_LANGUAGE = 'ES';
    // -------------------------------------------------


    // --- Loading & Button State Management ---
    function showLoading() {
        loadingBar.style.display = 'block';
        mdc.linearProgress.MDCLinearProgress.attachTo(loadingBar).open();
    }

    function hideLoading() {
        loadingBar.style.display = 'none';
        mdc.linearProgress.MDCLinearProgress.attachTo(loadingBar).close();
    }

    function disableProcessButton() {
        processVideoButton.disabled = true;
        processVideoButton.classList.add('mdc-button--disabled');
    }

    function enableProcessButton() {
        processVideoButton.disabled = false;
        processVideoButton.classList.remove('mdc-button--disabled');
    }

    // --- Helper to display messages in the video player area ---
    function displayVideoPlayerMessage(message, isError = false) {
        noVideoMessage.textContent = message;
        noVideoMessage.style.color = isError ? 'red' : '#757575';
        noVideoMessage.style.display = 'block';
        videoPlayer.style.display = 'none';
        videoPlayer.src = ''; // Clear video source
    }

    // --- Function to update the UI with video details ---
    async function loadVideoDetails(video) {
        currentLoadedVideo = video; // Set the globally loaded video

        if (!video) {
            displayVideoPlayerMessage('No video loaded. Upload one!', false);
            // Clear all video information fields
            videoIdSpan.textContent = 'N/A';
            originalUrlLink.textContent = 'N/A';
            originalUrlLink.href = '#';
            videoTypeSpan.textContent = 'N/A';
            uploadedAtSpan.textContent = 'N/A';
            durationSpan.textContent = 'N/A';
            widthSpan.textContent = 'N/A';
            heightSpan.textContent = 'N/A';

            translationP.textContent = 'N/A';
            firstFrameImg.src = ''; // Clear thumbnail source
            firstFrameImg.style.display = 'none'; // Hide thumbnail
            ocrOutputDiv.innerHTML = 'No text detected yet.';
            videoUrlInput.value = '';
            const videoUrlTextField = mdc.textField.MDCTextField.attachTo(videoUrlInput.closest('.mdc-text-field'));
            videoUrlTextField.value = '';
            videoUrlTextField.layout();

            // Disable all action buttons and audio inputs if no video is loaded
            playAudioButton.disabled = true;
            downloadAudioButton.disabled = true;
            translateAudioButton.disabled = true;
            downloadFrameButton.disabled = true; // Disable thumbnail download button
            speakTranslationButton.disabled = true;
            audioSegmentVideoIdInput.value = '';
            fromSecondsInput.disabled = true;
            toSecondsInput.disabled = true;

            // Clear translations list
            allTranslationsForVideo = [];
            renderTranslationsList();

            return;
        }

        // Enable all action buttons and audio inputs
        playAudioButton.disabled = false;
        downloadAudioButton.disabled = false;
        translateAudioButton.disabled = false;
        downloadFrameButton.disabled = false; // Enable thumbnail download button
        speakTranslationButton.disabled = false;
        fromSecondsInput.disabled = false;
        toSecondsInput.disabled = false;


        // Hide "No video" message and show player
        noVideoMessage.style.display = 'none';
        videoPlayer.style.display = 'block';

        // Construct the URL to the static video file
        const videoFileUrl = `/data/videos/${video.id}.${video.video_type.toLowerCase()}`;
        console.log("Loading video file from:", videoFileUrl);
        videoPlayer.src = videoFileUrl;
        videoPlayer.load(); // Load the new video source
        videoPlayer.play(); // Attempt to autoplay

        // Populate basic video information
        videoIdSpan.textContent = video.id;
        originalUrlLink.textContent = new URL(video.original_url).hostname;
        originalUrlLink.href = video.original_url;
        videoTypeSpan.textContent = video.video_type.toUpperCase();
        uploadedAtSpan.textContent = new Date(video.created_at).toLocaleString(); // Nicer date format

        // Get metadata directly from the video object (from updated API)
        if (video.metadata) {
            durationSpan.textContent = video.metadata.duration_seconds !== null && video.metadata.duration_seconds !== undefined ? `${video.metadata.duration_seconds.toFixed(1)}` : 'N/A';
            widthSpan.textContent = video.metadata.width !== null && video.metadata.width !== undefined ? video.metadata.width : 'N/A';
            heightSpan.textContent = video.metadata.height !== null && video.metadata.height !== undefined ? video.metadata.height : 'N/A';
            
            // Set audio segment inputs based on video metadata or defaults
            audioSegmentVideoIdInput.value = video.id;
            fromSecondsInput.value = 30; // Default start
            toSecondsInput.value = 45; // Default end
            // Adjust toSeconds if default is beyond video duration
            if (toSecondsInput.value > video.metadata.duration_seconds) {
                toSecondsInput.value = Math.floor(video.metadata.duration_seconds);
            }
            if (fromSecondsInput.value >= toSecondsInput.value && video.metadata.duration_seconds > 0) {
                 fromSecondsInput.value = 0; // If range is invalid, reset to 0
                 toSecondsInput.value = Math.min(15, Math.floor(video.metadata.duration_seconds)); // Default to 15s or total duration
            }

        } else {
            durationSpan.textContent = 'N/A';
            widthSpan.textContent = 'N/A';
            heightSpan.textContent = 'N/A';
            audioSegmentVideoIdInput.value = '';
            fromSecondsInput.value = 0;
            toSecondsInput.value = 0;
        }

        // Update MDC text field states for the new audio controls
        mdc.textField.MDCTextField.attachTo(audioSegmentVideoIdInput.closest('.mdc-text-field')).layout();
        mdc.textField.MDCTextField.attachTo(fromSecondsInput.closest('.mdc-text-field')).layout();
        mdc.textField.MDCTextField.attachTo(toSecondsInput.closest('.mdc-text-field')).layout();


        // --- NEW: Load Video Thumbnail (firstFrameImg is now the thumbnail) ---
        const thumbnailFileUrl = `/data/thumbnails/${video.id}.png`;
        firstFrameImg.src = thumbnailFileUrl;
        firstFrameImg.style.display = 'block';
        console.log("Loading thumbnail from:", thumbnailFileUrl);

        // MOCK_API call for OCR (runs on the displayed thumbnail image)
        try {
            // We use the thumbnail directly for OCR
            const ocrResult = await MOCK_API.performOcr(firstFrameImg.src); // Pass src or a Blob from it
            ocrOutputDiv.innerHTML = ocrResult.join('<br>') || 'No text detected.';
        } catch (error) {
            console.error("Error performing OCR:", error);
            ocrOutputDiv.innerHTML = 'Error or No text detected.';
        }
        // --- END NEW THUMBNAIL/OCR ---

        // Update the video URL input and its floating label
        videoUrlInput.value = video.original_url;
        const videoUrlTextField = mdc.textField.MDCTextField.attachTo(videoUrlInput.closest('.mdc-text-field'));
        videoUrlTextField.value = video.original_url;
        videoUrlTextField.layout();
        
        // Fetch translations for the loaded video
        await fetchTranslationsForVideo(video.id);
    }

    // --- Function to render video list in sidebar ---
    function renderVideoList() {
        videoListTbody.innerHTML = ''; // Clear existing rows

        const totalPages = Math.ceil(allVideos.length / videosPerPage);
        const startIndex = (currentPage - 1) * videosPerPage;
        const endIndex = startIndex + videosPerPage;
        const videosToDisplay = allVideos.slice(startIndex, endIndex);

        if (videosToDisplay.length === 0) {
            videoListTbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No videos available.</td></tr>';
        } else {
            videosToDisplay.forEach(video => {
                const row = videoListTbody.insertRow();
                row.style.cursor = 'pointer'; // Make rows clickable
                row.onclick = () => loadVideoDetails(video); // Load video on click

                const idCell = row.insertCell(0);
                idCell.textContent = video.id.substring(0, 8) + '...'; // Truncate ID

                const urlCell = row.insertCell(1);
                urlCell.textContent = new URL(video.original_url).hostname; // Show hostname for brevity
                urlCell.title = video.original_url; // Full URL on hover

                const dateCell = row.insertCell(2);
                dateCell.textContent = new Date(video.created_at).toLocaleDateString();
            });
        }

        // Update pagination controls
        pageInfoSpan.textContent = `Page ${totalPages > 0 ? currentPage : 0} of ${totalPages}`;
        prevPageButton.disabled = currentPage <= 1;
        nextPageButton.disabled = currentPage >= totalPages;
    }

    // --- Function to render translations list in sidebar ---
    function renderTranslationsList() {
        translationListTbody.innerHTML = ''; // Clear existing rows

        if (allTranslationsForVideo.length === 0) {
            translationListTbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No translations for this video.</td></tr>';
        } else {
            allTranslationsForVideo.forEach(translation => {
                const row = translationListTbody.insertRow();
                row.style.cursor = 'pointer';
                row.onclick = () => openTranslationModal(translation); // Open modal on click

                const idCell = row.insertCell(0);
                idCell.textContent = translation.id.substring(0, 8) + '...';

                const langCell = row.insertCell(1);
                langCell.textContent = `${translation.from_language}/${translation.to_language}`;

                const timeCell = row.insertCell(2);
                timeCell.textContent = `${translation.from_seconds.toFixed(0)}-${translation.to_seconds.toFixed(0)}s`;
            });
        }
    }

    // --- Functions for Translation Modal ---
    function openTranslationModal(translation) {
        modalOriginalText.textContent = translation.original_text;
        modalTranslatedText.textContent = translation.translated_text;
        modalSegmentTime.textContent = `${translation.from_seconds.toFixed(1)}s to ${translation.to_seconds.toFixed(1)}s`;
        translationModal.open();
    }

    function closeTranslationModal() {
        translationModal.close();
    }
    // ---------------------------------------------


    // --- Function to fetch all videos for the sidebar ---
    async function fetchAllVideos() {
        console.log("Fetching all videos for sidebar...");
        try {
            const response = await fetch('/videos'); // Backend /videos returns all
            if (response.ok) {
                const data = await response.json();
                // Sort videos by created_at in descending order for "latest" view
                allVideos = data.videos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                renderVideoList();
            } else {
                const errorData = await response.json();
                console.error("Error fetching video list:", errorData);
                videoListTbody.innerHTML = `<tr><td colspan="3" style="color: red; text-align: center;">Error loading list.</td></tr>`;
            }
        } catch (error) {
            console.error("Network error fetching video list:", error);
            videoListTbody.innerHTML = `<tr><td colspan="3" style="color: red; text-align: center;">Network error.</td></tr>`;
        }
    }

    // --- Function to fetch translations for a specific video ---
    async function fetchTranslationsForVideo(videoId) {
        console.log(`Fetching translations for video ID: ${videoId}`);
        try {
            const response = await fetch(`/videos/${videoId}/translations`);
            if (response.ok) {
                const data = await response.json();
                allTranslationsForVideo = data.translations;
                renderTranslationsList();
            } else {
                const errorData = await response.json();
                console.error(`Error fetching translations for video ${videoId}:`, errorData);
                allTranslationsForVideo = []; // Clear list on error
                renderTranslationsList();
            }
        } catch (error) {
            console.error(`Network error fetching translations for video ${videoId}:`, error);
            allTranslationsForVideo = []; // Clear list on network error
            renderTranslationsList();
        }
    }

    // --- Function to load the last video from the backend ---
    async function loadLastVideo() {
        console.log("Attempting to load last video...");
        showLoading();
        try {
            const response = await fetch('/videos/last');
            if (response.ok) {
                const video = await response.json();
                console.log("Last video loaded:", video);
                await loadVideoDetails(video);
            } else if (response.status === 404) { // NoVideosError from backend
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
        } finally {
            hideLoading();
        }
    }

    // --- Initial Load and Event Listeners ---
    async function initUI() {
        // Disable action buttons and audio inputs initially
        playAudioButton.disabled = true;
        downloadAudioButton.disabled = true;
        translateAudioButton.disabled = true;
        downloadFrameButton.disabled = true; // Disable thumbnail download button initially
        speakTranslationButton.disabled = true;
        fromSecondsInput.disabled = true;
        toSecondsInput.disabled = true;

        await loadLastVideo(); // Load last video first
        await fetchAllVideos(); // Then load all videos for the sidebar
    }

    initUI(); // Run initialization on page load

    // Event listener for the "Process Video" button
    processVideoButton.addEventListener('click', async () => {
        const url = videoUrlInput.value;
        if (!url) {
            alert('Please paste a video URL.');
            return;
        }

        console.log("Uploading video:", url);
        showLoading();
        disableProcessButton();
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
                await fetchAllVideos(); // Refresh the sidebar video list
                currentPage = 1; // Go to first page of video list
                renderVideoList();
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
        } finally {
            hideLoading();
            enableProcessButton();
        }
    });

    // Pagination Event Listeners for Video List
    prevPageButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderVideoList();
        }
    });

    nextPageButton.addEventListener('click', () => {
        const totalPages = Math.ceil(allVideos.length / videosPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderVideoList();
        }
    });


    // MOCK_API: Only keeping mock functions for features NOT covered by backend endpoints.
    const MOCK_API = {
        translateText: (text) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Translating text:", text);
            resolve("Hola, este es un texto de ejemplo en español.");
        }, 500)),
        textToSpeech: (text) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Text to speech for:", text);
            resolve(new Audio());
        }, 500)),
        // Removed getFirstFrame as we're now using static thumbnail
        performOcr: (imageUrl) => new Promise(resolve => setTimeout(() => { // Updated to accept imageUrl
            console.log("MOCK: Performing OCR on image:", imageUrl);
            // Simulate some OCR result based on image URL (optional, but shows it's dynamic)
            if (imageUrl.includes('dummy')) {
                resolve(["No text detected in dummy image."]);
            } else if (imageUrl.includes('thumbnail')) {
                resolve([`Text from Thumbnail (Mock)`, `Video ID: ${currentLoadedVideo ? currentLoadedVideo.id : 'N/A'}`]);
            } else {
                resolve(["Mock OCR Result 1", "Mock OCR Result 2"]);
            }
        }, 500)),
    };


    // Event listeners for Audio buttons
    playAudioButton.addEventListener('click', () => {
        if (!currentLoadedVideo) {
            alert("No video loaded to play audio from.");
            return;
        }
        const fromSeconds = parseFloat(fromSecondsInput.value);
        const toSeconds = parseFloat(toSecondsInput.value);

        if (isNaN(fromSeconds) || isNaN(toSeconds) || fromSeconds < 0 || toSeconds <= fromSeconds) {
            alert("Please enter valid start and end times (seconds).");
            return;
        }
        if (fromSeconds >= currentLoadedVideo.metadata.duration_seconds || toSeconds > currentLoadedVideo.metadata.duration_seconds) {
            alert(`Segment is out of bounds. Video duration: ${currentLoadedVideo.metadata.duration_seconds.toFixed(1)}s.`);
            return;
        }

        const audioEndpointUrl = `/videos/${currentLoadedVideo.id}/audio-segment?from_seconds=${fromSeconds}&to_seconds=${toSeconds}`;
        console.log("Playing audio from backend:", audioEndpointUrl);

        const audio = new Audio(audioEndpointUrl);
        audio.play().catch(e => console.error("Error playing audio:", e));
    });

    downloadAudioButton.addEventListener('click', () => {
        if (!currentLoadedVideo) {
            alert("No video loaded to download audio from.");
            return;
        }
        const fromSeconds = parseFloat(fromSecondsInput.value);
        const toSeconds = parseFloat(toSecondsInput.value);

        if (isNaN(fromSeconds) || isNaN(toSeconds) || fromSeconds < 0 || toSeconds <= fromSeconds) {
            alert("Please enter valid start and end times (seconds).");
            return;
        }
        if (fromSeconds >= currentLoadedVideo.metadata.duration_seconds || toSeconds > currentLoadedVideo.metadata.duration_seconds) {
            alert(`Segment is out of bounds. Video duration: ${currentLoadedVideo.metadata.duration_seconds.toFixed(1)}s.`);
            return;
        }

        const audioEndpointUrl = `/videos/${currentLoadedVideo.id}/audio-segment?from_seconds=${fromSeconds}&to_seconds=${toSeconds}`;
        console.log("Downloading audio from backend:", audioEndpointUrl);

        const a = document.createElement('a');
        a.href = audioEndpointUrl;
        a.download = `audio-segment-${currentLoadedVideo.id}_${fromSeconds}-${toSeconds}.wav`; // Suggest .wav
        document.body.appendChild(a); // Append to body to make it clickable
        a.click();
        document.body.removeChild(a); // Clean up
    });

    // Event listener for the "Translate Audio Segment" button
    translateAudioButton.addEventListener('click', async () => {
        if (!currentLoadedVideo) {
            alert("No video loaded to translate audio from.");
            return;
        }
        const fromSeconds = parseFloat(fromSecondsInput.value);
        const toSeconds = parseFloat(toSecondsInput.value);

        if (isNaN(fromSeconds) || isNaN(toSeconds) || fromSeconds < 0 || toSeconds <= fromSeconds) {
            alert("Please enter valid start and end times (seconds).");
            return;
        }
        if (fromSeconds >= currentLoadedVideo.metadata.duration_seconds || toSeconds > currentLoadedVideo.metadata.duration_seconds) {
            alert(`Segment is out of bounds. Video duration: ${currentLoadedVideo.metadata.duration_seconds.toFixed(1)}s.`);
            return;
        }

        console.log(`Translating audio segment for video ${currentLoadedVideo.id} from ${fromSeconds}s to ${toSeconds}s.`);
        showLoading();
        // Disable all audio action buttons during translation
        playAudioButton.disabled = true;
        downloadAudioButton.disabled = true;
        translateAudioButton.disabled = true;

        try {
            const response = await fetch(`/videos/${currentLoadedVideo.id}/audio-segment/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from_seconds: fromSeconds,
                    to_seconds: toSeconds,
                    from_language: FROM_LANGUAGE,
                    to_language: TO_LANGUAGE
                }),
            });

            if (response.ok) {
                const translationResult = await response.json();
                console.log("Translation successful:", translationResult);
                translationP.textContent = `Original: "${translationResult.original_text}"\nTranslated (${TO_LANGUAGE}): "${translationResult.translated_text}"`;
                await fetchTranslationsForVideo(currentLoadedVideo.id); // Refresh translations list
            } else {
                const errorData = await response.json();
                console.error("Error during translation:", errorData);
                alert(`Translation failed: ${errorData.detail || response.statusText}`);
                translationP.textContent = `Error: ${errorData.detail || 'Translation failed.'}`;
            }
        } catch (error) {
            console.error("Network error during translation:", error);
            alert('Network error during translation.');
            translationP.textContent = 'Error: Network error during translation.';
        } finally {
            hideLoading();
            // Re-enable buttons
            playAudioButton.disabled = false;
            downloadAudioButton.disabled = false;
            translateAudioButton.disabled = false;
        }
    });


    // Event listener for Speak Translation button
    speakTranslationButton.addEventListener('click', async () => {
        if (!currentLoadedVideo) {
            alert("No video loaded to speak translation from.");
            return;
        }
        const textToSpeak = translationP.textContent.includes('Original:') ? translationP.textContent.split(`Translated (${TO_LANGUAGE}): "`)[1].slice(0, -1) : translationP.textContent;
        if (textToSpeak === 'N/A' || textToSpeak.includes('Error:') || textToSpeak.trim() === '') {
            alert("No valid translation available to speak.");
            return;
        }
        const audio = await MOCK_API.textToSpeech(textToSpeak);
        audio.play();
        console.log("Speaking mock translation.");
    });

    // Event listener for Download Thumbnail button (formerly Download Frame)
    downloadFrameButton.addEventListener('click', async () => {
        if (!currentLoadedVideo) {
            alert("No video loaded to download thumbnail from.");
            return;
        }
        const thumbnailFileUrl = firstFrameImg.src; // This is now the static thumbnail URL
        if (thumbnailFileUrl && !thumbnailFileUrl.includes('dummy')) { // Ensure it's a valid thumbnail, not just a placeholder
            const a = document.createElement('a');
            a.href = thumbnailFileUrl;
            a.download = `thumbnail-${currentLoadedVideo.id}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            console.log("Downloading thumbnail:", thumbnailFileUrl);
        } else {
            alert("No thumbnail image available to download.");
        }
    });
});
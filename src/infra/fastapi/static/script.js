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

    // Other Cards
    const playAudioButton = document.getElementById('play-audio');
    const downloadAudioButton = document.getElementById('download-audio');
    const translationP = document.getElementById('translation');
    const speakTranslationButton = document.getElementById('speak-translation');
    const firstFrameImg = document.getElementById('first-frame');
    const downloadFrameButton = document.getElementById('download-frame');
    const ocrOutputDiv = document.getElementById('ocr-output');

    // Sidebar Elements
    const videoListTbody = document.getElementById('video-list-tbody');
    const prevPageButton = document.getElementById('prev-page-button');
    const nextPageButton = document.getElementById('next-page-button');
    const pageInfoSpan = document.getElementById('page-info');

    // Global State for Pagination
    let allVideos = [];
    let currentPage = 1;
    const videosPerPage = 5; // Number of videos to show per page in the sidebar

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
            firstFrameImg.src = '';
            firstFrameImg.style.display = 'none';
            ocrOutputDiv.innerHTML = 'No text detected yet.';
            videoUrlInput.value = '';
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

        // Populate basic video information
        videoIdSpan.textContent = video.id;
        originalUrlLink.textContent = new URL(video.original_url).hostname;
        originalUrlLink.href = video.original_url;
        videoTypeSpan.textContent = video.video_type.toUpperCase();
        uploadedAtSpan.textContent = new Date(video.created_at).toLocaleString(); // Nicer date format

        // MOCK_API calls for duration, width, height (assuming these are not in your backend /videos response)
        try {
            const videoDetails = await MOCK_API.getVideoDetails(video.original_url);
            durationSpan.textContent = videoDetails.duration;
            widthSpan.textContent = videoDetails.width;
            heightSpan.textContent = videoDetails.height;
        } catch (error) {
            console.error("Could not fetch video details from mock API:", error);
            durationSpan.textContent = 'N/A';
            widthSpan.textContent = 'N/A';
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
        videoUrlTextField.layout();
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
        } finally {
            hideLoading();
        }
    }

    // --- Initial Load and Event Listeners ---
    async function initUI() {
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
                await fetchAllVideos(); // Refresh the sidebar list
                currentPage = 1; // Go to first page of list
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

    // Pagination Event Listeners
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


    // MOCK_API for features not directly implemented by provided backend endpoints
    const MOCK_API = {
        getVideoDetails: (url) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Getting video details for", url);
            // Generate dynamic values based on the URL (or a hash of it)
            // This makes it visually clear that the values are updating.
            const hash = Array.from(url).reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const duration = (hash % 100) + 60 + Math.random(); // 60-160 seconds
            const height = (hash % 3) === 0 ? 720 : ((hash % 3) === 1 ? 1080 : 1440); // 720p, 1080p, 1440p
            const width = Math.round(height * (16 / 9)); // Common aspect ratio

            resolve({ 
                duration: duration.toFixed(1), // One decimal place
                height: height, 
                width: width 
            });
        }, 500)),
        getAudioClip: (url) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Getting audio clip for", url);
            const dummyAudioData = new Uint8Array([0x4F, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00]);
            resolve(new Blob([dummyAudioData], { type: 'audio/ogg' }));
        }, 500)),
        translateText: (text) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Translating text:", text);
            resolve("Hola, este es un texto de ejemplo en español.");
        }, 500)),
        textToSpeech: (text) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Text to speech for:", text);
            resolve(new Audio());
        }, 500)),
        getFirstFrame: (url) => new Promise(resolve => setTimeout(() => {
            console.log("MOCK: Getting first frame for", url);
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
        if (currentFrameSrc && currentFrameSrc.startsWith('blob:')) { // Check if it's a blob URL
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
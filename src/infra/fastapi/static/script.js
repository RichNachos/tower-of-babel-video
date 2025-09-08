document.addEventListener('DOMContentLoaded', () => {
    const textFields = document.querySelectorAll('.mdc-text-field');
    textFields.forEach(textField => mdc.textField.MDCTextField.attachTo(textField));

    const buttons = document.querySelectorAll('.mdc-button');
    buttons.forEach(button => mdc.ripple.MDCRipple.attachTo(button));

    const videoUrlInput = document.getElementById('video-url');
    const durationSpan = document.getElementById('duration');
    const heightSpan = document.getElementById('height');
    const playAudioButton = document.getElementById('play-audio');
    const downloadAudioButton = document.getElementById('download-audio');
    const translationP = document.getElementById('translation');
    const speakTranslationButton = document.getElementById('speak-translation');
    const firstFrameImg = document.getElementById('first-frame');
    const downloadFrameButton = document.getElementById('download-frame');
    const ocrOutputDiv = document.getElementById('ocr-output');

    const MOCK_API = {
        getVideoDetails: (url) => new Promise(resolve => setTimeout(() => resolve({ duration: 60.5, height: 720 }), 1000)),
        getAudioClip: (url) => new Promise(resolve => setTimeout(() => resolve(new Blob()), 1000)),
        translateText: (text) => new Promise(resolve => setTimeout(() => resolve("Hola, este es un texto de ejemplo en español."), 1000)),
        textToSpeech: (text) => new Promise(resolve => setTimeout(() => resolve(new Audio()), 1000)),
        getFirstFrame: (url) => new Promise(resolve => setTimeout(() => resolve(new Blob()), 1000)),
        performOcr: (image) => new Promise(resolve => setTimeout(() => resolve(["Hello", "World"]), 1000)),
    };

    videoUrlInput.addEventListener('change', async (event) => {
        const url = event.target.value;
        const videoDetails = await MOCK_API.getVideoDetails(url);
        durationSpan.textContent = videoDetails.duration;
        heightSpan.textContent = videoDetails.height;

        const firstFrame = await MOCK_API.getFirstFrame(url);
        firstFrameImg.src = URL.createObjectURL(firstFrame);
        firstFrameImg.style.display = 'block';

        const ocrResult = await MOCK_API.performOcr(firstFrame);
        ocrOutputDiv.innerHTML = ocrResult.join('<br>');
    });

    playAudioButton.addEventListener('click', () => {
        const audio = new Audio(videoUrlInput.value);
        audio.currentTime = 30;
        audio.play();
        setTimeout(() => audio.pause(), 15000);
    });

    downloadAudioButton.addEventListener('click', async () => {
        const audioClip = await MOCK_API.getAudioClip(videoUrlInput.value);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(audioClip);
        a.download = 'audio-clip.mp3';
        a.click();
    });

    speakTranslationButton.addEventListener('click', async () => {
        const translation = await MOCK_API.translateText("Some English text");
        translationP.textContent = translation;
        const audio = await MOCK_API.textToSpeech(translation);
        audio.play();
    });

    downloadFrameButton.addEventListener('click', async () => {
        const firstFrame = await MOCK_API.getFirstFrame(videoUrlInput.value);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(firstFrame);
        a.download = 'first-frame.png';
        a.click();
    });
});
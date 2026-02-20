const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scaleSelect = document.getElementById('scale-select');
const tempoSlider = document.getElementById('tempo-slider');
const tempoValue = document.getElementById('tempo-value');
const clearBtn = document.getElementById('clear-btn');

let audioCtx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentInterval = 150;
let intervalId = null;
let lastPlayedTime = 0;

// Base frequency (C3)
const BASE_FREQ = 130.81;

// Scale definitions (semitones from root)
const scales = {
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    minor: [0, 2, 3, 5, 7, 8, 10], // Natural Minor
    major_pentatonic: [0, 2, 4, 7, 9],
    minor_pentatonic: [0, 3, 5, 7, 10], // A C D E G (relative to A)
    ryukyu: [0, 4, 5, 7, 11] // C E F G B
};

// Initialize Audio Context on user interaction
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Function to get frequency from scale and position
function getFrequency(y) {
    const selectedScale = scaleSelect.value;
    const scaleIntervals = scales[selectedScale];

    // Map Y coordinate to a note index
    // Height 600px -> Map to 2 octaves (24 semitones approx, but depends on scale length)
    // Let's map to 2 octaves of the selected scale
    const numOctaves = 2;
    const totalNotes = scaleIntervals.length * numOctaves;

    // Invert Y so top is high pitch
    const normalizedY = 1 - (y / canvas.height);
    const noteIndex = Math.floor(normalizedY * totalNotes);

    // Calculate octave and index within scale
    const octave = Math.floor(noteIndex / scaleIntervals.length);
    const scaleIndex = noteIndex % scaleIntervals.length;

    // Calculate semitones from base
    const semitones = (octave * 12) + scaleIntervals[scaleIndex];

    // Frequency formula: f = f0 * (2^(n/12))
    return BASE_FREQ * Math.pow(2, semitones / 12);
}

// Play a tone
function playTone(freq) {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// Drawing and playing logic
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
    initAudio();

    // Play initial tone immediately
    playTone(getFrequency(lastY));

    // Set interval for continuous playing while drawing
    clearInterval(intervalId);
    intervalId = setInterval(() => {
        if (isDrawing) {
            playTone(getFrequency(lastY));
        }
    }, currentInterval);
}

function draw(e) {
    if (!isDrawing) return;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();

    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
    isDrawing = false;
    clearInterval(intervalId);
}

// Event Listeners
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

tempoSlider.addEventListener('input', (e) => {
    currentInterval = parseInt(e.target.value);
    tempoValue.textContent = currentInterval;

    // Update interval if currently drawing
    if (isDrawing) {
        clearInterval(intervalId);
        intervalId = setInterval(() => {
            playTone(getFrequency(lastY));
        }, currentInterval);
    }
});

clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

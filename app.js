const moodSelect = document.querySelector("#mood");
const scaleSelect = document.querySelector("#scale");
const tempoInput = document.querySelector("#tempo");
const noteCountInput = document.querySelector("#noteCount");
const tempoValue = document.querySelector("#tempoValue");
const noteValue = document.querySelector("#noteValue");
const generateBtn = document.querySelector("#generateBtn");
const playBtn = document.querySelector("#playBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const sequenceElement = document.querySelector("#sequence");
const statusElement = document.querySelector("#status");
const canvas = document.querySelector("#pianoRoll");
const ctx = canvas.getContext("2d");

const scales = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
  pentatonic: [0, 2, 4, 7, 9, 12]
};

const moods = {
  bright: { root: 60, jumps: [1, 1, 2, 2, 3, -1], duration: [0.5, 0.5, 1, 1] },
  calm: { root: 57, jumps: [0, 1, -1, 1, -2, 2], duration: [1, 1, 1.5, 2] },
  dramatic: { root: 52, jumps: [3, -2, 4, -3, 2, -1], duration: [0.5, 1, 1, 1.5] },
  dreamy: { root: 64, jumps: [0, 2, -1, 3, -2, 1], duration: [1, 1.5, 2, 0.5] }
};

let generatedNotes = [];
let audioContext = null;

function midiToName(number) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(number / 12) - 1;
  return `${names[number % 12]}${octave}`;
}

function midiToFrequency(number) {
  return 440 * Math.pow(2, (number - 69) / 12);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function generateMelody() {
  const mood = moods[moodSelect.value];
  const selectedScale = scales[scaleSelect.value];
  const total = Number(noteCountInput.value);
  let scaleIndex = Math.floor(selectedScale.length / 2);
  const melody = [];

  for (let index = 0; index < total; index += 1) {
    scaleIndex = clamp(scaleIndex + pick(mood.jumps), 0, selectedScale.length - 1);
    const octaveShift = index % 16 > 11 ? 12 : 0;
    const midi = mood.root + selectedScale[scaleIndex] + octaveShift;
    melody.push({
      midi,
      name: midiToName(midi),
      duration: pick(mood.duration)
    });
  }

  generatedNotes = melody;
  renderSequence();
  drawPianoRoll();
  statusElement.textContent = "Generated";
}

function renderSequence() {
  sequenceElement.innerHTML = generatedNotes
    .map((note) => `<span class="note-chip">${note.name}</span>`)
    .join("");
}

function drawPianoRoll() {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#edf3eb";
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 30) {
    ctx.strokeStyle = y % 60 === 0 ? "#cbd8cf" : "#dfe8e1";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  if (!generatedNotes.length) return;

  const minNote = Math.min(...generatedNotes.map((note) => note.midi)) - 2;
  const maxNote = Math.max(...generatedNotes.map((note) => note.midi)) + 2;
  const step = width / generatedNotes.length;

  generatedNotes.forEach((note, index) => {
    const x = index * step + 8;
    const normalized = (note.midi - minNote) / (maxNote - minNote || 1);
    const y = height - normalized * (height - 54) - 34;
    const noteWidth = Math.max(12, step * note.duration * 0.78);
    ctx.fillStyle = index % 4 === 0 ? "#186f68" : "#f1b94c";
    ctx.fillRect(x, y, noteWidth, 18);
  });
}

function playMelody() {
  if (!generatedNotes.length) {
    generateMelody();
  }

  audioContext = audioContext || new AudioContext();
  const beatLength = 60 / Number(tempoInput.value);
  let time = audioContext.currentTime + 0.08;

  generatedNotes.forEach((note) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = midiToFrequency(note.midi);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.22, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, time + note.duration * beatLength);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(time);
    oscillator.stop(time + note.duration * beatLength + 0.05);
    time += note.duration * beatLength;
  });

  statusElement.textContent = "Playing";
}

function variableLength(value) {
  let buffer = value & 0x7f;
  const bytes = [];
  value >>= 7;

  while (value > 0) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
    value >>= 7;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }

  return bytes;
}

function numberToBytes(value, length) {
  const bytes = [];
  for (let index = length - 1; index >= 0; index -= 1) {
    bytes.push((value >> (index * 8)) & 0xff);
  }
  return bytes;
}

function textBytes(text) {
  return Array.from(text).map((character) => character.charCodeAt(0));
}

function createMidiBytes() {
  if (!generatedNotes.length) {
    generateMelody();
  }

  const ticks = 480;
  const tempo = Math.round(60000000 / Number(tempoInput.value));
  const track = [];
  track.push(...variableLength(0), 0xff, 0x51, 0x03, ...numberToBytes(tempo, 3));
  track.push(...variableLength(0), 0xc0, 0x00);

  generatedNotes.forEach((note) => {
    const duration = Math.round(note.duration * ticks);
    track.push(...variableLength(0), 0x90, note.midi, 86);
    track.push(...variableLength(duration), 0x80, note.midi, 0);
  });

  track.push(...variableLength(0), 0xff, 0x2f, 0x00);

  return new Uint8Array([
    ...textBytes("MThd"),
    ...numberToBytes(6, 4),
    ...numberToBytes(0, 2),
    ...numberToBytes(1, 2),
    ...numberToBytes(ticks, 2),
    ...textBytes("MTrk"),
    ...numberToBytes(track.length, 4),
    ...track
  ]);
}

function downloadMidi() {
  const bytes = createMidiBytes();
  const blob = new Blob([bytes], { type: "audio/midi" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "generated_music.mid";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  statusElement.textContent = "Downloaded";
}

tempoInput.addEventListener("input", () => {
  tempoValue.textContent = `${tempoInput.value} BPM`;
});

noteCountInput.addEventListener("input", () => {
  noteValue.textContent = noteCountInput.value;
});

generateBtn.addEventListener("click", generateMelody);
playBtn.addEventListener("click", playMelody);
downloadBtn.addEventListener("click", downloadMidi);

generateMelody();

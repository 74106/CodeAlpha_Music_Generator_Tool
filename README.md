# CodeAlpha Music Generation with AI

This project generates new music using an LSTM-based neural network and also includes an interactive browser website for generating, previewing, visualizing, and downloading MIDI melodies.

## Live Website

Open this file in a browser:

```text
website/index.html
```

## Features

- Train an LSTM model on MIDI note sequences
- Extract notes and chords from MIDI files using `music21`
- Generate new note sequences with TensorFlow/Keras
- Export generated music as a `.mid` MIDI file
- Interactive website for melody generation
- Mood, scale, tempo, and note-count controls
- Piano-roll visualization
- Browser playback using Web Audio API
- MIDI download directly from the website

## Tech Stack

- Python
- TensorFlow/Keras
- NumPy
- music21
- HTML
- CSS
- JavaScript
- Web Audio API
- MIDI file generation

## Project Structure

```text
CodeAlpha_Music_Generation/
  data/
    midi/
  outputs/
  src/
    music_generator.py
  website/
    index.html
    styles.css
    app.js
  requirements.txt
  README.md
```

## Python AI Workflow

1. Add MIDI files to `data/midi`.
2. Extract notes and chords from the dataset.
3. Convert notes into integer sequences.
4. Train an LSTM neural network.
5. Predict new notes from a seed pattern.
6. Save generated output as a MIDI file.

## Installation

Use Python 3.10 or 3.11 for best TensorFlow compatibility.

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Run Python Generator

```bash
python src/music_generator.py
```

Generated music will be saved to:

```text
outputs/generated_music.mid
```

## Run Website

Open:

```text
website/index.html
```

Then choose mood, scale, tempo, and number of notes. Click `Generate`, `Play`, or `Download MIDI`.

## Custom Python Options

Generate 120 notes with 30 epochs:

```bash
python src/music_generator.py --notes 120 --epochs 30
```

Use a custom MIDI dataset folder:

```bash
python src/music_generator.py --midi-folder path/to/midi/files
```

Set a custom output file:

```bash
python src/music_generator.py --output outputs/my_music.mid
```

## Dataset

You can use any collection of MIDI files such as classical, jazz, piano, or instrumental melodies. A larger and cleaner dataset improves the quality of generated music.

## Output

The project exports standard MIDI files that can be opened in music players, MIDI editors, or digital audio workstations.

## Future Improvements

- Save and reload trained models
- Add instrument selection
- Connect the trained Python model to the website
- Generate longer compositions
- Convert MIDI output to audio
- Train on genre-specific datasets

## Disclaimer

Generated music quality depends on dataset size, training epochs, and musical variety in the MIDI files.

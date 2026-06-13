import argparse
import random
import struct
from pathlib import Path


SEED_NOTES = [
    "C4", "E4", "G4", "C5", "G4", "E4", "D4", "F4", "A4", "D5",
    "A4", "F4", "E4", "G4", "B4", "E5", "B4", "G4", "F4", "A4",
    "C5", "F5", "C5", "A4", "G4", "B4", "D5", "G5", "D5", "B4",
    "C4.E4.G4", "D4.F4.A4", "E4.G4.B4", "F4.A4.C5", "G4.B4.D5",
    "A4.C5.E5", "G4.B4.D5", "F4.A4.C5", "E4.G4.B4", "D4.F4.A4"
]


NOTE_VALUES = {
    "C": 0,
    "C#": 1,
    "D": 2,
    "D#": 3,
    "E": 4,
    "F": 5,
    "F#": 6,
    "G": 7,
    "G#": 8,
    "A": 9,
    "A#": 10,
    "B": 11
}


def load_notes(midi_folder):
    midi_path = Path(midi_folder)
    files = list(midi_path.glob("*.mid")) + list(midi_path.glob("*.midi"))

    if not files:
        return SEED_NOTES * 30

    try:
        from music21 import chord, converter, note
    except ImportError:
        return SEED_NOTES * 30

    notes = []

    for file_path in files:
        parsed = converter.parse(str(file_path))
        parts = parsed.parts.stream() if parsed.parts else [parsed.flat]

        for part in parts:
            for element in part.recurse():
                if isinstance(element, note.Note):
                    notes.append(str(element.pitch))
                elif isinstance(element, chord.Chord):
                    notes.append(".".join(str(pitch) for pitch in element.pitches))

    return notes if len(notes) > 50 else SEED_NOTES * 30


def prepare_sequences(notes, sequence_length):
    names = sorted(set(notes))
    note_to_int = {note: index for index, note in enumerate(names)}
    inputs = []
    outputs = []

    for index in range(0, len(notes) - sequence_length):
        inputs.append([note_to_int[note] for note in notes[index:index + sequence_length]])
        outputs.append(note_to_int[notes[index + sequence_length]])

    return inputs, outputs, names, note_to_int


def build_model(vocabulary_size, sequence_length):
    import tensorflow as tf

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(sequence_length,)),
        tf.keras.layers.Embedding(vocabulary_size, 64),
        tf.keras.layers.LSTM(128, return_sequences=True),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.LSTM(128),
        tf.keras.layers.Dense(128, activation="relu"),
        tf.keras.layers.Dense(vocabulary_size, activation="softmax")
    ])

    model.compile(
        loss="sparse_categorical_crossentropy",
        optimizer="adam",
        metrics=["accuracy"]
    )

    return model


def train_and_generate(notes, sequence_length, generated_count, epochs):
    import numpy as np

    inputs, outputs, names, note_to_int = prepare_sequences(notes, sequence_length)

    if not inputs:
        raise ValueError("Not enough note data to train the model.")

    x_train = np.array(inputs)
    y_train = np.array(outputs)
    model = build_model(len(names), sequence_length)
    model.fit(x_train, y_train, epochs=epochs, batch_size=32, verbose=1)

    int_to_note = {index: note for note, index in note_to_int.items()}
    pattern = random.choice(inputs)
    generated = []

    for _ in range(generated_count):
        prediction_input = np.array([pattern])
        prediction = model.predict(prediction_input, verbose=0)[0]
        predicted_index = int(np.argmax(prediction))
        generated.append(int_to_note[predicted_index])
        pattern = pattern[1:] + [predicted_index]

    return generated


def note_to_midi_number(note_name):
    if len(note_name) < 2:
        return 60

    if note_name[1:2] == "#":
        pitch = note_name[:2]
        octave = note_name[2:]
    else:
        pitch = note_name[:1]
        octave = note_name[1:]

    octave_number = int("".join(character for character in octave if character.isdigit()) or 4)
    return 12 * (octave_number + 1) + NOTE_VALUES.get(pitch, 0)


def variable_length(value):
    buffer = value & 0x7F
    value >>= 7

    while value:
        buffer <<= 8
        buffer |= ((value & 0x7F) | 0x80)
        value >>= 7

    bytes_out = []

    while True:
        bytes_out.append(buffer & 0xFF)

        if buffer & 0x80:
            buffer >>= 8
        else:
            break

    return bytes(bytes_out)


def write_midi(notes, output_path):
    ticks = 480
    track = bytearray()
    track.extend(variable_length(0) + bytes([0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20]))
    track.extend(variable_length(0) + bytes([0xC0, 0x00]))

    for token in notes:
        chord_notes = token.split(".")
        midi_numbers = [note_to_midi_number(note_name) for note_name in chord_notes]

        for midi_number in midi_numbers:
            track.extend(variable_length(0) + bytes([0x90, midi_number, 82]))

        for index, midi_number in enumerate(midi_numbers):
            delta = ticks if index == 0 else 0
            track.extend(variable_length(delta) + bytes([0x80, midi_number, 0]))

    track.extend(variable_length(0) + bytes([0xFF, 0x2F, 0x00]))

    header = b"MThd" + struct.pack(">IHHH", 6, 0, 1, ticks)
    body = b"MTrk" + struct.pack(">I", len(track)) + track
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(header + body)


def main():
    parser = argparse.ArgumentParser(description="Generate MIDI music using an LSTM model.")
    parser.add_argument("--midi-folder", default="data/midi", help="Folder containing MIDI training files.")
    parser.add_argument("--output", default="outputs/generated_music.mid", help="Generated MIDI file path.")
    parser.add_argument("--sequence-length", type=int, default=20, help="Number of notes used as input context.")
    parser.add_argument("--notes", type=int, default=80, help="Number of generated notes.")
    parser.add_argument("--epochs", type=int, default=20, help="Training epochs.")
    args = parser.parse_args()

    notes = load_notes(args.midi_folder)
    generated_notes = train_and_generate(notes, args.sequence_length, args.notes, args.epochs)
    write_midi(generated_notes, args.output)
    print(f"Generated MIDI saved to {args.output}")


if __name__ == "__main__":
    main()

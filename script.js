

VF = Vex.Flow;

// Create an SVG renderer and attach it to the DIV element named "boo".
var div = document.getElementById("boo")
var renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);

// Configure the rendering context.
renderer.resize(300, 120);
var context = renderer.getContext();
context.setFont("Arial", 10, "").setBackgroundFillStyle("#eed");

// Create a stave of width 400 at position 10, 40 on the canvas.
var stave = new VF.Stave(0, 0, 200).addClef("treble");

// Connect it to the rendering context and draw!
stave.setContext(context).draw();

var tickContext = new VF.TickContext();

const visibleNoteGroups = [];

// ---------------------------------

var midi, data;
// request MIDI access
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({
        sysex: false
    }).then(onMIDISuccess, onMIDIFailure);
} else {
    alert("No MIDI support in your browser.");
}

// midi functions
function onMIDISuccess(midiAccess) {
    // when we get a succesful response, run this code
    midi = midiAccess; // this is our raw MIDI data, inputs, outputs, and sysex status

    var inputs = midi.inputs.values();
    // loop over all available inputs and listen for any MIDI input
    for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        // each time there is a midi message call the onMIDIMessage function
        input.value.onmidimessage = onMIDIMessage;
    }
}

function onMIDIFailure(error) {
    // when we get a failed response, run this code
    console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + error);
}

function midiNote(noteValue) {
    notes = ["C",
            "Db",
            "D",
            "Eb",
            "E",
            "F",
            "Gb",
            "G",
            "Ab",
            "A",
            "Bb",
            "B"];

    note = {midi: noteValue, pitch: notes[noteValue % 12], octave: Math.floor(noteValue / 12)};
    note.string = note.pitch + note.octave;
    note.vex_string = note.pitch.toLowerCase() + "/" + (note.octave);
    note.acc = note.pitch[1];
    return note;
}

notesHeld = [];

/*
 * TODO
function getInversion(intervalList) {
    inversion = {intervals: [4, 3],
                 name: "major",
                 root: 0}
    inversion = {intervals: [3, 5],
                 name: "major (1st inversion)",
                 root: 0}
}
*/

function inversion(notesHeld) {
    notesList = notesHeld.sort().map(midiNote)
    intervalList = intervals(notesHeld);

    if(intervalList.toString() == [4, 3].toString()) {
        return notesList[0].pitch + " major";
    } else if(intervalList.toString() == [3, 5].toString()) {
        return notesList[2].pitch + " major (1st inversion)";
    } else if(intervalList.toString() == [5, 4].toString()) {
        return notesList[1].pitch + " major (2nd inversion)";
    } else if(intervalList.toString() == [3, 4].toString()) {
        return notesList[0].pitch + " minor";
    } else if(intervalList.toString() == [4, 5].toString()) {
        return notesList[2].pitch + " minor (1st inversion)";
    } else if(intervalList.toString() == [5, 3].toString()) {
        return notesList[1].pitch + " minor (2nd inversion)";
    } else if(intervalList.toString() == [3, 3].toString()) {
        return notesList[0].pitch + " diminished";
    } else if(intervalList.toString() == [3, 6].toString()) {
        return notesList[1].pitch + " diminished (1st inversion)";
    } else if(intervalList.toString() == [6, 3].toString()) {
        return notesList[2].pitch + " diminished (2nd inversion)";
    } else if(intervalList.toString() == [4, 4].toString()) {
        return notesList[0].pitch + " augmented";
    }

    return "-";
}

function intervals(notesHeld) {
    notesMidi = notesHeld.sort().map(midiNote).map(note => note.midi);

    intervalList = [];
    for(i = 0; i < notesMidi.length - 1; ++i) {
        intervalList.push(notesMidi[i + 1] - notesMidi[i]);
    }

    return intervalList;
}

function detectInversion(notesHeld) {
    inversionElement = document.getElementById("inversion");

    if(notesHeld.length == 3) {
        inv = inversion(notesHeld);
        if(inv) {
            inversionElement.innerHTML = inversion(notesHeld);
        } else {
            inversionElement.innerHTML = "-";
        }
    } else {
        inversionElement.innerHTML = "-";
    }
}

function drawNote(note) {
    const group = context.openGroup();
    visibleNoteGroups[note] = group;
    const vex_note = new VF.StaveNote({clef: "treble",
                                       keys: [midiNote(note).vex_string],
                                       duration: "q" })
                        .setContext(context)
                        .setStave(stave);

    acc = midiNote(note).acc
    if(acc) vex_note.addAccidental(0, new VF.Accidental(acc));
    tickContext.addTickable(vex_note)
    tickContext.preFormat().setX(50);
    vex_note.draw();
    context.closeGroup();
}

function removeNote(note) {
    visibleNoteGroups[note].remove();
    //context.removeGroup(group);
    //console.log(context);
}

function onMIDIMessage(message) {
    data = message.data; // this gives us our [command/channel, note, velocity] data.
    if(data[0] == 144) {
        notesHeld.push(data[1]);
        drawNote(data[1]);
    } else if(data[0] == 128) {
        removeNote(data[1]);
        notesHeld.splice(notesHeld.indexOf(data[1]), 1);
    }

    notes_list = notesHeld.sort().map(midiNote).map(a => a.string);
    if(notes_list.length == 0) {
        notes_str = "-";
    } else {
        notes_str = notes_list.join(", ");
    }

    notesElement = document.getElementById("notes");
    notesElement.innerHTML = notes_str;

    detectInversion(notesHeld);
}

const ac = new AudioContext();

Soundfont.instrument(ac, 'acoustic_grand_piano').then(function (piano) {
    window.navigator.requestMIDIAccess().then(function (midiAccess) {
        midiAccess.inputs.forEach(function (midiInput) {
            piano.listenToMidi(midiInput)
        })
    })
})

document.getElementById("major_normal").addEventListener("click", function(event) {
    Soundfont.instrument(ac, 'acoustic_grand_piano').then(function (clavinet) {
    //clavinet.play('C4').stop(ac.currentTime + 0.5)
    //clavinet.play('C4', ac.currentTime, { duration: 0.5})
    clavinet.schedule(0,
                      [{time: 0,   note: 'C3'},
                       {time: 0.3, note: 'E3'},
                       {time: 0.6, note: 'G3'},
                       {time: 0.9, note: 'E3'},
                       {time: 1.2, note: 'C3'}]);
    });
});

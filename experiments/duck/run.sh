#!/bin/bash
# duck experiment
#
# Tests sidechaincompress ducking: music bed drops to ~50% when foreground is present.
#
# track1 (foreground/sidechain): 5s silence + clip 1477 (very-deep, 12s) + 5s silence
# track2 (bed, ducked):          clip 633 (tuvan-throat-singing, 78.7s)
#
# track1 is split: one copy goes to the mix, one drives the sidechain compressor on track2.
# When track1 has signal, track2 ducks. Silences at start/end let you hear the bed
# before and after ducking kicks in.

CONTENT=/Users/wmodes/dev/driftconditions/content

FOREGROUND="$(dirname "$0")/test_audio.m4a"
BED="$CONTENT/2024/06/tuvan-throat-singing-1.mp3"              # clip 633, 78.707s


ffmpeg -y \
  -i "$FOREGROUND" \
  -i "$BED" \
  -filter_complex "
    aevalsrc=exprs=0:duration=5 [sil_pre];
    aevalsrc=exprs=0:duration=5 [sil_post];
    [0:a] loudnorm=I=-16:TP=-1.5:LRA=7 [fg];
    [sil_pre][fg][sil_post] concat=n=3:v=0:a=1 [track1];
    [track1] asplit [track1_mix][track1_sc];
    [1:a] acopy [track2];
    [track2][track1_sc] sidechaincompress=threshold=-30dB:ratio=20:attack=200:release=1000 [track2_ducked];
    [track1_mix][track2_ducked] amix=inputs=2:normalize=0 [out]
  " \
  -map "[out]" \
  -c:a libmp3lame -b:a 128k \
  output-duck.mp3

echo "Done: output-duck.mp3"

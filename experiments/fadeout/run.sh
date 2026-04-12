#!/bin/bash
# fadeout experiment
#
# Tests clip-level fadeout: a spoken clip fades out over 5s before its end.
#
# track1: 2s silence + clip 20 (anna-zevellos, 12.192s) with fadeout(5)
#           fade starts at 7.192s into clip (12.192 - 5)
# track2: clip 633 (tuvan-throat-singing, 78.7s) — music bed, no effects
#
# Expected: spoken clip fades smoothly under the throat singing bed.

CONTENT=/Users/wmodes/dev/driftconditions/content

SPOKEN="$CONTENT/2024/03/anna-zevellos-paging-announcement.mp3"  # clip 20, 12.192s
MUSIC="$CONTENT/2024/06/tuvan-throat-singing-1.mp3"              # clip 633, 78.707s

CLIP_DUR=12.192
FADE_DUR=5
FADE_START=$(echo "$CLIP_DUR - $FADE_DUR" | bc)   # 7.192s into clip
MIX_DUR=$(echo "2 + $CLIP_DUR" | bc)              # 14.192s total

ffmpeg -y \
  -i "$SPOKEN" \
  -i "$MUSIC" \
  -filter_complex "
    aevalsrc=exprs=0:duration=2 [sil];
    [0:a] afade=t=out:st=${FADE_START}:d=${FADE_DUR} [spoken_faded];
    [sil][spoken_faded] concat=n=2:v=0:a=1 [track1];
    [1:a] acopy [track2];
    [track1][track2] amix=inputs=2:normalize=0 [mixed];
    [mixed] atrim=duration=${MIX_DUR} [out]
  " \
  -map "[out]" \
  -c:a libmp3lame -b:a 128k \
  output-fadeout.mp3

echo "Done: output-fadeout.mp3 (${MIX_DUR}s)"

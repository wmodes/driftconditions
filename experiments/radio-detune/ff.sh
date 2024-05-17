# A filterchain consists of a sequence of connected filters, each one connected to the previous one in the sequence. A filterchain is represented by a list of ","-separated filter descriptions.
#
# A filtergraph consists of a sequence of filterchains. A sequence of filterchains is represented by a list of ";"-separated filterchain descriptions.
#
# A filter is represented by a string of the form: [in_link_1]...[in_link_N]filter_name@id=arguments[out_link_1]...[out_link_M]
#
# filter_name is the name of the filter class of which the described filter is an instance of, and has to be the name of one of the filter classes registered in the program optionally followed by "@id". The name of the filter class is optionally followed by a string "=arguments".
#
# arguments is a string which contains the parameters used to initialize the filter instance. It may have one of two forms:
#
#   - A ’:’-separated list of key=value pairs.
#   - A ’:’-separated list of value. In this case, the keys are assumed to be the option names in the order they are declared. E.g. the fade filter declares three options in this order – type, start_frame and nb_frames. Then the parameter list in:0:30 means that the value in is assigned to the option type, 0 to start_frame and 30 to nb_frames.
#   - A ’:’-separated list of mixed direct value and long key=value pairs. The direct value must precede the key=value pairs, and follow the same constraints order of the previous point. The following key=value pairs can be set in any preferred order.
# 
# If the option value itself is a list of items (e.g. the format filter takes a list of pixel formats), the items in the list are usually separated by ‘|’.
# 
# The list of arguments can be quoted using the character ‘'’ as initial and ending mark, and the character ‘\’ for escaping the characters within the quoted text; otherwise the argument string is considered terminated when the next special character (belonging to the set ‘[]=;,’) is encountered.

# working fade in/out
# ffmpeg -i knox.mp3 -i static.mp3 -filter_complex \
# "[0:a] \
#     volume = 'min(1, max(0, 0.5 + 0.5 * cos(PI * t / 5)))': eval=frame \
#     [a0]; \
# [1:a] \
#     volume = 'min(1, max(0, 0.5 - 0.5 * cos(PI * t / 5)))': eval=frame \
#     [a1]; \
# [a0][a1]
#     amix = inputs=2: duration=shortest" \
# -c:a libmp3lame -q:a 2 output.mp3

# applying a lowpass filter
ffmpeg -i knox.mp3 -i static.mp3 -filter_complex \
"[0:a] \
    volume = 'min(1, max(0, 0.5 + 0.5 * cos(PI * t / 5)))': eval=frame, \
    lowpass=f=3000: mix='0.5 + 0.5 * cos(PI * t / 5)' \
    [a0]; \
[1:a] \
    volume = 'min(1, max(0, 0.5 - 0.5 * cos(PI * t / 5)))': eval=frame \
    [a1]; \
[a0][a1]
    amix = inputs=2: duration=shortest" \
-c:a libmp3lame -q:a 2 output.mp3

# applying a low and high pass filter
# ffmpeg -i knox.mp3 -i static.mp3 -filter_complex \
# "[0:a]volume='0.5 + 0.5 * cos(PI * t / 5)':eval=frame, \
#       lowpass=f=3000, highpass=f=200 \
#     [audio0a]; \
# [1:a]volume='0.5 - 0.5 * cos(PI * t / 5)':eval=frame, \
#       volume='min(1, max(0, 0.5 - 0.5 * cos(PI * t / 5)))':eval=frame[audio1a]; \
# [audio0a][audio1a]amix=inputs=2:duration=shortest" \
# -c:a libmp3lame -q:a 2 output.mp3

# applying low/highpass filters + phaser + echo
# ffmpeg -i knox.mp3 -i static.mp3 -filter_complex \
# "[0:a]volume='min(1, max(0, 0.5 + 0.5 * cos(PI * t / 5)))':eval=frame, \
#     lowpass=f=3000:mix='min(1, max(0, 0.8 - 0.8 * cos(PI * t / 5)))':eval=frame, \
#     highpass=f=200:mix='min(1, max(0, 0.8 - 0.8 * cos(PI * t / 5)))':eval=frame [a0]; \
#  [1:a]volume='min(1, max(0, 0.5 - 0.5 * cos(PI * t / 5)))':eval=frame [a1]; \
#  [a0][a1]amix=inputs=2:duration=shortest" \
# -c:a libmp3lame -q:a 2 output.mp3

# ffmpeg -i input.mp3 -filter_complex \
# "afftdn, aeq=frequency=1000:width_type=o:w=1000:g=-10, aphaser=type=sine:speed=0.5, aecho=0.8:0.88:60:0.4" \
# output.mp3

# ffmpeg -i knox.mp3 -i static.mp3 -filter_complex \
# "[0:a]volume='min(1, max(0, 0.5 + 0.5 * cos(PI * t / 5)))':eval=frame, \
# lowpass=f='min(20000, max(20, 20000 * (0.8 - 0.8 * cos(PI * t / 5))))':eval=frame[a0]; \
# [1:a]volume='min(1, max(0, 0.5 - 0.5 * cos(PI * t / 5)))':eval=frame[a1]; \
# [a0][a1]amix=inputs=2:duration=shortest" \
# -c:a libmp3lame -q:a 2 output.mp3

# ffmpeg -i knox.mp3 -i static.mp3 -filter_complex \
# "[0:a]volume='min(1, max(0, 0.5 + 0.5 * cos(PI * t / 5)))':eval=frame, \
# firequalizer=gain='if(between(f,0,20000), (0.8 - 0.8 * cos(PI * t / 5)) * -96, -96)':eval=frame[a0]; \
# [1:a]volume='min(1, max(0, 0.5 - 0.5 * cos(PI * t / 5)))':eval=frame[a1]; \
# [a0][a1]amix=inputs=2:duration=shortest" \
# -c:a libmp3lame -q:a 2 output.mp3



# Filters with Timeline Support
# Filters:
#   T.. = Timeline support
#   .S. = Slice threading
#   ..C = Command support
#   A = Audio input/output
#   V = Video input/output
#   N = Dynamic number and/or type of input/output
#   | = Source or sink filter
# 
#  TSC aap               AA->A      Apply Affine Projection algorithm to first audio stream.
#  T.C acrusher          A->A       Reduce audio bit resolution.
#  TS. adeclick          A->A       Remove impulsive noise from input audio.
#  TS. adeclip           A->A       Remove clipping from input audio.
#  TS. adecorrelate      A->A       Apply decorrelation to input audio.
#  T.C adelay            A->A       Delay one or more audio channels.
#  TSC adenorm           A->A       Remedy denormals by adding extremely low-level noise.
#  T.. aderivative       A->A       Compute derivative of input audio.
#  TSC adrc              A->A       Audio Spectral Dynamic Range Controller.
#  TSC adynamicequalizer A->A       Apply Dynamic Equalization of input audio.
#  T.C adynamicsmooth    A->A       Apply Dynamic Smoothing of input audio.
#  TSC aemphasis         A->A       Audio emphasis.
#  T.. aeval             A->A       Filter audio signal according to a specified expression.
#  T.C aexciter          A->A       Enhance high frequency part of audio.
#  T.C afade             A->A       Fade in/out input audio.
#  TSC afftdn            A->A       Denoise audio samples using FFT.
#  TS. afftfilt          A->A       Apply arbitrary expressions to samples in frequency domain.
#  TSC afreqshift        A->A       Apply frequency shifting to input audio.
#  TSC afwtdn            A->A       Denoise audio stream using Wavelets.
#  T.C agate             A->A       Audio gate.
#  T.. aintegral         A->A       Compute integral of input audio.
#  T.. alatency          A->A       Report audio filtering latency.
#  T.C alimiter          A->A       Audio lookahead limiter.
#  TSC allpass           A->A       Apply a two-pole all-pass filter.
#  T.. ametadata         A->A       Manipulate audio frame metadata.
#  TSC anequalizer       A->N       Apply high-order audio parametric multi band equalizer.
#  TSC anlmdn            A->A       Reduce broadband noise from stream using Non-Local Means.
#  TSC anlmf             AA->A      Apply Normalized Least-Mean-Fourth algorithm to first audio stream.
#  TSC anlms             AA->A      Apply Normalized Least-Mean-Squares algorithm to first audio stream.
#  T.. apad              A->A       Pad audio with silence.
#  T.C aperms            A->A       Set permissions for the output audio frame.
#  TSC aphaseshift       A->A       Apply phase shifting to input audio.
#  TS. apsnr             AA->A      Measure Audio Peak Signal-to-Noise Ratio.
#  TSC apsyclip          A->A       Audio Psychoacoustic Clipper.
#  TSC arls              AA->A      Apply Recursive Least Squares algorithm to first audio stream.
#  TSC arnndn            A->A       Reduce noise from speech using Recurrent Neural Networks.
#  TS. asdr              AA->A      Measure Audio Signal-to-Distortion Ratio.
#  T.C asetnsamples      A->A       Set the number of samples for each output audio frames.
#  T.. asidedata         A->A       Manipulate audio frame side data.
#  TS. asisdr            AA->A      Measure Audio Scale-Invariant Signal-to-Distortion Ratio.
#  TSC asoftclip         A->A       Audio Soft Clipper.
#  TSC asubboost         A->A       Boost subwoofer frequencies.
#  TSC asubcut           A->A       Cut subwoofer frequencies.
#  TSC asupercut         A->A       Cut super frequencies.
#  TSC asuperpass        A->A       Apply high order Butterworth band-pass filter.
#  TSC asuperstop        A->A       Apply high order Butterworth band-stop filter.
#  TSC atilt             A->A       Apply spectral tilt to audio.
#  TSC bandpass          A->A       Apply a two-pole Butterworth band-pass filter.
#  TSC bandreject        A->A       Apply a two-pole Butterworth band-reject filter.
#  TSC bass              A->A       Boost or cut lower frequencies.
#  TSC biquad            A->A       Apply a biquad IIR filter with the given coefficients.
#  T.C compensationdelay A->A       Audio Compensation Delay Line.
#  T.C crossfeed         A->A       Apply headphone crossfeed filter.
#  TSC crystalizer       A->A       Simple audio noise sharpening filter.
#  T.. dcshift           A->A       Apply a DC shift to the audio.
#  T.. deesser           A->A       Apply de-essing to the audio.
#  T.C dialoguenhance    A->A       Audio Dialogue Enhancement.
#  TSC dynaudnorm        A->A       Dynamic Audio Normalizer.
#  TSC equalizer         A->A       Apply two-pole peaking equalization (EQ) filter.
#  T.C extrastereo       A->A       Increase difference between stereo audio channels.
#  TSC highpass          A->A       Apply a high-pass filter with 3dB point frequency.
#  TSC highshelf         A->A       Apply a high shelf filter.
#  TSC lowpass           A->A       Apply a low-pass filter with 3dB point frequency.
#  TSC lowshelf          A->A       Apply a low shelf filter.
#  T.C sidechaingate     AA->A      Audio sidechain gate.
#  T.C silenceremove     A->A       Remove silence.
#  T.C speechnorm        A->A       Speech Normalizer.
#  T.C stereotools       A->A       Apply various stereo tools.
#  T.C stereowiden       A->A       Apply stereo widening effect.
#  TSC tiltshelf         A->A       Apply a tilt shelf filter.
#  TSC treble            A->A       Boost or cut upper frequencies.
#  T.. tremolo           A->A       Apply tremolo effect.
#  T.. vibrato           A->A       Apply vibrato effect.
#  T.C virtualbass       A->A       Audio Virtual Bass.
#  T.C volume            A->A       Change input volume.
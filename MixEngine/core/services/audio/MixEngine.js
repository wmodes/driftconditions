// MixEngine.js - Main audio processing engine for mixing audio clips

const { database: db } = require('config');
const ffmpeg = require('fluent-ffmpeg');
const JSON5 = require('json5');
const logger = require('config/logger').custom('MixEngine', 'debug');
const path = require('path');

const { config } = require('config');
const contentFileDir = config.content.contentFileDir;
const mixFileDir = config.content.mixFileDir;
const ffmpegOutput = config.ffmpeg.output;
const filterConfig = config.filters;
const exprsConfig = config.exprs;

class MixEngine {
  constructor() {
    this.exprs = this._substituteExpressions(exprsConfig);
    // logger.debug(`MixEngine:constructor: exprs: ${JSON5.stringify(this.exprs, null, 2)}`);
    this.filterChain = [];
    // store the current input, track, and clip
    this.currentInputNum = 0;
    this.currentTrackNum = 0;
    this.currentClipNum = 0;
    // store the track output labels
    this.trackFinalLabels = []; 
    // final output label
    this.finalOutputLabel = '';
    // output file name
    this.mixFilename = '';
    this.mixFilepath = '';
    // amix duration
    this.amixDuration = 'longest';
  }

  _substituteExpressions(exprsConfig) {
    const exprs = { ...exprsConfig };
    for (let key in exprs) {
      exprs[key] = this._replacePlaceholders(exprs[key], exprs);
    }
    return exprs;
  }

  _replacePlaceholders(str, exprs) {
    return str.replace(/%\{(\w+)\}/g, (_, exprKey) => exprs[exprKey]);
  }

  _resetState() {
    this.filterChain = [];
    this.currentInputNum = 0;
    this.currentTrackNum = 0;
    this.currentClipNum = 0;
    this.trackFinalLabels = []; 
    this.finalOutputLabel = '';
    this.mixFilename = '';
    this.mixFilepath = '';
    this.amixDuration = 'longest';
  }

  async makeMix(recipe, mixDetails) {
    // Reset state
    this._resetState();
    const recipeObj = recipe.recipeObj;
    //
    // Setup ffmpeg command
    const ffmpegCmd = ffmpeg();
    //
    // setup inputs
    this._setupInputs(ffmpegCmd, recipeObj);
    logger.debug(`MixEngine:makeMix: ffpegInputs added`);
    //
    // Build the filter chain
    this._buildComplexFilter(recipeObj);
    //
    // Define output path
    // const mixID = 999;  // Placeholder for testing
    mixDetails.filepath = this._setMixFilepath(mixDetails.mixID, recipe);
    //
    // Configure output and run the ffmpeg process
    await this._configureAndRun(ffmpegCmd);
  }

  _setupInputs(ffmpegCmd, recipeObj) {
    recipeObj.forEach(track => {
        track.clips.forEach(clip => {
            if (!clip.classification.includes('silence')) {
                const filePath = path.join(contentFileDir, clip.filename);
                ffmpegCmd.input(filePath);
                logger.debug(`Input file added: ${filePath}`);
            }
        });
    });
  }

  _setMixFilepath(mixID, recipe) {
    const mixFilename = `${this._sanitizeFilename(`${mixID}_${recipe.title}`)}.mp3`;
    this.mixFilename = mixFilename;
    const mixFilepath = path.join(mixFileDir, mixFilename);
    logger.debug(`MixEngine:makeMix: mixFilepath: ${mixFilepath}`);
    this.mixFilepath = mixFilepath;
    return this.mixFilepath;
  }

  // method to build the complete filter chain
  _buildComplexFilter(recipeObj) {
    // clear the filterChain
    this.filterChain = [];
    // clear some counters
    this.currentInputNum = 0;
    this.currentTrackNum = 0;
    // set amix duration
    this.amixDuration = 'longest';
    // track the outputs of each track, later we will mix these
    let trackOutputs = [];
    //
    // Build filters for each track
    this._buildAllTracksAndClipsFilters(recipeObj);
    //
    // Build the final mix filter
    this._buildMixFilter(recipeObj);
    logger.debug(`MixEngine:_buildComplexFilter: filterChain: ${JSON5.stringify(this.filterChain, null, 2)}`);
  }

  _buildAllTracksAndClipsFilters(recipeObj) {
    // TODO: should "tracks" be the first key in the recipeData?
    recipeObj.forEach(track => {
      // set track filters and outputs
      this._buildTrackFilters(track);
      // increment the track number
      this.currentTrackNum++;
    });
  }

  // Concatenates clips within a track and applies volume adjustment to the entire track if specified
  _buildTrackFilters(track) {
    // clear our clip counter
    this.currentClipNum = 0;
    // gather clip output labels
    let clipOutputLabels = [];
    //
    // track base label
    const trackBaseLabel = `track_${this.currentTrackNum}`;
    // Keep track of the track label so far
    let mostRecentTrackLabel = '';
    let newTrackLabel = '';
    //
    // we start with a track object
    // and go through the clips in the track
    newTrackLabel = trackBaseLabel + '_base';
    track.clips.forEach(clip => {
      // build the filters for each clip
      // this will include volume adjustment, silence generation, and any filters
      const currentClipOutput = this._buildClipFilters(clip);
      //
      // add the clip output to the clipOutputLabels array
      clipOutputLabels.push(currentClipOutput);
      //
      // increment the clip number
      this.currentClipNum++;
    });
    //
    // Concat inputs including silence
    this.filterChain.push({
      filter: 'concat',
      options: {
        n: clipOutputLabels.length,
        v: 0,
        a: 1
      },
      inputs: clipOutputLabels,
      outputs: newTrackLabel
    });
    // set the track label for the next step
    mostRecentTrackLabel = newTrackLabel;
    //
    // Set volume of track
    if (track.volume) {
      logger.debug(`MixEngine:_buildTrackFilters(): track.volume: ${track.volume} typeof: ${typeof track.volume}`);
      newTrackLabel = trackBaseLabel + '_volume';
      // 
      // Handle track volume adjustment
      let volOptions = {};
      // If we have a number, set volume of input
      if (typeof track.volume === 'number') {
        volOptions.volume = (track.volume || 100) / 100;
      } 
      // if we have a volume command, handle it
      else if (typeof track.volume === 'string') {
        // test if track Volume is cmd(param), if so extract cmd and param
        const volCmdWithParam = track.volume.match(/^(-?\w+)\(([^)]+)\)$/);
        let volCmd = '';
        let volCmdParam = '';
        if (volCmdWithParam) {
          const [_, cmd, param] = volCmdWithParam;
          volCmd = cmd;
          volCmdParam = param;
        } else {
          volCmd = track.volume;
          // perhaps we will have other stuff here
        }
        logger.debug(`MixEngine:_buildTrackFilters(): volCmd: ${volCmd}, volCmdParam: ${volCmdParam}`);
        let n = 1;
        switch (volCmd) {
          case 'noise':
            volOptions = {
              volume: this._buildNoiseFilter(volCmdParam),
              eval: 'frame'
            };
            this.amixDuration = 'shortest';
            break;
          default:
            volOptions.volume = 1.0;
            break;
        }
      } else {
        volOptions.volume = 1.0;
      }
      //
      // now create track filter volume entry
      this.filterChain.push({
        inputs: mostRecentTrackLabel,
        filter: 'volume',
        options: volOptions,
        outputs: newTrackLabel
      });
      // set the track label for the next step
      mostRecentTrackLabel = newTrackLabel;
    }
    //
    // effects
    //
    // looping effect
    if (track.effects && track.effects.includes("loop")) { 
      newTrackLabel = trackBaseLabel + '_loop';
      this.filterChain.push({
        inputs: mostRecentTrackLabel,
        filter: 'aloop',
        options: {
          loop: -1,
          size: 2e9,
        },
        outputs: newTrackLabel
      });
      // ensure that we don't loop forever
      this.amixDuration = 'shortest';
      // set the track label for the next step
      mostRecentTrackLabel = newTrackLabel;
    }
    // set the final track label
    this.trackFinalLabels.push(mostRecentTrackLabel);
  }

  // Build a harmonic series filter using a mix of sine and cosine at different scales
  //  It takes a config object like this with all values optional:
  //  {
  //    genFreqFact (f): [f1, f2, f3],// scales freq of sin and cos , default [13, 7, 3]
  //    genAmpFact (a): [a1, a2, a3], // scales amp of sin and cos, default [1, 0.5, 0.25]
  //    globFreqFact: n,              // higher numbers = less freq transitions, default 1
  //    globAmpFact: s,               // creates more flat top graph, default 3
  //    globAmpPol: p,                // above the graph line (+1) or below the line (-1), default 1.
  //    globPreBias: o,               // makes neg globAmpFact less likely to transition, default -0.5
  //    globPostBias: q,              // creates crossfade at edges of transitions, default 0.5
  //  }
  // The result will alwyas be clamped between 0 and 1 and look like this:
  //   min(1, max(0, 
  //       ((
  //           cos(PI * t * n / f1) * a1 + 
  //           sin(PI * t * n / f2) * a2 + 
  //           cos(PI * t * n / f3) * a3
  //         ) - 0.5 
  //       ) * a + 0.5,
  //     ))
  _buildNoiseFilter(noiseOpts) {
    let noiseObj = {};
    if (typeof noiseOpts === 'string') {
      // if we have a string, we assume it's a preset
      if (!(noiseOpts in filterConfig.noise.presets)) {
        logger.debug(`MixEngine:_buildNoiseFilter: noiseOpts: ${noiseOpts} not found in presets`);
        noiseObj = filterConfig.noise.presets.default;
      } else {
        logger.debug(`MixEngine:_buildNoiseFilter: noiseOpts: ${noiseOpts} found in presets`);
        noiseObj = filterConfig.noise.presets[noiseOpts];
      }
    } else if (typeof noiseOpts === 'object') {
      // if we have an object, we assume it's a config so we merge it with the default
      noiseObj = Object.assign({}, filterConfig.noise.presets.default, noiseOpts);
    } else {
      // if we have nothing, we assume it's the default
      noiseObj = filterConfig.noise.presets.default;
    }
    // set individual values
    let genFreqFact = noiseObj.genFreqFact || noiseObj.f;
    let genAmpFact = noiseObj.genAmpFact || noiseObj.a;
    let globFreqFact = noiseObj.globFreqFact || noiseObj.n;
    let globAmpFact = noiseObj.globAmpFact || noiseObj.s;
    let globAmpPol = noiseObj.globAmpPolarity || noiseObj.p;
    let globPreBias = noiseObj.globPreBias || noiseObj.o;
    let globPostBias = noiseObj.globPostBias || noiseObj.q;

    // if we require more genFreqFact than we have genAmpFact, pad with 1
    genAmpFact = genAmpFact.concat(Array.from({length: genFreqFact.length - genAmpFact.length}, () => 1));
    // construct the generators
    const genStr = genFreqFact.map((f, i) => {
      return `cos(PI * t * ${globFreqFact} / ${f}) * ${genAmpFact[i]}`;
    }).join(' + ');
    // construct the filter
    const noiseFilter = `min(1, max(0, ((${genStr}) + ${globPreBias} ) * ${globAmpFact} * ${globAmpPol} + ${globPostBias}))`;
    // console.log(`noiseFilter: ${noiseFilter}`);
    return noiseFilter;
  }

  // Builds the ffmpeg input and initial filter for each clip, including handling for silence
  _buildClipFilters(clip) {
    //
    // track base label
    const clipBaseLabel = `clip_${this.currentTrackNum}_${this.currentClipNum}`;
    // Keep track of the track label so far
    let mostRecentClipLabel = '';
    let newClipLabel = '';
    // start processing the clip
    newClipLabel = clipBaseLabel + '_base';
    if (clip.classification.includes("silence")) {
        // Handle silence generation
        const silenceDuration = clip.duration || 10; // Default to 10 seconds
        this.filterChain.push({
            filter: 'aevalsrc',
            options: {
              exprs: 0,
              duration: silenceDuration
            },
            outputs: newClipLabel
        });
        logger.debug(`MixEngine:_buildClip(): Generating silence of duration ${silenceDuration} seconds with label ${newClipLabel}`);
        // set the track label for the next step
        mostRecentClipLabel = newClipLabel;
        return mostRecentClipLabel;
    } else {
        // 
        // Handle clip volume adjustment
        let volOptions = {};
        // If we have a number, set volume of input
        if (typeof clip.volume === 'number') {
          volOptions.volume = (clip.volume || 100) / 100;
        } 
        // if we have a volume command, handle it
        else if (typeof clip.volume === 'string') {
          // test if clip Volume is cmd(param), if so extract cmd and param
          const volCmdWithParam = clip.volume.match(/^(-?\w+)\(([^)]+)\)$/);
          if (volCmdWithParam) {
            const [_, volCmd, volCmdParam] = volCmdWithParam;
          } else {
            volCmd = clip.volume;
            // perhaps we will have other stuff here
          }
          let n = 1;
          switch (volCmd) {
            case 'noise':
              volOptions = {
                volume: this._buildNoiseFilter(volCmdParam),
                eval: 'frame'
              };
              this.amixDuration = 'shortest';
              break;
            default:
              volOptions.volume = 1.0;
              break;
          }
        } else {
          volOptions.volume = 1.0;
        }
        //
        // now create clip filter volume entry
        this.filterChain.push({
          inputs: `${this.currentInputNum}:a`,
          filter: 'volume',
          options: volOptions,
          outputs: newClipLabel
        });
        // set the clip label for the next step
        mostRecentClipLabel = newClipLabel;
        //
        // effects
        //
        // looping effect
        if (clip.effects && clip.effects.includes("loop")) { 
          newClipLabel = clipBaseLabel + '_loop';
          this.filterChain.push({
            inputs: mostRecentClipLabel,
            filter: 'aloop',
            options: {
              loop: -1,
              size: 2e9,
            },
            outputs: newClipLabel
          });
          // ensure that we don't loop forever
          this.amixDuration = 'shortest';
          // set the track label for the next step
          mostRecentClipLabel = newClipLabel;
        }
        // increment the input number
        this.currentInputNum++;
        // return the most recent clip label
        return mostRecentClipLabel;
    }
  }

  // Mixes all tracks from the recipe
  _buildMixFilter(recipeObj) {
    if (this.trackFinalLabels.length === 1) {
      // If there is only one track, we don't need to mix anything
      this.finalOutputLabel = this.trackFinalLabels[0];
    } else {
      const finalOutputLabel = 'out';
      logger.debug(`MixEngine:_buildMix(): Mixing tracks [${this.trackFinalLabels.join(', ')}] into ${finalOutputLabel}`);
      this.filterChain.push({
        filter: 'amix',
        options: {
          inputs: this.trackFinalLabels.length,
          duration: this.amixDuration
        },
        inputs: this.trackFinalLabels,
        outputs: finalOutputLabel
      });
      this.finalOutputLabel = finalOutputLabel;
    }
  }

  _sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9_\-().\s]+/gi, '').replace(/\s+/g, '_');
  }

  _configureAndRun(ffmpegCmd) {
    return new Promise((resolve, reject) => {
      ffmpegCmd
        .complexFilter(this.filterChain)
        .audioCodec(ffmpegOutput.codec) // Set audio codec from config
        .audioBitrate(ffmpegOutput.bitrate) // Set audio bitrate from config
        .audioChannels(ffmpegOutput.channels) // Set audio channels from config
        .audioFrequency(ffmpegOutput.sampleRate) // Set audio sample rate from config
        .outputOptions([`-map [${this.finalOutputLabel}]`, "-v info"])
        .output(this.mixFilepath)
        .on('end', function() {
            logger.debug('Transcoding succeeded !');
            resolve();
        })
        .on('error', function(err, stdout, stderr) {
            logger.error('Cannot process audio: ' + err.message);
            console.log('ffmpeg stdout:\n' + stdout);
            console.log('ffmpeg stderr:\n' + stderr);
            reject(err);
        })
        .run()
    });
  }

  _getMixDuration(recipeObj) {
    // find longest track
    let longestTrack = 0;
    recipeObj.forEach(track => {
      let trackDuration = 0;
      track.clips.forEach(clip => {
        trackDuration += clip.duration;
      });
      if (trackDuration > longestTrack) {
        longestTrack = trackDuration;
      }
    });
    return longestTrack;
  }

  _setupTestInputs() {
    // Test method to setup ffmpeg inputs
    const command = ffmpeg();
    command.input(path.join(contentFileDir, '2024/04/crash-aluminum-and-metal-dropping-on-concrete.mp3'));
    return command;
  }

  _getTestFilterChain() {
    // Test method to run the mix engine
    const filterChain = [
      {
          filter: 'anull', // This filter does nothing; it simply passes audio through.
          inputs: '0',
          outputs: 'final_output'
      }
    ];
    return filterChain;
  }

  async _testFmpegDirect(filename) {
    const command = ffmpeg();
    const files = [
      '2024/04/dirty-radio-static-w-buzzes-and-beeps.mp3',
      '2024/04/dust-storm-warning-nevada.mp3',
      '2024/04/bio-unit-ambient-3.mp3',
    ];
    files.forEach(file => {
      const filePath = path.join(contentFileDir, file);  
      command.input(filePath);
      logger.debug(`Input file added: ${filePath}`);
    });

    const filterChain = [
      // Adjust volume of input 0 to 75%
      {
        filter: 'volume',
        options: {
          volume: '0.75' // Adjust volume to 75%
        },
        inputs: '0:a', // Specify input 0 audio stream
        outputs: 'adjInput0' // Output label for adjusted input 0 stream
      },
      // Adjust volume of input 1 to 100%
      {
        filter: 'volume',
        options: {
          volume: '1.0' // Adjust volume to 100%
        },
        inputs: '1:a', // Specify input 1 audio stream
        outputs: 'adjInput1' // Output label for adjusted input 1 stream
      },
      // Concatenate adjusted input streams
      {
        filter: 'concat',
        options: {
          n: '2', // Number of segments to concatenate
          v: '0', // Set to '1' if the streams have different sample rates, formats, or channel layouts
          a: '1' // Indicates that the filter is for audio concatenation
        },
        inputs: ['adjInput0', 'adjInput1'], // Specify the adjusted input audio streams to concatenate
        outputs: 'track0' // Output label for concatenated track stream
      },
      // Adjust volume of concatenated track to 75%
      {
        filter: 'volume',
        options: {
          volume: '0.25' // Adjust volume to 75%
        },
        inputs: 'track0', // Specify concatenated track audio stream
        outputs: 'adjTrack0' // Output label for adjusted concatenated track stream
      },
      // Adjust volume of input 2 to 100%
      {
        filter: 'volume',
        options: {
          volume: '1.0' // Adjust volume to 100%
        },
        inputs: '2:a', // Specify input 2 audio stream
        outputs: 'adjInput2' // Output label for adjusted input 2 stream
      },
      // Mix adjTrack0 and adjInput2
      {
        filter: 'amix',
        options: {
          inputs: '2' // Number of input channels to mix
        },
        inputs: ['adjTrack0', 'adjInput2'], // Specify the adjusted input audio streams to mix
        outputs: 'out' // Output label for final mixed output stream
      }
    ];

    const outputFilepath = path.join(mixFileDir, 'direct_test_output.mp3');
    command
      .complexFilter(filterChain)
      .audioCodec('libmp3lame')
      .outputOptions(["-map [out]", "-v info"])  // Select output from concat filter
      .output(outputFilepath)
      .on('end', function() {
          console.log('Transcoding succeeded !');
      })
      .on('error', function(err, stdout, stderr) {
          console.log('Cannot process audio: ' + err.message);
          console.log('ffmpeg stdout:\n' + stdout);
          console.log('ffmpeg stderr:\n' + stderr);
      })
      .run()
  }

  _testVolumeAdjustment(filename) {
    const command = ffmpeg();
    const inputFilePath = path.join(contentFileDir, filename);
    command.input(inputFilePath);

    const outputFilePath = path.join(mixFileDir, 'volume_adjustment_test.mp3');

    // Setup a simple volume filter
    const filterChain = [
        {
            filter: 'volume',
            options: 'volume=0.8',
            inputs: '0',
            outputs: 'final_output'
        }
    ];

    command.complexFilter(filterChain)
           .output(outputFilePath)
           .audioCodec('libmp3lame')
           .on('error', function(err, stdout, stderr) {
               console.log('Error during ffmpeg processing: ' + err.message);
               console.log('ffmpeg stdout:\n' + stdout);
               console.log('ffmpeg stderr:\n' + stderr);
           })
           .on('end', function() {
               console.log('Processing finished successfully');
           });

    command.run();
  } 

}

module.exports = MixEngine;

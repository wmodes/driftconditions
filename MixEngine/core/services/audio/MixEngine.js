/**
 * @file MixEngine.js - Main audio processing engine for mixing audio clips
 */

const logger = require('config/logger').custom('MixEngine', 'debug');
const { database: db } = require('config');
const ffmpeg = require('fluent-ffmpeg');
const JSON5 = require('json5');
const path = require('path');

const { config } = require('config');
const contentFileDir = config.content.contentFileDir;
const mixFileDir = config.content.mixFileDir;
const ffmpegOutput = config.ffmpeg.output;
const filterConfig = config.filters;
const exprsConfig = config.exprs;

/**
 * Class representing the MixEngine.
 */
class MixEngine {
  constructor() {
    this.exprs = this._substituteExpressions(exprsConfig);
    logger.debug('MixEngine:constructor: exprs:');
    for (let key in this.exprs) {
      if (this.exprs.hasOwnProperty(key)) {
        logger.debug(`${key}: ${this.exprs[key]}`);
      }
    }
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

  /**
   * Substitutes expressions in the configuration.
   *
   * @param {Object} exprsConfig - The expressions configuration.
   * @returns {Object} The substituted expressions.
   * @private
   */
  _substituteExpressions(exprsConfig) {
    let exprs = this._keysToLowercase(exprsConfig); // Convert keys to lowercase at the start
    let exprsSubstNeeded = this._getListOfExprSubstNeeded(exprs);
    let loopNum = 0;

    while (exprsSubstNeeded.length > 0 && loopNum < 5) {
      for (let key of exprsSubstNeeded) {
        this._replacePlaceholder(exprs, key);
      }
      exprsSubstNeeded = this._getListOfExprSubstNeeded(exprs);
      loopNum++;
    }

    logger.debug('Substituted exprs:');
    for (let key in exprs) {
      if (exprs.hasOwnProperty(key)) {
        logger.debug(`${key}: ${exprs[key]}`);
      }
    }

    return exprs;
  }

  /**
   * Converts all keys in the object to lowercase.
   *
   * @param {Object} obj - The object with keys to convert.
   * @returns {Object} The object with lowercase keys.
   * @private
   */
    _keysToLowercase(obj) {
      const lowerCaseObj = {};
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          lowerCaseObj[key.toLowerCase()] = obj[key];
        }
      }
      return lowerCaseObj;
    }

  /**
   * Gets a list of keys that contain unresolved placeholders.
   *
   * @param {Object} exprsObj - The expressions object.
   * @returns {string[]} - Array of keys with unresolved placeholders.
   * @private
   */
  _getListOfExprSubstNeeded(exprsObj) {
    const keyArray = [];
    for (let key in exprsObj) {
      if (/%\{\w+\}/.test(exprsObj[key])) {
        keyArray.push(key);
      }
    }
    return keyArray;
  }

  /**
   * Replaces placeholders in a string with corresponding values from expressions.
   *
   * @param {Object} exprsObj - The expressions object.
   * @param {string} exprKey - The key of the expression to replace placeholders in.
   * @private
   */
  _replacePlaceholder(exprsObj, exprKey) {
    const value = exprsObj[exprKey];
    exprsObj[exprKey] = value.replace(/%\{(\w+)\}/g, (_, placeholderKey) => {
      const replacement = exprsObj[placeholderKey.toLowerCase()] || '';
      logger.debug(`Replacing %{${placeholderKey}} with ${replacement}`);
      return replacement;
    });
  }

  /**
   * Resets the internal state of the MixEngine.
   * @private
   */
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

  /**
   * Creates a mix based on the provided recipe and mix details.
   *
   * @param {Object} recipe - The recipe object.
   * @param {Object} mixDetails - The mix details object.
   * @returns {Promise<void>} A promise that resolves when the mix is created.
   * @async
   */
  async makeMix(recipe, mixDetails) {
    // Reset state
    this._resetState();
    const recipeObj = recipe.recipeObj;
    console.debug(`MixEngine:makeMix: recipeObj: ${JSON5.stringify(recipeObj, null, 2)}`);
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
    this._setMixFilepath(mixDetails.mixID, recipe);
    mixDetails.filename = this.mixFilename;
    mixDetails.filepath = this.mixFilepath;
    //
    // Configure output and run the ffmpeg process
    await this._configureAndRun(ffmpegCmd);
  }

  /**
   * Sets up the ffmpeg inputs based on the recipe object.
   *
   * @param {Object} ffmpegCmd - The ffmpeg command object.
   * @param {Object} recipeObj - The recipe object.
   * @private
   */
  _setupInputs(ffmpegCmd, recipeObj) {
    recipeObj.tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (!clip.classification.includes('silence')) {
          const filePath = path.join(contentFileDir, clip.filename);
          ffmpegCmd.input(filePath);
          logger.debug(`Input file added: ${filePath}`);
        }
      });
    });
  }  

  /*
   * BUILD INPUTS
   */

  /**
   * Sets the file path for the mix output.
   *
   * @param {number} mixID - The mix ID.
   * @param {Object} recipe - The recipe object.
   * @sideeffect this.mixFilename, this.mixFilepaths
   * @private
   */
  _setMixFilepath(mixID, recipe) {
    const mixFilename = `${this._sanitizeFilename(`${mixID}_${recipe.title}`)}.mp3`;
    this.mixFilename = mixFilename;
    const mixFilepath = path.join(mixFileDir, mixFilename);
    logger.debug(`MixEngine:makeMix: mixFilepath: ${mixFilepath}`);
    this.mixFilepath = mixFilepath;
  }

  /**
   * Builds the complete filter chain for the ffmpeg command.
   *
   * @param {Object} recipeObj - The recipe object.
   * @private
   */
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

  /**
   * Builds filters for all tracks and clips in the recipe.
   *
   * @param {Object} recipeObj - The recipe object.
   * @private
   */
  _buildAllTracksAndClipsFilters(recipeObj) {
    recipeObj.tracks.forEach(track => {
      // set track filters and outputs
      this._buildTrackFilters(track);
      // increment the track number
      this.currentTrackNum++;
    });
  }  

  /*
   * TRACK FILTERS
   */


  /**
   * Concatenates clips within a track and applies volume adjustment to the entire track if specified.
   *
   * @param {Object} track - The track object.
   * @private
   */
  _buildTrackFilters(track) {
    // clear our clip counter
    this.currentClipNum = 0;
    // gather clip output labels for concatenation
    let clipOutputLabels = [];
    //
    // track base label
    const baseLabel = `track-${this.currentTrackNum}`;
    // Keep track of the track label so far
    let nextInputSrc = '';
    //
    // we start with a track object
    // and go through the clips in the track
    //
    track.clips.forEach(clip => {
      // build the filters for each clip
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
    let newTrackLabel = baseLabel + '_concat';
    this.filterChain.push({
      inputs: clipOutputLabels,
      filter: 'concat',
      options: {
        n: clipOutputLabels.length,
        v: 0,
        a: 1
      },
      outputs: newTrackLabel
    });
    // set the track label for the next step
    nextInputSrc = newTrackLabel;
    //
    // Set volume of track
    if ('volume' in track) {
      logger.debug(`MixEngine:_buildTrackFilters(): Applying volume filter to track ${track.volume}`);
      nextInputSrc = this._volumeFilter(
        nextInputSrc, 
        baseLabel, 
        track.volume
      );
    }
    //
    // effects
    if (track.effects) {
      logger.debug(`MixEngine:_buildTrackFilters(): Applying effects to track ${track.effects}`);
      track.effects.forEach(effect => {
        // loop effect
        if (/^(loop|repeat)/i.test(effect)) {
          logger.debug(`MixEngine:_buildTrackFilters(): Applying loop effect to track ${effect}`);
          nextInputSrc = this._loopEffect(
            nextInputSrc, 
            baseLabel, 
            this._getParams(effect)
          );
        }
        // wave effect
        else if (/^(noise|wave)/i.test(effect)) {
          logger.debug(`MixEngine:_buildtrackFilters(): Applying wave effect to track ${effect}`);
          nextInputSrc = this._waveEffect(
            nextInputSrc, 
            baseLabel, 
            this._getParams(effect)
          );
        }
        // backward effect
        else if (/^(backward|reverse)/i.test(effect)) {
          logger.debug(`MixEngine:_buildClipFilters(): Applying backward effect to clip ${effect}`);
          nextInputSrc = this._backwardEffect(
            nextInputSrc, 
            baseLabel, 
            this._getParams(effect)
          );
        }
        // faraway effect
        else if (/^(faraway|distant)/i.test(effect)) {
          logger.debug(`MixEngine:_buildtrackFilters(): Applying faraway effect to track ${effect}`);
          nextInputSrc = this._farawayEffect(
            nextInputSrc, 
            baseLabel, 
            this._getParams(effect)
          );
        }
        // detune effect
        else if (effect.toLowerCase().startsWith('detune')) {
          logger.debug(`MixEngine:_buildtrackFilters(): Applying detune effect to track ${effect}`);
          nextInputSrc = this._detuneEffect(
            nextInputSrc, 
            baseLabel, 
            this._getParams(effect)
          );
        }
        // shortest, longest, and first effects
        // (these don't really apply to tracks)
        else if (effect.toLowerCase() == 'first') {
          this.amixDuration = 'first';
        }
        else if (effect.toLowerCase() == 'shortest') {
          this.amixDuration = 'shortest';
        }
        else if (effect.toLowerCase() == 'longest') {
          // TODO: this needs to be handled with care because this combined with a loop effect 
          // can create an infinite loop 
          this.amixDuration = 'longest';
        }
      }); // end of effects
    } // end of track
    // set the final track label
    this.trackFinalLabels.push(nextInputSrc);
  }

  /**
   * Builds a harmonic series filter using a mix of sine and cosine at different scales.
   *
   * @param {Object|string} noiseOpts - The noise options or preset name.
   * @returns {string} The noise filter string.
   * @private
   */
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

  /*
   * CLIP FILTERS
   */

  /**
   * Builds the ffmpeg input and initial filter for each clip, including handling for silence.
   *
   * @param {Object} clip - The clip object.
   * @returns {string} The label of the most recent clip.
   * @private
   */
  _buildClipFilters(clip) {
    logger.debug(`MixEngine:_buildClipFilters(): clip: ${JSON5.stringify(clip, null, 2)}`);
    //
    // clip base label
    const baseLabel = `clip-${this.currentTrackNum}-${this.currentClipNum}`;
    // Keep track of the track label so far
    let nextInputSrc = '';
    //
    // Handle silence generation
    if (clip.classification.includes("silence")) {
      logger.debug(`MixEngine:_buildClipFilters(): Generating silence for clip ${baseLabel}`);
      nextInputSrc = this._silenceFilter(baseLabel, clip.duration);
      // return without incrementing the input number
      return nextInputSrc;
    }
    nextInputSrc = `${this.currentInputNum}:a`;
    //
    // Handle clip volume adjustment
    if ('volume' in clip) {
      logger.debug(`MixEngine:_buildClipFilters(): Applying volume filter to clip ${clip.volume}`);
      nextInputSrc = this._volumeFilter(
        nextInputSrc, 
        baseLabel, 
        clip.volume
      );
    }
    //
    // effects
    if (clip.effects) {
      logger.debug(`MixEngine:_buildClipFilters(): Applying effects to clip ${clip.effects}`);
      clip.effects.forEach(effect => {
        // loop effect
        if (/^(loop|repeat)/i.test(effect)) {
          logger.debug(`MixEngine:_buildClipFilters(): Applying loop effect to clip ${effect}`);
          nextInputSrc = this._loopEffect(
            nextInputSrc, 
            baseLabel, 
            this._getParams(effect)
          );
        }
        // wave effect
        else if (/^(noise|wave)/i.test(effect)) {
          logger.debug(`MixEngine:_buildClipFilters(): Applying wave effect to clip ${effect}`);
          nextInputSrc = this._waveEffect(
            nextInputSrc, 
            baseLabel, 
            this._getParams(effect)
          );
        }
        // backward effect
        else if (/^(backward|reverse)/i.test(effect)) {
          logger.debug(`MixEngine:_buildClipFilters(): Applying backward effect to clip ${effect}`);
          nextInputSrc = this._backwardEffect(
            nextInputSrc, 
            baseLabel, 
            this._getParams(effect)
          );
        }
        // faraway effect
        else if (/^(faraway|distant)/i.test(effect)) {
          logger.debug(`MixEngine:_buildClipFilters(): Applying faraway effect to clip ${effect}`);
          nextInputSrc = this._farawayEffect(
            nextInputSrc, 
            baseLabel, 
            this._getParams(effect)
          );
        }
        // detune effect
        else if (effect.toLowerCase().startsWith('detune')) {
          logger.debug(`MixEngine:_buildClipFilters(): Applying detune effect to clip ${effect}`);
          nextInputSrc = this._detuneEffect(
            nextInputSrc, 
            baseLabel, 
            this._getParams(effect)
          );
        }
      }); // end of effects
    } // end of clip
    // increment the input number
    this.currentInputNum++;
    // return the most recent clip label
    return nextInputSrc;
  }

  /*
   * SPECIALTY FILTERS
   */

  /**
   * Extracts the parameters from a string formatted as "someWord(param)" or "someWord{param1, param2)".
   * @param {string} input - The input string.
   * @returns {string[]} - An array of extracted parameters or an empty array if not found.
   * @private
   */
  _getParams(input) {
    // Match "someWord(param)" or "someWord{param1, param2}"
    const match = input.match(/^[a-zA-Z]+\(([^)]+)\)$/) || input.match(/^[a-zA-Z]+\{([^}]+)\}$/);
    if (match) {
      // Split the captured parameters by comma and trim whitespace
      return match[1].split(',').map(param => param.trim());
    }
    return [];
  }

  /**
   * Generate silence clip of a given duration.
   * @param {number} duration 
   * @sideeffect adds filter to this.filterChain
   * @returns {string} The label of the most recent clip
   * @private
   */
  _silenceFilter(baseLabel, duration) {
    // generate label
    const newLabel = baseLabel + '_silence';
    // create filter
    this.filterChain.push({
        filter: 'aevalsrc',
        options: {
          exprs: 0,
          duration: duration
        },
        outputs: newLabel
    });
    logger.debug(`MixEngine:_silenceFilter(): Generating silence of duration ${duration} seconds with label ${newLabel}`);
    // return the most recent clip label
    return newLabel;
  }

  /**
   * Builds a filter that handles volume adjustment
   * @param {number} volume
   * @sideeffect adds filter to this.filterChain
   * @returns {string} most recent output label
   * @private
   */
  _volumeFilter(inputSrc, baseLabel, volume) {
    // generate label
    let newLabel = baseLabel + '_volume';
    // compile options
    let volOptions = {};
    // If we have a number or number-string
    // this should handle 99.9% of cases
    if (!isNaN(Number(volume))) {
      volOptions.volume = (volume || 100) / 100;
      this.filterChain.push({
        inputs: inputSrc,
        filter: 'volume',
        options: {
          volume: (volume || 100) / 100,
        },
        outputs: newLabel
      });
      return newLabel;
    } 
    // if we have a volume command, handle it
    // this is a wierdo leftover from the old system
    // replaced by 'wave' effects
    if (volume.toLowerCase().startsWith('noise')) {
      // TODO: This will be replaced by effects
      newLabel = this._waveEffect(
        inputSrc, 
        baseLabel, 
        this._getParams(volume)
      );
      return(newLabel);
    }
    // we shouldn't get here unless we have weirdness
    // what da fuq is this?
    else {
      logger.error(`MixEngine:_volumeFilter(): Invalid volume command: ${volume}`);
    }    
    // if we get here, it means we didn't do anything, return the original label
    // In the words of Fleewood Mac:
    // never break the chain
    return inputSrc;
  }

  /**
   * Builds a filter that handles loop effect
   * @param {string} inputSrc
   * @param {string} baseLabel
   * @param {string} params
   * @sideeffect adds filter to this.filterChain
   * @returns {string} most recent output label
   * @private
   */
  _loopEffect(inputSrc, baseLabel, params) {
    const newLabel = baseLabel + '_loop';
    // unless otherwise specified, loop forever
    var numLoops = -1;
    if (params.length > 0) {
      numLoops = parseInt(params[0]);
    }
    this.filterChain.push({
      inputs: inputSrc,
      filter: 'aloop',
      options: {
        loop: numLoops,
        size: 2e9,
      },
      outputs: newLabel
    });
    // ensure that we don't loop forever
    this.amixDuration = 'shortest';
    // return the most recent label
    return newLabel;
  }

  /**
   * Builds a filter that handles wave effect
   * @param {string} inputSrc
   * @param {string} baseLabel
   * @param {string} params
   * @sideeffect adds filter to this.filterChain
   * @returns {string} most recent output label
   * @private
   */
  _waveEffect(inputSrc, baseLabel,params) {
    // here 'noise' refers to coherent noise filters, a harmonic series based on sine and cosine functions
    //
    logger.debug(`MixEngine:_waveEffect(): params: ${JSON5.stringify(params)} count: ${params.length}`);
    // generate label
    const newLabel = baseLabel + '_wave';
    // which wave function to use?
    let waveFunc = this.exprs.noise;
    logger.debug('MixEngine:_waveEffect(): Default waveFunc set to noise.');
    logger.debug(`waveFunc: ${this.exprs.noise}`);

    if (params.length > 0) {
      const paramKey = params[0].toLowerCase();
      logger.debug(`MixEngine:_waveEffect(): Checking if paramKey "${paramKey}" exists in exprs.`);
  
      if (paramKey in this.exprs) {
        waveFunc = this.exprs[paramKey];
        logger.debug(`MixEngine:_waveEffect(): Found paramKey "${paramKey}" in exprs. Setting waveFunc.`);
        logger.debug(`waveFunc: ${this.exprs.noise}`);
      } else {
        logger.debug(`MixEngine:_waveEffect(): paramKey "${paramKey}" not found in exprs.`);
      }
    } else {
      logger.debug('MixEngine:_waveEffect(): No params provided.');
    }
    this.filterChain.push({
      inputs: inputSrc,
      filter: 'volume',
      options: {
        volume: waveFunc,
        eval: 'frame'
      },
      outputs: newLabel
    });
    // return the most recent label
    return newLabel;
  }

  /**
   * Builds a filter that handles faraway effect
   * @param {string} inputSrc
   * @param {string} baseLabel
   * @param {string[]} params - An array of parameters, case insensitive.
   * @sideeffect adds filter to this.filterChain
   * @returns {string} most recent output label
   * @private
   */
  _farawayEffect(inputSrc, baseLabel, params) {
    logger.debug(`MixEngine:_farawayEffect(): params: ${params}`);
    
    // Generate initial labels
    let currentLabel = inputSrc;
    const volumeLabel = baseLabel + '_faraway_volume';
    const lowpassLabel = baseLabel + '_faraway_lowpass';
    const reverbLabel = baseLabel + '_faraway_reverb';

    // Check if "vol" parameter is provided (case insensitive)
    const hasVolumeParam = params.some(param => param.toLowerCase() === 'vol');

    // Apply volume filter if "vol" parameter is provided
    if (hasVolumeParam) {
      this.filterChain.push({
        inputs: currentLabel,
        filter: 'volume',
        options: {
          'volume': 0.3
        },
        outputs: volumeLabel
      });
      currentLabel = volumeLabel; // Update current label to volume label
    }

    // Apply lowpass filter
    this.filterChain.push({
      inputs: currentLabel,
      filter: 'lowpass',
      options: {
        'f': 1000,
        'p': 2
      },
      outputs: lowpassLabel
    });
    currentLabel = lowpassLabel; // Update current label to lowpass label

    // Apply subtle reverb effect
    this.filterChain.push({
      inputs: currentLabel,
      filter: 'aecho',
      options: {
        'in_gain': 0.8,
        'out_gain': 0.9,
        'delays': 50,
        'decays': 0.2
      },
      outputs: reverbLabel
    });

    // Return the most recent label
    return reverbLabel;
  }

  /**
   * Builds a filter that plays audio backward.
   * @param {string} inputSrc
   * @param {string} baseLabel
   * @param {string} params
   * @sideeffect adds filter to this.filterChain
   * @returns {string} most recent output label
   * @private
   */
  _backwardEffect(inputSrc, baseLabel, params) {
    const newLabel = baseLabel + '_backward';

    this.filterChain.push({
      inputs: inputSrc,
      filter: 'areverse',
      outputs: newLabel
    });

    // Return the most recent label
    return newLabel;
  }







  /*
   * FINAL MIX FILTERSS
   */

  /**
   * Mixes all tracks from the recipe.
   *
   * @param {Object} recipeObj - The recipe object.
   * @private
   */
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

  /*
   * FINAL RUNNING FFMPEG
   */

  /**
   * Configures and runs the ffmpeg command with the built filter chain.
   *
   * @param {Object} ffmpegCmd - The ffmpeg command object.
   * @returns {Promise<void>} A promise that resolves when the ffmpeg command completes.
   * @private
   */
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

  /*
   * HELPER METHODS
   */

  /**
   * Sanitizes a filename by removing invalid characters.
   *
   * @param {string} filename - The filename to sanitize.
   * @returns {string} The sanitized filename.
   * @private
   */
  _sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9_\-().\s]+/gi, '').replace(/\s+/g, '_');
  }

  /**
   * Gets the duration of the mix based on the longest track in the recipe.
   *
   * @param {Object} recipeObj - The recipe object.
   * @returns {number} The duration of the mix in seconds.
   * @private
   */
  _getMixDuration(recipeObj) {
    // find longest track
    let longestTrack = 0;
    recipeObj.tracks.forEach(track => {
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

}

module.exports = MixEngine;

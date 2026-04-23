/* eslint-disable quotes */
/**
 * @file MixEngine.js - Main audio processing engine for mixing audio clips
 */

const logger = require('config/logger').custom('MixEngine', 'info');
const ffmpeg = require('fluent-ffmpeg');
const JSON5 = require('json5');
const path = require('path');

// clear the require cache to get the latest config
delete require.cache[require.resolve('config')];
const { config } = require('config');
const contentFileDir = config.content.contentFileDir;
const mixFileDir = config.content.mixFileDir;
const ffmpegOutput = config.ffmpeg.output;
const filterConfig = config.filters;
const exprs3Config = config.exprs3;

// Preferred effect application order — effects are sorted by category before processing
// regardless of the order they appear in the recipe. This prevents effects like norm
// from fighting dynamic volume effects like wave or duck.
const EFFECT_ORDER = [
  /^(trim|first|shortest|longest|loop|crossfade|fadeout)/i,  // structural
  /^(norm|normalize|loudnorm)/i,                              // reference level
  /^volume$/i,                                                // desired output level (after norm so norm doesn't undo it)
  /^(backward|faraway|telephone)/i,                          // color/texture
  /^(noise|wave|duck)/i,                                     // dynamic volume (operates on the final level)
];

function effectPriority(effect) {
  const idx = EFFECT_ORDER.findIndex(re => re.test(effect));
  return idx === -1 ? EFFECT_ORDER.length : idx;
}

/**
 * Class representing the MixEngine.
 */
class MixEngine {
  constructor () {
    logger.debug(`MixEngine:constructor: config: ${JSON5.stringify(config, null, 2)}`);
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
    // tracking mix duration
    this.mixDurationTrack = 'longest';
    this.trackDurations = [];
    // deferred fadeout requests resolved after mixDuration is known
    this.pendingFadeouts = [];
    // deferred duck requests resolved after all tracks are built
    this.pendingDucks = [];
    // track labels keyed by track index, for duck(label) resolution
    this.trackLabels = [];
  }

  /**
   * Resets the internal state of the MixEngine.
   * @private
   */
  _resetState () {
    this.filterChain = [];
    this.currentInputNum = 0;
    this.currentTrackNum = 0;
    this.currentClipNum = 0;
    this.trackFinalLabels = [];
    this.finalOutputLabel = '';
    this.mixFilename = '';
    this.mixFilepath = '';
    this.mixDurationTrack = 'longest';
    this.trackDurations = [];
    this.pendingFadeouts = [];
    this.pendingDucks = [];
    this.trackLabels = [];
  }

  /**
   * Creates a mix based on the provided recipe and mix details.
   *
   * @param {Object} recipe - The recipe object.
   * @param {Object} mixDetails - The mix details object.
   * @returns {Promise<void>} A promise that resolves when the mix is created.
   * @async
   */
  async makeMix (recipe, mixDetails) {
    // Reset state
    this._resetState();
    const recipeObj = recipe.recipeObj;
    logger.debug(`MixEngine:makeMix: recipeObj: ${JSON5.stringify(recipeObj, null, 2)}`);
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
    //
    // Embed ID3 metadata and cover art into the finished mix file
    await this._embedMetadata(mixDetails);
  }

  /**
   * Sets up the ffmpeg inputs based on the recipe object.
   *
   * @param {Object} ffmpegCmd - The ffmpeg command object.
   * @param {Object} recipeObj - The recipe object.
   * @private
   */
  _setupInputs (ffmpegCmd, recipeObj) {
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
  _setMixFilepath (mixID, recipe) {
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
  _buildComplexFilter (recipeObj) {
    // clear the filterChain
    this.filterChain = [];
    // clear some counters
    this.currentInputNum = 0;
    this.currentTrackNum = 0;
    //
    // Build filters for each track
    this._buildAllTracksAndClipsFilters(recipeObj);
    //
    // Determine the duration of the mix
    const mixDuration = this._determineMixDuration();
    //
    // Apply any deferred fadeouts now that mixDuration is known
    this._applyPendingFadeouts(mixDuration);
    //
    // Apply any deferred duck effects now that all track labels are known
    this._applyPendingDucks();
    //
    // Build the final mix filter
    this._buildMixFilter(recipeObj);
    //
    // Build the trim filter
    this._buildTrimFilter(mixDuration);
    //
    logger.debug(`MixEngine:_buildComplexFilter: filterChain: ${JSON5.stringify(this.filterChain, null, 2)}`);
  }

  /**
   * Builds filters for all tracks and clips in the recipe.
   *
   * @param {Object} recipeObj - The recipe object.
   * @private
   */
  _buildAllTracksAndClipsFilters (recipeObj) {
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
  _buildTrackFilters (track) {
    // clear our clip counter
    this.currentClipNum = 0;
    // gather clip output labels for concatenation
    const clipOutputLabels = [];
    //
    // track base label
    const baseLabel = `track-${this.currentTrackNum}`;
    // store optional recipe label for duck(label) resolution
    this.trackLabels.push(track.label || null);
    // Keep track of the track label so far
    let nextInputSrc = '';
    //
    // we start with a track object
    // and go through the clips in the track
    track.clips.forEach(clip => {
      // build the filters for each clip
      const currentClipLabel = this._buildClipFilters(clip);
      //
      // add the clip output to the clipOutputLabels array
      clipOutputLabels.push(currentClipLabel);
      //
      // if the clip has an infinite duration, we need to adjust the track duration
      if (clip.duration === Infinity) {
        track.duration = Infinity;
      }
      //
      // increment the clip number
      this.currentClipNum++;
    });
    //
    // Concat inputs including silence
    const newTrackLabel = baseLabel + '_concat';
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
    // Build a synthetic effects list that includes volume as a named effect,
    // so it sorts into the correct position (after norm, before wave/duck).
    const trackEffects = [...(track.effects || [])];
    if ('volume' in track) {
      trackEffects.push(`volume(${track.volume})`);
    }
    //
    // effects
    if (trackEffects.length > 0) {
      logger.debug(`MixEngine:_buildTrackFilters(): Applying effects to track ${trackEffects}`);
      [...trackEffects].sort((a, b) => effectPriority(a) - effectPriority(b)).forEach(effect => {
        // volume effect
        if (/^volume/i.test(effect)) {
          logger.debug(`MixEngine:_buildTrackFilters(): Applying volume filter to track ${effect}`);
          nextInputSrc = this._volumeFilter(
            nextInputSrc,
            baseLabel,
            this._getParams(effect).length > 0 ? this._getParams(effect)[0] : track.volume
          );
        }
        // norm effect
        else
        if (/^(norm|normalize|loudnorm)/i.test(effect)) {
          logger.debug(`MixEngine:_buildTrackFilters(): Applying norm effect to track ${effect}`);
          nextInputSrc = this._normEffect(
            nextInputSrc,
            baseLabel,
            this._getParams(effect)
          );
        }
        // loop effect
        else if (/^(loop|repeat)/i.test(effect)) {
          logger.debug(`MixEngine:_buildTrackFilters(): Applying loop effect to track ${effect}`);
          // if we have a loop effect, we need to adjust the duration of the clip
          track.duration = Infinity;
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
        else if (/^(backward|backwards|reverse|reversed)/i.test(effect)) {
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
        // telephone effect
        else if (/^(telephone|phone)/i.test(effect)) {
          logger.debug(`MixEngine:_buildtrackFilters(): Applying telephone effect to track ${effect}`);
          nextInputSrc = this._telephoneEffect(
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
        // duck effect — deferred until all tracks are built so sidechain labels are known
        else if (/^duck/i.test(effect)) {
          logger.debug(`MixEngine:_buildTrackFilters(): Deferring duck effect on track ${baseLabel}`);
          const params = this._getParams(effect);
          if (params.length === 0) {
            logger.warn(`MixEngine:_buildTrackFilters(): duck requires a track index or label, skipping`);
          } else {
            const ref = params[0];
            // numeric string → track index; anything else → track label
            const sidechainRef = /^\d+$/.test(ref.trim()) ? parseInt(ref) : ref.trim();
            this.pendingDucks.push({ trackNum: this.currentTrackNum, baseLabel, sidechainRef });
          }
        }
        // fadeout effect — deferred until mixDuration is known
        else if (/^fadeout/i.test(effect)) {
          logger.debug(`MixEngine:_buildTrackFilters(): Deferring fadeout effect on track ${baseLabel}`);
          const params = this._getParams(effect);
          const fadeDuration = params.length > 0 ? parseFloat(params[0]) : 3;
          // store the pending fadeout with the current label and track duration;
          // if track is looped (Infinity), _applyPendingFadeouts will resolve from mixDuration
          this.pendingFadeouts.push({
            trackNum: this.currentTrackNum,
            baseLabel,
            fadeDuration,
            trackDuration: track.duration
          });
          // nextInputSrc is intentionally NOT updated here; _applyPendingFadeouts
          // will insert the afade filter and update trackFinalLabels after mix duration is known
        }
        // shortest, longest, and first effects
        else if (effect.toLowerCase() == 'first') {
          this.mixDurationTrack = 0;
        } else if (effect.toLowerCase() == 'shortest') {
          this.mixDurationTrack = 'shortest';
        } else if (effect.toLowerCase() == 'longest') {
          this.mixDurationTrack = 'longest';
        }
        // trim effect
        else if (effect.toLowerCase() == 'trim') {
          this.mixDurationTrack = this.currentTrackNum;
        }
      }); // end of effects
    }
    // set the final track label
    this.trackFinalLabels.push(nextInputSrc);
    //
    // set the track duration
    this.trackDurations.push(track.duration);
  }

  /**
   * Builds a harmonic series filter using a mix of sine and cosine at different scales.
   *
   * @param {Object|string} noiseOpts - The noise options or preset name.
   * @returns {string} The noise filter string.
   * @private
   */
  _buildNoiseFilter (noiseOpts) {
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
    const genFreqFact = noiseObj.genFreqFact || noiseObj.f;
    let genAmpFact = noiseObj.genAmpFact || noiseObj.a;
    const globFreqFact = noiseObj.globFreqFact || noiseObj.n;
    const globAmpFact = noiseObj.globAmpFact || noiseObj.s;
    const globAmpPol = noiseObj.globAmpPolarity || noiseObj.p;
    const globPreBias = noiseObj.globPreBias || noiseObj.o;
    const globPostBias = noiseObj.globPostBias || noiseObj.q;

    // if we require more genFreqFact than we have genAmpFact, pad with 1
    genAmpFact = genAmpFact.concat(Array.from({ length: genFreqFact.length - genAmpFact.length }, () => 1));
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
  _buildClipFilters (clip) {
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
    // Build a synthetic effects list that includes volume as a named effect,
    // so it sorts into the correct position (after norm, before wave/duck).
    const clipEffects = [...(clip.effects || [])];
    if ('volume' in clip) {
      clipEffects.push(`volume(${clip.volume})`);
    }
    //
    // effects
    if (clipEffects.length > 0) {
      logger.debug(`MixEngine:_buildClipFilters(): Applying effects to clip ${clipEffects}`);
      [...clipEffects].sort((a, b) => effectPriority(a) - effectPriority(b)).forEach(effect => {
        // volume effect
        if (/^volume/i.test(effect)) {
          logger.debug(`MixEngine:_buildClipFilters(): Applying volume filter to clip ${effect}`);
          nextInputSrc = this._volumeFilter(
            nextInputSrc,
            baseLabel,
            this._getParams(effect).length > 0 ? this._getParams(effect)[0] : clip.volume
          );
        }
        // norm effect
        else
        if (/^(norm|normalize|loudnorm)/i.test(effect)) {
          logger.debug(`MixEngine:_buildTrackFilters(): Applying norm effect to track ${effect}`);
          nextInputSrc = this._normEffect(
            nextInputSrc,
            baseLabel,
            this._getParams(effect)
          );
        }
        // loop effect
        else if (/^(loop|repeat)/i.test(effect)) {
          logger.debug(`MixEngine:_buildClipFilters(): Applying loop effect to clip ${effect}`);
          // if we have a loop effect, we need to adjust the duration of the clip
          clip.duration = Infinity;
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
        // telephone effect
        else if (/^(telephone|phone)/i.test(effect)) {
          logger.debug(`MixEngine:_buildtrackFilters(): Applying telephone effect to track ${effect}`);
          nextInputSrc = this._telephoneEffect(
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
        // fadeout effect — applied immediately using clip.duration
        else if (/^fadeout/i.test(effect)) {
          logger.debug(`MixEngine:_buildClipFilters(): Applying fadeout effect to clip ${effect}`);
          const params = this._getParams(effect);
          const fadeDuration = params.length > 0 ? parseFloat(params[0]) : 3;
          if (!isFinite(clip.duration)) {
            logger.warn(`MixEngine:_buildClipFilters(): fadeout on infinite-duration clip not supported, skipping`);
          } else {
            const startTime = clip.duration - fadeDuration;
            if (startTime < 0) {
              logger.warn(`MixEngine:_buildClipFilters(): fadeDuration ${fadeDuration}s exceeds clip duration ${clip.duration}s, skipping`);
            } else {
              nextInputSrc = this._fadeoutEffect(nextInputSrc, baseLabel, fadeDuration, startTime);
            }
          }
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
  _getParams (input) {
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
  _silenceFilter (baseLabel, duration) {
    // generate label
    const newLabel = baseLabel + '_silence';
    // create filter
    this.filterChain.push({
      filter: 'aevalsrc',
      options: {
        exprs: 0,
        duration
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
  _volumeFilter (inputSrc, baseLabel, volume) {
    // generate label
    let newLabel = baseLabel + '_volume';
    // compile options
    const volOptions = {};
    // If we have a number or number-string
    // this should handle 99.9% of cases
    if (!isNaN(Number(volume))) {
      volOptions.volume = (volume || 100) / 100;
      this.filterChain.push({
        inputs: inputSrc,
        filter: 'volume',
        options: {
          volume: (volume || 100) / 100
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
      return (newLabel);
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
  _loopEffect (inputSrc, baseLabel, params) {
    const newLabel = baseLabel + '_loop';
    // unless otherwise specified, loop forever
    let numLoops = -1;
    if (params.length > 0) {
      numLoops = parseInt(params[0]);
    }
    this.filterChain.push({
      inputs: inputSrc,
      filter: 'aloop',
      options: {
        loop: numLoops,
        size: 2e9
      },
      outputs: newLabel
    });
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
  _waveEffect (inputSrc, baseLabel, params) {
    logger.debug(`MixEngine:_waveEffect(): params: ${JSON5.stringify(params)} count: ${params.length}`);

    const newLabel = baseLabel + '_wave';
    const presetNames = Object.keys(exprs3Config.presets);
    const lowerParams = params.map(p => p.toLowerCase());

    // First param that matches a preset name sets the preset; all others are modifiers
    let presetName = 'default';
    const modifiers = [];
    for (const p of lowerParams) {
      if (presetNames.includes(p) && presetName === 'default' && !modifiers.length) {
        presetName = p;
      } else {
        modifiers.push(p);
      }
    }
    logger.debug(`MixEngine:_waveEffect(): preset="${presetName}" modifiers=${JSON.stringify(modifiers)}`);

    // Copy preset params — modifiers patch on top
    const presetParams = { ...exprs3Config.presets[presetName] };

    // Substitute param object values into the base formula string
    // Uses word-boundary regex so 'q' doesn't match inside other tokens
    const substituteParams = (formula, p) => {
      let result = formula;
      // Sort by key length descending to prevent partial matches (e.g. 'as' before 'a')
      const keys = Object.keys(p).sort((a, b) => b.length - a.length);
      for (const key of keys) {
        result = result.replace(new RegExp(`\\b${key}\\b`, 'g'), p[key]);
      }
      return result;
    };

    let waveFunc;

    if (modifiers.some(m => ['bridge', 'transition'].includes(m))) {
      // Bridge peaks where the lead (normal) and counter (inverse) waves cross
      const leadParams = { ...presetParams };
      const counterParams = { ...presetParams, po: -1 };
      const lead = substituteParams(exprs3Config.base, leadParams);
      const counter = substituteParams(exprs3Config.base, counterParams);
      waveFunc = `min(1,max(0,4*(0.5-abs(0.5-(${lead})))*(0.5-abs(0.5-(${counter})))+0.25))`;
    } else {
      // Apply scalar modifiers
      if (modifiers.some(m => ['inverse', 'invert', 'inverted', 'counter'].includes(m))) presetParams.po = -1;
      if (modifiers.includes('soft')) { presetParams.as = 0.3; presetParams.ao = 0.7; }
      if (modifiers.includes('lifted')) { presetParams.as = 1; presetParams.ao = -1; }
      waveFunc = substituteParams(exprs3Config.base, presetParams);
    }

    logger.debug(`MixEngine:_waveEffect(): waveFunc: ${waveFunc}`);
    this.filterChain.push({
      inputs: inputSrc,
      filter: 'volume',
      options: { volume: waveFunc, eval: 'frame' },
      outputs: newLabel
    });
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
  _farawayEffect (inputSrc, baseLabel, params) {
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
          volume: 0.3
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
        f: 1000,
        p: 2
      },
      outputs: lowpassLabel
    });
    currentLabel = lowpassLabel; // Update current label to lowpass label

    // Apply subtle reverb effect
    this.filterChain.push({
      inputs: currentLabel,
      filter: 'aecho',
      options: {
        in_gain: 0.8,
        out_gain: 0.9,
        delays: 50,
        decays: 0.2
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
  _backwardEffect (inputSrc, baseLabel, params) {
    const newLabel = baseLabel + '_backward';

    this.filterChain.push({
      inputs: inputSrc,
      filter: 'areverse',
      outputs: newLabel
    });

    // Return the most recent label
    return newLabel;
  }

  /**
   * Builds a filter that handles telephone effect
   * @param {string} inputSrc
   * @param {string} baseLabel
   * @param {string[]} params - An array of parameters, case insensitive.
   * @sideeffect adds filter to this.filterChain
   * @returns {string} most recent output label
   * @private
   */
  _telephoneEffect (inputSrc, baseLabel, params) {
    logger.debug(`MixEngine:_telephoneEffect(): params: ${params}`);

    // Generate initial labels
    let currentLabel = inputSrc;
    const bandpassLabel = baseLabel + '_telephone_bandpass';
    const distortionLabel = baseLabel + '_telephone_distortion';

    // Apply bandpass filter
    this.filterChain.push({
      inputs: currentLabel,
      filter: 'bandpass',
      options: {
        f: 1000, // Center frequency at 1000 Hz
        width_type: 'h',
        width: 2000 // Bandwidth of 2000 Hz (approx. 300-3400 Hz for telephone)
      },
      outputs: bandpassLabel
    });
    currentLabel = bandpassLabel; // Update current label to bandpass label

    // Apply distortion effect to simulate telephone distortion
    this.filterChain.push({
      inputs: currentLabel,
      filter: 'acompressor',
      options: {
        level_in: 1.0,
        attack: 20,
        release: 250,
        threshold: 0.1,   // linear value; -20dB = 0.1 (acompressor requires 0–1, not dB)
        ratio: 10,
        makeup: 0.8, // replaces invalid level_out:0.8 (level_out belongs to agate, not acompressor)
        knee: 5
      },
      outputs: distortionLabel
    });

    // Return the most recent label
    return distortionLabel;
  }

  /**
   * Builds a filter that handles loudness normalization (dynaudnorm).
   *
   * Uses dynaudnorm (dynamic audio normalizer) throughout — streaming-safe,
   * frame-by-frame, no duration limit. loudnorm (EBU R128) has a fixed 4096-block
   * internal buffer that fails on looped stereo streams beyond ~409s.
   *
   * dynaudnorm parameters:
   *   p — peak target (linear 0–1); p=0.95 ≈ -0.5dBFS (~-10 to -14 LUFS),
   *                                  p=0.85 ≈ -1.4dBFS (~-12 to -16 LUFS),
   *                                  p=0.5  ≈ -6dBFS   (~-16 to -22 LUFS)
   *       (LUFS is approximate — depends on content crest factor;
   *        Spotify/YouTube target -14 LUFS; EBU R128 broadcast targets -23 LUFS)
   *   m — max gain factor; limits how aggressively quiet passages are boosted
   *   f — frame length in ms; granularity of gain analysis
   *   g — Gaussian window (frames, must be odd); larger = wider context, slower gain
   *       changes, closer to loudnorm's whole-file analysis. g=301 is the max.
   *
   * @param {string} inputSrc
   * @param {string} baseLabel
   * @param {string[]} params - preset name: voice, music, bed (default if omitted)
   * @sideeffect adds filter to this.filterChain
   * @returns {string} most recent output label
   * @private
   */
  _normEffect (inputSrc, baseLabel, params) {
    logger.debug(`MixEngine:_normEffect(): params: ${JSON5.stringify(params)} count: ${params.length}`);
    const newLabel = baseLabel + '_norm';
    // Default / music: foreground level (-3dBFS peak)
    let options = { p: 0.708, m: 10, f: 500, g: 301 };

    if (params.length > 0) {
      const preset = params[0].toLowerCase();
      switch (preset) {
        case 'spoken':
        case 'voice':
          // Foreground speech level (-3dBFS peak, ~-23 to -16 LUFS broadcast standard)
          options = { p: 0.708, m: 10, f: 500, g: 301 };
          break;
        case 'music':
          // Foreground music level (-3dBFS peak, ~-14 to -10 LUFS broadcast standard)
          options = { p: 0.708, m: 10, f: 500, g: 301 };
          break;
        case 'musicbed':
        case 'bed':
          // Background music bed level (-12dBFS peak, ~-30 to -24 LUFS broadcast standard)
          options = { p: 0.251, m: 5, f: 750, g: 301 };
          break;
        default:
          logger.debug(`MixEngine:_normEffect(): Unknown preset ${preset}, using default values.`);
      }
    }
    this.filterChain.push({
      inputs: inputSrc,
      filter: 'dynaudnorm',
      options,
      outputs: newLabel
    });
    return newLabel;
  }

  /**
   * Applies all deferred fadeout effects now that mixDuration is known.
   * Track-level fadeouts are deferred because looped tracks have Infinity duration
   * until mix duration is resolved.
   *
   * @param {number} mixDuration - The determined mix duration in seconds.
   * @private
   */
  _applyPendingFadeouts (mixDuration) {
    this.pendingFadeouts.forEach(({ trackNum, baseLabel, fadeDuration, trackDuration }) => {
      // for looped tracks (Infinity), fade relative to mix end; otherwise use actual track duration
      const effectiveDuration = isFinite(trackDuration) ? trackDuration : mixDuration;
      const startTime = effectiveDuration - fadeDuration;
      if (startTime < 0) {
        logger.warn(`MixEngine:_applyPendingFadeouts(): fadeDuration ${fadeDuration}s exceeds track duration ${effectiveDuration}s for ${baseLabel}, skipping`);
        return;
      }
      // use track index directly — avoids indexOf collision if multiple deferred ops touch the same track
      const inputLabel = this.trackFinalLabels[trackNum];
      const newLabel = this._fadeoutEffect(inputLabel, baseLabel, fadeDuration, startTime);
      this.trackFinalLabels[trackNum] = newLabel;
    });
  }

  /**
   * Builds an afade filter that fades audio out.
   * @param {string} inputSrc - The input label.
   * @param {string} baseLabel - The base label for naming the output.
   * @param {number} fadeDuration - Length of the fade in seconds.
   * @param {number} startTime - When the fade begins (seconds from audio start).
   * @sideeffect adds filter to this.filterChain
   * @returns {string} most recent output label
   * @private
   */
  _fadeoutEffect (inputSrc, baseLabel, fadeDuration, startTime) {
    const newLabel = baseLabel + '_fadeout';
    this.filterChain.push({
      inputs: inputSrc,
      filter: 'afade',
      options: {
        t: 'out',
        st: startTime,
        d: fadeDuration
      },
      outputs: newLabel
    });
    logger.debug(`MixEngine:_fadeoutEffect(): fade out from ${startTime}s over ${fadeDuration}s on ${baseLabel}`);
    return newLabel;
  }

  /**
   * Applies all deferred duck effects now that all track labels are known.
   * Splits the sidechain source track and applies sidechaincompress to the ducked track.
   * @private
   */
  _applyPendingDucks () {
    this.pendingDucks.forEach(({ trackNum, baseLabel, sidechainRef }) => {
      // resolve sidechain track index from number or label
      let scTrackNum;
      if (typeof sidechainRef === 'number') {
        scTrackNum = sidechainRef;
      } else {
        scTrackNum = this.trackLabels.indexOf(sidechainRef);
      }
      if (scTrackNum < 0 || scTrackNum >= this.trackFinalLabels.length) {
        logger.warn(`MixEngine:_applyPendingDucks(): sidechain ref "${sidechainRef}" not found, skipping duck on ${baseLabel}`);
        return;
      }
      // split the sidechain track — one copy for the mix, one to drive the compressor
      const scLabel = this.trackFinalLabels[scTrackNum];
      const scMixLabel = scLabel + '_mix';
      const scSideLabel = scLabel + '_sc';
      this.filterChain.push({
        inputs: scLabel,
        filter: 'asplit',
        outputs: [scMixLabel, scSideLabel]
      });
      this.trackFinalLabels[scTrackNum] = scMixLabel;
      //
      // apply sidechaincompress to the ducked track
      const inputLabel = this.trackFinalLabels[trackNum];
      const newLabel = this._duckEffect(inputLabel, scSideLabel, baseLabel);
      this.trackFinalLabels[trackNum] = newLabel;
    });
  }

  /**
   * Builds a sidechaincompress filter that ducks the input when the sidechain has signal.
   * @param {string} inputSrc - The audio to be ducked.
   * @param {string} sidechainSrc - The sidechain trigger signal.
   * @param {string} baseLabel - Base label for naming the output.
   * @sideeffect adds filter to this.filterChain
   * @returns {string} most recent output label
   * @private
   */
  _duckEffect (inputSrc, sidechainSrc, baseLabel) {
    const newLabel = baseLabel + '_duck';
    this.filterChain.push({
      inputs: [inputSrc, sidechainSrc],
      filter: 'sidechaincompress',
      options: {
        threshold: config.ffmpeg.filters.duck.threshold,
        ratio: config.ffmpeg.filters.duck.ratio,
        attack: config.ffmpeg.filters.duck.attack,
        release: config.ffmpeg.filters.duck.release
      },
      outputs: newLabel
    });
    logger.debug(`MixEngine:_duckEffect(): ducking ${baseLabel} via sidechain ${sidechainSrc}`);
    return newLabel;
  }

  /*
   * FINAL MIX FILTERS
   */

  /**
   * Mixes all tracks from the recipe.
   *
   * @param {Object} recipeObj - The recipe object.
   * @private
   */
  _buildMixFilter (recipeObj) {
    if (this.trackFinalLabels.length === 1) {
      // If there is only one track, we don't need to mix anything
      this.finalOutputLabel = this.trackFinalLabels[0];
    } else {
      const finalOutputLabel = 'out';
      logger.debug(`MixEngine:_buildMix(): Mixing tracks [${this.trackFinalLabels.join(', ')}] into ${finalOutputLabel}`);
      // If any track or clip uses a norm effect, clips are already level-matched —
      // disable amix's 1/N scaling so the pre-normalized levels are preserved.
      // Otherwise, leave normalize=1 (default) as a basic clipping safeguard.
      const hasNormEffect = effects => (effects || []).some(e => /^(norm|normalize|loudnorm)/i.test(e));
      const anyNormEffect = recipeObj.tracks.some(t =>
        hasNormEffect(t.effects) || (t.clips || []).some(c => hasNormEffect(c.effects))
      );
      const amixOptions = { inputs: this.trackFinalLabels.length };
      if (anyNormEffect) amixOptions.normalize = 0;
      this.filterChain.push({
        filter: 'amix',
        options: amixOptions,
        inputs: this.trackFinalLabels,
        outputs: finalOutputLabel
      });
      this.finalOutputLabel = finalOutputLabel;
    }
  }

  /**
   * Builds the trim filter for the mix based on the determined duration.
   *
   * @param {number} mixDuration - The length of the mix in seconds.
   * @private
   */
  _buildTrimFilter (mixDuration) {
    this.filterChain.push({
      inputs: this.finalOutputLabel,
      filter: 'atrim',
      options: {
        duration: mixDuration
      },
      outputs: this.finalOutputLabel + '_trimmed'
    });

    this.finalOutputLabel += '_trimmed';
    logger.debug(`MixEngine:_buildTrimFilter(): Applied trim filter with duration ${mixDuration} seconds`);
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
  _configureAndRun (ffmpegCmd) {
    return new Promise((resolve, reject) => {
      ffmpegCmd
        .complexFilter(this.filterChain)
        .audioCodec(ffmpegOutput.codec) // Set audio codec from config
        .audioBitrate(ffmpegOutput.bitrate) // Set audio bitrate from config
        .audioChannels(ffmpegOutput.channels) // Set audio channels from config
        .audioFrequency(ffmpegOutput.sampleRate) // Set audio sample rate from config
        .outputOptions([`-map [${this.finalOutputLabel}]`, "-v info"])
        .output(this.mixFilepath)
        .on('end', function () {
          logger.debug('Transcoding succeeded !');
          resolve();
        })
        .on('error', function (err, stdout, stderr) {
          logger.error('Cannot process audio: ' + err.message);
          console.log('ffmpeg stdout:\n' + stdout);
          console.log('ffmpeg stderr:\n' + stderr);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Embeds ID3 metadata and cover art into the finished mix MP3 via a second
   * ffmpeg pass. Audio is stream-copied (no re-encode). The tagged file replaces
   * the original in-place.
   *
   * @param {Object} mixDetails - Must include filepath, mixTitle, coverImagePath.
   */
  _embedMetadata (mixDetails) {
    const { filepath, mixTitle, coverImagePath } = mixDetails;
    const artist   = 'DriftConditions - driftconditions.org';
    const tmpPath  = filepath + '.tmp.mp3';

    return new Promise((resolve, reject) => {
      let cmd = ffmpeg(filepath)
        .audioCodec('copy')           // no re-encode
        .outputOptions([
          '-id3v2_version', '3',
          '-metadata', `title=${mixTitle || ''}`,
          '-metadata', `artist=${artist}`,
        ]);

      if (coverImagePath) {
        cmd = cmd
          .input(coverImagePath)
          .outputOptions([
            '-map', '0:a',
            '-map', '1:v',
            '-c:v', 'copy',
            '-metadata:s:v', 'title=Album cover',
            '-metadata:s:v', 'comment=Cover (Front)',
          ]);
      }

      cmd
        .output(tmpPath)
        .on('end', () => {
          try {
            require('fs').renameSync(tmpPath, filepath);
            logger.debug('MixEngine:_embedMetadata: metadata embedded successfully');
            resolve();
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => {
          logger.error('MixEngine:_embedMetadata: ' + err.message);
          reject(err);
        })
        .run();
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
  _sanitizeFilename (filename) {
    return filename.replace(/[^a-z0-9_\-().\s]+/gi, '').replace(/\s+/g, '_');
  }

  /**
   * Determines the length of the mix based on the specified track or effect.
   *
   * @returns {number} The length of the mix in seconds.
   * @private
   */
  _determineMixDuration () {
    logger.debug(`MixEngine:_determineMixDuration(): trackDurations: ${this.trackDurations}`);
    // Check if mixLengthTrack is a track number and is infinite
    if (typeof this.mixDurationTrack === 'number' && this.trackDurations[this.mixDurationTrack] === Infinity) {
      this.mixDurationTrack = 'longest';
    }

    // Determine the mix length based on the specified criteria
    let mixDuration = 0;
    switch (this.mixDurationTrack) {
      case 'longest':
        mixDuration = Math.max(...this.trackDurations.filter(duration => duration !== Infinity));
        break;
      case 'shortest':
        mixDuration = Math.min(...this.trackDurations.filter(duration => duration !== Infinity));
        break;
      default:
        mixDuration = this.trackDurations[this.mixDurationTrack];
    }

    logger.debug(`MixEngine:_determineMixDuration(): mixDurationTrack: ${this.mixDurationTrack}, mixDuration: ${mixDuration}`);
    return mixDuration;
  }
}

module.exports = MixEngine;

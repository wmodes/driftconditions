const ffmpeg = require('fluent-ffmpeg');
const logger = require('config/logger').custom('MixEngine', 'debug');
const path = require('path');

const { config } = require('config');
const clipLength = config.audio.length;
const contentFileDir = config.content.contentFileDir;
const tmpFileDir = config.content.tmpFileDir;

class MixEngine {
  constructor() {
    // Initialize any necessary properties here
    this.tracks = [];
    this.currentRecipeData = null;
    this.clips = [];
    this.audioFiles = [];
    this.filterChain = [];
  }

  makeMix(recipe) {
    // Build the filter chain
    this._buildComplexFilter(recipe);
    // Execute the filter chain
    // this._executeFilterChain();
  }

  /* 
  
  Scenario 1: Single Track with One Clip
      [
      {
        filter: 'volume',
        options: 'volume=1.0',  // 100% volume
        inputs: '0',  // Assuming '0' refers to the first (and only) input track
        outputs: 'final_output'
      }
    ]

  Scenario 2: Two Tracks with Independent Volume
    [
      {
        filter: 'volume',
        options: 'volume=0.5',  // 50% volume for track 0
        inputs: '0',  // Assuming '0' refers to the first input track
        outputs: 'track0_output'
      },
      {
        filter: 'volume',
        options: 'volume=1.0',  // 100% volume (no change) for track 1
        inputs: '1',  // Assuming '1' refers to the second input track
        outputs: 'track1_output'
      },
      {
        filter: 'amix',
        options: { inputs: 2 },  // Mix both tracks
        inputs: ['track0_output', 'track1_output'],
        outputs: 'final_output'
      }
    ]

  Scenario 3: One Track, Sequential Clips
    [
      {
        filter: 'concat', // Concatenate the two audio clips into a single track
        options: { n: 2, v: 0, a: 1 }, // 'n' is the number of audio files, 'v' for video (none), 'a' for audio streams
        inputs: ['0', '1'], // Assuming '0' and '1' refer to the first and second input tracks
        outputs: 'concatenated_output'
      },
      {
        filter: 'volume', // Set volume for the concatenated track
        options: 'volume=1.0', // 100% volume
        inputs: 'concatenated_output', // Use the output from the concat filter
        outputs: 'final_output'
      }
    ]

  Scenario 4: Two Tracks, Silence and Clips
    [
      {
        filter: 'anullsrc', // Generate silence
        options: { r: 44100, cl: 'stereo', d: 10 }, // Configure duration and sample rate
        outputs: 'silence1'
      },
      {
        filter: 'volume', // Adjust volume for file1.mp3
        options: 'volume=1.0',
        inputs: '1', // Assuming '1' refers to file1.mp3
        outputs: 'file1_output'
      },
      {
        filter: 'anullsrc', // Generate silence
        options: { r: 44100, cl: 'stereo', d: 10 }, // Configure duration and sample rate
        outputs: 'silence2'
      },
      {
        filter: 'concat', // Concatenate silences and file1.mp3 for track 0
        options: { n: 3, v: 0, a: 1 }, // Three audio streams, no video
        inputs: ['silence1', 'file1_output', 'silence2'],
        outputs: 'track0_final'
      },
      {
        filter: 'volume', // Adjust volume for file2.mp3
        options: 'volume=0.5',
        inputs: '2', // Assuming '2' refers to file2.mp3
        outputs: 'track1_final'
      },
      {
        filter: 'amix', // Mix the two final tracks together
        options: { inputs: 2 }, // Mix two audio inputs
        inputs: ['track0_final', 'track1_final'],
        outputs: 'final_output'
      }
    ]
  */

  // Main method to build the complete filter chain
  _buildComplexFilter(recipe) {
    currentRecipeObj = recipe.recipeObj;
    this.filterChain = [];
    // Build filters for each track
    // TODO: should "tracks" be the first key in the recipeData?
    currentRecipeObj.forEach(track => {
      this.filterChain.push(this._buildTrack(track));
    });
    // Build the final mix filter
    this.filterChain.push(this._buildMix());
    logger.debug(`MixEngine:_buildComplexFilter(): Built filter chains.`);
    return this.filterChain;
  }

  // Concatenates clips within a track and applies volume adjustment to the entire track if specified
  _buildTrack(track) {
    const trackInputs = track.clips.flatMap(clip => this._buildClip(clip).map(f => f.outputs)).flat();
    const trackOutput = `track_${track.track}_concat`;
    const finalOutput = `track_${track.track}_final`;
    const filters = [{
        filter: 'concat',
        options: { n: track.clips.length, v: 0, a: 1 },
        inputs: trackInputs,
        outputs: trackOutput
    }];
    if (track.volume) {
        filters.push({
            filter: 'volume',
            options: `volume=${track.volume}`,
            inputs: trackOutput,
            outputs: finalOutput
        });
    } else {
        // No volume adjustment needed, use concat output as final output
        filters[filters.length - 1].outputs = finalOutput;
    }
    logger.debug(`MixEngine:_buildTrack(): Concatenating clips [${trackInputs.join(', ')}] into ${trackOutput} and adjusting volume to ${track.volume}`);
    return filters;
  }

  // Builds the ffmpeg input and initial filter for each clip, if volume is specified
  _buildClip(clip) {
    console.log('clip:', JSON.stringify(clip, null, 2));
    const filePath = path.join(this.contentFileDir, clip.filename);
    const inputLabel = `file_${clip.filename.replace(/[^a-zA-Z0-9]/g, '')}`;
    logger.debug(`MixEngine:_buildClip(): Adding file ${filePath} with label ${inputLabel}`);
    const filters = [];
    filters.push({
        inputs: filePath,
        outputs: inputLabel + '_raw'
    });
    if (clip.volume) {
        filters.push({
            filter: 'volume',
            options: `volume=${clip.volume}`,
            inputs: inputLabel + '_raw',
            outputs: inputLabel
        });
    } else {
        // No volume adjustment needed, use raw as final output
        filters[filters.length - 1].outputs = inputLabel;
    }
    return filters;
  }

  // Mixes all tracks from the recipe
  _buildMix() {
    const trackOutputs = this.currentRecipeData.map(track => this._buildTrack(track).outputs);
    const finalOutput = 'final_mix';
    logger.debug(`MixEngine:_buildMix(): Mixing tracks [${trackOutputs.join(', ')}] into ${finalOutput}`);
    return {
      filter: 'amix',
      options: { inputs: this.currentRecipeData.length },
      inputs: trackOutputs,
      outputs: finalOutput
    };
  }
  
}

module.exports = MixEngine;

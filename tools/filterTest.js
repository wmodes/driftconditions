/**
 * @file FilterTest.js - A class for testing
 */

const ffmpeg = require('fluent-ffmpeg');
const readline = require('readline');

const config = require('./config');
const inputFiles = config.filterTest.inputs;
const outputFile = config.filterTest.output;
const ffmpegOutput = config.filterTest.ffmpeg;

/**
 * Class representing a FilterTest.
 */
class FilterTest {
  /**
   * Create a FilterTest.
   */
  constructor() {
    this.ffmpegCmd = ffmpeg();
    this.possibleFilters = [
      { title: 'Basic music filter', method: 'basicMusicFilter' },
      { title: 'Fade In/Out Filter', method: 'fadeInOutFilter' },
      { title: 'Fade in/out with second audio', method: 'fadeInOutWithSecondAudio' },
      { title: 'Test distorted audio', method: 'testDistortedAudio' },
      { title: 'Volume fade in/out with distorted audio', method: 'volumeFadeInOutDistortedAudio' },
      { title: 'Volume fade in/out with distorted audio, phased panning, and looped static', 
        method: 'volumeFadeInOutWithLoopedStatic' },
      { title: 'Detune between stations', method: 'detuneBetweenStations'},
      { title: 'Faraway sounds with lowpass filter', method: 'farawayFilter'},
    ];
    this.filterChain = [];
    this.finalOutputLabel = '';
  }

  /**
   * Load inputs for ffmpeg based on an array of input names.
   * @param {string[]} inputNames - Array of input names (e.g., ['music', 'noise']).
   */
  loadInputs(inputNames) {
    inputNames.forEach(inputName => {
      if (inputFiles[inputName]) {
        const file = inputFiles[inputName];
        this.ffmpegCmd.input(file);
        console.log(`Input file added: ${file}`);
      } else {
        console.error(`Input name "${inputName}" not found in configuration.`);
      }
    });
  }

  /**
   * Apply a basic music filter to the input files.
   */
  basicMusicFilter() {
    this.loadInputs(['music']);
    this.filterChain = [
        '[0]volume=0.5[a]',
        '[a]amix=inputs=1:duration=longest[out]'
      ];
    this.finalOutputLabel = 'out';
    this.configureAndRun();
  }
  
  /**
   * Apply a fade in/out filter to the input files.
   */
  fadeInOutFilter() {
    this.loadInputs(['music']);
    this.filterChain = [
      {
        filter: 'volume',
        options: {
          'volume': 'min(1, max(0.01, cos(PI * t / 5)))',
          'eval': 'frame'
        },
        outputs: 'a0'
      }
    ];
    this.finalOutputLabel = 'a0';
    this.configureAndRun();
  }

  /**
   * Apply a fade in/out filter with a second audio input.
   */
  fadeInOutWithSecondAudio() {
    this.loadInputs(['music', 'static']);
    this.filterChain = [
      {
        inputs: '[0:a]',
        filter: 'volume',
        options: {
          'volume': 'min(1, max(0.01, cos(PI * t / 10)))',
          'eval': 'frame'
        },
        outputs: 'a0'
      },
      {
        inputs: '[1:a]',
        filter: 'volume',
        options: {
          'volume': '1 - min(1, max(0.01, cos(PI * t / 10)))',
          'eval': 'frame'
        },
        outputs: 'a1'
      },
      {
        inputs: ['a0', 'a1'],
        filter: 'amix',
        options: {
          'inputs': 2,
          'duration': 'shortest'
        },
        outputs: 'amix_out'
      }
    ];
    this.finalOutputLabel = 'amix_out';
    this.configureAndRun();
  }

  /**
   * Apply a test distorted audio filter to the input file.
   */
  testDistortedAudio() {
    this.loadInputs(['music']);
    this.filterChain = [
      {
        inputs: '0:a',
        filter: 'lowpass',
        options: {
          f: 3000,
        },
        outputs: 'audio0a'
      },
      {
        inputs: 'audio0a',
        filter: 'highpass',
        options: {
          f: 300,
        },
        outputs: 'audio0b'
      },
      {
        inputs: 'audio0b',
        filter: 'aecho',
        options: {
          in_gain: 0.8,
          out_gain: 0.88,
          delays: 60,
          decays: 0.4,
        },
        outputs: 'audio0c'
      },
      {
        inputs: 'audio0c',
        filter: 'aphaser',
        options: {
          type: 't',
          speed: 2,
          decay: 0.6,
        },
        outputs: 'audio0d'
      },
      {
        inputs: 'audio0d',
        filter: 'afftdn',
        options: {
          nf: -25,
        },
        outputs: 'audio0e'
      },
      {
        inputs: 'audio0e',
        filter: 'acrusher',
        options: {
          level_in: 1,
          level_out: 1,
          bits: 8,
          mode: 'log',
          aa: 1,
        },
        outputs: 'audio0f'
      },
      {
        inputs: 'audio0f',
        filter: 'asetrate',
        options: {
          r: 48000*1.25,
        },
        outputs: 'audio0g'
      },
      {
        inputs: 'audio0g',
        filter: 'atempo',
        options: {
          tempo: 1/1.25,
        },
        outputs: 'audio0h'
      },
      {
        inputs: 'audio0h',
        filter: 'volume',
        options: {
          volume: 6,
        },
        outputs: 'audio0i'
      }
    ];
    this.finalOutputLabel = 'audio0i';
    this.configureAndRun();
  }

  /**
   * Apply a volume fade in/out to distorted audio with additional background audio.
   */
  volumeFadeInOutDistortedAudio() {
    this.loadInputs(['music', 'static']);
    this.filterChain = [
      // Fade in/out music
      {
        inputs: '0:a',
        filter: 'volume',
        options: {
          volume: 'min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.75+0.5))',
          eval: 'frame',
        },
        outputs: 'audio0'
      },
      // Create a duplicate stream that is distorted
      // Trim the low frequencies
      {
        inputs: '0:a',
        filter: 'lowpass',
        options: {
          f: 3000,
        },
        outputs: 'audio1a'
      },
      // Trim the high frequencies
      {
        inputs: 'audio1a',
        filter: 'highpass',
        options: {
          f: 300,
        },
        outputs: 'audio1b'
      },
      // Add echo effect
      {
        inputs: 'audio1b',
        filter: 'aecho',
        options: {
          in_gain: 0.8,
          out_gain: 0.88,
          delays: 60,
          decays: 0.4,
        },
        outputs: 'audio1c'
      },
      // Add phaser effect
      {
        inputs: 'audio1c',
        filter: 'aphaser',
        options: {
          type: 't',
          speed: 2,
          decay: 0.6,
        },
        outputs: 'audio1d'
      },
      // Add noise
      {
        inputs: 'audio1d',
        filter: 'afftdn',
        options: {
          nf: -25,
        },
        outputs: 'audio1e'
      },
      // Add distortion
      {
        inputs: 'audio1e',
        filter: 'acrusher',
        options: {
          level_in: 1,
          level_out: 1,
          bits: 8,
          mode: 'log',
          aa: 1,
        },
        outputs: 'audio1f'
      },
      // Increase pitch without changing the tempo
      {
        inputs: 'audio1f',
        filter: 'asetrate',
        options: {
          r: 48000 * 1.25,
        },
        outputs: 'audio1g'
      },
      {
        inputs: 'audio1g',
        filter: 'atempo',
        options: {
          tempo: 1 / 1.25,
        },
        outputs: 'audio1h'
      },
      // Boost the volume since we lose some in the distortion
      {
        inputs: 'audio1h',
        filter: 'volume',
        options: {
          volume: 8,
        },
        outputs: 'audio1i'
      },
      // Fade the volume of the duplicate stream in and out inverse timing
      {
        inputs: 'audio1i',
        filter: 'volume',
        options: {
          volume: '1 - min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.75+0.5))',
          eval: 'frame',
        },
        outputs: 'audio1j'
      },
      // Bring up the background static
      {
        inputs: '1:a',
        filter: 'volume',
        options: {
          volume: 0.5,
        },
        outputs: 'audio2a'
      },
      // Fade in and out the background static with the distorted audio
      {
        inputs: 'audio2a',
        filter: 'volume',
        options: {
          volume: '1 - min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.75+0.5))',
          eval: 'frame',
        },
        outputs: 'audio2'
      },
      // Mix the three streams together
      {
        inputs: ['audio0', 'audio1j', 'audio2'],
        filter: 'amix',
        options: {
          inputs: 3,
          duration: 'shortest',
        },
        outputs: 'out',
      }
    ];
    this.finalOutputLabel = 'out';
    this.configureAndRun();
  }

  /**
   * Apply a volume fade in/out with distorted audio and looped static.
   */
  volumeFadeInOutWithLoopedStatic() {
    this.loadInputs(['music', 'static']);
    this.filterChain = [
      // Fade in/out music
      {
        inputs: '0:a',
        filter: 'volume',
        options: {
          volume: '1 - min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.75+0.5))',
          eval: 'frame',
        },
        outputs: 'audio0'
      },
      // Create a duplicate stream that is distorted
      // Map channels to stereo
      {
        inputs: '0:a',
        filter: 'channelmap',
        options: {
          channel_layout: 'stereo'
        },
        outputs: 'audio1a'
      },
      // Trim the low frequencies
      {
        inputs: 'audio1a',
        filter: 'lowpass',
        options: {
          f: 3000,
        },
        outputs: 'audio1b'
      },
      // Trim the high frequencies
      {
        inputs: 'audio1b',
        filter: 'highpass',
        options: {
          f: 300,
        },
        outputs: 'audio1c'
      },
      // Add noise
      {
        inputs: 'audio1c',
        filter: 'afftdn',
        options: {
          nf: -25,
        },
        outputs: 'audio1d'
      },
      // Adjust sample rate to increase pitch without changing the tempo
      {
        inputs: 'audio1d',
        filter: 'asetrate',
        options: {
          r: 44100 * 1.01,
        },
        outputs: 'audio1e'
      },
      {
        inputs: 'audio1e',
        filter: 'aresample',
        options: {
          async: 44100,
        },
        outputs: 'audio1f'
      },
      {
        inputs: 'audio1f',
        filter: 'atempo',
        options: {
          tempo: 1 / 1.01,
        },
        outputs: 'audio1g'
      },
      // Add pulsator effect
      {
        inputs: 'audio1g',
        filter: 'apulsator',
        options: {
          hz: 0.25
        },
        outputs: 'audio1h'
      },
      // Boost the volume
      {
        inputs: 'audio1h',
        filter: 'volume',
        options: {
          volume: 1.5,
        },
        outputs: 'audio1i'
      },
      // Fade the volume of the distorted stream in and out inverse timing
      {
        inputs: 'audio1i',
        filter: 'volume',
        options: {
          volume: 'min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.75+0.5))',
          eval: 'frame',
        },
        outputs: 'audio1j'
      },
      // Loop the static
      {
        inputs: '1:a',
        filter: 'aloop',
        options: {
          loop: -1,
          size: 2e9
        },
        outputs: 'audio2a'
      },
      // Adjust the volume of background static
      {
        inputs: 'audio2a',
        filter: 'volume',
        options: {
          volume: 0.5,
        },
        outputs: 'audio2b'
      },
      // Fade in and out the background static with the distorted audio
      {
        inputs: 'audio2b',
        filter: 'volume',
        options: {
          volume: 'min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.75+0.5))',
          eval: 'frame',
        },
        outputs: 'audio2c'
      },
      // Mix the three streams together
      {
        inputs: ['audio0', 'audio1j', 'audio2c'],
        filter: 'amix',
        options: {
          inputs: 3,
          duration: 'shortest',
        },
        outputs: 'out',
      }
    ];
    this.finalOutputLabel = 'out';
    this.configureAndRun();
  }

  /**
   * Detune between stations
   */
  detuneBetweenStations() {
    this.loadInputs(['music', 'talk', 'static']);
    this.filterChain = [
      // Fade in/out music
      {
        inputs: '0:a',
        filter: 'volume',
        options: {
          volume: '1 - min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.75+0.5))',
          eval: 'frame',
        },
        outputs: 'audio0'
      },
      // Create a duplicate stream that is distorted
      // Map channels to stereo
      {
        inputs: '0:a',
        filter: 'channelmap',
        options: {
          channel_layout: 'stereo'
        },
        outputs: 'audio1a'
      },
      // Trim the low frequencies
      {
        inputs: 'audio1a',
        filter: 'lowpass',
        options: {
          f: 3000,
        },
        outputs: 'audio1b'
      },
      // Trim the high frequencies
      {
        inputs: 'audio1b',
        filter: 'highpass',
        options: {
          f: 300,
        },
        outputs: 'audio1c'
      },
      // Add noise
      {
        inputs: 'audio1c',
        filter: 'afftdn',
        options: {
          nf: -25,
        },
        outputs: 'audio1d'
      },
      // Adjust sample rate to increase pitch without changing the tempo
      {
        inputs: 'audio1d',
        filter: 'asetrate',
        options: {
          r: 44100 * 1.01,
        },
        outputs: 'audio1e'
      },
      {
        inputs: 'audio1e',
        filter: 'aresample',
        options: {
          async: 44100,
        },
        outputs: 'audio1f'
      },
      {
        inputs: 'audio1f',
        filter: 'atempo',
        options: {
          tempo: 1 / 1.01,
        },
        outputs: 'audio1g'
      },
      // Add pulsator effect
      {
        inputs: 'audio1g',
        filter: 'apulsator',
        options: {
          hz: 0.25
        },
        outputs: 'audio1h'
      },
      // Boost the volume
      {
        inputs: 'audio1h',
        filter: 'volume',
        options: {
          volume: 1.5,
        },
        outputs: 'audio1i'
      },
      // Fade the volume of the distorted stream in and out inverse timing
      {
        inputs: 'audio1i',
        filter: 'volume',
        options: {
          volume: 'min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.75+0.5))',
          eval: 'frame',
        },
        outputs: 'audio1j'
      },

      // Fade in/out talk at inverse timing
      {
        inputs: '0:a',
        filter: 'volume',
        options: {
          volume: 'min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.75+0.5))',
          eval: 'frame',
        },
        outputs: 'audio0'
      },
      // Create a duplicate stream that is distorted
      // Map channels to stereo
      {
        inputs: '0:a',
        filter: 'channelmap',
        options: {
          channel_layout: 'stereo'
        },
        outputs: 'audio1a'
      },
      // Trim the low frequencies
      {
        inputs: 'audio1a',
        filter: 'lowpass',
        options: {
          f: 3000,
        },
        outputs: 'audio1b'
      },
      // Trim the high frequencies
      {
        inputs: 'audio1b',
        filter: 'highpass',
        options: {
          f: 300,
        },
        outputs: 'audio1c'
      },
      // Add noise
      {
        inputs: 'audio1c',
        filter: 'afftdn',
        options: {
          nf: -25,
        },
        outputs: 'audio1d'
      },
      // Adjust sample rate to increase pitch without changing the tempo
      {
        inputs: 'audio1d',
        filter: 'asetrate',
        options: {
          r: 44100 * 1.01,
        },
        outputs: 'audio1e'
      },
      {
        inputs: 'audio1e',
        filter: 'aresample',
        options: {
          async: 44100,
        },
        outputs: 'audio1f'
      },
      {
        inputs: 'audio1f',
        filter: 'atempo',
        options: {
          tempo: 1 / 1.01,
        },
        outputs: 'audio1g'
      },
      // Add pulsator effect
      {
        inputs: 'audio1g',
        filter: 'apulsator',
        options: {
          hz: 0.25
        },
        outputs: 'audio1h'
      },
      // Boost the volume
      {
        inputs: 'audio1h',
        filter: 'volume',
        options: {
          volume: 1.5,
        },
        outputs: 'audio1i'
      },
      // Fade the volume of the distorted stream in and out inverse of its dupe
      {
        inputs: 'audio1i',
        filter: 'volume',
        options: {
          volume: '1 - min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.75+0.5))',
          eval: 'frame',
        },
        outputs: 'audio1j'
      },


      // Loop the static
      {
        inputs: '1:a',
        filter: 'aloop',
        options: {
          loop: -1,
          size: 2e9
        },
        outputs: 'audio2a'
      },
      // Adjust the volume of background static
      {
        inputs: 'audio2a',
        filter: 'volume',
        options: {
          volume: 0.5,
        },
        outputs: 'audio2b'
      },
      // Fade in and out the background static with the distorted audio
      {
        inputs: 'audio2b',
        filter: 'volume',
        options: {
          volume: 'min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.75+0.5))',
          eval: 'frame',
        },
        outputs: 'audio2c'
      },
      // Mix the three streams together
      {
        inputs: ['audio0', 'audio1j', 'audio2c'],
        filter: 'amix',
        options: {
          inputs: 3,
          duration: 'shortest',
        },
        outputs: 'out',
      }
    ];
    this.finalOutputLabel = 'out';
    this.configureAndRun();
  }

  /**
   * Apply a faraway filter to the input files.
   */
  farawayFilter() {
    this.loadInputs(['music']);
    this.filterChain = [
      {
        inputs: '0:a',
        filter: 'volume',
        options: {
          'volume': 0.2,
        },
        outputs: 'a0'
      },
      {
        inputs: 'a0',
        filter: 'lowpass',
        options: {
          'f': 1000,
          'p': 2
        },
        outputs: 'a1'
      }
    ];
    this.finalOutputLabel = 'a1';
    this.configureAndRun();
  }









  /**
   * Configures and runs the ffmpeg command.
   * @private
   */
  configureAndRun() {
    this.ffmpegCmd
    .complexFilter(this.filterChain)
    .audioCodec(ffmpegOutput.codec) // Set audio codec from config
    .audioBitrate(ffmpegOutput.bitrate) // Set audio bitrate from config
    .audioChannels(ffmpegOutput.channels) // Set audio channels from config
    .audioFrequency(ffmpegOutput.sampleRate) // Set audio sample rate from config
    .outputOptions([`-map [${this.finalOutputLabel}]`, "-v info"])
    .output(outputFile)
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
}

// Function to prompt user for interactive selection
async function promptUser(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

// Check if the script is run directly from the command line
if (require.main === module) {
  (async () => {
    const filterTest = new FilterTest();
    const filterMethods = filterTest.possibleFilters.map(f => f.method);

    console.log('Available filters:');
    filterTest.possibleFilters.forEach((filter, index) => {
      console.log(`${index + 1}. ${filter.title}`);
    });

    const selectedMethodIndex = await promptUser('Select a filter method (number): ');
    const selectedMethod = filterMethods[selectedMethodIndex - 1];

    if (selectedMethod && typeof filterTest[selectedMethod] === 'function') {
      filterTest[selectedMethod]();
    } else {
      console.error('Invalid selection.');
    }
  })();
}

module.exports = FilterTest;

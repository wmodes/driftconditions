// config.js
// This file contains the configuration for AdminServer and MixEngine servers

// Load environment variables from .env file
require('dotenv').config();
const BASEDIR = process.env.BASEDIR;
const HOSTNAME = process.env.HOSTNAME;
const CLIENTPORT = process.env.CLIENTPORT;


const config = {
  adminServer: {
    protocol: 'http',
    host: 'localhost',
    port: 8081,
    logfile: BASEDIR + '/logs/adminserver.log',
  },
  corsOptions: {
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    origin: [
      'https://localhost',
      'https://localhost:3000',
      'http://localhost:3001',
      'https://localhost:8080',
      'http://localhost:8081',
      'https://localhost:8082',
      'http://localhost:8083',
      'https://localhost:8000',
      'http://localhost:8001',
      'https://driftconditions.org',
      'http://driftconditions.org:80',
      'https://driftconditions.org:443',
      'https://driftconditions.org:8080',
      'http://driftconditions.org:8081',
      'https://driftconditions.org:8082',
      'http://driftconditions.org:8083',
      'https://driftconditions.org:8000',
      'http://driftconditions.org:8001',      
    ],
    credentials: true,
  },  
  mixEngineServer: {
    protocol: 'http',
    host: 'localhost',
    port: 8083,
    logfile: BASEDIR + '/logs/mixengine.log',
    checkTime: 1000 * 60 * 2, // 2 minutes
  },
  dbConfig: {
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'mysql',
    password: process.env.DATABASE_PASSWORD,
    database: 'interference',
  },
  audio: {
    selectPoolPercentSize: 10,
    selectPoolMinSize: 25,
    newnessScoreWeight: 1,
    tagScoreWeight: 0.5,
    classification: [
      'Ambient', 
      'Atmospheric', 
      'Environmental', 
      'Premixed', 
      'Soundscape', 
      'Archival', 
      'Spoken', 
      'Narrative', 
      'Instructional', 
      'VocalMusic', 
      'Instrumental', 
      'Experimental', 
      'Digital', 
      'Effect',
      'Other'
    ],
    clipLength: {   // in seconds
      tiny: {
        // 0 to 10 seconds - most sound effects
        min: 0,
        max: 10,
      },
      short: {
        // 10 seconds to 2 minutes - most sound effects and some music
        min: 10,      // 10s
        max: 60 * 2,  // 120s
      },
      medium: { 
        // 2 minutes to 5 minutes - most music
        min: 60 * 2,  // 120s
        max: 60 * 5,  
      },
      long: {
        // 5 minutes to 10 minutes - longer music and some soundscapes
        min: 60 * 5,  // 300s 
        max: 60 * 10, // 600s
      },
      huge: {
        // 10 minutes to 60 minutes - long soundscapes, environmental recordings, and ambient
        min: 60 * 10, // 600s
        max: 60 * 60, // 3600s
      },
    },
  },
  recipes: {
    selectPoolPercentSize: 5,
    selectPoolMinSize: 3,
    newnessScoreWeight: 1,
    classificationScoreWeight: 0.25,
    classification: [
      'Ambient', 
      'Atmospheric', 
      'Environmental', 
      'Premixed', 
      'Soundscape', 
      'Archival', 
      'Spoken', 
      'Narrative', 
      'Instructional', 
      'VocalMusic', 
      'Instrumental', 
      'Experimental', 
      'Digital', 
      'Effect',
      'Other'
    ],
  },
  mixes: {
    maxRecent: 12,
    maxQueued: 12,
    checkTime: 1000 * 60 * 2, // 2 minutes
    playlistPeriod: 1000 * 60 * 60 * 4, // 4 hours
    mixKeepPeriod: 1000 * 60 * 60 * 6, // 6 hours
  },
  bcrypt: {
    saltRounds: 10,
  },
  authToken: {
    jwtSecretKey: process.env.JWT_SECRET_KEY,
    tokenExpires: '7d',
    tokenRefresh: 3600 * 1000,
  },
  authCookie: {
    cookieExpires: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },
  content: {
    contentFileDir: BASEDIR + '/content',
    tmpFileDir: BASEDIR + '/content/tmp',
    mixFileDir: BASEDIR + '/content/mixes',
    soundsFileDir: BASEDIR + '/content/sounds',
  },
  ffmpeg: {
    output: {
      format: 'mp3',
      codec: 'libmp3lame',
      bitrate: '128k',
      channels: 2,
      sampleRate: 44100,
    },
  },
  sounds: {
    static: {
      am: "dirty-am-static.mp3",
      shortwave: "short-wave-static.mp3",
    },
  },
  exprs2:{
    /* here 'noise' refers to coherent noise filters, a harmonic series based of sine and cosine
        general harmonic sumation filter:
        min(1, max(0, ((cos(PI * t * n / f0) * a0 + cos(PI * t * n / f1) * a1 + cos(PI * t * n / f2) * a2) + o ) * as  * po + q))
      (see /notes.md)
      GraphToy demo: https://shorturl.at/T82uY
    */

    // basic noise filter
    default: {
      base: 'min(1,max(0,((cos(PI*t*fs/13+fo)*1+cos(PI*t*fs/7+fo)*0.5+cos(PI*t*fs/3+fo)*0.25)-ao)*as*p+q)',
      defaults: {
        fs: 0.25, // frequencyScale
        fo: 0, // frequencyOffset
        as: 0.75, // amplitudeScale
        ao: 0.5, // amplitudeOffset
        po: 1, // polarity
        q: 0.5, // wave offset
      },
      aliases: ['noise', 'interrupted'],
    },
    // basic inverse noise filter
    inverse: {
      base: '%{default}',
      defaults: {
        fs: 0.25, // frequencyScale
        fo: 0, // frequencyOffset
        as: 0.75, // amplitudeScale
        ao: 0.5, // amplitudeOffset
        po: -1, // polarity
        q: 0.5, // wave offset
      },
      aliases: ['inverseNoise', 'invert', 'inverted'],
    },
    // subtle noise filter
    subtle: {
      base: '%{default}',
      defaults: {
        fs: 0.25, // frequencyScale
        fo: 0, // frequencyOffset
        as: 0.3, // amplitudeScale
        ao: 0.7, // amplitudeOffset
        po: 1, // polarity
        q: 0.5, // wave offset
      },
      aliases: ['subtleNoise'],
    },
    // subtle inverse noise filter
    subtleInverse: {
      base: '%{default}',
      defaults: {
        fs: 0.25, // frequencyScale
        fo: 0, // frequencyOffset
        as: 0.3, // amplitudeScale
        ao: 0.7, // amplitudeOffset
        po: -1, // polarity
        q: 0.5, // wave offset
      },
      aliases: ['subtleNoiseInverse'],
    },
    // transitional noise filter
    transition: {
      base: 'min(1,max(0,(4*(0.5-abs(0.5-%{default}))*(0.5-abs(0.5-%{inverse}))+0.25)))',
      defaults: {
        fs: 0.25, // frequencyScale
        fo: 0, // frequencyOffset
        as: 0.75, // amplitudeScale
        ao: 0.5, // amplitudeOffset
        po: 1, // polarity
        q: 0.5, // wave offset
      },
      aliases: ['liminal', 'interstitial'],
    },
  },

  exprs: {
    /* 
      Here 'noise' refers to coherent noise filters, a harmonic series based on sine and cosine general harmonic sumation filter:

      min(1, max(0, ((
          cos(PI * t * fs / f0 + fo) * a0 + 
          cos(PI * t * fs / f1 + fo) * a1 + 
          cos(PI * t * fs / f2 + fo) * a2) + ao ) * as  * po + q))

      where:

        [f0, f1, f2] designate increasingly finer frequencies, default [17, 7, 3]
        [a0, a1, a2] scale the wave to decreased amplidtude, default [1, 0.5, 0.25]
        fs is a general frequency scaler, default 0.25, an nice large period
        fo is a general frequency offset, default 0, to create different period offsets
        as is a general amplitude scaler, default 0.75, creates a 3/4 height wave
        ao is a general amplitude offset, default 0.5, offset 1/2 from 0
        po is polarity [-1, 1], default 1, used to create an inverse wave
        q offsets the entire wave, default 0.5, centered at 1/2
      
      GraphToy demo: https://shorturl.at/T82uY
    */

    // basic noise filter
    'noise': 'min(1,max(0,((cos(PI*t*0.25/13)*1+cos(PI*t*0.25/7)*0.5+cos(PI*t*0.25/3)*0.25)-0.5)*0.75*1+0.5))',
    // basic noise with a different period
    'noise2': 'min(1,max(0,((cos(PI*t*0.25/17)*1+cos(PI*t*0.25/13)*0.5+cos(PI*t*0.25/7)*0.25)-0.5)*0.75*1+0.5))',
    'default': '%{noise}',
    // basic noise filter, but inverted
    'inverseNoise': '1 - %{noise}',
    'invert': '%{inverseNoise}',
    'inverse': '%{inverseNoise}',
    'inverted': '%{inverseNoise}',
    // these transitional filters fill the space between noise and inverseNoise
    'transition': 'min(1,max(0,(4*(0.5-abs(0.5-%{noise}))*(0.5-abs(0.5-%{inverseNoise}))+0.25)))',
    'liminal': '%{transition}',
    'interstitial': '%{transition}',
    // subtle noise has ampitude of 0.15 and offset +0.85
    'subtleNoise': 'min(1,max(0,((cos(PI*(t)*0.25/13)*1+cos(PI*(t)*0.25/7)*0.5+cos(PI*(t)*0.25/3)*0.25)-0.5)*0.3*1+0.7))',
    'subtle': '%{subtleNoise}',
    // subtle noise with a different period
    'subtleNoise2': 'min(1,max(0,((cos(PI*(t)*0.25/17)*1+cos(PI*(t)*0.25/13)*0.5+cos(PI*(t)*0.25/7)*0.25)-0.5)*0.3*1+0.7))',
    'subtle2': '%{subtleNoise2}',
    // subtle noise filter, but inverted
    'subtleNoiseInverse': '1 - %{subtleNoise}',
    'subtleInverse': '%{subtleNoiseInverse}',
    // here for backward compatibility
    'interrupted': '%{noise}',
    'interrupter': '1-%{interrupted}',
    'fadeInNOut': 'min(1,max(0,((cos(PI*t*0.25/13)*1+cos(PI*t*0.25/7)*0.5+cos(PI*t*0.25/3)*0.25)+1)*1+0.5))',
    'fadeInNOutInverse': '1-%{fadeInNOut}',
  }
};

module.exports = config;

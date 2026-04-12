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
    database: 'driftconditions',
  },
  audio: {
    selectPoolPercentSize: 10,
    selectPoolMinSize: 25,
    newnessScoreWeight: 0.75,
    tagScoreWeight: 1,
    usageScoreWeight: 0.5,    // weight for clip usage score; less-used clips score higher
    silenceAdjustMaxAttempts: 100, // max rejection-sampling attempts before scaling fallback
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
      small: {
        // alias for short
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
        // 10 minutes to 120 minutes - long soundscapes, environmental recordings, and ambient
        min: 60 * 10,  // 600s
        max: 60 * 120, // 7200s
      },
    },
  },
  recipes: {
    selectPoolPercentSize: 5,
    selectPoolMinSize: 3,
    newnessScoreWeight: 1,
    classificationScoreWeight: 0.5,
    durationScoreWeight: 1,       // weight for recipe avg-duration score; shorter-avg recipes score higher
    avgDurationHistoryWeight: 10, // running average weight for recipe avgDuration; higher = slower to adapt
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
  recaptcha: {
    siteKey: '6LeGSaAsAAAAAC5vDSHIXZD291CnNXGTCfyrYF8b',  // public, used by frontend
    secretKey: process.env.RECAPTCHA_SECRET_KEY,           // private, used by backend
    scoreThreshold: 0.5,                                   // minimum score to allow request
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'https://localhost:8080/api/auth/callback/google',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'https://localhost:8080/api/auth/callback/github',
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackUrl: process.env.DISCORD_CALLBACK_URL || 'https://localhost:8080/api/auth/callback/discord',
  },
  client: {
    url: process.env.CLIENT_URL,
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
    filters: {
      duck: {
        threshold: '-30dB',
        ratio: 20,
        attack: 200,   // ms
        release: 1000, // ms
      },
    },
  },
  sounds: {
    static: {
      am: "dirty-am-static.mp3",
      shortwave: "short-wave-static.mp3",
    },
  },
  exprs3: {
    /*
      Single parameterized base formula for all wave effects.

      The wave is a harmonic cascade of three cosines at decreasing frequency/amplitude,
      clamped to [0, 1]. All characteristics are parameters — presets below select
      frequency families; modifiers (handled in code) patch params on top.

      base formula:
        min(1, max(0,
          (( cos(PI*t*fs/f0 + fo) * 1
           + cos(PI*t*fs/f1 + fo) * 0.5
           + cos(PI*t*fs/f2 + fo) * 0.25
          ) - ao) * as * po + q
        ))

      parameters:
        f0, f1, f2  — frequency divisors (larger = slower); set per preset
        fs          — global frequency scale (smaller = slower period overall)
        fo          — frequency offset (phase shift; use to desync tracks)
        as          — amplitude scale (how far the wave travels; 0.75 = 3/4 height)
        ao          — amplitude offset (center point before scaling; 0.5 = centered)
        po          — polarity: 1 = normal, -1 = inverted (counter-phase)
        q           — wave offset (shifts whole wave up/down after scaling; 0.5 = centered)

      modifiers (resolved in code, not config):
        inverse  — sets po = -1; wave is complement of default/slow/slower
        soft     — sets as = 0.3, ao = 0.7; wave stays in upper range, less dramatic
        lifted   — sets as = 1, ao = -1; wave never drops to zero (floor is raised)
        bridge   — derived formula: peaks where default and inverse cross
                   min(1,max(0, 4*(0.5-abs(0.5-lead))*(0.5-abs(0.5-counter)) + 0.25))

      usage in recipes:
        wave()                  — default preset, normal sweep 0–1
        wave(slow)              — slow preset
        wave(slower)            — slower preset
        wave(inverse)           — default + inverted polarity
        wave(soft)              — default + subtle amplitude
        wave(lifted)            — default + raised floor (never silent)
        wave(bridge)            — default + bridge (transition peaks)
        wave(slow, inverse)     — slow + inverted
        wave(slow, soft)        — slow + subtle
        wave(slow, lifted, inverse) — combinations are valid
    */

    // Single base formula — all params substituted at resolve time
    base: 'min(1,max(0,((cos(PI*t*fs/f0+fo)*1+cos(PI*t*fs/f1+fo)*0.5+cos(PI*t*fs/f2+fo)*0.25)-ao)*as*po+q))',

    // Presets — select frequency family; all other params are defaults
    presets: {

      // default — active, noticeable oscillation
      default: {
        f0: 13, f1: 7, f2: 3,   // frequency divisors (faster = more active)
        fs: 0.25,                 // global frequency scale
        fo: 0,                    // phase offset
        as: 0.75,                 // amplitude scale (3/4 height sweep)
        ao: 0.5,                  // amplitude offset (centered)
        po: 1,                    // polarity (normal)
        q:  0.5,                  // wave offset (centered at 0.5)
      },

      // slow — gentler, longer period
      slow: {
        f0: 17, f1: 13, f2: 7,  // frequency divisors (slower period)
        fs: 0.25,
        fo: 0,
        as: 0.75,
        ao: 0.5,
        po: 1,
        q:  0.5,
      },

      // slower — very long period, barely perceptible movement
      slower: {
        f0: 23, f1: 17, f2: 11, // frequency divisors (very slow period)
        fs: 0.25,
        fo: 0,
        as: 0.75,
        ao: 0.5,
        po: 1,
        q:  0.5,
      },

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

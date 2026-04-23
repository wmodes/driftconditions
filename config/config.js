// config.js
// This file contains the configuration for AdminServer and MixEngine servers

// Load environment variables from .env file
require('dotenv').config();
const BASEDIR = process.env.BASEDIR;
const HOSTNAME = process.env.HOSTNAME;
const CLIENTPORT = process.env.CLIENTPORT;


const config = {
  brand: {
    siteName: 'DriftConditions',
    siteUrl:  'https://driftconditions.org',
    streamAlbum: '',                          // intentionally blank — clears any ffmpeg-generated album tag
    // Artist tag embedded in mix MP3s: "SiteName - siteUrl"
    get streamArtist() { return `${this.siteName} - ${this.siteUrl}`; },
  },
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
    // Classifications that warrant music analysis (BPM, key, danceability)
    musicAnalysisClassifications: ['instrumental', 'vocalmusic', 'ambient'],
    // Internal tags used by the audio analysis pipeline
    internalTags: {
      analysisQueue:  'needs-audio-analysis', // set on upload to trigger analysis
      analyzed:       'audio-analyzed',        // set after analysis completes
      imageFromEmbed: 'image-from-embed',      // cover image extracted from MP3 APIC tag
      imageFromHaiku: 'image-from-haiku',      // cover image sourced via Claude Haiku lookup
      imageFromUser:  'image-from-user',       // cover image uploaded or URL-supplied by user
      imageNotFound:  'image-not-found',       // no cover image found after all attempts
    },
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
  audioAnalysis: {
    runTimeUTC: '08:00:00', // 3 AM Eastern (UTC-5 winter / UTC-4 summer)
  },
  digest: {
    weeklyDay: 2,             // 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat
    monthlyWeek: 1,           // nth occurrence of weeklyDay in the month (1=first, 2=second, ...)
    anniversaryWindowDays: 7, // days after signup anniversary to catch missed yearly sends
    fallbackFrequency: 'monthly', // cadence applied to daily/weekly users with no new activity
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
    tmpFileDir:     BASEDIR + '/content/tmp',
    mixFileDir:     BASEDIR + '/content/mixes',
    soundsFileDir:  BASEDIR + '/content/sounds',
    coverImage: {
      dir:    BASEDIR + '/content/images/audio', // per-clip cover images
      ext:    'jpg',
      size:   [500, 500],
      altDir: BASEDIR + '/content/images/alt',   // fallback alt images
      altNum: 15,                                 // count of available alt images
    },
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
        threshold: 0.03,  // linear (0-1); equivalent to -30dB (acompressor requires linear, not dB)
        ratio: 20,
        attack: 200,   // ms
        release: 1000, // ms
      },
    },
  },
  sounds: {
    static: {
      am: "content/sounds/dirty-am-static.mp3",
      shortwave: "content/sounds/short-wave-static.mp3",
    },
  },
  exprs3: {
    /*
      "Coherent noise" filters — a harmonic series based on cosine functions.
      Unlike random noise, these produce smooth, slowly-evolving oscillations
      that feel organic rather than chaotic. The wave is a harmonic cascade
      of three cosines at decreasing frequency and amplitude, clamped to [0,1].

      All wave characteristics are parameters — presets select frequency
      families; modifiers (handled in code) patch individual params on top.

      base formula:
        min(1, max(0,
          (( cos(PI*t*fs/f0 + fo) * 1     ← fundamental
           + cos(PI*t*fs/f1 + fo) * 0.5   ← 2nd harmonic, half amplitude
           + cos(PI*t*fs/f2 + fo) * 0.25  ← 3rd harmonic, quarter amplitude
          ) - ao) * as * po + q
        ))

      parameters:
        f0, f1, f2  — frequency divisors for each harmonic; larger = slower
                      oscillation period. Set per preset to choose the tempo
                      of the wave — fast churn vs. slow drift.
        fs          — global frequency scale; default 0.25 creates a long,
                      natural-feeling period across all harmonics.
        fo          — phase offset; default 0. Shift this between tracks so
                      they don't peak and trough at the same moment.
        as          — amplitude scale; how far the wave travels. 0.75 sweeps
                      3/4 of the available range — active but not extreme.
        ao          — amplitude center before scaling; 0.5 keeps the wave
                      centered so it rises and falls symmetrically around 0.5.
        po          — polarity: 1 = normal, -1 = inverted. Flip this to make
                      one track loud while another is quiet (counter-phase).
        q           — final offset applied after scaling; 0.5 centers the
                      output around mid-volume.

      modifiers (resolved in code, not config):
        inverse/counter — sets po = -1; wave is complement of the base preset
        soft            — sets as = 0.3, ao = 0.7; wave stays in upper range, less dramatic
        lifted          — sets as = 1, ao = -1; wave never drops to zero (floor is raised)
        bridge          — derived formula: peaks where lead and counter cross
                          min(1,max(0, 4*(0.5-abs(0.5-lead))*(0.5-abs(0.5-counter)) + 0.25))

      GraphToy demo: https://shorturl.at/T82uY

      usage in recipes:
        wave()                      — default preset, normal sweep 0–1
        wave(fast)                  — fast preset, rapid oscillation
        wave(slow)                  — slow preset
        wave(slower)                — slower preset
        wave(counter)               — default + inverted polarity
        wave(soft)                  — default + subtle amplitude
        wave(lifted)                — default + raised floor (never silent)
        wave(bridge)                — default + bridge (transition peaks)
        wave(slow, counter)         — slow + inverted
        wave(slow, soft)            — slow + subtle
        wave(slow, lifted, counter) — combinations are valid in any order
    */

    // Single base formula — all params substituted at resolve time
    base: 'min(1,max(0,((cos(PI*t*fs/f0+fo)*1+cos(PI*t*fs/f1+fo)*0.5+cos(PI*t*fs/f2+fo)*0.25)-ao)*as*po+q))',

    // Presets — select frequency family; all other params are defaults
    presets: {

      // fast — rapid oscillation, more agitated feel
      fast: {
        f0: 9, f1: 5, f2: 3,    // frequency divisors (fast period)
        fs: 0.25,
        fo: 0,
        as: 0.75,
        ao: 0.5,
        po: 1,
        q:  0.5,
      },

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

};

module.exports = config;

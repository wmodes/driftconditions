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
    selectPoolPercentSize: 25,
    selectPoolMinSize: 5,
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
    selectPoolPercentSize: 25,
    selectPoolMinSize: 5,
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
  filters: {
    noise: {
      // general noise filter
      // min(1, max(0, ((cos(PI * t * n / f0) * a0 + cos(PI * t * n / f1) * a1 + cos(PI * t * n / f2) * a2) + o ) * s  * p + q))
      // https://graphtoy.com/?f1(x,t)=min(1,max(0,((cos(PI*(x+t)*1/13)*1+cos(PI*(x+t)*1/7)*0.5+cos(PI*(x+t)*1/3)*0.25)-0.5)*0.75*1+0.5))&v1=true&f2(x,t)=min(1,max(0,((cos(PI*(x+t)*1/13)*1+cos(PI*(x+t)*1/7)*0.5+cos(PI*(x+t)*1/3)*0.25)-0.5)*0.75*-1+0.5))&v2=true&f3(x,t)=4*(0.5-abs(0.5-f1(x,t)))*(0.5-abs(0.5-f2(x,t)))&v3=true&f4(x,t)=&v4=true&f5(x,t)=&v5=false&f6(x,t)=&v6=false&grid=1&coords=0,0,3.1599750516729905
      presets: {
        // min(1, max(0, ((cos(PI * t * 1 / 13) * 1 + cos(PI * t * 1 / 7) * 0.5 + cos(PI * t * 1 / 3) * 0.25) - 0.5 ) * 0.75 * 1 + 0.5))
        default: {f: [13, 7, 3], a: [1, 0.5, 0.25], n: 1, s: 0.75, p: 1, o: -0.5, q: 0.5},
        interrupted: {f: [13, 7, 3], a: [1, 0.5, 0.25], n: 1, s: 0.75, p: -1, o: -0.5, q: 0.5},
        interrupter: {f: [13, 7, 3], a: [1, 0.5, 0.25], n: 1, s: 0.75, p: 1, o: -0.5, q: 0.5},
        fadeInNOut: {f: [13, 7, 3], a: [1, 0.5, 0.25], n: 1, s: 1, p: 1, o: 1, q: 0.5},
        fadeInNOutNeg: {f: [13, 7, 3], a: [1, 0.5, 0.25], n: 1, s: 1, p: -1, o: 1, q: 0.5},
      },
    },
  },
  exprs: {
    noise: 'min(1,max(0,((cos(PI*(t)*1/13)*1+cos(PI*(t)*1/7)*0.5+cos(PI*(t)*1/3)*0.25)-0.5)*0.75*1+0.5))',
    inverseNoise: '1 - %{noise}',
    transitions: '4*(0.5-abs(0.5-%{noise}))*(0.5-abs(0.5-%{inverseNoise}))',
  }
};

module.exports = config;

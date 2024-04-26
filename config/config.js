// config.js
// This file contains the configuration for AdminClient, AdminServer, and MixEngine

// Load environment variables from .env file
require('dotenv').config();

const config = {
  adminServer: {
    protocol: 'http',
    host: 'localhost',
    port: 8080,
    logfile: '/Users/wmodes/dev/interference/logs/server.log',
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
      'Other'
    ],
  },
  mixes: {
    maxRecent: 12,
    maxQueued: 12,
  },
  mixEngineServer: {
    protocol: 'http',
    host: 'localhost',
    port: 8081,
    logfile: '/Users/wmodes/dev/interference/logs/audioserver.log',
  },
  dbConfig: {
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: process.env.DATABASE_PASSWORD,
    database: 'interference',
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
  corsOptions: {
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    origin: 'http://localhost:3000',
    credentials: true,
  },
  content: {
    contentFileDir: '/Users/wmodes/dev/interference/content',
    tmpFileDir: '/Users/wmodes/dev/interference/content/tmp',
    mixFileDir: '/Users/wmodes/dev/interference/content/mixes',
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
  filters: {
    noise: {
      presets: {
        default: {f: [13, 7, 3], a: [1, 0.5, 0.25], n: 1, s: 3, p: 1, o: -0.5, q: 0.5},
        main: {f: [13, 7, 3], a: [1, 0.5, 0.25], n: 1, s: 3, p: -1, o: -0.5, q: 0.5},
        interference: {f: [13, 7, 3], a: [1, 0.5, 0.25], n: 1, s: 3, p: 1, o: -0.5, q: 0.5},
      },
    },
  }
};

module.exports = config;

// config.js - admin client configuration

const clientServerURL = process.env.REACT_APP_SERVER_URL;

const config = {
  adminServer: {
    baseURL: clientServerURL,
    audioBaseURL: clientServerURL + '/api/audio/sample',
    retryLimit: 3,
    routes: {
      // auth
      signup: '/api/auth/signup',
      signin: '/api/auth/signin',
      logout: '/api/auth/logout',
      check: '/api/auth/check',
      // user
      profile: '/api/user/profile',
      profileEdit: '/api/user/profile/edit',
      userList: '/api/user/list',
      userDisable: '/api/user/disable',
      // role
      roleList: '/api/role/list',
      roleUpdate: '/api/role/update',
      // audio
      audioUpload: '/api/audio/upload',
      audioInfo: '/api/audio/info',
      audioUpdate: '/api/audio/update',
      audioList: '/api/audio/list',
      audioTrash: '/api/audio/trash',
      // recipes
      recipeCreate: '/api/recipe/create',
      recipeInfo: '/api/recipe/info',
      recipeUpdate: '/api/recipe/update',
      recipeList: '/api/recipe/list',
      recipeTrash: '/api/recipe/trash',
    },
  },
  adminClient: {
    pages: {
      homepage: '/',
      signup: '/signup',
      signin: '/signin',
      profile: '/profile',
      profileEdit: '/profile/edit',
      userList: '/user/list',
      userLookup: null,
      userEdit: null,
      roleList: '/role/list',
      audioUpload: '/audio/upload',
      audioList: '/audio/list',
      audioView: '/audio/view',
      audioEdit: '/audio/edit',
      recipeCreate: '/recipe/create',
      recipeList: '/recipe/list',
      recipeView: '/recipe/view',
      recipeEdit: '/recipe/edit',
      notauth: '/notauth',
      error: '/error',
    },
  },
  mixEngine: {
    baseURL: 'https://driftconditions.org:8082',
    routes: {
      // queue
      queuePlaylist: '/api/queue/getplaylist',
    }
  },
  stream: {
    url: 'https://driftconditions.org:8000/stream',
    restartTime: 5000,
  },
  list: {
    recordsPerPage: 15,
  },
  wavesurfer: {
    container: '#waveform',
    waveColor: '#264d73',
    progressColor: '#68727a',
    cursorColor: 'red',
    cursorWidth: 2,
    dragToSeek: true,
    // height: 100,
    normalize: true,
    responsive: true,
    hideScrollbar: true,
    plugins: {
      regions: {
        dragSelection: {
          color: 'rgba(255, 0, 0, 0.1)',
        },
      },
    }
  },
  aceEditor: {
    useWorker: false, // Use the worker for syntax checking
    enableBasicAutocompletion: false,
    enableLiveAutocompletion: true,
    enableSnippets: false,
    highlightSelectedWord: true,
    minLines: 12,
    maxLines: 32,
    tabSize: 2,
    wrap: true,
  },
  audio: {
    allowedFileTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aiff', 'audio/x-m4a'],
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
    fieldNotes: {
      tags: "Describe the topic, theme, or texture of the audio, such as 'rainy night', 'jazz', or 'whispering'. Use tags to highlight specific elements or moods in your audio. Separate tags with commas.",
      classification: "A broad category that describes the broad type of audio.",
      filetypes: "Supported file types: mp3, wav, ogg, flac, aiff, m4a",
      status: "New uploads will be marked as 'Pending Review' until approved by a moderator.",
      copyright: "Please certify that this contains no copyrighted works for which you do not have a right to use.",
    }
  },
  recipes: {
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
    
    // starting pattern for creating a new recipe
    example: [
      { notes: [
          "This configures a basic recipe.",
          "The system ignores any tags it doesn't recognize, like 'notes' 😀.",
          "But the recipe has to be valid JSON-like code."
        ]
      },
      { track:0,
        notes: [
          "Tracks are played simultaneously like a multi-track recording.",
          "You can have up to 5 tracks, and there must be at least one."],
        volume: 100,
        clips:[
          {
            generalNote: ["Clips are individual audio files within the tracks.",
            "Specify classification and/or tags that will be used to randomly pick an audio clip.",
            "They can be single values or an array of values.",
            "(Notes can be safely deleted.)",
            ],
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
              'Other'],
            tags: ["vintage", "jazz"],
            length: ['tiny', 'short', 'medium', 'long', 'huge'],
            volumeNote: "Volume can be a number from 0 to 100. This overrides the track volume.",
            volume: 100,
          }
        ]
      },
    ],

    // starting pattern for adding a new track
    newTrack: {
      track: 0,
      note: "NEW TRACK: Add up to 5 tracks.",
      volume: 100,
      clips: [
        { 
          classification: ["Instrumental", "VocalMusic"], 
          tag: ["ambient", "environmental"], 
          length: ["medium", "long"]
        }
      ]
    },

    // starting pattern for adding a new clip
    newClip: {
      note: "NEW CLIP: Add as many clips as you like to a track.",
      classification: [ "ambient",  "premixed"],
      tags: ["static"], length: ["long", "huge"], 
      volume: 100
    },

    // starting pattern for adding a new clip
    newSilence: {
      note: "SILENCE: Really just a clip with classification: 'silence'.",
      classification: "silence",
      length: ["tiny", "short"],
    },

  },
  app: {
    projectNames: [
      "StaticDrift",
      "RadioNocturne",
      "ToxicEvent",
      "DriftConditions",
      "RadioInterference",
      "DuskVariations",
      "DriftFrequency",
      "RadioHalcyon",
      "RadioElegy",
      "RadioDiaspora",
      "ProjectAether",
      "FlowSchema",
      "SafetyProtocol",
      "ShutdownMatrix",
      "FeedstockFidelity",
    ],
    homepageImageURLBase: '/img/homepage',
    homepageImages: [
      "8-bit-radio-tower.png",
      "fucked-up-vcr.png",
      "hatch-show-style-triptych.png",
      "heavily-distorted.png",
      "mexican-radio-tower.png",
      "mountain-road-with-distortions.png",
      "night-drive-woodcut.png",
      "night-highway.png",
      "silkscreen-cosmic-car.png",
      "sunset-logo.png",
      "sunset-logo-blue.png",
      "tintype-tower.png",
      "washed-out-80s-road.png",
      "washed-out-industrial-area.png",
    ]
  }

};

module.exports = config;
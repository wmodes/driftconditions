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
    classificationFields: [
      {
        label: 'Ambient',
        value: 'ambient',
        moreInfo: "Music or sounds that form an ambient bed for other audio, e.g., drone, ambient music, longer static audio, minimalist music"
      },
      {
        label: 'Atmospheric',
        value: 'atmospheric',
        moreInfo: "Includes many field recordings, and longer found sounds, e.g., city ambiance, cafe recordings, crowd noise"
      },
      {
        label: 'Environmental',
        value: 'environmental',
        moreInfo: "Recordings of natural sounds, e.g., distant thunder, bird calls, rainfall, ocean waves"
      },
      {
        label: 'Premixed',
        value: 'premixed',
        moreInfo: "Already assembled mixes that would not benefit from additional mixing, e.g., radio show/podcast excerpts, mixed music tracks"
      },
      {
        label: 'Soundscape',
        value: 'soundscape',
        moreInfo: "Complex audio environments combining various sounds, e.g., urban soundscape, virtual environment audio, theatrical sound design"
      },
      {
        label: 'Archival',
        value: 'archival',
        moreInfo: "Historical recordings or sounds, e.g., old radio broadcasts, historical speeches, old TV shows"
      },
      {
        label: 'Spoken Word',
        value: 'spoken',
        moreInfo: "Spoken Word recordings, e.g., talks, poetry readings, speeches, interviews"
      },
      {
        label: 'Narrative',
        value: 'narrative',
        moreInfo: "Recordings that tell a story, e.g., radio dramas, storytelling sessions, narrative podcasts"
      },
      {
        label: 'Instructional',
        value: 'instructional',
        moreInfo: "Educational or instructional audio, e.g., language lessons, how-to guides, training programs"
      },
      {
        label: 'Vocal Music',
        value: 'vocalMusic',
        moreInfo: "Music that prominently features vocals, as opposed to instrumental"
      },
      {
        label: 'Instrumental',
        value: 'instrumental',
        moreInfo: "Music without vocals, e.g., classical music, instrumental jazz, ambient instrumental tracks"
      },
      {
        label: 'Experimental',
        value: 'experimental',
        moreInfo: "Non-traditional or avant-garde audio, e.g., noise music, sound experiments, unconventional audio compositions"
      },
      {
        label: 'Digital',
        value: 'digital',
        moreInfo: "Digital sounds and effects, e.g., synthesizer music, electronic beats, computer-generated sounds"
      },
      {
        label: 'Effect',
        value: 'effect',
        moreInfo: "Short recordings that can be layered over other audio, e.g., sound effects, audio stingers, transition sounds"
      },
      {
        label: 'Other',
        value: 'other',
        moreInfo: "Miscellaneous sounds that do not fit into other categories, e.g., unique or rare audio clips, uncategorized recordings"
      }
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
    
    // starting pattern for creating a new recipe (indentation matters here)
    example: `{
  // This is a basic recipe. 
  //
  // Note that the system ignores any tags it doesn't recognize, 
  // and comments like this are ignored as well 😀. 
  // BUT the recipe has to be valid JSON-like code and the editor
  // will tell you if it's not.
  //
  // Note that brackets [] and braces {} have to match up.
  // Values have to be in quotes.
  //
  tracks = [
    {
      track: 0,
      // This is a track.
      //
      // Tracks are played simultaneously like a multi-track recording.
      // You can have up to 5 tracks, and there must be at least one.
      //
      // This is the volume (0-100) of the entire track
      volume: 100,
      effects: [
        // Audio processing effects applied to the track.
        // Currently only loop is supported, but more will be added.
        //
      ],
      clips:[
        {
          // This is a clip.
          // 
          // Clips are individual audio files within the tracks.
          // Specify classification, tags, and length that will be used to 
          // help pick a random audio file for that matches the clip. 
          //
          classification: [
            // Classification is a broad category that describes the type 
            // of audio. Possible values are: Ambient, Atmospheric,  
            // Environmental, Premixed, Soundscape, Archival, Spoken, 
            // Narrative, Instructional, VocalMusic, Instrumental, 
            // Experimental, Digital, Effect, and/or Other
            // Note that you can have more than one classification.
            //
            'VocalMusic', 
            'Instrumental', 
          ],
          tags: [
            // Tags are descriptive words or phrases that help identify the audio.
            //
            "vintage", "jazz"
          ],
          length: [
            // Length is a rough estimate of the duration of the audio.
            // Possible values are: 'tiny', 'short', 'medium', 'long', 'huge'
            //
            'short', 'medium'
          ],
          // This is the volume (0-100) of the individual clip
          volume: 100,
          effects: [
            // Audio processing effects applied to the individual clip.
            // Currently only loop is supported, but more will be added.
            //
          ]
        }
      ]
    },
  ]
}`,

    // starting pattern for adding a new track (indentation matters here)
    newTrack: `
    { 
      track: 0,
      // New track, add up to 5.
      volume: 100,
      effects: [
      ],
      clips:[
        {
          classification: [
            // Possible values are: Ambient, Atmospheric,  Environmental, Premixed, 
            // Soundscape, Archival, Spoken, Narrative, Instructional, VocalMusic, 
            // Instrumental, Experimental, Digital, Effect, and/or Other
            'Archival', 
          ],
          tags: [
            "television", "old-time-radio"
          ],
          length: [
            // Possible values are: 'tiny', 'short', 'medium', 'long', 'huge'
            'medium', 'long'
          ],
          volume: 100,
        }
      ]
    },`,

    // starting pattern for adding a new clip (indentation matters here)
    newClip: `
        {
          // "NEW CLIP: Add as many clips as you like to a track.",
          classification: [ "ambient",  "premixed"],
          tags: ["static"], length: ["long", "huge"], 
          volume: 100
        },`,

    // starting pattern for adding a new clip (indentation matters here)
    newSilence: `
        {
          // SILENCE: Just a clip with classification: 'silence'.
          classification: "silence",
          length: ["tiny", "short"],
        },`,

  },
  app: {
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
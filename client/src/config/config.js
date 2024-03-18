

const config = {
  server: {
    baseURL: 'http://localhost:8080',
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
    audioBaseURL: 'http://localhost:8080/api/audio/sample',
  },
  client: {
    pages: {
      homepage: '/',
      signup: '/signup',
      signin: '/signin',
      profile: '/profile',
      profileEdit: '/profile/edit',
      userList: '/user/list',
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
  list: {
    recordsPerPage: 15,
  },
  audio: {
    allowedFileTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'],
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
    // enableBasicAutocompletion: true,
    // enableLiveAutocompletion: true,
    minLines: 12,
    maxLines: 32,
    tabSize: 2,
    wrap: true,
  },
  recipe: {
    example: [
      {
        notes: [
          "This configures a basic recipe.",
          "Tracks are played simultaneously like a multi-track recording. You can have between up to 5 tracks, and there must be at least one.",
          "Clips are individual audio files within the tracks. Clips are picked randomly based on criteria you can set.",
          "Tracks and clips have various options that can influence the random selection, length, volume, or dynamics of the audio element.",
          "The system ignores any tags it doesn't recognize, like 'notes' 😀. But the recipe has to be valid JSON-like code."
        ]
      },
      {
        track:0,
        notes:"background track, e.g., a music bed",
        volume:{
          default:50
        },
        clips:[
          {
            note: "here we specify tagss or classificaton or both that will be used to randomly pick an audio clip",
            classification:"music",
            tag: "ambient",
            length: "long"
          }
        ]
      },
      {
        track:1,
        notes:"foreground track, e.g, narrative or spoken word",
        volume:{
          default:100
        },
        clips:[
          {
            classification:"story",
            length: ["long", "medium"]
          }
        ]
      },
      {
        notes: "additional tracks can be added"
      }
    ]    
  },
};

module.exports = config;
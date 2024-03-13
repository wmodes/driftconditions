

const config = {
  server: {
    baseURL: 'http://localhost:8080',
    retryLimit: 3,
    routes: {
      signup: '/api/auth/signup',
      signin: '/api/auth/signin',
      logout: '/api/auth/logout',
      profile: '/api/user/profile',
      profileEdit: '/api/user/profile/edit',
      userList: '/api/user/list',
      roleList: '/api/role/list',
      roleUpdate: '/api/role/update',
      audioUpload: '/api/audio/upload',
      audioInfo: '/api/audio/info',
      audioUpdate: '/api/audio/update',
      audioList: '/api/audio/list',
      audioTrash: '/api/audio/trash',
      userList: '/api/user/list',
      rolesList: '/api/roles/list',
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
    },
  },
  audio: {
    allowedFileTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'],
    recordsPerPage: 15,
  },
  user: {
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
  }
};

module.exports = config;


const config = {
  server: {
    baseURL: 'http://localhost:8080',
    retryLimit: 3,
    routes: {
      audioUpload: '/api/audio/upload',
      audioInfo: '/api/audio/info',
      audioUpdate: '/api/audio/update',
      audioList: '/api/audio/list',
      audioTrash: '/api/audio/trash',
      userList: '/api/user/list',
    },
    audioBaseURL: 'http://localhost:8080/api/audio/sample',
  },
  audio: {
    allowedFileTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'],
    recordsPerPage: 15,
  },
  user: {
    recordsPerPage: 15,
  },
};

module.exports = config;
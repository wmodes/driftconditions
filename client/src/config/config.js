

const config = {
  server: {
    baseURL: 'http://localhost:8080',
    retryLimit: 3,
    routes: {
      audioUpload: '/api/audio/upload',
      audioInfo: '/api/audio/info',
      audioEdit: '/api/audio/edit',
      audioList: '/api/audio/list',
      audioTrash: '/api/audio/trash',
    },
  },
  audio: {
    allowedFileTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'],
    recordsPerPage: 20,
  },
};

module.exports = config;
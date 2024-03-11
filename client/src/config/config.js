

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
    // plugins: [
    //   WaveSurfer.cursor.create({
    //     showTime: true,
    //     opacity: 1,
    //     customShowTimeStyle: {
    //       'background-color': '#000',
    //       color: '#fff',
    //       padding: '2px',
    //       'font-size': '10px',
    //     },
    //   }),
    //   WaveSurfer.regions.create({
    //     dragSelection: {
    //       slop: 5,
    //     },
    //   }),
    // ],
  }
};

module.exports = config;
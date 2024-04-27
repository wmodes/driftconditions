
const config = {
  server: {
    baseURL: 'http://localhost:8081',
    retryLimit: 3,
    routes: {
      // user
      profile: '/api/user/profile',
      profileEdit: '/api/user/profile/edit',
      userList: '/api/user/list',
    },
    audioBaseURL: 'http://localhost:8081/content/',
  },
  adminClient: {
    pages: {
      profile: '/profile',
      profileEdit: '/profile/edit',
      userList: '/user/list',
      notauth: '/notauth',
      error: '/error',
    },
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

};

module.exports = config;
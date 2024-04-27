// config.js
// This file contains the configuration for FilterToy

const config = {
  server: {
    protocol: 'http',
    host: 'localhost',
    port: 8081,
    logfile: '/Users/wmodes/dev/interference/logs/filter-toy.log',
  },
  corsOptions: {
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    origin: 'http://localhost:3000',
    credentials: true,
  },
  content: {
    contentFileDir: '/Users/wmodes/dev/interference/filter/content',
    tmpFileDir: '/Users/wmodes/dev/interference/filter/content/tmp',
  },
};

module.exports = config;

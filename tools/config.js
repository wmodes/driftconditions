/**
 * @file config.js - Configuration file for the application
 */

const config = {
  filterTest: {
    inputs: {
      music: 'content/music.mp3',
      talk: 'content/talk.mp3',
      noise: 'content/noise.mp3',
      static: 'content/static.mp3',
      environmental: 'content/environmental.mp3',
    },
    output: 'output.mp3',
    ffmpeg: {
      format: 'mp3',
      codec: 'libmp3lame',
      bitrate: '128k',
      channels: 2,
      sampleRate: 44100,
    },
  },
};

module.exports = config;
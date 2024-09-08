# DriftConditions

*DriftConditions* is an online audio source that captures the chaos and serendipity of late-night radio tuning in an uncanny audio stream generated on the fly by code. Overlapping fragmented stories, ambient sounds, and mysterious crosstalk weave a vivid sonic tapestry that draws listeners into an immersive and unpredictable listening experience. Inspired by the unpredictability of real-world radio interference, *DriftConditions* explores the boundaries between intention and happenstance, inviting listeners to eavesdrop on a hidden world of voices and atmospheres unconstrained by traditional narrative structures. Each new listening session offers a fresh journey through its evocative auditory landscape.

## Live Demo

Listen to DriftConditions. The broadcast is assembled live, on-the-fly, and will never be heard exactly the same again.

  https://driftconditions.org/

## Presentation

Visitors to *DriftConditions* can tune in to an ongoing audio feed from an interactive web frontend.

## Procedural Generation

As much as possible, I chose to trust the magic of The Algorithm and rely on procedural generation. Elements that are procedurally generated:

* **Hero image:** Beyond some AI-generated images, it uses a hash to generate the session and week's hero image.
* **Descriptive text:** The system uses the *Tracery* library to generate descriptive text each time you visit the homepage.
* **Recipes:** A stochastic acceptance pattern is used, with higher scores given to least-recently-used recipes.
* **Clips:** A stochastic acceptance pattern selects audio clips, with higher scores given to clips matching the criteria specified by the recipe and least-recently-used clips.
* **Mixes:** A sine-based noise function modulates certain audio effects applied to clips.

## The Magic of Procedural Generation
The magic lies in its ability to generate this unique experience on the fly, relying on a sophisticated system that combines human creativity with algorithmic precision. Behind the scenes, contributors can add new audio content, while moderators can add and edit audio recipes. These recipes are like blueprints for the soundscapes you hear, specifying how different audio clips should be combined and processed.

## Creating the Audio Feed

The real magic happens when these recipes are used to construct the audio feed. Similar to multi-track editing software, each track contains one or more clips. Attributes of each track and clip — such as classification, tags, and length — help the system pick clips that fit together harmoniously. This ensures that every broadcast is a seamless blend of sounds that loosely match the intended style and mood of the recipe.

## Ever-Evolving Soundscapes

The system maintains an ever-evolving tapestry of audio by relying heavily on procedural generation. This approach mirrors the unpredictability of real-world radio interference, where the boundaries between intention and happenstance blur, creating a dynamic and unpredictable listening experience.

## Dynamic Audio Effects

As mixes are created, effects are applied according to each recipe. For instance, you might notice the audio elements fading in and out creating odd interference patterns. This effect is achieved through a technique similar to Perlin noise — a type of coherent noise used in computer graphics to create natural-looking textures — modulating various audio effects.

## Behind the Scenes

Several components work together to bring this experience to life. A user-friendly interface allows contributors to upload and manage clips, and create and edit recipes. A backend server supports these admin functions, ensuring smooth operation and content management. The MixEngine, generates the audio mixes based on the recipes and stochastically selected clips, generating long and impressive ffmpeg filter chains to process audio. Finally, a streaming component assembles these mixes into a continuous audio stream, delivering a seamless and immersive audio experience.

Here are the major elements of the project:

* **AdminClient:** React/CRA client that serves as a frontend, including authentication and authorization.
* **AdminServer:** Express server managing clip uploads, recipe creation, and editing.
* **MixEngine:** Backend server that generates mixes based on recipes and randomly selected audio clips.
* **IceCast:** Assembles the mixes into a continuous audio stream.

## User Contribution

The station relies on user audio contributions. We welcome user audio contributions. By signing up for an account and letting us know you would like to be a contributor, you can upload your own audio clips and participate in creating the ever-evolving auditory experience. Once you've signed up, reach out to us to get started. Your input helps shape the dynamic and immersive environment that makes the station special.

When submitting audio, we ask users to certify that their contributions contain no copyrighted works for which they do not have the right to use. We appreciate the use of public domain materials, creative commons licensed content, or other works for which users have clear rights. User contributions help enrich the station's unique soundscape while respecting the work of other artists.

## Technologies

Here is a list of technologies the project relies on:

### AdminServer:

- **Node.js**: Used as the runtime environment for the server.
- **Express**: Framework for handling server-side logic.
  - **body-parser**: Middleware to parse incoming request bodies.
  - **cookie-parser**: Middleware to parse cookies attached to the client request object.
  - **cors**: Middleware to enable CORS (Cross-Origin Resource Sharing).
  - **express-sslify**: Middleware to enforce SSL in the Node.js Express apps.
- **MySQL**: Database system used for data storage.
- **bcrypt**: Library to help you hash passwords.
- **bcrypt-promise**: Promisified version of bcrypt for use with async/await.
- **jsonwebtoken**: Implementation of JSON Web Tokens for authentication.
- **config**: Configuration management for Node.js.
- **ffprobe-static** & **fluent-ffmpeg**: Tools for working with audio and video formats.
- **fs-extra**: Extension of the standard `fs` module with extra file system methods.
- **get-audio-duration**: Module to determine the duration of audio files.
- **mkdirp**: Utility to create directories with a given path.
- **multer**: Middleware for handling `multipart/form-data`, primarily used for uploading files.

### AdminClient:

- **React**: A JavaScript library for building user interfaces.
  - **axios**: Promise-based HTTP client for making requests to external services.
  - **react-router-dom**: DOM bindings for React Router; manages navigation and rendering of components in React applications.
  - **@reduxjs/toolkit**: Toolset for efficient Redux development.
  - **react-redux**: Official React bindings for Redux.
  - **react-ace**: React component for Ace editor.
  - **react-dom**: React package for working with the DOM.
  - **react-scripts**: Configuration and scripts for Create React App.
- **TailwindCSS**: A utility-first CSS framework for rapidly building custom designs.
- **Babel**: JavaScript compiler that lets you use next generation JavaScript, today.
- **Prettier**: An opinionated code formatter.
- **Various utilities**:
  - **ldrs**: Custom library/package.
  - **tracery-grammar**: Library to generate text based on a grammar specification.
  - **wavesurfer.js**: Interactive navigable audio visualization using Web Audio and Canvas.
- **Development tools**:
  - **eslint**: Linter tool to standardize code quality.
  - **feather-icons-react**: React component for Feather icons.
  - **react-tag-input**: Component to handle tag inputs in React.
  - **crypto**, **os**, **path**: Node.js libraries for cryptographic functions, operating system related utility methods, and working with file and directory paths.

### MixEngine:

- **Node.js**: Used as the runtime environment for the server.
- **Express**: Web application framework for Node.js.
  - **cookie-parser**: Middleware to parse cookies attached to the client request object.
  - **cors**: Package to enable CORS (Cross-Origin Resource Sharing).
- **ffmpeg**:
  - **fluent-ffmpeg**: A fluent API to interact with FFmpeg.
  - **ffprobe-static**: Provides static binaries for FFprobe.
- **Filesystem**:
  - **fs-extra**: Extra methods for the fs object in Node.js like copy, remove, mkdirs.
- **JSON**:
  - **json5**: JSON for humans (enhanced version of JSON with additional syntax for ease of use).
- **Security**:
  - **jsonwebtoken**: Implementation of JSON Web Tokens to transmit information between parties as a JSON object securely.
- **Configuration**:
  - **config**: Local module linked from another location, managing configurations.
- **Module Aliasing**:
  - **module-alias**: Simplifies module resolution by providing aliases.
- **Development and Code Quality Tools**:
  - **eslint**: Linting utility for JavaScript and JSX, with plugins for standards and promises.
  - **globals**: Provides global variables for linting environments.

### Local Configuration Module (`config`):

- **Node.js**: Used as the runtime environment for the configuration settings.
- **dotenv**: Loads environment variables from a `.env` file into `process.env`.
- **mysql2**: MySQL client for Node.js with focus on performance. Supports prepared statements, non-blocking API, connection pooling, and more.
- **winston**: A logger for just about everything in Node.js.

This module is essential for managing the settings and configurations that dictate how the application behaves in different environments, and it abstracts away the complexities of environment-specific configurations.

## Recipes

Here is the base JSON-like structure that comprises a recipe:

```
{
  // This is a basic recipe. 
  //
  // Note that the system ignores any tags it doesn't recognize, 
  // and comments like this are ignored as well 😀. 
  // BUT the recipe has to be valid JSON-like code and the editor
  // will tell you if it's not.
  //
  // Note that brackets [] and braces {} have to match up.
  // Text values have to be in quotes.
  //
  tracks: [
    {
      // This is a track.
      track: 0,
      // Tracks are played simultaneously like a multi-track recording.
      // You can have up to 5 tracks, and there must be at least one.
      //
      // Volume (0-100) of the entire track
      volume: 100,
      effects: [
        // Audio processing effects applied to the track (or clip). Supported:
        //   * length: trim, shortest, longest, loop|repeat
        //   * modulation: wave|noise, wave(noise), wave(noise2), wave(inverse), 
        //     wave(subtle), wave(subtle2), wave(liminal|transition)
        //   * normalization: norm, norm(voice), norm(music), norm(bed)
        //   * other: distant|faraway, telephone, backward|reversed,
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
            // Classification is a broad category that describes the type of audio:
            // ambient, atmospheric, environmental, premixed, soundscape, 
            // archival, spoken, narrative, instructional, vocalmusic, instrumental, 
            // experimental, digital, effect, and/or other
            //
            'vocalmusic', 'instrumental', 
          ],
          tags: [
            // Tags are descriptive words or phrases that help identify the audio.
            //
            "vintage", "jazz"
          ],
          length: [
            // Length is a rough estimate of the duration of the audio. Possible values:
            //   * tiny: (0-10s) - most sound effects
            //   * short: (10s-2m) - most sound effects and some music
            //   * medium: (2m-5m) - most music
            //   * long: (5m-10m) - longer music and some soundscapes
            //   * huge: (10m-60m) - long soundscapes, environmental recordings, and ambient
            //
            'short', 'medium'
          ],
          // This is the volume (0-100) of the individual clip (optional)
          volume: 100,
          effects: [
            // Audio processing effects applied to the individual clip. Supported:
            //   * length: loop|repeat
            //   * modulation: wave|noise, wave(noise), wave(noise2), wave(inverse), 
            //     wave(subtle), wave(subtle2), wave(liminal|transition)
            //   * normalization: norm, norm(voice), norm(music), norm(bed)
            //   * other: distant|faraway, telephone, backward|reversed,
            //
          ]
        }
      ]
    },
  ]
}
```

And here is a sample recipe that generates a "Drony Story":

```
{
  tracks: [
    {
      // drony music bed
      track: 0,
      volume: 60,
      effects: [ "loop", "crossfade" ],
      clips: [
        {
          classification: [ "Ambient" ],
          tags: [ "drone", "ambient" ],
          length: [ "long", "huge" ],
          effects: [ "norm(bed)" ],
        }
      ]
    },
    {
      // narrative or spoken word - trim to this length
      track: 1,
      volume: 100,
      effects: [ "trim" ],
      clips: [
        {
          classification: "silence",
          length: [ "short", "medium" ]
        },
        {
          classification: [ "narrative", "spoken" ],
          tag: [
            "story", "reading", "novel", "fiction", "interview", "oral-history", "storycorps", 
          ],
          length: [ "medium", "long" ],
          effects: [ "norm(spoken)" ],
        },
        {
          classification: "silence",
          length: [ "short", "medium" ]
        },
      ]
    }
  ]
}
```

# Installation

Clone the repo, and check `NOTES.md` for critical or useful technical notes.
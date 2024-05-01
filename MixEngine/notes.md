

## Global Variables to Manage

* recentRecipes 
    - prevents similiar recipes from being repeated too soon
    - use_num, receipe_id, title, classification, tags, and date
    - pruned at n items
* mixdownQueue
    - mix_id, receipe_id, title, classification, tags, filename, duration, and create_date

## Functions to Write

* Choose a Random Recipe
    - making sure we don't repeat one too soon
    - may want to vary classification (or maybe group them?)
* Choose a Random Clip
    - loosely based on classification, tags, and length
    - return clip record
* Populate a Track
    - takes a track record
    - return track listing, duration



## Server Directory Structure

```
.
├── config            - Application settings and database configuration.
│   ├── config.js     - Central configuration for the server.
│   └── database.js   - Database connection and pooling setup.
├── core              - Central application logic and utilities.
│   ├── api           - Defines routes, middleware, and utilities for the API.
│   │   ├── middleware- Request processing and response handling functions.
│   │   ├── routes    - Endpoints for handling API requests.
│   │   └── utils     - Helper functions specific to API operations.
│   ├── data          - Manages data access and manipulation.
│   ├── middleware    - Application-wide middleware, like auth and error handling.
│   │   ├── authMiddleware.js - Authenticates users and requests.
│   │   └── errorHandler.js   - Handles errors and exceptions.
│   ├── services      - Business logic and service layer.
│   └── utils         - General utility functions for the application.
├── public            - Static files accessible to the public.
├── scripts           - Utility scripts for development and deployment.
├── notes.md          - Project notes and documentation.
├── package.json      - Project dependencies and metadata.
└── server.js         - Entry point to initialize and start the server.
```

Use of logger:

```
// Logging a warning
logger.warn("This is a warning message about XYZ");

// Logging an error
logger.error("Error processing request: ", error);

// Logging debug information
logger.debug("Debugging info: ", someDebugData);
```

## Working Complex Filters

### Possible workflow

- Normalize all inputs w loudnorm ?
- For each track:
    - for each clip:
        - Set volume of all input
        - Apply effects to input
    - Concat inputs including silence
    - Set volume of track
- Mix all tracks together with amix


### Concat two files

```
const filterChain = [
  {
    filter: 'concat',
    options: {
      n: '2', // Number of segments to concatenate
      v: '0', // Set to '1' if the streams have different sample rates, formats, or channel layouts
      a: '1' // Indicates that the filter is for audio concatenation
    },
    inputs: ['0:a', '1:a'], // Specify the input audio streams to concatenate
    outputss: ['out'] // Standard output label
  }
];
```

### Merge two files
```
    const filterChain = [
      {
        filter: 'amix',
        options: {
          inputs: '2' // Number of input channels to mix
        },
        inputs: ['0:a', '1:a'], // Specify the input audio streams to mix
        outputs: 'out' // Standard output label
      }
    ];
```

### Set volume before mixing

```
    const filterChain = [
      {
        filter: 'volume',
        options: {
          volume: '0.5' // Adjust volume of first input to 50%
        },
        inputs: '0:a', // Specify the input audio stream to adjust
        outputs: 'adjusted_input_1' // Output label for adjusted input stream
      },
      {
        filter: 'volume',
        options: {
          volume: '1.0' // Adjust volume of second input to 100%
        },
        inputs: '1:a', // Specify the input audio stream to adjust
        outputs: 'adjusted_input_2' // Output label for adjusted input stream
      },
      {
        filter: 'amix',
        options: {
          inputs: '2' // Number of input channels to mix
        },
        inputs: ['adjusted_input_1', 'adjusted_input_2'], // Specify the input audio streams to mix
        outputs: 'out' // Standard output label
      }
    ];
```

### Set Volume of Files, Concat, Set volume of track

```
    const filterChain = [
      // Adjust volume of input 0 to 75%
      {
        filter: 'volume',
        options: {
          volume: '0.75' // Adjust volume to 75%
        },
        inputs: '0:a', // Specify input 0 audio stream
        outputs: 'adjInput0' // Output label for adjusted input 0 stream
      },
      // Adjust volume of input 1 to 100%
      {
        filter: 'volume',
        options: {
          volume: '1.0' // Adjust volume to 100%
        },
        inputs: '1:a', // Specify input 1 audio stream
        outputs: 'adjInput1' // Output label for adjusted input 1 stream
      },
      // Concatenate adjusted input streams
      {
        filter: 'concat',
        options: {
          n: '2', // Number of segments to concatenate
          v: '0', // Set to '1' if the streams have different sample rates, formats, or channel layouts
          a: '1' // Indicates that the filter is for audio concatenation
        },
        inputs: ['adjInput0', 'adjInput1'], // Specify the adjusted input audio streams to concatenate
        outputs: 'track0' // Output label for concatenated track stream
      },
      // Adjust volume of concatenated track to 75%
      {
        filter: 'volume',
        options: {
          volume: '0.75' // Adjust volume to 75%
        },
        inputs: 'track0', // Specify concatenated track audio stream
        outputs: 'out' // Output label for adjusted concatenated track stream
      }
    ];
```


## Filters

Implement Audio Filters
- [ ] acrossfade
- [ ] aecho
- [ ] afade
- [ ] amultiply
- [ ] aeval (w sin(t) or cos(t))




ffmpeg -filter_complex "
aevalsrc='sin(t*2)|cos(t*2):d=30'[a1];
amovie=some.wav[a2];
[a1][a2]amultiply" -f wav - | ffplay - 2>/dev/null


ffmpeg -filter_complex "
aevalsrc='if(lt(cos(PI*t*0.25),0),0,cos(PI*t*0.25)):d=20'[a1];
amovie=/Users/wmodes/dev/interference/content/mixes/89_Basic_Music_Recipe.mp3[a2];
[a1][a2]amultiply" -f mp3 - | ffplay - 2>/dev/null



f1() = ((cos(PI*(x)/13)  + sin(PI*(x)/7)*0.5 + cos(PI*(x)/3)*0.25) - 1 ) * 3 // noise
f2() = min(max(f1(x+t)+0.25, 0),1) // static
f3() = min(max(-f1(x+t)+0.25, 0),1) // music


ffmpeg -filter_complex "
amovie=/Users/wmodes/dev/interference/content/2024/04/tramp-tramp-tramp-the-boys-are-marching-by-charles-harrison-and-columbia-stellar-quartette.mp3[a0];
aevalsrc='min(max(-((cos(PI*(t)/13)  + sin(PI*(t)/7)*0.5 + cos(PI*(t)/3)*0.25) - 0.5 ) * 3+0.5, 0),1)'[a1];
[a0][a1]amultiply[a2];
amovie=/Users/wmodes/dev/interference/content/2024/04/dirty-radio-static-w-buzzes-and-beeps.mp3[a3];
aevalsrc='min(max(((cos(PI*(t)/13)  + sin(PI*(t)/7)*0.5 + cos(PI*(t)/3)*0.25) - 0.5 ) * 3+0.5, 0),1)'[a4];
[a3][a4]amultiply[a5];
[a2][a5]amix" -f mp3 - | ffplay - 2>/dev/null

Even simpler!

ffmpeg -filter_complex "
amovie=/Users/wmodes/dev/interference/content/2024/04/tramp-tramp-tramp-the-boys-are-marching-by-charles-harrison-and-columbia-stellar-quartette.mp3[a0];
[a0]volume='min(max(-((cos(PI*t/13)  + sin(PI*t/7)*0.5 + cos(PI*t/3)*0.25) - 0.5 ) * 3+0.5, 0),1):eval=frame'[a1];
amovie=/Users/wmodes/dev/interference/content/2024/04/radio-band-tuning.mp3 [a3];
[a3]volume='min(max(((cos(PI*t/13)  + sin(PI*t/7)*0.5 + cos(PI*t/3)*0.25) - 0.5 ) * 3+0.5, 0),1):eval=frame'[a4];
[a1][a4]amix" -f mp3 - | ffplay - 2>/dev/null


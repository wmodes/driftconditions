// Recipe processing utils

import JSON5 from 'json5';

function splitJsonElements(jsonStr) {
  // This regex attempts to capture various JSON elements including unquoted keys and newline characters.
  // We include patterns for quoted strings, unquoted keys (which are not standard JSON but might appear in JSON-like inputs),
  // brackets, braces, colons, commas, and explicitly newline characters.
  const elements = jsonStr.match(/"[^"\\]*(\\.[^"\\]*)*"|'[^'\\]*(\\.[^'\\]*)*'|\b\w+\b|[\[\]{}:,]|\n/g);
  return elements;
}

function trackPositionInJson(jsonDestruct, row) {
  try {
    let lineNumber = 0;
    let depthTracker = [];
    let trackCount = -1;
    let clipCount = -1;
    let clipFlag = false;
    let outroFlag = false;

    function depthPattern() {
      return depthTracker.join('');
    }

    for (let item of jsonDestruct) {

      switch (item) {
        case '\n':
          lineNumber++;
          if (lineNumber === row + 1) {
            // we continue going, but know we are on the way out
            outroFlag = true;
          }
          break;
        case '{':
          depthTracker.push(item);
          if (depthPattern() === '[{[{' && clipFlag) {
            clipCount++; // Condition for incrementing clip count.
          }
          break;
        case '[':
          depthTracker.push(item);
          break;
        case '}':
          if (depthTracker.pop() !== '{') {
            throw new Error('Unmatched closing brace.');
          } else {
            // we've returned to the top level
            if (depthPattern() === '[' && outroFlag) {
              return { track: trackCount, clip: clipCount };
            }
          }
          break;
        case ']':
          if (depthTracker.pop() !== '[') {
            throw new Error('Unmatched closing bracket.');
          }
          if (depthPattern() === '[{' && clipFlag) {
            clipFlag = false; // Reset clipFlag based on exiting a clip array.
            clipCount = -1; // Resetting clipCount based on exiting a clip array.
          }
          break;
        case 'track':
          if (depthPattern() === '[{') {
            trackCount++;
            clipFlag = false; // Resetting clipFlag as we encounter a new track.
          }
          break;
        case 'clips':
          if (depthPattern() === '[{') {
            clipFlag = true; // Setting clipFlag as we enter a clips array.
          }
          break;
        default:
          break;
      }
    }
    return { track: trackCount, clip: clipCount };
  } catch (error) {
    // Handle or re-throw the error as needed
    console.error('JSON Error:', error);
    throw `JSON Error: ${error}`; // Re-throwing for the calling function to handle
  }
}

const insertClipIntoTrack = (jsonData, trackIndex, clipIndex, newClipPattern) => {
  // for tracks, -1 means prepend to the track[0]'s clips array, 
  // or append if no track exists
  if (trackIndex === -1) {
    trackIndex = 0;
  }

  // if the top level is not an array, this is an errror
  if (!Array.isArray(jsonData)) {
    throw new Error('Top level is not an array');
  }
  const trackArray = jsonData;
  var trackCount = -1;
  var index;
  // iterate over trackArray
  for (index = 0; index < trackArray.length; index++) {
    // check for existence of "track" key
    if (trackArray[index].track !== undefined) {
      // keep a count each time one is found
      trackCount++;
      // Break when trackCount == trackIndex
      if (trackCount === trackIndex) {
        break;
      }
    }
  }
  // if trackCount is still -1, then no track was found, error
  if (trackCount === -1) {
    throw new Error('No tracks found');
  }
  // note there may be other objects/arrays in the top level
  // so here we have the absolute index of the track object 
  const targetTrack = trackArray[index];
  console.log('targetTrack', targetTrack);
  // are there clips in the target track?
  if (targetTrack.clips === undefined) {
    // if not, create the clips array
    targetTrack.clips = [newClipPattern];
    // and our work is done here
    return jsonData;
  }
  // if there are clips, insert the new clip at the specified index
  // this time, everything in the array is considered a clip
  targetTrack.clips.splice(clipIndex, 0, newClipPattern);
  return jsonData;
};


export const insertNewClipIntoJsonStr = (jsonStr, row, newClipPattern) => {
  try {
    const jsonDestruct = splitJsonElements(jsonStr);
    const position = trackPositionInJson(jsonDestruct, row);
    const { track: trackIndex, clip: clipIndex } = position;
    const parsedJsonData = JSON5.parse(jsonStr); 
    const updatedJsonData = insertClipIntoTrack(parsedJsonData, trackIndex, clipIndex, newClipPattern);
    return JSON5.stringify(updatedJsonData, null, 2); // Stringifying the updated JSON
  } catch (error) {
    // Rethrowing the error with additional context
    throw new Error(error);
  }
};


// Recipe processing utils

import JSON5 from 'json5';
const { parse: JSONparse, stringify: JSONstringify } = require('comment-json');

// Insert a new clip into a JSON string based on a specified row
// @PARAM type: string - the type of JSON element to insert, 'track' or 'clip'
// @PARAM jsonStr: string - the JSON string to insert the new element into
// @PARAM currentRow: number - the row number to insert the new element after
// @PARAM newPattern: string - the new JSON element to insert
// @RETURN string - the updated JSON string
// TODO: Generalize this function to insert any JSON-like string at the proper boundary
export const insertNewElementIntoJsonStr = (jsonStr, type, currentRow, newPattern) => {
  try {
    console.log(`recipeUtils:insertNewClipIntoJsonStr: jsonStr: ${jsonStr}, typof: ${typeof jsonStr}`);
    const jsonElementArray = splitJsonElements(jsonStr);
    // console.log(`recipeUtils:insertNewClipIntoJsonStr: jsonElementArray: ${jsonElementArray}`);
    // TODO: Keep going and find the track or clip index
    const position = getPositionForInsert(jsonElementArray, type, currentRow);
    return;
    const { track: trackIndex, clip: clipIndex } = position;
    console.log('position', position);
    // const parsedJsonData = JSONparse(jsonStr); 
    // console.log(`recipeUtils:insertNewClipIntoJsonStr: parsedJsonData: ${parsedJsonData}`)
    // const updatedJsonData = insertClipIntoTrack(parsedJsonData, trackIndex, clipIndex, newPattern);
    // 

    // return JSON5.stringify(updatedJsonData, null, 2); // Stringifying the updated JSON
  } catch (error) {
    // Rethrowing the error with additional context
    throw new Error(error);
  }
};

// splits a JSON string into an array of JSON elements
// @PARAM jsonStr: string - the JSON string to split
// @RETURN array - an array of JSON elements
function splitJsonElements(jsonStr) {
  // This regex captures various JSON elements including quoted strings, unquoted keys, brackets,
  // braces, colons, commas, newlines, comments (both single-line and multi-line), and whitespace.
  const elements = jsonStr.match(/"[^"\\]*(\\.[^"\\]*)*"|'[^'\\]*(\\.[^'\\]*)*'|\b\w+\b|[\[\]{}:,]|\n|\/\/.*|\/\*[\s\S]*?\*\/|\s+/g);
  console.log(`splitJsonElements: ${elements}`);
  return elements;
}

// gets the position to insert a new JSON element after a specified row
// @PARAM jsonElementArray: array - the destructured JSON elements
// @PARAM type: string - the type of JSON element to insert, 'track' or 'clip'
// @PARAM row: number - the row number to insert the new element after
// @RETURN object - line and row position to insert the new element
function getPositionForInsert(jsonElementArray, type, row) {
  // This function is a state machine that tracks the depth of the JSON structure
  // and counts the number of tracks and clips to determine the position to insert
  // 
  // Possibilities:
  //   Inserting a track:
  //     1. Insert a new track at the top level after the last track 
  //   Inserting a clip:
  //     1. CurrentPosition is before the first track, 
  //        insert a clip at the beginning of the first track
  //     2. CurrentPosition is after the last track, 
  //        insert a clip at the end of the last track
  //     3. CurrentPosition is between tracks, 
  //        insert a clip at the end of the previous track
  //     4. CurrentPosition is inside a track but before the clip list, 
  //        insert a clip at the beginning of the clip list
  //     5. CurrentPosition is inside a clip,
  //        insert a clip after the current clip
  //
  // JSON structure:
  //   {
  //     tracks: [
  //       {
  //         track: 0,
  //         clips:[
  //           {},
  //           {}
  //         ] // clips
  //       } // track
  //     ] // tracks
  //   } // JSON
  //
  // We will have to make sure that commas are added to the previous tracks or clips
  //
  try {
    let lineNumber = 0;
    // tracks the depth of the JSON structure
    let depthTracker = [];
    let trackCount = -1;
    let clipCount = -1;
    // are we in a track or clip?
    let trackFlag = false;
    let clipFlag = false;
    // keeping track of character position within JSON-like string
    let charPosCount = 0;
    // flag to indicate if the current position has been found
    let currentPosFound = false;
    // these are candidates for the position to insert the new element
    let potentialInsertTrackPosition = 0;
    let potentialInsertClipPosition = 0;

    function depthPattern() {
      return depthTracker.join('');
    }

    console.log('Searching for insertion position...');
    for (let item of jsonElementArray) {
      // keep a character count
      charPosCount += item.length;
      //
      // single-line comments: skip
      if (item.startsWith('//')) {
        // console.log('skipping comment');
        continue;
      } 
      // multi-line comments: skip
      else if (item.startsWith('/*')) {
        // console.log('skipping comment');
        // count the number of newlines in the comment
        const commentLines = item.split('\n').length;
        lineNumber += commentLines - 1;
        continue;
      }
      // sequences of tabs and spaces: skip
      else if (item.match(/^[ /t]]+$/)) {
        // console.log('skipping whitespace');
        continue;
      }
      console.log('item:', item);
      //
      // now consider item and what to do with it
      switch (item) {
        //
        // newlines: how we tell when we are at the cursor position
        case '\n':
          lineNumber++;
          console.log(`new line. Linenumber: ${lineNumber} (${row + 1})`);
          // TODO: We might miss the position if we are in a multi-line comment, so this should be fixed
          if (lineNumber >= row + 1 && !currentPosFound) {
            console.log(`cursor position found at line ${lineNumber}`);
            currentPosFound = true;
          }
          break;
        //
        // entering an object
        case '{':
          depthTracker.push(item);
          // entering JSON structure
          if (depthPattern() === '{') {
            console.log('Entering JSON structure');
          } 
          // entering a track
          else if (depthPattern() === '{[{' && trackFlag) {
            console.log('Entering a track');
            trackCount++; 
            // Resetting clipCount as we enter a new track.
            clipCount = -1;
          } 
          // entering a clip
          else if (depthPattern() === '{[{[{' && clipFlag) {
            console.log('Entering a clip');
            clipCount++;
          }
          break;
        //
        // entering an array
        case '[':
          depthTracker.push(item);
          // entering a track array
          if (depthPattern() === '{[' && trackFlag) {
            console.log('Entering a track array');
          }
          // entering a clip array
          else if (depthPattern() === '{[{[' && clipFlag) {
            console.log('Entering a clip array');
          }
          break;
        //
        // exiting an object
        case '}':
          if (depthTracker.pop() !== '{') {
            throw new Error('Unmatched closing brace.');
          }
          // exiting a clip
          if (depthPattern() === '{[{[' && clipFlag) {
            console.log('Exiting a clip');
          }
          // exiting a track
          else if (depthPattern() === '{[' && trackFlag) {
            console.log('Exiting a track');
          }
          // exiting JSON structure
          else if (depthPattern() === '') {
            console.log('Exiting JSON structure');
          }
          break;
        //
        // exiting an array
        case ']':
          if (depthTracker.pop() !== '[') {
            throw new Error('Unmatched closing bracket.');
          }
          // exiting a clip array
          if (depthPattern() === '{[{' && clipFlag) {
            console.log('Exiting a clip array');
            clipFlag = false;
            // Reset clipCount
            clipCount = -1;
          }
          // exiting a track array
          else if (depthPattern() === '{' && trackFlag) {
            console.log('Exiting a track array');
            trackFlag = false;
          }
          break;
        // 
        // encountering tracks key
        case 'tracks':
          if (depthPattern() === '{') {
            console.log('Found tracks key');
            trackFlag = true;
          }
          break;
        //
        // encountering clips key
        case 'clips':
          if (depthPattern() === '{[{') {
            console.log('Found clips key');
            clipFlag = true;
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
    throw error; // Re-throwing for the calling function to handle
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
  // console.log('targetTrack', targetTrack);
  // are there clips in the target track?
  if (targetTrack.clips === undefined) {
    // if not, create the clips array
    targetTrack.clips = [newClipPattern];
    // and our work is done here
    return jsonData;
  }
  // if there are clips, insert the new clip at the specified index
  // this time, everything in the array is considered a clip
  targetTrack.clips.splice(clipIndex + 1, 0, newClipPattern);
  return jsonData;
};


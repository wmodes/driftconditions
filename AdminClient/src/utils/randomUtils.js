// randomUtils.js - utility functions for generating random texts and project name

// Import the config object from the config.js file
import config from '../config/config';

var tracery = require('tracery-grammar');

var grammarDefinition = {
  "origin": [
    "#assertion#"
  ],
  "intro": [
    "%projectName% is an online radio station that captures #evocativeNounPhrase# in #evocativeNounPhrase#."
  ],
  "assertion": [
    "#thingsWeWillFind.capitalize#, #thingsWeWillFind#, and #thingsWeWillFind# weave #thingsWeWillFind# that draws listeners into #evocativeNounPhrase#.",
    "Inspired by the unpredictability of real-world radio broadcast, %projectName% explores the boundaries between intention and happenstance, inviting listeners to eavesdrop on #evocativeNounPhrase#.",
    "With each new listening experience, %projectName% offers #evocativeNounPhrase#.",
    "%projectName% whispers its tales as secrets shared under the cloak of night, #evocativeNounPhrase#.",
    "It's told not with the clarity of daylight but with the mystery of shadows, where sounds blend and tales intertwine like conversations on a long, late-night journey with a close companion.",
    "Stories come through in #thingsWeWillFind#, #thingsWeWillFind#, #thingsWeWillFind#, #thingsWeWillFind#.",
    "%projectName% invites you to lean closer, to become part of #evocativeNounPhrase#, #evocativeNounPhrase#, all wrapped in #evocativeNounPhrase#.",
    "%projectName% blends #evocativeNounPhrase# with #evocativeNounPhrase#, crafting #evocativeNounPhrase#.",
    "This online audio experience weaves #evocativeNounPhrase#, drawing listeners into #evocativeNounPhrase#.",
    "Each session offers #evocativeNounPhrase#, exploring #evocativeNounPhrase#.",
    "#thingsWeWillFind#, #thingsWeWillFind#, and #thingsWeWillFind# weave #thingsWeWillFind# that draws listeners into #evocativeNounPhrase#.",
    "Inspired by the unpredictability of real-world radio interference, %projectName% explores the boundaries between intention and happenstance, inviting listeners to eavesdrop on #evocativeNounPhrase#.",
    "With each new listening session, %projectName% offers #evocativeNounPhrase#."
  ],
  "thingsWeWillFind": [
    "overlapping fragmented stories",
    "a distorted broadcast",
    "a larger narrative",
    "ambient sounds",
    "fragmented pieces",
    "mysterious crosstalk",
    "an overheard conversation",
    "a vivid sonic collage",
    "interwoven narratives",
    "a disjointed transmission",
    "an unfolding tableau",
    "whispers in the static",
    "a tapestry of echoes",
    "echoes of lost voices",
    "a mosaic of memories",
    "shadows of untold stories",
    "a symphony of dissonance",
    "veiled whispers"        
  ],
  "plainENP": [
    "a fresh journey through its evocative auditory landscape",
    "a hidden world of voices and atmospheres unconstrained by traditional narrative structures",
    "a tapestry of serendipitous encounters",
    "a unique journey through its evocative soundscape",
    "a world where intention and chance converge",
    "a realm beyond traditional narratives",
    "an immersive and unpredictable listening experience",
    "an immersive stream of stories, sounds, and crosstalk",
    "an intimate exchange between the listener and the vast, unseen world",
    "an unfolding mystery",
    "the creativity of code-generated audio",
    "the chaos and serendipity of late-night radio tuning",
    "the liminality of an endless night drive",
    "the unpredictability of late-night radio",
    "the warmth of voice and the chill of the unknown",
    "an uncanny audio stream generated on the fly by code"
  ],
  "evocativeNounPhrase": [
    "#plainENP#", "<b>#plainENP#</b>"
  ],
  "projectName": [
    "#projNoun##projNoun#", "#projAdj##projNoun#", "#projAdj##projPlural#", "#projNoun##projPlural#"
  ],
  "projNoun": [
    "Static", "Drift", "Radio", "Nocturne", "Event", "Interference", "Dusk", "Frequency", "Elegy", "Diaspora", "Project", "Aether", "Flow", "Schema", "Protocol", "Shutdown", "Matrix", "Feedstock", "Fidelity", "Dissonance", "Resonance", "Feedback", "Modulation", "Amplitude", "Noise", "Tone", "Timbre", "Pitch", "Dynamics", "Articulation", "Phrasing",
    "Control", "Process", "System", "Equipment", "Operation", "Variable", "Instrumentation", "Utility", "Procedure", "Safety", "Analysis", "Catalyst", "Drawing", "Standard", "Specification", "Manual", "Design"
  ],
  "projPlural": [
    "Conditions", "Variations", "Matrices", "Schemas", "Protocols", "Fidelities", "Frequencies",
    "Processes", "Systems", "Operations", "Variables", "Utilities", "Procedures", "Analyses", "Catalysts", "Standards", "Specifications"
  ],
  "projAdj": [
    "Static", "Toxic", "Halcyon", "Safety", "Radio", "Drift", "Dusk",
    "General", "Dynamic", "Licensed", "NonLicensed", "Auxiliary", "Analytical"
  ]
}

var grammar = tracery.createGrammar(grammarDefinition);
grammar.addModifiers(tracery.baseEngModifiers);

export const generateRandomTexts = (projectName) => {
  let texts = [];
  let shortestIndex = 1; // Start considering from the second element
  let shortestLength = Infinity; // Initialize with a very large number

  // Make sure your grammar uses the projectName properly
  // Intro phrase
  texts.push(grammar.flatten('#intro#').replace(/%projectName%/g, projectName));

  for (let i = 0; i < 6; i++) {
      let text = grammar.flatten('#origin#').replace(/%projectName%/g, projectName);
      // Capitalize the first character and concatenate the rest of the string
      text = text.charAt(0).toUpperCase() + text.slice(1);
      texts.push(text);

      // Skip the first element for shortest check, start from the second
      if (i >= 1 && text.length < shortestLength) {
          shortestLength = text.length;
          shortestIndex = i + 1; // Adjust index because of the initial intro phrase
      }
  }

  // Move the shortest text to the second position if it's not already there
  // Ensure the shortest text is not the intro phrase itself
  if (shortestIndex > 1 && shortestIndex !== 2) {
      const [shortestText] = texts.splice(shortestIndex, 1); // Remove the shortest text
      texts.splice(2, 0, shortestText); // Insert at the second position
  }
  return texts;
};

//
// Choosing a project name
//

export const getProjectName = () => {
  let projectName = sessionStorage.getItem('projectName');
  if (!projectName) {
    // projectName = projectNames[Math.floor(Math.random() * projectNames.length)];
    projectName = grammar.flatten('#projectName#')
    sessionStorage.setItem('projectName', projectName);
  }
  // console.log('projectName:', projectName);
  return projectName;
};

//
// Choosing a hero image
//

export const getHeroImageURL = () => {
  const { homepageImages, homepageImageURLBase } = config.app;

  // Calculate the index for the current image
  const imageIndex = generateHash() % homepageImages.length;
  const imageUrl = `${homepageImageURLBase}/${homepageImages[imageIndex]}`;
  return imageUrl;
}

//
// Helper functions
//

// Function to generate a hash from date and projectName
const generateHash = () => {
  const projectName = getProjectName();
  const date = new Date();
  const weekNumber = getWeekNumber(date);
  const month = date.getMonth();
  const year = date.getFullYear();
  const projectHash = stringToHash(projectName);
  const hashKey = `${projectHash}${weekNumber}${month}${year}`;
  return parseInt(hashKey, 10); // Convert hash to integer
};

// Function to generate a simple hash from a string
const stringToHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash); // Ensure it's a positive number
};

// Function to get week number of the current date
const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};
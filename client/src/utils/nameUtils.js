const projectNames = [
  "Static Drift",
  "Radio Chatter",
  "Radio Nocturne",
  "Whiskey Murmur",
  "Toxic Event",
  "Drift Condition",
  "Radio Interference",
  "Dusk Variations",
  "Drift Frequency",
  "Radio Halcyon",
  "Radio Mirage",
  "Radio Elegy",
  "Radio Diaspora",
  "Project Aether",
];

export const getProjectName = () => {
  let projectName = sessionStorage.getItem('projectName');
  if (!projectName) {
    projectName = projectNames[Math.floor(Math.random() * projectNames.length)];
    sessionStorage.setItem('projectName', projectName);
  }
  return projectName;
};

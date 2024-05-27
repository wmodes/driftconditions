# Function to fetch the next track from your API
def fetch_next_track()
    # Using process.read to fetch the next track file path from the API
    # Fetch the file path from the API and strip out double quotes
    result = process.read("curl -s http://localhost:8083/api/queue/nextmix")
    string.trim(result)
end

# Function to notify the server when a new track starts
def notify_track_start(m)
    # Extract the file name from the full file path
    filename = string.split_right(m["file"], "/")[1]
    # Extract the mixID from the file name (assuming the format is 'mixID_filename.mp3')
    mixID = string.split(filename, "_")[0]
    # Construct the URL for the API call
    url = "http://localhost:8083/api/queue/markplayed"
    # Use process.run to send the mixID to your server
    process.run("curl -X POST -d 'mixID=" ^ mixID ^ "' " ^ url)
end

dynamicplaylist = request.dynamic(id="dynamic_playlist", fun() ->
  request.create(fetch_next_track())
)

# Apply crossfade to the dynamic playlist
crossfaded_dynamic = crossfade(dynamicplaylist)

# Ensure the track is ready before playing using mksafe
safe_crossfaded_dynamic = mksafe(crossfaded_dynamic)

# Attach the notify_track_start function to the on_metadata hook
safe_crossfaded_dynamic = on_metadata(safe_crossfaded_dynamic, notify_track_start)

# Icecast output settings
output.icecast(%mp3,
  host = "localhost",
  port = 8001,
  password = "1c3c@$t",
  mount = "/stream",
  description = "DriftConditions explores the intersection of intention and chance through an ever-evolving tapestry of audio. Each broadcast delves into a hidden world of code-generated sounds, echoing whispers, and serendipitous static, offering listeners a unique journey through an auditory landscape unconstrained by traditional narratives.",
  name = "DriftConditions: Whispers in the Static",
  genre = "Experimental, Ambient, Soundscape",
  url = "https://driftconditions.org/",
  public = true,
  encoding = "UTF-8",
  safe_crossfaded_dynamic
)



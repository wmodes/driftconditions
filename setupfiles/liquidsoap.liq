# Function to fetch the next track from your API
def fetch_next_track()
    # Using process.read to fetch the next track file path from the API
    # Fetch the file path from the API and strip out double quotes
    result = process.read("curl -s http://localhost:8083/api/queue/nextmix")
    string.trim(result)
end

dynamicplaylist = request.dynamic(id="dynamic_playlist", fun() ->
  request.create(fetch_next_track())
)

# Apply crossfade to the dynamic playlist
crossfaded_dynamic = crossfade(dynamicplaylist)

# Ensure the track is ready before playing using mksafe
safe_crossfaded_dynamic = mksafe(crossfaded_dynamic)

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

# VosCast Icecast output settings
output.icecast(%mp3,
  host = "s4.voscast.com",
  port = 9155,
  password = "B4nD86nEMp",
  mount = "/",
  description = "DriftConditions explores the intersection of intention and chance through an ever-evolving tapestry of audio. Each broadcast delves into a hidden world of code-generated sounds, echoing whispers, and serendipitous static, offering listeners a unique journey through an auditory landscape unconstrained by traditional narratives.",
  name = "DriftConditions: Whispers in the Static",
  genre = "Experimental, Ambient, Soundscape",
  url = "https://driftconditions.org/",
  public = true,
  encoding = "UTF-8",
  safe_crossfaded_dynamic
)

# FastCast4u configuration (commented out)
# output.shoutcast(%mp3,
#   host = "usa19.fastcast4u.com",
#   port = 6850,
#   password = "f@stcast4u!",
#   name = "DriftConditions: Whispers in the Static",
#   genre = "Experimental, Ambient, Soundscape",
#   url = "https://driftconditions.org/",
#   public = true,
#   encoding = "UTF-8",
#   safe_crossfaded_dynamic
# )
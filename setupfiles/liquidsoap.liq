# Fetch the next track path from MixEngine API.
# Returns null() when MixEngine is unreachable so request.dynamic marks
# the source unavailable and fallback switches to static audio immediately.
def fetch_next_track()
    result = string.trim(process.read("curl -s http://localhost:8083/api/queue/nextmix"))
    if result != "" then request.create(result)
    else null()
    end
end

dynamicplaylist = request.dynamic(id="dynamic_playlist", fetch_next_track)

# Apply crossfade to the dynamic playlist
crossfaded_dynamic = crossfade(dynamicplaylist)

# Fallback: loop short-wave static if MixEngine source goes down
static_fallback = single("/home/debian/driftconditions/content/2024/06/short-wave-static-long.mp3")

# Use fallback instead of mksafe — switches immediately on source failure
safe_crossfaded_dynamic = fallback(track_sensitive=false, [crossfaded_dynamic, static_fallback])

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
# output.icecast(%mp3,
#  host = "s4.voscast.com",
#  port = 9155,
#  password = "B4nD86nEMp",
#  mount = "/",
#  description = "DriftConditions explores the intersection of intention and chance through an ever-evolving tapestry of audio. Each broadcast delves into a hidden world of code-generated sounds, echoing whispers, and serendipitous static, offering listeners a unique journey through an auditory landscape unconstrained by traditional narratives.",
#  name = "DriftConditions: Whispers in the Static",
#  genre = "Experimental, Ambient, Soundscape",
#  url = "https://driftconditions.org/",
#  public = true,
#  encoding = "UTF-8",
#  safe_crossfaded_dynamic
# )

# FastCast4u configuration
output.shoutcast(%mp3,
  host = "usa14.fastcast4u.com",
  port = 7118,
  password = "f@stcast4u!",
  mount = "/stream",
  name = "DriftConditions: Whispers in the Static",
  genre = "Experimental, Ambient, Soundscape",
  url = "https://driftconditions.org/",
  public = true,
  encoding = "UTF-8",
  safe_crossfaded_dynamic
)
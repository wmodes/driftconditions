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

# Ensure the track is ready before playing using mksafe
safe_dynamic = mksafe(dynamicplaylist)

# Icecast output settings
output.icecast(%mp3,
  host = "localhost",
  port = 8000,
  password = "1c3c@$t",
  mount = "/stream",
  safe_dynamic
)



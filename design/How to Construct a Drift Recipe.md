# How to Construct a Drift Recipe

*What a recipe is, how the engine reads one, and how to write one that opens up possibilities.*

This doc runs from concept to code. Part I is the idea, Part II is how the engine reads a recipe, Part III is the craft of writing one, and Part IV is reference for when you're actually typing. If you're brainstorming recipes rather than building them, Parts I and III are the ones that matter.

# Part I: What a Recipe Is

## Where the Mixes Come From

DriftConditions is a platform for generative audio streams. A station built on it isn't playing a playlist. Every mix is assembled on the fly from a library of contributed clips: field recordings, music, archival radio, oral histories, noise. Something has to decide which clips go together, how many layers play at once, how loud each one is, and what happens to them along the way. That something is a recipe.

A recipe is a short text file describing the shape of a mix. The engine reads it, pulls clips from the library that fit, and builds the mix. Run the same recipe again and it builds a different mix.

The idea of a recipe comes from radio. As a producer on a mixed narrative and music radio show, the developer learned certain recipes for successful storytelling: a music bed that ducks under a narrative element, crossfades between pieces of music, sound design to build atmosphere. They were patterns, filled in with the material that helped tell a story. DriftConditions formalizes these types of patterns and uses them to generate unique mixes.

## Adaptable Recipes

Every home cook already understands this kind of recipe. A recipe for roast chicken calls for "an acid," and one cook reaches for lemon, another for vinegar, a third for white wine. The bird comes out a little different every time, and it's still the same recipe.

A drift recipe works the same way. You don't name which audio file plays in a slot. You describe a role, and the engine finds something in the library that fits it, leaning toward your preferences but never limited to them.

## A Space of Possibilities

Say you want to build a recipe called "Rainy Day Circus." You have a specific sound in your head: calliope music heard through canvas, rain on a tent roof, a distant ringmaster, the murmur of a crowd. You write it up: a music layer leaning toward circus and calliope, a rain layer leaning toward storms and thunder, an announcements layer leaning toward ringmasters and PA systems. You listen to the mix it generates, and it may sound something like what you imagined. Or the "circus" music is a distant solo piano nocturne, the "rain" is cicadas at dusk, and the "ringmaster" is faint shortwave static.

Nothing broke. This is the recipe working exactly as designed.

A recipe doesn't describe the mix you have in mind. It describes a *space of possible mixes*, and the one you imagined is just one point inside that space.

## An Evocative Idea

There are probably lots of ways to write good recipes. The developer’s process goes something like this:

1. Start with an evocative idea, *Waiting Room for the Recently Dead*, *Fucked Up Radio Air Check*, or *Just a Story*.
2. Next, imagine the elements that make up that idea, the room tone, the music bed, the narrative, the effects. These will be the ingredients of the recipe.
3. Build a structure around that idea: a layout of layers, lengths, and kinds of sound that holds up whatever clips land in it.
4. Preview to see if it needs adjustment: Too loose? Too tight?

Every recipe is an experiment: you listen to what it makes, near-misses included, and adjust. Too loose, and the mixes come out generic. Too tight, and the misses fail ugly instead of landing somewhere interesting. The craft is finding the setting where the surprises still fit the idea.

# Part II: How the Engine Reads a Recipe

## Layers and Sequences

Picture multitrack mixing software, with tracks and audio clips. A recipe is laid out the same way: a stack of **tracks** that all play at the same time, mixed together at the end. A music bed on one track, a voice on another, a layer of static on a third.

Along each track's timeline sit **clip slots**, which play one after another in order. A track might be one long piece of music, or a voice followed by a pause followed by another voice, or a loop of the same pattern for as long as the mix runs.

One track usually sets the length of the whole mix. The others fill or loop to match it.

The simplest recipes are one track playing one clip. *Basic Music Recipe* plays a single piece of music start to finish. *Just Environmental or Field-Recording* plays one field recording, nothing added. One step up is *Environmental with Far Away Music* ("You are sitting in the grass hearing distant music across the field"). One track loops a field recording. A second plays vintage jazz at low volume, muffled, alternating with stretches of silence. Two tracks, and already a place.

## The Fence and the Nudge

Every clip slot carries up to four kinds of instructions: what kind of sound it is (`classification`), what you'd like it to be about or feel like (`tags`), how long it runs (`length`), and what happens to it sonically (`effects`). It's tempting to read the first three as a checklist the engine searches the library against. Only two of them work that way.

**`classification` is a fence.** It's a hard filter against the library's own classification field: Ambient, Environmental, Instrumental, Archival, Effect, and so on (the full list is in Part IV). A slot asking for only `environmental` will *only* ever be filled from clips classified `environmental`. List more than one and the fence widens to include these classifications: `["archival", "spoken"]` draws from either.

**`length` is a fence too.** It restricts the pool to clips in a named duration bucket: `tiny` (0-10s), `short` (10s-2m), `medium` (2-5m), and so on. List more than one bucket and the slot draws from any of them: `["tiny", "short"]` gets you anything up to two minutes.

**`tags` are a nudge, not a fence.**

Put plainly: **classification and length decide what's possible. Tags decide what's more likely.** So write classification and length to describe the outer boundary of what you'd be happy to hear, and write tags to describe your ideal.

Tags still matter, since they shift the odds. But nothing guarantees a specific sound: the fences are broad categories and durations, not particular sounds. Loose is the point.

## How a Clip Gets Chosen

For each slot, the engine does three things.

**It builds a pool** of every clip that passes the fences: the right classification and the right length.

**It scores each clip in the pool** on four things:

- how well its tags match the slot's tags
- how well its tags match the clips already chosen for this mix
- how recently it played (recent clips score lower)
- how often it has played overall (frequent clips score lower)

The first two keep the mix on theme. The last two keep it fresh.

**It picks from the top of the list.** The engine takes the best-scoring clips (the top 10% of the pool, or 25 clips, whichever is more) and picks one of them at random. A clip that matches your tags perfectly isn't guaranteed to play. It's just more likely to make that shortlist.

That's how a piano nocturne can end up in "Rainy Day Circus." Its music track only allows instrumental and vocal music, and leans toward circus tags. If the library has only a few circus-tagged clips, the rest of the shortlist fills with other instrumental music, and a piano nocturne can win. The same goes for the rain track, which takes any environmental sound, cicadas included, and the announcements track, which takes any archival speech, shortwave static included.

## How Clips Are Described

The fence and the nudge only work because of how contributors describe clips when they upload them.

### Classification: As Few as Possible

Classification is a controlled vocabulary of fifteen fixed options. Next to the classification field, the upload form reads: *"A broad category that describes the broad type of audio. Pro-tip: Use as few classifications as applicable."* A clip classified only `Environmental` sits squarely inside every environmental slot in every recipe. A clip classified `Environmental, Instrumental, Effect` sits inside three fences at once.

### Tags: As Many as Possible

Tags are the opposite, a folksonomy: free-form words contributors attach themselves, as many as they like, with no shared list. The upload form asks contributors to describe topic, theme, and texture, and adds: *"Pro-tip: Use as many simple tags as you can think of."* The more angles a clip is tagged from, the more ways it can be found later.

That means when you write tags in a recipe, you're guessing at words other people chose. More on what to do about that in Part III.

## A First Recipe, Read Aloud

Here's the smallest recipe that does something interesting. Recipes are written in JSON5, which is JSON but forgiving: unquoted keys, trailing commas, and comments (anything after `//`) are all fine.

```json5
{
  tracks: [
    {
      // The music bed. This track's length sets the length of the mix
      effects: ["trim"],
      volume: 60,
      clips: [
        {
          classification: ["instrumental"],
          tags: ["ambient", "drone"],
          length: ["long"],
          effects: ["norm"],
        }
      ]
    },
    {
      // A voice, wandering in and out over the top
      volume: 90,
      effects: ["loop", "faraway"],
      clips: [
        { classification: "silence", length: ["medium", "long"] },
        {
          classification: ["archival", "spoken"],
          tags: ["radio", "found"],
          length: ["tiny", "short"],
          effects: ["norm(voice)"],
        },
        { classification: "silence", length: ["medium", "long"] },
      ]
    },
  ]
}
```

The first track is one clip slot: something instrumental (fence), five to ten minutes long (fence), ideally ambient or drone (nudge), normalized volume (effect). `trim` makes this the track that sets the length of the whole mix, and `volume: 60` keeps it under the voice.

The second track is three slots in sequence: a stretch of silence, a short spoken fragment from archival or spoken-word clips (ideally something radio-ish or found), then more silence. `loop` repeats that pattern for as long as the mix runs. `faraway` muffles it, so the voice sounds like it's drifting in from another room.

Part III is about how to use each of these fields.

# Part III: Writing One

## Starting From an Idea

Recipe descriptions show where they start. *Rainy Day Circus*: "Out of the cold and into the big top. Rain patters on the canvas overhead while a calliope and brass band wheeze through an old carnival tune inside." The tracks follow from that: music, rain, crowd, ringmaster, animals.

*Waiting Room for the Recently Dead*: "Hold music loops softly overhead. A distant PA makes occasional announcements. Take a number. Your name will be called."

*Voicemails from Strangers*: "Messages left, never retrieved, with a drone underneath that barely holds it together."

The idea can come from anywhere. *Drift*, a Voices recipe, started as a shipmate's memory of drifting the Sacramento River without a motor, a slow plucking song playing: "River flowing, little claps from the grasses swaying on the shore, slow slow music." The recipe is that memory broken into three tracks. The river current sets the length. A patch of reeds rustles in and out of silence. Someone plays a little banjo or guitar, listens a while, plays some more.

## Where to Spend Specificity

Tags are one way to lean toward the idea, and synonyms widen the net. *Rainy Day Circus* doesn't tag its rain track just `rain`. It uses `rain, storm, precipitation, downpour, drizzle, thunder, thunderstorm`.

Dense tagging is one technique among several. Across the recipes written for the DriftConditions station, four show up.

**Tag density, spread evenly, all pointing the same direction.** *Waiting Room for the Recently Dead* builds its mood from three tracks: a muzak bed tagged `elevator-music, hold-music, muzak, easy-listening, lounge, smooth`, a drone tagged seventeen ways (from `drone` and `hum` to `shortwave`, `tv-static`, and `ham-radio`), and PA announcements tagged `announcement, public-address, intercom, official, broadcast`. No single tag commits the mix to anything in particular. Together, from three angles, they all point the same way.

**Concentrated tagging on the track carrying the theme, and almost none on the tracks around it.** *Voicemails from Strangers* puts twenty tags (`confession, testimonial, diary, oral-history, one-sided, soliloquy...`) on the voicemail track alone. The drone bed underneath carries exactly two: `drone, ambient`. A comment in the recipe explains why: *"barely-there drone - presence, not content."*

**Lean, precise tags, carried by volume rather than vocabulary.** *Fucked Up Radio Air Check* ("You're listening to KILL Satan's radio station") tags thinly everywhere, one to four words per slot, but stacks four narrow, single-purpose tracks at four distinct volumes: a foreground archival aircheck at 80, run through a telephone filter, a wavering layer of static at 50, a fixed layer of static at 20, a drone at 20. The specificity is in the architecture: one clear voice, two graduated layers of noise beneath it, a bed almost below the threshold of hearing.

**Structure and timing alone, with next to no tags at all.** *More and More and More* has exactly one tagged slot across five tracks: a piano drone underneath. Four spoken tracks carry no tags whatsoever. Each spoken track starts after a different amount of silence, so the voices enter one at a time, "piling up until the mix is dense with overlapping talk."

The same thinking carries into Voices. *Anchored for the Night* asks for "crickets/frogs as a steady, thinly-tagged bed," with a dock creak, a distant train, and VHF chatter as rare accents, "not a themed layer competing for identity."

## Silence as Material

A clip slot can ask for `classification: "silence"`, which generates silence of a given length instead of pulling from the library. It's a compositional tool, not a fallback.

Silence can set a rhythm. *Staticy Static* and *Ambient with Effects* alternate silence with short bursts, so things surface out of the quiet and sink back down. It can also make an event rare. In *Anchored for the Night*, the train track is one long stretch of silence followed by one distant train, with no loop. The comment in the recipe: "a distant train - once, maybe, then gone."

## Shaping With Effects

Effects change where a sound seems to be, how it moves, and how it sits against everything else. Think of them in four families.

**Structure** decides how a track fills time: which track sets the mix length (`trim`), whether a track or clip repeats (`loop`), how it ends (`fadeout`).

**Level** sets the hierarchy: normalizing loudness so a voice sits forward or a bed sits back (`norm(voice)`, `norm(bed)`), and plain volume (`norm`).

**Distance and color** put a sound somewhere: in the next room (`faraway`), down an old phone line (`telephone`), played backward (`backward`). *Voicemails from Strangers* runs every message through `telephone`. *Something Reversed + Drone* ("Paul is dead.") plays music or speech backward over an untouched drone.

**Movement** keeps layers from sitting static: `wave` lets a track swell and recede on a slow, organic curve, and an inverted wave on a second track means the two trade places instead of peaking together. *Interrupted Sermon* is built on exactly that. The sermon rides `wave(fast)`, the newscast rides `wave(fast, counter)`, so the two swap back and forth like a dial drifting between stations, and a static track on `wave(fast, bridge)` spikes right at the handoff. `duck` drops one track whenever another has signal, the classic music-under-the-announcer move. *Short Narrative with music bed* uses it so the bed gets out of the way whenever the story speaks.

The full list, with parameters, is in Part IV.

## Callbacks

A slot can use `repeat(n)` (or `clone(n)`) to reuse the *n*th clip already chosen earlier in the same track instead of drawing a fresh one. This is how a recipe creates a callback: the same voice returning later, the same musical phrase recurring, without naming a specific clip.

*Drift* uses it so the reeds are, in the recipe's words, "the same patch of shoreline throughout rather than a different sound each pass." *Anchored for the Night* does the same with its dock creak: one dock, one sound, all night.

## Listen, Then Adjust

On the recipe edit page, the **Preview** button plays a sample draw of your recipe.

Sometimes a miss is the find. *Drone with Things Said In the Background* exists because a misconfiguration in *Fucked Up Radio Air Check* "made something cool I wanted to replicate." When a run surprises you in a way you like, work out what produced it and write that down as its own recipe.

# Part IV: Reference

## Recipe Anatomy

A recipe is a JSON5 object with a `tracks` array. Each track has a `clips` array. Tracks play simultaneously; clips within a track play in sequence.

Each recipe is stored with some metadata alongside the JSON5: a title, a description, and recipe-level classification and tags. The description usually sketches the recipe's idea. Recipe-level classification and tags are used to choose which recipe plays next. Along with how recently and how often each recipe has played, they score the recipes so the station stays varied.

## Track Fields


| Field     | Required | What it does                                                            |
| --------- | -------- | ----------------------------------------------------------------------- |
| `clips`   | yes      | Array of clip slots, played in order                                    |
| `track`   | no       | The track's number, starting at 0. Another way for`duck` to refer to it |
| `label`   | no       | A name for the track, so other tracks can refer to it (used by`duck`)   |
| `tags`    | no       | Added to the pool of tags used to pick clips within the track           |
| `volume`  | no       | Gain as a percentage, 0-100+ (default 100)                              |
| `effects` | no       | Array of effects applied to the whole track                             |

## Clip Fields


| Field            | Required | What it does                                          |
| ---------------- | -------- | ----------------------------------------------------- |
| `classification` | yes      | Fence. One or more classifications, or`"silence"`     |
| `length`         | no       | Fence. One or more length buckets                     |
| `tags`           | no       | Nudge. Words that raise a clip's odds of being picked |
| `volume`         | no       | Gain as a percentage, 0-100+ (default 100)            |
| `effects`        | no       | Array of effects applied only while this clip plays   |

## Classifications

Matched case-insensitively: `Ambient`, `Atmospheric`, `Environmental`, `Premixed`, `Soundscape`, `Archival`, `Spoken`, `Narrative`, `Instructional`, `VocalMusic`, `Instrumental`, `Experimental`, `Digital`, `Effect`, `Other`.

Plus `silence`, which is recipe-only: it generates silence instead of pulling from the library.

## Length Buckets


| Bucket   | Duration |
| -------- | -------- |
| `tiny`   | 0-10s    |
| `short`  | 10s-2m   |
| `medium` | 2-5m     |
| `long`   | 5-10m    |
| `huge`   | 10m-2h   |

## Effects

Effects are strings, optionally with parameters in parentheses: `"trim"`, `"norm(voice)"`, `"wave(slow, lifted)"`. They can go on a track (applied to its whole timeline) or a clip (applied only while it plays), and a slot can carry more than one.

**Effects are not applied in the order you list them.** They're reordered into a fixed priority: structural effects first (`trim`, `loop`, `fadeout`), then loudness normalization, then volume, then distance and color (`backward`, `faraway`, `telephone`), then movement (`wave`, `duck`) last. `["wave(slow)", "norm(voice)"]` and `["norm(voice)", "wave(slow)"]` produce the identical result. Several of these only make sense in that order (normalize loudness before shaping it with a wave), so the engine enforces it for you.


| Effect                       | Scope  | What it does                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trim`                       | track  | Makes this the track whose length sets the whole mix's length. Alternatives:`first`, `shortest`, `longest` (default)                                                                                                                                                                                                                                                            |
| `norm(preset)`               | either | Loudness-normalizes. Presets:`voice`/`spoken` and `music` (foreground), `bed`/`musicbed` (background, quieter). No preset means foreground                                                                                                                                                                                                                                      |
| `volume(n)`                  | either | Gain as a percentage. Same as the plain`volume` field                                                                                                                                                                                                                                                                                                                           |
| `loop`                       | either | Loops to fill the mix's duration, or`loop(n)` for a fixed number of repeats                                                                                                                                                                                                                                                                                                     |
| `fadeout(seconds)`           | either | Fades out over the given seconds (default 3) at the end                                                                                                                                                                                                                                                                                                                         |
| `backward` / `reverse`       | either | Reverses the audio                                                                                                                                                                                                                                                                                                                                                              |
| `faraway` / `distant`        | either | Lowpass plus a touch of reverb, as if from another room.`faraway(vol)` also drops the level                                                                                                                                                                                                                                                                                     |
| `telephone` / `phone`        | either | Band-limits and lightly distorts, like an old phone line                                                                                                                                                                                                                                                                                                                        |
| `wave(preset, modifiers...)` | either | Modulates volume on a slow, organic curve. Presets:`fast`, `default`, `slow`, `slower`. Modifiers: `counter`/`inverse` (inverted curve, for two tracks that should never peak together), `soft` (gentler swing), `lifted` (biased toward louder), `bridge`/`transition` (peaks only where a normal and inverted wave cross, for a track that swells briefly between two others) |
| `duck(ref)`                  | track  | Quiets this track whenever the referenced track (by number or`label`) has signal                                                                                                                                                                                                                                                                                                |
| `repeat(n)` / `clone(n)`     | clip   | Reuses the*n*th clip already chosen in this track                                                                                                                                                                                                                                                                                                                               |

## A Complete Recipe: Anchored for the Night

A Voices recipe, start to finish. Four tracks: a night bed that sets the length, a dock creak that repeats the same recording, a train that comes once if at all, and two bursts of radio chatter. Almost everything here is silence and volume.

```json5
{
  tracks: [
    {
      // crickets and frogs - sets the mix length; no loop, no modulation, just settled presence
      label: 'night',
      volume: 100,
      effects: ['trim'],
      clips: [
        {
          classification: 'environmental',
          tags: ['crickets', 'frogs', 'night', 'cicadas'],
          length: ['long', 'huge'],
          effects: ['norm'],
        }
      ]
    },
    {
      // dock creak - tied to one structure, so it repeats the same recording all night
      label: 'dock',
      volume: 40,
      effects: ['loop'],
      clips: [
        { classification: 'silence', length: ['medium', 'long'] },
        {
          classification: 'effect',
          tags: ['dock', 'creak', 'wood', 'waves', 'wake', 'boats'],
          length: ['tiny', 'short'],
          effects: ['norm'],
        },
        { classification: 'silence', length: ['medium', 'long'] },
        {
          // same creak as above, not a fresh draw
          classification: 'effect',
          effects: ['repeat(2)'],
        },
        { classification: 'silence', length: ['medium', 'long'] },
      ]
    },
    {
      // a distant train - once, maybe, then gone; no loop, doesn't need to fill the mix
      label: 'train',
      volume: 35,
      clips: [
        { classification: 'silence', length: ['medium', 'long', 'huge'] },
        {
          classification: ['environmental', 'atmospheric'],
          tags: ['train', 'distant', 'traffic'],
          length: ['short', 'medium'],
          effects: ['norm', 'faraway'],
        }
      ]
    },
    {
      // VHF chatter - a couple of bursts, radio-filtered, then quiet for good
      label: 'radio',
      volume: 30,
      clips: [
        { classification: 'silence', length: ['medium', 'long'] },
        {
          classification: ['archival', 'spoken', 'effect'],
          tags: ['VHF', 'marine-radio', 'radio', 'chatter'],
          length: ['tiny', 'short'],
          effects: ['norm(voice)', 'telephone'],
        },
        { classification: 'silence', length: ['medium', 'long'] },
        {
          classification: ['archival', 'spoken', 'effect'],
          tags: ['VHF', 'marine-radio', 'radio', 'chatter'],
          length: ['tiny', 'short'],
          effects: ['norm(voice)', 'telephone'],
        }
      ]
    },
  ]
}
```

## Not Yet Implemented

`crossfade` and `detune` appear in the recipe grammar but don't do anything yet. Recipes that use them won't behave as their names suggest.

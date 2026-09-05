# How to Construct a Drift Recipe

## A Recipe Is Not a List of Ingredients

Contributors write recipes — blueprints, in JSON5, that describe the
structure of a mix. Each one specifies tracks, and each track specifies
clips, and each clip carries a handful of attributes: what kind of sound it
is, roughly what it should feel like, how long it runs. The system matches
those attributes against the library and assembles something coherent. That
description undersells, in one important way, what "matches... against"
actually means — and the fastest way there is a metaphor most people
already carry around without knowing it applies here.

Every home cook already understands this kind of recipe, just not by that
name. A recipe for roast chicken calls for "an acid," and one cook reaches
for lemon, another for vinegar, a third for a splash of white wine — the
bird comes out a little different every time without ceasing to be the same
recipe, correctly followed. A recipe for chocolate chip cookies survives
being made with butterscotch chips, or a chopped-up candy bar, or raisins
in a pinch, because what it actually specifies was never "Nestlé
semi-sweet morsels" — it's a role: something sweet, something with a bit
of body, scattered through the dough. Buttermilk pancakes still work with a
spoon of vinegar stirred into regular milk, because what the recipe needs
from buttermilk was never the buttermilk itself, only the acid it brings
to react with the baking soda. Whoever wrote the recipe down had one
particular bottle in their kitchen. What they wrote down, if it's a good
recipe, was never that specific.

A drift recipe works the same way, formalized. Writing one, you are not
naming which exact audio file plays in a given slot — you're specifying a
*role*: a classification (which aisle of the pantry you're allowed to shop
from — produce, dairy, spice), a rough sense of what you'd like it to taste
of (tags — the brand you happened to have in mind), and how much of it
(length). The system shops that aisle and hands back something that fits
the role, leaning toward your stated preference but never limited to it.
Understood this way, "why didn't my recipe produce the mix I had in my
head?" is a bit like asking why the roast chicken tasted different the day
you reached for vinegar instead of a lemon. It isn't a malfunction. It's
what a recipe — any recipe, digital or otherwise — actually is.

## The Circus You Didn't Build

Say you want to build a recipe called "Rainy Day Circus." You have a specific
sound in your head: calliope music heard through canvas, rain on a tent roof,
a distant ringmaster, the murmur of a crowd. You write five tracks. You tag
the music track with `circus`, `calliope`, `carnival`, `brass-band`. You tag
the rain track with `rain`, `storm`, `downpour`, `thunder`. You tag the
announcements track with `ringmaster`, `PA`, `intercom`. You listen to the
first mix it generates, and it sounds like what you imagined. You listen to
the tenth, and the "circus" music is a solo piano nocturne, the "rain" is
cicadas at dusk, and the "ringmaster" is a burst of shortwave static.

Nothing broke. This is the recipe working exactly as designed.

The mistake — an easy one, and worth naming before anything else in this
manual — is treating a recipe as a description of the mix you have in mind.
It isn't. A recipe describes a *space of possible mixes*, and the mix you
imagined when you wrote it is one point somewhere inside that space, not a
blueprint the system is trying to reproduce. Learning to write recipes well
means learning to think in terms of the shape of that space, not the point
you started from — to ask not "will this produce my circus?" but "what is
the full range of things this could produce, and do I want all of them?"

This manual is an attempt to make that space visible: how a recipe is built,
what its parts actually control, and — critically — which parts constrain
the outcome and which parts merely lean on it.

## Anatomy of a Recipe

A recipe is a JSON5 document (JSON, but forgiving — unquoted keys, trailing
commas, comments) describing a **list of tracks**. Tracks are the parallel
layers of a mix — they play simultaneously, mixed together at the end.
Within a track is a **list of clips** — these play in sequence, one after
another, concatenated into that track's timeline.

Here is the smallest recipe that does something interesting:

```json5
{
  tracks: [
    {
      // The music bed — this track's length sets the length of the mix
      effects: ["trim"],
      volume: 60,
      clips: [
        {
          classification: ["instrumental"],
          tags: ["ambient", "drone"],
          length: ["long"],
          effects: ["norm(musicbed)"],
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

Two tracks, layered. The first plays one long instrumental clip and sets the
overall mix duration (`trim`). The second alternates silence and short
spoken fragments, looping for as long as the mix runs, sounding distant
(`faraway`) as if drifting in from another room. Every field here — what a
clip is allowed to be, how long it runs, what happens to it sonically —
is a lever. The next section is about which of those levers actually
narrow the outcome, and which ones just tilt the odds.

## The Fence and the Nudge

Every clip slot in a recipe carries up to four kinds of criteria:
`classification`, `tags`, `length`, and `effects`. It is tempting to read
all of them as filters — a checklist the system searches the library
against. Only two of them are. The other two are something closer to a
recommendation.

**`classification` is a fence.** It's a hard filter against the audio
library's `classification` field — Ambient, Environmental, Instrumental,
Archival, Effect, and so on (the full list follows below). A
clip slot asking for `classification: ["environmental"]` will *only* ever
be filled from clips tagged `environmental` in the library. Nothing outside
that fence gets in, no matter what else the slot says.

**`length` is a fence too.** It restricts the pool to clips falling in a
named duration bucket — `tiny` (0–10s), `short` (10s–2m), `medium` (2–5m),
`long` (5–10m), and so on. Ask for `["tiny", "short"]` and you'll get
nothing longer than two minutes.

**`tags`, on the other hand, are a nudge — not a fence at all.** They never
appear in the database query that builds the candidate pool. Once the pool
is built (everything matching classification and length), every candidate
in it is *scored*, and tag overlap is only two of four ingredients in that
score: how well a clip's tags match this specific slot's tags, and how well
they match the tags accumulated by everything already chosen elsewhere in
the mix (so the mix stays thematically coherent as it goes). The other two
ingredients have nothing to do with tags at all — how recently a clip was
used, and how often it's been used overall, both nudging the system toward
variety over repetition.

And even after scoring, the system doesn't just take the top result. It
sorts the whole pool by score, takes a slice off the top — the best-scoring
tenth of the pool, or twenty-five clips, whichever is larger — and picks
*uniformly at random* from that shortlist. A perfect tag match doesn't win;
it just buys a much better chance of making the cut.

Put plainly: **`classification` and `length` decide what's possible. `tags`
only decide what's more likely, and even "more likely" is a coin flip among
a couple dozen finalists.** A recipe author writing `tags: ["circus",
"calliope", "carnival"]` on a slot classified `instrumental` hasn't asked
for circus music. They've asked for *any instrumental track in the library*,
with circus-flavored ones getting better odds of making the shortlist — odds
that mean very little if the library's circus-tagged instrumentals are thin
and everything else in the `instrumental` classification is just as eligible
to fill the remaining shortlist seats.

This is exactly what happened to "Rainy Day Circus." Its music track is
fenced to `instrumental`/`vocalmusic` and nudged toward circus and brass-band
tags — so on a night when few circus-tagged tracks are queued up, the
shortlist fills out with whatever other instrumental music is on deck, and a
solo piano nocturne gets picked. Its rain track is fenced to `environmental`
and nudged toward storm tags — so cicadas or dawn birdsong, both squarely
`environmental`, are always in the running. Its announcements track is
fenced to `archival` and nudged toward PA/ringmaster tags — so any archival
speech, including a burst of shortwave static tagged only loosely toward
`voice-over`, can surface in its place. None of this is a bug in the recipe.
It's what "loose constraints" means, mechanically, and it's the entire
reason the same recipe never produces the same mix twice.

The practical upshot: **write `classification` and `length` to describe the
outer boundary of what you'd be happy to hear. Write `tags` to describe your
ideal, knowing they're a thumb on the scale, not a lock on the door.** If a
particular sound is truly non-negotiable, the only lever with that kind of
power is `classification` — and the library rarely has a classification
narrow enough to guarantee any one specific timbre. Loose is the point.

## Classification, From the Contributor's Side

This isn't invented for this manual — it's the same instruction shown to
every contributor uploading a clip. Next to the classification field, the
upload form reads: *"A broad category that describes the broad type of
audio. Pro-tip: Use as few classifications as applicable."* Contributors
are actively discouraged from stacking classifications onto a clip, and
that discipline is what makes the fence mean something. A clip classified
only `Environmental` sits squarely inside every `environmental` slot in
every recipe in the library; a clip carelessly classified `Environmental,
Instrumental, Effect` sits inside three fences at once, diluting all of
them a little. Writing a recipe's `classification` filter means relying on
that upstream discipline — the tightness of your fence is only as real as
the restraint contributors showed when they classified the clip that ends
up filling it.

The full set, matched case-insensitively: `Ambient`, `Atmospheric`,
`Environmental`, `Premixed`, `Soundscape`, `Archival`, `Spoken`,
`Narrative`, `Instructional`, `VocalMusic`, `Instrumental`,
`Experimental`, `Digital`, `Effect`, `Other`.

## Tags Are a Folksonomy

Classification is a controlled vocabulary — fifteen options, fixed by the
system's designers, meant to be applied sparingly. Tags are the opposite:
a folksonomy, free-form words contributors attach themselves, as many as
they like, with no shared list to draw from. The upload form's guidance
for the tags field is correspondingly different: *"Describe the topic,
theme, or texture of the audio, such as 'thunderstorm', 'lo fi',
'haunting', 'E#m key', or '100 bpm'. Use tags to highlight specific
elements or moods in your audio. Separate tags with commas. Pro-tip: Use
as many simple tags as you can think of."* Where classification asks for
restraint, tags ask for abundance — the more angles a contributor tags a
clip from, the more scoring hooks it has to be found by later.

The same advice holds, almost word for word, when you're the one writing
a recipe rather than uploading a clip. A slot's `tags` array is competing
for a clip's attention against every synonym, misspelling, and adjacent
mood someone might have reached for instead of the word that came to you
first. "Rainy Day Circus" tagging its rain track with just `["rain"]`
would narrow its own odds for no reason; tagging it `["rain", "storm",
"precipitation", "downpour", "drizzle", "thunder", "thunderstorm"]` —
which is what the actual recipe does — casts a wide net across however
differently contributors happened to describe their own storm recordings.
This doesn't turn a nudge into a fence; nothing does. But it's the one
lever you actually have for narrowing the gap between the mix in your
head and the shortlist the system draws from — use as many tags and
synonyms as you can think of, the same pro-tip given to every contributor,
for the same reason.

## Silence as Material

A clip slot can also ask for `classification: "silence"`, which generates
actual silence of a given length rather than pulling anything from the
library. This isn't a fallback for when nothing else fits — it's a
compositional tool in its own right. Interspersing silence between spoken
or musical clips (as in the minimal example above, and in every track of
"Rainy Day Circus" except the music bed itself) is what keeps a track from
feeling like a wall of sound: pauses, breathing room, the sense that
something is arriving from a distance rather than simply always being
there. A track that's all clips and no silence tends to feel dense and
mechanical; a track built from short fragments separated by generous
silence tends to feel like something overheard.

## What Effects Actually Do

Effects are strings, optionally carrying parameters in parentheses —
`"trim"`, `"norm(voice)"`, `"wave(slow, lifted)"`. They can be attached to
a whole track (applied to that track's full timeline) or to an individual
clip (applied only while that clip plays), and a slot can carry more than
one. One detail worth knowing before writing any: **effects are not applied
in the order you list them.** They're reordered internally into a fixed
priority — structural effects first (`trim`, `loop`, `fadeout`), then
loudness normalization, then volume, then distance/coloration effects
(`backward`, `faraway`, `telephone`), then movement effects (`wave`,
`duck`) last. Writing `["wave(slow)", "norm(voice)"]` and `["norm(voice)",
"wave(slow)"]` produce the identical filter chain. This matters because
several of these effects only make sense applied in that order (normalizing
loudness before shaping it with a slow volume wave, for instance) — the
system enforces the sensible order for you, so don't fight it by trying to
sequence effects yourself.

| Effect | Scope | What it does |
|---|---|---|
| `trim` | track | Marks this track as the one whose length sets the whole mix's length. (Alternatives: `first`, `shortest`, `longest` — pick the mix length from a different rule.) |
| `norm(preset)` | either | Loudness-normalizes the audio. Presets: `voice`/`spoken` and `music` (foreground level), `bed`/`musicbed` (background level, quieter). No preset falls back to the foreground level. |
| `volume(n)` | either | Sets gain as a percentage, `0`–`100`+. (Also settable as a plain `volume:` field on a track or clip, which is equivalent.) |
| `loop` | either | Loops the clip or track indefinitely (or `loop(n)` for a fixed number of repeats) to fill whatever the mix's total duration turns out to be. |
| `fadeout(seconds)` | either | Fades out over the given number of seconds (default 3) at the end. |
| `backward` / `reverse` | either | Reverses the audio. |
| `faraway` / `distant` | either | Muffles the audio as if heard from another room — a lowpass filter plus a touch of reverb. Add the modifier `vol` (`faraway(vol)`) to also drop the level. |
| `telephone` / `phone` | either | Band-limits and lightly distorts the audio to sound like it's coming through an old telephone line. |
| `wave(preset, modifiers...)` | either | Modulates volume over time using a slow, organic (coherent-noise) curve rather than a fixed level — the effect responsible for a track breathing in and out rather than sitting static. Presets: `fast`, `default`, `slow`, `slower` (period, fast to glacial). Modifiers: `counter`/`inverse` (invert the curve — useful for two tracks that should never peak together), `soft` (gentler swing), `lifted` (biased toward louder), `bridge`/`transition` (peaks only where a normal and inverted wave would cross — useful for a track that should swell briefly between two others). |
| `duck(ref)` | track | Automatically quiets this track whenever the referenced track (by number or `label:`) has signal — the classic "music ducks under the announcer" behavior. |

Two effects — `detune` and `crossfade` — appear in the recipe grammar but
are not currently implemented; recipes referencing them will not behave as
their names suggest. Don't rely on them yet.

## Repetition

A clip slot's effects can include `repeat(n)` (or `clone(n)`) to reuse the
*n*th clip already selected earlier in the same track, rather than drawing
a fresh one from the library. This is how a recipe creates a callback —
the same voice returning later in a track, the same musical phrase
recurring — without hardcoding a specific clip ID.

## Writing for the Space, Not the Point

None of this means specificity is wasted effort — tags matter, they're
real weight on real odds, and a recipe with careful, well-chosen tags will
converge on its intended feeling far more often than one without. But it
means the right question while drafting a recipe is never "does this
produce the mix I'm hearing in my head?" It's "if I ran this a hundred
times, would I be glad to hear all hundred results?" A recipe with a wide
`classification` fence and thin, generic tags produces something closer to
chaos. A recipe with a narrow fence and rich tags produces something close
to control, but sacrifices exactly the quality — discovery, surprise, the
sense of a mix arriving rather than being assembled — that makes this
system worth building in the first place. The craft of recipe-writing is
finding the setting between those two poles where the surprises still
belong to the piece.

That's what happened with "Rainy Day Circus," and it's not a cautionary
tale. The recipe was never really about a circus. It was about rain heard
from somewhere warm and enclosed, with distant music and distant voices
drifting through the walls — and every one of its outcomes, calliope or
piano, storm or cicadas, ringmaster or static, is a true answer to that
question, even the ones its author never pictured.

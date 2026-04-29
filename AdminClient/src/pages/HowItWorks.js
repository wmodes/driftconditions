import React from 'react';
import FeatherIcon from 'feather-icons-react';

const HowItWorks = () => {
    return (
      <div className="profile-edit-wrapper">
        <div className="homepage-box-wrapper">
          <div className="homepage-box">

            <h2 className='title'><FeatherIcon icon="settings" />&nbsp;how it works</h2>

            <div className="newspaper-columns">

              <section className='minor-section keep-together'>
                <h3 className='title'>The Accident</h3>
                <p>
                  Late one night in the early oughts, I was driving home from my radio show in my old truck — a late-night collage of music, story, and found sound, something like <i>This American Life</i> on a late drive with a good friend — when I stumbled across something strange on the dial. Someone was layering a sermon with BBC news, lacing it with static, the whole thing drifting in and out. I pulled over on a dark mountain highway to listen. When I lost the signal, I tried to tune back in, and discovered I'd been parked between two stations the whole time, and the gorgeous mix had been an accident. That's when I asked: if something this beautiful can happen by accident, can I make it happen on purpose?
                </p>
              </section>

              <figure>
                <img src="/img/figures/sutulo-old-radio-3810392.jpg" alt="Close-up of a vintage shortwave radio dial showing station names including BBC, Normandy, and N. America, with a red tuning needle against a dark background" />
                <figcaption>Shortwave radio by <a href="https://pixabay.com/users/sutulo-3073859/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=3810392">sutulo</a> from Pixabay</figcaption>
              </figure>

              <section className='minor-section keep-together'>
                <h3 className='title'>Organized Chaos</h3>
                <p>
                  DriftConditions is built around one idea: that a system given the right materials and rules can generate something that feels discovered rather than made. The content is contributed by people, but the experience is conjured by the machine. Every session is assembled fresh — different clips, different combinations, different collisions. And then it's gone. Nothing is recorded. The mix you're hearing will never be heard again — not by you, not by anyone, not even by the system that just made it. That's not a limitation. It's the point. Like the radio it grew out of, the work happens in the moment of its tuning.
                </p>
              </section>

              <section className='minor-section keep-together'>
                <h3 className='title'>The Lineage</h3>
                <p>
                  The idea has ancestors. The Dadaists were the first to show that cutting and recombining could reveal something truer than intention — that randomness, given the right materials, produces meaning. Burroughs took the cut-up into language: fold the newspaper, cut the sentence, find what was already there. Bowie used a randomizer. Cobain cut up his own lyrics. Cage found music in found sound and silence. DriftConditions works in that tradition, with one difference: where they made objects — songs, poems, collages you could hold — this makes a process. Not an object but a system for generating a soundscape — running continuously, like radio — producing sessions that exist once and dissolve.
                </p>
              </section>

              <figure>
                <img src="/img/figures/john-cage-1.jpg" alt="John Cage crouched over electronic equipment, surrounded by a web of wires, in a black and white photograph" />
                <figcaption>John Cage at the inauguration of the National Foundation for the Arts, Washington DC, 1966. Photo: Rowland Scherman / Getty Images</figcaption>
              </figure>

              <section className='minor-section keep-together'>
                <h3 className='title'>The Drift</h3>
                <p>
                  That sense of something new emerging from unlikely combinations — a voice you don't recognize over a sound you almost do — has to do with more than which clips are chosen. Layered over everything, coherent noise breathes. Something like Perlin Noise simulated with a harmonic cascade, a technique borrowed from computer graphics: instead of random values that jump unpredictably, it generates smooth, continuous, non-repeating curves — values that drift through their range the way weather does. Each track carries its own noise field running at its own frequency and phase, modulating volume, triggering and releasing effects, shaping the texture over time. The curves drift. They wander. This is the dérive at the system level — not a planned path through the material, but a meander through possibility space, drawn by the shape of the terrain. The noise doesn't know where it's going. Neither does the mix. The result feels less like playback and more like something happening right now, for the first time, the way a signal sounds when it's drifting just at the edge of reception.
                </p>
              </section>

              <figure>
                <img src="/img/figures/harmonic-cascade.png" alt="Mathematical visualization of harmonic cascade coherent noise functions, showing multiple colored waveform curves against a dark background" />
                <figcaption>Harmonic cascade simulating coherent noise to control the amplitude of a clip or track.</figcaption>
              </figure>

              <section className='minor-section keep-together'>
                <h3 className='title'>The Contributors</h3>
                <p>
                  The station runs on what people bring to it — field recordings from lonely roadsides, archival fragments, shortwave ghosts, church sermons from thrift-store cassettes, rainstorms, room tones, overheard voices, beautiful wreckage of every kind. Once a clip enters the library, it slips its maker's hands. It drifts into combinations its creator didn't choose, plays alongside sounds they've never heard, settles into mixes that belong to no one in particular. What returns is stranger than what was given — a fragment of cassette hiss carried into a stranger's late night, a voice from 1962 surfacing under rain, the contributor's small offering remade into something they couldn't have built alone. What is it then — a station, a séance, a chorus? Not a thing made but a thing happening. Not yours, not mine, not anyone's, and stronger for it.
                </p>
              </section>

              <figure>
                <img src="/img/figures/driftconditions-clip.png" alt="DriftConditions admin interface showing audio clip details including waveform, classification tags, and metadata for a shortwave numbers station recording" />
                <figcaption>A sample audio clip submitted by a user.</figcaption>
              </figure>

              <section className='minor-section keep-together'>
                <h3 className='title'>The Recipes</h3>
                <p>
                  Contributors also write recipes: blueprints in JSON5 format that describe the structure of a mix. Each recipe contains multiple tracks; each track specifies one or more clips along with attributes — type, tags, length, and effects. The system draws from the library, matching clips against the recipe's loose constraints and assembling them into something coherent. No two sessions are alike, but they hang together — the way a late-night radio show does, even when it's strange.
                </p>
              </section>

              <figure>
                <img src="/img/figures/driftconditions-recipe-detail.png" alt="DriftConditions recipe editor showing JSON5 code defining multiple tracks including a sermon, a newscast, and a bridge static interference track" />
                <figcaption>A sample recipe written in JSON5 format specifies the details of each track and clip including type, tags, length, and effects.</figcaption>
              </figure>

              <section className='minor-section keep-together'>
                <h3 className='title'>The MixEngine</h3>
                <p>
                  A server runs quietly in the background. A separate admin interface lets contributors upload audio, manage clips, and write recipes. But the MixEngine is the heart of the system. It reads a recipe, selects clips from the database, applies effects, and renders a mix. A streaming component takes those mixes and assembles them into the continuous feed you're hearing. The whole thing is a small conspiracy of parts that have never met — the contributor uploading at noon, the recipe written months ago, the clip recorded on a porch in 2014, the listener tuning in tonight. Somewhere in their brief overlap, the station happens.
                </p>
              </section>

              <figure>
                <img src="/img/figures/mixing-console.webp" alt="Professional mixing console with illuminated faders, knobs, and channel strips" />
                <figcaption>Somewhere between these moving parts, the station finds its sound.</figcaption>
              </figure>

              <section className='minor-section keep-together'>
                <p>
                  DriftConditions is an attempt to make a beautiful accident on purpose — and to leave enough space for more beautiful accidents.
                </p>
              </section>

            </div>
          </div>
        </div>
      </div>
    );
}

export default HowItWorks;

import React from 'react';
import { Link } from 'react-router-dom';
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
                  Late one night in the early oughts, I was driving home from my radio show — a late-night aural collage of music, story, and found sound — when I stumbled across something strange on the dial. Someone was layering a sermon with BBC news, lacing it with static, the whole thing drifting in and out. I pulled over on a dark mountain highway to listen. Eventually I lost the signal. When I tuned back in, I realized I'd been parked between two stations the whole time, and the gorgeous mess had been an accident. That's when I asked: if something this beautiful can happen by accident, can you make it happen on purpose?
                </p>
              </section>

              <section className='minor-section keep-together'>
                <h3 className='title'>Organized Chaos</h3>
                <p>
                  DriftConditions is built around one idea: that a system given the right materials and rules can generate something that feels discovered rather than made. Every session is assembled fresh — different clips, different combinations, different collisions. The content is contributed by people, but the experience is conjured by the machine. The boundary between intention and accident is exactly where we want to be.
                </p>
              </section>

              <figure>
                <img src="/img/figures/sample-audio.png" alt="A sample audio clip" />
                <figcaption>A sample audio clip submitted by a user.</figcaption>
              </figure>

              <section className='minor-section keep-together'>
                <h3 className='title'>The Blueprints</h3>
                <p>
                  Contributors write recipes: blueprints in JSON5 format that describe the structure of a mix. Each recipe contains multiple tracks; each track specifies one or more clips along with attributes like type, tags, length, and effects. The system draws from thousands of user-contributed clips — ranging from a few seconds to over an hour — pulling matches from the library and assembling them into something coherent. No two sessions are alike, but they hang together — the way a late-night radio show does, even when it's strange.
                </p>
              </section>

              <figure>
                <img src="/img/figures/sample-recipe.png" alt="A sample recipe" />
                <figcaption>A sample recipe written in JSON5 format specifies the details of each track and clip including type, tags, length, and effects.</figcaption>
              </figure>

              <section className='minor-section keep-together'>
                <h3 className='title'>Under the Hood</h3>
                <p>
                  The MixEngine is the heart of the system. It reads a recipe, selects clips from the database, applies effects, and renders a mix. A streaming component takes those mixes and assembles them into the continuous feed you're hearing. A separate admin interface — the one you're in right now — lets contributors upload audio, manage clips, and write and edit recipes. Somewhere between these moving parts, the station finds its sound.
                </p>
              </section>

              <figure>
                <img src="/img/figures/mixing-console.webp" alt="Mixing console" />
                <figcaption>MixEngine dynamically combines user-contributed audio clips, recipes, and effects to create a seamless and ever-evolving audio stream.</figcaption>
              </figure>

              <section className='minor-section keep-together'>
                <h3 className='title'>The Drift</h3>
                <p>
                  That sense of something new emerging from unlikely combinations — a voice you don't recognize over a sound you almost do — that's the heart of it. The system pulls clips from across the library, matches them against the recipe's loose constraints, and layers them into something none of the contributors could have predicted. And layered over all of it, coherent noise — borrowed from computer graphics — breathes life into the mix, modulating volume, triggering and releasing effects, shaping the texture of each track over time. The result feels less like playback and more like something happening right now, for the first time — the way a signal sounds when it's drifting just at the edge of reception.
                </p>
              </section>

              <figure>
                <img src="/img/figures/noise-graphs.png" alt="Graph of harmonic cascade" />
                <figcaption>Harmonic cascade simulating coherent noise to control the amplitude of a clip or track.</figcaption>
              </figure>

              <section className='minor-section keep-together'>
                <h3 className='title'>Join In</h3>
                <p>
                  The station runs on what people bring to it. If you have audio that might fit — field recordings, spoken word, found sound, ambient texture — we'd love to hear from you. <Link className="link" to="/signup">Sign up for an account</Link> and reach out to let us know you'd like to contribute. Once we've set you up, you can upload clips and start contributing to the library. We ask that everything be free of copyright you don't hold — public domain, Creative Commons, or your own original work. The station lives in that space where interesting things happen, and we'd like to keep it there.
                </p>
              </section>

            </div>
          </div>
        </div>
      </div>
    );
}

export default HowItWorks;

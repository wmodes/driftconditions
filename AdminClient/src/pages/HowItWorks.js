import React from 'react';
import FeatherIcon from 'feather-icons-react';

const HowItWorks = () => {
    return (
      <div className="profile-edit-wrapper">
        <div className="homepage-box-wrapper">
          <div className="homepage-box">

            <h2 className='title'><FeatherIcon icon="settings" />&nbsp;how it works</h2>

            <div className="newspaper-columns">

              <section>
                <h3 className='title'>Welcome to an Immersive Auditory Experience</h3>
                <p>
                  Welcome to an immersive auditory experience that captures the chaos and serendipity of late-night radio tuning. Imagine stumbling upon a hidden world of overlapping fragmented stories, ambient sounds, and mysterious crosstalk, where each listening session offers a fresh journey through an evocative and unpredictable sonic landscape.
                </p>
              </section>

              <section>
                <h3 className='title'>The Magic of Procedural Generation</h3>
                <p>
                  The magic lies in its ability to generate this unique experience on the fly, relying on a sophisticated system that combines human creativity with algorithmic precision. Behind the scenes, users can contribute and edit audio recipes. These recipes are like blueprints for the soundscapes you hear, specifying how different audio clips should be combined and processed.
                </p>
                <figure>
                  <img src="/img/figures/sample-audio.png" alt="A sample audio clip" />
                  <figcaption>A sample audio clip submitted by a user.</figcaption>
                </figure>
              </section>

              <section>
                <h3 className='title'>Creating the Audio Feed</h3>
                <p>
                  The real magic happens when these recipes are used to construct the audio feed. Picture a multi-track editing software where each track contains one or more clips. Attributes of each track and clip—such as classification, tags, and length—help the system pick clips that fit together harmoniously. This ensures that every broadcast is a seamless blend of sounds that loosely match the intended style and mood.
                </p>
                <figure>
                  <img src="/img/figures/sample-recipe.png" alt="A sample recipe" />
                  <figcaption>A sample recipe written in JSON5 format specifies the details of each track and clip including type, tags, length, and effects.</figcaption>
                </figure>
              </section>

              <section>
                <h3 className='title'>Ever-Evolving Soundscapes</h3>
                <p>
                  The system maintains its ever-evolving tapestry of audio by relying heavily on procedural generation. For instance, the name of each session, the hero image, and even the descriptive text on the homepage are generated anew each time you visit. This approach mirrors the unpredictability of real-world radio interference, where the boundaries between intention and happenstance blur, creating a dynamic and captivating listening experience.
                </p>
              </section>

              <section>
                <h3 className='title'>Dynamic Audio Effects</h3>
                <p>
                  As you listen, you might notice the audio stream fading in and out with different sources. This effect is achieved through a technique similar to Perlin noise, a type of coherent noise used in computer graphics to create natural-looking textures. This technique helps modulate various audio effects, creating a sound that is both unpredictable and harmoniously pleasing.
                </p>
                <figure>
                  <img src="/img/figures/harmonic-cascade.png" alt="Graph of harmonic cascade" />
                  <figcaption>Harmonic cascade simulating coherent noise to control the amplitude of a clip or track.</figcaption>
                </figure>
              </section>

              <section>
                <h3 className='title'>Behind the Scenes</h3>
                <p>
                  Several components work together to bring this experience to life. A user-friendly interface allows users to upload and manage clips, and create and edit recipes. A backend server supports these admin functions, ensuring smooth operation and content management. The real powerhouse, called the MixEngine, generates the audio mixes based on the recipes and randomly selected clips. Finally, a streaming component assembles these mixes into a continuous audio stream, delivering the seamless and immersive experience you enjoy.
                </p>
                <figure>
                  <img src="/img/figures/mixing-console.webp" alt="Mixing console" />
                  <figcaption>MixEngine dynamically combines user-contributed audio clips, recipes, and effects to create a seamless and ever-evolving audio stream.</figcaption>
                </figure>
              </section>

              <section>
                <h3 className='title'>User Contribution</h3>
                <p>
                  The station relies on user audio contributions. Do you have audio that you think would fit perfectly within the unique soundscape of the station? We welcome your contributions. By <a  className="link" href="https://driftconditions.org/signup">signing up for an account</a> and letting us know you would like to be a contributor, you can upload your own audio clips and participate in creating the ever-evolving auditory experience. Once you've signed up, <a className="link" target="_new" href="mailto:info@driftconditions.org?subject=please%20promote%20me%20to%20a%20contributor">reach out to us to get started.</a> Your input helps shape the dynamic and immersive environment that makes the station so special.
                </p>

                <p>
                  When submitting audio, we ask users to certify that their contributions contain no copyrighted works for which they do not have the right to use. We appreciate the use of public domain materials, creative commons licensed content, or other works for which users have clear rights. User contributions help enrich the station's unique soundscape while respecting the work of other artists.
                </p>
              </section>

              <section>
                <h3 className='title'>Join the Journey</h3>
                <p>
                  Every time you tune in, you embark on a new auditory journey. The overlapping stories, ambient sounds, and mysterious whispers create a rich and immersive listening experience that challenges traditional narrative structures. Whether you're seeking a soothing background ambiance or an intriguing auditory adventure, the station offers a unique and magical escape into a world of sound.
                </p>
              </section>

            </div>
          </div>
        </div>
      </div>

    );
}

export default HowItWorks;

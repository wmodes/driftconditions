// client/src/pages/PrivacyPolicy.js

import React from 'react';
import FeatherIcon from 'feather-icons-react';
import { Link } from 'react-router-dom';
import brand from '../brand/brand';

const PrivacyPolicy = () => {
  const projectName = brand.name;
  const contactEmail = brand.email.contact;

  return (
    <div className="profile-edit-wrapper">
      <div className="homepage-box-wrapper">
        <div className="homepage-box">

          <h2 className='title'><FeatherIcon icon="shield" />&nbsp;privacy policy</h2>

          <div className="newspaper-columns">

            <section className='minor-section keep-together'>
              <h3 className='title'>The Short Version</h3>
              <p>
                {projectName} is a small, independent art project. We collect the minimum needed to run the service.
                We don't sell your data, we don't run ads, and we don't track what you listen to.
              </p>
            </section>

            <section className='minor-section keep-together'>
              <h3 className='title'>What We Collect</h3>
              <p>
                If you create an account, we store your username, email address, and a hashed password.
                We never store your password in plain text.
              </p>
              <p>
                If you upload audio, we store the file and the metadata you provide (title, tags, classification).
                Uploaded content is attributed to your username and may be used in the stream.
              </p>
              <p>
                If you favorite a mix, we store that association with your account so you can find it again.
              </p>
            </section>

            <section className='minor-section keep-together'>
              <h3 className='title'>What We Don't Collect</h3>
              <p>
                We don't log or store what you listen to. There are no listening analytics, no playback history,
                and no tracking pixels. The stream is ephemeral by design — what you hear is assembled live and
                immediately gone.
              </p>
              <p>
                We don't use third-party advertising or analytics services.
              </p>
            </section>

            <section className='minor-section keep-together'>
              <h3 className='title'>Authentication</h3>
              <p>
                We use JSON Web Tokens (JWT) to manage sessions. The token is stored locally in your browser
                or on your device and is sent with each authenticated request. We also support sign-in via
                Google, GitHub, and Discord. If you use one of these, we receive only the profile information
                those providers share (typically your name and email). We do not receive your password from them.
              </p>
            </section>

            <section className='minor-section keep-together'>
              <h3 className='title'>Mobile App</h3>
              <p>
                The {projectName} iOS app streams audio and optionally casts to devices on your local network
                via Google Cast. Cast device discovery uses your local network only — no data about your network
                or devices is sent to our servers. The app requests local network access solely for this purpose.
              </p>
            </section>

            <section className='minor-section keep-together'>
              <h3 className='title'>Data Retention</h3>
              <p>
                Your account and uploaded content persist until you request deletion. To delete your account
                or remove uploaded audio, contact us at{' '}
                <a className="link" href={`mailto:${contactEmail}`}>{contactEmail}</a>.
              </p>
            </section>

            <section className='minor-section keep-together'>
              <h3 className='title'>Contact</h3>
              <p>
                Questions about this policy? Reach us at{' '}
                <a className="link" href={`mailto:${contactEmail}`}>{contactEmail}</a>.
              </p>
              <p>
                <Link className="link" to="/">← Back to {projectName}</Link>
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

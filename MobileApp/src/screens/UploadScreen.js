import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Image, Alert,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { getToken } from '../utils/authUtils';
import config from '../config';

const CLASSIFICATIONS = [
  'Ambient', 'Atmospheric', 'Environmental', 'Premixed', 'Soundscape',
  'Archival', 'Spoken', 'Narrative', 'Instructional', 'VocalMusic',
  'Instrumental', 'Experimental', 'Digital', 'Effect', 'Other',
];

function generateTitle(filename) {
  const stem = filename.replace(/\.[^/.]+$/, '');
  const isAllUpper = stem === stem.toUpperCase() && /[A-Z]/.test(stem);
  let title = stem.replace(/_/g, ' ');
  title = title.replace(/[^\w\s,'/()-]+/g, ' ');
  title = title.trim().replace(/\s+/g, ' ');
  if (isAllUpper) {
    title = title.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }
  return title.replace(/\s{2,}/g, ' ').trim();
}

function normalizeTag(tag) {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[\W_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}


export default function UploadScreen({ onBack, incomingFile }) {
  const [audioFile, setAudioFile]           = useState(incomingFile || null);
  const [title, setTitle]                   = useState(incomingFile ? generateTitle(incomingFile.name) : '');
  const [classification, setClassification] = useState([]);
  const [tags, setTags]                     = useState([]);
  const [tagInput, setTagInput]             = useState('');
  const [coverImage, setCoverImage]         = useState(null);
  const [comments, setComments]             = useState('');
  const [copyrightCert, setCopyrightCert]   = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);

  // If a new file is shared while screen is already mounted, update state
  useEffect(() => {
    if (incomingFile) {
      setAudioFile(incomingFile);
      setTitle(generateTitle(incomingFile.name));
    }
  }, [incomingFile]);

  const isValid = audioFile && title.trim() && classification.length > 0 && tags.length > 0 && copyrightCert;
  const isDirty = audioFile || title || classification.length > 0 || tags.length > 0 || comments;

  const handleBack = () => {
    if (!isDirty) { onBack(); return; }
    Alert.alert(
      'Discard upload?',
      'You have unsaved changes. Are you sure you want to go back?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onBack },
      ]
    );
  };

  const commitTag = (text) => {
    const normalized = normalizeTag(text);
    if (normalized && !tags.includes(normalized)) {
      setTags(prev => [...prev, normalized]);
    }
    setTagInput('');
  };

  const handleTagInput = (text) => {
    if (text.endsWith(',')) {
      commitTag(text.slice(0, -1));
    } else {
      setTagInput(text);
    }
  };

  const removeTag = (tag) => setTags(prev => prev.filter(t => t !== tag));

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.audio],
        copyTo: 'cachesDirectory',  // gives fileCopyUri — required for upload on iOS
      });
      setAudioFile(result);
      if (!title) setTitle(generateTitle(result.name || ''));
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) setError('Could not pick audio file.');
    }
  };

  const pickCoverImage = async () => {
    try {
      const response = await launchImageLibrary({ mediaType: 'photo', quality: 0.9 });
      if (!response.didCancel && response.assets?.[0]) {
        setCoverImage(response.assets[0]);
      }
    } catch {
      // user cancelled or picker unavailable
    }
  };

  const toggleClassification = (val) => {
    setClassification(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    );
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();

      const formData = new FormData();
      formData.append('file', {
        uri: audioFile.fileCopyUri || audioFile.uri,
        name: audioFile.name,
        type: audioFile.type || 'audio/mpeg',
      });
      formData.append('title', title.trim());
      formData.append('status', 'Review');
      formData.append('classification', JSON.stringify(classification.map(c => c.toLowerCase())));
      formData.append('tags', JSON.stringify(tags));
      formData.append('comments', comments.trim());
      formData.append('copyrightCert', '1');

      const res = await fetch(`${config.api.adminServer}/api/audio/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Upload failed.');

      // Upload cover image separately if one was chosen
      if (coverImage && json.audioID) {
        const coverData = new FormData();
        coverData.append('coverImage', {
          uri: coverImage.uri,
          name: coverImage.fileName || 'cover.jpg',
          type: coverImage.type || 'image/jpeg',
        });
        await fetch(`${config.api.adminServer}/api/audio/cover/${json.audioID}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: coverData,
        });
      }

      Alert.alert(
        'Submitted!',
        'Your audio has been submitted for review. Thank you!',
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#336699" size="large" />
        <Text style={styles.loadingText}>Uploading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleBack} style={styles.navSide}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headingCenter}>
          <Text style={styles.headingIcon}>↑</Text>
          <Text style={styles.heading}>Upload</Text>
        </View>
        <View style={styles.navSide} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        {/* Audio file */}
        <Text style={styles.label}>Audio File <Text style={styles.required}>*</Text></Text>
        <TouchableOpacity style={styles.filePicker} onPress={pickAudio} activeOpacity={0.7}>
          <Text style={styles.filePickerText} numberOfLines={1}>
            {audioFile ? audioFile.name : 'Choose audio file…'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Supported: mp3, wav, ogg, flac, aiff, m4a</Text>

        {/* Title */}
        <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor="#555"
        />

        {/* Classification */}
        <Text style={styles.label}>Classification <Text style={styles.required}>*</Text></Text>
        <Text style={styles.hint}>Select at least one.</Text>
        <View style={styles.checkGrid}>
          {CLASSIFICATIONS.map(cls => {
            const selected = classification.includes(cls);
            return (
              <TouchableOpacity
                key={cls}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleClassification(cls)}
                activeOpacity={0.7}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{cls}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tags */}
        <Text style={styles.label}>Tags <Text style={styles.required}>*</Text></Text>
        {tags.length > 0 && (
          <View style={styles.tagPreview}>
            {tags.map(t => (
              <TouchableOpacity key={t} style={styles.tagPill} onPress={() => removeTag(t)} activeOpacity={0.7}>
                <Text style={styles.tagPillText}>{t} ×</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TextInput
          style={styles.input}
          value={tagInput}
          onChangeText={handleTagInput}
          onSubmitEditing={() => commitTag(tagInput)}
          placeholder="Type a tag, press comma or return…"
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <Text style={styles.hint}>Tap a tag to remove it.</Text>

        {/* Cover image */}
        <Text style={styles.label}>Cover Image</Text>
        <TouchableOpacity style={styles.coverPicker} onPress={pickCoverImage} activeOpacity={0.7}>
          {coverImage ? (
            <Image source={{ uri: coverImage.uri }} style={styles.coverPreview} resizeMode="cover" />
          ) : (
            <Text style={styles.coverPickerText}>Choose image…</Text>
          )}
        </TouchableOpacity>

        {/* Comments */}
        <Text style={styles.label}>Comments</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={comments}
          onChangeText={setComments}
          placeholder="Optional notes for the moderator"
          placeholderTextColor="#555"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Copyright */}
        <TouchableOpacity
          style={styles.copyrightRow}
          onPress={() => setCopyrightCert(v => !v)}
          activeOpacity={0.8}>
          <View style={[styles.checkbox, copyrightCert && styles.checkboxChecked]}>
            {copyrightCert ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.copyrightText}>
            I certify this contains no copyrighted works for which I do not have the right to use.{' '}
            <Text style={styles.required}>*</Text>
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid}
          activeOpacity={0.8}>
          <Text style={styles.submitBtnText}>Submit for Review</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  centered: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#888', fontSize: 15 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  navSide: { minWidth: 70 },
  backText: { color: '#336699', fontSize: 17 },
  headingCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headingIcon: { color: '#fff', fontSize: 24, fontWeight: '300' },
  heading: { color: '#fff', fontSize: 24, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { padding: 24 },

  label: { color: '#ccc', fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 18 },
  required: { color: '#c0392b' },
  hint: { color: '#555', fontSize: 12, marginTop: 4, marginBottom: 2 },

  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  textarea: { minHeight: 90, paddingTop: 12 },

  filePicker: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#336699',
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  filePickerText: { color: '#336699', fontSize: 15 },

  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1e1e1e',
  },
  chipSelected: { backgroundColor: '#336699', borderColor: '#336699' },
  chipText: { color: '#888', fontSize: 13 },
  chipTextSelected: { color: '#fff' },

  tagPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tagPill: { backgroundColor: '#336699', borderColor: '#336699', borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  tagPillText: { color: '#fff', fontSize: 13 },

  coverPicker: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverPreview: { width: 120, height: 120 },
  coverPickerText: { color: '#555', fontSize: 13 },

  copyrightRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 20, gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#336699', borderColor: '#336699' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  copyrightText: { color: '#aaa', fontSize: 13, flex: 1, lineHeight: 19 },

  error: { color: '#c0392b', fontSize: 13, marginTop: 16 },

  submitBtn: {
    backgroundColor: '#336699',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

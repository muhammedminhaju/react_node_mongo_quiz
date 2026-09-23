'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { loadSettings, saveSettings } from '@/lib/storage';
import { useToast } from '@/lib/useToast';

export default function SettingsPage() {
  const { message, showToast } = useToast();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function updateField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    const nextSettings = {
      ...settings,
      questionCount: Number(settings.questionCount) || 20
    };
    saveSettings(nextSettings);
    setSettings(nextSettings);
    document.body.classList.toggle('dark-mode', nextSettings.darkMode);
    showToast('Settings saved.');
  }

  if (!settings) {
    return (
      <AppShell title="Settings">
        <section className="content-card settings-card" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings">
      <section className="content-card settings-card">
        <div className="field-group">
          <label>Number of questions</label>
          <input
            type="number"
            min={5}
            max={500}
            disabled={settings.useAllQuestions}
            value={settings.questionCount}
            onChange={(event) => updateField('questionCount', event.target.value)}
          />
        </div>
        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={settings.useAllQuestions}
              onChange={(event) => updateField('useAllQuestions', event.target.checked)}
            />{' '}
            Use all available questions for the topic (ignores the number above)
          </label>
        </div>
        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={settings.shuffleQuestions}
              onChange={(event) => updateField('shuffleQuestions', event.target.checked)}
            />{' '}
            Shuffle questions
          </label>
        </div>
        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={settings.shuffleOptions}
              onChange={(event) => updateField('shuffleOptions', event.target.checked)}
            />{' '}
            Shuffle options
          </label>
        </div>
        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={settings.showExplanation}
              onChange={(event) => updateField('showExplanation', event.target.checked)}
            />{' '}
            Show explanation
          </label>
        </div>
        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(event) => updateField('darkMode', event.target.checked)}
            />{' '}
            Dark mode
          </label>
        </div>
        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={settings.confirmSubmit}
              onChange={(event) => updateField('confirmSubmit', event.target.checked)}
            />{' '}
            Confirm before submitting
          </label>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </section>

      <div className={`toast${message ? ' show' : ''}`}>{message}</div>
    </AppShell>
  );
}

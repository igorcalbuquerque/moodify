import { useState } from "react";
import { saveSetup, type SetupStatus } from "./api";
import type { Dict } from "./i18n";

/**
 * Operator setup screen. Lets whoever runs Moodify enter the Spotify app
 * credentials (and pick/configure the AI provider) from the browser — no
 * `.env` editing required. End users never see this once it's configured.
 */
export function Setup({
  status,
  onSaved,
  t,
}: {
  status: SetupStatus;
  onSaved: (next: SetupStatus) => void;
  t: Dict;
}) {
  const [spotifyClientId, setClientId] = useState("");
  const [spotifyClientSecret, setClientSecret] = useState("");
  const [provider, setProvider] = useState(status.ai.provider);
  const [anthropicApiKey, setAnthropicKey] = useState("");
  const [openaiApiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState(status.ai.openaiModel);
  const [ollamaModel, setOllamaModel] = useState(status.ai.ollamaModel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string> = { aiProvider: provider };
      if (spotifyClientId) payload.spotifyClientId = spotifyClientId;
      if (spotifyClientSecret) payload.spotifyClientSecret = spotifyClientSecret;
      if (provider === "anthropic" && anthropicApiKey) payload.anthropicApiKey = anthropicApiKey;
      if (provider === "openai") {
        if (openaiApiKey) payload.openaiApiKey = openaiApiKey;
        if (openaiModel) payload.openaiModel = openaiModel;
      }
      if (provider === "ollama" && ollamaModel) payload.ollamaModel = ollamaModel;

      const next = await saveSetup(payload);
      if (!next.configured) {
        setError(t.setupBothRequired);
      } else {
        onSaved(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errGeneric);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card setup">
      <h2>{t.setupTitle}</h2>
      <p className="muted">{t.setupIntro}</p>

      <div className="field">
        <span className="label">{t.setupStep1}</span>
        <p className="hint">
          {t.setupStep1Desc}
          <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
            {t.dashboardLinkLabel}
          </a>
          {t.setupStep1Tail}
        </p>
        <code className="redirect">{status.spotify.redirectUri}</code>
      </div>

      <label className="field">
        <span className="label">
          {t.clientIdLabel} {status.spotify.hasClientId && "✓"}
        </span>
        <input
          className="input"
          value={spotifyClientId}
          placeholder={status.spotify.hasClientId ? t.savedKeepBlank : ""}
          onChange={(e) => setClientId(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">
          {t.clientSecretLabel} {status.spotify.hasClientSecret && "✓"}
        </span>
        <input
          className="input"
          type="password"
          value={spotifyClientSecret}
          placeholder={status.spotify.hasClientSecret ? t.savedKeepBlank : ""}
          onChange={(e) => setClientSecret(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">{t.aiProviderLabel}</span>
        <select
          className="input"
          value={provider}
          onChange={(e) => setProvider(e.target.value as SetupStatus["ai"]["provider"])}
        >
          <option value="anthropic">Claude (Anthropic)</option>
          <option value="openai">OpenAI-compatible</option>
          <option value="ollama">Ollama (local)</option>
        </select>
      </label>

      {provider === "anthropic" && (
        <label className="field">
          <span className="label">
            {t.anthropicKeyLabel} {status.ai.hasAnthropicKey && "✓"} <em>{t.optionalTag}</em>
          </span>
          <input
            className="input"
            type="password"
            value={anthropicApiKey}
            placeholder={t.anthropicKeyPlaceholder}
            onChange={(e) => setAnthropicKey(e.target.value)}
          />
        </label>
      )}

      {provider === "openai" && (
        <>
          <label className="field">
            <span className="label">
              {t.openaiKeyLabel} {status.ai.hasOpenaiKey && "✓"}
            </span>
            <input
              className="input"
              type="password"
              value={openaiApiKey}
              placeholder={status.ai.hasOpenaiKey ? t.savedKeepBlank : "sk-..."}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">{t.openaiModelLabel}</span>
            <input className="input" value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} />
          </label>
        </>
      )}

      {provider === "ollama" && (
        <label className="field">
          <span className="label">{t.ollamaModelLabel}</span>
          <input className="input" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} />
        </label>
      )}

      {error && <div className="card error">{error}</div>}

      <button className="primary" onClick={handleSave} disabled={saving}>
        {saving ? t.saving : t.saveContinue}
      </button>
    </section>
  );
}

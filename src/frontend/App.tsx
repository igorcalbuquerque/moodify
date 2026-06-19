import { useEffect, useMemo, useState } from "react";
import {
  fetchProfile,
  fetchSetup,
  logout,
  createPlaylist,
  loadAiSettings,
  saveAiSettings,
  type AiClientSettings,
  type Profile,
  type PlaylistResult,
  type SetupStatus,
} from "./api";
import { Setup } from "./Setup";
import { dictionaries, detectLang, persistLang, type Dict, type Lang } from "./i18n";

export function App() {
  const [lang, setLang] = useState<Lang>(detectLang);
  const t = useMemo<Dict>(() => dictionaries[lang], [lang]);

  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [ai, setAi] = useState<AiClientSettings>(() => loadAiSettings("openai"));
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState<PlaylistResult | null>(null);
  // Auth errors are language-independent until render: store a code, resolve via `t`.
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const status = await fetchSetup();
        setSetup(status);
        if (status.configured) setProfile(await fetchProfile());
      } finally {
        setLoading(false);
      }
    })();

    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    if (authError) {
      setAuthErrorCode(authError);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  function toggleLang() {
    const next: Lang = lang === "en" ? "pt" : "en";
    persistLang(next);
    setLang(next);
  }

  const authError = authErrorCode
    ? authErrorCode === "not_configured"
      ? t.errNotConfigured
      : t.errSpotify(authErrorCode)
    : null;

  async function handleSetupSaved(next: SetupStatus) {
    setSetup(next);
    setAuthErrorCode(null);
    setProfile(await fetchProfile());
  }

  async function handleGenerate() {
    if (!prompt.trim() || building) return;
    setBuilding(true);
    setError(null);
    setResult(null);
    try {
      setResult(await createPlaylist(prompt, lang, ai));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errGeneric);
    } finally {
      setBuilding(false);
    }
  }

  function updateAi(patch: Partial<AiClientSettings>) {
    setAi((prev) => {
      const next = { ...prev, ...patch };
      saveAiSettings(next);
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    setProfile(null);
    setResult(null);
  }

  return (
    <main className="app">
      <header className="header">
        <div className="brand">
          <span className="logo" aria-hidden>🎧</span>
          <h1>Moodify</h1>
        </div>
        <div className="header-actions">
          <button className="ghost lang" onClick={toggleLang} aria-label="Switch language">
            {t.otherLangLabel}
          </button>
          {profile && (
            <button className="ghost" onClick={handleLogout}>
              {profile.image && <img src={profile.image} alt="" className="avatar" />}
              {t.signOut}
            </button>
          )}
        </div>
      </header>

      <p className="tagline">{t.tagline}</p>

      {loading ? (
        <div className="card muted">{t.loading}</div>
      ) : setup && !setup.configured ? (
        <>
          {authError && <div className="card error">{authError}</div>}
          <Setup status={setup} onSaved={handleSetupSaved} t={t} />
        </>
      ) : !profile ? (
        <>
          {authError && <div className="card error">{authError}</div>}
          <Landing t={t} />
        </>
      ) : (
        <>
          <AiKeyPanel ai={ai} onChange={updateAi} t={t} />

          <section className="card">
            <label htmlFor="prompt" className="label">
              {t.promptLabel}
            </label>
            <textarea
              id="prompt"
              className="prompt"
              rows={3}
              placeholder={t.promptPlaceholder}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleGenerate();
              }}
              disabled={building}
            />
            <div className="examples">
              {t.examples.map((ex) => (
                <button
                  key={ex}
                  className="chip"
                  onClick={() => setPrompt(ex)}
                  disabled={building}
                >
                  {ex}
                </button>
              ))}
            </div>
            <button className="primary" onClick={handleGenerate} disabled={building || !prompt.trim()}>
              {building ? t.buildingBtn : t.createBtn}
            </button>
            <p className="hint">{t.cmdEnterHint}</p>
          </section>

          {error && <div className="card error">{error}</div>}
          {building && <div className="card muted">{t.curating}</div>}
          {result && <Result result={result} t={t} />}
        </>
      )}

      <footer className="footer">{t.footer}</footer>
    </main>
  );
}

function AiKeyPanel({
  ai,
  onChange,
  t,
}: {
  ai: AiClientSettings;
  onChange: (patch: Partial<AiClientSettings>) => void;
  t: Dict;
}) {
  const needsKey = ai.provider !== "ollama" && !ai.apiKey;
  const keyPageUrl: Record<AiClientSettings["provider"], string | null> = {
    anthropic: "https://console.anthropic.com/settings/keys",
    openai: "https://platform.openai.com/api-keys",
    ollama: null,
  };
  return (
    <details className="card setup" open={needsKey}>
      <summary className="ai-summary">
        {t.aiKeyTitle} {ai.apiKey ? "✓" : "•"}
      </summary>
      <p className="hint">{t.aiKeyHint}</p>

      <label className="field">
        <span className="label">{t.aiProviderField}</span>
        <select
          className="input"
          value={ai.provider}
          onChange={(e) => onChange({ provider: e.target.value as AiClientSettings["provider"] })}
        >
          <option value="anthropic">Claude (Anthropic)</option>
          <option value="openai">OpenAI-compatible</option>
          <option value="ollama">Ollama (local)</option>
        </select>
      </label>

      {ai.provider !== "ollama" && (
        <label className="field">
          <span className="label">
            {t.aiKeyField}
            {keyPageUrl[ai.provider] && (
              <a
                className="get-key"
                href={keyPageUrl[ai.provider]!}
                target="_blank"
                rel="noreferrer"
              >
                {t.aiGetKey}
              </a>
            )}
          </span>
          <input
            className="input"
            type="password"
            value={ai.apiKey}
            placeholder={t.aiKeyPlaceholder}
            onChange={(e) => onChange({ apiKey: e.target.value })}
          />
        </label>
      )}

      <label className="field">
        <span className="label">{t.aiModelField}</span>
        <input
          className="input"
          value={ai.model}
          placeholder={t.aiModelPlaceholder}
          onChange={(e) => onChange({ model: e.target.value })}
        />
      </label>
    </details>
  );
}

function Landing({ t }: { t: Dict }) {
  return (
    <section className="card landing">
      <p>{t.landingText}</p>
      <a className="primary spotify" href="/api/auth/login">
        {t.connectBtn}
      </a>
      <p className="hint">{t.landingHint}</p>
    </section>
  );
}

function Result({ result, t }: { result: PlaylistResult; t: Dict }) {
  return (
    <section className="card result">
      <div className="result-head">
        {result.playlist.image && (
          <img src={result.playlist.image} alt="" className="cover" />
        )}
        <div>
          <h2>{result.playlist.name}</h2>
          <p className="muted">{result.mood}</p>
          {result.wantsNovelty && <span className="badge">{t.freshBadge}</span>}
          <a className="primary spotify open" href={result.playlist.url} target="_blank" rel="noreferrer">
            {t.openInSpotify}
          </a>
        </div>
      </div>

      <iframe
        className="player"
        title="Spotify player"
        src={`https://open.spotify.com/embed/playlist/${result.playlist.id}?utm_source=moodify`}
        width="100%"
        height="380"
        frameBorder={0}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />

      <ol className="tracks">
        {result.tracks.map((track, i) => (
          <li key={track.url + i} className="track">
            {track.image && <img src={track.image} alt="" className="track-art" />}
            <div className="track-meta">
              <a href={track.url} target="_blank" rel="noreferrer" className="track-title">
                {track.title}
              </a>
              <span className="track-artist">{track.artist}</span>
            </div>
          </li>
        ))}
      </ol>

      {result.notFound.length > 0 && (
        <p className="hint">{t.notFound(result.notFound.length)}</p>
      )}
    </section>
  );
}

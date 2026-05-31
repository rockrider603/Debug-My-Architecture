import { useState, useEffect } from 'react';

function App() {
  const [url, setUrl] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
      } else {
        setError(data.error || 'Failed to analyze repository.');
      }
    } catch (err) {
      setError('Could not connect to the backend server. Is it running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content font-sans transition-colors duration-300 selection:bg-primary/30">
      {/* Navbar */}
      <nav className="navbar bg-base-100/80 backdrop-blur-xl sticky top-0 z-50 border-b border-base-200">
        <div className="flex-1 px-4">
          <a className="btn btn-ghost text-xl font-bold gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            ArchDebug
          </a>
        </div>
        <div className="flex-none px-4">
          <button
            className="btn btn-ghost btn-circle hover:bg-base-200 transition-colors"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label="Toggle Theme"
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-4 pt-24 pb-32">
        <div className="text-center max-w-4xl mx-auto mb-14 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>


          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Debug your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">Architecture</span> instantly.
          </h1>

          <p className="text-lg md:text-xl text-base-content/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            Paste your GitHub repository link below. We will analyze your codebase, uncover structural bottlenecks, and recommend architectural improvements.
          </p>
        </div>

        {/* Input Form */}
        <div className="w-full max-w-2xl relative z-10">
          <form onSubmit={handleAnalyze} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-3xl blur-md opacity-30 group-hover:opacity-60 transition duration-500 group-hover:duration-200"></div>
            <div className="relative flex items-center bg-base-100 rounded-2xl p-2.5 border border-base-300 shadow-2xl">
              <div className="pl-4 pr-3 text-base-content/40">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
              </div>
              <input
                type="url"
                placeholder="https://github.com/username/repository"
                className="input input-ghost w-full focus:outline-none focus:bg-transparent text-lg placeholder:text-base-content/30"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="btn border-none bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-8 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/25 h-12 disabled:opacity-70 disabled:scale-100"
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    Analyze
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 -mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Status Messages */}
          {message && (
            <div className="mt-6 alert alert-success shadow-lg border border-success/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mt-6 alert alert-error shadow-lg border border-error/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}
        </div>


        {/* Features/Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-28 w-full max-w-5xl">
          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-200 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
            <div className="card-body items-start p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="card-title text-xl mb-2">Fast Analysis</h3>
              <p className="text-sm text-base-content/60 leading-relaxed">Get actionable insights in seconds, not hours. Our engine parses repos blazingly fast.</p>
            </div>
          </div>
          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-200 hover:border-secondary/40 hover:shadow-xl hover:shadow-secondary/5 transition-all duration-300">
            <div className="card-body items-start p-8">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="card-title text-xl mb-2">Find Bottlenecks</h3>
              <p className="text-sm text-base-content/60 leading-relaxed">Identify architectural flaws, tight coupling, and performance anti-patterns early on.</p>
            </div>
          </div>
          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-200 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300">
            <div className="card-body items-start p-8">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 text-accent">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <h3 className="card-title text-xl mb-2">Smart Refactoring</h3>
              <p className="text-sm text-base-content/60 leading-relaxed">Receive AI-driven suggestions and visual maps for a cleaner, better project structure.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

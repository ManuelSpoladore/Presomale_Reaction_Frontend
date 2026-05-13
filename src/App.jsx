import { useState, useEffect } from 'react';

const COOLDOWN_DURATION = 3600 * 1000;

const API_URL = 'https://presomale-reaction-baclend.onrender.com';

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/api/leaderboard`)
      .then(res => {
        if (!res.ok) throw new Error(`Errore Server: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setLeaderboard(data);
        } else {
          console.error("Il server non ha mandato un array:", data);
        }
      })
      .catch(err => console.error("Errore caricamento classifica:", err));

    const lastVoteTime = localStorage.getItem('presomale_last_vote');
    if (lastVoteTime) {
      const timePassed = Date.now() - parseInt(lastVoteTime, 10);
      if (timePassed < COOLDOWN_DURATION) {
        setCooldownRemaining(COOLDOWN_DURATION - timePassed);
      } else {
        localStorage.removeItem('presomale_last_vote');
      }
    }
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      if (localStorage.getItem('presomale_last_vote')) {
        localStorage.removeItem('presomale_last_vote');
      }
      return;
    }

    const intervalId = setInterval(() => {
      setCooldownRemaining(prev => prev - 1000);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [cooldownRemaining]);

  const handleSearch = async (e) => {
    e.preventDefault();
    console.log("🔍 Pulsante cliccato!"); // LOG 1
    if (!query.trim()) return;
    
    setIsLoading(true);
    console.log("📡 Provo a chiamare:", `${API_URL}/api/search?q=${query}`); // LOG 2

    try {
      const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`);
      console.log("Status risposta:", response.status); // LOG 3
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("🔥 ERRORE CATTURATO:", error); // LOG 4
    } finally {
      setIsLoading(false);
      console.log("🏁 Fine operazione"); // LOG 5
    }
  };

  const handleVote = async (album) => {
    if (cooldownRemaining > 0) return;

    try {
      const response = await fetch(`${API_URL}/api/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(album)
      });

      if (!response.ok) throw new Error('Errore durante il voto');

      const updatedLeaderboard = await response.json();

      if (Array.isArray(updatedLeaderboard)) {
        setLeaderboard(updatedLeaderboard);
      }

      setResults([]);
      setQuery('');

      localStorage.setItem('presomale_last_vote', Date.now().toString());
      setCooldownRemaining(COOLDOWN_DURATION);

    } catch (error) {
      console.error("Errore di voto:", error);
    }
  };

  const formatTime = (ms) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6 md:space-y-8">

        <header className="text-center pt-4 md:pt-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 pb-2">
            Reaction Requests
          </h1>
          <p className="text-neutral-400 mt-2 text-sm md:text-base px-4">
            Cerca un album e richiedi la reaction
          </p>
        </header>

        {cooldownRemaining > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/50 text-orange-400 px-4 py-3 rounded-xl text-center font-bold text-lg animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.2)]">
            ⏳ Hai già votato! Prossimo voto tra: <span className="text-white">{formatTime(cooldownRemaining)}</span>
          </div>
        )}

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un album o artista..."
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-inner text-base"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-orange-500 hover:bg-orange-400 disabled:bg-neutral-600 text-neutral-950 font-bold px-6 py-3 rounded-lg shadow-lg cursor-pointer w-full sm:w-auto transition-colors"
          >
            {isLoading ? 'Cerco...' : 'Cerca'}
          </button>
        </form>

        {/* SEZIONE RISULTATI RICERCA */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-300 border-b border-neutral-700 pb-2">Risultati di ricerca</h2>
            {results.map((album) => (
              <div key={album.id} className="flex items-center gap-3 bg-neutral-800/50 p-3 rounded-xl border border-neutral-700">
                {album.cover
                  ? <img src={album.cover} alt="" className="w-14 h-14 rounded-md object-cover flex-shrink-0" />
                  : <div className="w-14 h-14 rounded-md bg-neutral-700 flex-shrink-0"></div>
                }
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{album.title}</h3>
                  <p className="text-neutral-400 text-xs truncate">{album.artist}</p>
                </div>
                <button
                  onClick={() => handleVote(album)}
                  disabled={cooldownRemaining > 0}
                  className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-semibold flex-shrink-0 transition-colors 
                    ${cooldownRemaining > 0
                      ? 'bg-neutral-800 border border-neutral-600 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-700 hover:bg-neutral-600 text-white cursor-pointer'
                    }`}
                >
                  <span className={cooldownRemaining > 0 ? "text-neutral-500" : "text-yellow-200"}>🔥</span>
                  <span className="hidden sm:inline">+1</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SEZIONE CLASSIFICA */}
        <div className="space-y-3 mt-10">
          <h2 className="text-xl font-bold text-orange-400 border-b border-orange-500/30 pb-2">🏆 Top Richieste</h2>

          {leaderboard.length === 0 ? (
            <p className="text-center text-neutral-500 mt-6">Nessun album in classifica.</p>
          ) : (
            leaderboard.map((album, index) => (
              <div key={album.id} className="flex items-center gap-3 bg-neutral-800 p-3 rounded-xl border border-orange-500/20 shadow-md transition-all hover:scale-[1.01]">
                <span className="text-2xl font-black text-neutral-600 w-6 text-center">{index + 1}</span>
                {album.cover
                  ? <img src={album.cover} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                  : <div className="w-12 h-12 rounded-md bg-neutral-700 flex-shrink-0"></div>
                }
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{album.title}</h3>
                  <p className="text-neutral-400 text-xs truncate">{album.artist}</p>
                </div>

                <div className="bg-orange-500 text-neutral-950 px-2 py-1 rounded-md font-bold text-xs sm:text-sm flex-shrink-0">
                  {album.votes} {album.votes === 1 ? 'voto' : 'voti'}
                </div>

                <button
                  onClick={() => handleVote(album)}
                  disabled={cooldownRemaining > 0}
                  className={`flex items-center justify-center p-2 sm:px-3 sm:py-1 rounded-full sm:rounded-md text-sm font-semibold flex-shrink-0 transition-colors 
                    ${cooldownRemaining > 0
                      ? 'bg-neutral-800 border border-neutral-600 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-700 hover:bg-orange-500 hover:text-neutral-950 text-white cursor-pointer'
                    }`}
                  title="Vota anche tu per questo album!"
                >
                  <span className={cooldownRemaining > 0 ? "text-neutral-500" : "text-yellow-200"}>⬆️</span>
                  <span className="hidden sm:inline sm:ml-1">+1</span>
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
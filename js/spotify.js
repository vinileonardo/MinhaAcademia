// Variáveis de configuração
const clientId = 'bf525d89f2bb4471bba89160674e9975'; // Substitua pelo seu Client ID
const redirectUri = 'https://vinileonardo.github.io/MinhaAcademia/'; // Atualizado com barra no final
const scopes = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-recently-played',
  'playlist-read-private',
  'playlist-read-collaborative',
];

window.onSpotifyWebPlaybackSDKReady = () => {
  handleRedirect(); // Função já definida para lidar com o redirecionamento
  
  if (isAuthenticated()) {
      initializeSpotifyPlayer();
  }
  /* else {
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
  }*/
};

async function initializeSpotifyPlayer() {
  const token = localStorage.getItem('access_token');
  const player = new Spotify.Player({
      name: 'Minha Academia Player',
      getOAuthToken: cb => { cb(token); },
      volume: 0.5
  });

  // Conecte-se ao player
  player.connect().then(success => {
      if (success) {
          console.log('Conectado ao Spotify Player.');
      } else {
          console.error('Falha ao conectar ao Spotify Player.');
      }
  });

  /* 
  Eventos do player
  - ready: Quando o player está pronto e recebe um device_id
  - not_ready: Quando o player não está pronto
  - player_state_changed: Quando o estado da reprodução muda
  */
  player.addListener('ready', ({ device_id }) => {
      console.log('Player está pronto com o ID:', device_id);
      localStorage.setItem('device_id', device_id);
      // Transferir a reprodução para este player
      transferPlaybackHere(device_id);
  });

  player.addListener('not_ready', ({ device_id }) => {
      console.log('Player não está pronto com o ID:', device_id);
  });

  player.addListener('player_state_changed', state => {
    if (!state) {
      return;
    }
    const currentTrack = state.track_window.current_track;
    const progress_ms = state.position;
    const duration_ms = state.duration;
    updatePlayerUI(currentTrack, progress_ms, duration_ms);
  });

  // Armazene o player para uso posterior
  window.spotifyPlayer = player;

  // Iniciar a sincronização do player
  startPlayerSync();
}


/* 
  Funções de PKCE para autenticação segura com o Spotify.
  Estas funções geram o code verifier e o code challenge necessários para o fluxo de autenticação.
*/
function generateCodeVerifier(length = 128) {
  const array = new Uint8Array(Math.ceil(length * 3 / 4));
  window.crypto.getRandomValues(array);
  let codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  if (codeVerifier.length > length) {
    codeVerifier = codeVerifier.substring(0, length);
  }

  return codeVerifier;
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  let base64String = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return base64String;
}

function generateRandomString(length) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  let randomString = '';
  for (let i = 0; i < array.length; i++) {
    randomString += String.fromCharCode(array[i]);
  }
  randomString = btoa(randomString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return randomString;
}

/* 
  Função para iniciar a autenticação com o Spotify.
  Gera os parâmetros necessários e redireciona o usuário para a página de login do Spotify.
*/
async function initiateAuth() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(16);
  const scope = scopes.join(' ');

  // Armazena o code verifier e o state no sessionStorage para uso posterior
  sessionStorage.setItem('code_verifier', codeVerifier);
  sessionStorage.setItem('state', state);

  const args = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    redirect_uri: redirectUri,
    state: state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  // Redireciona o usuário para a página de autenticação do Spotify
  window.location = `https://accounts.spotify.com/authorize?${args.toString()}`;
}

/* 
  Função para extrair parâmetros da URL.
  Utilizada para capturar o código de autenticação retornado pelo Spotify.
*/
function getUrlParams() {
  const params = {};
  window.location.search.replace(/^\?/, '').split('&').forEach(param => {
    const [key, value] = param.split('=');
    params[key] = decodeURIComponent(value);
  });
  return params;
}

/* 
  Função para trocar o código de autenticação pelo token de acesso.
  Envia uma requisição POST para a API do Spotify para obter o token.
*/
async function exchangeCodeForToken(code) {
  const codeVerifier = sessionStorage.getItem('code_verifier');
  const storedState = sessionStorage.getItem('state');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro na resposta da API:', errorData);
      return;
    }

    const data = await response.json();

    if (data.access_token) {
      // Armazena os tokens no localStorage
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      const expiresAt = new Date().getTime() + data.expires_in * 1000;
      localStorage.setItem('expires_at', expiresAt);
      
      // Remove os parâmetros da URL para limpar o redirect
      window.history.replaceState({}, document.title, redirectUri);
      
      // Esconde o modal de login se estiver visível
      const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
      if (loginModal) {
        loginModal.hide();
      }
      
      // Inicia a sincronização do player após autenticação
        startPlayerSync();

        // Opcional: Mostrar o player imediatamente após a autenticação
        showPlayer();
    } else {
      console.error('Erro ao obter o token:', data);
    }
  } catch (error) {
    console.error('Erro na requisição do token:', error);
  }
}

/* 
  Função para verificar se o usuário está autenticado.
  Verifica a presença e validade do token de acesso.
*/
function isAuthenticated() {
  const token = localStorage.getItem('access_token');
  const expiresAt = localStorage.getItem('expires_at');
  if (!token) return false;
  if (new Date().getTime() > expiresAt) return false;
  return true;
}

/* 
  Função para lidar com o redirecionamento após autenticação.
  Se um código de autenticação estiver presente na URL, tenta trocar pelo token.
*/
async function handleRedirect() {
  const params = getUrlParams();
  if (params.code) {
    const storedState = sessionStorage.getItem('state');
    if (params.state !== storedState) {
      console.error('State mismatch. Esperado:', storedState, 'Recebido:', params.state);
      return;
    }
    await exchangeCodeForToken(params.code);
  }
}

/* 
  Função para obter a música atualmente tocando do usuário.
  Retorna os dados da música ou null se nenhuma estiver tocando.
*/
async function getCurrentlyPlaying() {
  const token = localStorage.getItem('access_token');
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.status === 204 || response.status > 400) {
      return null;
    }
    const data = await response.json();
    if (data && data.item) {
      return data.item;
    }
    return null;
  } catch (error) {
    console.error('Erro ao obter a música atualmente tocando:', error);
    return null;
  }
}

/* 
  Função para obter a última música reproduzida pelo usuário.
  Utilizada quando nenhuma música está atualmente tocando.
*/
async function getLastPlayed() {
  const token = localStorage.getItem('access_token');
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.status > 400) {
      return null;
    }
    const data = await response.json();
    if (data && data.items && data.items.length > 0) {
      return data.items[0].track;
    }
    return null;
  } catch (error) {
    console.error('Erro ao obter a última música tocada:', error);
    return null;
  }
}

/* 
  Função para atualizar a interface do player com as informações da faixa.
  Atualiza o título da faixa, nome do artista e a arte do álbum.
*/
// Atualize a função updatePlayerUI para aceitar progress_ms e duration_ms
function updatePlayerUI(track, progress_ms, duration_ms) {
  const currentTrackElement = document.getElementById('current-track');
  const artistNameElement = document.getElementById('artist-name');
  const albumArtElement = document.getElementById('album-art');
  const progressBar = document.getElementById('progress-bar');
  const currentTimeEl = document.getElementById('current-time');
  const totalDurationEl = document.getElementById('total-duration');

  if (track) {
    currentTrackElement.textContent = `${track.name}`;
    currentTrackElement.setAttribute('data-id', track.id); // Armazena o ID da faixa
    artistNameElement.textContent = track.artists.map(artist => artist.name).join(', ');
    albumArtElement.src = track.album.images[2]?.url || track.album.images[0]?.url || '';

    // Atualizar a barra de progresso
    if (progress_ms !== undefined && duration_ms !== undefined) {
      const percent = (progress_ms / duration_ms);
      const dashOffset = 283 * (1 - percent); // 2πr ≈ 283 para r=45
      document.getElementById('progress-bar-circle').style.strokeDashoffset = dashOffset;

      // Atualizar os tempos
      currentTimeEl.textContent = msToTime(progress_ms);
      totalDurationEl.textContent = msToTime(duration_ms);
  }
  } else {
    currentTrackElement.textContent = 'Nenhuma música reproduzindo.';
    currentTrackElement.removeAttribute('data-id'); // Remove o ID quando não há faixa
    artistNameElement.textContent = '';
    albumArtElement.src = '';
    progressBar.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    totalDurationEl.textContent = '0:00';

    document.getElementById('progress-bar-circle').style.strokeDashoffset = 283;
  }
}

/* 
  Função para sincronizar o player com a música atual ou a última música tocada.
  Atualiza a interface do player e as informações da música.
*/
async function synchronizePlayer() {
  const token = localStorage.getItem('access_token');
  const device_id = localStorage.getItem('device_id');
  if (!device_id) return;

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/currently-playing?market=BR`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 200) {
      const data = await response.json();
      if (data && data.item && data.progress_ms !== undefined && data.item.duration_ms !== undefined) {
        const currentTrack = data.item;
        const progress_ms = data.progress_ms;
        const duration_ms = data.item.duration_ms;
        updatePlayerUI(currentTrack, progress_ms, duration_ms);
      }
    } else if (response.status === 204) {
      updatePlayerUI(null);
    }
  } catch (error) {
    console.error('Erro ao sincronizar o player:', error);
  }
}

/* 
  Função para iniciar a sincronização contínua do player.
  Atualiza a cada 30 segundos para refletir quaisquer mudanças.
*/
function startPlayerSync() {
  synchronizePlayer();
  setInterval(synchronizePlayer, 30000); // Sincroniza a cada 30 segundos
}

/* 
  Funções de controle de reprodução
  Estas funções interagem com a API do Spotify para controlar a reprodução da música.
*/

/* Iniciar reprodução */
async function play() {
    const playButton = document.getElementById('btn-play-pause');
    playButton.classList.add('loading'); // Adicionar classe de loading
    playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Mostrar spinner

    const token = localStorage.getItem('access_token');
    const device_id = localStorage.getItem('device_id');
    if (!device_id) {
        alert('Player não está pronto.');
        playButton.classList.remove('loading');
        //DEIXA O BOTAO DE PLAY
        playButton.innerHTML = '<i class="fas fa-play-circle fa-2x" id="icon-play-pause"></i>';
        return;
    }

    try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
            method: 'PUT',
            body: JSON.stringify({}),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });

        //SE DER ERRO DEIXA O BOTAO DE PLAY
        if (response.status > 209) {
            const error = await response.json();
            console.error('Erro ao iniciar reprodução:', error);
            playButton.innerHTML = '<i class="fas fa-play-circle fa-2x" id="icon-play-pause"></i>';
            
        } else {
            //SE DER CERTO, DEIXA O BOTAO DE PAUSE
            console.log('Reprodução iniciada.');
            // Atualiza o ícone para pause
            playButton.innerHTML = '<i class="fas fa-pause-circle fa-2x" id="icon-play-pause"></i>';
        }
    } catch (error) {
        console.error('Erro ao iniciar reprodução:', error);
        playButton.innerHTML = '<i class="fas fa-play-circle fa-2x" id="icon-play-pause"></i>';
    } finally {
        playButton.classList.remove('loading'); // Remover classe de loading
    }
}

/* Pausar reprodução */
async function pause() {
    const pauseButton = document.getElementById('btn-play-pause');
    pauseButton.classList.add('loading'); // Adicionar classe de loading
    pauseButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Mostrar spinner

    const token = localStorage.getItem('access_token');
    const device_id = localStorage.getItem('device_id');
    if (!device_id) {
        alert('Player não está pronto.');
        pauseButton.classList.remove('loading');
        pauseButton.innerHTML = '<i class="fas fa-play-circle fa-2x" id="icon-play-pause"></i>';
        return;
    }

    try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${device_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        //SE DER ERRO PARA PAUSAR, DEIXA O BOTAO DE PAUSE
        if (response.status > 299) {
            const error = await response.json();
            console.error('Erro ao pausar reprodução:', error);
            pauseButton.innerHTML = '<i class="fas fa-pause-circle fa-2x" id="icon-play-pause"></i>';
        } else {
            //SE PAUSAR COM SUCESSO, DEIXA O BOTAO DE PLAY
            console.log('Reprodução pausada.');
            // Atualiza o ícone para play
            pauseButton.innerHTML = '<i class="fas fa-play-circle fa-2x" id="icon-play-pause"></i>';
        }
    } catch (error) {
        console.error('Erro ao pausar reprodução:', error);
        pauseButton.innerHTML = '<i class="fas fa-pause-circle fa-2x" id="icon-play-pause"></i>';
    } finally {
        pauseButton.classList.remove('loading'); // Remover classe de loading
    }
}

/* 
  Função para transferir a reprodução para o SDK Player.
  Assegura que a reprodução esteja sendo gerenciada pelo player integrado.
*/
async function transferPlaybackHere(device_id) {
  const token = localStorage.getItem('access_token');
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      body: JSON.stringify({
        "device_ids": [ device_id ],
        "play": false,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    if (response.status === 204) {
      console.log('Transferência de reprodução bem-sucedida.');
    } else {
      const error = await response.json();
      console.error('Erro ao transferir reprodução:', error);
    }
  } catch (error) {
    console.error('Erro ao transferir reprodução:', error);
  }
}

/* 
  Inicializa o fluxo após carregar a página.
  Verifica se há redirecionamento de autenticação e lida com ele.
*/
handleRedirect();

/* 
  Função debounce
  Evita que múltiplas requisições sejam enviadas rapidamente.
*/
function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    }
}

/* 
  Função para alternar o modo repeat 
*/
let isRepeat = false; // Estado inicial de repeat
document.getElementById('btn-repeat').addEventListener('click', debounce(async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    const device_id = localStorage.getItem('device_id');

    if (!device_id) {
        alert('Player não está pronto.');
        return;
    }

    try {
        // Alternar o estado de repeat
        isRepeat = !isRepeat;
        const repeatState = isRepeat ? 'track' : 'off';

        const setRepeatResponse = await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${repeatState}&device_id=${device_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (setRepeatResponse.status === 204) {
            console.log(`Repeat ${isRepeat ? 'On' : 'Off'}`);
            // Atualizar o ícone para indicar o estado
            const repeatIcon = document.querySelector('#btn-repeat i');
            if (isRepeat) {
              repeatIcon.classList.add('active-repeat');
              repeatIcon.style.color = '#1DB954';
          } else {
              repeatIcon.classList.remove('active-repeat');
              repeatIcon.style.color = '#b3b3b3';
          }
        } else {
            const error = await setRepeatResponse.json();
            console.error('Erro ao alternar Repeat:', error);
        }
    } catch (error) {
        console.error('Erro ao alternar Repeat:', error);
    }
}, 300)); // Delay de 300ms

/* 
  Função para alternar shuffle 
*/
let isShuffle = false; // Estado inicial de shuffle
document.getElementById('btn-shuffle').addEventListener('click', debounce(async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    const device_id = localStorage.getItem('device_id');

    if (!device_id) {
        alert('Player não está pronto.');
        return;
    }

    try {
        // Alternar o estado de shuffle
        isShuffle = !isShuffle;
        const shuffleState = isShuffle ? 'true' : 'false';

        const setShuffleResponse = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${shuffleState}&device_id=${device_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (setShuffleResponse.status === 204) {
            console.log(`Shuffle ${isShuffle ? 'On' : 'Off'}`);
            // Atualizar o ícone para indicar o estado
            const shuffleIcon = document.querySelector('#btn-shuffle i');
            if (isShuffle) {
              shuffleIcon.classList.add('active-shuffle');
              shuffleIcon.style.color = '#1DB954';
          } else {
              shuffleIcon.classList.remove('active-shuffle');
              shuffleIcon.style.color = '#b3b3b3';
          }
        } else {
            const error = await setShuffleResponse.json();
            console.error('Erro ao alternar Shuffle:', error);
        }
    } catch (error) {
        console.error('Erro ao alternar Shuffle:', error);
    }
}, 300)); // Delay de 300ms

/* 
  Função para alternar entre Play e Pause ao clicar no botão play/pause.
  Atualiza o ícone conforme o estado da reprodução.
*/
document.getElementById('btn-play-pause').addEventListener('click', debounce(async (e) => {
    e.preventDefault();
    const playButton = document.getElementById('btn-play-pause');
    const icon = document.getElementById('icon-play-pause');
    const token = localStorage.getItem('access_token');
    const device_id = localStorage.getItem('device_id');

    const player = window.spotifyPlayer;

    if (!player || !player._options.id) { // Verifica se o player está ready
        alert('Player não está pronto.');
        return;
    }

    if (!device_id) {
        alert('Player não está pronto.');
        return;
    }

    try {
        // Verifica o estado atual da reprodução
        const response = await fetch('https://api.spotify.com/v1/me/player', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.status === 204) {
            // Nenhuma reprodução está ocorrendo, iniciar reprodução
            await play();
        } else if (response.status === 200) {
            const data = await response.json();
            if (data.is_playing) {
                // Se estiver tocando, pausar
                await pause();
            } else {
                // Se estiver pausado, reproduzir
                await play();
            }
        } else {
            console.error('Erro ao verificar o estado do player:', response.status);
        }
    } catch (error) {
        console.error('Erro ao alternar Play/Pause:', error);
    }
}, 300)); // Delay de 300ms

/* 
  Funções de controle de reprodução
  Estas funções interagem com a API do Spotify para controlar a reprodução da música.
*/

/* Avançar para a próxima faixa */
async function nextTrack() {
    const token = localStorage.getItem('access_token');
    const device_id = localStorage.getItem('device_id');
    if (!device_id) {
        alert('Player não está pronto.');
        return;
    }

    try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${device_id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        if (response.status === 204) {
            console.log('Próxima faixa acionada.');
            synchronizePlayer();
        } else {
            const error = await response.json();
            console.error('Erro ao avançar faixa:', error);
        }
    } catch (error) {
        console.error('Erro ao avançar faixa:', error);
    }
}

/* Retroceder para a faixa anterior */
async function previousTrack() {
    const token = localStorage.getItem('access_token');
    const device_id = localStorage.getItem('device_id');
    if (!device_id) {
        alert('Player não está pronto.');
        return;
    }

    try {
        const response = await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${device_id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        if (response.status === 204) {
            console.log('Faixa anterior acionada.');
            synchronizePlayer();
        } else {
            const error = await response.json();
            console.error('Erro ao retroceder faixa:', error);
        }
    } catch (error) {
        console.error('Erro ao retroceder faixa:', error);
    }
}

/* 
  Função para exibir o player no footer.
  Alterna a visibilidade do player quando o botão flutuante é clicado.
*/
function showPlayer() {
  document.getElementById('spotify-player').style.display = 'block';
  synchronizePlayer(); // Sincroniza imediatamente ao mostrar o player
}

/* 
  Função para ocultar o player.
  Esconde o player quando necessário.
*/
function hidePlayer() {
  document.getElementById('spotify-player').style.display = 'none';
}

/* 
  Manipulador de clique no botão flutuante.
  Alterna entre mostrar e esconder o player.
*/
document.getElementById('spotifyBtn').addEventListener('click', () => {
    if (isAuthenticated()) {
      const player = document.getElementById('spotify-player');
      if (player.style.display === 'none' || player.style.display === '') {
        showPlayer();
      } else {
        hidePlayer();
      }
    } else {
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
    }
  });

  document.getElementById('loginButton').addEventListener('click', (e) => {
    e.preventDefault();
    initiateAuth();
  });
  

  async function toggleFavorite() {
    const token = localStorage.getItem('access_token');
    const trackId = getCurrentTrackId();

    if (!trackId) {
        alert('Nenhuma faixa está atualmente reproduzindo.');
        return;
    }

    try {
        // Verificar se a faixa já está favoritada
        const checkResponse = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const contains = await checkResponse.json();
        const isFavorited = contains[0];

        if (isFavorited) {
            // Remover dos favoritos
            const removeResponse = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (removeResponse.status === 200) {
                alert('Faixa removida dos favoritos!');
                document.querySelector('#btn-favorite i').classList.remove('fas');
                document.querySelector('#btn-favorite i').classList.add('far');
            }
        } else {
            // Adicionar aos favoritos
            const addResponse = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });
            if (addResponse.status === 200 || addResponse.status === 204) {
                alert('Faixa adicionada aos favoritos!');
                document.querySelector('#btn-favorite i').classList.remove('far');
                document.querySelector('#btn-favorite i').classList.add('fas');
            }
        }
    } catch (error) {
        console.error('Erro ao alternar favoritos:', error);
        alert('Ocorreu um erro ao tentar alternar os favoritos.');
    }
}

// Atualizar Event Listener
document.getElementById('btn-favorite').removeEventListener('click', saveCurrentTrack);
document.getElementById('btn-favorite').addEventListener('click', async (e) => {
    e.preventDefault();
    await toggleFavorite();
});

// Atualizar UI ao sincronizar
player.addListener('player_state_changed', async state => {
    if (!state) return;
    const currentTrack = state.track_window.current_track;
    const isPlaying = !state.paused;

    // Atualizar ícone de favorito
    if (currentTrack) {
        const response = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${currentTrack.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const contains = await response.json();
        const isFavorited = contains[0];
        const favoriteIcon = document.querySelector('#btn-favorite i');
        if (isFavorited) {
            favoriteIcon.classList.remove('far');
            favoriteIcon.classList.add('fas');
        } else {
            favoriteIcon.classList.remove('fas');
            favoriteIcon.classList.add('far');
        }
    }
});



/* 
  Função para obter o ID da faixa atual.
  Verifica o player para retornar o ID da música que está sendo reproduzida.
*/
function getCurrentTrackId() {
    const currentTrackElement = document.getElementById('current-track');
    return currentTrackElement.getAttribute('data-id') || null;
}

/* 
  Função para converter milissegundos para tempo no formato mm:ss.
  Facilita a exibição do tempo atual e total da música.
*/
function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60); // Corrigido o parêntese

    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return minutes + ":" + seconds;
}

/* 
  Função para salvar a música atual nos favoritos do usuário.
  Utiliza a API do Spotify para adicionar a faixa à biblioteca.
*/
async function saveCurrentTrack() {
    const token = localStorage.getItem('access_token');
    const trackId = getCurrentTrackId(); // Obtém o ID da faixa atual

    if (!trackId) {
        alert('Nenhuma faixa está atualmente reproduzindo.');
        return;
    }

    try {
        // Adiciona a faixa à biblioteca do usuário
        const response = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });

        if (response.status === 200 || response.status === 204) {
            alert('Faixa adicionada aos seus favoritos!');
        } else {
            const error = await response.json();
            console.error('Erro ao adicionar faixa aos favoritos:', error);
            alert('Não foi possível adicionar a faixa aos favoritos.');
        }
    } catch (error) {
        console.error('Erro na requisição para adicionar faixa:', error);
        alert('Ocorreu um erro ao tentar adicionar a faixa aos favoritos.');
    }
}

/* 
  Event Listener para o botão de Favoritar.
  Chama a função para salvar a música atual quando clicado.
*/
document.getElementById('btn-favorite').addEventListener('click', async (e) => {
    e.preventDefault(); // Evita o comportamento padrão do link
    await saveCurrentTrack();
});

/* 
  Função para obter o ID da faixa atual.
  Verifica o player para retornar o ID da música que está sendo reproduzida.
*/
function getCurrentTrackId() {
    const currentTrackElement = document.getElementById('current-track');
    return currentTrackElement.getAttribute('data-id') || null;
}



/* 
  Função debounce
  Evita que múltiplas requisições sejam enviadas rapidamente.
*/
function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    }
}



/* 
  Função para mostrar o modal de confirmação
*/
function mostrarConfirmacao() {
    $('#modalExercicio').modal('hide');

    document.getElementById('confirm-titulo').textContent = exercicioTemp.nome;
    document.getElementById('confirm-nome-video').textContent = exercicioTemp.videoTitulo;

    const confirmPreviewVideoDiv = document.getElementById('confirm-preview-video');
    confirmPreviewVideoDiv.innerHTML = '';

    let videoID = '';
    if (exercicioTemp.modo === 'link') {
        videoID = extrairVideoID(exercicioTemp.link);
    } else if (exercicioTemp.modo === 'pesquisa') {
        videoID = exercicioTemp.videoId;
    }

    if (videoID) {
        confirmPreviewVideoDiv.innerHTML = `
            <div class="embed-responsive embed-responsive-16by9">
                <iframe class="embed-responsive-item" src="https://www.youtube.com/embed/${videoID}" allowfullscreen></iframe>
            </div>
        `;
    } else {
        confirmPreviewVideoDiv.innerHTML = '<p>Vídeo não disponível</p>';
    }

    $('#modalConfirmacao').modal('show');
}




/*   SEEK     */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializa os módulos
    SeekModule.init();
    VolumeModule.init();
});

const SeekModule = (function() {
    // Seleção de Elementos
    const handleMain = document.getElementById('handle-main');
    const progressMain = document.getElementById('progress-main');
    const progressBarMain = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const totalDurationEl = document.getElementById('total-duration');


    // Funções Utilitárias
    function msToTime(duration) {
        const seconds = Math.floor((duration / 1000) % 60);
        const minutes = Math.floor((duration / (1000 * 60)) % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    function updateUI(handle, progressBar, percent) {
        handle.style.left = `${percent}%`;
        progressBar.style.width = `${percent}%`;
    }

    

    async function updateProgress() {
        const token = localStorage.getItem('access_token');
        const device_id = localStorage.getItem('device_id');
        if (!device_id) return;

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/currently-playing?market=BR`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 200) {
                const data = await response.json();
                if (data && data.item && data.progress_ms !== undefined && data.item.duration_ms !== undefined) {
                    const progress = (data.progress_ms / data.item.duration_ms) * 100;
                    updateUI(handleMain, progressBarMain, progress);

                    const currentTime = msToTime(data.progress_ms);
                    const totalDuration = msToTime(data.item.duration_ms);
                    currentTimeEl.textContent = currentTime;
                    totalDurationEl.textContent = totalDuration;

                    // Atualiza o estado no localStorage
                    localStorage.setItem('seek_percent', progress);
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar a barra de progresso:', error);
        }
    }

    // Inicialização do Módulo
    function init() {
        // Carrega o estado anterior do seek
        const savedSeekPercent = parseFloat(localStorage.getItem('seek_percent'));
        if (!isNaN(savedSeekPercent)) {
            updateUI(handleMain, progressBarMain, savedSeekPercent);
        }

        handleMain.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        progressMain.addEventListener('click', handleClick);

        // Atualiza a barra de progresso a cada segundo
        setInterval(updateProgress, 1000);
    }

    return {
        init: init
    };
})();

const VolumeModule = (function() {
    // Seleção de Elementos
    const handleVolume = document.getElementById('handle-volume');
    const progressVolume = document.getElementById('progress-volume');
    const volumeBar = document.getElementById('volume-bar');
    const btnVolume = document.getElementById('btn-volume');

    // Tooltip para Volume
    const tooltipVolume = document.createElement('div');
    tooltipVolume.classList.add('tooltip-volume');
    document.body.appendChild(tooltipVolume);

    // Estado de Arrasto
    let isDraggingVolume = false;

    // Funções Utilitárias
    function updateUI(handle, progressBar, percent) {
        handle.style.left = `${percent}%`;
        progressBar.style.width = `${percent}%`;
    }

    async function performVolumeUpdate(percent) {
        const player = window.spotifyPlayer;
        if (player) {
            try {
                const volume = percent / 100;
                await player.setVolume(volume);
                console.log(`Volume set to ${percent}%`);
                // Atualiza o estado no localStorage
                localStorage.setItem('volume_percent', percent);
            } catch (error) {
                console.error('Erro ao atualizar volume:', error);
            }
        }
    }

    // Throttle para limitar a frequência das chamadas de volume
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function(...args) {
            const context = this;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        }
    }

    // Função de debounce para o botão de volume
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        }
    }

    // Função para Exibir Tooltip
    function showTooltip(x, y, text) {
      tooltipVolume.style.left = `${x}px`;
      tooltipVolume.style.top = `${y}px`;
      tooltipVolume.textContent = text;
      tooltipVolume.style.display = 'block';
  }

    function hideTooltip() {
        tooltipVolume.style.display = 'none';
    }

    // Manipuladores de Eventos
    function handleMouseDown(e) {
        e.preventDefault();
        isDraggingVolume = true;
    }

    const throttledVolumeUpdate = throttle(performVolumeUpdate, 100); // Limita a 10 chamadas por segundo

    function handleMouseMove(e) {
      if (!isDraggingVolume) return;
  
      const rect = progressVolume.getBoundingClientRect();
      let offsetX = e.clientX - rect.left;
      offsetX = Math.max(0, Math.min(offsetX, rect.width));
      const percent = (offsetX / rect.width) * 100;
  
      // Atualiza a UI imediatamente
      updateUI(handleVolume, volumeBar, percent);
  
      // Envia a atualização de volume de forma throttled
      throttledVolumeUpdate(percent);
  
      // Atualiza o Tooltip
      const tooltipText = `${Math.round(percent)}%`;
      const tooltipX = e.clientX;
      const tooltipY = rect.top - 10; // Ajuste conforme necessário
      showTooltip(tooltipX, tooltipY, tooltipText);
  }

    function handleMouseUp() {
        if (isDraggingVolume) {
            isDraggingVolume = false;
            hideTooltip();
        }
    }

    async function handleClick(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const percent = (offsetX / rect.width) * 100;

        updateUI(handleVolume, volumeBar, percent);
        await performVolumeUpdate(percent);
    }

    async function toggleMute(e) {
        e.preventDefault();
        const player = window.spotifyPlayer;

        if (!player) {
            alert('Player não está pronto.');
            return;
        }

        try {
            const currentVolume = await player.getVolume();
            if (currentVolume > 0) {
                await player.setVolume(0); // Muta o som
                updateUI(handleVolume, volumeBar, 0);
                // Atualiza o estado no localStorage
                localStorage.setItem('volume_percent', 0);
                // Atualiza o ícone para volume mute
                btnVolume.querySelector('i').classList.remove('fa-volume-up');
                btnVolume.querySelector('i').classList.add('fa-volume-mute');
            } else {
                const defaultVolume = 50; // Define volume para 50%
                await player.setVolume(defaultVolume / 100);
                updateUI(handleVolume, volumeBar, defaultVolume);
                // Atualiza o estado no localStorage
                localStorage.setItem('volume_percent', defaultVolume);
                // Atualiza o ícone para volume up
                btnVolume.querySelector('i').classList.remove('fa-volume-mute');
                btnVolume.querySelector('i').classList.add('fa-volume-up');
            }
        } catch (error) {
            console.error('Erro ao alternar Volume:', error);
        }
    }

    // Inicialização do Módulo
    function init() {
        // Carrega o estado anterior do volume
        const savedVolumePercent = parseFloat(localStorage.getItem('volume_percent'));
        if (!isNaN(savedVolumePercent)) {
            updateUI(handleVolume, volumeBar, savedVolumePercent);
            performVolumeUpdate(savedVolumePercent);
        }

        // Eventos de arrasto de volume
        handleVolume.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        progressVolume.addEventListener('click', handleClick);

        // Evento de clique no botão de volume
        if (btnVolume) {
            btnVolume.addEventListener('click', debouncedToggleMute);
        }
    }

    // Debounced Toggle Mute
    const debouncedToggleMute = debounce(toggleMute, 300); // 300ms de delay

    return {
        init: init
    };
})();

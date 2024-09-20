// spotify.js

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
];

// Funções de PKCE
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

  console.log('Generated Code Verifier:', codeVerifier);
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
  console.log('Generated Code Challenge:', base64String);
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
  console.log('Generated Random String (State):', randomString);
  return randomString;
}

// Função para iniciar a autenticação
async function initiateAuth() {
  console.log('Iniciando processo de autenticação...');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(16);
  const scope = scopes.join(' ');

  sessionStorage.setItem('code_verifier', codeVerifier);
  sessionStorage.setItem('state', state);

  console.log('Armazenado Code Verifier no sessionStorage:', codeVerifier);
  console.log('Armazenado State no sessionStorage:', state);

  const args = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    redirect_uri: redirectUri,
    state: state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  console.log('URL de Autorização:', `https://accounts.spotify.com/authorize?${args.toString()}`);
  window.location = `https://accounts.spotify.com/authorize?${args.toString()}`;
}

// Função para extrair parâmetros da URL
function getUrlParams() {
  const params = {};
  window.location.search.replace(/^\?/, '').split('&').forEach(param => {
    const [key, value] = param.split('=');
    params[key] = decodeURIComponent(value);
  });
  console.log('Parâmetros da URL:', params);
  return params;
}

// Função para trocar o código pelo token
async function exchangeCodeForToken(code) {
  console.log('Trocando código por token...');
  const codeVerifier = sessionStorage.getItem('code_verifier');
  const storedState = sessionStorage.getItem('state');

  console.log('Recuperado Code Verifier do sessionStorage:', codeVerifier);
  console.log('Recuperado State do sessionStorage:', storedState);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  console.log('Corpo da requisição para trocar o código:', body.toString());

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    console.log('Resposta da API do Spotify:', response);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro na resposta da API:', errorData);
      return;
    }

    const data = await response.json();
    console.log('Dados recebidos da API do Spotify:', data);

    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      const expiresAt = new Date().getTime() + data.expires_in * 1000;
      localStorage.setItem('expires_at', expiresAt);
      console.log('Tokens armazenados no localStorage.');
      window.history.replaceState({}, document.title, redirectUri);
    } else {
      console.error('Erro ao obter o token:', data);
    }
  } catch (error) {
    console.error('Erro na requisição do token:', error);
  }
}

// Função para verificar se o usuário está autenticado
function isAuthenticated() {
  const token = localStorage.getItem('access_token');
  const expiresAt = localStorage.getItem('expires_at');
  console.log('Verificando autenticação. Token:', token, 'Expires At:', expiresAt);
  if (!token) return false;
  if (new Date().getTime() > expiresAt) return false;
  return true;
}

// Função para lidar com o redirecionamento após autenticação
async function handleRedirect() {
  const params = getUrlParams();
  if (params.code) {
    console.log('Código de autorização encontrado:', params.code);
    const storedState = sessionStorage.getItem('state');
    if (params.state !== storedState) {
      console.error('State mismatch. Esperado:', storedState, 'Recebido:', params.state);
      return;
    }
    await exchangeCodeForToken(params.code);
  } else {
    console.log('Nenhum código de autorização encontrado na URL.');
  }
}

// Função para obter a música atualmente tocando
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
    console.log('Currently Playing:', data);
    if (data && data.item) {
      return data.item;
    }
    return null;
  } catch (error) {
    console.error('Erro ao obter a música atualmente tocando:', error);
    return null;
  }
}

// Função para obter a última música reproduzida
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
    console.log('Last Played:', data);
    if (data && data.items && data.items.length > 0) {
      return data.items[0].track;
    }
    return null;
  } catch (error) {
    console.error('Erro ao obter a última música tocada:', error);
    return null;
  }
}

// Função para atualizar a interface do player
function updatePlayerUI(track) {
  const currentTrackElement = document.getElementById('current-track');
  if (track) {
    currentTrackElement.textContent = `Reproduzindo: ${track.name} de ${track.artists.map(artist => artist.name).join(', ')}`;
  } else {
    currentTrackElement.textContent = 'Nenhuma música reproduzindo.';
  }
}

// Função para sincronizar o player
async function synchronizePlayer() {
  console.log('Sincronizando o player...');
  const currentTrack = await getCurrentlyPlaying();
  if (currentTrack) {
    updatePlayerUI(currentTrack);
  } else {
    const lastTrack = await getLastPlayed();
    if (lastTrack) {
      updatePlayerUI(lastTrack);
    } else {
      updatePlayerUI(null);
    }
  }
}

// Função para iniciar a sincronização do player
function startPlayerSync() {
  synchronizePlayer();
  setInterval(synchronizePlayer, 30000); // Sincroniza a cada 30 segundos
}

// Funções de controle de reprodução
async function play() {
  const token = localStorage.getItem('access_token');
  const device_id = localStorage.getItem('device_id');
  if (!device_id) {
    alert('Player não está pronto.');
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

    if (response.status === 204) {
      console.log('Reprodução iniciada.');
    } else {
      const error = await response.json();
      console.error('Erro ao iniciar reprodução:', error);
    }
  } catch (error) {
    console.error('Erro ao iniciar reprodução:', error);
  }
}

async function pause() {
  const token = localStorage.getItem('access_token');
  const device_id = localStorage.getItem('device_id');
  if (!device_id) {
    alert('Player não está pronto.');
    return;
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${device_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });

    if (response.status === 204) {
      console.log('Reprodução pausada.');
    } else {
      const error = await response.json();
      console.error('Erro ao pausar reprodução:', error);
    }
  } catch (error) {
    console.error('Erro ao pausar reprodução:', error);
  }
}

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
    } else {
      const error = await response.json();
      console.error('Erro ao avançar faixa:', error);
    }
  } catch (error) {
    console.error('Erro ao avançar faixa:', error);
  }
}

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
    } else {
      const error = await response.json();
      console.error('Erro ao retroceder faixa:', error);
    }
  } catch (error) {
    console.error('Erro ao retroceder faixa:', error);
  }
}

// Função para transferir a reprodução para o SDK Player
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

// Inicializa o fluxo após carregar a página
handleRedirect();

// Inicializa o Spotify Web Playback SDK
window.onSpotifyWebPlaybackSDKReady = () => {
  console.log('Spotify Web Playback SDK está pronto.');
  if (isAuthenticated()) {
    const token = localStorage.getItem('access_token');
    console.log('Token encontrado no localStorage:', token);
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

    // Eventos do player
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
      console.log('Música atual no player:', currentTrack);
      updatePlayerUI(currentTrack);
    });

    // Armazene o player para uso posterior
    window.spotifyPlayer = player;

    // Iniciar a sincronização do player
    synchronizePlayer();
    setInterval(synchronizePlayer, 30000); // Sincroniza a cada 30 segundos
  } else {
    console.log('Usuário não está autenticado.');
  }
};

// Função para exibir o player no footer
function showPlayer() {
  console.log('Exibindo o player do Spotify.');
  document.getElementById('spotify-player').style.display = 'block';
  synchronizePlayer(); // Sincroniza imediatamente ao mostrar o player
}

// Função para ocultar o player
function hidePlayer() {
  console.log('Ocultando o player do Spotify.');
  document.getElementById('spotify-player').style.display = 'none';
}

// Manipulador de clique no botão flutuante
document.getElementById('spotifyBtn').addEventListener('click', () => {
  console.log('Botão do Spotify clicado.');
  const player = document.getElementById('spotify-player');
  if (player.style.display === 'none' || player.style.display === '') {
    showPlayer();
  } else {
    hidePlayer();
  }
});

// Manipulador de clique no botão de login
document.getElementById('loginButton').addEventListener('click', () => {
  console.log('Botão de login do Spotify clicado.');
  initiateAuth();
});

// Adiciona event listeners aos botões de controle após o DOM ser carregado
document.addEventListener('DOMContentLoaded', () => {
  const btnPlay = document.getElementById('btn-play');
  const btnPause = document.getElementById('btn-pause');
  const btnNext = document.getElementById('btn-next');
  const btnPrev = document.getElementById('btn-prev');

  if (btnPlay) {
    btnPlay.addEventListener('click', play);
  }

  if (btnPause) {
    btnPause.addEventListener('click', pause);
  }

  if (btnNext) {
    btnNext.addEventListener('click', nextTrack);
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', previousTrack);
  }
});

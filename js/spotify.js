// Variáveis de configuração
const clientId = 'bf525d89f2bb4471bba89160674e9975'; // Substitua pelo seu Client ID
const redirectUri = window.location.origin + window.location.pathname;
const scopes = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  // Adicione outros escopos conforme necessário
];

// Funções de PKCE
function generateCodeVerifier(length = 128) {
  // O comprimento máximo é 128 caracteres
  const array = new Uint8Array(Math.ceil(length * 3 / 4));
  window.crypto.getRandomValues(array);
  let codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // Trunca para o comprimento desejado, se necessário
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
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  console.log('Generated Code Challenge:', codeChallenge);
  return codeChallenge;
}

function generateRandomString(length) {
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  const randomString = Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
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
      // Opcional: Armazene o tempo de expiração
      const expiresAt = new Date().getTime() + data.expires_in * 1000;
      localStorage.setItem('expires_at', expiresAt);
      console.log('Tokens armazenados no localStorage.');
      // Limpa os parâmetros da URL
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

// Inicializa o fluxo após carregar a página
handleRedirect();

// Inicializa o Spotify Web Playback SDK
window.onSpotifyWebPlaybackSDKReady = () => {
  console.log('Spotify Web Playback SDK está pronto.');
  if (isAuthenticated()) {
    const token = localStorage.getItem('access_token');
    console.log('Token encontrado no localStorage:', token);
    const player = new Spotify.Player({
      name: 'Web Player',
      getOAuthToken: cb => { cb(token); },
      volume: 0.5
    });

    // Conecte-se ao player!
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
      // Armazene o device_id para uso futuro
      localStorage.setItem('device_id', device_id);
    });

    player.addListener('not_ready', ({ device_id }) => {
      console.log('Player não está pronto com o ID:', device_id);
    });

    // Armazene o player para uso posterior
    window.spotifyPlayer = player;
  } else {
    console.log('Usuário não está autenticado.');
  }
};

// Função para exibir o player no footer
function showPlayer() {
  console.log('Exibindo o player do Spotify.');
  const playerContainer = document.getElementById('player-container');
  playerContainer.innerHTML = `
    <iframe src="https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
  `;
  document.getElementById('spotify-player').style.display = 'block';
}

// Função para ocultar o player
function hidePlayer() {
  console.log('Ocultando o player do Spotify.');
  document.getElementById('player-container').innerHTML = '';
  document.getElementById('spotify-player').style.display = 'none';
}

// Manipulador de clique no botão flutuante
document.getElementById('spotifyBtn').addEventListener('click', () => {
  console.log('Botão do Spotify clicado.');
  if (isAuthenticated()) {
    // Alterna a visibilidade do player
    const player = document.getElementById('spotify-player');
    if (player.style.display === 'none' || player.style.display === '') {
      showPlayer();
    } else {
      hidePlayer();
    }
  } else {
    console.log('Usuário não autenticado. Abrindo modal de login.');
    // Abre o modal de login
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
  }
});

// Manipulador de clique no botão de login
document.getElementById('loginButton').addEventListener('click', () => {
  console.log('Botão de login do Spotify clicado.');
  initiateAuth();
});

// Atualiza o player para usar o Web Playback SDK
function initializePlayer() {
  console.log('Inicializando o player do Spotify.');
  const playerContainer = document.getElementById('player-container');
  playerContainer.innerHTML = ''; // Limpa o iframe anterior

  // Adiciona controles personalizados ou usa o SDK
  if (window.spotifyPlayer) {
    console.log('Player do Spotify está disponível.');
    // Exemplo: Reproduzir uma música específica
    // play('spotify:track:SEU_TRACK_URI');
  }
}

// Chame initializePlayer quando o player estiver pronto
// Pode ser integrado nos eventos do player acima
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
  'playlist-read-private',
  'playlist-read-collaborative',
];

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
function updatePlayerUI(track) {
  const currentTrackElement = document.getElementById('current-track');
  const artistNameElement = document.getElementById('artist-name');
  const albumArtElement = document.getElementById('album-art');

  if (track) {
    currentTrackElement.textContent = `${track.name}`;
    artistNameElement.textContent = track.artists.map(artist => artist.name).join(', ');
    albumArtElement.src = track.album.images[2]?.url || track.album.images[0]?.url || '';
  } else {
    currentTrackElement.textContent = 'Nenhuma música reproduzindo.';
    artistNameElement.textContent = '';
    albumArtElement.src = '';
  }
}

/* 
  Função para sincronizar o player com a música atual ou a última música tocada.
  Atualiza a interface do player e as informações da música.
*/
async function synchronizePlayer() {
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
      // Atualiza o ícone para pausa
      document.getElementById('icon-play-pause').classList.remove('fa-play-circle');
      document.getElementById('icon-play-pause').classList.add('fa-pause-circle');
    } else {
      const error = await response.json();
      console.error('Erro ao iniciar reprodução:', error);
    }
  } catch (error) {
    console.error('Erro ao iniciar reprodução:', error);
  }
}

/* Pausar reprodução */
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
      // Atualiza o ícone para play
      document.getElementById('icon-play-pause').classList.remove('fa-pause-circle');
      document.getElementById('icon-play-pause').classList.add('fa-play-circle');
    } else {
      const error = await response.json();
      console.error('Erro ao pausar reprodução:', error);
    }
  } catch (error) {
    console.error('Erro ao pausar reprodução:', error);
  }
}

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
  Inicializa o Spotify Web Playback SDK.
  Configura o player, conecta e adiciona listeners para eventos relevantes.
*/
window.onSpotifyWebPlaybackSDKReady = () => {
  if (isAuthenticated()) {
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
      updatePlayerUI(currentTrack);
    });

    // Armazene o player para uso posterior
    window.spotifyPlayer = player;

    // Iniciar a sincronização do player
    startPlayerSync();
  } else {
    // Mostrar o modal de login se não estiver autenticado
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
  }
};

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
  const player = document.getElementById('spotify-player');
  if (player.style.display === 'none' || player.style.display === '') {
    showPlayer();
  } else {
    hidePlayer();
  }
});

/* 
  Manipulador de clique no botão de login.
  Inicia o processo de autenticação com o Spotify.
*/
document.getElementById('loginButton').addEventListener('click', () => {
  initiateAuth();
});

/* 
  Manipulador de clique no botão de Favoritar.
  Salva a música atual na playlist do usuário.
*/
document.getElementById('btn-favorite').addEventListener('click', async (e) => {
  e.preventDefault(); // Evita o comportamento padrão do link
  const token = localStorage.getItem('access_token');
  const trackId = getCurrentTrackId(); // Função que retorna o ID da faixa atual

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
});

/* 
  Função para obter o ID da faixa atual.
  Verifica o player para retornar o ID da música que está sendo reproduzida.
*/
function getCurrentTrackId() {
  const currentTrackElement = document.getElementById('current-track');
  // Implementar lógica para obter o ID da faixa atual
  // Isso pode depender de como os dados da faixa estão sendo armazenados
  // Exemplo: retornar um atributo data-id na div ou elemento correspondente
  return currentTrackElement.getAttribute('data-id') || null;
}

/* 
  Função para alternar entre Play e Pause ao clicar no botão play/pause.
  Atualiza o ícone conforme o estado da reprodução.
*/
document.getElementById('btn-play-pause').addEventListener('click', async (e) => {
  e.preventDefault(); // Evita o comportamento padrão do link

  const icon = document.getElementById('icon-play-pause');
  const token = localStorage.getItem('access_token');
  const device_id = localStorage.getItem('device_id');

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
});

/* 
  Função para tornar os controles de reprodução interativos.
  Inclui a barra de progresso e a barra de volume.
*/
document.addEventListener('DOMContentLoaded', () => {
  const btnNext = document.getElementById('btn-next');
  const btnPrev = document.getElementById('btn-prev');
  const btnVolume = document.getElementById('btn-volume');
  const volumeBar = document.getElementById('volume-bar');
  const progressBar = document.getElementById('progress-bar');
  const currentTimeEl = document.getElementById('current-time');
  const totalDurationEl = document.getElementById('total-duration');
  const handleMain = document.getElementById('handle-main');
  const handleVolume = document.getElementById('handle-volume');

  /* 
    Event Listener para o botão Próximo
    Avança para a próxima faixa quando clicado.
  */
  if (btnNext) {
    btnNext.addEventListener('click', async (e) => {
      e.preventDefault();
      await nextTrack();
    });
  }

  /* 
    Event Listener para o botão Anterior
    Retrocede para a faixa anterior quando clicado.
  */
  if (btnPrev) {
    btnPrev.addEventListener('click', async (e) => {
      e.preventDefault();
      await previousTrack();
    });
  }

  /* 
    Event Listener para o botão de Volume
    Alterna entre mute e ativar o som, além de mudar o ícone.
  */
  if (btnVolume) {
    btnVolume.addEventListener('click', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('access_token');
      const player = window.spotifyPlayer;

      if (!player) {
        alert('Player não está pronto.');
        return;
      }

      try {
        const currentVolume = await player.getVolume();
        if (currentVolume > 0) {
          await player.setVolume(0); // Muta o som
          // Atualiza o ícone para volume mute
          btnVolume.querySelector('i').classList.remove('fa-volume-up');
          btnVolume.querySelector('i').classList.add('fa-volume-mute');
        } else {
          await player.setVolume(0.5); // Define volume para 50%
          // Atualiza o ícone para volume up
          btnVolume.querySelector('i').classList.remove('fa-volume-mute');
          btnVolume.querySelector('i').classList.add('fa-volume-up');
        }
      } catch (error) {
        console.error('Erro ao alternar Volume:', error);
      }
    });
  }

  /* 
    Event Listener para a barra de volume
    Atualiza o volume do player conforme a interação do usuário.
  */
  if (volumeBar) {
    volumeBar.addEventListener('input', async (e) => {
      const volume = parseInt(e.target.value) / 100;
      const player = window.spotifyPlayer;
      if (player) {
        await player.setVolume(volume).then(() => {
          console.log(`Volume set to ${volume * 100}%`);
        });
      }
    });
  }

  /* 
    Event Listener para a barra de progresso
    Atualiza a barra de progresso e o tempo conforme a música avança.
  */
  if (progressBar) {
    progressBar.addEventListener('input', (e) => {
      const progress = parseInt(e.target.value);
      // Implementar funcionalidade de busca se desejado
      // Atualmente, o Spotify Web Playback SDK não suporta busca via API
    });
  }

  /* 
    Atualiza a barra de progresso e o tempo a cada segundo.
    Mantém a sincronização com o estado atual da reprodução.
  */
  setInterval(async () => {
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
          progressBar.value = progress;

          const currentTime = msToTime(data.progress_ms);
          const totalDuration = msToTime(data.item.duration_ms);
          currentTimeEl.textContent = currentTime;
          totalDurationEl.textContent = totalDuration;
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar a barra de progresso:', error);
    }
  }, 1000);
});

/* 
  Função para converter milissegundos para tempo no formato mm:ss.
  Facilita a exibição do tempo atual e total da música.
*/
function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60);

  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return minutes + ":" + seconds;
}

/* 
  Função para tornar elementos arrastáveis (bolinhas nas barras de progresso e volume).
  Permite que o usuário interaja diretamente com as barras.
*/
document.addEventListener('DOMContentLoaded', function() {
    function makeDraggable(handle, progressBar, callback) {
      let isDragging = false;

      handle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        isDragging = true;
      });

      document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;

        const rect = progressBar.getBoundingClientRect();
        let offsetX = e.clientX - rect.left;

        // Limitar o offsetX entre 0 e a largura do progress bar
        offsetX = Math.max(0, Math.min(offsetX, rect.width));

        // Calcular a porcentagem
        const percent = (offsetX / rect.width) * 100;

        // Atualizar a posição da bolinha
        handle.style.left = percent + '%';

        // Atualizar a largura da barra de progresso
        const progress = progressBar.querySelector('.progress-bar');
        progress.style.width = percent + '%';

        // Chamar o callback com a porcentagem
        if (callback) callback(percent);
      });

      document.addEventListener('mouseup', function() {
        if (isDragging) {
          isDragging = false;
        }
      });
    }

    // Selecionar os elementos da barra principal
    const handleMain = document.getElementById('handle-main');
    const progressMain = document.getElementById('progress-main');

    // Selecionar os elementos da barra de volume
    const handleVolume = document.getElementById('handle-volume');
    const progressVolume = document.getElementById('progress-volume');

    // Tornar as bolinhas arrastáveis
    makeDraggable(handleMain, progressMain, function(percent) {
      console.log('Progresso da Música:', percent + '%');
      // Atualize a reprodução da música conforme a porcentagem
      // OBS: O Spotify Web Playback SDK não suporta seek via API
    });

    makeDraggable(handleVolume, progressVolume, function(percent) {
      console.log('Volume:', percent + '%');
      // Atualize o volume conforme a porcentagem
      const player = window.spotifyPlayer;
      if (player) {
        player.setVolume(percent / 100);
      }
    });
});

/* 
  Função para salvar a música atual nos favoritos do usuário.
  Utiliza a API do Spotify para adicionar a faixa à biblioteca.
*/
async function saveCurrentTrack() {
  const token = localStorage.getItem('access_token');
  const trackId = getCurrentTrackId(); // Função que retorna o ID da faixa atual

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

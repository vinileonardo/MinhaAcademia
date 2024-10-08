// player.js
import { AuthModule } from './auth.js';
import { UIUpdater } from './ui.js';

export const PlayerModule = (function() {
    let player;
    let playbackInterval; // Intervalo para atualizar o progresso

    async function initializePlayer(token) {
        return new Promise((resolve, reject) => {
            player = new Spotify.Player({
                name: 'Minha Academia Player',
                getOAuthToken: cb => { cb(token); },
                volume: 0.5
            });

            // Eventos do player
            player.addListener('ready', ({ device_id }) => {
                console.log('Player está pronto com o ID:', device_id);
                localStorage.setItem('device_id', device_id);
                transferPlaybackHere(device_id, token);
                resolve();
            });

            player.addListener('initialization_error', ({ message }) => {
                console.error('Erro de inicialização:', message);
                reject(new Error(message));
            });

            player.addListener('authentication_error', ({ message }) => {
                console.error('Erro de autenticação:', message);
                AuthModule.initiateAuth();
            });

            player.addListener('account_error', ({ message }) => {
                console.error('Erro de conta:', message);
            });

            player.addListener('player_state_changed', state => {
                if (!state) return;

                const currentTrack = state.track_window.current_track;
                const progress_ms = state.position;
                const duration_ms = state.duration;
                const isPlaying = !state.paused;

                UIUpdater.updatePlayerUI(currentTrack, progress_ms, duration_ms);

                // Limpar intervalo anterior, se existir
                if (playbackInterval) {
                    clearInterval(playbackInterval);
                }

                if (isPlaying) {
                    // Iniciar intervalo para atualizar o progresso
                    playbackInterval = setInterval(() => {
                        UIUpdater.updateProgress(state.position + 1000, duration_ms);
                        state.position += 1000;
                    }, 1000);
                } else {
                    // Se estiver pausado, certifique-se de que o progresso não seja atualizado
                    if (playbackInterval) {
                        clearInterval(playbackInterval);
                    }
                }
            });

            // Conectar ao player
            player.connect().then(success => {
                if (success) {
                    console.log('Conectado ao Spotify Player.');
                } else {
                    console.error('Falha ao conectar ao Spotify Player.');
                    reject(new Error('Falha ao conectar ao Spotify Player.'));
                }
            }).catch(error => {
                console.error('Erro ao conectar ao player:', error);
                reject(error);
            });

            // Armazenar o player para uso posterior
            window.spotifyPlayer = player;
        });
    }

    async function transferPlaybackHere(device_id, token) {
        console.log('Transferindo reprodução para o dispositivo:', device_id);
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
                const errorText = await response.text();
                console.error('Erro ao transferir reprodução:', errorText);
            }
        } catch (error) {
            console.error('Erro ao transferir reprodução:', error);
        }
    }

    return {
        initializePlayer
    };
})();

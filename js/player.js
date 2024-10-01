// player.js
import { AuthModule } from './auth.js';
import { UIUpdater } from './ui.js';
import { ControlsModule } from './controls.js';
import { VolumeSeekModule } from './volumeSeek.js';
import { FavoritesModule } from './favorites.js';

export const PlayerModule = (function() {
    let player;

    async function initializePlayer(token) {
        player = new Spotify.Player({
            name: 'Minha Academia Player',
            getOAuthToken: cb => { cb(token); },
            volume: 0.5
        });

        // Eventos do player
        player.addListener('ready', ({ device_id }) => {
            console.log('Player está pronto com o ID:', device_id);
            localStorage.setItem('device_id', device_id);
            transferPlaybackHere(device_id);
        });

        player.addListener('not_ready', ({ device_id }) => {
            console.log('Player não está pronto com o ID:', device_id);
        });

        player.addListener('player_state_changed', state => {
            if (!state) return;
            const currentTrack = state.track_window.current_track;
            const progress_ms = state.position;
            const duration_ms = state.duration;
            UIUpdater.updatePlayerUI(currentTrack, progress_ms, duration_ms);
        });

        // Eventos adicionais para atualizações em tempo real
        player.addListener('initialization_error', ({ message }) => {
            console.error('Erro de inicialização:', message);
        });

        player.addListener('authentication_error', ({ message }) => {
            console.error('Erro de autenticação:', message);
            AuthModule.initiateAuth(); // Reautenticar em caso de erro
        });

        player.addListener('account_error', ({ message }) => {
            console.error('Erro de conta:', message);
        });

        // Conectar ao player
        try {
            const success = await player.connect();
            if (success) {
                console.log('Conectado ao Spotify Player.');
            } else {
                console.error('Falha ao conectar ao Spotify Player.');
            }
        } catch (error) {
            console.error('Erro ao conectar ao player:', error);
        }

        // Armazenar o player para uso posterior
        window.spotifyPlayer = player;

        // Inicializar módulos dependentes
        ControlsModule.init();
        VolumeSeekModule.init();
        FavoritesModule.init();

        // Remover sincronização periódica
        // startPlayerSync(); // Não mais necessário
    }

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
    Removemos a função synchronizePlayer e o setInterval, pois agora utilizaremos os eventos do player para atualizações em tempo real.
    */

    return {
        initializePlayer
    };
})();

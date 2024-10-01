// controls.js
import { debounce } from './utils.js';
import { UIUpdater } from './ui.js';

export const ControlsModule = (function() {
    // Estado para shuffle e repeat
    let isRepeat = false;
    let isShuffle = false;

    // Funções de Controle
    async function play() {
        const playButton = document.getElementById('btn-play-pause');
        playButton.classList.add('loading');
        playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const token = localStorage.getItem('access_token');
        const device_id = localStorage.getItem('device_id');
        if (!device_id) {
            alert('Player não está pronto.');
            resetPlayButton();
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

            if (response.status > 299) {
                const error = await response.json();
                console.error('Erro ao iniciar reprodução:', error);
                resetPlayButton();
            } else {
                console.log('Reprodução iniciada.');
                playButton.innerHTML = '<i class="fas fa-pause-circle fa-2x" id="icon-play-pause"></i>';
            }
        } catch (error) {
            console.error('Erro ao iniciar reprodução:', error);
            resetPlayButton();
        } finally {
            playButton.classList.remove('loading');
        }
    }

    async function pause() {
        const pauseButton = document.getElementById('btn-play-pause');
        pauseButton.classList.add('loading');
        pauseButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const token = localStorage.getItem('access_token');
        const device_id = localStorage.getItem('device_id');
        if (!device_id) {
            alert('Player não está pronto.');
            resetPauseButton();
            return;
        }

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${device_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });

            if (response.status > 299) {
                const error = await response.json();
                console.error('Erro ao pausar reprodução:', error);
                resetPauseButton();
            } else {
                console.log('Reprodução pausada.');
                pauseButton.innerHTML = '<i class="fas fa-play-circle fa-2x" id="icon-play-pause"></i>';
            }
        } catch (error) {
            console.error('Erro ao pausar reprodução:', error);
            resetPauseButton();
        } finally {
            pauseButton.classList.remove('loading');
        }
    }

    function resetPlayButton() {
        const playButton = document.getElementById('btn-play-pause');
        playButton.innerHTML = '<i class="fas fa-play-circle fa-2x" id="icon-play-pause"></i>';
    }

    function resetPauseButton() {
        const pauseButton = document.getElementById('btn-play-pause');
        pauseButton.innerHTML = '<i class="fas fa-pause-circle fa-2x" id="icon-play-pause"></i>';
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
                // UI será atualizada pelo evento player_state_changed
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
                // UI será atualizada pelo evento player_state_changed
            } else {
                const error = await response.json();
                console.error('Erro ao retroceder faixa:', error);
            }
        } catch (error) {
            console.error('Erro ao retroceder faixa:', error);
        }
    }

    async function toggleShuffle() {
        const token = localStorage.getItem('access_token');
        const device_id = localStorage.getItem('device_id');

        if (!device_id) {
            alert('Player não está pronto.');
            return;
        }

        try {
            isShuffle = !isShuffle;
            const shuffleState = isShuffle ? 'true' : 'false';

            const response = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${shuffleState}&device_id=${device_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 204) {
                console.log(`Shuffle ${isShuffle ? 'On' : 'Off'}`);
                UIUpdater.updateShuffleUI(isShuffle);
            } else {
                const error = await response.json();
                console.error('Erro ao alternar Shuffle:', error);
            }
        } catch (error) {
            console.error('Erro ao alternar Shuffle:', error);
        }
    }

    async function toggleRepeat() {
        const token = localStorage.getItem('access_token');
        const device_id = localStorage.getItem('device_id');

        if (!device_id) {
            alert('Player não está pronto.');
            return;
        }

        try {
            isRepeat = !isRepeat;
            const repeatState = isRepeat ? 'track' : 'off';

            const response = await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${repeatState}&device_id=${device_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 204) {
                console.log(`Repeat ${isRepeat ? 'On' : 'Off'}`);
                UIUpdater.updateRepeatUI(isRepeat);
            } else {
                const error = await response.json();
                console.error('Erro ao alternar Repeat:', error);
            }
        } catch (error) {
            console.error('Erro ao alternar Repeat:', error);
        }
    }

    async function togglePlayPause() {
        const token = localStorage.getItem('access_token');
        const device_id = localStorage.getItem('device_id');

        if (!device_id) {
            alert('Player não está pronto.');
            return;
        }

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 204) {
                await play();
            } else if (response.status === 200) {
                const data = await response.json();
                if (data.is_playing) {
                    await pause();
                } else {
                    await play();
                }
            } else {
                console.error('Erro ao verificar o estado do player:', response.status);
            }
        } catch (error) {
            console.error('Erro ao alternar Play/Pause:', error);
        }
    }

    function setupEventListeners() {
        const btnShuffle = document.getElementById('btn-shuffle');
        const btnRepeat = document.getElementById('btn-repeat');
        const btnNext = document.getElementById('btn-next');
        const btnPrev = document.getElementById('btn-prev');
        const btnPlayPause = document.getElementById('btn-play-pause');

        btnShuffle.addEventListener('click', debounce(toggleShuffle, 300));
        btnRepeat.addEventListener('click', debounce(toggleRepeat, 300));
        btnNext.addEventListener('click', debounce(nextTrack, 300));
        btnPrev.addEventListener('click', debounce(previousTrack, 300));
        btnPlayPause.addEventListener('click', debounce(togglePlayPause, 300));
    }

    function init() {
        setupEventListeners();
    }

    return {
        init
    };
})();

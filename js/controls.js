// controls.js
import { debounce } from './utils.js';
import { UIUpdater } from './ui.js';

export const ControlsModule = (function() {
    // Estado para shuffle e repeat
    let isRepeat = false;
    let isShuffle = false;

    // Função auxiliar para obter a mensagem de erro da resposta
    async function getErrorMessage(response) {
        let errorMessage = '';
        try {
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                if (errorData && errorData.error && errorData.error.message) {
                    errorMessage = errorData.error.message;
                } else {
                    errorMessage = JSON.stringify(errorData);
                }
            } else {
                errorMessage = await response.text();
            }
        } catch (e) {
            errorMessage = 'Não foi possível obter a mensagem de erro';
        }
        return errorMessage;
    }

    // Funções de Controle (Definidas como declarações de função)
    async function play() {
        const playButton = document.getElementById('btn-play-pause');
        if (!playButton) {
            console.error('Botão de play/pause não encontrado.');
            return;
        }
        playButton.classList.add('loading');
        playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const token = localStorage.getItem('access_token');
        let device_id = localStorage.getItem('device_id');

        if (!device_id) {
            console.error('Player não está pronto. Dispositivo não encontrado.');
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

            if (response.status === 204) {
                console.log('Reprodução iniciada.');
                playButton.innerHTML = '<i class="fas fa-pause-circle fa-2x" id="icon-play-pause"></i>';
            } else {
                const errorMessage = await getErrorMessage(response);
                console.error(`Erro ao iniciar reprodução: ${response.status} ${response.statusText} - ${errorMessage}`);
                resetPlayButton();
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
        if (!pauseButton) {
            console.error('Botão de play/pause não encontrado.');
            return;
        }
        pauseButton.classList.add('loading');
        pauseButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const token = localStorage.getItem('access_token');
        let device_id = localStorage.getItem('device_id');

        if (!device_id) {
            console.error('Player não está pronto.');
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

            if (response.status === 204) {
                console.log('Reprodução pausada.');
                pauseButton.innerHTML = '<i class="fas fa-play-circle fa-2x" id="icon-play-pause"></i>';
            } else {
                const errorMessage = await getErrorMessage(response);
                console.error(`Erro ao pausar reprodução: ${response.status} ${response.statusText} - ${errorMessage}`);
                resetPauseButton();
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
        if (playButton) {
            playButton.innerHTML = '<i class="fas fa-play-circle fa-2x" id="icon-play-pause"></i>';
        }
    }

    function resetPauseButton() {
        const pauseButton = document.getElementById('btn-play-pause');
        if (pauseButton) {
            pauseButton.innerHTML = '<i class="fas fa-pause-circle fa-2x" id="icon-play-pause"></i>';
        }
    }

    async function nextTrack() {
        const token = localStorage.getItem('access_token');
        let device_id = localStorage.getItem('device_id');

        if (!device_id) {
            console.error('Player não está pronto.');
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
                const errorMessage = await getErrorMessage(response);
                console.error(`Erro ao avançar faixa: ${response.status} ${response.statusText} - ${errorMessage}`);
            }
        } catch (error) {
            console.error('Erro ao avançar faixa:', error);
        }
    }

    async function previousTrack() {
        const token = localStorage.getItem('access_token');
        let device_id = localStorage.getItem('device_id');

        if (!device_id) {
            console.error('Player não está pronto.');
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
                const errorMessage = await getErrorMessage(response);
                console.error(`Erro ao retroceder faixa: ${response.status} ${response.statusText} - ${errorMessage}`);
            }
        } catch (error) {
            console.error('Erro ao retroceder faixa:', error);
        }
    }

    async function toggleShuffle() {
        const token = localStorage.getItem('access_token');
        let device_id = localStorage.getItem('device_id');

        if (!device_id) {
            console.error('Player não está pronto.');
            return;
        }

        try {
            isShuffle = !isShuffle;
            const shuffleState = isShuffle;

            const response = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${shuffleState}&device_id=${device_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 204) {
                console.log(`Shuffle ${isShuffle ? 'ativado' : 'desativado'}.`);
                UIUpdater.updateShuffleUI(isShuffle);
            } else {
                const errorMessage = await getErrorMessage(response);
                console.error(`Erro ao alternar Shuffle: ${response.status} ${response.statusText} - ${errorMessage}`);
                // Reverter o estado de shuffle em caso de erro
                isShuffle = !isShuffle;
            }
        } catch (error) {
            console.error('Erro ao alternar Shuffle:', error);
            // Reverter o estado de shuffle em caso de erro
            isShuffle = !isShuffle;
        }
    }

    async function toggleRepeat() {
        const token = localStorage.getItem('access_token');
        let device_id = localStorage.getItem('device_id');

        if (!device_id) {
            console.error('Player não está pronto.');
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
                console.log(`Repeat ${isRepeat ? 'ativado' : 'desativado'}.`);
                UIUpdater.updateRepeatUI(isRepeat);
            } else {
                const errorMessage = await getErrorMessage(response);
                console.error(`Erro ao alternar Repeat: ${response.status} ${response.statusText} - ${errorMessage}`);
                // Reverter o estado de repeat em caso de erro
                isRepeat = !isRepeat;
            }
        } catch (error) {
            console.error('Erro ao alternar Repeat:', error);
            // Reverter o estado de repeat em caso de erro
            isRepeat = !isRepeat;
        }
    }

    async function togglePlayPause() {
        const token = localStorage.getItem('access_token');
        let device_id = localStorage.getItem('device_id');

        if (!device_id) {
            console.error('Player não está pronto.');
            return;
        }

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 200) {
                const data = await response.json();
                if (data.is_playing) {
                    await pause();
                } else {
                    await play();
                }
            } else if (response.status === 204) {
                // Nenhuma reprodução está ocorrendo atualmente
                await play();
            } else {
                const errorMessage = await getErrorMessage(response);
                console.error(`Erro ao verificar o estado do player: ${response.status} ${response.statusText} - ${errorMessage}`);
            }
        } catch (error) {
            console.error('Erro ao alternar Play/Pause:', error);
        }
    }

    // Definir setupEventListeners após as funções que ele usa
    function setupEventListeners() {
        const btnShuffle = document.getElementById('btn-shuffle');
        const btnRepeat = document.getElementById('btn-repeat');
        const btnNext = document.getElementById('btn-next');
        const btnPrev = document.getElementById('btn-prev');
        const btnPlayPause = document.getElementById('btn-play-pause');

        if (btnShuffle) {
            btnShuffle.addEventListener('click', debounce(toggleShuffle, 300));
        } else {
            console.error('Botão de shuffle não encontrado.');
        }

        if (btnRepeat) {
            btnRepeat.addEventListener('click', debounce(toggleRepeat, 300));
        } else {
            console.error('Botão de repeat não encontrado.');
        }

        if (btnNext) {
            btnNext.addEventListener('click', debounce(nextTrack, 300));
        } else {
            console.error('Botão de próxima faixa não encontrado.');
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', debounce(previousTrack, 300));
        } else {
            console.error('Botão de faixa anterior não encontrado.');
        }

        if (btnPlayPause) {
            btnPlayPause.addEventListener('click', debounce(togglePlayPause, 300));
        } else {
            console.error('Botão de play/pause não encontrado.');
        }
    }

    // Função de inicialização
    function init() {
        setupEventListeners();
    }

    return {
        init
    };
})();

// volumeSeek.js
import { debounce } from './utils.js';
import { UIUpdater } from './ui.js';

export const VolumeSeekModule = (function() {
    const SeekModule = (function() {
        const handleMain = document.getElementById('handle-main');
        const progressMain = document.getElementById('progress-main');
        const progressBarMain = document.getElementById('progress-bar');
        const currentTimeEl = document.getElementById('current-time');
        const totalDurationEl = document.getElementById('total-duration');

        function msToTime(duration) {
            const seconds = Math.floor((duration / 1000) % 60);
            const minutes = Math.floor((duration / (1000 * 60)) % 60);
            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }

        function updateUI(handle, progressBar, percent) {
            handle.style.left = `${percent}%`;
            progressBar.style.width = `${percent}%`;
        }

        async function setSeek(percent) {
            const token = localStorage.getItem('access_token');
            const device_id = localStorage.getItem('device_id');
            if (!device_id) return;

            try {
                const currentTrack = await getCurrentTrack();
                if (currentTrack) {
                    const position_ms = (percent / 100) * currentTrack.duration_ms;
                    const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(position_ms)}&device_id=${device_id}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.status === 204) {
                        console.log('Seek realizado com sucesso.');
                        // A UI será atualizada pelo evento player_state_changed
                    } else {
                        const error = await response.json();
                        console.error('Erro ao realizar seek:', error);
                    }
                }
            } catch (error) {
                console.error('Erro ao realizar seek:', error);
            }
        }

        async function getCurrentTrack() {
            const token = localStorage.getItem('access_token');
            const device_id = localStorage.getItem('device_id');
            if (!device_id) return null;

            try {
                const response = await fetch(`https://api.spotify.com/v1/me/player/currently-playing?market=BR`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 200) {
                    const data = await response.json();
                    if (data && data.item) {
                        return data.item;
                    }
                }
                return null;
            } catch (error) {
                console.error('Erro ao obter a faixa atual:', error);
                return null;
            }
        }

        function handleMouseDown(e) {
            e.preventDefault();
            isDraggingSeek = true;
        }

        let isDraggingSeek = false;

        const throttledSeekUpdate = debounce(setSeek, 300);

        function handleMouseMove(e) {
            if (!isDraggingSeek) return;

            const rect = progressMain.getBoundingClientRect();
            let offsetX = e.clientX - rect.left;
            offsetX = Math.max(0, Math.min(offsetX, rect.width));
            const percent = (offsetX / rect.width) * 100;

            updateUI(handleMain, progressBarMain, percent);
            throttledSeekUpdate(percent);

            const tooltipText = `${Math.round(percent)}%`;
            const tooltipX = e.clientX;
            const tooltipY = rect.top - 10;
            UIUpdater.showTooltip(tooltipX, tooltipY, tooltipText);
        }

        function handleMouseUp() {
            if (isDraggingSeek) {
                isDraggingSeek = false;
                UIUpdater.hideTooltip();
            }
        }

        async function handleClick(e) {
            const rect = e.currentTarget.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const percent = (offsetX / rect.width) * 100;

            updateUI(handleMain, progressBarMain, percent);
            await setSeek(percent);
        }

        function init() {
            const handle = handleMain;
            const progress = progressMain;

            handle.addEventListener('mousedown', handleMouseDown);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            progress.addEventListener('click', handleClick);

            // Removido setInterval para sincronização periódica
            // Atualizações serão gerenciadas pelos eventos do player

            // Carrega o estado anterior do seek
            const savedSeekPercent = parseFloat(localStorage.getItem('seek_percent'));
            if (!isNaN(savedSeekPercent)) {
                updateUI(handleMain, progressBarMain, savedSeekPercent);
            }
        }

        return {
            init
        };
    })();

    const VolumeModule = (function() {
        const handleVolume = document.getElementById('handle-volume');
        const progressVolume = document.getElementById('progress-volume');
        const volumeBar = document.getElementById('volume-bar');
        const btnVolume = document.getElementById('btn-volume');

        const tooltipVolume = document.createElement('div');
        tooltipVolume.classList.add('tooltip-volume');
        document.body.appendChild(tooltipVolume);

        let isDraggingVolume = false;

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
                    localStorage.setItem('volume_percent', percent);
                } catch (error) {
                    console.error('Erro ao atualizar volume:', error);
                }
            }
        }

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

        function debounce(func, delay) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            }
        }

        function showTooltip(x, y, text) {
            tooltipVolume.style.left = `${x}px`;
            tooltipVolume.style.top = `${y}px`;
            tooltipVolume.textContent = text;
            tooltipVolume.style.display = 'block';
        }

        function hideTooltip() {
            tooltipVolume.style.display = 'none';
        }

        function handleMouseDown(e) {
            e.preventDefault();
            isDraggingVolume = true;
        }

        const throttledVolumeUpdate = debounce(performVolumeUpdate, 300);

        function handleMouseMove(e) {
            if (!isDraggingVolume) return;

            const rect = progressVolume.getBoundingClientRect();
            let offsetX = e.clientX - rect.left;
            offsetX = Math.max(0, Math.min(offsetX, rect.width));
            const percent = (offsetX / rect.width) * 100;

            updateUI(handleVolume, volumeBar, percent);
            throttledVolumeUpdate(percent);

            const tooltipText = `${Math.round(percent)}%`;
            const tooltipX = e.clientX;
            const tooltipY = rect.top - 10;
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
                    await player.setVolume(0);
                    updateUI(handleVolume, volumeBar, 0);
                    localStorage.setItem('volume_percent', 0);
                    btnVolume.querySelector('i').classList.remove('fa-volume-up');
                    btnVolume.querySelector('i').classList.add('fa-volume-mute');
                } else {
                    const defaultVolume = 50;
                    await player.setVolume(defaultVolume / 100);
                    updateUI(handleVolume, volumeBar, defaultVolume);
                    localStorage.setItem('volume_percent', defaultVolume);
                    btnVolume.querySelector('i').classList.remove('fa-volume-mute');
                    btnVolume.querySelector('i').classList.add('fa-volume-up');
                }
            } catch (error) {
                console.error('Erro ao alternar Volume:', error);
            }
        }

        function setupEventListeners() {
            handleVolume.addEventListener('mousedown', handleMouseDown);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            progressVolume.addEventListener('click', handleClick);

            if (btnVolume) {
                btnVolume.addEventListener('click', debounce(toggleMute, 300));
            }
        }

        async function init() {
            setupEventListeners();

            const savedVolumePercent = parseFloat(localStorage.getItem('volume_percent'));
            if (!isNaN(savedVolumePercent)) {
                updateUI(handleVolume, volumeBar, savedVolumePercent);
                await performVolumeUpdate(savedVolumePercent);
            }
        }

        return {
            init
        };
    })();

    function init() {
        SeekModule.init();
        VolumeModule.init();
    }

    return {
        init
    };
})();

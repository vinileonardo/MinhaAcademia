// volumeSeek.js
import { debounce } from './utils.js';
import { UIUpdater } from './ui.js';

export const VolumeSeekModule = (function() {
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
        } else {
            console.error('Player não está disponível.');
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
                if (btnVolume) {
                    const icon = btnVolume.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-volume-up');
                        icon.classList.add('fa-volume-mute');
                    }
                }
            } else {
                const defaultVolume = 20;
                await player.setVolume(defaultVolume / 100);
                updateUI(handleVolume, volumeBar, defaultVolume);
                localStorage.setItem('volume_percent', defaultVolume);
                if (btnVolume) {
                    const icon = btnVolume.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-volume-mute');
                        icon.classList.add('fa-volume-up');
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao alternar Volume:', error);
        }
    }

    function setupEventListeners() {
        if (handleVolume) {
            handleVolume.addEventListener('mousedown', handleMouseDown);
        } else {
            console.error('Elemento #handle-volume não encontrado no DOM.');
        }

        if (progressVolume) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            progressVolume.addEventListener('click', handleClick);
        } else {
            console.error('Elemento #progress-volume não encontrado no DOM.');
        }

        if (btnVolume) {
            btnVolume.addEventListener('click', debounce(toggleMute, 300));
        } else {
            console.error('Elemento #btn-volume não encontrado no DOM.');
        }
    }

    async function init() {
        setupEventListeners();

        const savedVolumePercent = parseFloat(localStorage.getItem('volume_percent'));
        if (!isNaN(savedVolumePercent)) {
            if (handleVolume && volumeBar && progressVolume) {
                updateUI(handleVolume, volumeBar, savedVolumePercent);
                await performVolumeUpdate(savedVolumePercent);
            } else {
                console.error('Elementos necessários para o VolumeModule não estão presentes.');
            }
        }
    }

    return {
        init
    };
})();

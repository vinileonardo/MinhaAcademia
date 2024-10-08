// ui.js
export const UIUpdater = (function() {
    const tooltipVolume = document.querySelector('.tooltip-volume');

    function updatePlayerUI(track, progress_ms, duration_ms) {
        const currentTrackElement = document.getElementById('current-track');
        const artistNameElement = document.getElementById('artist-name');
        const albumArtElement = document.getElementById('album-art');
        const progressBarCircle = document.getElementById('progress-bar-circle');
        const currentTimeEl = document.getElementById('current-time');
        const totalDurationEl = document.getElementById('total-duration');

        if (track) {
            currentTrackElement.textContent = `${track.name}`;
            currentTrackElement.setAttribute('data-id', track.id);
            artistNameElement.textContent = track.artists.map(artist => artist.name).join(', ');
            albumArtElement.src = track.album.images[2]?.url || track.album.images[0]?.url || '';

            if (progress_ms !== undefined && duration_ms !== undefined) {
                const percent = (progress_ms / duration_ms);
                const dashOffset = 283 * (1 - percent);
                progressBarCircle.style.strokeDashoffset = dashOffset;

                currentTimeEl.textContent = msToTime(progress_ms);
                totalDurationEl.textContent = msToTime(duration_ms);
            }
        } else {
            currentTrackElement.textContent = 'Nenhuma música reproduzindo.';
            currentTrackElement.removeAttribute('data-id');
            artistNameElement.textContent = '';
            albumArtElement.src = '';
            progressBarCircle.style.strokeDashoffset = 283;
            currentTimeEl.textContent = '0:00';
            totalDurationEl.textContent = '0:00';
        }
    }

    function updateProgress(progress_ms, duration_ms) {
        const progressBarCircle = document.getElementById('progress-bar-circle');
        const currentTimeEl = document.getElementById('current-time');

        if (progress_ms !== undefined && duration_ms !== undefined) {
            const percent = (progress_ms / duration_ms);
            const dashOffset = 283 * (1 - percent);
            progressBarCircle.style.strokeDashoffset = dashOffset;

            currentTimeEl.textContent = msToTime(progress_ms);
        }
    }

    function updateShuffleUI(isShuffle) {
        const shuffleIcon = document.querySelector('#btn-shuffle i');
        if (isShuffle) {
            shuffleIcon.classList.add('active-shuffle');
            shuffleIcon.style.color = '#1DB954';
        } else {
            shuffleIcon.classList.remove('active-shuffle');
            shuffleIcon.style.color = '#b3b3b3';
        }
    }

    function updateRepeatUI(isRepeat) {
        const repeatIcon = document.querySelector('#btn-repeat i');
        if (isRepeat) {
            repeatIcon.classList.add('active-repeat');
            repeatIcon.style.color = '#1DB954';
        } else {
            repeatIcon.classList.remove('active-repeat');
            repeatIcon.style.color = '#b3b3b3';
        }
    }

    function updateFavoriteIcon(isFavorited) {
        const favoriteIcon = document.querySelector('#btn-favorite i');
        if (isFavorited) {
            favoriteIcon.classList.remove('far');
            favoriteIcon.classList.add('fas');
        } else {
            favoriteIcon.classList.remove('fas');
            favoriteIcon.classList.add('far');
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

    function msToTime(duration) {
        let seconds = Math.floor((duration / 1000) % 60),
            minutes = Math.floor((duration / (1000 * 60)) % 60);

        minutes = (minutes < 10) ? minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;

        return minutes + ":" + seconds;
    }

    return {
        updatePlayerUI,
        updateProgress,
        updateShuffleUI,
        updateRepeatUI,
        updateFavoriteIcon,
        showTooltip,
        hideTooltip
    };
})();

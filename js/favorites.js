// favorites.js
import { debounce } from './utils.js';
import { UIUpdater } from './ui.js';

export const FavoritesModule = (function() {
    async function toggleFavorite() {
        const token = localStorage.getItem('access_token');
        const trackId = getCurrentTrackId();

        if (!trackId) {
            alert('Nenhuma faixa está atualmente reproduzindo.');
            return;
        }

        try {
            // Verificar se a faixa já está favoritada
            const checkResponse = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const contains = await checkResponse.json();
            const isFavorited = contains[0];

            if (isFavorited) {
                // Remover dos favoritos
                const removeResponse = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (removeResponse.status === 200) {
                    alert('Faixa removida dos favoritos!');
                    UIUpdater.updateFavoriteIcon(false);
                }
            } else {
                // Adicionar aos favoritos
                const addResponse = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                });
                if (addResponse.status === 200 || addResponse.status === 204) {
                    alert('Faixa adicionada aos favoritos!');
                    UIUpdater.updateFavoriteIcon(true);
                }
            }
        } catch (error) {
            console.error('Erro ao alternar favoritos:', error);
            alert('Ocorreu um erro ao tentar alternar os favoritos.');
        }
    }

    async function updateFavoriteStatus() {
        const token = localStorage.getItem('access_token');
        const trackId = getCurrentTrackId();

        if (!trackId) return;

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const contains = await response.json();
            const isFavorited = contains[0];
            UIUpdater.updateFavoriteIcon(isFavorited);
        } catch (error) {
            console.error('Erro ao verificar status de favorito:', error);
        }
    }

    function getCurrentTrackId() {
        const currentTrackElement = document.getElementById('current-track');
        return currentTrackElement.getAttribute('data-id') || null;
    }

    function setupEventListeners() {
        const btnFavorite = document.getElementById('btn-favorite');
        btnFavorite.addEventListener('click', debounce(async (e) => {
            e.preventDefault();
            await toggleFavorite();
        }, 300));
    }

    async function init() {
        setupEventListeners();
        updateFavoriteStatus();
    }

    return {
        init
    };
})();

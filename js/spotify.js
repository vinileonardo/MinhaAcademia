// app.js
import { AuthModule } from './auth.js';
import { PlayerModule } from './player.js';
import { ControlsModule } from './controls.js';
import { VolumeSeekModule } from './volumeSeek.js';
import { FavoritesModule } from './favorites.js';
import { UIUpdater } from './ui.js';

export async function initializeApp() {
    // Lida com o redirecionamento de autenticação
    await AuthModule.handleRedirect();

    if (AuthModule.isAuthenticated()) {
        const token = localStorage.getItem('access_token');
        await PlayerModule.initializePlayer(token);
    } else {
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    }

    // Inicializa outros módulos que dependem do player estar pronto
    // Já inicializados dentro PlayerModule
}

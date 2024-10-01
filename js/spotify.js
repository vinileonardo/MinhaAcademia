// app.js
import { AuthModule } from './auth.js';
import { PlayerModule } from './player.js';
import { ControlsModule } from './controls.js';
import { VolumeSeekModule } from './volumeSeek.js';
import { FavoritesModule } from './favorites.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Lida com o redirecionamento de autenticação
    await AuthModule.handleRedirect();

    if (AuthModule.isAuthenticated()) {
        const token = localStorage.getItem('access_token');
        await PlayerModule.initializePlayer(token);
    } else {
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    }

    // Inicializa outros módulos
    // Note que alguns módulos já são inicializados dentro de player.js
    // Então, pode não ser necessário inicializá-los aqui novamente
    // ControlsModule.init();
    // VolumeSeekModule.init();
    // FavoritesModule.init();
});

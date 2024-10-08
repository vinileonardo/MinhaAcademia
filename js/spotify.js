// app.js
import { AuthModule } from './auth.js';
import { PlayerModule } from './player.js';
import { ControlsModule } from './controls.js';
import { VolumeSeekModule } from './volumeSeek.js';
import { FavoritesModule } from './favorites.js';
import { UIUpdater } from './ui.js';

export async function initializeApp() {
    console.log('Inicializando aplicação Spotify');

    // Registrar evento no botão flutuante do Spotify
    const spotifyBtn = document.getElementById('spotifyBtn');
    if (spotifyBtn) {
        spotifyBtn.addEventListener('click', function() {
            console.log('Botão Spotify clicado');
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
        });
    } else {
        console.log('Botão Spotify NÃO encontrado');
    }

    // Registrar evento no botão de login dentro do modal
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        console.log('Botão de login encontrado');
        loginButton.addEventListener('click', function() {
            console.log('Botão "Entrar com Spotify" clicado');
            alert('Botão clicado!'); // Teste para verificar o evento
            AuthModule.initiateAuth();
        });
    } else {
        console.log('Botão de login NÃO encontrado');
    }

    // Lida com o redirecionamento de autenticação
    await AuthModule.handleRedirect();

    if (AuthModule.isAuthenticated()) {
        console.log('Usuário autenticado');
        const token = localStorage.getItem('access_token');
        await PlayerModule.initializePlayer(token);
    } else {
        console.log('Usuário NÃO autenticado');
    }
}

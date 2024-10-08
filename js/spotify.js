// app.js
import { AuthModule } from './auth.js';
import { PlayerModule } from './player.js';
import { ControlsModule } from './controls.js';
import { VolumeSeekModule } from './volumeSeek.js';
import { FavoritesModule } from './favorites.js';
import { UIUpdater } from './ui.js';

export async function initializeApp() {
    console.log('Inicializando aplicação Spotify');

    // Verifica se o usuário está autenticado
    const isAuthenticated = AuthModule.isAuthenticated();
    console.log('Usuário autenticado:', isAuthenticated);

    // Se o usuário estiver autenticado, inicializa o player imediatamente
    if (isAuthenticated) {
        const token = localStorage.getItem('access_token');
        if (token) {
            await PlayerModule.initializePlayer(token);
            showPlayer(); // Exibe o player
            scheduleTokenRefresh(); // Agendar a atualização do token
        } else {
            console.log('Token de acesso não encontrado.');
        }
    }

    // Registrar evento no botão flutuante do Spotify
    const spotifyBtn = document.getElementById('spotifyBtn');
    if (spotifyBtn) {
        spotifyBtn.addEventListener('click', function() {
            console.log('Botão Spotify clicado');
            if (AuthModule.isAuthenticated()) {
                console.log('Usuário autenticado. Exibindo player.');
                showPlayer(); // Exibe o player
            } else {
                console.log('Usuário NÃO autenticado. Exibindo modal de login.');
                const loginModalElement = document.getElementById('loginModal');
                if (loginModalElement) {
                    const loginModal = new bootstrap.Modal(loginModalElement);
                    loginModal.show();
                } else {
                    console.error('Modal de login não encontrado no DOM.');
                }
            }
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
            // Remover o alert de teste
            // alert('Botão clicado!'); // Teste para verificar o evento
            AuthModule.initiateAuth();
        });
    } else {
        console.log('Botão de login NÃO encontrado');
    }

    // Lida com o redirecionamento de autenticação
    await AuthModule.handleRedirect();

    if (AuthModule.isAuthenticated()) {
        console.log('Usuário autenticado após redirecionamento');
        const token = localStorage.getItem('access_token');
        if (token) {
            await PlayerModule.initializePlayer(token);
            showPlayer(); // Exibe o player
            scheduleTokenRefresh(); // Agendar a atualização do token
            // Inicializar os módulos dependentes após o player estar pronto
            ControlsModule.init();
            VolumeSeekModule.init();
            FavoritesModule.init();
        }
    } else {
        console.log('Usuário NÃO autenticado após redirecionamento');
    }
}

/**
 * Função para exibir o player.
 * Remove o modal de login (se estiver visível) e exibe o footer do player.
 */
function showPlayer() {
    console.log('Chamando showPlayer');
    // Esconde o modal de login, se estiver aberto
    const loginModalElement = document.getElementById('loginModal');
    if (loginModalElement) {
        const loginModal = bootstrap.Modal.getInstance(loginModalElement);
        if (loginModal) {
            loginModal.hide();
        }
    }

    // Exibe o footer do player
    const spotifyPlayer = document.getElementById('spotify-player');
    if (spotifyPlayer) {
        spotifyPlayer.style.display = 'block';
    } else {
        console.log('Elemento do player NÃO encontrado.');
    }
}

/**
 * Função para agendar a atualização do token
 */
async function scheduleTokenRefresh() {
    const expiresAt = localStorage.getItem('expires_at');
    if (!expiresAt) {
        console.log('expires_at não encontrado. Não é possível agendar a atualização do token.');
        return;
    }

    const currentTime = new Date().getTime();
    const timeLeft = expiresAt - currentTime;

    if (timeLeft <= 0) {
        console.log('O token já expirou. Atualizando imediatamente.');
        await AuthModule.refreshAccessToken();
        scheduleTokenRefresh(); // Reagendar após a atualização
    } else {
        // Agendar a atualização 5 minutos antes do token expirar
        const refreshTime = timeLeft - 5 * 60 * 1000; // 5 minutos antes
        if (refreshTime <= 0) {
            console.log('Tempo para atualização já passou. Atualizando imediatamente.');
            await AuthModule.refreshAccessToken();
            scheduleTokenRefresh(); // Reagendar após a atualização
        } else {
            console.log(`Agendando atualização do token em ${refreshTime / 1000} segundos.`);
            setTimeout(async () => {
                await AuthModule.refreshAccessToken();
                scheduleTokenRefresh(); // Reagendar após a atualização
            }, refreshTime);
        }
    }
}

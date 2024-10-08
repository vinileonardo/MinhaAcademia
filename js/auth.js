// auth.js
export const AuthModule = (function() {
    const clientId = 'bf525d89f2bb4471bba89160674e9975'; // Substitua pelo seu Client ID
    const redirectUri = 'https://vinileonardo.github.io/MinhaAcademia/';
    const scopes = [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-modify-playback-state',
        'user-read-playback-state',
        'user-read-recently-played',
        'playlist-read-private',
        'playlist-read-collaborative',
    ];    

    function generateCodeVerifier(length = 128) {
        const array = new Uint8Array(Math.ceil(length * 3 / 4));
        window.crypto.getRandomValues(array);
        let codeVerifier = btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        codeVerifier = codeVerifier.substring(0, length);
        console.log('Code Verifier:', codeVerifier);
        return codeVerifier;
    }

    async function generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        console.log('Code Challenge:', codeChallenge);
        return codeChallenge;
    }

    function generateRandomString(length) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    async function initiateAuth() {
        console.log('Iniciando autenticação com Spotify');
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state = generateRandomString(16);
        const scope = scopes.join(' ');

        sessionStorage.setItem('code_verifier', codeVerifier);
        sessionStorage.setItem('state', state);

        const args = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            scope: scope,
            redirect_uri: redirectUri,
            state: state,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
        });

        console.log('URL de Autorização:', `https://accounts.spotify.com/authorize?${args.toString()}`);
        window.location = `https://accounts.spotify.com/authorize?${args.toString()}`;
    }

    function getUrlParams() {
        const params = {};
        window.location.search.replace(/^\?/, '').split('&').forEach(param => {
            const [key, value] = param.split('=');
            params[key] = decodeURIComponent(value);
        });
        return params;
    }

    async function exchangeCodeForToken(code) {
        console.log('Trocando código por token');
        const codeVerifier = sessionStorage.getItem('code_verifier');
        const storedState = sessionStorage.getItem('state');

        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier,
        });

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString(),
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Erro na resposta da API:', errorData);
                return;
            }

            const data = await response.json();

            if (data.access_token) {
                console.log('Token obtido com sucesso');
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                const expiresAt = new Date().getTime() + data.expires_in * 1000;
                localStorage.setItem('expires_at', expiresAt);

                window.history.replaceState({}, document.title, redirectUri);

                const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (loginModal) {
                    loginModal.hide();
                }

                return data.access_token;
            } else {
                console.error('Erro ao obter o token:', data);
            }
        } catch (error) {
            console.error('Erro na requisição do token:', error);
        }
    }

    async function refreshAccessToken() {
        console.log('Atualizando token de acesso');
        const refresh_token = localStorage.getItem('refresh_token');
        if (!refresh_token) {
            console.error('Refresh token não encontrado');
            return;
        }

        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refresh_token,
            client_id: clientId,
        });

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString(),
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Erro na resposta da API ao atualizar token:', errorData);
                return;
            }

            const data = await response.json();

            if (data.access_token) {
                console.log('Token atualizado com sucesso');
                localStorage.setItem('access_token', data.access_token);
                // Spotify não sempre retorna um novo refresh_token
                if (data.refresh_token) {
                    localStorage.setItem('refresh_token', data.refresh_token);
                }
                const expiresAt = new Date().getTime() + data.expires_in * 1000;
                localStorage.setItem('expires_at', expiresAt);
                return data.access_token;
            } else {
                console.error('Erro ao atualizar o token:', data);
            }
        } catch (error) {
            console.error('Erro na requisição de atualização do token:', error);
        }
    }

    function isAuthenticated() {
        const token = localStorage.getItem('access_token');
        const expiresAt = localStorage.getItem('expires_at');
        console.log('Verificando autenticação. Token:', token, 'Expires At:', expiresAt);
        return token && new Date().getTime() < expiresAt;
    }

    async function handleRedirect() {
        const params = getUrlParams();
        if (params.code) {
            console.log('Código de autorização encontrado:', params.code);
            const storedState = sessionStorage.getItem('state');
            if (params.state !== storedState) {
                console.error('State mismatch. Esperado:', storedState, 'Recebido:', params.state);
                return;
            }
            await exchangeCodeForToken(params.code);
        } else {
            console.log('Nenhum código de autorização encontrado na URL');
        }
    }

    return {
        initiateAuth,
        isAuthenticated,
        handleRedirect,
        refreshAccessToken, // Adicionado
        clientId,
        redirectUri,
        scopes,
    };
})();

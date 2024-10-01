// Sua API Key do YouTube Data API v3
const API_KEY = 'AIzaSyDyQMriHzOJM4Bc76Hc8coJWM4iRJju-V4'; // Substitua por sua API Key

// Variáveis globais para armazenar dados temporários
let exercicioTemp = {};
let diaTemp = '';
let indiceTemp = null;

// Função para abrir o modal de adicionar/editar exercício
function abrirModal(dia, indice = null) {
  $('#modalExercicio').modal('show');
  const tituloModal = document.getElementById('modalExercicioLabel');
  const diaAtual = document.getElementById('dia-atual');
  const indiceExercicio = document.getElementById('indice-exercicio');
  const nomeExercicioInput = document.getElementById('nome-exercicio');
  const modoVideoSelect = document.getElementById('modo-video');
  const linkYoutubeInput = document.getElementById('link-youtube');
  const termoPesquisaInput = document.getElementById('termo-pesquisa');
  const resultadosPesquisaDiv = document.getElementById('resultados-pesquisa');
  const previewLinkDiv = document.getElementById('preview-link');
  const videoSelecionadoDiv = document.getElementById('video-selecionado');

  diaAtual.value = dia;
  indiceExercicio.value = indice;

  // Iniciar o modo de vídeo como 'link'
  modoVideoSelect.value = 'link';
  linkYoutubeInput.value = '';
  termoPesquisaInput.value = '';
  resultadosPesquisaDiv.innerHTML = '';
  previewLinkDiv.innerHTML = '';
  videoSelecionadoDiv.innerHTML = '';
  document.getElementById('container-link').style.display = 'block';
  document.getElementById('container-pesquisa').style.display = 'none';

  if (indice !== null) {
    tituloModal.textContent = 'Editar Exercício';
    const exercicios = JSON.parse(localStorage.getItem(dia)) || [];
    const exercicio = exercicios[indice];
    nomeExercicioInput.value = exercicio.nome;

    // Sempre abrir como se o vídeo tivesse sido inserido via link
    // Preencher o link do YouTube e pré-exibir o vídeo

    let videoLink = '';

    if (exercicio.modo === 'link') {
      videoLink = exercicio.link;
    } else if (exercicio.modo === 'pesquisa') {
      // Construir o link do YouTube a partir do videoId
      videoLink = 'https://www.youtube.com/watch?v=' + exercicio.videoId;
    }

    linkYoutubeInput.value = videoLink;

    // Pré-exibir o vídeo
    preExibirVideo();

  } else {
    tituloModal.textContent = 'Adicionar Exercício';
    nomeExercicioInput.value = '';
  }
}

// Alterar campos visíveis com base no modo selecionado
document.getElementById('modo-video').addEventListener('change', function() {
  const modo = this.value;
  document.getElementById('container-link').style.display = 'none';
  document.getElementById('container-pesquisa').style.display = 'none';
  document.getElementById('preview-link').innerHTML = '';
  document.getElementById('resultados-pesquisa').innerHTML = '';
  document.getElementById('video-selecionado').innerHTML = '';
  if (modo === 'link') {
    document.getElementById('container-link').style.display = 'block';
  } else if (modo === 'pesquisar') {
    document.getElementById('container-pesquisa').style.display = 'block';
  }
});

// Evento de submissão do formulário do modal
document.getElementById('form-exercicio').addEventListener('submit', function(event) {
  event.preventDefault();

  const dia = document.getElementById('dia-atual').value;
  const indice = document.getElementById('indice-exercicio').value;
  const nomeExercicio = document.getElementById('nome-exercicio').value.trim();
  const modoVideo = document.getElementById('modo-video').value;
  const linkYoutube = document.getElementById('link-youtube').value.trim();
  const termoPesquisaInput = document.getElementById('termo-pesquisa');

  if (!nomeExercicio) {
    alert("Por favor, preencha o nome do exercício.");
    return;
  }

  exercicioTemp = { nome: nomeExercicio };
  diaTemp = dia;
  indiceTemp = indice;

  if (modoVideo === 'link') {
    if (!linkYoutube) {
      alert("Por favor, insira o link do YouTube.");
      return;
    }
    exercicioTemp.modo = 'link';
    exercicioTemp.link = linkYoutube;
    // Obter título do vídeo
    const videoID = extrairVideoID(linkYoutube);
    if (videoID) {
      obterTituloVideo(videoID, function(tituloVideo) {
        exercicioTemp.videoTitulo = tituloVideo;
        mostrarConfirmacao();
      });
    } else {
      alert("Link do YouTube inválido.");
    }
  } else if (modoVideo === 'pesquisar') {
    const videoIdSelecionado = termoPesquisaInput.dataset.videoId;
    const videoTituloSelecionado = termoPesquisaInput.dataset.videoTitulo;
    if (!videoIdSelecionado || !videoTituloSelecionado) {
      alert("Por favor, selecione um vídeo da pesquisa.");
      return;
    }
    exercicioTemp.modo = 'pesquisa';
    exercicioTemp.videoId = videoIdSelecionado;
    exercicioTemp.videoTitulo = videoTituloSelecionado;
    mostrarConfirmacao();
  } else {
    alert("Por favor, selecione o modo de inserir o vídeo.");
  }
});

// Função para mostrar o modal de confirmação
function mostrarConfirmacao() {
  $('#modalExercicio').modal('hide');

  document.getElementById('confirm-titulo').textContent = exercicioTemp.nome;
  document.getElementById('confirm-nome-video').textContent = exercicioTemp.videoTitulo;

  const confirmPreviewVideoDiv = document.getElementById('confirm-preview-video');
  confirmPreviewVideoDiv.innerHTML = '';

  let videoID = '';
  if (exercicioTemp.modo === 'link') {
    videoID = extrairVideoID(exercicioTemp.link);
  } else if (exercicioTemp.modo === 'pesquisa') {
    videoID = exercicioTemp.videoId;
  }

  if (videoID) {
    confirmPreviewVideoDiv.innerHTML = `
      <div class="embed-responsive embed-responsive-16by9">
        <iframe src="https://www.youtube.com/embed/${videoID}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      </div>
    `;
  } else {
    confirmPreviewVideoDiv.innerHTML = '<p>Vídeo não disponível</p>';
  }

  $('#modalConfirmacao').modal('show');
}

// Evento do botão confirmar salvar
document.getElementById('btn-confirmar-salvar').addEventListener('click', function() {
  const exercicios = JSON.parse(localStorage.getItem(diaTemp)) || [];

  if (indiceTemp === '' || indiceTemp === null) {
    // Adiciona novo exercício
    exercicios.push(exercicioTemp);
  } else {
    // Edita exercício existente
    exercicios[indiceTemp] = exercicioTemp;
  }

  localStorage.setItem(diaTemp, JSON.stringify(exercicios));

  exibirExercicios(diaTemp);
  $('#modalConfirmacao').modal('hide');
});

// Função para pesquisar vídeos no YouTube
function pesquisarYoutube() {
  const termo = document.getElementById('termo-pesquisa').value.trim();
  const resultadosPesquisaDiv = document.getElementById('resultados-pesquisa');
  const termoPesquisaInput = document.getElementById('termo-pesquisa');
  const videoSelecionadoDiv = document.getElementById('video-selecionado');

  if (!termo) {
    alert("Por favor, insira um termo de pesquisa.");
    return;
  }

  resultadosPesquisaDiv.innerHTML = '<p>Pesquisando...</p>';
  videoSelecionadoDiv.innerHTML = '';
  termoPesquisaInput.dataset.videoId = '';
  termoPesquisaInput.dataset.videoTitulo = '';

  $.ajax({
    url: 'https://www.googleapis.com/youtube/v3/search',
    type: 'GET',
    data: {
      key: API_KEY,
      q: termo,
      part: 'snippet',
      maxResults: 5,
      type: 'video'
    },
    success: function(data) {
      resultadosPesquisaDiv.innerHTML = '';
      data.items.forEach(item => {
        const videoId = item.id.videoId;
        const titulo = item.snippet.title;
        const thumbnail = item.snippet.thumbnails.default.url;

        const resultadoItem = document.createElement('div');
        resultadoItem.className = 'resultado-item d-flex align-items-center mb-2';
        resultadoItem.onclick = function() {
          // Marcar o vídeo selecionado
          termoPesquisaInput.dataset.videoId = videoId;
          termoPesquisaInput.dataset.videoTitulo = titulo;
          // Destacar o item selecionado
          document.querySelectorAll('.resultado-item').forEach(el => el.classList.remove('selecionado'));
          this.classList.add('selecionado');
          // Exibir o título do vídeo selecionado
          videoSelecionadoDiv.innerHTML = `<p>Vídeo Selecionado: ${titulo}</p>`;
        };

        const img = document.createElement('img');
        img.src = thumbnail;
        img.alt = titulo;
        img.className = 'mr-2';

        const tituloDiv = document.createElement('div');
        tituloDiv.textContent = titulo;

        resultadoItem.appendChild(img);
        resultadoItem.appendChild(tituloDiv);
        resultadosPesquisaDiv.appendChild(resultadoItem);
      });
    },
    error: function(error) {
      resultadosPesquisaDiv.innerHTML = '<p>Erro ao realizar a pesquisa.</p>';
      console.error('Erro na pesquisa do YouTube:', error);
    }
  });
}

// Função para pré-exibir o vídeo inserido por link
function preExibirVideo() {
  const linkYoutube = document.getElementById('link-youtube').value.trim();
  const previewLinkDiv = document.getElementById('preview-link');

  if (!linkYoutube) {
    alert("Por favor, insira o link do YouTube.");
    return;
  }

  const videoID = extrairVideoID(linkYoutube);
  if (videoID) {
    previewLinkDiv.innerHTML = `
      <div class="embed-responsive embed-responsive-16by9">
        <iframe src="https://www.youtube.com/embed/${videoID}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      </div>
    `;
  } else {
    previewLinkDiv.innerHTML = '<p>Link inválido ou vídeo não disponível.</p>';
  }
}

// Função para obter o título do vídeo a partir do ID
function obterTituloVideo(videoID, callback) {
  $.ajax({
    url: 'https://www.googleapis.com/youtube/v3/videos',
    type: 'GET',
    data: {
      key: API_KEY,
      id: videoID,
      part: 'snippet'
    },
    success: function(data) {
      if (data.items.length > 0) {
        const titulo = data.items[0].snippet.title;
        callback(titulo);
      } else {
        callback('Título não disponível');
      }
    },
    error: function(error) {
      console.error('Erro ao obter o título do vídeo:', error);
      callback('Título não disponível');
    }
  });
}

// Função para adicionar ou editar um exercício
function salvarExercicio(dia, indice, nome, link) {
  const exercicios = JSON.parse(localStorage.getItem(dia)) || [];
  const exercicio = { nome, link };

  if (indice !== null && indice !== undefined && indice !== '') {
    exercicios[indice] = exercicio; // Editar exercício existente
  } else {
    exercicios.push(exercicio); // Adicionar novo exercício
  }

  localStorage.setItem(dia, JSON.stringify(exercicios));
  exibirExercicios(dia);
}

// Função para exibir os exercícios de um dia específico
function exibirExercicios(dia) {
  const exercicios = JSON.parse(localStorage.getItem(dia)) || [];
  const lista = document.getElementById(`exercicios-${dia}`);
  lista.innerHTML = ''; // Limpar o conteúdo antes de adicionar novos elementos

  exercicios.forEach((exercicio, indice) => {
    const videoID = extrairVideoID(exercicio.link); // Certifique-se de que 'link' é a propriedade correta
    console.log(`Exibindo exercício: ${exercicio.nome}, Link do vídeo: ${exercicio.link}, ID do vídeo: ${videoID}`);

    const exercicioDiv = document.createElement('div');
    exercicioDiv.className = 'col-12 mb-2';
    exercicioDiv.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">${exercicio.nome}</h5>
          ${videoID ? `<iframe src="https://www.youtube.com/embed/${videoID}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>` : ''}
          <button class="btn btn-warning" onclick="abrirModal('${dia}', ${indice})">Editar</button>
          <button class="btn btn-danger" onclick="excluirExercicio('${dia}', ${indice})">Excluir</button>
        </div>
      </div>
    `;
    lista.appendChild(exercicioDiv);
  });
}

function extrairVideoID(url) {
  if (!url) return '';

  const regexes = [
    /(?:\?v=|&v=|youtu\.be\/|embed\/|\/v\/|\/vi\/|\/watch\?v=|\/watch\?.+&v=)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const regex of regexes) {
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}

function ativarAba(dia) {
  document.querySelectorAll('.nav-link').forEach(tab => tab.classList.remove('active'));
  document.querySelector(`[data-bs-toggle="tab"][onclick="ativarAba('${dia}')"]`).classList.add('active');

  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('show', 'active'));
  document.getElementById(`nav-${dia}`).classList.add('show', 'active');

  const lista = document.getElementById(`exercicios-${dia}`);
  lista.innerHTML = '';

  exibirExercicios(dia);
}

function adicionarBotoes(dia) {
  return `
    <button class="btn btn-primary mb-2" onclick="abrirModal('${dia}')">Adicionar Exercício</button>
    <button class="btn btn-danger mb-2" onclick="zerarDia('${dia}')">Zerar Dia</button>
    <div class="row" id="exercicios-${dia}"></div>
  `;
}

// Ativa a primeira aba ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-segunda').innerHTML = adicionarBotoes('segunda');
  document.getElementById('nav-terca').innerHTML = adicionarBotoes('terca');
  document.getElementById('nav-quarta').innerHTML = adicionarBotoes('quarta');
  document.getElementById('nav-quinta').innerHTML = adicionarBotoes('quinta');
  document.getElementById('nav-sexta').innerHTML = adicionarBotoes('sexta');
  document.getElementById('nav-sabado').innerHTML = adicionarBotoes('sabado');
  document.getElementById('nav-domingo').innerHTML = adicionarBotoes('domingo');

  ativarAba('segunda'); // Ativar a aba de segunda-feira ao carregar a página

  // Adicionar evento de submissão ao formulário do modal
  document.getElementById('form-exercicio').addEventListener('submit', function(event) {
    event.preventDefault();
    const dia = document.getElementById('dia-atual').value;
    const indice = document.getElementById('indice-exercicio').value;
    const nome = document.getElementById('nome-exercicio').value;
    const link = document.getElementById('link-video').value;
    salvarExercicio(dia, indice, nome, link);
    $('#modalExercicio').modal('hide');
  });

  // Mostrar ou esconder o campo de link do vídeo com base na seleção do modo de vídeo
  document.getElementById('modo-video').addEventListener('change', function() {
    const modoVideo = this.value;
    const linkVideoContainer = document.getElementById('link-video-container');
    if (modoVideo === 'link') {
      linkVideoContainer.style.display = 'block';
    } else {
      linkVideoContainer.style.display = 'none';
    }
  });
});

function adicionarBotoes(dia) {
  return `
    <button class="btn btn-primary mb-2" onclick="abrirModal('${dia}')">Adicionar Exercício</button>
    <button class="btn btn-danger mb-2" onclick="zerarDia('${dia}')">Zerar Dia</button>
    <div class="row" id="exercicios-${dia}"></div>
  `;
}

// Função para excluir um exercício
function excluirExercicio(dia, indice) {
  if (confirm('Deseja realmente excluir este exercício?')) {
    const exercicios = JSON.parse(localStorage.getItem(dia)) || [];
    exercicios.splice(indice, 1);
    localStorage.setItem(dia, JSON.stringify(exercicios));
    exibirExercicios(dia);
  }
}

// Função para zerar todos os exercícios de um dia
function zerarDia(dia) {
  if (confirm(`Deseja realmente zerar todos os exercícios de ${dia}?`)) {
    localStorage.removeItem(dia);
    exibirExercicios(dia);
  }
}

// Registro do Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => console.log('Service Worker registrado', reg))
    .catch(err => console.warn('Erro ao registrar o Service Worker', err));
}
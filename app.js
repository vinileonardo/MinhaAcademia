// Sua API Key do YouTube Data API v3
const API_KEY = 'AIzaSyDyQMriHzOJM4Bc76Hc8coJWM4iRJju-V4'; // Substitua por sua API Key

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

  diaAtual.value = dia;
  indiceExercicio.value = indice;

  modoVideoSelect.value = 'link';
  linkYoutubeInput.value = '';
  termoPesquisaInput.value = '';
  resultadosPesquisaDiv.innerHTML = '';
  document.getElementById('container-link').style.display = 'block';
  document.getElementById('container-pesquisa').style.display = 'none';

  if (indice !== null) {
    tituloModal.textContent = 'Editar Exercício';
    const exercicios = JSON.parse(localStorage.getItem(dia)) || [];
    const exercicio = exercicios[indice];
    nomeExercicioInput.value = exercicio.nome;

    if (exercicio.modo === 'link') {
      modoVideoSelect.value = 'link';
      linkYoutubeInput.value = exercicio.link;
      document.getElementById('container-link').style.display = 'block';
      document.getElementById('container-pesquisa').style.display = 'none';
    } else if (exercicio.modo === 'pesquisa') {
      modoVideoSelect.value = 'pesquisar';
      document.getElementById('container-link').style.display = 'none';
      document.getElementById('container-pesquisa').style.display = 'block';
      // Exibir o vídeo selecionado anteriormente
      resultadosPesquisaDiv.innerHTML = `
        <p>Vídeo selecionado:</p>
        <div class="embed-responsive embed-responsive-16by9">
          <iframe class="embed-responsive-item" src="https://www.youtube.com/embed/${exercicio.videoId}" allowfullscreen></iframe>
        </div>
      `;
      // Armazenar o vídeo selecionado
      termoPesquisaInput.dataset.videoId = exercicio.videoId;
    }
  } else {
    tituloModal.textContent = 'Adicionar Exercício';
    nomeExercicioInput.value = '';
  }
}

// Alterar campos visíveis com base no modo selecionado
document.getElementById('modo-video').addEventListener('change', function() {
  const modo = this.value;
  if (modo === 'link') {
    document.getElementById('container-link').style.display = 'block';
    document.getElementById('container-pesquisa').style.display = 'none';
  } else if (modo === 'pesquisar') {
    document.getElementById('container-link').style.display = 'none';
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
  const videoIdSelecionado = termoPesquisaInput.dataset.videoId;

  if (!nomeExercicio) {
    alert("Por favor, preencha o nome do exercício.");
    return;
  }

  let exercicio = { nome: nomeExercicio };

  if (modoVideo === 'link') {
    if (!linkYoutube) {
      alert("Por favor, insira o link do YouTube.");
      return;
    }
    exercicio.modo = 'link';
    exercicio.link = linkYoutube;
  } else if (modoVideo === 'pesquisar') {
    if (!videoIdSelecionado) {
      alert("Por favor, selecione um vídeo da pesquisa.");
      return;
    }
    exercicio.modo = 'pesquisa';
    exercicio.videoId = videoIdSelecionado;
  }

  const exercicios = JSON.parse(localStorage.getItem(dia)) || [];

  if (indice === '' || indice === null) {
    // Adiciona novo exercício
    exercicios.push(exercicio);
  } else {
    // Edita exercício existente
    exercicios[indice] = exercicio;
  }

  localStorage.setItem(dia, JSON.stringify(exercicios));

  exibirExercicios(dia);
  $('#modalExercicio').modal('hide');
});

// Função para pesquisar vídeos no YouTube
function pesquisarYoutube() {
  const termo = document.getElementById('termo-pesquisa').value.trim();
  const resultadosPesquisaDiv = document.getElementById('resultados-pesquisa');
  const termoPesquisaInput = document.getElementById('termo-pesquisa');

  if (!termo) {
    alert("Por favor, insira um termo de pesquisa.");
    return;
  }

  resultadosPesquisaDiv.innerHTML = '<p>Pesquisando...</p>';

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
        resultadoItem.style.cursor = 'pointer';
        resultadoItem.onclick = function() {
          // Marcar o vídeo selecionado
          termoPesquisaInput.dataset.videoId = videoId;
          // Destacar o item selecionado
          document.querySelectorAll('.resultado-item').forEach(el => el.classList.remove('selecionado'));
          this.classList.add('selecionado');
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

// Função para exibir os exercícios de um dia específico
function exibirExercicios(dia) {
  const exercicios = JSON.parse(localStorage.getItem(dia)) || [];
  const lista = document.getElementById(`exercicios-${dia}`);
  lista.innerHTML = '';

  exercicios.forEach((exercicio, indice) => {
    let videoID = '';

    if (exercicio.modo === 'link') {
      videoID = extrairVideoID(exercicio.link);
    } else if (exercicio.modo === 'pesquisa') {
      videoID = exercicio.videoId;
    }

    const col = document.createElement('div');
    col.className = 'col-md-6 mb-4';

    const card = document.createElement('div');
    card.className = 'card';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    const titulo = document.createElement('h5');
    titulo.className = 'card-title';
    titulo.textContent = exercicio.nome;

    const video = document.createElement('div');
    video.className = 'embed-responsive embed-responsive-16by9';
    if (videoID) {
      video.innerHTML = `<iframe class="embed-responsive-item" src="https://www.youtube.com/embed/${videoID}" allowfullscreen></iframe>`;
    } else {
      video.innerHTML = '<p>Vídeo não disponível</p>';
    }

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group mt-2';
    btnGroup.role = 'group';

    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn btn-sm btn-info';
    btnEditar.textContent = 'Editar';
    btnEditar.onclick = () => abrirModal(dia, indice);

    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn btn-sm btn-danger';
    btnExcluir.textContent = 'Excluir';
    btnExcluir.onclick = () => excluirExercicio(dia, indice);

    btnGroup.appendChild(btnEditar);
    btnGroup.appendChild(btnExcluir);

    cardBody.appendChild(titulo);
    cardBody.appendChild(video);
    cardBody.appendChild(btnGroup);

    card.appendChild(cardBody);
    col.appendChild(card);
    lista.appendChild(col);
  });
}

// Função para extrair o ID do vídeo do YouTube a partir do link
function extrairVideoID(url) {
  if (!url) return '';

  // Diferentes formatos de URL do YouTube
  const regexes = [
    /(?:\?v=|&v=|youtu\.be\/|embed\/|\/v\/|\/vi\/|\/watch\?v=|\/watch\?.+&v=)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];

  for (const regex of regexes) {
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}

// Função para ativar a aba correspondente ao dia selecionado
function ativarAba(dia) {
  // Remover a classe 'active' de todas as abas
  document.querySelectorAll('.nav-link').forEach(tab => tab.classList.remove('active'));
  // Adicionar a classe 'active' à aba selecionada
  document.querySelector(`[data-toggle="tab"][onclick="ativarAba('${dia}')"]`).classList.add('active');

  // Exibir o conteúdo da aba selecionada
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('show', 'active'));
  document.getElementById(`nav-${dia}`).classList.add('show', 'active');

  exibirExercicios(dia);
}

// Ativa a primeira aba ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  ativarAba('segunda'); // Você pode alterar para o dia que preferir
});

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

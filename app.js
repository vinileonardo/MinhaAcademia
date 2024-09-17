// Função para abrir o modal de adicionar/editar exercício
function abrirModal(dia, indice = null) {
  $('#modalExercicio').modal('show');
  const tituloModal = document.getElementById('modalExercicioLabel');
  const diaAtual = document.getElementById('dia-atual');
  const indiceExercicio = document.getElementById('indice-exercicio');
  const nomeExercicioInput = document.getElementById('nome-exercicio');
  const linkYoutubeInput = document.getElementById('link-youtube');

  diaAtual.value = dia;
  indiceExercicio.value = indice;

  if (indice !== null) {
    tituloModal.textContent = 'Editar Exercício';
    const exercicios = JSON.parse(localStorage.getItem(dia)) || [];
    const exercicio = exercicios[indice];
    nomeExercicioInput.value = exercicio.nome;
    linkYoutubeInput.value = exercicio.link;
  } else {
    tituloModal.textContent = 'Adicionar Exercício';
    nomeExercicioInput.value = '';
    linkYoutubeInput.value = '';
  }
}

// Evento de submissão do formulário do modal
document.getElementById('form-exercicio').addEventListener('submit', function(event) {
  event.preventDefault();

  const dia = document.getElementById('dia-atual').value;
  const indice = document.getElementById('indice-exercicio').value;
  const nomeExercicio = document.getElementById('nome-exercicio').value.trim();
  const linkYoutube = document.getElementById('link-youtube').value.trim();

  if (!nomeExercicio || !linkYoutube) {
    alert("Por favor, preencha todos os campos.");
    return;
  }

  const exercicios = JSON.parse(localStorage.getItem(dia)) || [];

  const novoExercicio = { nome: nomeExercicio, link: linkYoutube };

  if (indice === '' || indice === null) {
    // Adiciona novo exercício
    exercicios.push(novoExercicio);
  } else {
    // Edita exercício existente
    exercicios[indice] = novoExercicio;
  }

  localStorage.setItem(dia, JSON.stringify(exercicios));

  exibirExercicios(dia);
  $('#modalExercicio').modal('hide');
});

// Função para exibir os exercícios de um dia específico
function exibirExercicios(dia) {
  const exercicios = JSON.parse(localStorage.getItem(dia)) || [];
  const lista = document.getElementById(`exercicios-${dia}`);
  lista.innerHTML = '';

  exercicios.forEach((exercicio, indice) => {
    const videoID = extrairVideoID(exercicio.link);

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

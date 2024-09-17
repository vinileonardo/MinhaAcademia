// Função para abrir o modal de adicionar/editar exercício
function abrirModal(dia, indice = null) {
    const modal = document.getElementById('modal');
    const tituloModal = document.getElementById('modal-titulo');
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
  
    modal.style.display = 'block';
  }
  
  // Função para fechar o modal
  function fecharModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
  }
  
  // Fecha o modal ao clicar fora dele
  window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  }
  
  // Fecha o modal ao clicar no 'x'
  document.getElementById('fechar-modal').onclick = fecharModal;
  
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
    fecharModal();
  });
  
  // Função para exibir os exercícios de um dia específico
  function exibirExercicios(dia) {
    const exercicios = JSON.parse(localStorage.getItem(dia)) || [];
    const lista = document.getElementById(`exercicios-${dia}`);
    lista.innerHTML = '';
  
    exercicios.forEach((exercicio, indice) => {
      const videoID = extrairVideoID(exercicio.link);
  
      const div = document.createElement('div');
      div.className = 'exercicio';
      div.innerHTML = `
        <h3>${exercicio.nome}</h3>
        ${videoID ? `<iframe src="https://www.youtube.com/embed/${videoID}" frameborder="0" allowfullscreen></iframe>` : '<p>Vídeo não disponível</p>'}
        <div class="buttons">
          <button class="edit-button" onclick="abrirModal('${dia}', ${indice})">Editar</button>
          <button class="delete-button" onclick="excluirExercicio('${dia}', ${indice})">Excluir</button>
        </div>
      `;
      lista.appendChild(div);
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
    // Remove a classe 'active' de todas as abas e conteúdos
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.day-content').forEach(content => content.classList.remove('active'));
  
    // Adiciona a classe 'active' à aba e conteúdo selecionados
    document.querySelector(`.tab-button[data-day="${dia}"]`).classList.add('active');
    document.getElementById(dia).classList.add('active');
  
    exibirExercicios(dia);
  }
  
  // Evento de clique nas abas
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const dia = button.getAttribute('data-day');
      ativarAba(dia);
    });
  });
  
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
  
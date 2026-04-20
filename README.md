# 🏐 Controle de Grade - Vôlei

Um aplicativo web leve e responsivo para gerenciamento de filas e vagas em jogos de vôlei (estilo "Rei da Quadra"). Desenvolvido com HTML, CSS e JavaScript puros (Vanilla), ideal para uso rápido na beira da quadra através do telemóvel.

## 🚀 Funcionalidades

* **Gestão de Vagas Individuais:** Controlo independente da "Vaga 1" e "Vaga 2" da quadra.
* **Sistema de "Rei da Quadra" (Rotatividade):** Com um clique, quem perde o jogo vai para o final da fila, e o primeiro da fila sobe automaticamente para a vaga na quadra.
* **Trava Anti-Spam (Local):** Impede que um mesmo utilizador cadastre múltiplos nomes na fila pelo mesmo dispositivo.
* **Painel de Administrador Seguro:** Funcionalidades críticas (como girar a fila, tirar da quadra ou resetar a grade) ficam ocultas sob uma palavra-passe de admin.
* **Salvamento Automático (Offline-first):** Utiliza o `localStorage` do navegador para garantir que a fila não seja perdida se a página for atualizada ou o telemóvel bloqueado.
* **Tema Escuro (Dark Mode):** Interface moderna e otimizada para poupar bateria durante o uso externo (parques e ginásios).

## 🛠️ Tecnologias Utilizadas

* **HTML5:** Estrutura semântica.
* **CSS3:** Estilização responsiva (Flexbox) e Tema Escuro.
* **JavaScript (ES6):** Lógica de rotatividade, controlo de estado (`localStorage`) e manipulação do DOM.

## 📱 Como Usar (Para a Galera na Quadra)

1. Acede ao link do aplicativo: `https://grade-volei.netlify.app/`
2. Na caixa de texto "Adicionar Jogador", digita o teu nome e clica em **Adicionar**.
3. Se a quadra estiver vazia, o teu nome entra direto. Se estiver cheia, vais para o final da fila.
4. Aguarda a tua vez! Apenas o Administrador da rede controla quem entra e sai da quadra.

## ⚙️ Como Usar (Para o Administrador)

1. Acede ao aplicativo e clica no botão **Área Admin** no canto superior direito.
2. Insere a palavra-passe de administrador.
3. Terás acesso aos controlos avançados:
   * **Perdeu:** Tira o jogador da vaga, manda para o fim da fila e puxa o 1º da fila para a vaga.
   * **Sair (Na Quadra):** Tira o jogador da vaga e manda para o fim da fila (sem puxar o próximo automaticamente).
   * **Ir p/ V1 / Ir p/ V2:** Fura a fila e coloca o jogador escolhido diretamente na vaga solicitada.
   * **Zerar Grade Completa:** Apaga todos os dados da memória, limpando a quadra e a fila (ideal para começar um novo dia de jogos).

## 💻 Como Rodar Localmente (Desenvolvimento)

Como o projeto não utiliza frameworks complexos ou base de dados externa, rodá-lo localmente é extremamente simples:

1. Clona este repositório:
   ```bash
   git clone [https://github.com/espertty/grade-volei.git](https://github.com/espertty/grade-volei.git)
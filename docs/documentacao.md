# Sync. — Documentação

Status: em construção. Front (v0) já iniciado; back-end em **Python (FastAPI) + PostgreSQL** sendo montado módulo por módulo.

Repositório: monorepo com `frontend/` (React), `backend/` (Python) e `docs/` (esta documentação).

Legenda: **[definido]** = decidido por você · **[sugestão]** = proposta minha, precisa de aprovação · **[em aberto]** = falta decidir.

---

## 1. Visão geral

App pessoal para reunir tudo que uso no dia a dia, acessível no celular, tablet e computador.

Módulos previstos: Dashboard, Kanban (tarefas e eventos), Treinos, Lista de compras, Finanças, Configurações.

## 2. Princípios

- **[definido]** Nome do app: **Sync.**
- **[definido]** Somente tema escuro.
- **[definido]** Custo o mais próximo de zero possível.
- **[definido]** Front primeiro, back depois. O back é em **Python**, com as regras de negócio (cálculos, recorrência) no back e o front só exibindo.
- **[definido]** Todo o código (nomes, comentários, rotas, colunas) em **inglês**. Textos da interface e esta documentação em português.
- **[definido]** App instalável (PWA), sem loja.
- **[definido]** Login com Google, pensando em compartilhar com outras pessoas no futuro.
- **[definido]** Em cada módulo, sempre ter adicionar, editar e excluir.
- **[definido]** Em Configurações, ativar/desativar módulos por checkbox.
- **[definido]** Interface intuitiva.
- **[definido]** Notificações somente dentro do app, nada fora dele.

### 2.1 Paleta de cores

- **[definido]** Cores principais do tema:

| Cor | Hex | Uso |
|---|---|---|
| Background | `#121212` | Cor de fundo principal da aplicação |
| Surface | `#1e1e1e` | Superfícies, cards e containers |
| Surface Hover | `#27272a` | Estado de hover em elementos de superfície |
| Primary | `#f59e0b` | Cor de destaque principal (botões, links, ícones) |
| Primary Hover | `#d97706` | Estado de hover da cor primária |
| Text Main | `#e5e5e5` | Texto principal (títulos, conteúdo) |
| Text Muted | `#737373` | Textos secundários, legendas e placeholders |
| Border | `#262626` | Bordas e divisórias |

- **[definido]** Botões: primário sólido na cor Primary, com Primary Hover no hover; secundário em tom neutro de Surface; estado desabilitado em cinza apagado.
- **[definido]** Cards/superfícies usam Surface como fundo, título em Text Main, texto de apoio em Text Muted, e link "Ver mais" na cor Primary.
- **[definido]** Inputs: fundo Surface, borda Border; campo em foco ganha borda Primary; campo desabilitado com texto apagado.
- **[definido]** Estados e destaques: badges "Ativo" (Primary), "Inativo" e "Em andamento" (neutros); mensagens de informação importante em Primary.
- **[definido]** Ícones seguem Text Main/Primary conforme o contexto (ex: seta de ação em Primary).

## 3. Módulos e andamento

| Módulo | Situação |
|---|---|
| Kanban (tarefas + eventos futuros) | definido (seção 4) |
| Dashboard | definido (seção 5) |
| Notificações | em definição (seção 6) |
| Treinos | definido (seção 7) |
| Lista de compras | definido (seção 8) |
| Finanças | definido (seção 9) |
| Configurações | definido (seção 10) |
| Login | definido (seção 11) |
| Front-end (stack e estrutura) | definido (seção 15) |
| Back-end (stack e estrutura) | definido (seção 16) |

---

## 4. Módulo Kanban

### 4.1 Objetivo

Organizar as tarefas da semana em formato parecido com o Trello e registrar eventos futuros. Tarefas e Kanban são **um módulo só**. O foco principal é a **semana atual**.

### 4.2 Estrutura da tela

**A semana (principal)**
- 7 colunas, uma para cada dia da semana.
- **[definido]** Mostra somente a semana atual, sem navegar para outras semanas.

**Seções fora da semana**
- **Finalizados:** cards com status feito.
- **Atrasados:** cards não concluídos de semanas anteriores.
- **Eventos futuros:** cards com data além da semana atual.
- Cada uma dessas seções pode ser mostrada ou ocultada por filtro.

**Layout**
- **[definido]** Sem scroll horizontal: as colunas e seções aparecem como cards maiores, organizados em **grade**.
- **[definido]** No celular, os blocos ficam um abaixo do outro. A rolagem vertical é aceita; o que deve ser evitado é a rolagem horizontal.

**Filtros**
- Mostrar/ocultar: Finalizados, Atrasados, Eventos futuros.
- **[definido]** Filtro por tag, para mostrar só os cards de determinada(s) tag(s).

### 4.3 Card

Campos:

- Título
- **Tags** (uma ou mais, para separar por área)
- Status: pendente, em andamento, feito
- Dia de entrega
- Hora de entrega
- Espaço grande de escrita (texto, links etc.), como uma página do Notion
- Repetição (opcional): ver seção 4.10

Ao abrir o card, ele se comporta como uma página, com título no topo, as informações (tags, status, data e hora) e o espaço de escrita abaixo.

### 4.4 Regras

- **[definido]** Cards podem ser arrastados entre os dias da semana.
- **[definido]** Status possíveis: pendente, em andamento e feito.
- **[definido]** Card com status feito vai para a seção Finalizados.
- **[definido]** Evento futuro é apenas um card com data além da semana atual. Não existe tipo separado.
- **[definido]** Card atrasado dentro da semana continua na coluna do dia e mostra apenas um **ícone de atrasado**.
- **[definido]** Card não concluído de uma semana que já passou vai para a seção **Atrasados**.
- **[definido]** Eventos futuros não aparecem nas colunas da semana.
- **[sugestão]** Considera-se atrasado o card cuja data e hora de entrega já passaram e o status não é feito.
- **[sugestão]** Arrastar um card para outro dia altera a data de entrega e mantém a hora.
- **[sugestão]** Arrastar para Finalizados marca como feito. Arrastar de Finalizados para um dia reabre o card como pendente.
- **[sugestão]** Dentro de cada coluna, os cards ficam ordenados pela hora de entrega.
- **[sugestão]** Quando chega a semana de um evento futuro, ele passa a aparecer automaticamente nas colunas da semana.
- **[sugestão]** Guardar a data e hora em que o card foi marcado como feito.

### 4.5 Fluxos

**Criar um card**
1. Abrir o Kanban.
2. Clicar em adicionar (na coluna do dia ou no botão geral).
3. Preencher título, tags, status, dia e hora.
4. Escrever no espaço grande, se necessário.
5. Salvar. O card aparece na coluna do dia escolhido, ou em Eventos futuros se a data for além da semana.

**Mover um card entre dias**
1. Arrastar o card para outra coluna.
2. A data de entrega é atualizada.

**Concluir um card**
1. Mudar o status para feito (no card ou arrastando para Finalizados).
2. O card sai da coluna do dia e vai para Finalizados.

**Card atrasado**
1. Chegou a data e hora e o card não está feito.
2. Se ainda é a semana atual: o card continua no dia e mostra o ícone de atrasado.
3. Se a semana passou: o card vai para a seção Atrasados.
4. Ao reagendar (mudar a data) ou concluir, sai de Atrasados.

**Cadastrar um evento futuro**
1. Criar um card normalmente.
2. Escolher uma data além da semana atual.
3. O card vai para Eventos futuros e mostra a contagem regressiva.
4. Opcional: ativar lembrete (seção 6).

**Filtrar**
1. Usar o filtro de Finalizados, Atrasados e/ou Eventos futuros para mostrar ou ocultar.
2. Usar o filtro de tags para ver só os cards das tags escolhidas.

### 4.6 Eventos futuros e contagem regressiva

- Cada evento futuro mostra uma contagem regressiva até o dia do evento.
- A contagem aparece na seção Eventos futuros e no Dashboard.

### 4.7 Rascunho do modelo de dados

**Card**
- id
- usuário dono do card
- título
- conteúdo (texto livre com links)
- data e hora de entrega
- status
- data e hora de criação
- data e hora de conclusão

**Tag**
- id
- usuário dono
- nome

Relação: um card pode ter várias tags, e uma tag pode estar em vários cards.

### 4.8 Cálculo de seções (resumo)

| Situação do card | Onde aparece |
|---|---|
| Data dentro da semana atual, não feito | Coluna do dia (com ícone se atrasado) |
| Data além da semana atual | Eventos futuros |
| Data em semana anterior, não feito | Atrasados |
| Status feito | Finalizados |

### 4.9 Decisões em aberto

- **[sugestão]** A semana começa na **segunda-feira** (é o que o front já usa). Pode virar preferência em Configurações.
- **[sugestão]** Datas e horas no fuso de São Paulo (`America/Sao_Paulo`); o back guarda em UTC e converte.
- **[sugestão]** Tags também têm editar (renomear) e excluir; excluir uma tag a remove dos cards, sem apagar os cards.

### 4.10 Tarefas recorrentes

- **[definido]** O card pode ser marcado como recorrente, para não precisar cadastrar de novo toda vez.
- **[definido]** Frequências: todo dia, toda semana (escolhendo os dias), todo mês (escolhendo o dia do mês).
- **[definido]** Mensal em dia que o mês não tem (ex.: 31): cai no **último dia** do mês (fevereiro → 28 ou 29).
- **[definido]** Data de início e, opcionalmente, data de fim. Sem data de fim, repete sem parar.
- **[definido]** Cada ocorrência é um card independente: concluir, arrastar ou editar uma não afeta as outras.
- **[definido]** As ocorrências são criadas quando o quadro é aberto: as da **semana atual** e só a **próxima** depois dela, que aparece em Eventos futuros.
- **[definido]** Uma ocorrência excluída sozinha ("só esta") ou arrastada para outro dia não é recriada.
- **[definido]** Ocorrência não concluída segue a regra normal de atrasado (ícone na semana, seção Atrasados depois), sem gerar duplicata.
- **[definido]** Ao editar ou excluir, o app pergunta: "só esta ocorrência" ou "esta e as próximas".
- **[definido]** Editar "esta e as próximas": título, anotações, hora e tags mudam na regra e nas próximas ocorrências **não concluídas**. Status e data mudam só no card escolhido. As concluídas nunca mudam.
- **[definido]** Excluir "esta e as próximas": a regra termina no dia anterior e as próximas ocorrências não concluídas são apagadas.
- **[definido]** Mudar a regra (frequência, dias, data de fim...) vale **a partir de hoje**: as ocorrências não concluídas de hoje em diante são refeitas.
- **[definido]** Excluir a regra apaga as ocorrências não concluídas de hoje em diante. As passadas ficam como cards comuns.

Fluxo:
1. No card, ativar "repetir" e escolher frequência, dias e data de fim (opcional).
2. Salvar. A ocorrência da semana atual aparece na coluna do dia.
3. Quando chega uma nova semana, a ocorrência correspondente aparece automaticamente.

Modelo de dados: **Regra de repetição** (`recurrence_rules`) com o modelo do card (título, anotações, hora, tags), frequência, dias da semana, dia do mês, data de início, data de fim e até onde já gerou. Cada ocorrência é um Card comum com o id da regra e a data para a qual foi gerada.

---

## 5. Dashboard

Tela inicial.

- **[definido]** Seção "Hoje": cards **pendentes do dia**, somente o título.
- **[definido]** Seção "Eventos futuros": lista com a **contagem regressiva** ao lado.
- **[definido]** O ícone de notificações no header sempre existe; um espaço extra de notificações no Dashboard é opcional (seção 6).
- **[definido]** Cards em andamento também entram em "Hoje".
- **[definido]** Cards atrasados aparecem no Dashboard, com destaque.
- **[definido]** Seção "Treino de hoje": blocos do dia com progresso e estado (ver seção 7.5).
- **[definido]** Acompanhamento de treino: fileira de bolinhas dos **5 dias anteriores e de hoje** (preenchida = treino feito, vazia = treino não feito) e o **total do mês** em x/N treinos concluídos (ver seção 7.5).
- **[definido]** O Dashboard **não mostra valores** de Finanças.
- **[definido]** Lembrete de contas fixas, sem valores: começa no **dia 5** de cada mês (o dia de fechamento fictício dos cartões, configurável, sem relação com a data do salário). A partir dele aparece uma mensagem como "as contas estão fechando, faltam X dias", com contagem regressiva. Ela some quando todas as contas fixas do mês estão pagas, dando lugar a um aviso curto de "contas do mês pagas".
- **[sugestão]** A contagem regressiva conta até o vencimento da próxima conta fixa ainda não paga.
- **[definido]** Aviso de gastos, sem valores: "você já usou X% do disponível da semana" (ver seção 9.6). Se ultrapassar 100%, aparece apenas um aviso, sem bloquear nada.

## 6. Notificações

- **[definido]** Somente dentro do app.
- **[definido]** Cada evento tem um botão para ativar aviso: "avisar quando faltar X dias" ou "avisar no dia".
- **[definido]** Ícone de notificações no header; ao clicar, abre a lista.
- **[sugestão]** Espaço de notificações no Dashboard (opcional).
- **[sugestão]** O app verifica os lembretes ao ser aberto e mostra um indicador de não lidas no ícone.

Fluxo:
1. No card do evento, ativar o lembrete e escolher quando avisar.
2. Chegando o momento, a notificação aparece no ícone do header.
3. Ao abrir a lista, ela pode ser marcada como lida.

---

## 7. Módulo Treinos

### 7.1 Objetivo

Montar o treino do dia combinando blocos de treino reutilizáveis, em vez de seguir um plano fixo por dia da semana — já que a rotina real muda conforme o clima e a disposição (ex: metabólico + corrida se o dia estiver bom + yoga pós-treino).

### 7.2 Estrutura

- **[definido]** Não existe um treino fixo atrelado ao dia da semana. O dia é **montado** arrastando blocos de treino (estilo kanban) para dentro do card daquele dia.
- **[definido]** Dois tipos de bloco na biblioteca de treinos:
  - **Programa com sessões** (ex: "Metabólico" — 21 dias): sequência de sessões numeradas (Dia 1 a Dia 21), cada uma com sua própria lista de etapas (ver 7.3).
  - **Treino avulso** (ex: Corrida, Jump, Yoga pós-treino): sempre igual, sem sequência, pode ser usado quantas vezes forem necessárias.
- **[definido]** Ao usar uma sessão de um Programa, o avanço para a próxima sessão **não é automático** — a escolha de qual dia/sessão usar é sempre manual.
- **[definido]** O card do dia vira uma pilha dos blocos usados naquele dia, cada um com seu próprio checkbox de concluído e acesso à lista de etapas com cronômetro.
- **[definido]** O bloco é marcado como concluído automaticamente ao concluir a última etapa.
- **[definido]** O cronômetro é iniciado pelo card do dia. Os blocos da biblioteca funcionam como modelos.
- **[definido]** Calendário/histórico mensal mostra, por dia, quais blocos foram feitos — é só para consulta, sem edição retroativa de dias passados.
- **[definido]** O treino fica **somente na área de Treinos**: não vai para o Kanban nem para a lista de tarefas do dia.

### 7.3 Etapas do bloco

Cada bloco (treino avulso ou sessão de programa) é uma lista ordenada de **etapas**. Os três tipos abaixo podem se misturar no mesmo bloco.

| Tipo de etapa | Campos | Como avança |
|---|---|---|
| **Por tempo** | nome, duração, descanso depois | Sozinho: o cronômetro zera, entra a pausa e depois a próxima etapa |
| **Por repetições** | nome, nº de séries, reps, descanso entre séries | Você toca em "Concluir série"; o descanso roda sozinho; depois vem a próxima série ou a próxima etapa |
| **Por distância** | nome, km | Sem cronômetro: check manual em "Concluir" (o controle é feito com o relógio na rua) |

- **[definido]** Etapa por tempo: exibe o nome do exercício e o cronômetro. Ao zerar, passa para a pausa e depois para a próxima etapa.
- **[definido]** Etapa por repetições: a série é concluída manualmente.
- **[definido]** Etapa por distância (corrida): conclusão manual.
- **[definido]** Após "Concluir série", o descanso começa automaticamente, com opção de pular.

### 7.4 Cronômetro

- **[definido]** Cada bloco tem um cronômetro que abre em **modal**.
- **[definido]** O modal mostra o nome da etapa atual, o progresso (ex: "etapa 3 de 8", "série 2/4") e a próxima etapa.
- **[definido]** Controles fixos: pausar/retomar, pular etapa e voltar etapa.
- **[definido]** Ao concluir a última etapa, aparece uma mensagem de parabéns, o bloco é marcado como concluído e o modal fecha.
- **[definido]** Se o modal for fechado no meio do bloco, o app **guarda o progresso**: o bloco fica "em andamento" e é retomado da etapa em que parou.
- **[sugestão]** Aviso sonoro ao final de cada etapa ou pausa. Vibração não funciona no iOS.
- **[sugestão]** O cronômetro calcula o tempo pelo **horário de término**, e não contando segundo a segundo, para não errar com a tela bloqueada ou o app em segundo plano.
- **[sugestão]** Usar a Wake Lock API para manter a tela acesa durante o treino.

Fluxo:
1. No card do dia, tocar em "Iniciar" no bloco.
2. Executar as etapas na ordem: tempo (automático), repetições (concluir série) e distância (check manual).
3. Ao terminar a última etapa, ver a mensagem de parabéns. O bloco fica concluído e o modal fecha.

### 7.5 Treino no Dashboard

- **[definido]** O Dashboard mostra a seção "Treino de hoje", com os blocos do dia e o progresso (ex: "2 de 3 blocos").
- **[definido]** Estados: não iniciado, em andamento e concluído.
- **[definido]** O treino do dia fica concluído quando todos os blocos estiverem concluídos.
- **[definido]** Acompanhamento no Dashboard: fileira com os 5 dias anteriores e hoje (bolinha preenchida = treino do dia concluído, vazia = não concluído) e o total do mês em x/N.
- **[definido]** Exemplo: com 4 semanas no mês e 5 treinos por semana, o total é x/20.
- **[sugestão]** A meta de treinos por semana é configurável (padrão 5). O mês conta sempre 4 semanas no denominador (meta semanal × 4), para o valor ser fixo.
- **[sugestão]** Dia sem nenhum bloco montado aparece com uma marca neutra (traço) em vez de bolinha vazia, para um dia de descanso não parecer treino perdido.

### 7.6 Modelo de dados (rascunho)

**Programa**
- id, nome, lista ordenada de sessões

**Sessão de programa**
- id, programa, número da sessão, lista de etapas

**Treino avulso**
- id, nome, lista de etapas

**Etapa**
- id, nome, tipo (tempo, repetições ou distância), campos conforme o tipo (ver 7.3)

**Dia**
- id, data, lista de blocos usados (cada um aponta para uma sessão de programa ou um treino avulso), cada bloco com estado (não iniciado, em andamento ou concluído) e a etapa/série em que parou

---

## 8. Módulo Lista de compras

### 8.1 Objetivo

Lista de compras simples, usada no mercado pelo celular, com um cantinho ao lado para registrar o total gasto e mandar o valor direto para Finanças.

### 8.2 Estrutura

- **[definido]** Lista **única** e simples: há sempre uma lista ativa, sem várias listas separadas. Ao concluir, ela é arquivada e começa uma nova (ver 8.5).
- **[definido]** Os itens ficam agrupados por **categoria** (Hortifruti, Açougue, Limpeza, Padaria...). As categorias são editáveis e a ordem segue a do mercado.
- **[definido]** As categorias aparecem como cards em grade, sem scroll horizontal. No celular ficam uma abaixo da outra.
- **[definido]** Item: nome, quantidade (opcional), categoria, tag IMPORTANTE (opcional) e check.
- **[definido]** Tag **IMPORTANTE**: os itens marcados ficam na parte de cima da lista. Os não importantes ficam abaixo e podem ficar para outro momento, como uma próxima compra.
- **[definido]** A tag IMPORTANTE cria uma seção única no topo da lista, juntando os itens importantes de todas as categorias. Os demais itens continuam agrupados por categoria, abaixo dessa seção.
- **[definido]** Adicionar, editar e excluir itens e categorias.

### 8.3 Uso no mercado

- **[definido]** Ao marcar um item, ele vai para o fim da categoria, riscado.
- **[definido]** Não existe botão "limpar comprados": quem encerra a lista é o "Concluir lista" (ver 8.5), que a arquiva em vez de apagar.
- **[definido]** Itens frequentes: ao digitar, o app sugere itens das listas arquivadas (ver 8.5), para adicionar com um toque.
- **[definido]** A lista abre e os checks funcionam **sem internet** (ver seção 12).

### 8.4 Registro do gasto

- **[definido]** Ao lado da lista há uma área para registrar o gasto da compra. Informa-se **somente o total**, sem valor por item.
- **[definido]** Campos: título, valor total e meio de pagamento (cartão, pix ou boleto). A data é hoje por padrão.
- **[definido]** Ao salvar, o app cria uma **despesa** em Finanças com esse título. Se o meio for cartão, ela entra na fatura, e a fatura é sugerida pela data da compra e pode ser trocada (seção 9.4).
- **[definido]** A despesa reduz automaticamente o disponível para gastar (seção 9.6).
- **[definido]** O título é **editável** e é o que vai para o lançamento. Vem preenchido com "SUPERMERCADO".
- **[sugestão]** Na tela grande a área fica ao lado da lista; no celular, abaixo dela.
- **[definido]** O registro é feito ao sair do mercado, depois de pagar no caixa, com o total da compra.
- **[definido]** Registrar o gasto **não limpa nem conclui** a lista.
- **[definido]** Os itens não ficam ligados ao lançamento: o único vínculo com Finanças é o valor pago.

Fluxo:
1. Fazer a compra marcando os itens na lista.
2. No cantinho ao lado, preencher o título e o valor total e escolher o cartão (ou pix/boleto).
3. Salvar. A despesa aparece em Finanças, e a fatura do cartão já inclui o valor.
4. Quando terminar, tocar em "Concluir lista" (ver 8.5).

### 8.5 Concluir lista e histórico

- **[definido]** "Concluir lista" encerra a compra: a lista vai para o arquivo e começa uma nova lista vazia.
- **[definido]** A lista concluída fica **arquivada por um tempo**, só para consulta: dá para ver o que já foi comprado, sem editar.
- **[definido]** Os itens das listas arquivadas alimentam as **sugestões** ao digitar.
- **[sugestão]** Itens não marcados na hora de concluir passam para a nova lista.
- **[sugestão]** Cada lista arquivada mostra a data de conclusão, numa tela "Listas anteriores".
- **[sugestão]** Tempo de arquivo: 90 dias. Depois disso a lista é apagada e deixa de alimentar as sugestões.

---

## 9. Módulo Finanças

### 9.1 Objetivo

Registrar tudo que entra e sai, incluindo compras parceladas, para enxergar as **faturas futuras** e controlar as **contas que se pagam todo mês**.

### 9.2 O que já está definido

- **[definido]** Registrar recebimentos e gastos.
- **[definido]** Registrar compras parceladas para ver quanto já está comprometido nas faturas futuras.
- **[definido]** Área de contas mensais fixas (aluguel, condomínio, gás, celular), com check ao pagar para ir eliminando.
- **[definido]** As contas fixas ficam **à parte**: não entram nos cartões nem nas faturas (nem aluguel, condomínio, gás ou celular).
- **[definido]** As contas fixas são de **valor variável**: você cadastra um valor e pode editá-lo em cada mês se a conta vier maior ou menor.
- **[definido]** O aluguel é pago por boleto; condomínio e gás seguem o mesmo padrão, e o pagamento é feito quando cai o salário.
- **[definido]** Área de **caixinha/cofrinho**, dividida em **potes nomeados** (ex: Viagem, Emergência, Reserva), cada um mostrando apenas o valor guardado — sem histórico de depósitos/retiradas nem meta. Total geral em destaque somando todos os potes.
- **[definido]** A caixinha guarda o que estiver disponível e serve para "esconder" o dinheiro para não gastar: o que vai para um pote **sai do disponível** do ciclo.
- **[definido]** No lançamento de compra parcelada, informa-se o **valor da parcela** e o **número de parcelas** (não o valor total da compra).
- **[definido]** 4 cartões: Nubank, Banco do Brasil, Banrisul e Mercado Pago, além de gastos por pix e boleto.
- **[definido]** Poder **cadastrar um novo cartão** e **excluir** um cartão.
- **[definido]** Vencimento de cada fatura é conhecido. O **dia de fechamento varia** conforme o mês.
- **[definido]** Cada cartão tem uma **data de fechamento padrão** (exemplo: Nubank fecha dia 8 e vence dia 15).
- **[definido]** A fatura mostra um **ícone de alerta** lembrando de conferir e, se preciso, editar a data de fechamento todo mês. A edição é manual.

### 9.3 Conceitos

- **Meio de pagamento:** cada cartão cadastrado, pix, boleto.
- **Lançamento:** uma receita ou uma despesa, com data, valor, descrição e meio de pagamento.
- **Fatura:** conjunto de lançamentos de um cartão em um mês, com data de fechamento e de vencimento.
- **Parcelamento:** uma compra dividida em N parcelas, cada uma caindo em uma fatura futura.
- **Cartão:** cadastro com nome, dia de vencimento e data de fechamento padrão. Pode ser criado e excluído.
- **Conta fixa mensal:** despesa recorrente (aluguel, condomínio, gás, celular) com valor variável, vencimento e check de pago. Não pertence a nenhum cartão.
- **Ciclo:** período de um salário ao próximo. É a base do cálculo do disponível para gastar (seção 9.6).
- **Disponível para gastar:** valor calculado pelo app: salário menos contas fixas do ciclo, faturas que vencem no ciclo, pix e boletos avulsos e o que foi guardado na caixinha no ciclo.
- **Caixinha/cofrinho:** conjunto de **potes nomeados** (ex: Viagem, Emergência), cada um com um valor guardado, separado das contas e dos lançamentos do dia a dia. Sem histórico de movimentações nem meta — só o valor atual de cada pote.

### 9.4 Regras

- **[definido]** O ícone de alerta some quando a data de fechamento da fatura do mês é confirmada ou editada, e volta quando começa uma nova fatura.
- **[definido]** Compra feita depois do fechamento entra na fatura seguinte.
- **[definido]** Ao lançar uma compra no cartão, o app sugere a fatura pela data da compra, e você pode trocar.
- **[definido]** Pagar a fatura não é uma despesa nova: é a quitação de gastos já lançados. Assim o gasto não é contado duas vezes.
- **[definido]** Cada mês gera uma ocorrência de cada conta fixa, já com o valor cadastrado (ou o do mês anterior) e editável quando a conta real chega.
- **[definido]** Marcar uma conta fixa como paga guarda a data do pagamento.
- **[definido]** Ao excluir um cartão que já tem lançamentos ou parcelas, o app avisa e oferece **arquivar** (esconder, mantendo o histórico) em vez de apagar tudo.
- **[definido]** Guardar dinheiro numa caixinha não conta como despesa nem como receita: é só uma movimentação entre o que sobra do mês e o guardado. O valor guardado, porém, **reduz o disponível** do ciclo (ver seção 9.6).
- **[definido]** Receitas também podem ser recorrentes (como um salário), usando a mesma lógica das tarefas recorrentes (seção 4.10).
- **[definido]** Editar ou excluir uma parcela já lançada segue a mesma lógica das tarefas recorrentes (seção 4.10): o app pergunta se é "só esta parcela" ou "esta e as próximas".
- **[definido]** Na fatura futura, as parcelas pendentes aparecem detalhadas por compra (ex: "TV — parcela 3/10 — R$ 150"), não apenas como um total comprometido.

### 9.5 Telas e fluxos (detalhado)

**Tela principal de Finanças**
- Resumo do mês: total de receitas, total de despesas, saldo.
- Disponível para gastar, no ciclo e na semana (seção 9.6).
- Blocos de acesso rápido: Cartões, Contas fixas, Caixinha, Lançamentos (pix/boleto avulsos).

**Tela de Cartões**
- Lista dos cartões cadastrados, cada um mostrando a fatura atual (valor, vencimento, ícone de alerta se a data de fechamento não foi conferida) e o total comprometido nas faturas futuras.
- Ao abrir um cartão: lista de lançamentos da fatura (parcelas detalhadas por compra), opção de editar a data de fechamento do mês, botão "marcar fatura como paga".
- Cadastrar novo cartão / excluir (com aviso de arquivar se já houver lançamentos ou parcelas).

**Tela de Contas fixas**
- Lista das contas do mês com valor, vencimento e checkbox de pago.
- Editar valor daquele mês, adicionar/remover conta fixa.

**Tela de Caixinha**
- Lista de potes nomeados, cada um com nome e valor guardado.
- Guardar (soma ao pote e reduz o disponível do ciclo), retirar (subtrai do pote), ajustar o valor, editar o nome, criar novo pote, excluir pote.
- Total geral guardado (soma de todos os potes) em destaque.

**Lançamento avulso (pix/boleto)**
- Formulário: valor, descrição, data, tipo (receita/despesa), meio de pagamento. Em receitas extras, opção de contabilizar ou não no disponível (seção 9.6).

### 9.6 Disponível para gastar

**Objetivo:** enxergar quanto ainda dá para gastar sem que as faturas, somadas às contas fixas, ultrapassem o salário na hora de pagar.

- **[definido]** Não existe limite digitado: o app **calcula** o disponível.
- **[definido]** Fórmula: **disponível = salário − contas fixas do ciclo − faturas que vencem no ciclo − pix e boletos avulsos do ciclo − valor guardado na caixinha no ciclo**. Pix e boleto avulsos entram porque também saem do salário.
- **[definido]** O **ciclo** vai de um salário ao próximo.
- **[definido]** As contas fixas (aluguel, condomínio, celular, gás) entram no cálculo porque saem do salário, mas continuam à parte dos cartões.
- **[definido]** Toda compra nova no cartão aumenta a fatura e reduz o disponível automaticamente. Pix e boleto avulsos também reduzem.
- **[definido]** Pagar fatura não reduz o disponível de novo (regra da seção 9.4). Guardar na caixinha **reduz**, porque o dinheiro guardado fica fora do que pode ser gasto.
- **[sugestão]** Retirar de um pote devolve o valor ao disponível do ciclo. Ajustar o valor do pote diretamente (correção) não altera o disponível.
- **[definido]** Só entram no cálculo as faturas que **vencem no ciclo**. Uma compra que, pelo fechamento, cai na fatura do ciclo seguinte só desconta do disponível do ciclo seguinte, mesmo que tenha sido feita hoje.
- **[definido]** **Disponível da semana** = o que resta do ciclo dividido pelas semanas que faltam, incluindo a atual. O valor é recalculado a cada gasto: se você economiza, a semana seguinte sobe; se gasta a mais, ela desce. Não há acúmulo separado. Exemplo: R$ 1.600 disponíveis e 4 semanas dão R$ 400 por semana; gastando R$ 250 na primeira, restam R$ 1.350 para 3 semanas, ou seja, R$ 450 por semana.
- **[definido]** Onde aparece: Finanças mostra os **valores** (ciclo e semana); o Dashboard mostra só a **porcentagem** usada (seção 5). A porcentagem é calculada sobre o disponível da semana **no início da semana**, para o 100% não mudar a cada gasto. Se ultrapassar, aparece só um aviso.
- **[sugestão]** O ciclo é definido marcando uma receita recorrente como "salário" (seção 9.4), usando a data em que ela cai.
- **[definido]** Receitas extras (além do salário) têm uma opção para **contabilizar ou não** no disponível do ciclo. Se ficar de fora, o valor não entra no cálculo, o que permite guardar aquele dinheiro sem misturar com o salário.
- **[sugestão]** A opção começa **desmarcada** (o extra não conta) e pode ser alterada a qualquer momento. O salário sempre conta.

### 9.7 Decisões em aberto

- **[definido]** Salário é um **cadastro separado** (valor + dia em que cai), e não uma receita recorrente. Ele define o ciclo (substitui a sugestão da 9.6).
- **[definido]** Compra feita **no dia** do fechamento: **ajustável por cartão**. Cada cartão tem a opção "compra no dia do fechamento entra na fatura seguinte" (padrão: ligada, como na maioria dos bancos).
- **[definido]** Para excluir um pote que ainda tem dinheiro, o app **pede para retirar o valor antes**. Só pote zerado pode ser excluído.

---

## 10. Módulo Configurações

### 10.1 Objetivo

Ponto único para ligar/desligar módulos e ajustar as preferências que hoje estão espalhadas pelos outros módulos.

### 10.2 Regras

- **[definido]** Ativar/desativar cada módulo por checkbox (Dashboard, Kanban, Treinos, Lista de compras, Finanças). Módulo desativado some do menu e do Dashboard.
- **[definido]** Reúne as preferências que outros módulos já previam como configuráveis, em vez de deixá-las soltas dentro de cada tela:
  - Dia de início do lembrete de contas fixas no Dashboard (padrão dia 5 — seção 5).
  - Meta de treinos por semana (padrão 5 — seção 7.5).
- **[sugestão]** Tela simples, uma lista: módulos no topo (com os checkboxes) e as preferências acima logo abaixo, sem sub-telas.

### 10.3 Decisões em aberto

Sem decisões em aberto no módulo Configurações.

## 11. Login

### 11.1 Objetivo

Autenticação simples hoje, mas já pensada para permitir compartilhar o app com outras pessoas no futuro (seção 13, Backlog) sem precisar refazer o modelo de dados depois.

### 11.2 Regras

- **[definido]** Login com Google, sem cadastro de senha própria.
- **[definido]** Todo dado (card, tag, lançamento, treino, item de lista) já nasce vinculado ao usuário dono, mesmo com um usuário só hoje — é o que já aparece no rascunho de modelo de dados do Kanban (seção 4.7).
- **[sugestão]** Usar Supabase Auth para o login com Google: ele cuida do fluxo OAuth e entrega um token (JWT) que o back-end (FastAPI) só precisa validar, sem implementar OAuth na mão. Faz sentido em conjunto com a seção 12, caso o banco também fique no Supabase.
- **[sugestão]** Enquanto for só você usando, não existe convite nem permissão — é só a conta logada. Quando entrar compartilhamento (backlog), aí sim definir se é por e-mail convidado, código de convite, etc.

### 11.3 Decisões em aberto

Sem decisões em aberto no módulo Login, além do que já está no Backlog (compartilhamento).

## 12. Infraestrutura e custos

**[sugestão]** — proposta abaixo, pesquisada agora porque hospedagem gratuita muda com frequência; peço sua aprovação antes de considerar fechado.

- **Front (PWA/React):** Cloudflare Pages. Free tier com banda ilimitada e sem restrição para uso comercial, o que dá folga caso o app cresça. Vercel ou Netlify são alternativas equivalentes se preferir.
- **Back-end (Python/FastAPI):** Render, no free tier de web service (suporta Python e Docker). Ele "dorme" depois de um tempo sem uso e demora alguns segundos para acordar na primeira requisição — tranquilo para um app pessoal de baixo tráfego.
- **Banco de dados:** Supabase (Postgres), em vez do Postgres gratuito do próprio Render — o do Render expira depois de 90 dias, o do Supabase não tem esse prazo. Como bônus, o Supabase também resolve o login (seção 11.2).
- **PWA:** HTTPS (incluso nas hospedagens acima), arquivo de manifesto do app e service worker (cache/offline).
- **[definido]** Offline na versão mais simples: o app (telas) abre sem internet pelo cache do service worker, e só a **lista de compras** guarda os dados localmente para funcionar sem internet (seção 8.3). Os outros módulos precisam de conexão. Sincronização offline completa fica para o backlog.
- **Backup:** exportação periódica do banco (Supabase permite dump manual do Postgres); frequência ainda a definir — mensal deve bastar para um app pessoal.

### 12.1 Decisões em aberto

- Confirmar a combinação Cloudflare Pages + Render + Supabase, ou preferir outra.
- Frequência do backup (sugestão: mensal).

## 13. Backlog (ideias futuras)

- Compartilhamento com outras pessoas
- Offline completo (todos os módulos), com sincronização quando a internet voltar

## 14. Histórico de decisões

- Kanban e Tarefas viram um módulo só; o dia atual aparece no Dashboard.
- Kanban com 7 colunas de dias e seções Finalizados, Atrasados e Eventos futuros, filtráveis.
- Evento futuro é só um card com data além da semana.
- Card atrasado na semana mostra ícone; fora da semana vai para Atrasados.
- Várias tags por card, com filtro por tag.
- Finanças: contas fixas (valor variável) ficam à parte dos cartões; cartões podem ser cadastrados e excluídos; haverá área de caixinha/cofrinho.
- Finanças: cada cartão tem fechamento padrão, com alerta para conferir a data todo mês (manual).
- Dashboard: cards em andamento e atrasados também aparecem.
- Kanban mostra somente a semana atual.
- Tarefas recorrentes entram no Kanban; editar/excluir pergunta se vale só para a ocorrência ou também para as próximas.
- Layout em grade, sem scroll horizontal; blocos empilhados no celular (rolagem vertical aceita).
- App como PWA.
- Notificações só dentro do app.
- Caixinha/cofrinho dividida em potes nomeados, mostrando só o valor guardado (sem histórico nem meta).
- Compra parcelada: lançamento informa valor da parcela + número de parcelas.
- Editar/excluir parcela segue a lógica de recorrência (só esta ou esta e as próximas).
- Fatura futura mostra parcelas pendentes detalhadas por compra.
- Módulo Finanças com telas e fluxos detalhados (seção 9.5).
- Treinos: sem plano fixo por dia — dia é montado arrastando blocos (programas com sessões ou treinos avulsos) num modelo kanban, com histórico só de consulta.
- Treinos: bloco é uma lista de etapas de três tipos (tempo, repetições, distância), que podem se misturar.
- Treinos: cada bloco tem cronômetro em modal, iniciado pelo card do dia, com pausa/retomar, pular e voltar etapa.
- Treinos: etapa por tempo avança sozinha; por repetições, conclusão manual da série com descanso automático; por distância, check manual.
- Treinos: ao fim do cronômetro, mensagem de parabéns, bloco concluído e modal fechado.
- Treinos: fechar o modal no meio guarda o progresso e o bloco é retomado da etapa em que parou.
- Treinos: Dashboard mostra "Treino de hoje" com progresso e estados (não iniciado, em andamento, concluído).
- Finanças: aprovadas as regras da seção 9.4 (alerta de fechamento, compra após fechamento, sugestão de fatura, pagamento de fatura sem contar em dobro, ocorrência mensal das contas fixas, data de pagamento, arquivar cartão, caixinha fora de receita/despesa, receitas recorrentes).
- Dashboard: não mostra valores de Finanças; mostra lembrete de contas fixas com contagem regressiva (padrão dia 5) e aviso em porcentagem do disponível para gastar.
- Finanças: em vez de limite digitado, o app calcula o disponível para gastar, por ciclo e por semana (fórmula completa na seção 9.6, depois ampliada com pix/boletos avulsos e caixinha).
- Finanças: o disponível da semana é o restante do ciclo dividido pelas semanas que faltam, recalculado a cada gasto.
- Finanças: compra cuja fatura vence no ciclo seguinte só desconta do disponível do ciclo seguinte.
- Finanças: receitas extras têm opção de contabilizar ou não no disponível do ciclo, para poder guardar o valor sem misturar com o salário.
- Lista de compras: lista única, com itens agrupados por categoria, uso offline e sugestão de itens frequentes.
- Lista de compras: área ao lado da lista registra só o total gasto, com título e meio de pagamento, e cria a despesa em Finanças (entrando na fatura, se for cartão).
- Lista de compras: registrar o gasto não limpa a lista; "Concluir lista" arquiva a lista por um tempo (só consulta) e ela alimenta as sugestões de itens. O título do lançamento é editável.
- Lista de compras: tag IMPORTANTE deixa os itens na parte de cima da lista; os não importantes ficam abaixo, para outro momento.
- Finanças: a caixinha guarda o que estiver disponível; guardar num pote reduz o disponível do ciclo ("esconder" para não gastar).
- Finanças: pix e boletos avulsos entram na fórmula do disponível.
- Finanças/Dashboard: a porcentagem do aviso de gastos usa o disponível da semana no início da semana; ultrapassar mostra só um aviso.
- Dashboard: o dia 5 do lembrete de contas fixas é o fechamento fictício dos cartões, sem relação com a data do salário.
- Treinos: o treino não vai para o Kanban; o Dashboard mostra bolinhas dos últimos 5 dias e o total do mês em x/N.
- Lista de compras: o único vínculo com Finanças é o valor pago, registrado ao sair do mercado, entrando no cartão indicado.
- Lista de compras: tag IMPORTANTE vira uma seção única no topo da lista, juntando itens de todas as categorias.
- Configurações: além do checkbox de módulos, reúne preferências que já eram configuráveis em outros módulos (dia do lembrete de contas fixas, meta de treinos semanal).
- Login: dado já nasce vinculado ao usuário dono desde já, preparando para o compartilhamento futuro sem refazer o modelo de dados.
- Front: stack definida (Vite + React + TypeScript, Tailwind v4, React Router, @dnd-kit, react-hook-form + zod, date-fns, lucide-react, zustand, vite-plugin-pwa, recharts).
- Front: estrutura por features, sem imports entre features (exceto o Dashboard, que só lê).
- Front: o esboço visual é só referência de estilo; a documentação prevalece.
- Back-end trocado de Java Spring Boot para **Python (FastAPI)**, para aprendizado e portfólio.
- Regras de negócio (disponível, faturas, recorrência, seções do Kanban) ficam no back, com testes; o front só exibe.
- Dexie (banco no navegador) descartado: o front fala direto com a API, por uma camada de repositórios.
- Offline simples: o app abre sem internet e só a lista de compras funciona offline.
- Projeto organizado em monorepo: `frontend/`, `backend/`, `docs/`.
- Todo o código em inglês; interface e documentação em português. Mensagens de commit também em inglês.
- Finanças: salário é cadastro separado (valor + dia); compra no dia do fechamento é ajustável por cartão (padrão: fatura seguinte); pote com dinheiro só é excluído depois de retirar o valor.

---

## 15. Front-end: stack, instalação e estrutura

O front fica em `frontend/`. Ele não acessa o banco diretamente: conversa com o back-end (seção 16) por uma camada de repositórios (15.5).

### 15.1 Stack

- **[definido]** Todas as bibliotecas abaixo.

| Necessidade | Biblioteca |
|---|---|
| Base | Vite + React + TypeScript |
| Estilo | Tailwind CSS v4 (com os tokens da paleta, seção 2.1) |
| Rotas | React Router |
| Drag & drop (Kanban e Treinos) | @dnd-kit |
| Formulários | react-hook-form + zod |
| Datas (semana, atrasado, contagem regressiva) | date-fns |
| Ícones | lucide-react |
| Estado de tela / preferências | zustand |
| PWA e cache offline | vite-plugin-pwa |
| Gráficos | recharts |

- **[definido]** Sem Dexie: os dados vêm da API. Enquanto a API de um módulo não existe, o repositório desse módulo usa uma implementação local temporária (localStorage), com a mesma interface.

### 15.2 Como rodar

```bash
cd frontend
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # checagem de tipos + build de produção
npm run lint
```

### 15.3 Estrutura de pastas

```
frontend/src/
├─ app/                     # App, router, providers, guards de rota
├─ components/
│  ├─ ui/                   # Button, Input, Badge, Card, Modal, Checkbox...
│  └─ layout/               # Sidebar, Header, AppShell, NotificationBell
├─ features/                # um módulo = uma pasta
│  ├─ dashboard/
│  ├─ kanban/               # components/, hooks/, utils/, types.ts
│  ├─ workouts/             # (treinos)
│  ├─ shopping/             # (compras)
│  ├─ finance/              # (finanças)
│  ├─ notifications/
│  ├─ settings/             # (configurações)
│  └─ auth/
├─ data/
│  ├─ api.ts                # cliente HTTP (fetch + token do login)
│  └─ repositories/         # cardRepository, tagRepository... (local → API)
├─ hooks/                   # useModules, useWakeLock, useNow
├─ lib/                     # datas, moeda (BRL), ids
├─ styles/index.css         # Tailwind + tokens
└─ main.tsx
```

- **[definido]** Uma feature **não importa de outra feature**. O que é compartilhado vai para `components/`, `lib/`, `hooks/` ou `data/`.
- **[definido]** Exceção: o Dashboard apenas **lê** dados de outros módulos, via repositories.
- **[definido]** Nomes de pastas, arquivos e código em inglês (as pastas `treinos/`, `compras/`, `financas/`, `configuracoes/` atuais serão renomeadas na refatoração de cada módulo).

### 15.4 Tokens da paleta

Os tokens do Tailwind seguem a tabela da seção 2.1, em `src/styles/index.css` (`bg-surface`, `text-muted`, `border-border`, `bg-primary`, `hover:bg-primary-hover`). Como o tema é só escuro, não existe troca de tema.

### 15.5 Camada de dados

- **[definido]** As telas nunca chamam a API diretamente: sempre passam por `data/repositories/`.
- **[definido]** Cada repositório tem uma interface única; trocar a implementação local pela da API não muda as telas.
- **[definido]** As regras de negócio (disponível, faturas, recorrência, seções do Kanban) são calculadas no back. O front pode manter cálculos só de exibição.

### 15.6 PWA

- **[em aberto]** Configurar o `vite-plugin-pwa` (manifesto, ícones `icon-192.png` e `icon-512.png`, service worker).
- **[definido]** Offline simples (seção 12): telas em cache e só a lista de compras com dados locais.

### 15.7 Ordem de construção

1. **[feito]** Shell, Configurações, componentes `ui/`.
2. **[feito, parcial]** Kanban, Compras, Treinos e Finanças com dados locais.
3. Camada de repositórios, tradução do código para inglês e correções.
4. Ligar cada módulo à API, conforme o back fica pronto. **[feito]** Kanban.
5. Dashboard, Notificações, Login e PWA.

### 15.8 Esboço visual

- **[definido]** O esboço de telas é apenas **referência de estilo**. Quando houver conflito com esta documentação, a documentação vale.

### 15.9 Pendências conhecidas (avaliação de 24/10/2026)

- Kanban: ~~recorrência, editar/excluir tags~~ (feito, ligado à API); falta lembrete de evento (seção 6) e editar a regra de repetição pela tela (a API já tem `PATCH /api/recurrences/{id}`).
- Treinos: adicionar/editar/excluir na biblioteca; cronômetro perde tempo quando o app fica em segundo plano (a próxima etapa começa na hora do "tick", e não no fim da anterior).
- Compras: sugestão de itens frequentes, tela "Listas anteriores", ordem das categorias, gasto virar despesa em Finanças.
- Finanças: receitas recorrentes; excluir pote devolve o valor ao disponível sem avisar; lançamentos com data futura somem da lista.
- Dashboard, Notificações, Login e PWA ainda não existem.
- Nenhum registro tem o campo de usuário dono (resolvido quando os dados passarem a vir do back).

---

## 16. Back-end: stack e estrutura

O back fica em `backend/`. Ele guarda os dados, valida o login e concentra as regras de negócio.

### 16.1 Stack

- **[definido]** Python com as bibliotecas abaixo.

| Necessidade | Biblioteca | Equivalente no Java |
|---|---|---|
| Framework web / API REST | FastAPI | Spring Web (`@RestController`) |
| Validação e formato dos dados (entrada/saída) | Pydantic v2 | DTOs / records + Bean Validation |
| Acesso ao banco (ORM) | SQLAlchemy 2 | JPA / Hibernate |
| Migrações do banco | Alembic | Flyway / Liquibase |
| Banco de dados | PostgreSQL (Supabase) | — |
| Servidor | Uvicorn | Tomcat embutido |
| Testes | pytest | JUnit |
| Dependências e ambiente | uv + `pyproject.toml` | Maven + `pom.xml` |
| Lint e formatação | Ruff | Checkstyle / Spotless |
| Configuração (.env) | pydantic-settings | `application.properties` |

### 16.2 Estrutura de pastas (proposta)

```
backend/
├─ pyproject.toml           # dependências e configuração (≈ pom.xml)
├─ .env.example             # variáveis de ambiente (URL do banco etc.)
├─ alembic.ini
├─ migrations/              # histórico de alterações do banco
├─ app/
│  ├─ main.py               # cria a aplicação FastAPI e registra as rotas
│  ├─ core/
│  │  ├─ config.py          # leitura do .env
│  │  ├─ database.py        # conexão e sessão do banco
│  │  └─ security.py        # validação do token do login
│  └─ modules/              # um módulo = uma pasta, como no front
│     └─ kanban/
│        ├─ models.py       # tabelas (≈ @Entity)
│        ├─ schemas.py      # formato de entrada/saída da API (≈ DTO)
│        ├─ repository.py   # consultas ao banco (≈ Repository)
│        ├─ service.py      # regras de negócio (≈ @Service)
│        └─ router.py       # endpoints (≈ @RestController)
└─ tests/
   └─ kanban/
```

### 16.3 Convenções

- **[definido]** Código em inglês. No Python, `snake_case` para variáveis e funções e `PascalCase` para classes.
- **[sugestão]** O JSON da API usa `camelCase` (como o TypeScript do front); o Pydantic converte para `snake_case` no Python automaticamente.
- **[sugestão]** Rotas REST no plural e em inglês: `/api/cards`, `/api/tags`, `/api/workouts`, `/api/shopping-items`, `/api/transactions`...
- **[definido]** Toda tabela tem `user_id` (seção 11.2), e toda consulta filtra pelo usuário logado.
- **[sugestão]** IDs em UUID; datas e horas guardadas em UTC.

### 16.4 Autenticação

- **[sugestão]** O front faz o login com Google pelo Supabase Auth e envia o token em cada requisição (`Authorization: Bearer ...`). O back só valida o token e descobre o usuário. Em desenvolvimento, um usuário fixo de teste.

### 16.5 Ordem de construção

1. Esqueleto: projeto, configuração, banco, rota de saúde (`/health`) e a documentação automática da API (`/docs`).
2. **Kanban**: tags e cards (CRUD), cálculo das seções da semana, depois recorrência.
3. Compras, Treinos e Finanças, um por vez, cada um com testes.
4. Login real, Notificações e Dashboard (que só lê dados dos outros módulos).
5. Deploy (Render + Supabase) e CI (GitHub Actions rodando lint e testes).

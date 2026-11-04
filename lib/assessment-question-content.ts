type AssessmentQuestionContent = {
  pergunta: string;
  respostas: readonly [string, string, string, string, string];
};

export const assessmentQuestionContent: Record<number, AssessmentQuestionContent> = {
  1: {
    pergunta: "Durante uma atividade importante surge um problema inesperado e ninguém toma a iniciativa de agir imediatamente.",
    respostas: ["Prefiro aguardar alguém definir o que deve ser feito.", "Normalmente espero orientação antes de agir.", "Posso ajudar na solução dependendo da situação.", "Costumo tomar iniciativa quando percebo que ninguém está conduzindo.", "Naturalmente assumo a frente para ajudar a resolver a situação."],
  },
  2: {
    pergunta: "Uma decisão precisa ser tomada rapidamente para evitar impactos em uma atividade importante.",
    respostas: ["Prefiro que outra pessoa tome a decisão.", "Só decido depois que recebo orientação.", "Consigo decidir em situações mais simples.", "Costumo decidir com segurança quando necessário.", "Sinto-me confortável em tomar decisões rápidas e assumir suas consequências."],
  },
  3: {
    pergunta: "Uma tarefa importante precisa de alguém que assuma a responsabilidade pelo resultado final.",
    respostas: ["Evito assumir responsabilidades além da minha atividade.", "Prefiro apenas executar o que foi solicitado.", "Assumo responsabilidades quando necessário.", "Frequentemente assumo responsabilidades adicionais.", "Gosto de ser responsável pelos resultados alcançados."],
  },
  4: {
    pergunta: "Durante um trabalho em grupo falta organização para que as atividades avancem.",
    respostas: ["Aguardo alguém organizar a equipe.", "Participo apenas quando solicitado.", "Dou sugestões quando percebo necessidade.", "Ajudo a coordenar as atividades.", "Assumo naturalmente a liderança para organizar o grupo."],
  },
  5: {
    pergunta: "Você identifica uma oportunidade de melhorar uma rotina já estabelecida.",
    respostas: ["Prefiro manter as coisas como estão.", "Raramente proponho mudanças.", "Posso sugerir melhorias dependendo da situação.", "Costumo apresentar ideias de melhoria.", "Busco ativamente oportunidades para melhorar processos e resultados."],
  },
  6: {
    pergunta: "Um novo integrante ainda está aprendendo a rotina da equipe e faz perguntas básicas.",
    respostas: ["Prefiro que ele procure as respostas por conta própria.", "Respondo apenas quando sou questionado.", "Ajudo quando tenho disponibilidade.", "Procuro orientar para facilitar sua adaptação.", "Faço questão de acolher, orientar e integrar novos colegas."],
  },
  7: {
    pergunta: "Durante uma reunião surgem discussões sobre melhorias para a equipe.",
    respostas: ["Prefiro não participar das discussões.", "Participo apenas quando perguntam minha opinião.", "Contribuo ocasionalmente.", "Costumo compartilhar ideias e sugestões.", "Gosto de incentivar discussões produtivas e envolver as pessoas."],
  },
  8: {
    pergunta: "A equipe enfrenta um período de maior pressão e algumas pessoas demonstram desânimo.",
    respostas: ["Foco apenas nas minhas atividades.", "Raramente me envolvo com a motivação da equipe.", "Posso apoiar quando percebo necessidade.", "Procuro incentivar os colegas.", "Costumo ser uma das pessoas que mais motiva a equipe."],
  },
  9: {
    pergunta: "Você aprende algo que pode facilitar o trabalho de outras pessoas.",
    respostas: ["Guardo o conhecimento para mim.", "Compartilho apenas se perguntarem.", "Comento com alguns colegas.", "Procuro compartilhar com a equipe.", "Faço questão de ensinar e multiplicar o conhecimento."],
  },
  10: {
    pergunta: "Um colega procura sua opinião antes de tomar uma decisão.",
    respostas: ["Prefiro não me envolver.", "Dou respostas curtas e objetivas.", "Ajudo quando conheço o assunto.", "Procuro orientar e contribuir.", "Gosto de conversar, entender o contexto e apoiar a decisão."],
  },
  11: {
    pergunta: "Uma mudança inesperada altera atividades que já estavam planejadas para o dia.",
    respostas: ["Fico muito incomodado com mudanças de última hora.", "Demoro para me adaptar.", "Consigo me ajustar após compreender a mudança.", "Adapto-me sem grandes dificuldades.", "Mantenho a calma e reorganizo minhas atividades rapidamente."],
  },
  12: {
    pergunta: "Você precisa trabalhar com pessoas de áreas diferentes para alcançar um objetivo comum.",
    respostas: ["Prefiro trabalhar sozinho.", "Tenho dificuldade para atuar em grupo.", "Consigo colaborar quando necessário.", "Trabalho bem com diferentes pessoas.", "Facilito a cooperação entre as pessoas envolvidas."],
  },
  13: {
    pergunta: "Uma atividade precisa ser executada seguindo a mesma rotina já utilizada diversas vezes.",
    respostas: ["Rotinas repetitivas me incomodam bastante.", "Tenho dificuldade em manter constância.", "Consigo seguir a rotina normalmente.", "Valorizo a consistência e organização.", "Tenho facilidade em manter padrões e estabilidade."],
  },
  14: {
    pergunta: "Surge uma divergência de opiniões entre colegas durante uma atividade.",
    respostas: ["Costumo entrar na discussão.", "Tenho dificuldade para lidar com conflitos.", "Procuro não me envolver.", "Ajudo a reduzir o conflito.", "Busco promover entendimento e cooperação."],
  },
  15: {
    pergunta: "Uma tarefa importante exige alguém em quem a equipe possa confiar.",
    respostas: ["Raramente sou lembrado para esse tipo de responsabilidade.", "Sou escolhido apenas em algumas situações.", "Posso ser escolhido dependendo da tarefa.", "Frequentemente sou considerado confiável.", "Sou reconhecido como uma pessoa confiável e consistente."],
  },
  16: {
    pergunta: "Existe um procedimento definido para executar uma atividade específica.",
    respostas: ["Prefiro fazer da maneira que considero mais prática.", "Sigo apenas as etapas que considero importantes.", "Procuro seguir a maior parte do procedimento.", "Sigo os procedimentos normalmente.", "Faço questão de seguir todas as etapas previstas."],
  },
  17: {
    pergunta: "Antes de concluir uma atividade ainda é possível realizar uma conferência adicional dos detalhes.",
    respostas: ["Considero desnecessário revisar.", "Faço apenas uma conferência rápida.", "Verifico os pontos principais.", "Costumo revisar com atenção.", "Gosto de conferir cuidadosamente antes de concluir."],
  },
  18: {
    pergunta: "Você recebe uma solicitação considerada urgente.",
    respostas: ["Inicio imediatamente sem analisar muito.", "Faço apenas uma avaliação rápida.", "Analiso os principais pontos antes de agir.", "Costumo avaliar possíveis impactos.", "Procuro compreender completamente a situação antes de agir."],
  },
  19: {
    pergunta: "Uma atividade exige preenchimento de informações após sua conclusão.",
    respostas: ["Vejo pouco valor nesse registro.", "Registro apenas parte das informações.", "Faço o registro básico necessário.", "Procuro registrar corretamente as informações.", "Tenho grande preocupação com registros completos e precisos."],
  },
  20: {
    pergunta: "Você conclui uma tarefa e existe tempo disponível para revisar o resultado antes da entrega.",
    respostas: ["Entrego sem revisar.", "Reviso apenas quando considero necessário.", "Faço uma conferência básica.", "Costumo revisar antes de concluir.", "Sempre verifico a qualidade antes da entrega."],
  },
  21: {
    pergunta: "Você percebe uma condição que não gerou acidente, mas pode representar risco futuramente.",
    respostas: ["Não vejo necessidade de agir enquanto ninguém for afetado.", "Normalmente apenas observo a situação.", "Dependendo do risco, posso comunicar alguém.", "Costumo alertar os responsáveis quando identifico riscos.", "Considero minha responsabilidade agir imediatamente para evitar acidentes."],
  },
  22: {
    pergunta: "Durante uma atividade, surge uma situação que parece segura para alguns colegas, mas gera dúvida em você.",
    respostas: ["Continuo a atividade sem questionar.", "Observo a situação, mas raramente me manifesto.", "Posso fazer perguntas dependendo do contexto.", "Costumo esclarecer minhas dúvidas antes de continuar.", "Prefiro interromper ou revisar a situação até ter segurança para prosseguir."],
  },
  23: {
    pergunta: "Uma tarefa será iniciada após um longo período sem ser executada pela equipe.",
    respostas: ["Começo o trabalho da mesma forma de sempre.", "Faço apenas uma verificação rápida antes de iniciar.", "Procuro revisar os pontos mais importantes.", "Verifico cuidadosamente condições e orientações antes de começar.", "Faço questão de confirmar todos os requisitos de segurança antes da execução."],
  },
  24: {
    pergunta: "Você identifica uma situação que não está conforme as práticas de segurança esperadas.",
    respostas: ["Não considero minha responsabilidade tratar o assunto.", "Apenas observo e sigo minhas atividades.", "Posso comunicar dependendo da gravidade.", "Costumo reportar situações inseguras.", "Sempre tomo alguma ação para evitar que a situação continue."],
  },
  25: {
    pergunta: "Colegas observam constantemente sua forma de trabalhar durante as atividades.",
    respostas: ["Não me preocupo em servir de exemplo.", "Penso pouco no impacto do meu comportamento.", "Procuro agir corretamente na maioria das situações.", "Tenho atenção ao meu comportamento porque ele influencia outras pessoas.", "Acredito que devo ser um exemplo consistente de práticas seguras."],
  },
  26: {
    pergunta: "Existe uma forma definida de executar uma atividade, mas um atalho poderia torná-la mais rápida.",
    respostas: ["Normalmente escolho o caminho mais rápido.", "Posso utilizar atalhos quando considero seguro.", "Avalio cada situação antes de decidir.", "Prefiro seguir o processo estabelecido.", "Acredito que cumprir o processo é mais importante do que ganhar tempo."],
  },
  27: {
    pergunta: "Ao finalizar uma atividade ainda faltam registros ou informações para serem atualizados.",
    respostas: ["Considero os registros uma formalidade sem grande importância.", "Atualizo apenas o mínimo necessário.", "Registro as principais informações.", "Procuro manter os registros completos.", "Só considero a atividade encerrada quando toda a documentação está correta."],
  },
  28: {
    pergunta: "Sua rotina diária depende do cumprimento de horários e etapas previamente definidos.",
    respostas: ["Tenho dificuldade em seguir horários e rotinas.", "Cumpro apenas o que considero mais importante.", "Consigo seguir a rotina na maioria das vezes.", "Procuro cumprir horários e etapas conforme planejado.", "Sou altamente comprometido com a disciplina e consistência das rotinas."],
  },
  29: {
    pergunta: "Uma verificação periódica precisa ser realizada mesmo sem sinais aparentes de problema.",
    respostas: ["Não vejo necessidade se tudo parece normal.", "Posso deixar a verificação para outro momento.", "Realizo quando considero importante.", "Costumo cumprir as verificações programadas.", "Entendo que verificações preventivas são fundamentais para evitar problemas."],
  },
  30: {
    pergunta: "Você recebe orientação para executar uma atividade seguindo um padrão já definido.",
    respostas: ["Prefiro executar da minha própria maneira.", "Sigo apenas as partes que considero necessárias.", "Procuro seguir o padrão na maior parte do tempo.", "Normalmente sigo o padrão estabelecido.", "Faço questão de seguir rigorosamente os padrões definidos."],
  },
  31: {
    pergunta: "Você conclui suas atividades e percebe que um colega ainda enfrenta dificuldades para finalizar as dele.",
    respostas: ["Entendo que cada pessoa deve ser responsável pela própria atividade.", "Normalmente sigo minha rotina após concluir minhas tarefas.", "Posso ajudar dependendo da situação.", "Frequentemente ofereço ajuda quando percebo necessidade.", "Acredito que o resultado da equipe é mais importante do que apenas concluir minha parte."],
  },
  32: {
    pergunta: "Você adquiriu uma experiência que pode facilitar o trabalho dos seus colegas.",
    respostas: ["Prefiro guardar esse conhecimento para mim.", "Compartilho apenas quando perguntam.", "Posso compartilhar em algumas situações.", "Gosto de dividir experiências com os colegas.", "Faço questão de compartilhar conhecimento para fortalecer a equipe."],
  },
  33: {
    pergunta: "A equipe enfrenta um problema que afeta várias pessoas ao mesmo tempo.",
    respostas: ["Foco apenas nas minhas responsabilidades.", "Ajudo apenas se for solicitado.", "Posso contribuir dependendo da situação.", "Procuro colaborar para resolver o problema.", "Sinto-me responsável por contribuir ativamente para a solução coletiva."],
  },
  34: {
    pergunta: "Durante uma discussão alguém apresenta uma opinião diferente da sua.",
    respostas: ["Tenho dificuldade em aceitar opiniões diferentes.", "Normalmente defendo meu ponto de vista sem considerar outras ideias.", "Escuto outras opiniões antes de decidir.", "Procuro compreender pontos de vista diferentes.", "Valorizo opiniões diversas como forma de melhorar as decisões."],
  },
  35: {
    pergunta: "Um novo colaborador está em fase de adaptação à rotina da área.",
    respostas: ["Acredito que ele deve aprender sozinho.", "Ajudo apenas quando solicitado.", "Posso orientá-lo em algumas situações.", "Procuro ajudá-lo a se adaptar.", "Faço questão de apoiar sua integração e desenvolvimento."],
  },
  36: {
    pergunta: "Você recebe uma informação importante que pode impactar o trabalho da próxima equipe.",
    respostas: ["Considero que cada pessoa deve buscar suas próprias informações.", "Comunico apenas o que considero essencial.", "Compartilho as informações principais.", "Procuro transmitir todas as informações relevantes.", "Faço questão de garantir que a outra pessoa compreendeu corretamente a informação."],
  },
  37: {
    pergunta: "Um colega solicita uma informação ou apoio para concluir uma atividade.",
    respostas: ["Raramente dou retorno.", "Respondo apenas quando tenho tempo disponível.", "Costumo responder quando possível.", "Procuro retornar de forma clara e rápida.", "Considero importante manter uma comunicação ágil e confiável."],
  },
  38: {
    pergunta: "Alguém explica uma situação complexa antes de você apresentar sua opinião.",
    respostas: ["Costumo interromper ou responder rapidamente.", "Escuto apenas parte da explicação.", "Procuro entender os pontos principais.", "Escuto atentamente antes de responder.", "Valorizo compreender completamente a situação antes de me posicionar."],
  },
  39: {
    pergunta: "Você precisa explicar uma situação para pessoas com diferentes níveis de experiência.",
    respostas: ["Tenho dificuldade em adaptar minha comunicação.", "Explico apenas o básico.", "Procuro ser compreendido pela maioria das pessoas.", "Adapto minha comunicação ao público.", "Tenho facilidade para transmitir informações de forma clara para qualquer pessoa."],
  },
  40: {
    pergunta: "Uma informação importante precisa ser registrada para consulta futura.",
    respostas: ["Costumo confiar apenas na memória.", "Registro apenas parte das informações.", "Faço registros básicos quando necessário.", "Procuro documentar as informações relevantes.", "Considero essencial registrar informações de forma clara e completa."],
  },
};

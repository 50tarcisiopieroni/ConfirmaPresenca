const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_SFZTbd4fvuREtdTNS4shXELg-oqgIrDoSZkqBHMQwj7xmEE_RzicC1tzrtnywdCQwg/exec';

const form = document.getElementById('rsvp-form');
const validationMessage = document.getElementById('validation-message');
const statusMessage = document.getElementById('status-message');

// Containers para os dois tipos de formulário
const groupMembersArea = document.getElementById('group-members-area');
const singlePersonArea = document.getElementById('single-person-area');

// Campos de formulário
const hiddenGrupoIdInput = document.getElementById('grupoId');
const hiddenCodigoInput = document.getElementById('codigo');

// Função para validar o código e decidir qual formulário mostrar
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo');

    if (!codigo) {
        validationMessage.textContent = 'Código de convite não encontrado na URL.';
        return;
    }

    const validationUrl = `${SCRIPT_URL}?codigo=${codigo}`;
    
    fetch(validationUrl)
        .then(response => response.json())
        .then(data => {
            if (data.result === 'success') {
                const groupMembers = data.groupMembers;
                hiddenGrupoIdInput.value = data.groupId;

                // --- LÓGICA CONDICIONAL PARA EXIBIR O FORMULÁRIO CORRETO ---
                if (groupMembers.length > 1) {
                    // LÓGICA PARA GRUPOS (com botões de rádio individuais)
                    const primaryGuestName = groupMembers[0].nome;
                    validationMessage.textContent = `Olá, ${primaryGuestName}! Confirme a presença do seu grupo.`;
                    
                    groupMembers.forEach(member => {
                        const memberRow = document.createElement('div');
                        memberRow.className = 'group-member-row';
                        // Guarda o código do membro no próprio elemento para facilitar a coleta depois
                        memberRow.setAttribute('data-codigo', member.codigo); 

                        // Template HTML para cada membro
                        memberRow.innerHTML = `
                            <span class="member-name">${member.nome}</span>
                            <div class="radio-group">
                                <input type="radio" id="sim_${member.codigo}" name="presenca_${member.codigo}" value="Sim" class="sim-option" checked>
                                <label for="sim_${member.codigo}" style="color: green;">Vai</label>
                                
                                <input type="radio" id="nao_${member.codigo}" name="presenca_${member.codigo}" value="Não" class="nao-option">
                                <label for="nao_${member.codigo}" style="color: red;">Não vai</label>
                            </div>
                        `;
                        groupMembersArea.appendChild(memberRow);
                    });
                    groupMembersArea.classList.remove('hidden');

                } else {
                    // LÓGICA PARA CONVIDADO ÚNICO
                    const member = groupMembers[0];
                    validationMessage.textContent = `Olá, ${member.nome}! Por favor, confirme sua presença.`;
                    
                    document.getElementById('nome').value = member.nome;
                    hiddenCodigoInput.value = member.codigo; // Guarda o código para o envio
                    
                    // Adiciona as classes de cor aos botões de rádio do formulário individual
                    document.getElementById('sim').classList.add('sim-option');
                    document.getElementById('nao').classList.add('nao-option');
                    
                    singlePersonArea.classList.remove('hidden');
                }
                
                form.classList.remove('hidden'); // Exibe o formulário principal

            } else {
                 if(data.error === 'ja_respondeu'){
                   validationMessage.textContent = 'Obrigado! Sua presença (ou do seu grupo) já foi respondida.';
                   validationMessage.style.color = 'blue';
                } else {
                   validationMessage.textContent = 'Seu código de convite é inválido ou expirou.';
                   validationMessage.style.color = 'red';
                }
            }
        })
        .catch(error => {
            console.error('Erro de validação:', error);
            validationMessage.textContent = 'Não foi possível verificar seu convite. Tente recarregar a página.';
        });
});

// Lógica para enviar o formulário (agora funciona para todos os casos)
form.addEventListener('submit', e => {
    e.preventDefault();
    const submitButton = form.querySelector('button');
    let confirmedCodes = [];

    // --- LÓGICA CONDICIONAL PARA COLETAR OS DADOS CORRETOS ---
    const isGroupMode = !groupMembersArea.classList.contains('hidden');

    if (isGroupMode) {
        // Coleta dados das linhas de cada membro
        const memberRows = document.querySelectorAll('.group-member-row');
        memberRows.forEach(row => {
            const memberCode = row.getAttribute('data-codigo');
            const isComing = document.getElementById(`sim_${memberCode}`).checked;
            if (isComing) {
                confirmedCodes.push(memberCode);
            }
        });
    } else {
        // Coleta dados do formulário de convidado único
        if (document.getElementById('sim').checked) {
            confirmedCodes.push(hiddenCodigoInput.value);
        }
    }

    const formData = new FormData(form);
    formData.append('confirmed_codes', confirmedCodes.join(','));
    
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    // Envia os dados para o script
    fetch(SCRIPT_URL, { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.result === 'success') {
                form.classList.add('hidden');
                validationMessage.textContent = 'Obrigado! Confirmação recebida com sucesso!';
                validationMessage.style.color = 'green';
            } else {
                throw new Error(data.error);
            }
        })
        .catch(error => {
            console.error('Erro no envio:', error.message);
            statusMessage.textContent = 'Ops! Algo deu errado ao salvar. Tente novamente.';
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar Confirmação';
        });
});
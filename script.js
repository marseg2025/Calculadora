// script.js

let eventCounter = 0; // Começa em 0, incrementa ao adicionar
let eventsAdded = []; // Array para armazenar os dados dos eventos adicionados
let allCombinations = []; // Armazena todas as combinações geradas
let editingEventId = null; // Armazena o ID do evento que está sendo editado
let eventActualResults = {}; // NOVO: Armazena os resultados reais selecionados pelos usuários {eventId: "resultKey"}

// Estrutura de resultados por tipo de esporte/mercado
const sportTypes = {
    futebol_1x2: {
        name: "Futebol (1X2)",
        results: [
            { label: "Time A (1)", key: "1" },
            { label: "Empate (X)", key: "X" },
            { label: "Time B (2)", key: "2" }
        ],
        resultLabels: { "1": "Time A", "X": "Empate", "2": "Time B" }, // NOVO: Labels para exibição de resultado
        defaultOdds: { "1": 2.00, "X": 3.20, "2": 3.50 }
    },
    tenis_mesa_12: {
        name: "Tênis de Mesa (12)",
        results: [
            { label: "Jogador A (1)", key: "1" },
            { label: "Jogador B (2)", key: "2" }
        ],
        resultLabels: { "1": "Jogador A", "2": "Jogador B" }, // NOVO
        defaultOdds: { "1": 1.80, "2": 1.90 }
    },
    total_gols_ou: { 
        name: "Total de Gols (Acima/Abaixo)",
        results: [
            { label: "Acima de X Gols (Over)", key: "Over" }, 
            { label: "Abaixo de X Gols (Under)", key: "Under" } 
        ],
        resultLabels: { "Over": "Acima de Gols", "Under": "Abaixo de Gols" }, // NOVO
        defaultOdds: { "Over": 1.90, "Under": 1.80 },
        extraField: { label: "Linha de Gols (ex: 2.5):", key: "line", type: "number", defaultValue: 2.5, step: 0.1, min: 0.5 } 
    },
    ambos_marcam: { 
        name: "Ambos Marcam",
        results: [
            { label: "Sim (BTTS Yes)", key: "Yes" },
            { label: "Não (BTTS No)" , key: "No" }
        ],
        resultLabels: { "Yes": "Sim", "No": "Não" }, // NOVO
        defaultOdds: { "Yes": 1.75, "No": 2.00 }
    }
};

// --- Funções de Armazenamento Local (localStorage) ---
function saveData() {
    localStorage.setItem('eventsAdded', JSON.stringify(eventsAdded));
    localStorage.setItem('allCombinations', JSON.stringify(allCombinations));
    
    const selectedCheckboxIds = [];
    document.querySelectorAll('#combinationsOutput input[type="checkbox"]:checked').forEach(checkbox => {
        selectedCheckboxIds.push(checkbox.id);
    });
    localStorage.setItem('selectedCheckboxIds', JSON.stringify(selectedCheckboxIds));

    localStorage.setItem('stakePerBet', document.getElementById('stakePerBet').value);
    localStorage.setItem('betDistributionType', document.getElementById('betDistributionType').value);

    // Salva o estado dos filtros e ordenação
    localStorage.setItem('minOddFilter', document.getElementById('minOddFilter').value);
    localStorage.setItem('maxOddFilter', document.getElementById('maxOddFilter').value);
    localStorage.setItem('sortOrder', document.getElementById('sortOrder').value);
    localStorage.setItem('searchText', document.getElementById('searchText').value);

    // NOVO: Salva os resultados reais dos eventos
    localStorage.setItem('eventActualResults', JSON.stringify(eventActualResults));
}

function loadData() {
    const storedEvents = localStorage.getItem('eventsAdded');
    if (storedEvents) {
        eventsAdded = JSON.parse(storedEvents);
        if (eventsAdded.length > 0) {
            eventCounter = Math.max(...eventsAdded.map(e => e.id)) + 1;
        } else {
            eventCounter = 0;
        }
        renderEventsList();
    }

    const storedCombinations = localStorage.getItem('allCombinations');
    if (storedCombinations) {
        allCombinations = JSON.parse(storedCombinations);
    }

    const storedStakePerBet = localStorage.getItem('stakePerBet');
    if (storedStakePerBet) {
        document.getElementById('stakePerBet').value = storedStakePerBet;
    }

    const storedBetDistributionType = localStorage.getItem('betDistributionType');
    if (storedBetDistributionType) {
        document.getElementById('betDistributionType').value = storedBetDistributionType;
    }

    // Carrega o estado dos filtros e ordenação
    if (localStorage.getItem('minOddFilter')) {
        document.getElementById('minOddFilter').value = localStorage.getItem('minOddFilter');
    }
    if (localStorage.getItem('maxOddFilter')) {
        document.getElementById('maxOddFilter').value = localStorage.getItem('maxOddFilter');
    }
    if (localStorage.getItem('sortOrder')) {
        document.getElementById('sortOrder').value = localStorage.getItem('sortOrder');
    }
    if (localStorage.getItem('searchText')) {
        document.getElementById('searchText').value = localStorage.getItem('searchText');
    }

    // NOVO: Carrega os resultados reais dos eventos
    const storedActualResults = localStorage.getItem('eventActualResults');
    if (storedActualResults) {
        eventActualResults = JSON.parse(storedActualResults);
    }

    // Restaura o estado dos checkboxes selecionados. Isso deve ser feito *depois* de displayFilteredCombinations()
    // Chama applyFiltersAndSort() que por sua vez chamará displayFilteredCombinations()
    // NOVO: Chama renderEventResultsInputs() também
    setTimeout(() => {
        applyFiltersAndSort(); // Aplica filtros e ordena as combinações visíveis
        renderEventResultsInputs(); // Renderiza os inputs de resultado
        const storedSelectedCheckboxIds = localStorage.getItem('selectedCheckboxIds');
        if (storedSelectedCheckboxIds) {
            const selectedIds = JSON.parse(storedSelectedCheckboxIds);
            selectedIds.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
        updateSummary(); // Atualiza o resumo com os dados carregados e checkboxes marcados
    }, 50); 
}
// --- Fim das Funções de Armazenamento Local ---

// NOVO: Função para limpar todos os dados do aplicativo
function clearAllData() {
    if (confirm('Tem certeza que deseja LIMPAR TODOS OS DADOS? Isso removerá todos os eventos, combinações e configurações salvas.')) {
        eventsAdded = [];
        allCombinations = [];
        eventActualResults = {}; // Limpa os resultados reais também
        eventCounter = 0; // Reseta o contador

        localStorage.clear(); // Limpa todo o localStorage do aplicativo

        renderEventsList();
        resetNewEventForm();
        generateCombinations(); // Irá exibir a mensagem de "Nenhum evento adicionado"
        updateSummary();
        renderEventResultsInputs(); // Limpa os campos de resultado

        // Reseta os valores padrão para os filtros e inputs principais
        document.getElementById('stakePerBet').value = '10.00';
        document.getElementById('betDistributionType').value = 'direct';
        document.getElementById('minOddFilter').value = '1.01';
        document.getElementById('maxOddFilter').value = '99999.99';
        document.getElementById('sortOrder').value = 'none';
        document.getElementById('searchText').value = '';
        document.getElementById('winningCombinationsOutput').innerHTML = ''; // Limpa a saída de vencedores

        alert('Todos os dados foram limpos com sucesso!');
    }
}


// Gera o HTML para os inputs de odds de um evento no formulário de adição
function generateOddsInputsHtmlForNewEvent(sportType) {
    const sport = sportTypes[sportType];
    let html = '';

    if (sport.extraField) {
        html += `
            <div class="form-group">
                <label for="newOdd_${sport.extraField.key}">${sport.extraField.label}</label>
                <input type="${sport.extraField.type}" id="newOdd_${sport.extraField.key}" 
                       value="${sport.extraField.defaultValue}" step="${sport.extraField.step}" min="${sport.extraField.min}">
            </div>
        `;
    }

    sport.results.forEach(res => {
        const defaultOdd = sport.defaultOdds[res.key] || 1.01;
        html += `
            <div class="form-group">
                <label for="newOdd_${res.key}">Odd ${res.label}</label>
                <input type="number" id="newOdd_${res.key}" value="${defaultOdd.toFixed(2)}" step="0.01" min="1.01">
            </div>
        `;
    });
    return html;
}

// Atualiza os inputs de odds no formulário de ADIÇÃO quando o tipo de esporte é alterado
function updateNewEventOdds() {
    const selectElement = document.getElementById(`newEventType`);
    const selectedSportType = selectElement.value;
    const oddsInputContainer = document.getElementById(`newOddsInputContainer`);
    oddsInputContainer.innerHTML = generateOddsInputsHtmlForNewEvent(selectedSportType);
}

// Adiciona ou edita um evento na lista
function addNewEventToList() {
    const eventName = document.getElementById('eventName').value.trim();
    const eventDateTime = document.getElementById('eventDateTime').value; 
    const eventType = document.getElementById('newEventType').value;
    const sport = sportTypes[eventType];
    const eventOdds = {};
    let isValid = true;
    let extraFieldValue = null;
    let validationMessages = []; 

    if (!eventName) {
        validationMessages.push('Por favor, insira o nome do evento (ex: Time A vs Time B).');
        isValid = false;
    }
    if (!eventDateTime) {
        validationMessages.push('Por favor, selecione a data e hora do evento.');
        isValid = false;
    }

    if (sport.extraField) {
        const extraInput = document.getElementById(`newOdd_${sport.extraField.key}`);
        extraFieldValue = parseFloat(extraInput.value);
        if (isNaN(extraFieldValue) || extraFieldValue <= 0) {
             validationMessages.push(`Por favor, insira um valor válido para ${sport.extraField.label}.`);
             isValid = false;
        }
    }

    sport.results.forEach(res => {
        const oddInput = document.getElementById(`newOdd_${res.key}`);
        const oddValue = parseFloat(oddInput.value);
        if (isNaN(oddValue) || oddValue < 1.01) {
            validationMessages.push(`Por favor, insira uma odd válida (mínimo 1.01) para ${sport.name} - ${res.label}.`);
            isValid = false;
        }
        eventOdds[res.key] = oddValue;
    });

    if (!isValid) {
        alert('Problemas ao adicionar/salvar o evento:\n\n' + validationMessages.join('\n'));
        return; 
    }

    const newEventData = {
        id: editingEventId || ++eventCounter, 
        name: eventName,
        dateTime: eventDateTime,
        type: eventType,
        odds: eventOdds,
        resultsKeys: sport.results.map(r => r.key),
        extraField: extraFieldValue 
    };

    if (editingEventId !== null) {
        const index = eventsAdded.findIndex(e => e.id === editingEventId);
        if (index !== -1) {
            eventsAdded[index] = newEventData;
        }
        editingEventId = null; 
        document.querySelector('.add-event-section button').textContent = 'Adicionar Evento à Lista'; 
    } else {
        eventsAdded.push(newEventData);
    }

    renderEventsList();
    renderEventResultsInputs(); // NOVO: Renderiza os inputs de resultado
    resetNewEventForm();
    generateCombinations();
    saveData();
}

// Renderiza a lista de eventos adicionados
function renderEventsList() {
    const eventsListContainer = document.getElementById('eventsListContainer');
    eventsListContainer.innerHTML = ''; 

    if (eventsAdded.length === 0) {
        eventsListContainer.innerHTML = '<p>Nenhum evento adicionado ainda. Use o formulário acima.</p>';
    } else {
        eventsAdded.forEach((event, index) => {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event-card';
            const formattedDateTime = new Date(event.dateTime).toLocaleString('pt-BR', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });

            const sport = sportTypes[event.type];
            let extraFieldDisplay = '';
            if (sport.extraField && event.extraField !== null) {
                extraFieldDisplay = `<p><strong>${sport.extraField.label.replace(':', '')}</strong> ${event.extraField}</p>`;
            }

            eventDiv.innerHTML = `
                <h3>Evento ${index + 1}: ${event.name}</h3>
                <p><strong>Data/Hora:</strong> ${formattedDateTime}</p>
                <p><strong>Mercado:</strong> ${sport.name}</p>
                ${extraFieldDisplay}
                <div class="odds-inputs">
                    ${Object.keys(event.odds).map(key => `
                        <div class="form-group">
                            <label>Odd ${sport.results.find(r => r.key === key).label}</label>
                            <input type="number" value="${event.odds[key].toFixed(2)}" step="0.01" min="1.01" disabled>
                        </div>
                    `).join('')}
                </div>
                <div class="event-actions">
                    <button class="action-button edit-button" onclick="editEvent(${event.id})">Editar</button>
                    <button class="action-button delete-button" onclick="deleteEvent(${event.id})">Excluir</button>
                </div>
            `;
            eventsListContainer.appendChild(eventDiv);
        });
    }
    document.getElementById('currentEventCount').textContent = eventsAdded.length;
}

// Preenche o formulário para edição de um evento
function editEvent(id) {
    const eventToEdit = eventsAdded.find(e => e.id === id);
    if (eventToEdit) {
        document.getElementById('eventName').value = eventToEdit.name;
        document.getElementById('eventDateTime').value = eventToEdit.dateTime;
        document.getElementById('newEventType').value = eventToEdit.type;
        
        updateNewEventOdds(); 

        const sport = sportTypes[eventToEdit.type];
        sport.results.forEach(res => {
            const oddInput = document.getElementById(`newOdd_${res.key}`);
            if (oddInput) {
                oddInput.value = eventToEdit.odds[res.key].toFixed(2);
            }
        });

        if (sport.extraField && eventToEdit.extraField !== null) {
            const extraInput = document.getElementById(`newOdd_${sport.extraField.key}`);
            if (extraInput) {
                extraInput.value = eventToEdit.extraField;
            }
        }

        editingEventId = id; 
        document.querySelector('.add-event-section button').textContent = 'Salvar Edição'; 
        alert(`Você está editando o evento: ${eventToEdit.name}. Clique em 'Salvar Edição' ao terminar.`);
    }
}

// Exclui um evento da lista
function deleteEvent(id) {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
        eventsAdded = eventsAdded.filter(e => e.id !== id);
        // NOVO: Remove o resultado real do evento excluído
        delete eventActualResults[id]; 
        renderEventsList();
        renderEventResultsInputs(); // NOVO: Atualiza os inputs de resultado
        generateCombinations(); 
        saveData();
    }
}

// Reseta o formulário de adição de novo evento
function resetNewEventForm() {
    document.getElementById('eventName').value = '';
    document.getElementById('eventDateTime').value = ''; 
    document.getElementById('newEventType').value = 'futebol_1x2'; 
    updateNewEventOdds(); 
    editingEventId = null; 
    document.querySelector('.add-event-section button').textContent = 'Adicionar Evento à Lista';
}

// Remove o último evento da lista 
function removeLastEventFromList() {
    if (eventsAdded.length > 0) {
        const lastEventId = eventsAdded[eventsAdded.length - 1].id;
        deleteEvent(lastEventId); 
    } else {
        alert('Não há eventos para remover.');
    }
}

// --- Função para exportar dados ---
function exportData() {
    const dataToExport = {
        events: eventsAdded,
        combinations: allCombinations,
        stakePerBet: document.getElementById('stakePerBet').value,
        betDistributionType: document.getElementById('betDistributionType').value,
        selectedCheckboxIds: Array.from(document.querySelectorAll('#combinationsOutput input[type="checkbox"]:checked')).map(cb => cb.id),
        // Exporta também os filtros e ordenação para restaurar o estado da interface
        filters: {
            minOddFilter: document.getElementById('minOddFilter').value,
            maxOddFilter: document.getElementById('maxOddFilter').value,
            sortOrder: document.getElementById('sortOrder').value,
            searchText: document.getElementById('searchText').value
        },
        // NOVO: Exporta os resultados reais
        eventActualResults: eventActualResults
    };

    const dataStr = JSON.stringify(dataToExport, null, 2); 
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calculadora_apostas_dados.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Dados exportados para calculadora_apostas_dados.json');
}
// --- Fim da função de exportação ---

// --- Função para importar dados ---
function importData() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';

    fileInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);

                // Clear current data before loading new data
                eventsAdded = [];
                allCombinations = [];
                eventActualResults = {};
                eventCounter = 0; // Reset counter for new data

                // Load events
                if (importedData.events) {
                    eventsAdded = importedData.events;
                    if (eventsAdded.length > 0) {
                        eventCounter = Math.max(...eventsAdded.map(e => e.id)) + 1;
                    } else {
                        eventCounter = 0;
                    }
                }

                // Load combinations (re-generate usually preferred, but for consistency...)
                if (importedData.combinations) {
                    allCombinations = importedData.combinations;
                }

                // Load general settings
                if (importedData.stakePerBet) {
                    document.getElementById('stakePerBet').value = importedData.stakePerBet;
                }
                if (importedData.betDistributionType) {
                    document.getElementById('betDistributionType').value = importedData.betDistributionType;
                }

                // Load filters and sort
                if (importedData.filters) {
                    document.getElementById('minOddFilter').value = importedData.filters.minOddFilter || '1.01';
                    document.getElementById('maxOddFilter').value = importedData.filters.maxOddFilter || '99999.99';
                    document.getElementById('sortOrder').value = importedData.filters.sortOrder || 'none';
                    document.getElementById('searchText').value = importedData.filters.searchText || '';
                }

                // Load actual results
                if (importedData.eventActualResults) {
                    eventActualResults = importedData.eventActualResults;
                }

                // Re-render everything based on imported data
                renderEventsList();
                generateCombinations(); // This will also call applyFiltersAndSort and displayFilteredCombinations
                renderEventResultsInputs();
                updateSummary();

                // Restore selected checkboxes from imported data
                // This needs to happen *after* combinations are displayed
                setTimeout(() => {
                    document.querySelectorAll('#combinationsOutput input[type="checkbox"]').forEach(checkbox => {
                        checkbox.checked = false; // Uncheck all first
                    });
                    if (importedData.selectedCheckboxIds) {
                        importedData.selectedCheckboxIds.forEach(id => {
                            const checkbox = document.getElementById(id);
                            if (checkbox) {
                                checkbox.checked = true;
                            }
                        });
                    }
                    updateSummary(); // Call again to reflect restored checkbox selections
                }, 100); // Small delay to ensure rendering is complete

                saveData(); // Save the newly imported data to localStorage
                alert('Dados importados com sucesso!');

            } catch (e) {
                alert('Erro ao importar dados: O arquivo não é um JSON válido ou está corrompido. Detalhes: ' + e.message);
                console.error('Erro de importação:', e);
            }
        };
        reader.readAsText(file);
    };

    fileInput.click(); // Trigger the file selection dialog
}
// --- Fim da função de importação ---


// Lógica principal para gerar as combinações
function generateCombinations() {
    allCombinations = []; 
    
    if (eventsAdded.length === 0) {
        const combinationsOutput = document.getElementById('combinationsOutput');
        combinationsOutput.innerHTML = '<p>Adicione eventos na seção acima para gerar as combinações.</p>';
        document.getElementById('totalCombinationsCount').textContent = `Total de Combinações Geradas: 0`;
        updateSummary(); 
        saveData(); 
        return;
    }

    // Função recursiva para gerar todas as combinações
    function generateAllCombos(currentIndex, currentCombo) {
        if (currentIndex === eventsAdded.length) {
            let totalOdd = 1;
            let comboDetails = [];
            currentCombo.forEach(item => {
                totalOdd *= item.odd;
                const event = eventsAdded[item.eventIndex]; 
                const sport = sportTypes[event.type];
                let resultLabel = sport.results.find(r => r.key === item.resultKey).label;

                if (event.type === 'total_gols_ou' && event.extraField !== null) {
                    resultLabel = resultLabel.replace('X Gols', `${event.extraField} Gols`);
                }
                
                comboDetails.push(`${event.name}: ${resultLabel.replace(/ \(.*\)/g, '')}`); 
            });

            allCombinations.push({
                combo: currentCombo,
                details: comboDetails.join(' | '),
                totalOdd: totalOdd,
                originalIndex: allCombinations.length // Guarda o índice original para manter a ordem padrão
            });
            return;
        }

        const currentEvent = eventsAdded[currentIndex];
        currentEvent.resultsKeys.forEach(resultKey => {
            const newCombo = [...currentCombo, {
                eventIndex: currentIndex, 
                resultKey: resultKey,
                odd: currentEvent.odds[resultKey]
            }];
            generateAllCombos(currentIndex + 1, newCombo);
        });
    }

    generateAllCombos(0, []); 

    // Chama applyFiltersAndSort para exibir as combinações (já com filtros/ordenação aplicados)
    applyFiltersAndSort(); 
    saveData(); 
}

// NOVO: Função para aplicar filtros e ordenação e exibir as combinações
function applyFiltersAndSort() {
    let filteredCombinations = [...allCombinations]; // Começa com uma cópia de todas as combinações

    // 1. Filtrar por Odd Total
    const minOdd = parseFloat(document.getElementById('minOddFilter').value) || 1.01;
    const maxOdd = parseFloat(document.getElementById('maxOddFilter').value) || 99999.99;
    
    filteredCombinations = filteredCombinations.filter(combo => 
        combo.totalOdd >= minOdd && combo.totalOdd <= maxOdd
    );

    // 2. Filtrar por Texto de Busca
    const searchText = document.getElementById('searchText').value.toLowerCase().trim();
    if (searchText) {
        filteredCombinations = filteredCombinations.filter(combo => 
            combo.details.toLowerCase().includes(searchText)
        );
    }

    // 3. Ordenar
    const sortOrder = document.getElementById('sortOrder').value;
    if (sortOrder === 'asc') {
        filteredCombinations.sort((a, b) => a.totalOdd - b.totalOdd);
    } else if (sortOrder === 'desc') {
        filteredCombinations.sort((a, b) => b.totalOdd - a.totalOdd);
    } else {
        // Volta para a ordem original se "Padrão" for selecionado
        filteredCombinations.sort((a, b) => a.originalIndex - b.originalIndex);
    }

    displayFilteredCombinations(filteredCombinations);
    updateSummary(); // Atualiza o resumo com base nas *seleções atuais* e no novo limite
    saveData(); // Salva o estado dos filtros também
}

// NOVO: Função para exibir as combinações já filtradas e ordenadas
function displayFilteredCombinations(combinationsToDisplay) {
    const combinationsOutput = document.getElementById('combinationsOutput');
    const totalCombinationsCountSpan = document.getElementById('totalCombinationsCount');
    
    combinationsOutput.innerHTML = ''; 

    totalCombinationsCountSpan.textContent = `Total de Combinações Geradas: ${allCombinations.length}`;

    if (combinationsToDisplay.length === 0) {
        combinationsOutput.innerHTML = '<p>Nenhuma combinação encontrada com os filtros e ordenação aplicados.</p>';
        return;
    }

    combinationsToDisplay.forEach((combo, index) => {
        const comboItem = document.createElement('div');
        comboItem.className = 'combination-item';
        // É importante que o ID do checkbox ainda use o índice original se quisermos carregar seleções salvas.
        // Ou que o ID seja baseado em algo único do combo (como um hash ou um ID gerado).
        // Por enquanto, vamos manter o ID baseado no índice da allCombinations original.
        const originalComboIndex = allCombinations.findIndex(c => c.combo === combo.combo && c.details === combo.details && c.totalOdd === combo.totalOdd); // Encontra o índice original, comparando propriedades
        
        if (originalComboIndex === -1) { // Caso não encontre por alguma razão, usa o índice atual
             originalComboIndex = index;
        }

        comboItem.innerHTML = `
            <input type="checkbox" id="combo-${originalComboIndex}" onchange="updateSummary()">
            <div class="combination-details">
                <label for="combo-${originalComboIndex}">
                    Combinação ${originalComboIndex + 1}: <strong>${combo.details}</strong> | Odd Total: <strong>${combo.totalOdd.toFixed(2)}</strong>
                </label>
            </div>
        `;
        combinationsOutput.appendChild(comboItem);
    });
}


// Atualiza o resumo da estratégia selecionada
function updateSummary() {
    const totalInvestmentDesired = parseFloat(document.getElementById('stakePerBet').value); 
    const betDistributionType = document.getElementById('betDistributionType').value;
    const selectedCheckboxes = document.querySelectorAll('#combinationsOutput input[type="checkbox"]:checked');
    
    // REMOVIDO: Limite de 30% e a lógica associada.
    const totalCombinations = allCombinations.length;
    // const maxAllowedSelectedBets = Math.ceil(totalCombinations * 0.30); // Esta linha foi removida
    const maxAllowedSelectedBets = totalCombinations; // Definindo o limite como o total de combinações

    const individualStakesOutput = document.getElementById('individualStakesOutput');
    const individualStakesList = document.getElementById('individualStakesList');
    individualStakesList.innerHTML = ''; 
    individualStakesOutput.style.display = 'none'; 

    if (isNaN(totalInvestmentDesired) || totalInvestmentDesired <= 0) {
        document.getElementById('displayStakePerBet').textContent = '0.00';
        document.getElementById('selectedCountDisplay').textContent = `0/${maxAllowedSelectedBets} Selecionadas`;
        document.getElementById('summarySelectedCount').textContent = '0';
        document.getElementById('totalInvestment').textContent = '0.00';
        document.getElementById('potentialReturn').textContent = '0.00';
        document.getElementById('netProfit').textContent = '0.00';
        document.getElementById('multiplier').textContent = '0.00x';
        document.getElementById('profitMessage').textContent = 'Insira um valor de investimento total desejado válido.';
        document.getElementById('profitMessage').classList.remove('profit', 'loss');
        document.getElementById('profitMessage').classList.add('neutral');
        saveData(); 
        return;
    }

    // REMOVIDO: A verificação de limite e o alert associado.
    /*
    if (selectedCheckboxes.length > maxAllowedSelectedBets) {
        alert(`Você pode selecionar no máximo ${maxAllowedSelectedBets} bilhetes (30% do total de ${totalCombinations} combinações).`);
        // Desmarca o último checkbox selecionado para forçar o limite
        selectedCheckboxes[selectedCheckboxes.length - 1].checked = false; 
        // Re-chama updateSummary para recalcular com o checkbox desmarcado
        setTimeout(updateSummary, 0); 
        return;
    }
    */

    let selectedCombinations = [];
    selectedCheckboxes.forEach(checkbox => {
        const index = parseInt(checkbox.id.replace('combo-', ''));
        if (allCombinations[index]) { // Garante que a combinação existe no array original
            selectedCombinations.push(allCombinations[index]);
            checkbox.closest('.combination-item').classList.add('selected');
        }
    });

    // Remove a classe 'selected' de itens que não estão mais selecionados (visualmente)
    document.querySelectorAll('.combination-item').forEach(item => {
        if (!item.querySelector('input[type="checkbox"]').checked) {
            item.classList.remove('selected');
        }
    });

    const selectedCount = selectedCombinations.length;
    let totalInvestmentReal = 0; 
    let potentialReturn = 0; 
    let netProfit = 0;
    let multiplier = 0;

    const profitMessage = document.getElementById('profitMessage');
    profitMessage.classList.remove('profit', 'loss', 'neutral'); 

    if (selectedCount > 0) {
        if (betDistributionType === 'direct') {
            const stakePerBet = totalInvestmentDesired; 
            totalInvestmentReal = stakePerBet * selectedCount;
            // O retorno potencial bruto na direta é sempre o maior possível com as selecionadas
            potentialReturn = Math.max(...selectedCombinations.map(c => c.totalOdd)) * stakePerBet;
            netProfit = potentialReturn - totalInvestmentReal;
            multiplier = totalInvestmentReal > 0 ? (netProfit / totalInvestmentReal) : 0;
            
            // Para a mensagem de lucro, queremos o cenário *mínimo* de lucro garantido se qualquer uma vencer
            const minOddSelected = Math.min(...selectedCombinations.map(c => c.totalOdd));
            const minPotentialReturn = minOddSelected * stakePerBet;
            const minNetProfit = minPotentialReturn - totalInvestmentReal;

            profitMessage.innerHTML = `
                Sua estratégia tem um **retorno potencial bruto de R$ ${potentialReturn.toFixed(2)}** (considerando o bilhete de maior odd selecionado).<br>
                **Lucro Líquido Potencial (Mínimo Garantido):** R$ ${minNetProfit.toFixed(2)} (${(minNetProfit / totalInvestmentReal).toFixed(2)}x sobre o investimento total).<br>
                <small><i>*Aposta de R$ ${stakePerBet.toFixed(2)} por bilhete.</i></small>
            `;
            if (minNetProfit > 0) {
                 profitMessage.classList.add('profit');
            } else if (minNetProfit < 0) {
                 profitMessage.classList.add('loss');
            } else {
                 profitMessage.classList.add('neutral');
            }


        } else if (betDistributionType === 'optimized') {
            let sumOfInverseOdds = 0;
            selectedCombinations.forEach(combo => {
                sumOfInverseOdds += (1 / combo.totalOdd);
            });

            if (sumOfInverseOdds === 0) {
                totalInvestmentReal = 0;
                potentialReturn = 0;
                netProfit = 0;
                multiplier = 0;
                profitMessage.textContent = 'Erro no cálculo de odds. Verifique as odds dos bilhetes selecionados.';
                profitMessage.classList.add('neutral');
                updateDisplay(totalInvestmentDesired, selectedCount, totalInvestmentReal, potentialReturn, netProfit, multiplier, maxAllowedSelectedBets); 
                saveData(); 
                return;
            }

            const targetGrossReturn = totalInvestmentDesired / sumOfInverseOdds;

            totalInvestmentReal = 0;
            const individualStakes = [];
            selectedCombinations.forEach((combo, index) => {
                const stakeForThisBet = targetGrossReturn / combo.totalOdd;
                totalInvestmentReal += stakeForThisBet;
                individualStakes.push({
                    comboIndex: index + 1, 
                    details: combo.details,
                    odd: combo.totalOdd,
                    stake: stakeForThisBet
                });
            });

            potentialReturn = targetGrossReturn; 
            netProfit = potentialReturn - totalInvestmentReal;
            multiplier = totalInvestmentReal > 0 ? (netProfit / totalInvestmentReal) : 0;

            profitMessage.innerHTML = `
                Sua estratégia tem um **retorno potencial bruto de R$ ${potentialReturn.toFixed(2)}** (garantido se qualquer bilhete selecionado vencer).<br>
                **Lucro Líquido Potencial:** R$ ${netProfit.toFixed(2)} (${multiplier.toFixed(2)}x sobre o investimento total real).<br>
                <small><i>*A aposta em cada bilhete é ajustada proporcionalmente para que o lucro seja igual em caso de vitória.</i></small>
            `;
            
            if (netProfit > 0) {
                profitMessage.classList.add('profit');
            } else if (netProfit < 0) {
                profitMessage.classList.add('loss');
            } else {
                profitMessage.classList.add('neutral');
            }

            individualStakesOutput.style.display = 'block';
            individualStakes.forEach(item => {
                const listItem = document.createElement('li');
                listItem.textContent = `Bilhete ${item.comboIndex} (Odd ${item.odd.toFixed(2)}): Aposta R$ ${item.stake.toFixed(2)}`;
                individualStakesList.appendChild(listItem);
            });
        }
    } else { 
        totalInvestmentReal = 0;
        potentialReturn = 0;
        netProfit = 0;
        multiplier = 0;
        profitMessage.textContent = 'Selecione as combinações de bilhetes desejadas para ver o resumo da sua estratégia.';
        profitMessage.classList.add('neutral');
    }

    updateDisplay(totalInvestmentDesired, selectedCount, totalInvestmentReal, potentialReturn, netProfit, multiplier, maxAllowedSelectedBets); 
    saveData(); 
}

// Função auxiliar para atualizar a exibição dos valores
function updateDisplay(totalInvestmentDesired, selectedCount, totalInvestmentReal, potentialReturn, netProfit, multiplier, maxAllowedSelectedBets) {
    document.getElementById('displayStakePerBet').textContent = totalInvestmentDesired.toFixed(2);
    document.getElementById('selectedCountDisplay').textContent = `${selectedCount}/${maxAllowedSelectedBets} Selecionadas`;
    document.getElementById('summarySelectedCount').textContent = selectedCount;
    document.getElementById('totalInvestment').textContent = totalInvestmentReal.toFixed(2);
    document.getElementById('potentialReturn').textContent = potentialReturn.toFixed(2);
    document.getElementById('netProfit').textContent = netProfit.toFixed(2);
    document.getElementById('multiplier').textContent = `${multiplier.toFixed(2)}x`;
}


// NOVO: Função para renderizar os inputs de resultado real de cada evento
function renderEventResultsInputs() {
    const container = document.getElementById('eventResultsInputContainer');
    container.innerHTML = ''; // Limpa o conteúdo anterior

    if (eventsAdded.length === 0) {
        container.innerHTML = '<p>Adicione eventos na seção de Configuração para ver os campos de resultado aqui.</p>';
        document.getElementById('winningCombinationsOutput').innerHTML = ''; // Limpa resultados anteriores
        return;
    }

    eventsAdded.forEach(event => {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'result-event-item';

        const sport = sportTypes[event.type];
        
        let extraFieldDisplay = '';
        if (sport.extraField && event.extraField !== null) {
            extraFieldDisplay = ` (Linha: ${event.extraField})`;
        }

        eventDiv.innerHTML = `
            <label for="result-event-${event.id}">Resultado de "${event.name}"${extraFieldDisplay}:</label>
            <select id="result-event-${event.id}" onchange="saveActualResult(${event.id})">
                <option value="">-- Selecione o Resultado --</option>
                ${sport.results.map(res => `
                    <option value="${res.key}">${res.label}</option>
                `).join('')}
            </select>
        `;
        container.appendChild(eventDiv);

        // Restaura o valor selecionado se já existir em eventActualResults
        if (eventActualResults[event.id]) {
            document.getElementById(`result-event-${event.id}`).value = eventActualResults[event.id];
        }
    });
}

// NOVO: Salva o resultado real de um evento no objeto eventActualResults
function saveActualResult(eventId) {
    const selectElement = document.getElementById(`result-event-${eventId}`);
    eventActualResults[eventId] = selectElement.value;
    saveData(); // Salva no localStorage sempre que um resultado é selecionado
}


// NOVO: Função para verificar as combinações vencedoras
function checkWinningCombinations() {
    const outputDiv = document.getElementById('winningCombinationsOutput');
    outputDiv.innerHTML = ''; // Limpa resultados anteriores

    if (eventsAdded.length === 0) {
        outputDiv.innerHTML = '<p class="no-winning-combinations">Nenhum evento adicionado para conferir.</p>';
        return;
    }

    // Verifica se todos os resultados reais foram selecionados
    let allResultsSelected = true;
    const selectedResultsCount = Object.keys(eventActualResults).length;
    if (selectedResultsCount !== eventsAdded.length) {
        allResultsSelected = false;
    } else {
        for (const eventId of Object.keys(eventActualResults)) {
            if (!eventActualResults[eventId]) {
                allResultsSelected = false;
                break;
            }
        }
    }

    if (!allResultsSelected) {
        outputDiv.innerHTML = '<p class="no-winning-combinations">Por favor, selecione o resultado real para TODOS os eventos antes de conferir.</p>';
        return;
    }

    const winningCombinations = [];
    allCombinations.forEach((comboData, comboIndex) => {
        let isWinner = true;
        
        comboData.combo.forEach(eventBet => {
            const event = eventsAdded[eventBet.eventIndex];
            if (event.id in eventActualResults) {
                const actualResult = eventActualResults[event.id];
                if (eventBet.resultKey !== actualResult) {
                    isWinner = false;
                }
            } else {
                // Isso não deve acontecer se a validação acima funcionar, mas é uma segurança
                isWinner = false; 
            }
        });

        if (isWinner) {
            winningCombinations.push({
                index: comboIndex + 1,
                details: comboData.details,
                totalOdd: comboData.totalOdd
            });
        }
    });

    if (winningCombinations.length > 0) {
        const ul = document.createElement('ul');
        ul.className = 'winning-combinations-list';
        winningCombinations.forEach(winCombo => {
            const li = document.createElement('li');
            li.innerHTML = `**Bilhete Vencedor ${winCombo.index}**: ${winCombo.details} | Odd Total: <strong>${winCombo.totalOdd.toFixed(2)}</strong>`;
            ul.appendChild(li);
        });
        outputDiv.innerHTML = `
            <div class="winning-combinations-output">
                <h3>🎉 Parabéns! Combinações Vencedoras Encontradas:</h3>
                ${ul.outerHTML}
            </div>
        `;
    } else {
        outputDiv.innerHTML = '<p class="no-winning-combinations">Nenhuma combinação vencedora encontrada com os resultados fornecidos.</p>';
    }
}


// Inicializa o formulário de novo evento e configura listeners
document.addEventListener('DOMContentLoaded', () => {
    loadData(); 
    updateNewEventOdds(); 
    renderEventResultsInputs(); // NOVO: Garante que os inputs de resultado sejam renderizados ao carregar
    
    document.getElementById('stakePerBet').addEventListener('input', updateSummary);
    document.getElementById('betDistributionType').addEventListener('change', updateSummary);
    
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    let hours = now.getHours();
    let minutes = now.getMinutes();

    if (minutes % 5 !== 0) {
        minutes = Math.ceil(minutes / 5) * 5;
        if (minutes === 60) {
            minutes = 0;
            hours++;
        }
    }
    
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    const dateTimeLocalValue = `${year}-${month}-${day}T${formattedHours}:${formattedMinutes}`;
    if (!document.getElementById('eventDateTime').value) {
        document.getElementById('eventDateTime').value = dateTimeLocalValue;
    }
});
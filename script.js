const servers = [];
const serverData = {};
const chartLabels = [];

const ctx = document.getElementById('server-chart').getContext('2d');

const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: chartLabels,
        datasets: []
    },
    options: {
        responsive: true,
        maintainAspectRatio: false, // Permette di impostare l'altezza personalizzata
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Tempo',
                    color: '#4e4e4e' // Colore secondario
                },
                ticks: {
                    color: '#4e4e4e' // Colore secondario
                },
                grid: {
                    color: '#dbdbdb' // Colore base
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Tempo di risposta (ms)',
                    color: '#4e4e4e' // Colore secondario
                },
                ticks: {
                    color: '#4e4e4e' // Colore secondario
                },
                grid: {
                    color: '#dbdbdb' // Colore base
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    color: '#4e4e4e' // Colore secondario
                }
            }
        }
    }
});

document.getElementById('add-server-btn').addEventListener('click', () => {
    const url = document.getElementById('server-url').value;
    const name = document.getElementById('server-name').value;
    const color = document.getElementById('server-color').value;
    const interval = parseInt(document.getElementById('server-interval').value);

    if (url && name && interval >= 1000) {
        addServer(url, name, color, interval);
        saveServersToLocalStorage(); // Salva i server dopo averne aggiunto uno nuovo
        document.getElementById('server-url').value = '';
        document.getElementById('server-name').value = '';
        document.getElementById('server-interval').value = '5000';
    } else {
        alert('Per favore, inserisci valori validi.');
    }
});

function addServer(url, name, color, interval) {
    const server = {
        id: Date.now(),
        url,
        name,
        color,
        interval,
        timer: null
    };
    servers.push(server);
    serverData[server.id] = [];

    chart.data.datasets.push({
        label: name,
        data: serverData[server.id],
        borderColor: color,
        backgroundColor: color,
        fill: false
    });

    addServerToList(server);
    startPingingServer(server);
    chart.update();
}

function addServerToList(server) {
    const tableBody = document.querySelector('#server-list tbody');

    const row = document.createElement('tr');
    row.setAttribute('data-id', server.id);

    // Nome
    const nameCell = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = server.name;
    nameCell.appendChild(nameInput);
    row.appendChild(nameCell);

    // URL
    const urlCell = document.createElement('td');
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.value = server.url;
    urlCell.appendChild(urlInput);
    row.appendChild(urlCell);

    // Colore
    const colorCell = document.createElement('td');
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = server.color;
    colorCell.appendChild(colorInput);
    row.appendChild(colorCell);

    // Intervallo
    const intervalCell = document.createElement('td');
    const intervalInput = document.createElement('input');
    intervalInput.type = 'number';
    intervalInput.min = '1000';
    intervalInput.value = server.interval;
    intervalCell.appendChild(intervalInput);
    row.appendChild(intervalCell);

    // Azioni
    const actionsCell = document.createElement('td');

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Salva';
    saveBtn.classList.add('save-btn');
    saveBtn.addEventListener('click', () => {
        updateServer(server.id, nameInput.value, urlInput.value, colorInput.value, parseInt(intervalInput.value));
    });
    actionsCell.appendChild(saveBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Elimina';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => removeServer(server.id));
    actionsCell.appendChild(deleteBtn);

    row.appendChild(actionsCell);

    tableBody.appendChild(row);
}

function updateServer(id, name, url, color, interval) {
    const server = servers.find(s => s.id === id);
    if (server) {
        if (interval < 1000) {
            alert('L\'intervallo minimo è di 1000 ms.');
            return;
        }

        // Aggiorna le proprietà del server
        server.name = name;
        server.url = url;
        server.color = color;
        server.interval = interval;

        // Aggiorna il dataset nel grafico
        const dataset = chart.data.datasets.find(d => d.label === server.name);
        if (dataset) {
            dataset.label = name;
            dataset.borderColor = color;
            dataset.backgroundColor = color;
        }

        // Riavvia il ping con il nuovo intervallo
        clearInterval(server.timer);
        startPingingServer(server);

        saveServersToLocalStorage();
        chart.update();
    }
}

function removeServer(id) {
    const index = servers.findIndex(s => s.id === id);
    if (index !== -1) {
        const server = servers[index];

        // Rimuovi il dataset dal grafico
        const datasetIndex = chart.data.datasets.findIndex(d => d.label === server.name);
        if (datasetIndex !== -1) {
            chart.data.datasets.splice(datasetIndex, 1);
        }

        // Ferma il ping
        clearInterval(server.timer);

        // Rimuovi i dati
        servers.splice(index, 1);
        delete serverData[server.id];

        // Rimuovi la riga dalla tabella
        const row = document.querySelector(`#server-list tbody tr[data-id='${server.id}']`);
        if (row) {
            row.remove();
        }

        saveServersToLocalStorage();
        chart.update();
    }
}

function pingServer(server) {
    const startTime = performance.now();

    fetch(server.url, { method: 'GET', mode: 'no-cors' })
        .then(() => {
            const responseTime = performance.now() - startTime;
            serverData[server.id].push(responseTime);
            trimData(server.id);
            chart.update();
        })
        .catch(() => {
            serverData[server.id].push(null);
            trimData(server.id);
            chart.update();
        });

    if (chartLabels.length > 20) {
        chartLabels.shift();
    }
}

function startPingingServer(server) {
    server.timer = setInterval(() => {
        const timestamp = new Date().toLocaleTimeString();
        if (!chartLabels.includes(timestamp)) {
            chartLabels.push(timestamp);
        }
        pingServer(server);
    }, server.interval);
}

function trimData(serverId) {
    if (serverData[serverId].length > 20) {
        serverData[serverId].shift();
    }
}

// Funzione per salvare i server nel LocalStorage
function saveServersToLocalStorage() {
    const serversToSave = servers.map(s => ({
        id: s.id,
        url: s.url,
        name: s.name,
        color: s.color,
        interval: s.interval
    }));
    localStorage.setItem('servers', JSON.stringify(serversToSave));
}

// Funzione per caricare i server dal LocalStorage
function loadServersFromLocalStorage() {
    const savedServers = localStorage.getItem('servers');
    if (savedServers) {
        const parsedServers = JSON.parse(savedServers);
        parsedServers.forEach((server) => {
            addServer(server.url, server.name, server.color, server.interval);
        });
    }
}

// Carica i server all'avvio della pagina
window.onload = () => {
    loadServersFromLocalStorage();
};

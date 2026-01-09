// MecaConnect - logique de l'application
// Ce script gère l'ensemble des fonctionnalités décrites dans le cahier des charges.

(function () {
    'use strict';

    /* ------------------------------------------------------------
     * Stockage local
     * Les données sont enregistrées dans localStorage pour persister
     * entre les sessions et permettre la simulation.
     * ------------------------------------------------------------ */
    const STORAGE = {
        MACHINES: 'mecaconnect_machines',
        USERS: 'mecaconnect_users',
        RENTALS: 'mecaconnect_rentals',
        CURRENT_USER: 'mecaconnect_current_user'
    };

    let machines = [];
    let users = [];
    let rentals = [];
    let currentUser = null;

    /* Chargement des données depuis localStorage */
    function loadData() {
        try {
            machines = JSON.parse(localStorage.getItem(STORAGE.MACHINES)) || [];
            users = JSON.parse(localStorage.getItem(STORAGE.USERS)) || [];
            rentals = JSON.parse(localStorage.getItem(STORAGE.RENTALS)) || [];
            currentUser = JSON.parse(localStorage.getItem(STORAGE.CURRENT_USER)) || null;
        } catch (e) {
            machines = [];
            users = [];
            rentals = [];
            currentUser = null;
        }
        // Pré-remplir quelques machines au premier lancement
        if (!machines || machines.length === 0) {
            machines = [
                {
                    id: generateId('machine'),
                    name: 'Motopompe diesel',
                    type: 'motopompe',
                    location: 'Thiès',
                    capacity: '5 HP',
                    consumption: 'Diesel',
                    priceHour: 2000,
                    priceDay: 10000,
                    description: 'Motopompe robuste pour l’irrigation',
                    available: true,
                    modes: ['location', 'leasing', 'colocation'],
                    holderId: null
                },
                {
                    id: generateId('machine'),
                    name: 'Décortiqueuse de riz',
                    type: 'décortiqueuse',
                    location: 'Diourbel',
                    capacity: '100 kg/h',
                    consumption: 'Électrique',
                    priceHour: 3000,
                    priceDay: 15000,
                    description: 'Machine adaptée au décorticage de riz pour coopératives',
                    available: true,
                    modes: ['location', 'colocation'],
                    holderId: null
                },
                {
                    id: generateId('machine'),
                    name: 'Moulin à céréales',
                    type: 'moulin',
                    location: 'Saint-Louis',
                    capacity: '50 kg/h',
                    consumption: 'Électrique',
                    priceHour: 2500,
                    priceDay: 12000,
                    description: 'Moulin polyvalent pour maïs, mil et sorgho',
                    available: true,
                    modes: ['location', 'leasing'],
                    holderId: null
                },
                {
                    id: generateId('machine'),
                    name: 'Semoir manuel',
                    type: 'semoir',
                    location: 'Ziguinchor',
                    capacity: '5 rangs',
                    consumption: 'Manuel',
                    priceHour: 1000,
                    priceDay: 5000,
                    description: 'Semoir léger pour petites exploitations',
                    available: true,
                    modes: ['location'],
                    holderId: null
                }
            ];
        }
    }

    /* Map des types de machines vers les images correspondantes.
     * Cela permet d'afficher des illustrations dans le catalogue et les détails.
     */
    const TYPE_IMAGES = {
        'motopompe': 'assets/motopompe.png',
        'décortiqueuse': 'assets/decortiqueuse.png',
        'moulin': 'assets/moulin.png',
        'semoir': 'assets/semoir.png'
    };

    /* Sauvegarde des données dans localStorage */
    function saveData() {
        localStorage.setItem(STORAGE.MACHINES, JSON.stringify(machines));
        localStorage.setItem(STORAGE.USERS, JSON.stringify(users));
        localStorage.setItem(STORAGE.RENTALS, JSON.stringify(rentals));
        if (currentUser) {
            localStorage.setItem(STORAGE.CURRENT_USER, JSON.stringify(currentUser));
        } else {
            localStorage.removeItem(STORAGE.CURRENT_USER);
        }
    }

    /* Générateur d'ID unique */
    function generateId(prefix) {
        const now = Date.now();
        const random = Math.floor(Math.random() * 100000);
        return `${prefix}_${now}_${random}`;
    }

    /* Mise à jour des statuts de location et disponibilité des machines */
    function updateRentalStatuses() {
        const now = Date.now();
        let updated = false;
        rentals.forEach((rental) => {
            if (rental.status === 'PAYÉ' || rental.status === 'EN_COURS') {
                const timeLeft = rental.startTime + rental.duration - now;
                if (timeLeft <= 0) {
                    // location terminée
                    rental.status = 'TERMINÉ';
                    // remettre la machine disponible
                    const machine = machines.find(m => m.id === rental.machineId);
                    if (machine) {
                        machine.available = true;
                    }
                    updated = true;
                } else if (rental.status === 'PAYÉ') {
                    // passer en cours dès le paiement
                    rental.status = 'EN_COURS';
                    updated = true;
                }
            }
        });
        if (updated) {
            saveData();
            // Si on est sur la page des locations ou du dashboard, la rafraîchir
            if (currentView === 'my-rentals') {
                renderMyRentals();
            }
            if (currentView === 'dashboard') {
                renderDashboard();
            }
        }
    }

    /* Variables pour suivre la vue actuelle */
    let currentView = '';

    /* Initialisation de l'application */
    function init() {
        loadData();
        renderNav();
        // Démarrer le suivi des statuts de location
        updateRentalStatuses();
        setInterval(updateRentalStatuses, 1000 * 30); // mise à jour toutes les 30 secondes
        // Afficher la page d'accueil ou la page principale selon l'authentification
        if (currentUser) {
            if (currentUser.type === 'producer') {
                navigate('catalogue');
            } else if (currentUser.type === 'holder') {
                navigate('my-machines');
            }
        } else {
            navigate('home');
        }
    }

    /* Rendu de la barre de navigation selon l'utilisateur */
    function renderNav() {
        const navbarEl = document.getElementById('navbar');
        const nav = document.createElement('nav');
        nav.className = 'nav-links';
        nav.innerHTML = '';
        // Toujours proposer Accueil
        const links = [];
        if (currentUser) {
            if (currentUser.type === 'producer') {
                links.push({ title: 'Catalogue', page: 'catalogue' });
                links.push({ title: 'Mes locations', page: 'my-rentals' });
                links.push({ title: 'Tableau de bord', page: 'dashboard' });
                links.push({ title: 'Maintenance', page: 'maintenance' });
            } else if (currentUser.type === 'holder') {
                links.push({ title: 'Mes machines', page: 'my-machines' });
                links.push({ title: 'Ajouter une machine', page: 'add-machine' });
                links.push({ title: 'Tableau de bord', page: 'dashboard' });
                links.push({ title: 'Maintenance', page: 'maintenance' });
            }
            links.push({ title: 'Déconnexion', page: 'logout' });
        } else {
            links.push({ title: 'Accueil', page: 'home' });
        }
        nav.innerHTML = links.map(link => `<a href="#" data-page="${link.page}">${link.title}</a>`).join('');
        navbarEl.innerHTML = '';
        navbarEl.appendChild(nav);
        // Ajouter gestionnaires d'événements
        nav.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const page = a.getAttribute('data-page');
                if (page) {
                    navigate(page);
                }
            });
        });
    }

    /* Fonction de navigation principale */
    function navigate(page, options = {}) {
        currentView = page;
        switch (page) {
            case 'home':
                renderHome();
                break;
            case 'register-producer':
                renderRegisterProducer();
                break;
            case 'register-holder':
                renderRegisterHolder();
                break;
            case 'catalogue':
                renderCatalogue();
                break;
            case 'machine-detail':
                renderMachineDetail(options.machineId);
                break;
            case 'rent-summary':
                renderRentSummary(options);
                break;
            case 'my-rentals':
                renderMyRentals();
                break;
            case 'dashboard':
                renderDashboard();
                break;
            case 'add-machine':
                renderAddMachine();
                break;
            case 'my-machines':
                renderMyMachines();
                break;
            case 'maintenance':
                renderMaintenance();
                break;
            case 'logout':
                currentUser = null;
                saveData();
                renderNav();
                navigate('home');
                break;
            default:
                renderHome();
        }
    }

    /* Génération de la page d'accueil */
    function renderHome() {
        const main = document.getElementById('content');
        const template = document.getElementById('home-template');
        main.innerHTML = '';
        main.appendChild(template.content.cloneNode(true));
        // Ajouter événements pour les boutons
        document.getElementById('btn-register-producer').addEventListener('click', () => navigate('register-producer'));
        document.getElementById('btn-register-holder').addEventListener('click', () => navigate('register-holder'));
    }

    /* Page d'inscription producteur */
    function renderRegisterProducer() {
        const main = document.getElementById('content');
        const template = document.getElementById('register-producer-template');
        main.innerHTML = '';
        main.appendChild(template.content.cloneNode(true));
        const form = document.getElementById('form-register-producer');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = {
                id: generateId('user'),
                type: 'producer',
                name: document.getElementById('producer-name').value.trim(),
                location: document.getElementById('producer-location').value.trim(),
                activity: document.getElementById('producer-activity').value,
                area: parseFloat(document.getElementById('producer-area').value),
                crops: document.getElementById('producer-crops').value.trim(),
                phone: document.getElementById('producer-phone').value.trim()
            };
            users.push(user);
            currentUser = user;
            saveData();
            renderNav();
            navigate('catalogue');
        });
        document.getElementById('cancel-producer').addEventListener('click', () => navigate('home'));
    }

    /* Page d'inscription détenteur */
    function renderRegisterHolder() {
        const main = document.getElementById('content');
        const template = document.getElementById('register-holder-template');
        main.innerHTML = '';
        main.appendChild(template.content.cloneNode(true));
        const form = document.getElementById('form-register-holder');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = {
                id: generateId('user'),
                type: 'holder',
                name: document.getElementById('holder-name').value.trim(),
                location: document.getElementById('holder-location').value.trim(),
                phone: document.getElementById('holder-phone').value.trim()
            };
            users.push(user);
            currentUser = user;
            saveData();
            renderNav();
            navigate('my-machines');
        });
        document.getElementById('cancel-holder').addEventListener('click', () => navigate('home'));
    }

    /* Page du catalogue */
    function renderCatalogue() {
        if (!isProducer()) {
            navigate('home');
            return;
        }
        const main = document.getElementById('content');
        const template = document.getElementById('catalogue-template');
        main.innerHTML = '';
        main.appendChild(template.content.cloneNode(true));
        // filtre
        const searchInput = document.getElementById('search-query');
        const filterSelect = document.getElementById('filter-type');
        function updateList() {
            const query = searchInput.value.trim().toLowerCase();
            const typeFilter = filterSelect.value;
            const listEl = document.getElementById('machine-list');
            listEl.innerHTML = '';
            const availableMachines = machines.filter(m => m.available);
            let filtered = availableMachines;
            if (typeFilter) {
                filtered = filtered.filter(m => m.type === typeFilter);
            }
            if (query) {
                filtered = filtered.filter(m => m.name.toLowerCase().includes(query) || m.type.toLowerCase().includes(query));
            }
            if (filtered.length === 0) {
                listEl.innerHTML = '<p>Aucune machine ne correspond à votre recherche.</p>';
                return;
            }
            filtered.forEach(m => {
                const card = document.createElement('div');
                card.className = 'machine-card';
                const imageSrc = TYPE_IMAGES[m.type] || 'assets/tractor.png';
                card.innerHTML = `
                    <img src="${imageSrc}" alt="${m.type}">
                    <div class="info">
                        <h3>${m.name}</h3>
                        <div class="details">
                            <p><strong>Type:</strong> ${m.type}</p>
                            <p><strong>Localisation:</strong> ${m.location}</p>
                            <p><strong>Tarif:</strong> ${m.priceHour} FCFA/h • ${m.priceDay} FCFA/jour</p>
                        </div>
                        <button data-machine-id="${m.id}">Voir détails</button>
                    </div>
                `;
                card.querySelector('button').addEventListener('click', () => {
                    navigate('machine-detail', { machineId: m.id });
                });
                listEl.appendChild(card);
            });
        }
        searchInput.addEventListener('input', updateList);
        filterSelect.addEventListener('change', updateList);
        updateList();
    }

    /* Détails d'une machine et formulaire de location */
    function renderMachineDetail(machineId) {
        if (!isProducer()) {
            navigate('home');
            return;
        }
        const machine = machines.find(m => m.id === machineId);
        if (!machine) {
            navigate('catalogue');
            return;
        }
        const main = document.getElementById('content');
        const template = document.getElementById('machine-detail-template');
        main.innerHTML = '';
        const container = template.content.cloneNode(true);
        const section = container.querySelector('section');
        const detailImg = TYPE_IMAGES[machine.type] || 'assets/tractor.png';
        section.innerHTML = `
            <img src="${detailImg}" alt="${machine.type}" style="width:100%; max-height:300px; object-fit:cover; border-radius:6px 6px 0 0;">
            <h2>${machine.name}</h2>
            <p><strong>Type:</strong> ${machine.type}</p>
            <p><strong>Localisation:</strong> ${machine.location}</p>
            <p><strong>Capacité:</strong> ${machine.capacity}</p>
            <p><strong>Consommation:</strong> ${machine.consumption}</p>
            <p><strong>Description:</strong> ${machine.description}</p>
            <p><strong>Tarifs:</strong> ${machine.priceHour} FCFA/h • ${machine.priceDay} FCFA/jour</p>
            <h3>Choisir un mode et une durée</h3>
            <form id="rent-form">
                <label>Mode d’accès
                    <select id="rent-mode" required>
                        ${machine.modes.map(mode => `<option value="${mode}">${capitalize(mode)}</option>`).join('')}
                    </select>
                </label>
                <label>Durée
                    <input type="number" id="rent-duration" min="1" value="1" required>
                    <select id="rent-unit">
                        <option value="hour">Heures</option>
                        <option value="day">Jours</option>
                    </select>
                </label>
                <button type="submit">Continuer</button>
                <button type="button" id="back-to-catalogue">Retour</button>
            </form>
        `;
        main.appendChild(section);
        document.getElementById('back-to-catalogue').addEventListener('click', () => navigate('catalogue'));
        document.getElementById('rent-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const mode = document.getElementById('rent-mode').value;
            const duration = parseInt(document.getElementById('rent-duration').value);
            const unit = document.getElementById('rent-unit').value; // 'hour' ou 'day'
            navigate('rent-summary', { machineId: machine.id, mode, duration, unit });
        });
    }

    /* Résumé de location et paiement */
    function renderRentSummary({ machineId, mode, duration, unit }) {
        if (!isProducer()) {
            navigate('home');
            return;
        }
        const machine = machines.find(m => m.id === machineId);
        if (!machine) {
            navigate('catalogue');
            return;
        }
        // Calcul du tarif
        let pricePerUnit;
        let unitLabel;
        if (unit === 'hour') {
            pricePerUnit = machine.priceHour;
            unitLabel = 'heure(s)';
        } else {
            pricePerUnit = machine.priceDay;
            unitLabel = 'jour(s)';
        }
        const total = pricePerUnit * duration;
        const durationMs = (unit === 'hour' ? duration * 3600000 : duration * 24 * 3600000);
        const main = document.getElementById('content');
        const template = document.getElementById('rent-summary-template');
        main.innerHTML = '';
        const section = template.content.cloneNode(true).querySelector('section');
        section.innerHTML = `
            <h2>Résumé de la location</h2>
            <p><strong>Machine:</strong> ${machine.name}</p>
            <p><strong>Mode d’accès:</strong> ${capitalize(mode)}</p>
            <p><strong>Durée:</strong> ${duration} ${unitLabel}</p>
            <p><strong>Prix unitaire:</strong> ${pricePerUnit} FCFA/${unit === 'hour' ? 'h' : 'jour'}</p>
            <p><strong>Prix total:</strong> ${total} FCFA</p>
            <button id="pay-button">Payer</button>
            <button id="cancel-button">Annuler</button>
        `;
        main.appendChild(section);
        const payBtn = document.getElementById('pay-button');
        payBtn.addEventListener('click', () => {
            // Vérifier que la machine est toujours disponible
            if (!machine.available) {
                alert('Désolé, la machine n’est plus disponible.');
                navigate('catalogue');
                return;
            }
            // Créer l'objet location
            const rental = {
                id: generateId('rental'),
                machineId: machine.id,
                userId: currentUser.id,
                mode,
                duration: durationMs,
                pricePerUnit,
                unit,
                totalPrice: total,
                status: 'PAYÉ',
                startTime: Date.now(),
                createdAt: Date.now()
            };
            // Mettre la machine indisponible
            machine.available = false;
            rentals.push(rental);
            saveData();
            // Désactiver le bouton pour éviter double paiement
            payBtn.disabled = true;
            alert('Paiement effectué avec succès. La location commence maintenant.');
            renderNav();
            navigate('my-rentals');
        });
        document.getElementById('cancel-button').addEventListener('click', () => navigate('catalogue'));
    }

    /* Page des locations du producteur */
    function renderMyRentals() {
        if (!isProducer()) {
            navigate('home');
            return;
        }
        const main = document.getElementById('content');
        const template = document.getElementById('my-rentals-template');
        main.innerHTML = '';
        main.appendChild(template.content.cloneNode(true));
        const listEl = document.getElementById('rentals-list');
        const myRentals = rentals.filter(r => r.userId === currentUser.id);
        if (myRentals.length === 0) {
            listEl.innerHTML = '<p>Vous n’avez effectué aucune location pour le moment.</p>';
            return;
        }
        myRentals.sort((a, b) => b.createdAt - a.createdAt);
        myRentals.forEach(r => {
            const machine = machines.find(m => m.id === r.machineId);
            const div = document.createElement('div');
            div.className = 'rental';
            let statusText = '';
            switch (r.status) {
                case 'EN_ATTENTE_DE_PAIEMENT':
                    statusText = 'En attente de paiement';
                    break;
                case 'PAYÉ':
                    statusText = 'Payé';
                    break;
                case 'EN_COURS':
                    statusText = 'En cours';
                    break;
                case 'TERMINÉ':
                    statusText = 'Terminé';
                    break;
                case 'ANNULÉ':
                    statusText = 'Annulé';
                    break;
                default:
                    statusText = r.status;
            }
            // Calcul du temps écoulé et restant
            const now = Date.now();
            let timeLeft = r.startTime + r.duration - now;
            if (timeLeft < 0) timeLeft = 0;
            const totalSeconds = Math.floor(r.duration / 1000);
            const elapsedSeconds = totalSeconds - Math.floor(timeLeft / 1000);
            const format = (seconds) => {
                const h = Math.floor(seconds / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                const s = seconds % 60;
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            };
            const elapsedStr = format(elapsedSeconds);
            const leftStr = format(Math.floor(timeLeft / 1000));
            div.innerHTML = `
                <h3>${machine ? machine.name : 'Machine supprimée'}</h3>
                <p><strong>Statut:</strong> ${statusText}</p>
                <p><strong>Début:</strong> ${new Date(r.startTime).toLocaleString()}</p>
                <p><strong>Durée choisie:</strong> ${r.unit === 'hour' ? r.duration / 3600000 : r.duration / (24 * 3600000)} ${r.unit === 'hour' ? 'heure(s)' : 'jour(s)'}</p>
                <p><strong>Montant payé:</strong> ${r.totalPrice} FCFA</p>
                ${r.status === 'EN_COURS' ? `<p><strong>Temps écoulé:</strong> ${elapsedStr}</p>
                <p><strong>Temps restant:</strong> ${leftStr}</p>` : ''}
            `;
            // Ajouter bouton pour terminer prématurément si en cours
            if (r.status === 'EN_COURS') {
                const endBtn = document.createElement('button');
                endBtn.textContent = 'Terminer la location';
                endBtn.addEventListener('click', () => {
                    // Arrêt prématuré
                    r.status = 'TERMINÉ';
                    // libérer la machine
                    const mach = machines.find(m => m.id === r.machineId);
                    if (mach) mach.available = true;
                    saveData();
                    renderMyRentals();
                    alert('La location est terminée. Merci.');
                });
                div.appendChild(endBtn);
            }
            listEl.appendChild(div);
        });
    }

    /* Tableau de bord */
    function renderDashboard() {
        const main = document.getElementById('content');
        const template = document.getElementById('dashboard-template');
        main.innerHTML = '';
        main.appendChild(template.content.cloneNode(true));
        const statsEl = document.getElementById('dashboard-stats');
        statsEl.innerHTML = '';
        if (!currentUser) {
            statsEl.innerHTML = '<p>Veuillez vous connecter.</p>';
            return;
        }
        if (currentUser.type === 'producer') {
            const myRentals = rentals.filter(r => r.userId === currentUser.id);
            const completed = myRentals.filter(r => r.status === 'TERMINÉ').length;
            const inProgress = myRentals.filter(r => r.status === 'EN_COURS').length;
            const totalTime = myRentals.reduce((sum, r) => sum + r.duration, 0);
            const totalSpent = myRentals.reduce((sum, r) => sum + r.totalPrice, 0);
            statsEl.innerHTML = `
                <div><span>Locations terminées:</span><span>${completed}</span></div>
                <div><span>Locations en cours:</span><span>${inProgress}</span></div>
                <div><span>Temps total de location:</span><span>${(totalTime / 3600000).toFixed(1)} h</span></div>
                <div><span>Montant total dépensé:</span><span>${totalSpent} FCFA</span></div>
            `;
        } else if (currentUser.type === 'holder') {
            // machines de ce détenteur
            const myMachines = machines.filter(m => m.holderId === currentUser.id);
            const machineCount = myMachines.length;
            // locations concernant ces machines
            const myRentals = rentals.filter(r => myMachines.some(m => m.id === r.machineId));
            const activeRentals = myRentals.filter(r => r.status === 'EN_COURS').length;
            const revenue = myRentals.reduce((sum, r) => sum + r.totalPrice, 0);
            statsEl.innerHTML = `
                <div><span>Machines répertoriées:</span><span>${machineCount}</span></div>
                <div><span>Locations actives:</span><span>${activeRentals}</span></div>
                <div><span>Revenu total:</span><span>${revenue} FCFA</span></div>
            `;
        }
    }

    /* Page d'ajout de machine (détenteur) */
    function renderAddMachine() {
        if (!isHolder()) {
            navigate('home');
            return;
        }
        const main = document.getElementById('content');
        const template = document.getElementById('add-machine-template');
        main.innerHTML = '';
        main.appendChild(template.content.cloneNode(true));
        const form = document.getElementById('form-add-machine');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const machine = {
                id: generateId('machine'),
                name: document.getElementById('machine-name').value.trim(),
                type: document.getElementById('machine-type').value,
                location: document.getElementById('machine-location').value.trim(),
                capacity: document.getElementById('machine-capacity').value.trim(),
                consumption: document.getElementById('machine-consumption').value.trim(),
                priceHour: parseFloat(document.getElementById('machine-price-hour').value),
                priceDay: parseFloat(document.getElementById('machine-price-day').value),
                description: '',
                available: true,
                modes: ['location', 'leasing', 'colocation'],
                holderId: currentUser.id
            };
            machines.push(machine);
            saveData();
            alert('Machine ajoutée avec succès.');
            navigate('my-machines');
        });
    }

    /* Page des machines du détenteur */
    function renderMyMachines() {
        if (!isHolder()) {
            navigate('home');
            return;
        }
        const main = document.getElementById('content');
        const template = document.getElementById('my-machines-template');
        main.innerHTML = '';
        main.appendChild(template.content.cloneNode(true));
        const listEl = document.getElementById('my-machines-list');
        const myMachines = machines.filter(m => m.holderId === currentUser.id);
        if (myMachines.length === 0) {
            listEl.innerHTML = '<p>Aucune machine enregistrée.</p>';
            return;
        }
        myMachines.forEach(m => {
            const div = document.createElement('div');
            div.className = 'machine';
            // revenu généré par cette machine
            const revenue = rentals.filter(r => r.machineId === m.id && r.status !== 'ANNULÉ').reduce((sum, r) => sum + r.totalPrice, 0);
            div.innerHTML = `
                <h3>${m.name}</h3>
                <p><strong>Type:</strong> ${m.type}</p>
                <p><strong>Localisation:</strong> ${m.location}</p>
                <p><strong>Tarifs:</strong> ${m.priceHour} FCFA/h • ${m.priceDay} FCFA/jour</p>
                <p><strong>Statut:</strong> ${m.available ? 'Disponible' : 'Indisponible'}</p>
                <p><strong>Revenu généré:</strong> ${revenue} FCFA</p>
            `;
            // bouton disponibilité
            const toggleBtn = document.createElement('button');
            toggleBtn.textContent = m.available ? 'Désactiver' : 'Activer';
            toggleBtn.addEventListener('click', () => {
                // Vérifier qu’aucune location en cours ne concerne cette machine
                const busy = rentals.some(r => r.machineId === m.id && (r.status === 'EN_COURS' || r.status === 'PAYÉ'));
                if (busy && m.available) {
                    alert('Impossible de désactiver cette machine car elle est louée.');
                    return;
                }
                m.available = !m.available;
                saveData();
                renderMyMachines();
            });
            div.appendChild(toggleBtn);
            listEl.appendChild(div);
        });
    }

    /* Maintenance */
    function renderMaintenance() {
        const main = document.getElementById('content');
        const template = document.getElementById('maintenance-template');
        main.innerHTML = '';
        main.appendChild(template.content.cloneNode(true));
    }

    /* Helpers */
    function isProducer() {
        return currentUser && currentUser.type === 'producer';
    }
    function isHolder() {
        return currentUser && currentUser.type === 'holder';
    }
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Lancement
    document.addEventListener('DOMContentLoaded', init);
})();
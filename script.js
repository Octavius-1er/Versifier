document.addEventListener('DOMContentLoaded', () => {
    const proseTextElement = document.getElementById('proseText');
    const newPhraseBtn = document.getElementById('newPhraseBtn');
    const poetryInput = document.getElementById('poetryInput');
    const submitPoemBtn = document.getElementById('submitPoemBtn');
    const resultCard = document.getElementById('resultCard');
    const yourProseElement = document.getElementById('yourProse');
    const yourPoemElement = document.getElementById('yourPoem');
    const resetGameBtn = document.getElementById('resetGameBtn');

    // Liste de phrases en prose à versifier
    const phrases = [
        "Le soleil se couchait doucement à l'horizon, peignant le ciel de couleurs chaudes et apaisantes.",
        "Un chat noir traversa la rue en silence, ses yeux verts brillant faiblement dans l'obscurité grandissante.",
        "La pluie tambourinait contre les carreaux, invitant chacun à rester bien au chaud sous une couverture.",
        "Les feuilles d'automne tombaient des arbres, tourbillonnant avec grâce avant de toucher le sol humide.",
        "Un vieux livre reposait ouvert sur la table, ses pages jaunies racontant des histoires d'un autre temps.",
        "Le vent soufflait en rafales, faisant danser les branches nues des arbres dans un ballet hivernal.",
        "Les étoiles scintillaient dans le ciel profond, comme des milliers de diamants jetés sur un drap de velours.",
        "Le café fumant sur le rebord de la fenêtre, son arôme doux se mêlant à la fraîcheur matinale.",
        "Un enfant riait aux éclats dans le parc, sa joie pure et contagieuse égayant l'atmosphère.",
        "La mer murmurait ses secrets à la grève, chaque vague apportant une nouvelle histoire éphémère."
    ];

    let currentProse = ''; // Stocke la phrase actuellement affichée

    // Fonction pour choisir et afficher une nouvelle phrase
    function displayNewPhrase() {
        const randomIndex = Math.floor(Math.random() * phrases.length);
        currentProse = phrases[randomIndex];
        proseTextElement.textContent = currentProse;
        poetryInput.value = ''; // Réinitialise le champ de texte
        resultCard.classList.add('hidden'); // Cache la carte de résultat si visible
        
        // Affiche les cartes d'input et de phrase (au cas où elles auraient été cachées)
        document.querySelectorAll('.card').forEach(card => {
            if (card.id !== 'resultCard') { // S'assure de ne pas afficher la carte de résultat si elle était déjà cachée
                card.classList.remove('hidden');
            }
        });
        document.querySelector('.input-card').classList.remove('hidden'); // S'assure que la carte d'input est visible
    }

    // Gestionnaire d'événement pour le bouton "Nouvelle phrase"
    newPhraseBtn.addEventListener('click', displayNewPhrase);

    // Gestionnaire d'événement pour le bouton "Soumettre mon poème"
    submitPoemBtn.addEventListener('click', () => {
        const userPoem = poetryInput.value.trim();

        if (userPoem === '') {
            alert("Veuillez écrire quelques vers avant de soumettre !");
            return;
        }

        // Affiche la phrase originale et le poème de l'utilisateur
        yourProseElement.textContent = currentProse;
        yourPoemElement.textContent = userPoem; // Utilise textContent pour préserver les retours à la ligne

        // Cache les cartes d'input et de phrase, montre la carte de résultat
        document.querySelectorAll('.card').forEach(card => {
            if (card.id !== 'resultCard') { 
                card.classList.add('hidden');
            }
        });
        resultCard.classList.remove('hidden');
    });

    // Gestionnaire d'événement pour le bouton "Rejouer"
    resetGameBtn.addEventListener('click', () => {
        displayNewPhrase(); // Affiche une nouvelle phrase et réinitialise l'état
        // Les cartes d'input et de phrase sont déjà gérées par displayNewPhrase
    });

    // Initialise le jeu au chargement de la page
    displayNewPhrase();
});

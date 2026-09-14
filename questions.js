// Banque de questions — tout est en local, pas besoin de Firebase pour ça.
const MCQ_QUESTIONS = [
  {type:'mcq', round:'Le cours', prompt:"Qu'est-ce qu'un vers ?",
   options:["Une ligne d'un poème, composée d'un nombre précis de syllabes","Un poème entier, du début à la fin","La dernière syllabe d'un mot","Un synonyme du mot « rime »"],
   correct:0, explain:"Un vers est une ligne de poème : il se compte en syllabes, pas en mots."},
  {type:'mcq', round:'Le cours', prompt:"Comment appelle-t-on un vers de 12 syllabes ?",
   options:["Un décasyllabe","Un octosyllabe","Un alexandrin","Un hexasyllabe"],
   correct:2, explain:"L'alexandrin (12 syllabes) est le vers le plus utilisé dans la poésie française classique."},
  {type:'mcq', round:'Le cours', prompt:"Qu'est-ce qu'une strophe ?",
   options:["Un ensemble de vers séparé des autres par un blanc typographique","Un vers isolé sans rime","Le titre d'un poème","La rime finale d'un poème"],
   correct:0, explain:"Une strophe regroupe plusieurs vers, séparée des autres par un espace."},
  {type:'mcq', round:'Le cours', prompt:"Comment appelle-t-on une strophe de 4 vers ?",
   options:["Un tercet","Un distique","Un sizain","Un quatrain"],
   correct:3, explain:"Distique = 2 vers, tercet = 3 vers, quatrain = 4 vers, sizain = 6 vers."},
  {type:'mcq', round:'Le cours', prompt:"Que sont des rimes dites « suffisantes » ?",
   options:["Des rimes qui ne partagent aucun son","Des rimes qui partagent 1 son commun","Des rimes qui partagent 2 sons communs","Des rimes qui partagent 3 sons ou plus"],
   correct:2, explain:"Pauvre = 1 son, suffisante = 2 sons, riche = 3 sons ou plus."},
  {type:'mcq', round:'Le cours', prompt:"Comment appelle-t-on la pause à l'intérieur d'un vers, souvent au milieu de l'alexandrin ?",
   options:["L'enjambement","La diérèse","La césure","Le hiatus"],
   correct:2, explain:"La césure coupe l'alexandrin en deux hémistiches, en général après la 6ᵉ syllabe."},
  {type:'mcq', round:'Le cours', prompt:"Qu'est-ce qu'un enjambement ?",
   options:["Quand une phrase déborde sur le vers suivant sans pause","Quand deux vers ont exactement la même rime","Quand un vers a une syllabe en trop","Le refrain répété d'une chanson"],
   correct:0, explain:"L'enjambement se produit quand le sens de la phrase continue au vers d'après, sans s'arrêter à la fin du vers."},
  {type:'mcq', round:'La mise en vers', raw:"le vent souffle fort, les feuilles tombent, l'automne arrive, le froid s'installe",
   prompt:"Choisis la bonne mise en vers :",
   options:[
     "Le vent souffle fort,\nLes feuilles tombent,\nL'automne arrive,\nLe froid s'installe.",
     "le vent souffle fort,\nles feuilles tombent,\nl'automne arrive,\nle froid s'installe.",
     "Le vent souffle\nFort, les feuilles\nTombent, l'automne\nArrive, le froid s'installe."
   ], correct:0,
   explain:"Chaque vers commence par une majuscule, et la coupe se fait à chaque virgule."},
  {type:'mcq', round:'La mise en vers', raw:"le chat dort, la nuit tombe, le hibou chante, le silence règne",
   prompt:"Choisis la bonne mise en vers :",
   options:[
     "Le chat dort la nuit tombe\nle hibou chante\nle silence règne tout entier",
     "Le chat dort,\nLa nuit tombe,\nLe hibou chante,\nLe silence règne.",
     "Le chat dort,\nla nuit tombe,\nLe hibou chante,\nle silence règne."
   ], correct:1,
   explain:"Majuscule en tête de chaque vers, coupe à chaque virgule."},
  {type:'mcq', round:'La mise en vers', raw:"je pars demain, tu restes ici, nous nous reverrons, un jour peut-être",
   prompt:"Choisis la bonne mise en vers :",
   options:[
     "Je pars demain,\nTu restes ici,\nNous nous reverrons,\nUn jour peut-être.",
     "Je pars demain, tu restes\nIci, nous nous reverrons,\nUn jour\nPeut-être.",
     "je pars demain,\ntu restes ici,\nnous nous reverrons,\nun jour peut-être."
   ], correct:0,
   explain:"On coupe à chaque virgule et on capitalise le début de chaque vers."},
  {type:'mcq', round:'La mise en vers', raw:"tu manges, tu es un ange",
   prompt:"Choisis la bonne mise en vers :",
   options:[
     "Tu manges, tu es\nUn ange.",
     "tu manges,\ntu es un ange.",
     "Tu manges,\nTu es un ange."
   ], correct:2,
   explain:"Deux virgules, deux vers : chacun commence par une majuscule."}
];

const GRID_QUESTIONS = [
  {type:'grid', round:"L'atelier du poète", scheme:"Rimes embrassées (ABBA)",
   letters:["A","B","B","A"],
   lines:["Le soleil brille sur la mer,","Les vagues dansent en silence,","Le vent murmure sa romance,","Et la nuit tombe sur la terre."]},
  {type:'grid', round:"L'atelier du poète", scheme:"Rimes croisées (ABAB)",
   letters:["A","B","A","B"],
   lines:["Le chat dort sur le tapis,","Le chien joue dans le jardin,","Les fleurs poussent à Paris,","Le facteur passe le matin."]},
  {type:'grid', round:"L'atelier du poète", scheme:"Rimes suivies (AABB)",
   letters:["A","A","B","B"],
   lines:["Le loup hurle dans la forêt,","Le renard court sans arrêt,","L'oiseau chante dans les cieux,","Le poisson nage silencieux."]}
];

const QUESTIONS = [...MCQ_QUESTIONS, ...GRID_QUESTIONS];
const LETTER_COLORS = ["#a9832f", "#3f8f8c", "#8a5fa8", "#c9525f"];
const MCQ_DURATION = 20000;   // 20s pour répondre à une question de cours / mise en vers
const GRID_DURATION = 60000;  // 60s pour l'atelier du poète

function calcPoints(base, timeMs, duration){
  const ratio = Math.min(timeMs / duration, 1);
  return Math.round(base * (1 - 0.5 * ratio));
}

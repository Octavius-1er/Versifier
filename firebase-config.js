// Remplace ces valeurs par celles de ta console Firebase
// (Paramètres du projet > Vos applications > config de l'app web)
const firebaseConfig = {
  apiKey: "REMPLACE_MOI",
  authDomain: "REMPLACE_MOI",
  databaseURL: "REMPLACE_MOI",
  projectId: "REMPLACE_MOI",
  storageBucket: "REMPLACE_MOI",
  messagingSenderId: "REMPLACE_MOI",
  appId: "REMPLACE_MOI"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

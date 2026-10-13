// Credenciais do projeto Firebase (Console do Firebase > Configurações do projeto > Seus apps > Web).
// Com null, a plataforma roda em MODO DEMONSTRAÇÃO (dados de exemplo salvos só neste navegador).
// Com credenciais, o endereço com ?demo no final continua abrindo a demonstração.
// Essas credenciais não são secretas: quem protege os dados são as regras em firestore.rules.
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDJSQ1K3KcvlVfs0XLUgAzcMuhidgMUqYk',
  authDomain: 'plataforma-coachees.firebaseapp.com',
  projectId: 'plataforma-coachees',
  storageBucket: 'plataforma-coachees.firebasestorage.app',
  messagingSenderId: '955110207107',
  appId: '1:955110207107:web:5a7c719e45c071ba2eb5b6'
};

// Exemplo:
// window.FIREBASE_CONFIG = {
//   apiKey: '...',
//   authDomain: 'plataforma-coachees.firebaseapp.com',
//   projectId: 'plataforma-coachees',
//   storageBucket: 'plataforma-coachees.firebasestorage.app',
//   messagingSenderId: '...',
//   appId: '...'
// };

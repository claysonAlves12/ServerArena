const { send } = require('micro');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

// Importe o arquivo serviceAccount
const serviceAccount = require('./arenatest-407913-firebase-adminsdk-z5m0o-9ff59aa7cf.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://arenatest-407913-default-rtdb.firebaseio.com"
});

const atualizarCache = async () => {
  try {
    const pastaImagens = path.join(__dirname, 'src/public/imgs');
    const listaImagens = fs.readdirSync(pastaImagens).map(imagem => {
      const nomeSemExtensao = path.parse(imagem).name;
      return {
        path: path.join('/imgs/arenaImagens', imagem),
        nome: nomeSemExtensao
      };
    });

    const usuariosRef = admin.database().ref('usuarios');
    const snapshot = await usuariosRef.once('value');
    const usuarios = snapshot.val();
    const rows = usuarios ? Object.values(usuarios) : [];

    console.log('Cache atualizado com sucesso.');
  } catch (error) {
    console.error('Erro ao atualizar o cache:', error.message);
  }
};

module.exports = async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    try {
      await atualizarCache();
      const pastaImagens = path.join(__dirname, 'src/public/imgs/arenaImagens');
      const listaImagens = fs.readdirSync(pastaImagens).map(imagem => {
        const nomeSemExtensao = path.parse(imagem).name;
        return {
          path: path.join('/imgs/arenaImagens', imagem),
          nome: nomeSemExtensao
        };
      });

      const usuariosRef = admin.database().ref('usuarios');
      const snapshot = await usuariosRef.once('value');
      const usuarios = snapshot.val();
      const rows = usuarios ? Object.values(usuarios) : [];

      const html = await ejs.renderFile(
        path.join(__dirname, 'src/views/index.ejs'),
        { usuarios: rows, user: req.user, imagens: listaImagens }
      );

      send(res, 200, html);
    } catch (error) {
      console.error(error.message);
      send(res, 500, 'Erro interno no servidor');
    }
  } else {
    send(res, 404, 'Rota não encontrada');
  }
};

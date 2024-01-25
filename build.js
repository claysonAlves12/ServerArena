console.log('Iniciando script de construção...');

const fs = require('fs');
const ejs = require('ejs');

const dummyData = [
 
  { nome: 'Jhn Doe', email: 'john@example.com', telefone: '63991029578',  },

];

const nomeUsuario = 'YourUserName'; 

const pages = [
  {
    srcPath: 'src/views/index.ejs',
    outputPath: 'src/views/index.html'
  },
  {
    srcPath: 'src/views/login.ejs',
    outputPath: 'src/views/login.html'
  },
 {
    srcPath: 'src/views/cadastro.ejs',
    outputPath: 'src/views/cadastro.html'
  },
 {
    srcPath: 'src/views/reservado.ejs',
    outputPath: 'src/views/reservado.html'
  },

];

const staticFiles = ['css/style.css', 'js/script.js', 'img/logo.png']; 

pages.forEach(page => {
  const ejsTemplate = fs.readFileSync(page.srcPath, 'utf-8');

  
  const renderedHtml = ejs.render(ejsTemplate, { formularios: dummyData, message: 'Default message', nomeUsuario });
  fs.writeFileSync(page.outputPath, renderedHtml);
  console.log(`Construção da página ${page.outputPath} concluída com sucesso!`);
});

console.log('Construção concluída para todas as páginas!');

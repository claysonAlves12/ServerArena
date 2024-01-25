const { send, json } = require('micro');
const { createServer } = require('http');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

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

      // Comente a linha abaixo para evitar emitir eventos Socket.IO em contexto serverless
      // io.emit('dadosAtualizados', rows);

      // Envie uma resposta HTTP usando a função send do micro
      send(res, 200, { usuarios: rows, user: req.user, imagens: listaImagens });

    } catch (error) {
      console.error(error.message);
      // Envie uma resposta de erro usando a função send do micro
      send(res, 500, 'Erro interno no servidor');
    }
  } else {
    // Envie uma resposta de erro para todas as outras rotas não suportadas
    send(res, 404, 'Rota não encontrada');
  }
};

//Rota para consultar os dados (formularios)
app.post('/consultar-dados', async (req, res) => {
  try {
    const snapshot = await admin.database().ref('formularios').once('value');

    const formularios = snapshot.val();

    const dados = Object.values(formularios || {}).map(formulario => ({
      esporte: formulario.esporte, 
      data: formulario.data,  
      horaInicial: formulario.horaInicial,
      horaFinal: formulario.horaFinal
    }));

    if (!dados || dados.length === 0) {
      return res.json({ dados: [] });
    }

    res.json({ dados });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao consultar dados no banco de dados.' });
  }
});

// Rota para verificar a disponibilidade com base em horários proibidos
app.post('/verificar-disponibilidade', async (req, res) => {
  try {
    const snapshot = await admin.database().ref('horariosProibidos').once('value');

    const formularios = snapshot.val();

    const dados = Object.values(formularios || {}).map(formulario => ({ 
      data: formulario.data,  
      horaInicial: formulario.horaInicial,
      horaFinal: formulario.horaFinal,
      descricao: formulario.descricao
    }));

    if (!dados || dados.length === 0) {
      return res.json({ dados: [] });
    }

    res.json({ dados });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao consultar dados no banco de dados.' });
  }
});

//Função para formatar os horarios
const formatHoraMinuto = (hora, minuto = 0) => {
  return `${hora < 10 ? '0' + hora : hora}:${minuto === 0 ? '00' : minuto}`;
};

//Função para calcular os horarios
const calculaHorarios = () => {
  const horas = [];

  // Início com a horaInicial em 8:00 e a horaFinal em 8:30
  for (let minuto of [0, 30]) {
    horas.push(formatHoraMinuto(8, minuto));
  }

  // Horas intermediárias (9:00 até 22:30 para horaInicial)
  for (let hora = 9; hora <= 22; hora++) {
    for (let minuto of [0, 30]) {
      horas.push(formatHoraMinuto(hora, minuto));
    }
  }

  // Fim com a horaFinal em 23:00
  for (let minuto of [0]) {
    horas.push(formatHoraMinuto(23, minuto));
  }

  return horas;
};

//Função para calcular Sobreposiçãp de horarios
const verificaSobreposicao = (formularios, inicio, fim) => {

  const horariosExatos = formularios.filter(formulario => 
    formulario.horaInicial === inicio && formulario.horaFinal === fim
  );
  
  if (horariosExatos.length === 1) {

  } else if (horariosExatos.length > 1) {

    return true; 
  } 

  // Verifica sobreposição com os horários nos formularios do banco de dados
  for (const formulario of formularios) {
    if (inicio < formulario.horaFinal && fim > formulario.horaInicial) {
      return true; // Sobreposição encontrada
    }
  }

  return false; // Sem sobreposição encontrada
};

//Rota para Sugerir Horarios
app.post('/obter-horario-sugerido', async (req, res) => {
  try {
    const { esporte, data, horaInicial, horaFinal } = req.body;
    const snapshot = await admin.database().ref('formularios').once('value');
    const formulariosFiltrados = snapshot.val() || {};
    const formulariosPorEsporte = Object.values(formulariosFiltrados).filter(formulario => formulario.esporte === esporte && formulario.data === data);

    const todasHorasIniciais = calculaHorarios();
    const todasHorasFinais = calculaHorarios();
    const horasIniciaisAntes = calculaHorarios().filter(h => h < horaInicial).sort().reverse();
    const horasFinaisAntes = calculaHorarios().filter(h => h < horaFinal).sort().reverse();

    const horariosValidos = [];
    let antesContador = 0;
    let depoisContador = 0;

    const horasIniciais = [...new Set([...horasIniciaisAntes, ...todasHorasIniciais])];
    const horasFinais = [...new Set([...horasFinaisAntes, ...todasHorasFinais])];

    for (const horaInicialTemp of horasIniciais) {
      for (const horaFinalTemp of horasFinais) {
        const [horaIni, minIni] = horaInicialTemp.split(':').map(Number);
        const [horaFim, minFim] = horaFinalTemp.split(':').map(Number);
        const diferencaMinutos = (horaFim * 60 + minFim) - (horaIni * 60 + minIni);
      
        if (diferencaMinutos >= 30 && diferencaMinutos <= 120 && !verificaSobreposicao(formulariosPorEsporte, horaInicialTemp, horaFinalTemp)) {
          if (horaInicialTemp < horaInicial && horaFinalTemp <= horaInicial && antesContador < 3) {
            const horarioJaAdicionado = horariosValidos.some(horario => horario.horaInicial === horaInicialTemp && horario.horaFinal === horaFinalTemp);
        
            if (!horarioJaAdicionado) {
              horariosValidos.push({ horaInicial: horaInicialTemp, horaFinal: horaFinalTemp });
              antesContador++;
              console.log("Horário válido adicionado antes:", { horaInicial: horaInicialTemp, horaFinal: horaFinalTemp });
            }

          } else if (horaFinalTemp > horaFinal && horaInicialTemp >= horaFinal && depoisContador < 3) {
            horariosValidos.push({ horaInicial: horaInicialTemp, horaFinal: horaFinalTemp });
            depoisContador++;
            console.log("Horário válido adicionado depois:", { horaInicial: horaInicialTemp, horaFinal: horaFinalTemp });
          }
        }
      }
    }

    horariosValidos.sort((a, b) => {
      const horaA = a.horaInicial.split(':').map(Number).reduce((acc, curr) => acc * 60 + curr, 0);
      const horaB = b.horaInicial.split(':').map(Number).reduce((acc, curr) => acc * 60 + curr, 0);
      return horaA - horaB;
    });
    
    
    console.log(horariosValidos);
    res.status(200).json(horariosValidos);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao consultar dados no banco de dados.' });
  }
});

// Rota para processar o formulário
app.post('/processar-formulario', async (req, res) => {
  const { nome, telefone, email, esporte, data, horaInicial, horaFinal } = req.body;

  if (!nome || !telefone || !email || !esporte || !data || !horaInicial || !horaFinal) {
    return res.status(400).json({ success: false, message: 'Por favor, preencha todos os campos.' });
  }

  try {
   
    const newFormRef = formulariosRef.push();

    const formularioId = newFormRef.key;

    await newFormRef.set({
      id: formularioId,
      status:"Pendente",
      nome: nome,
      telefone: telefone,
      email: email,
      esporte: esporte,
      data: data,
      horaInicial: horaInicial,
      horaFinal: horaFinal
      
    });

    io.emit('novoFormulario', { id: formularioId, nome, telefone, email, esporte, data, horaInicial, horaFinal });

    res.status(200).json({ success: true, message: 'Formulário enviado com sucesso.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Erro ao enviar o formulário.' });
  }
});

//Rota para o formulário de cadastro
app.get('/cadastro', (req, res) => {
  res.render('cadastro', { message: req.flash('error') });
});

//Cadastrar usuario
app.post('/cadastro', async (req, res) => {
  const nome = req.body.nome;
  const email = req.body.email;
  const senha = req.body.senha;

  try {
    const snapshot = await admin.database().ref('usuarios').orderByChild('email').equalTo(email).once('value');

    if (snapshot.exists()) {
      return res.send('Usuário já existe. Por favor, escolha outro email.');
    } else {
      const saltRounds = 10;
      const hashedSenha = await bcrypt.hash(senha, saltRounds);
      await admin.database().ref('usuarios').push({
        nome: nome,
        email: email,
        senha: hashedSenha
      });
      res.redirect('/login');
    }
  } catch (error) {
    console.error(error.message);
    return res.status(500).send('Erro interno no servidor.');
  }
});

// Rota para a página de login
app.get('/login', (req, res) => {
  res.render('login', { message: req.flash('error') });
});

//logar usuario
app.post('/login', async (req, res) => {
  const email = req.body.email;
  const senha = req.body.senha;

  try {
    const snapshot = await admin.database().ref('usuarios').orderByChild('email').equalTo(email).once('value');
    const users = snapshot.val();

    if (users) {

      const userId = Object.keys(users)[0];
      const user = users[userId];

      const match = await bcrypt.compare(senha, user.senha);

      if (match) {
        req.session.nomeUsuario = user.nome;
        return res.redirect('/reservado?horarios');
      }
    }

    req.flash('error', 'Email ou senha incorretos. Por favor, tente novamente.');
    return res.render('login', { message: req.flash('error') });

  } catch (error) {
    console.error(error.message);
    return res.status(500).send('Erro interno no servidor.');
  }
});

// Rota para exibir formulários enviados
app.get('/reservado', async (req, res) => {
  
  const nomeUsuario = req.session.nomeUsuario || "Nome do Usuário";

  try {
    const snapshot = await formulariosRef.once('value');
    const rows = snapshot.val();

    const formulariosArray = rows ? Object.values(rows) : [];

    res.render('reservado', { formularios: formulariosArray, nomeUsuario: nomeUsuario });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Erro interno no servidor');
  }
});

// Rota para excluir um formulário com base no ID
app.delete('/deletar-formulario/:id', async (req, res) => {
  const formularioId = req.params.id;

  try {
    
    const formularioRef = formulariosRef.child(formularioId);

    await formularioRef.remove();

    io.emit('formularioDeletado', { id: formularioId });

    res.status(200).json({ success: true, message: 'Formulário excluído com sucesso.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Erro ao excluir o formulário.' });
  }
});

// Rota para atualizar o status id
app.put('/atualizar-status/:id', async (req, res) => {
  const id = req.params.id;
  const novoStatus = req.body.status;

  if (!id || !novoStatus) {
    return res.status(400).json({ success: false, message: 'ID e novo status são necessários.' });
  }

  try {
    const formularioRef = formulariosRef.child(id);
    const snapshot = await formularioRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, message: 'Registro não encontrado.' });
    }

    await formularioRef.update({
      status: novoStatus
    });

    
    io.emit('statusAtualizado', { id, novoStatus });

    res.json({ success: true });
  }catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Erro ao atualizar o status.' });
  }
});

// Rota do status id
app.get('/status/:id',async (req, res) => {
  const id = req.params.id;

  try {
    const formularioRef = formulariosRef.child(id);
    const snapshot = await formularioRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, message: 'Registro não encontrado.' });
    }
    const data = snapshot.val();
    res.json({ success: true, status: data.status });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Erro ao obter o status.' });
  }
});

// Rota para exibir a página de proibir horários
app.get('/proibir', async (req, res) => {
  try {
    const snapshot = await admin.database().ref('horariosProibidos').once('value');
    const horariosProibidosObj = snapshot.val() || {};
  
    
    const horariosProibidos = Object.entries(horariosProibidosObj).map(([key, value]) => ({ key, ...value }));
    res.render('proibir', { 
      message: req.flash('message'),
      horariosProibidos: horariosProibidos,
    });

  }catch (error) {
    console.error(error.message);
    res.status(500).send('Erro ao carregar os horários proibidos.');
  }
});

//rota para add horarios proibidos
app.post('/proibir-horarios', async (req, res) => {
  const { data, horaInicial, horaFinal, descricao } = req.body;

  try {
    
    const snapshot = await admin.database().ref('horariosProibidos').orderByChild('data').equalTo(data).once('value');

    if (snapshot.exists()) {
      const registros = snapshot.val();

      for (const key in registros) {
        const registro = registros[key];

        if ((!registro.horaInicial || registro.horaInicial === "") || (!registro.horaFinal || registro.horaFinal === "")) {
          io.emit('horasJaRegistradas', { message: 'Dia todo Agendado.' });
          return;
        }

        if (registro.horaInicial === horaInicial && registro.horaFinal === horaFinal) {
          io.emit('horasJaRegistradas', { message: 'As horas já estão registradas.' });
          return;
        }

      }
    }

    const newRef = await admin.database().ref('horariosProibidos').push({
      data: data,
      horaInicial: horaInicial,
      horaFinal: horaFinal,
      descricao: descricao
    });

    const key = newRef.key;

    
    res.redirect('/proibir');
    
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Erro ao atualizar os horários proibidos.' });
  }

});

//rota para excluir horarios proibidos
app.post('/excluir-horario', async (req, res) => {
  const horarioId = req.body.horarioId;
  try {

    if (!horarioId) {
        return res.status(400).json({ success: false, message: 'ID do horário proibido é inválido.' });
    }
    const snapshot = await admin.database().ref('horariosProibidos').child(horarioId).once('value');
    if (snapshot.exists()) {
      await snapshot.ref.remove();
      res.redirect('/proibir'); 
    } else {
      res.status(404).json({ success: false, message: 'Horário proibido não encontrado.' });
    }

  }catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Erro ao excluir o horário proibido.' });
  }
});

//rota da politica de privacidade
app.get('/politica-de-privacidade', (req, res) => {
  res.render('politicaPrivacidade');
});

// Middleware para rota não encontrada
app.use((req, res) => {
  res.render('404');
});

module.exports = app;

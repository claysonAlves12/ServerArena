
document.getElementById('telefone').addEventListener('input', formatarTelefone);

function formatarTelefone() {
    let telefone = document.getElementById('telefone').value;

    // Remova caracteres não numéricos do número de telefone
    telefone = telefone.replace(/\D/g, '');

    // Garanta que o número tenha no máximo 11 dígitos
    telefone = telefone.substring(0, 11);

    // Não permita números como 0000000000 ou 1111111111
    if (/(.)\1{9}/.test(telefone)) {
        // Se o número for uma sequência repetida de dígitos, defina-o como vazio
        telefone = '';
    } else {
        // Formate o número de telefone como (XX) XXXXX-XXXX
        if (telefone.length >= 2) {
            telefone = `(${telefone.substring(0, 2)}) ${telefone.substring(2, 7)}-${telefone.substring(7)}`;
        }
    }

    // Atualize o valor do campo de telefone com a formatação
    document.getElementById('telefone').value = telefone;
}


async function validarEEnviarFormulario() {
    event.preventDefault();
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const email = document.getElementById('email').value;
    const esporte = document.getElementById('esporte').value;
    const data = document.getElementById('data').value;
    const horaInicial = document.getElementById('horaInicial').value;
    const horaFinal = document.getElementById('horaFinal').value;
  
    function converterParaMinutos(hora) {
        const [horas, minutos] = hora.split(':').map(Number);
        return horas * 60 + minutos;
    }
    
    function converterParaHora(minutos) {
        const horas = Math.floor(minutos / 60);
        const minutosRestantes = minutos % 60;
        return `${String(horas).padStart(2, '0')}:${String(minutosRestantes).padStart(2, '0')}`;
    }
    
    const horaMinima = converterParaMinutos("08:00");
    const horaMaxima = converterParaMinutos("23:00");
    const horaInicialMinutos = converterParaMinutos(horaInicial);
    const horaFinalMinutos = horaFinal === '00:00' ? converterParaMinutos('24:00') : converterParaMinutos(horaFinal);
    
    if (horaInicialMinutos < horaMinima || horaInicialMinutos > horaMaxima) {
        const horaMinimaFormatada = converterParaHora(horaMinima);
        alert(`Estamos fechados no momento. Abriremos às ${horaMinimaFormatada}.`);
        document.getElementById('horaInicial').value = '';
        document.getElementById('horaFinal').value = '';
        return false;
    } else if (horaFinalMinutos > horaMaxima) {
        const horaMinimaFormatada = converterParaHora(horaMinima);
        alert(`Estamos fechados no momento. Abriremos às ${horaMinimaFormatada}. Por favor, verifique e ajuste sua 'Hora Final' se deseja reservar uma quadra.`);
        document.getElementById('horaInicial').value = '';
        document.getElementById('horaFinal').value = '';
        return false;
    }
    
    if(horaInicial > horaFinal){
        console.log("Hora Inicial é maior que a Hora Final");
        alert(`Por favor, certifique-se de que sua 'Hora Inicial' não seja maior que a 'Hora Final' ao reservar uma quadra.`);
        document.getElementById('horaInicial').value = '';
        document.getElementById('horaFinal').value = '';
        return false;
    } 
    
    const diferencaHoras = parseInt(horaFinal) - parseInt(horaInicial);
    const diferencaMinutos = (parseInt(horaFinal.substr(3)) - parseInt(horaInicial.substr(3))) + (diferencaHoras * 60);

    if (diferencaMinutos < 30) {
        alert(` reserva requer, no mínimo, um período de 30 minutos, você está querendo reservar ${diferencaMinutos} minutos`);
        document.getElementById('horaInicial').value = '';
        document.getElementById('horaFinal').value = '';
        return false;
    }
    
    if (diferencaHoras > 2 || diferencaMinutos > 120) {
        alert(`A reserva não pode exceder o período de duas horas, você está querendo reservar ${diferencaHoras}hrs`);
        document.getElementById('horaInicial').value = '';
        document.getElementById('horaFinal').value = '';
        return false;
    }
   
    if (!nome || !telefone || !email || !esporte || !data || !horaInicial || !horaFinal) {
        alert('Por favor, preencha todos os campos.');
        return false; 
    }

    const dataAtual = new Date();
    const dataFormulario = new Date(data);
    const dataMaxima = new Date();
    dataMaxima.setMonth(dataMaxima.getMonth() + 1);
    
    if (dataFormulario.getDay() === 6) {
        alert('Estamos fechado aos domingos.');
        document.getElementById('data').value = '';
        return false;
    }

    if (dataFormulario < dataAtual ) {
        alert('Hórarios esgotados.');
        document.getElementById('data').value = '';
        return false;
    } 
    if (dataFormulario > dataMaxima){
        alert('Reservas só podem ser feitas para datas até um mês após a data atual.');
        document.getElementById('data').value = '';
        return false;
    }
    
    try {
        const resultado = await VerificarDisponibilidade(esporte, data, horaInicial, horaFinal);
        if(resultado && resultado.mensagem === 'Horário proibido'){
            alert(`${resultado.descricao}.`);
            document.getElementById('horaInicial').value = '';
            document.getElementById('horaFinal').value = '';
            return false;
            
        }else if (resultado === 'Campos de gramado ocupados') {
            alert('Todos os nossos campos Society já estão ocupados nesse horário. Por favor, escolha outro campo ou horário.');
            document.getElementById('horaInicial').value = '';
            document.getElementById('horaFinal').value = '';

            console.log("Tentando obter horário sugerido...");
            const horariosValidos = await ObterHorarioSugeridoDisponivel(esporte, data, horaInicial, horaFinal);
            console.log("Horário Sugerido:", horariosValidos);
            MostrarHorariosDisponiveis(horariosValidos);
            return false;

        }else if (resultado === 'Campos de areia ocupados') {
            alert('Todos os nossos campos de areia já estão ocupados nesse horário. Por favor, escolha outro campo ou horário.');
            document.getElementById('horaInicial').value = '';
            document.getElementById('horaFinal').value = '';
        
            console.log("Tentando obter horário sugerido...");
            const horariosValidos = await ObterHorarioSugeridoDisponivel(esporte, data, horaInicial, horaFinal);
            console.log("Horário Sugerido:", horariosValidos);
            MostrarHorariosDisponiveis(horariosValidos);
            return false;
        }
        
        const formData = {
            nome: nome,
            telefone: telefone,
            email: email,
            esporte: esporte,
            data: data,
            horaInicial: horaInicial,
            horaFinal: horaFinal
        };

        const response = await fetch('/processar-formulario', {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {
                'Content-Type': 'application/json'
            },
        });

        const dataResponse = await response.json();

        if (dataResponse.success) {
            limparCamposFormulario(['nome', 'telefone', 'email', 'esporte', 'data', 'horaInicial', 'horaFinal']);
            alert('Horario Reservado');
        } else {
            alert('Erro ao enviar o formulário. ' + dataResponse.message);
        }
    } catch (error) {
        console.error('Erro ao processar o formulário:', error);
    }

    return false;
}

async function verificarHorariosProibidos(data, horaInicial, horaFinal) {
 
    const response = await fetch('/verificar-disponibilidade', {
        method: 'POST',
        body: JSON.stringify({ data, horaInicial, horaFinal }),
        headers: {
            'Content-Type': 'application/json'
        },
    });

    if (!response.ok) {
        console.error('Erro na requisição: ' + response.statusText);
        throw new Error('Erro na requisição: ' + response.statusText);
    }

    const dataRetornada = await response.json();
    console.log('Dados retornados da API:', dataRetornada); // Detalhes dos dados retornados

    if (!dataRetornada || !dataRetornada.dados || dataRetornada.dados.length === 0) {
        console.log('Nenhum dado válido encontrado.');
        return false;
    }

    const formuláriosFiltrados = dataRetornada.dados.filter(formulario => formulario.data === data);
    console.log('Formulários filtrados pela data:', formuláriosFiltrados);

    const formularioProibido = formuláriosFiltrados.find(formulario => {
        if (formulario.data === data) {
            // Verificando se os horários são válidos e não contêm apenas espaços em branco
            const horaInicialValida = formulario.horaInicial && formulario.horaInicial.trim() !== '';
            const horaFinalValida = formulario.horaFinal && formulario.horaFinal.trim() !== '';
    
            if (horaInicialValida && horaFinalValida) {
                const inicioPermitido = new Date(formulario.data + 'T' + formulario.horaInicial);
                const fimPermitido = new Date(formulario.data + 'T' + formulario.horaFinal);
                const horaIni = new Date(formulario.data + 'T' + horaInicial);
                const horaFim = new Date(formulario.data + 'T' + horaFinal);
    
                const isProibido = horaIni >= inicioPermitido && horaFim <= fimPermitido;
                console.log(`Comparando horários - Início permitido: ${inicioPermitido}, Fim permitido: ${fimPermitido}, Hora Ini: ${horaIni}, Hora Fim: ${horaFim}, Proibido: ${isProibido}`);
    
                return isProibido;
            }
    
            // Tratando cenário em que os horários não são válidos (undefined ou apenas espaços em branco)
            if (!horaInicialValida && !horaFinalValida) {
                console.log('Horários inválidos encontrados no formulário:', formulario);
                return true;  // Considerar como se todos os horários fossem proibidos
            }
    
            // Tratando cenário em que apenas um dos horários não é válido
            if (!horaInicialValida || !horaFinalValida) {
                console.log('Apenas um dos horários é inválido no formulário:', formulario);
                return false;  // Não considerar como proibido
            }
        }
    
        return false;  // Não há correspondência ou falta de dados
    });
    
    console.log('Formulário proibido encontrado:', formularioProibido);

    const proibirEnvio = formularioProibido ? `Horário proibido: ${formularioProibido.descricao}` : null;

    console.log('Proibir envio:', proibirEnvio);

    return proibirEnvio;
}

async function VerificarDisponibilidade(esporte, data, horaInicial, horaFinal) {
    try {   

        const horariosIndisponveis = await verificarHorariosProibidos(data, horaInicial, horaFinal);
        if (horariosIndisponveis) {
            console.log(horariosIndisponveis);
            return {
                mensagem: 'Horário proibido',
                descricao: horariosIndisponveis
            }; 
        }
       
        const response = await fetch('/consultar-dados', {
            method: 'POST',
            body: JSON.stringify({ esporte, data, horaInicial, horaFinal }),
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error('Erro na requisição: ' + response.statusText);
        }

        const dataRetornada = await response.json();

        if (!dataRetornada || !dataRetornada.dados || dataRetornada.dados.length === 0) {
            console.log('Sem dados retornados ou dados vazios.');
            return [];
        }


        let resultado = null; 

        if (esporte === 'Campo de Gramado') {
            console.log('Verificando campos de Gramado...');
            const camposDeGramado = dataRetornada.dados.filter(formulario => formulario.esporte === 'Campo de Gramado');

            const campoOcupado = camposDeGramado.filter(formulario => {
                console.log('verificação1', formulario.data, '===', data);
                console.log('verificação2', formulario.horaInicial, '<=', horaInicial);
                console.log('verificação3', formulario.horaFinal, '>=', horaFinal);

                const horasIguais = formulario.horaFinal === horaInicial;

                console.log(horasIguais,"horasIguais");
                
                return formulario.data === data && 
                       formulario.horaInicial < horaFinal &&
                       formulario.horaFinal > horaInicial&&
                       formulario.horaInicial !== horaFinal;
            });
            
            if (campoOcupado.length === 1) {
                console.log('Apenas um registro encontrado. Reservando...',campoOcupado);
                resultado = "Reserva essa bagaça";
            } else if (campoOcupado.length >= 3) {
                console.log('Dois ou mais registros encontrados. Campos ocupados.',campoOcupado);
                resultado = "Campos de gramado ocupados";
            } else {
                console.log('Nenhum registro encontrado. Disponível para reserva.');
                resultado = "Reserva essa bagaça";
            }
                 
        }else if (esporte === 'Campo de Areia') {
            const camposDeAreia = dataRetornada.dados.filter(formulario => formulario.esporte === 'Campo de Areia');
            console.log('campos de areia: ', camposDeAreia);
            
            
            const areiaOcupada1 = camposDeAreia.filter(formulario => {
                console.log('verificação1', formulario.data, '===', data);
                console.log('verificação2', formulario.horaInicial, '<=', horaFinal);
                console.log('verificação3', formulario.horaFinal, '>=', horaInicial);

                const horasIguais = formulario.horaFinal === horaInicial;

                console.log(horasIguais,"horasIguais");
                
                return formulario.data === data && 
                formulario.horaInicial < horaFinal &&
                formulario.horaFinal > horaInicial&&
                formulario.horaInicial !== horaFinal;
                       
            });
            
            console.log("Quantidade de registros encontrados:", areiaOcupada1.length);
            
            if (areiaOcupada1.length === 1) {
                console.log('Apenas um registro encontrado. Reservando...',areiaOcupada1);
                resultado = "Reserva essa bagaça";
            } else if (areiaOcupada1.length >= 2) {
                console.log('Dois ou mais registros encontrados. Campos de areia ocupados.',areiaOcupada1);
                resultado = "Campos de areia ocupados";
            } else {
                console.log('Nenhum registro encontrado. Disponível para reserva.');
                resultado = "Reserva essa bagaça";
            }
        }
        
        return resultado; 
            
    } catch (error) {
        console.error('Erro ao consultar dados:', error);
        throw error;
    }
}


function MostrarHorariosDisponiveis(horariosValidos) {
    const horariosDisponiveisDiv = document.querySelector('.horariosDisponiveis');
    horariosDisponiveisDiv.classList.remove('d-none');

    const listaHorariosDiv = document.querySelector('.listaHorarios');

    let horariosContent = "";
    if (Array.isArray(horariosValidos) && horariosValidos.length > 0) {
        const firstThreeHorarios = horariosValidos.slice(0, 9);
        horariosContent = firstThreeHorarios.map(horario => `<li>Hora Inicial:  ${horario.horaInicial} as Hora Final:${horario.horaFinal}</li>`).join('');
    } else {
        horariosContent = "<li>Todos os horários estão reservados.</li>";
    }

    listaHorariosDiv.innerHTML = horariosContent;
}

function fecharHorariosDisponiveis() {
    const horariosDisponiveisDiv = document.querySelector('.horariosDisponiveis');
    horariosDisponiveisDiv.classList.add('d-none');
}


async function ObterHorarioSugeridoDisponivel(esporte, data, horaInicial, horaFinal) {
    try {
        const response = await fetch('/obter-horario-sugerido', {
            method: 'POST',
            body: JSON.stringify({ esporte, data, horaInicial, horaFinal }),
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            console.error("Resposta não está ok. Status:", response.status, "Mensagem:", response.statusText);
            throw new Error('Erro ao obter horário sugerido: ' + response.statusText);
        }

        const horariosValidos = await response.json();

        if (!horariosValidos) {

            return null;
        }

        return horariosValidos;

    } catch (error) {
        console.error('Erro ao obter horário sugerido:', error.message);
        throw error;
    }
}

function limparCamposFormulario(ids) {
    ids.forEach(id => {
        document.getElementById(id).value = '';
    });
}


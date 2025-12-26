// src/components/usuarios/useImprimirRelatorio.js
import { formatarMinutosParaHora } from "../../../utils/dateUtils";

// Função auxiliar para formatar horários
const formatarHoraComFallback = (valor, campo) => {
    try {
        if (!valor) return "-";

        // Se já for uma string formatada, retorna como está
        if (typeof valor === "string" && valor.includes(':')) {
            return valor;
        }

        // Se for um objeto Date
        if (valor instanceof Date) {
            return valor.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Sao_Paulo",
            });
        }

        // Se for objeto Firebase Timestamp
        if (typeof valor === "object" && valor !== null) {
            if ("seconds" in valor) {
                const date = new Date(valor.seconds * 1000);
                return date.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Sao_Paulo",
                });
            }
            if (valor.toDate && typeof valor.toDate === "function") {
                const date = valor.toDate();
                return date.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Sao_Paulo",
                });
            }
        }

        // Se for string ISO, tenta converter
        if (typeof valor === "string") {
            const date = new Date(valor);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Sao_Paulo",
                });
            }
        }

        return "-";
    } catch (e) {
        console.error(`Erro ao formatar ${campo}:`, valor, e);
        return "-";
    }
};

export default function useImprimirRelatorio() {
    return (empresa, usuarioData, periodo, registros) => {
        const janela = window.open("", "_blank");
        if (!janela) return;

        const totais = usuarioData.totais || {};
        const dataEmissao = new Date().toLocaleDateString('pt-BR');

        const html = `
      <html>
        <head>
          <title>Relatório de Ponto - ${usuarioData.usuario}</title>
          <style>
            @media print {
              @page {
                size: A4 portrait;
                margin: 0.5cm;
              }
            }
            
            body { 
              font-family: Arial, sans-serif; 
              font-size: 10px;
              padding: 5px;
              margin: 0;
            }
            
            h1, h2, h3 { 
              margin: 5px 0; 
            }
            
            h1 {
              font-size: 14px;
            }
            
            h2 {
              font-size: 12px;
            }
            
            h3 {
              font-size: 11px;
            }
            
            .empresa-info { 
              margin-bottom: 10px; 
              padding-bottom: 5px;
              border-bottom: 1px solid #ccc;
            }
            
            .info-container {
              display: flex;
              flex-wrap: wrap;
              justify-content: space-between;
              margin-bottom: 10px;
            }
            
            .info-box {
              flex: 1;
              min-width: 45%;
              margin-bottom: 5px;
            }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 5px;
              page-break-inside: auto;
            }
            
            table, th, td { 
              border: 1px solid #333; 
            }
            
            th, td { 
              padding: 3px; 
              text-align: center; 
              font-size: 9px; 
            }
            
            th { 
              background: #f0f0f0; 
              font-weight: bold;
            }
            
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            .totais { 
              margin-top: 10px;
              border-top: 1px solid #ccc;
              padding-top: 5px;
            }
            
            .totais-container {
              display: flex;
              flex-wrap: wrap;
            }
            
            .total-item {
              margin: 3px 10px 3px 0;
              min-width: 120px;
            }
            
            .compact-cell {
              max-width: 50px;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            .assinaturas {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            
            .assinatura {
              width: 45%;
              text-align: center;
              border-top: 1px solid #000;
              padding-top: 40px;
            }
            
            .data-emissao {
              text-align: right;
              margin-top: 10px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="empresa-info">
            <h2>${empresa?.razaoSocial || "Empresa"}</h2>
            <p>CNPJ: ${empresa?.cnpj || ""} | Endereço: ${empresa?.endereco || ""}</p>
${empresa?.gestor ? `<p>Responsável: ${empresa.gestor}</p>` : ''}          </div>

          <h1>Relatório de Ponto</h1>
          
          <div class="info-container">
            <div class="info-box">
              <p><strong>Funcionário:</strong> ${usuarioData.usuario}</p>
              <p><strong>ID:</strong> ${totais.idLogin || "N/A"} | <strong>Depto:</strong> ${totais.departamento || "Não informado"}</p>
            </div>
            <div class="info-box">
              <p><strong>Jornada:</strong> ${totais.jornada || "12/36"}</p>
              <p><strong>Período:</strong> ${periodo}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th class="compact-cell">Entrada</th>
                <th class="compact-cell">Saída Alm.</th>
                <th class="compact-cell">Volta Alm.</th>
                <th class="compact-cell">Saída</th>
                <th class="compact-cell">H. Trab.</th>
                <th class="compact-cell">H. Extras</th>
                <th class="compact-cell">Atrasos</th>
              </tr>
            </thead>
            <tbody>
              ${registros.map((r) => `
                <tr>
                  <td>${r.data}</td>
                  <td>${formatarHoraComFallback(r.entrada, 'entrada')}</td>
                  <td>${formatarHoraComFallback(r.saidaAlmoco, 'saidaAlmoco')}</td>
                  <td>${formatarHoraComFallback(r.voltaAlmoco, 'voltaAlmoco')}</td>
                  <td>${formatarHoraComFallback(r.saida, 'saida')}</td>
                  <td>${formatarMinutosParaHora(r.totaisDia?.horasTrabalhadas || 0)}</td>
                  <td>${formatarMinutosParaHora(r.totaisDia?.horasExtras || 0)}</td>
                  <td>${formatarMinutosParaHora((r.totaisDia?.atrasoEntrada || 0) + (r.totaisDia?.atrasoVoltaAlmoco || 0))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="totais">
            <h3>Totais do Período</h3>
            <div class="totais-container">
              <div class="total-item"><strong>Horas Extras:</strong> ${formatarMinutosParaHora(totais.horasExtras || 0)}</div>
              <div class="total-item"><strong>Atrasos:</strong> ${formatarMinutosParaHora(totais.atrasos || 0)}</div>
              <div class="total-item"><strong>Dias Trabalhados:</strong> ${totais.diasTrabalhados || 0}</div>
              <div class="total-item"><strong>Dias Abonados:</strong> ${totais.diasAbonados || 0}</div>
              <div class="total-item"><strong>Faltas:</strong> ${totais.faltas || 0}</div>
              <div class="total-item"><strong>Total de Dias:</strong> 
                ${(totais.diasTrabalhados || 0) + (totais.diasAbonados || 0) + (totais.faltas || 0)}
              </div>
            </div>
          </div>

          <div class="assinaturas">
            <div class="assinatura">
              <p>_________________________________________</p>
              <p>${usuarioData.usuario}</p>
              <p>Funcionário</p>
            </div>
            <div class="assinatura">
              <p>_________________________________________</p>
              <p>${empresa?.gestor || "Gestor"}</p>
              <p>Responsável</p>
            </div>
          </div>

          <div class="data-emissao">
            Emitido em: ${dataEmissao}
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

        janela.document.write(html);
        janela.document.close();
    };
}
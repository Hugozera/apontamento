// migrateExcluirForaAgosto.js
const admin = require("firebase-admin");
const { parse } = require("date-fns");
const { ptBR } = require("date-fns/locale");
const { Timestamp } = require("firebase-admin/firestore");

// Inicializa Firebase Admin
const serviceAccount = require("../../ServiceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Função para processar uma coleção
async function processarColecao(nomeColecao) {
    console.log(`🔹 Processando coleção: ${nomeColecao}`);
    const snapshot = await db.collection(nomeColecao).get();

    if (snapshot.empty) {
        console.log("Nenhum documento encontrado.");
        return;
    }

    let removidos = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let dataHora = null;

        if (data.horaPonto instanceof Timestamp) {
            dataHora = data.horaPonto.toDate();
        } else if (typeof data.horaPonto === "string") {
            dataHora = parse(data.horaPonto, "dd/MM/yyyy HH:mm:ss", new Date(), { locale: ptBR });
            if (!isNaN(dataHora)) {
                // Atualiza o documento para Timestamp
                await doc.ref.update({ horaPonto: Timestamp.fromDate(dataHora) });
            }
        }

        if (dataHora && dataHora.getMonth() !== 7) { // agosto = 7
            await doc.ref.delete();
            removidos++;
            console.log(`🗑 Documento ${doc.id} removido (não é de agosto)`);
        }
    }

    console.log(`✅ ${removidos} documentos removidos da coleção ${nomeColecao}.\n`);
}

// Função principal
async function main() {
    try {
        await processarColecao("pontos");
        await processarColecao("pontosEfetivados");

        console.log("🚀 Processamento concluído!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Erro ao processar:", error);
        process.exit(1);
    }
}

main();

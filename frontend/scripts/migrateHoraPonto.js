// migrateHoraPonto.js
const admin = require("firebase-admin");
const { parse } = require("date-fns");
const { ptBR } = require("date-fns/locale");
const { Timestamp } = require("firebase-admin/firestore");

// Inicializa Firebase Admin com credencial de serviceAccount
const serviceAccount = require("/ServiceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateHoraPonto() {
    const colecaoRef = db.collection("pontosEfetivados");
    const snapshot = await colecaoRef.get();

    if (snapshot.empty) {
        console.log("Nenhum documento encontrado.");
        return;
    }

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const horaPontoStr = data.horaPonto;

        if (horaPontoStr && typeof horaPontoStr === "string") {
            try {
                // Converte string -> Date usando formato brasileiro
                const dataConvertida = parse(horaPontoStr, "dd/MM/yyyy HH:mm:ss", new Date(), { locale: ptBR });

                if (!isNaN(dataConvertida)) {
                    await doc.ref.update({
                        horaPonto: Timestamp.fromDate(dataConvertida),
                    });
                    console.log(`✅ Documento ${doc.id} atualizado com sucesso.`);
                } else {
                    console.warn(`⚠️ Documento ${doc.id} tem data inválida: ${horaPontoStr}`);
                }
            } catch (err) {
                console.error(`Erro ao processar doc ${doc.id}:`, err);
            }
        }
    }
}

migrateHoraPonto().then(() => {
    console.log("🚀 Migração concluída!");
    process.exit();
});

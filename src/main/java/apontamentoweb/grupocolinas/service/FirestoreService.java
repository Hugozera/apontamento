package apontamentoweb.grupocolinas.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.google.firebase.FirebaseApp;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ExecutionException;

@Service
public class FirestoreService {

    private final Firestore firestore;

    public FirestoreService(FirebaseApp firebaseApp) {
        this.firestore = FirestoreClient.getFirestore(firebaseApp);
    }

    // --- Usuários ---

    public List<Map<String, Object>> listarUsuarios() throws ExecutionException, InterruptedException {
        List<Map<String, Object>> usuarios = new ArrayList<>();
        ApiFuture<QuerySnapshot> future = firestore.collection("users").get();

        for (DocumentSnapshot doc : future.get().getDocuments()) {
            Map<String, Object> data = doc.getData();
            data.put("id", doc.getId());
            usuarios.add(data);
        }
        return usuarios;
    }

    public Map<String, Object> buscarUsuarioPorId(String id) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection("users").document(id);
        DocumentSnapshot doc = docRef.get().get();

        if (doc.exists()) {
            Map<String, Object> data = doc.getData();
            data.put("id", doc.getId());
            return data;
        }
        return null;
    }

    public String criarUsuario(Map<String, Object> usuario) throws ExecutionException, InterruptedException {
        ApiFuture<DocumentReference> future = firestore.collection("users").add(usuario);
        return future.get().getId();
    }

    public boolean atualizarUsuario(String id, Map<String, Object> dadosAtualizados) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection("users").document(id);
        DocumentSnapshot doc = docRef.get().get();

        if (doc.exists()) {
            docRef.update(dadosAtualizados).get();
            return true;
        }
        return false;
    }

    public boolean excluirUsuario(String id) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection("users").document(id);
        DocumentSnapshot doc = docRef.get().get();

        if (doc.exists()) {
            docRef.delete().get();
            return true;
        }
        return false;
    }


    // --- Seus métodos existentes para pontos e faltas continuam aqui ---
    public List<Map<String, Object>> listarPontosPendentes() throws ExecutionException, InterruptedException {
        List<Map<String, Object>> pontos = new ArrayList<>();
        ApiFuture<QuerySnapshot> future = firestore.collection("pontos").get();

        for (DocumentSnapshot doc : future.get().getDocuments()) {
            Map<String, Object> data = doc.getData();
            if (data.get("status") == null) {
                data.put("id", doc.getId());
                pontos.add(data);
            }
        }
        return pontos;
    }

    public void atualizarStatusPonto(String pontoId, String status, Map<String, Object> extras) throws ExecutionException, InterruptedException {
        DocumentReference pontoRef = firestore.collection("pontos").document(pontoId);
        Map<String, Object> updateMap = new HashMap<>();
        updateMap.put("status", status);
        updateMap.putAll(extras);
        pontoRef.update(updateMap).get();

        Map<String, Object> pontoEfetivado = new HashMap<>();
        pontoEfetivado.put("pontoId", pontoId);
        pontoEfetivado.put("status", status);
        pontoEfetivado.putAll(extras);
        pontoEfetivado.put("data", new Date());
        firestore.collection("pontosEfetivados").add(pontoEfetivado).get();
    }

    public void registrarFaltaOuAbono(String collection, Map<String, Object> registro) throws ExecutionException, InterruptedException {
        firestore.collection(collection).add(registro).get();
    }
    // Método para pegar pontos efetivados agrupados por usuário e por dia, ordenados por horário
    public Map<String, Map<String, List<Map<String, Object>>>> obterPlanilhaMensalOrganizada(int ano, int mes) throws ExecutionException, InterruptedException {
        CollectionReference pontosRef = firestore.collection("pontosEfetivados");

        // Busca pontos do mês e ano informado (assumindo que dataAprovacao é Date)
        ApiFuture<QuerySnapshot> future = pontosRef
                .whereGreaterThanOrEqualTo("dataAprovacao", getPrimeiroDiaMes(ano, mes))
                .whereLessThan("dataAprovacao", getPrimeiroDiaMes(ano, mes + 1))
                .get();

        List<QueryDocumentSnapshot> documentos = future.get().getDocuments();

        SimpleDateFormat sdfDia = new SimpleDateFormat("yyyy-MM-dd");

        // Agrupa por idLogin -> data (yyyy-MM-dd) -> lista de pontos (ordenada por horaPonto)
        Map<String, Map<String, List<Map<String, Object>>>> agrupado = new HashMap<>();

        for (DocumentSnapshot doc : documentos) {
            Map<String, Object> ponto = doc.getData();
            if (ponto == null) continue;

            String idLogin = ponto.get("idLogin") != null ? ponto.get("idLogin").toString() : "Desconhecido";

            Date dataAprovacao = null;
            Object objData = ponto.get("dataAprovacao");
            if (objData instanceof Date) {
                dataAprovacao = (Date) objData;
            } else if (objData instanceof com.google.protobuf.Timestamp) {
                com.google.protobuf.Timestamp ts = (com.google.protobuf.Timestamp) objData;
                dataAprovacao = new Date(ts.getSeconds() * 1000);
            }

            if (dataAprovacao == null) continue;

            String diaStr = sdfDia.format(dataAprovacao);

            agrupado.putIfAbsent(idLogin, new HashMap<>());
            Map<String, List<Map<String, Object>>> porDia = agrupado.get(idLogin);
            porDia.putIfAbsent(diaStr, new ArrayList<>());
            porDia.get(diaStr).add(ponto);
        }

        // Ordena cada lista diária pelo campo "horaPonto" (assumindo string hh:mm:ss)
        for (Map<String, List<Map<String, Object>>> porDia : agrupado.values()) {
            for (List<Map<String, Object>> pontosDoDia : porDia.values()) {
                pontosDoDia.sort(Comparator.comparing(p -> (String) p.getOrDefault("horaPonto", "00:00:00")));
            }
        }

        return agrupado;
    }

    private Date getPrimeiroDiaMes(int ano, int mes) {
        Calendar cal = Calendar.getInstance();
        cal.clear();
        cal.set(Calendar.YEAR, ano);
        cal.set(Calendar.MONTH, mes - 1);
        cal.set(Calendar.DAY_OF_MONTH, 1);
        return cal.getTime();
    }
}

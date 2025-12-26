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

    // --- Método auxiliar para obter coleção dinâmica ---
    private String getColecao(String tipo, String cliente) {
        String sufixo = "";
        switch (cliente) {
            case "colinas":
                sufixo = "CoLinas";
                break;
            case "colinas25":
                sufixo = "CoLinas25";
                break;
            default:
                sufixo = "";
        }

        switch (tipo) {
            case "pontos":
                return "pontos" + sufixo;
            case "faltas":
                return "faltas" + sufixo;
            case "abonos":
                return "abonos" + sufixo;
            case "pontosEfetivados":
                return "pontosFfetivados" + sufixo;
            default:
                return tipo + sufixo;
        }
    }

    // --- Usuários (mantido igual, mas vamos adicionar campo 'posto') ---

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
        // Adiciona campo 'posto' se não existir (default: "default")
        if (!usuario.containsKey("posto")) {
            usuario.put("posto", "default");
        }

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

    // --- Métodos para pontos (agora dinâmicos) ---

    public List<Map<String, Object>> listarPontosPendentes(String cliente) throws ExecutionException, InterruptedException {
        String colecao = getColecao("pontos", cliente);
        List<Map<String, Object>> pontos = new ArrayList<>();
        ApiFuture<QuerySnapshot> future = firestore.collection(colecao).get();

        for (DocumentSnapshot doc : future.get().getDocuments()) {
            Map<String, Object> data = doc.getData();
            if (data.get("status") == null) {
                data.put("id", doc.getId());
                pontos.add(data);
            }
        }
        return pontos;
    }

    public void atualizarStatusPonto(String pontoId, String status, Map<String, Object> extras, String cliente) throws ExecutionException, InterruptedException {
        String colecaoPontos = getColecao("pontos", cliente);
        String colecaoEfetivados = getColecao("pontosEfetivados", cliente);

        DocumentReference pontoRef = firestore.collection(colecaoPontos).document(pontoId);
        Map<String, Object> updateMap = new HashMap<>();
        updateMap.put("status", status);
        updateMap.putAll(extras);
        pontoRef.update(updateMap).get();

        Map<String, Object> pontoEfetivado = new HashMap<>();
        pontoEfetivado.put("pontoId", pontoId);
        pontoEfetivado.put("status", status);
        pontoEfetivado.putAll(extras);
        pontoEfetivado.put("data", new Date());
        firestore.collection(colecaoEfetivados).add(pontoEfetivado).get();
    }

    public void registrarFaltaOuAbono(String collection, Map<String, Object> registro, String cliente) throws ExecutionException, InterruptedException {
        String colecao = getColecao(collection, cliente);
        firestore.collection(colecao).add(registro).get();
    }

    // --- Método para obter usuários por posto ---
    public List<Map<String, Object>> listarUsuariosPorPosto(String posto) throws ExecutionException, InterruptedException {
        List<Map<String, Object>> usuarios = new ArrayList<>();
        ApiFuture<QuerySnapshot> future = firestore.collection("users")
                .whereEqualTo("posto", posto)
                .get();

        for (DocumentSnapshot doc : future.get().getDocuments()) {
            Map<String, Object> data = doc.getData();
            data.put("id", doc.getId());
            usuarios.add(data);
        }
        return usuarios;
    }

    // --- Método para obter planilha mensal organizada (agora dinâmico) ---
    public Map<String, Map<String, List<Map<String, Object>>>> obterPlanilhaMensalOrganizada(int ano, int mes, String cliente) throws ExecutionException, InterruptedException {
        String colecaoEfetivados = getColecao("pontosEfetivados", cliente);
        CollectionReference pontosRef = firestore.collection(colecaoEfetivados);

        // Busca pontos do mês e ano informado
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

        // Ordena cada lista diária pelo campo "horaPonto"
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
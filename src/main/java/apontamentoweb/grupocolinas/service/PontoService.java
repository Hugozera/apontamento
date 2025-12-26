package apontamentoweb.grupocolinas.service;

import apontamentoweb.grupocolinas.model.entity.Ponto;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class PontoService {

    @Autowired
    private Firestore firestore;

    // Método para obter o nome da coleção baseado no cliente
    private String getColecaoPorCliente(String cliente) {
        switch (cliente) {
            case "colinas":
                return "pontosCoLinas";
            case "colinas25":
                return "pontosCoLinas25";
            default:
                return "pontos";
        }
    }

    public Page<Ponto> listPontosPaginados(int pagina, int tamanho, String cliente) throws ExecutionException, InterruptedException {
        String colecao = getColecaoPorCliente(cliente);

        List<QueryDocumentSnapshot> documents = firestore.collection(colecao)
                .whereEqualTo("status", "Pendente")
                .get()
                .get()
                .getDocuments();

        List<Ponto> pontos = documents.stream()
                .map(this::documentToPonto)
                .collect(Collectors.toList());

        int start = pagina * tamanho;
        int end = Math.min(start + tamanho, pontos.size());

        return new PageImpl<>(
                pontos.subList(start, end),
                PageRequest.of(pagina, tamanho),
                pontos.size()
        );
    }

    public void aprovarPonto(String pontoId, String aprovadoPor, String cliente) throws ExecutionException, InterruptedException {
        String colecao = getColecaoPorCliente(cliente);
        firestore.collection(colecao).document(pontoId).update(
                "status", "Aprovado",
                "aprovadoPor", aprovadoPor,
                "dataAprovacao", new Date()
        );
    }

    public void recusarPonto(String pontoId, String aprovadoPor, String cliente) throws ExecutionException, InterruptedException {
        String colecao = getColecaoPorCliente(cliente);
        firestore.collection(colecao).document(pontoId).update(
                "status", "Recusado",
                "aprovadoPor", aprovadoPor,
                "dataAprovacao", new Date()
        );
    }

    private Ponto documentToPonto(QueryDocumentSnapshot document) {
        Ponto ponto = new Ponto();
        ponto.setId(document.getId());
        ponto.setIdLogin(document.getString("idLogin"));
        ponto.setUsuario(document.getString("usuario"));
        ponto.setHoraPonto(document.getString("horaPonto"));
        ponto.setFoto(document.getString("foto"));
        ponto.setSenhaPdv(document.getString("senhaPdv"));
        ponto.setStatus(document.getString("status"));
        ponto.setAprovadoPor(document.getString("aprovadoPor"));
        ponto.setDataAprovacao(document.getDate("dataAprovacao"));
        return ponto;
    }
}
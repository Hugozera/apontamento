package apontamentoweb.grupocolinas.controller;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.TimeZone;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:3000", "https://18.230.5.22"})
public class LoginController {

    // Método para obter o nome da coleção baseado no posto
    private String getColecaoPontos(String posto) {
        switch (posto) {
            case "colinas":
                return "pontosCoLinas";
            case "colinas25":
                return "pontosCoLinas25";
            default:
                return "pontos";
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> baterPonto(@RequestBody Map<String, Object> pontoData) {
        try {
            Firestore db = FirestoreClient.getFirestore();

            String idLogin = (String) pontoData.get("idLogin");
            String senhaPdv = (String) pontoData.get("senhaPdv");
            String posto = (String) pontoData.get("posto"); // Novo: pega o posto do payload

            // Se posto não veio no payload, usa "default"
            if (posto == null || posto.isEmpty()) {
                posto = "default";
            }

            // Buscar usuário por idLogin com timeout de 5 segundos
            CollectionReference usersRef = db.collection("users");
            Query query = usersRef.whereEqualTo("idLogin", idLogin);
            QuerySnapshot querySnapshot = query.get().get(5, java.util.concurrent.TimeUnit.SECONDS);

            if (querySnapshot.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("sucesso", false, "mensagem", "Usuário não encontrado"));
            }

            DocumentSnapshot userDoc = querySnapshot.getDocuments().get(0);
            String userSenhaPdv = (String) userDoc.get("senhaPdv");

            if (!senhaPdv.equals(userSenhaPdv)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("sucesso", false, "mensagem", "Senha PDV incorreta"));
            }

            // Verificar se o posto do usuário no cadastro bate com o enviado (opcional)
            String userPosto = (String) userDoc.get("posto");
            if (userPosto != null && !userPosto.equals(posto)) {
                System.out.println("Aviso: Posto do usuário (" + userPosto + ") diferente do posto enviado (" + posto + ")");
            }

            // Converter horaPonto
            Timestamp timestampHoraPonto;
            String horaPontoString = (String) pontoData.get("horaPonto");
            if (horaPontoString != null && !horaPontoString.isEmpty()) {
                try {
                    SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
                    isoFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
                    Date date = isoFormat.parse(horaPontoString);
                    timestampHoraPonto = Timestamp.of(date);
                } catch (ParseException e) {
                    timestampHoraPonto = Timestamp.now();
                }
            } else {
                timestampHoraPonto = Timestamp.now();
            }

            // Determinar a coleção correta baseada no posto
            String colecaoPontos = getColecaoPontos(posto);

            // Salvar ponto na coleção correta com timeout de 5 segundos
            Map<String, Object> ponto = new HashMap<>();
            ponto.put("idLogin", idLogin);
            ponto.put("senhaPdv", senhaPdv);
            ponto.put("horaPonto", timestampHoraPonto);
            ponto.put("foto", pontoData.get("foto"));
            ponto.put("usuario", pontoData.get("usuario"));
            ponto.put("posto", posto); // Salva o posto no documento também
            ponto.put("status", "Pendente"); // Status inicial
            ponto.put("createdAt", FieldValue.serverTimestamp());

            ApiFuture<DocumentReference> futureAdd = db.collection(colecaoPontos).add(ponto);
            futureAdd.get(5, java.util.concurrent.TimeUnit.SECONDS); // Timeout Firestore

            return ResponseEntity.ok(Map.of(
                    "sucesso", true,
                    "mensagem", "Ponto registrado com sucesso no posto " + posto + ". Aguarde validação."
            ));

        } catch (java.util.concurrent.TimeoutException te) {
            te.printStackTrace();
            return ResponseEntity.status(504)
                    .body(Map.of("sucesso", false, "mensagem", "Timeout ao acessar Firestore. Tente novamente."));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("sucesso", false, "mensagem", "Erro ao registrar ponto: " + e.getMessage()));
        }
    }

    // Endpoint adicional para bater ponto com parâmetro de query (alternativa)
    @PostMapping("/login-com-posto")
    public ResponseEntity<Map<String, Object>> baterPontoComPosto(
            @RequestBody Map<String, Object> pontoData,
            @RequestParam(defaultValue = "default") String cliente) {

        try {
            // Adiciona o posto/cliente ao payload
            pontoData.put("posto", cliente);

            // Chama o método principal
            return baterPonto(pontoData);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("sucesso", false, "mensagem", "Erro ao registrar ponto: " + e.getMessage()));
        }
    }
}
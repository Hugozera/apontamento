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

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> baterPonto(@RequestBody Map<String, Object> pontoData) {
        try {
            Firestore db = FirestoreClient.getFirestore();

            // Verificar se o usuário existe
            String idLogin = (String) pontoData.get("idLogin");
            String senhaPdv = (String) pontoData.get("senhaPdv");

            // Buscar usuário por idLogin
            CollectionReference usersRef = db.collection("users");
            Query query = usersRef.whereEqualTo("idLogin", idLogin);
            ApiFuture<QuerySnapshot> querySnapshot = query.get();

            if (querySnapshot.get().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("sucesso", false, "mensagem", "Usuário não encontrado"));
            }

            DocumentSnapshot userDoc = querySnapshot.get().getDocuments().get(0);
            String userSenhaPdv = (String) userDoc.get("senhaPdv");

            // Verificar senha
            if (!senhaPdv.equals(userSenhaPdv)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("sucesso", false, "mensagem", "Senha PDV incorreta"));
            }

            // Converter horaPonto para Timestamp
            Timestamp timestampHoraPonto;
            String horaPontoString = (String) pontoData.get("horaPonto");

            if (horaPontoString != null && !horaPontoString.isEmpty()) {
                try {
                    // Converter ISO string para Date
                    SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
                    isoFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
                    Date date = isoFormat.parse(horaPontoString);

                    // Converter Date para Timestamp do Firestore
                    timestampHoraPonto = Timestamp.of(date);
                } catch (ParseException e) {
                    // Se falhar, usar timestamp atual
                    timestampHoraPonto = Timestamp.now();
                }
            } else {
                // Se não houver horaPonto, usar timestamp atual
                timestampHoraPonto = Timestamp.now();
            }

            // Salvar ponto na coleção PONTOS (para validação) - SEM status inicialmente
            Map<String, Object> ponto = new HashMap<>();
            ponto.put("idLogin", idLogin);
            ponto.put("senhaPdv", senhaPdv);
            ponto.put("horaPonto", timestampHoraPonto); // TIMESTAMP do Firestore
            ponto.put("foto", pontoData.get("foto"));
            ponto.put("usuario", pontoData.get("usuario"));
            ponto.put("createdAt", FieldValue.serverTimestamp()); // Timestamp do servidor
            // NÃO adicionar status aqui - será adicionado na validação

            db.collection("pontos").add(ponto);

            return ResponseEntity.ok(Map.of("sucesso", true, "mensagem", "Ponto registrado com sucesso. Aguarde validação."));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("sucesso", false, "mensagem", "Erro ao registrar ponto: " + e.getMessage()));
        }
    }
}
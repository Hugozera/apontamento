package apontamentoweb.grupocolinas.controller;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = {"http://localhost:3000", "https://18.230.5.22"}) // Permite front local e produção
public class UsuarioController {

    // GET - Listar todos os usuários
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listarUsuarios() {
        try {
            Firestore db = FirestoreClient.getFirestore();
            CollectionReference usersRef = db.collection("users");
            ApiFuture<QuerySnapshot> future = usersRef.get();
            List<Map<String, Object>> usuarios = new ArrayList<>();

            for (DocumentSnapshot doc : future.get().getDocuments()) {
                Map<String, Object> data = new HashMap<>(doc.getData());
                data.put("id", doc.getId());
                usuarios.add(data);
            }

            return ResponseEntity.ok(usuarios);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.emptyList());
        }
    }

    // POST - Criar novo usuário
    @PostMapping
    public ResponseEntity<Map<String, Object>> criarUsuario(@RequestBody Map<String, Object> usuarioData) {
        try {
            Firestore db = FirestoreClient.getFirestore();

            // Valida campos obrigatórios
            List<String> obrigatorios = Arrays.asList("name", "email", "senha", "senhaPdv", "role", "idLogin");
            for (String campo : obrigatorios) {
                if (!usuarioData.containsKey(campo) || usuarioData.get(campo) == null) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("sucesso", false, "mensagem", "Campo obrigatório ausente: " + campo));
                }
            }

            usuarioData.put("createdAt", Timestamp.now());
            usuarioData.put("ativo", "1");

            db.collection("users").add(usuarioData).get();

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("sucesso", true, "mensagem", "Usuário criado com sucesso."));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("sucesso", false, "mensagem", "Erro ao criar usuário: " + e.getMessage()));
        }
    }

    // PUT - Atualizar usuário
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> atualizarUsuario(
            @PathVariable String id,
            @RequestBody Map<String, Object> usuarioData) {
        try {
            Firestore db = FirestoreClient.getFirestore();
            DocumentReference docRef = db.collection("users").document(id);

            ApiFuture<WriteResult> future = docRef.update(usuarioData);
            future.get();

            return ResponseEntity.ok(Map.of("sucesso", true, "mensagem", "Usuário atualizado com sucesso."));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("sucesso", false, "mensagem", "Erro ao atualizar usuário: " + e.getMessage()));
        }
    }

    // DELETE - Remover usuário
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deletarUsuario(@PathVariable String id) {
        try {
            Firestore db = FirestoreClient.getFirestore();
            ApiFuture<WriteResult> future = db.collection("users").document(id).delete();
            future.get();

            return ResponseEntity.ok(Map.of("sucesso", true, "mensagem", "Usuário removido com sucesso."));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("sucesso", false, "mensagem", "Erro ao deletar usuário: " + e.getMessage()));
        }
    }
}

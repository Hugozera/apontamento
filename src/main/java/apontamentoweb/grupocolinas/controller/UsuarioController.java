package apontamentoweb.grupocolinas.controller;

import apontamentoweb.grupocolinas.service.FirestoreService;
import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = {"http://localhost:3000", "https://18.230.5.22"})
public class UsuarioController {

    @Autowired
    private FirestoreService firestoreService;

    // GET - Listar todos os usuários
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listarUsuarios() {
        try {
            return ResponseEntity.ok(firestoreService.listarUsuarios());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.emptyList());
        }
    }

    // GET - Listar usuários por posto
    @GetMapping("/posto/{posto}")
    public ResponseEntity<List<Map<String, Object>>> listarUsuariosPorPosto(@PathVariable String posto) {
        try {
            return ResponseEntity.ok(firestoreService.listarUsuariosPorPosto(posto));
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
            // Valida campos obrigatórios
            List<String> obrigatorios = Arrays.asList("name", "email", "senha", "senhaPdv", "role", "idLogin");
            for (String campo : obrigatorios) {
                if (!usuarioData.containsKey(campo) || usuarioData.get(campo) == null) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("sucesso", false, "mensagem", "Campo obrigatório ausente: " + campo));
                }
            }

            // Define posto padrão se não informado
            if (!usuarioData.containsKey("posto")) {
                usuarioData.put("posto", "default");
            }

            usuarioData.put("createdAt", Timestamp.now());
            usuarioData.put("ativo", "1");

            String userId = firestoreService.criarUsuario(usuarioData);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("sucesso", true, "mensagem", "Usuário criado com sucesso.", "id", userId));

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
            boolean sucesso = firestoreService.atualizarUsuario(id, usuarioData);

            if (sucesso) {
                return ResponseEntity.ok(Map.of("sucesso", true, "mensagem", "Usuário atualizado com sucesso."));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("sucesso", false, "mensagem", "Usuário não encontrado."));
            }

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
            boolean sucesso = firestoreService.excluirUsuario(id);

            if (sucesso) {
                return ResponseEntity.ok(Map.of("sucesso", true, "mensagem", "Usuário removido com sucesso."));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("sucesso", false, "mensagem", "Usuário não encontrado."));
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("sucesso", false, "mensagem", "Erro ao deletar usuário: " + e.getMessage()));
        }
    }
}
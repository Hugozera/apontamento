package apontamentoweb.grupocolinas.controller;

import apontamentoweb.grupocolinas.model.entity.*;
import apontamentoweb.grupocolinas.service.FirestoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:3000", "https://18.230.5.22"})
public class PontoController {

    @Autowired
    private FirestoreService firestoreService;

    @GetMapping("/pontos")
    public ResponseEntity<List<Map<String, Object>>> listarPontos(
            @RequestParam(defaultValue = "default") String cliente) {
        try {
            return ResponseEntity.ok(firestoreService.listarPontosPendentes(cliente));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/pontos/{pontoId}/aprovar")
    public ResponseEntity<PontoResponse> aprovarPonto(
            @PathVariable String pontoId,
            @RequestBody PontoEfetivadoRequest request,
            @RequestParam(defaultValue = "default") String cliente) {
        PontoResponse response = new PontoResponse();
        try {
            Map<String, Object> extras = new HashMap<>();
            extras.put("aprovadoPor", request.getUsuario());
            extras.put("dataAprovacao", new Date());
            firestoreService.atualizarStatusPonto(pontoId, "Aprovado", extras, cliente);

            response.setSucesso(true);
            response.setMensagem("Ponto aprovado com sucesso");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.setSucesso(false);
            response.setMensagem("Erro ao aprovar ponto: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // ... outros métodos do PontoController mantendo o parâmetro 'cliente'
}
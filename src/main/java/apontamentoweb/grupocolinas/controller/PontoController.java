package apontamentoweb.grupocolinas.controller;

import apontamentoweb.grupocolinas.dto.FuncionarioDTO;
import apontamentoweb.grupocolinas.model.entity.*;
import apontamentoweb.grupocolinas.service.FirestoreService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:3000", "https://18.230.5.22"})
public class PontoController {

    @Autowired
    private FirestoreService firestoreService;

    @GetMapping("/pontos")
    public ResponseEntity<List<Map<String, Object>>> listarPontos() {
        try {
            return ResponseEntity.ok(firestoreService.listarPontosPendentes());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/pontos/{pontoId}/aprovar")
    public ResponseEntity<PontoResponse> aprovarPonto(@PathVariable String pontoId, @RequestBody PontoEfetivadoRequest request) {
        PontoResponse response = new PontoResponse();
        try {
            Map<String, Object> extras = new HashMap<>();
            extras.put("aprovadoPor", request.getUsuario());
            extras.put("dataAprovacao", new Date());
            firestoreService.atualizarStatusPonto(pontoId, "Aprovado", extras);

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

    @PutMapping("/pontos/{pontoId}/recusar")
    public ResponseEntity<PontoResponse> recusarPonto(@PathVariable String pontoId, @RequestBody PontoEfetivadoRequest request) {
        PontoResponse response = new PontoResponse();
        try {
            Map<String, Object> extras = new HashMap<>();
            extras.put("recusadoPor", request.getUsuario());
            extras.put("justificativa", request.getJustificativa());
            extras.put("dataRecusa", new Date());
            firestoreService.atualizarStatusPonto(pontoId, "Recusado", extras);

            response.setSucesso(true);
            response.setMensagem("Ponto recusado com sucesso");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.setSucesso(false);
            response.setMensagem("Erro ao recusar ponto: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/faltas")
    public ResponseEntity<PontoResponse> registrarFalta(@RequestBody RegistroRequest request) {
        return registrarStatus(request, "faltas");
    }

    @PostMapping("/abonos")
    public ResponseEntity<PontoResponse> registrarAbono(@RequestBody RegistroRequest request) {
        return registrarStatus(request, "abonos");
    }

    private ResponseEntity<PontoResponse> registrarStatus(RegistroRequest request, String collection) {
        PontoResponse response = new PontoResponse();
        try {
            if (request.getIdLogin() == null || request.getJustificativa() == null) {
                response.setSucesso(false);
                response.setMensagem("Dados incompletos para registrar");
                return ResponseEntity.badRequest().body(response);
            }

            Map<String, Object> registro = new HashMap<>();
            registro.put("pontoId", request.getPontoId());
            registro.put("status", collection.equals("faltas") ? "Falta" : "Abonado");
            registro.put("usuario", request.getUsuario());
            registro.put("cargo", request.getCargo());
            registro.put("justificativa", request.getJustificativa());
            registro.put("idLogin", request.getIdLogin());
            registro.put("data", new Date());

            firestoreService.registrarFaltaOuAbono(collection, registro);

            response.setSucesso(true);
            response.setMensagem("Registro realizado com sucesso");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.setSucesso(false);
            response.setMensagem("Erro ao registrar: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

//    @GetMapping("/usuarios")
//    public ResponseEntity<List<FuncionarioDTO>> listarUsuarios() {
//        try {
//            List<Map<String, Object>> usuariosRaw = firestoreService.listarUsuarios();
//            List<FuncionarioDTO> usuarios = new ArrayList<>();
//
//            for (Map<String, Object> user : usuariosRaw) {
//                FuncionarioDTO dto = new FuncionarioDTO();
//                dto.setIdLogin((String) user.get("idLogin"));
//                dto.setEmail((String) user.get("email"));
//                dto.setName((String) user.get("name"));
//                dto.setPermissao(String.valueOf(user.get("permissao")));
//                dto.setRole((String) user.get("role"));
//                dto.setPhotoURL((String) user.get("photoURL"));
//                usuarios.add(dto);
//            }
//
//            return ResponseEntity.ok(usuarios);
//        } catch (Exception e) {
//            e.printStackTrace();
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
//        }
//    }
}

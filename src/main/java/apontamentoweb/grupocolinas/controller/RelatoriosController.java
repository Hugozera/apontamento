package apontamentoweb.grupocolinas.controller;


import apontamentoweb.grupocolinas.service.FirestoreService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/relatorios")
@CrossOrigin(origins = {"http://localhost:3000", "https://18.230.5.22"}, allowCredentials = "true")
public class RelatoriosController {

    private final FirestoreService firestoreService;

    public RelatoriosController(FirestoreService firestoreService) {
        this.firestoreService = firestoreService;
    }

//    @GetMapping("/planilha-mensal")
//    public ResponseEntity<?> gerarPlanilhaMensal(
//            @RequestParam int ano,
//            @RequestParam int mes
//    ) {
//        try {
//            Map<String, Map<String, java.util.List<Map<String, Object>>>> planilha = firestoreService.obterPlanilhaMensalOrganizada(ano, mes);
//            return ResponseEntity.ok(planilha);
//        } catch (ExecutionException | InterruptedException e) {
//            e.printStackTrace();
//            return ResponseEntity.status(500).body("Erro ao gerar planilha mensal");
//        }
//    }
}

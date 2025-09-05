package apontamentoweb.grupocolinas.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ReactController {

    @GetMapping("/validar-pontos")
    public String validarPontos() {
        return "index.html";
    }
}

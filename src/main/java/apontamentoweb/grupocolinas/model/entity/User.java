package apontamentoweb.grupocolinas.model.entity;

import lombok.Data;
import java.util.Map;

@Data
public class User {
    private String uid;
    private String idLogin;
    private String name;
    private String email;
    private int permissao;
    private String role;
    private String senhaPdv;
    private String horarioEntrada;
    private String horarioSaida;
    private String escala;
    private String foto;
    private boolean ativo;
}
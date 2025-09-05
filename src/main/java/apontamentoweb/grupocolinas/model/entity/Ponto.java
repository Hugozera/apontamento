package apontamentoweb.grupocolinas.model.entity;

import lombok.Data;
import java.util.Date;

@Data
public class Ponto {
    private String id;
    private String idLogin;
    private String usuario;
    private String horaPonto;
    private String foto;
    private String senhaPdv;
    private String status;
    private String aprovadoPor;
    private Date dataAprovacao;
}
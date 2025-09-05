package apontamentoweb.grupocolinas.model.entity;

public class RegistroRequest {
    private String pontoId;
    private String idLogin;
    private String usuario;
    private String cargo;
    private String justificativa;

    // Getters e Setters
    public String getPontoId() {
        return pontoId;
    }

    public void setPontoId(String pontoId) {
        this.pontoId = pontoId;
    }

    public String getIdLogin() {
        return idLogin;
    }

    public void setIdLogin(String idLogin) {
        this.idLogin = idLogin;
    }

    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public String getCargo() {
        return cargo;
    }

    public void setCargo(String cargo) {
        this.cargo = cargo;
    }

    public String getJustificativa() {
        return justificativa;
    }

    public void setJustificativa(String justificativa) {
        this.justificativa = justificativa;
    }
}

package apontamentoweb.grupocolinas.model.entity;

public class PontoRequest {

        private String idLogin;
        private String senha;
        private String horaPonto;
        private String foto;
    private String posto;

    public String getPosto() {
        return posto;
    }

    public void setPosto(String posto) {
        this.posto = posto;
    }

    public String getIdLogin() {
        return idLogin;
    }

    public void setIdLogin(String idLogin) {
        this.idLogin = idLogin;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public String getHoraPonto() {
        return horaPonto;
    }

    public void setHoraPonto(String horaPonto) {
        this.horaPonto = horaPonto;
    }

    public String getFoto() {
        return foto;
    }

    public void setFoto(String foto) {
        this.foto = foto;
    }
}

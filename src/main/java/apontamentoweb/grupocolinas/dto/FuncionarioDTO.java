package apontamentoweb.grupocolinas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FuncionarioDTO {
    private String idLogin;
    private String email;
    private String name;
    private String permissao; // Pode ser int ou string, ajustar conforme Firestore
    private String role;
    private String photoURL;
}

package apontamentoweb.grupocolinas.service;



import apontamentoweb.grupocolinas.model.entity.User;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private Firestore firestore;

    public List<User> listAllUsers() throws ExecutionException, InterruptedException {
        return firestore.collection("users")
                .get()
                .get()
                .getDocuments()
                .stream()
                .map(this::documentToUser)
                .collect(Collectors.toList());
    }

    public User getUserByIdLogin(String idLogin) throws ExecutionException, InterruptedException {
        return firestore.collection("users")
                .whereEqualTo("idLogin", idLogin)
                .get()
                .get()
                .getDocuments()
                .stream()
                .findFirst()
                .map(this::documentToUser)
                .orElse(null);
    }

    private User documentToUser(QueryDocumentSnapshot document) {
        User user = new User();
        user.setUid(document.getId());
        user.setIdLogin(document.getString("idLogin"));
        user.setName(document.getString("name"));
        user.setEmail(document.getString("email"));
        user.setPermissao(Integer.parseInt(document.getString("permissao")));
        user.setRole(document.getString("role"));
        user.setSenhaPdv(document.getString("senhaPdv"));
        user.setHorarioEntrada(document.getString("horarioEntrada"));
        user.setHorarioSaida(document.getString("horarioSaida"));
        user.setEscala(document.getString("escala"));
        user.setFoto(document.getString("foto"));
        user.setAtivo("1".equals(document.getString("ativo")));
        return user;
    }
}
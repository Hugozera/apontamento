package apontamentoweb.grupocolinas.service;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.api.core.ApiFuture;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutionException;

@Service
public class AuthService {

    private final Firestore firestore;

    @Autowired
    public AuthService(Firestore firestore) {
        this.firestore = firestore;
    }

    public boolean validarLogin(String idLogin, String senha) throws Exception {
        // Busca o usuário pelo idLogin
        ApiFuture<QuerySnapshot> query = firestore.collection("users")
                .whereEqualTo("idLogin", idLogin)  // Busca pelo campo 'idLogin'
                .get();

        // Aguarda o resultado da consulta
        QuerySnapshot querySnapshot = query.get();

        // Verifica se há documentos correspondentes
        List<QueryDocumentSnapshot> documents = querySnapshot.getDocuments();
        if (!documents.isEmpty()) {
            DocumentSnapshot document = documents.get(0); // Pega o primeiro documento
            String senhaArmazenada = document.getString("senha");  // A senha armazenada

            // Adicione logs para verificar o valor da senha armazenada e a fornecida
            System.out.println("Senha armazenada: " + senhaArmazenada);
            System.out.println("Senha fornecida: " + senha);

            // Verifica se a senha fornecida bate com a senha armazenada
            return senha.equals(senhaArmazenada);  // Compara as senhas em texto simples
        } else {
            throw new Exception("Usuário não encontrado");  // Se não encontrar, lança exceção
        }
    }
}

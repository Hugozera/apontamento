package apontamentoweb.grupocolinas.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;

@Configuration
public class FirebaseConfig {

    // Caminhos alternativos para produção
    private static final String[] CONFIG_PATHS = {
            "/",
            "/home/ubuntu/Crestos&macal/apontamento/backend/ServiceAccountKey.json",
            "/ftp/crestos&macal/avaliacao/apontamento/backend/serviceAccountKey.json"
    };

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            InputStream serviceAccount = findServiceAccountFile();

            if (serviceAccount == null) {
                throw new FileNotFoundException("Não foi possível encontrar o arquivo ServiceAccountKey.json em nenhum dos locais configurados.");
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            return FirebaseApp.initializeApp(options);
        } else {
            return FirebaseApp.getInstance();
        }
    }

    private InputStream findServiceAccountFile() throws IOException {
        // Tenta carregar do classpath - usando o nome correto com S maiúsculo
        try {
            ClassPathResource resource = new ClassPathResource("ServiceAccountKey.json");
            if (resource.exists()) {
                return resource.getInputStream();
            }
        } catch (Exception e) {
            // Ignorar e tentar outros locais
        }

        // Tenta caminhos absolutos (produção)
        for (String path : CONFIG_PATHS) {
            try {
                if (Files.exists(Paths.get(path))) {
                    return new FileInputStream(path);
                }
            } catch (Exception e) {
                // Ignorar erro e tentar próximo caminho
            }
        }

        return null;
    }

    @Bean
    public Firestore firestore() throws IOException {
        FirebaseApp app = firebaseApp();
        return FirestoreClient.getFirestore(app);
    }
}

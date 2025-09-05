
import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function GerenciarUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        listarUsuariosFirestore();
    }, []);

    const listarUsuariosFirestore = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const listaUsuarios = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setUsuarios(listaUsuarios);
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h1>Gerenciar Usuários</h1>
            {loading && <p>Carregando...</p>}
            {usuarios.map(usuario => (
                <div key={usuario.id} style={styles.card}>
                    <p>Nome: {usuario.name}</p>
                    <p>Email: {usuario.email}</p>
                    <p>Permissão: {usuario.permissao}</p>
                </div>
            ))}
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
    },
    card: {
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '10px',
        marginBottom: '10px',
    },
};
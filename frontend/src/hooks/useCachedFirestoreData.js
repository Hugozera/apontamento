// src/hooks/useCachedFirestoreData.js
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { cacheService } from '../utils/cacheService';

export function useCachedFirestoreData(collectionName, dependencies = []) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Tenta carregar do cache primeiro
                const cachedData = await cacheService.getAll(collectionName);

                if (cachedData.length > 0 && mounted) {
                    setData(cachedData);
                }

                // Busca dados novos do Firestore
                const lastSync = await cacheService.getLastSync(collectionName);
                let firestoreQuery = query(collection(db, collectionName), orderBy('horaPonto', 'asc'));

                // Se temos último sync, busca apenas dados mais recentes
                if (lastSync) {
                    firestoreQuery = query(
                        collection(db, collectionName),
                        where('horaPonto', '>=', Timestamp.fromDate(new Date(lastSync))),
                        orderBy('horaPonto', 'asc')
                    );
                }

                const snapshot = await getDocs(firestoreQuery);
                const newData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                if (mounted) {
                    // Atualiza cache com novos dados
                    if (newData.length > 0) {
                        await cacheService.set(collectionName, newData);

                        // Se tinha dados no cache, faz merge, senão usa os novos
                        const allData = lastSync
                            ? [...cachedData.filter(cached =>
                                !newData.find(newItem => newItem.id === cached.id)
                            ), ...newData]
                            : newData;

                        setData(allData);
                    }

                    // Atualiza último sync
                    await cacheService.setLastSync(collectionName);
                }

            } catch (err) {
                console.error(`Erro ao carregar ${collectionName}:`, err);
                if (mounted) {
                    setError(err.message);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, [collectionName, ...dependencies]);

    return { data, loading, error };
}